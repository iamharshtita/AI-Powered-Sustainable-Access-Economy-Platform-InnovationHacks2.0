import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const REGION = process.env.AWS_REGION || "us-east-1";
const TABLE_NAME = "SustainableAccessPlatformStack-Items";

const ddbClient = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(ddbClient);

/**
 * GET /api/listings — Fetch all active listings from DynamoDB Items table.
 *
 * Query params:
 *   ?category=electronics   — Filter by category (case-insensitive)
 *   ?q=camera               — Search query (matches title or description)
 */
export async function GET(request: NextRequest) {
  try {
    const category = request.nextUrl.searchParams.get("category");
    const query = request.nextUrl.searchParams.get("q");

    // Build filter expression — always filter for active items
    let filterExpression = "#s = :active";
    const exprAttrNames: Record<string, string> = { "#s": "status" };
    const exprAttrValues: Record<string, string> = { ":active": "active" };

    if (category && category.toLowerCase() !== "all") {
      filterExpression += " AND #cat = :cat";
      exprAttrNames["#cat"] = "category";
      exprAttrValues[":cat"] = category.toLowerCase();
    }

    // Scan the table (fine for hackathon scale ~30 items)
    const result = await docClient.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: filterExpression,
      ExpressionAttributeNames: exprAttrNames,
      ExpressionAttributeValues: exprAttrValues,
    }));
    let items = result.Items || [];

    // Apply text search filter in-memory (case-insensitive)
    if (query) {
      const q = query.toLowerCase();
      items = items.filter((item) => {
        const title = String(item.title || "").toLowerCase();
        const description = String(item.description || "").toLowerCase();
        const cat = String(item.category || "").toLowerCase();
        return title.includes(q) || description.includes(q) || cat.includes(q);
      });
    }

    // Map to frontend-friendly shape matching ListingProps
    const listings = items.map((item) => {
      const pricing = item.pricing || {};
      // Determine recommendation based on condition
      const condition = String(item.condition || "good").toLowerCase();
      let recommendation: "borrow" | "buy_resale" | "buy_new" = "borrow";
      if (condition === "new") {
        recommendation = "buy_resale";
      } else if (condition === "good" || condition === "like_new") {
        // Alternate between borrow and buy_resale for variety
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

    return NextResponse.json({ listings, count: listings.length });
  } catch (err) {
    console.error("GET /api/listings error:", err);
    return NextResponse.json(
      { error: "Failed to fetch listings", listings: [] },
      { status: 500 }
    );
  }
}
