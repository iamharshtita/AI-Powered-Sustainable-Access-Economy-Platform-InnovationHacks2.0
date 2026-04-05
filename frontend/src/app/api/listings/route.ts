import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import {
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime";

const REGION = process.env.AWS_REGION || "us-east-1";
const TABLE_NAME = "SustainableAccessPlatformStack-Items";
const BEDROCK_MODEL_ID = "amazon.nova-lite-v1:0";

const ddbClient = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(ddbClient);
const bedrockClient = new BedrockRuntimeClient({ region: REGION });

// Valid categories in DynamoDB
const VALID_CATEGORIES = [
  "electronics",
  "furniture",
  "tools",
  "sports",
  "outdoor",
  "wellness",
  "kitchen",
  "clothing",
  "books",
];

// Common product synonyms to expand keyword matching
const SYNONYMS: Record<string, string[]> = {
  drone: ["drone", "dji", "uav", "quadcopter", "aerial", "flying"],
  camera: ["camera", "dslr", "mirrorless", "fujifilm", "canon", "nikon", "lens"],
  laptop: ["laptop", "macbook", "notebook", "computer"],
  bike: ["bike", "bicycle", "cycling", "cycle"],
  tent: ["tent", "camping", "shelter", "backpacking"],
  kayak: ["kayak", "canoe", "paddling", "paddle"],
  ski: ["ski", "skiing", "snowboard"],
  scooter: ["scooter", "electric scooter", "e-scooter"],
};

function expandKeywords(keywords: string[]): string[] {
  const expanded = new Set<string>(keywords);
  for (const kw of keywords) {
    for (const [key, syns] of Object.entries(SYNONYMS)) {
      if (syns.some((s) => kw.includes(s) || s.includes(kw))) {
        syns.forEach((s) => expanded.add(s));
        expanded.add(key);
      }
    }
  }
  return Array.from(expanded);
}

// Stop words to strip from conversational queries
const STOP_WORDS = new Set([
  "hey","hi","hello","can","you","like","show","me","some","nearby","please",
  "want","need","find","get","looking","for","any","the","a","an","is","are",
  "i","do","have","there","help","see","give","know","around","here","available",
  "nice","good","great","best","cheap","near","local","just","really",
  "would","could","should","this","that","what","where","which","with"
]);

/** Strip stop words and return meaningful tokens from a query */
function stripStopWords(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

/** Naive singularizer: strips common plural suffixes */
function singularize(word: string): string {
  if (word.endsWith("ies") && word.length > 4) return word.slice(0, -3) + "y"; // flies→fly
  if (word.endsWith("ves") && word.length > 4) return word.slice(0, -3) + "f"; // knives→knife
  if (word.endsWith("ses") || word.endsWith("xes") || word.endsWith("zes")) return word.slice(0, -2); // boxes→box
  if (word.endsWith("s") && !word.endsWith("ss") && word.length > 3) return word.slice(0, -1); // drones→drone
  return word;
}

async function extractSearchIntent(
  query: string
): Promise<{ keywords: string[]; category: string | null }> {
  const prompt = `You are a product search assistant. Extract the key product keywords from a user's search query, ignoring all filler/conversational words.

Query: "${query}"

Valid categories: ${VALID_CATEGORIES.join(", ")}

Rules:
- IGNORE filler words like: hey, can, you, like, show, me, some, nearby, please, want, need, find, get, looking, for, any, the, a, an, is, are
- Extract ONLY the product type(s) the user wants
- Pick the most relevant category, or null if unclear

Return ONLY valid JSON:
{"keywords": ["<product terms only>"], "category": "<category or null>"}

Examples:
- "hey can you like show me some drones nearby" → {"keywords": ["drone"], "category": "electronics"}
- "show me some books" → {"keywords": ["book"], "category": "books"}
- "I need a drill for the weekend" → {"keywords": ["drill"], "category": "tools"}
- "find me a camera" → {"keywords": ["camera"], "category": "electronics"}
- "yoga studio accessories" → {"keywords": ["yoga", "mat"], "category": "wellness"}
- "something for camping" → {"keywords": ["camping", "tent"], "category": "outdoor"}
- "any kayaks available" → {"keywords": ["kayak"], "category": "outdoor"}
- "looking for a nice jacket" → {"keywords": ["jacket"], "category": "clothing"}`;

  try {
    const response = await bedrockClient.send(
      new ConverseCommand({
        modelId: BEDROCK_MODEL_ID,
        messages: [{ role: "user", content: [{ text: prompt }] }],
        inferenceConfig: { maxTokens: 150, temperature: 0.0 },
      })
    );

    const content = response.output?.message?.content;
    const text = content?.[0]?.text?.trim() ?? "";

    // Extract JSON from the response (handle any extra text)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");

    const parsed = JSON.parse(jsonMatch[0]);
    const keywords: string[] = Array.isArray(parsed.keywords)
      ? parsed.keywords
          .map((k: string) => String(k).toLowerCase().trim())
          .filter((k: string) => Boolean(k))
          .flatMap((k: string) => [k, singularize(k)])  // add both plural and singular
          .filter((v: string, i: number, arr: string[]) => arr.indexOf(v) === i)  // dedupe
      : stripStopWords(query).flatMap((k: string) => [k, singularize(k)]);
    const category: string | null =
      parsed.category && VALID_CATEGORIES.includes(parsed.category.toLowerCase())
        ? parsed.category.toLowerCase()
        : null;

    console.log(
      `[Bedrock Search] Query: "${query}" → keywords: [${keywords}], category: ${category}`
    );
    return { keywords, category };
  } catch (err) {
    // Graceful fallback — extract meaningful words from the raw query
    console.warn("[Bedrock Search] Fallback to stripped words:", err);
    return { keywords: stripStopWords(query), category: null };
  }
}

/**
 * GET /api/listings — Fetch all active listings from DynamoDB Items table.
 *
 * Query params:
 *   ?category=electronics   — Filter by category (case-insensitive)
 *   ?q=show me some books   — AI-powered natural language search via Bedrock
 */
export async function GET(request: NextRequest) {
  try {
    const categoryParam = request.nextUrl.searchParams.get("category");
    const query = request.nextUrl.searchParams.get("q");

    // ── AI Search Intent Extraction ──────────────────────────────────────
    let aiKeywords: string[] = [];
    let aiCategory: string | null = null;

    if (query && query.trim()) {
      // Pre-process: strip stop words locally first (fast, always works)
      const localKeywords = stripStopWords(query.trim());
      console.log(`[Search] Local keywords: [${localKeywords}]`);

      // Try Bedrock for smarter extraction (with timeout)
      try {
        const bedrockPromise = extractSearchIntent(query.trim());
        const timeoutPromise = new Promise<{ keywords: string[]; category: string | null }>(
          (resolve) => setTimeout(() => resolve({ keywords: localKeywords, category: null }), 2500)
        );
        const intent = await Promise.race([bedrockPromise, timeoutPromise]);
        aiKeywords = intent.keywords.length > 0 ? intent.keywords : localKeywords;
        aiCategory = intent.category;
      } catch {
        // Bedrock failed — use local extraction
        aiKeywords = localKeywords;
        aiCategory = null;
      }

      // Always ensure we have keywords (fallback to local)
      if (aiKeywords.length === 0) aiKeywords = localKeywords;
    }

    // ── Build DynamoDB Filter ────────────────────────────────────────────
    // Always filter for active items
    let filterExpression = "#s = :active";
    const exprAttrNames: Record<string, string> = { "#s": "status" };
    const exprAttrValues: Record<string, string> = { ":active": "active" };

    // Category filter: prefer explicit category param, then AI-extracted category
    const effectiveCategory =
      (categoryParam && categoryParam.toLowerCase() !== "all"
        ? categoryParam.toLowerCase()
        : null) ?? aiCategory;

    if (effectiveCategory) {
      filterExpression += " AND #cat = :cat";
      exprAttrNames["#cat"] = "category";
      exprAttrValues[":cat"] = effectiveCategory;
    }

    // ── Scan DynamoDB ─────────────────────────────────────────────────────
    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: filterExpression,
        ExpressionAttributeNames: exprAttrNames,
        ExpressionAttributeValues: exprAttrValues,
      })
    );
    let items = result.Items || [];

    // ── In-Memory Text Filter (AI keywords or raw query) ─────────────────
    if (aiKeywords.length > 0) {
      // Expand keywords with synonyms for better recall
      const expandedKeywords = expandKeywords(aiKeywords);
      console.log(`[Search] Expanded keywords: [${expandedKeywords}]`);

      /** Soft-match: keyword matches if it's a prefix/stem of a word in the text, or vice versa */
      const softMatch = (text: string, kw: string): boolean => {
        if (text.includes(kw)) return true;  // exact substring
        // stem match: "drones"→"drone", "cameras"→"camera"
        const kwStem = kw.replace(/s$/, "").replace(/ing$/, "").replace(/ed$/, "");
        if (kwStem.length > 2 && text.includes(kwStem)) return true;
        // reverse stem: text word starts with keyword
        const words = text.split(/\s+/);
        return words.some((w) => w.startsWith(kw) || kw.startsWith(w));
      };

      const matchItems = (keywords: string[]) =>
        items.filter((item) => {
          const title = String(item.title || "").toLowerCase();
          const description = String(item.description || "").toLowerCase();
          const cat = String(item.category || "").toLowerCase();
          return keywords.some(
            (kw) => softMatch(title, kw) || softMatch(description, kw) || softMatch(cat, kw)
          );
        });

      let filtered = matchItems(expandedKeywords);

      // Fallback: if no results with AI keywords, try raw stripped query words
      if (filtered.length === 0 && query) {
        const rawWords = stripStopWords(query);
        console.log(`[Search] Fallback raw words: [${rawWords}]`);
        if (rawWords.length > 0) {
          filtered = matchItems(expandKeywords(rawWords));
        }
      }

      items = filtered;
    }

    // ── Map to Frontend Shape ─────────────────────────────────────────────
    const listings = items.map((item) => {
      const pricing = item.pricing || {};
      const condition = String(item.condition || "good").toLowerCase();
      let recommendation: "borrow" | "buy_resale" | "buy_new" = "borrow";
      if (condition === "new") {
        recommendation = "buy_resale";
      } else if (condition === "good" || condition === "like_new") {
        recommendation = Math.random() > 0.6 ? "buy_resale" : "borrow";
      }

      return {
        id: item.item_id,
        title: item.title || "",
        category: item.category || "",
        condition: item.condition || "good",
        borrowPrice: Number(pricing.borrow_price_per_day || 0),
        resalePrice: Number(pricing.resale_price || 0),
        recommendation,
        co2Saved: Number(item.co2_saved_kg || 10),
        image: item.image_url || item.image || "",
        // Extra fields for detail page
        description: item.description || "",
        narration: item.narration || "",
        location: item.location || "",
        latitude: item.latitude ? Number(item.latitude) : null,
        longitude: item.longitude ? Number(item.longitude) : null,
        ownerId: item.owner_id || "",
      };
    });

    return NextResponse.json({
      listings,
      count: listings.length,
      // Debug info (remove in production)
      _search: query
        ? { aiKeywords, aiCategory, effectiveCategory }
        : undefined,
    });
  } catch (err) {
    console.error("GET /api/listings error:", err);
    return NextResponse.json(
      { error: "Failed to fetch listings", listings: [] },
      { status: 500 }
    );
  }
}

