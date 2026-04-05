import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

const REGION = process.env.AWS_REGION || "us-east-1";
const TABLE_NAME =
  process.env.USERS_TABLE_NAME || "SustainableAccessPlatformStack-Users";

const ddbClient = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(ddbClient);

/**
 * POST /api/profile — Save / update user profile in DynamoDB.
 * Called by the onboarding page after a new user fills in their details.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      user_id,
      email,
      display_name,
      address,
      phone_number,
    } = body as Record<string, string>;

    if (!user_id) {
      return NextResponse.json(
        { error: "Missing required field: user_id" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    // Check if user already exists
    const existing = await docClient.send(
      new GetCommand({ TableName: TABLE_NAME, Key: { user_id } })
    );

    if (existing.Item) {
      // Update existing user
      const updates: string[] = ["updated_at = :ua"];
      const values: Record<string, string> = { ":ua": now };

      if (display_name) {
        updates.push("display_name = :dn");
        values[":dn"] = display_name;
      }
      if (address) {
        updates.push("address = :addr");
        values[":addr"] = address;
      }
      if (phone_number) {
        updates.push("phone_number = :ph");
        values[":ph"] = phone_number;
      }

      await docClient.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { user_id },
          UpdateExpression: "SET " + updates.join(", "),
          ExpressionAttributeValues: values,
        })
      );

      return NextResponse.json({
        user_id,
        message: "User updated",
      });
    }

    // Create new user
    const item: Record<string, string | number> = {
      user_id,
      trust_score: 50,
      reward_points: 0,
      created_at: now,
      updated_at: now,
    };
    if (email) item.email = email;
    if (display_name) item.display_name = display_name;
    if (address) item.address = address;
    if (phone_number) item.phone_number = phone_number;

    await docClient.send(
      new PutCommand({ TableName: TABLE_NAME, Item: item })
    );

    return NextResponse.json(
      { user_id, message: "User created" },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/profile error:", err);
    return NextResponse.json(
      { error: "Failed to save profile" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/profile?user_id=... — Fetch user profile from DynamoDB.
 * Returns the user's display_name, email, address, phone, trust_score, etc.
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("user_id");
    if (!userId) {
      return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
    }

    const result = await docClient.send(
      new GetCommand({ TableName: TABLE_NAME, Key: { user_id: userId } })
    );

    const item = result.Item;
    if (!item) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      user_id: item.user_id,
      display_name: item.display_name || "",
      email: item.email || "",
      address: item.address || "",
      phone_number: item.phone_number || "",
      trust_score: Number(item.trust_score ?? 50),
      reward_points: Number(item.reward_points ?? 0),
      created_at: item.created_at || "",
      updated_at: item.updated_at || "",
    });
  } catch (err) {
    console.error("GET /api/profile error:", err);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}
