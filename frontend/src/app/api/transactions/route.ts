import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  UpdateCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";

const REGION = process.env.AWS_REGION || "us-east-1";
const TRANSACTIONS_TABLE = "SustainableAccessPlatformStack-Transactions";
const USERS_TABLE = "SustainableAccessPlatformStack-Users";
const EVENTS_TABLE = "SustainableAccessPlatformStack-Events";

const ddbClient = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(ddbClient);

/**
 * POST /api/transactions — Record a completed transaction in DynamoDB.
 *
 * Body: {
 *   user_id: string,
 *   item_id: string,
 *   type: "borrow" | "buy_resale",
 *   title: string,
 *   category: string,
 *   amount: number,
 *   duration_days: number,
 *   co2_saved_kg: number,
 *   stripe_session_id?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      user_id,
      item_id,
      type,
      title,
      category,
      amount,
      duration_days,
      co2_saved_kg,
      stripe_session_id,
    } = body;

    if (!user_id || !item_id || !type) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const transactionId = uuidv4();
    const rewardPoints = type === "borrow" ? 50 : 30;

    // 1. Create transaction record
    const endDate = type === "borrow" && duration_days > 0
      ? new Date(Date.now() + duration_days * 86400000).toISOString()
      : undefined;

    await docClient.send(
      new PutCommand({
        TableName: TRANSACTIONS_TABLE,
        Item: {
          transaction_id: transactionId,
          user_id,
          item_id,
          type,
          title: title || "",
          category: category || "",
          amount: amount || 0,
          duration_days: duration_days || 0,
          co2_saved_kg: co2_saved_kg || 0,
          status: "completed",
          reward_points_awarded: rewardPoints,
          stripe_session_id: stripe_session_id || "",
          created_at: now,
          updated_at: now,
          ...(endDate ? { end_date: endDate } : {}),
        },
      })
    );

    // 2. Award reward points to user
    try {
      await docClient.send(
        new UpdateCommand({
          TableName: USERS_TABLE,
          Key: { user_id },
          UpdateExpression:
            "SET reward_points = if_not_exists(reward_points, :zero) + :pts, updated_at = :now",
          ExpressionAttributeValues: {
            ":pts": rewardPoints,
            ":zero": 0,
            ":now": now,
          },
        })
      );
    } catch (e) {
      console.error("Failed to award points:", e);
    }

    // 3. Record event
    try {
      await docClient.send(
        new PutCommand({
          TableName: EVENTS_TABLE,
          Item: {
            event_id: uuidv4(),
            user_id,
            event_type: type === "borrow" ? "borrow" : "buy",
            item_id,
            metadata: { transaction_id: transactionId },
            timestamp: now,
          },
        })
      );
    } catch (e) {
      console.error("Failed to record event:", e);
    }

    return NextResponse.json({
      transaction_id: transactionId,
      reward_points_awarded: rewardPoints,
      co2_saved_kg: co2_saved_kg || 0,
      message: `${type === "borrow" ? "Borrow" : "Purchase"} completed! You earned ${rewardPoints} reward points.`,
    });
  } catch (err) {
    console.error("POST /api/transactions error:", err);
    return NextResponse.json(
      { error: "Failed to record transaction" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/transactions?user_id=... — Fetch user's transactions.
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("user_id");
    if (!userId) {
      return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
    }

    const result = await docClient.send(
      new ScanCommand({
        TableName: TRANSACTIONS_TABLE,
        FilterExpression: "user_id = :uid",
        ExpressionAttributeValues: { ":uid": userId },
      })
    );

    const transactions = (result.Items || [])
      .sort((a, b) => {
        const dateA = String(a.created_at || "");
        const dateB = String(b.created_at || "");
        return dateB.localeCompare(dateA); // newest first
      })
      .map((tx) => ({
        transaction_id: tx.transaction_id,
        item_id: tx.item_id,
        type: tx.type,
        title: tx.title || "",
        category: tx.category || "",
        amount: Number(tx.amount || 0),
        duration_days: Number(tx.duration_days || 0),
        co2_saved_kg: Number(tx.co2_saved_kg || 0),
        status: tx.status || "completed",
        reward_points_awarded: Number(tx.reward_points_awarded || 0),
        created_at: tx.created_at || "",
      }));

    return NextResponse.json({ transactions, count: transactions.length });
  } catch (err) {
    console.error("GET /api/transactions error:", err);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}
