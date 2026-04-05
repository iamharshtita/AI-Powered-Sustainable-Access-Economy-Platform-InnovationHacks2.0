import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const REGION = process.env.AWS_REGION || "us-east-1";
const PROFILES_TABLE = "SustainableAccessPlatformStack-ConsumptionProfiles";
const TRANSACTIONS_TABLE = "SustainableAccessPlatformStack-Transactions";

const ddbClient = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(ddbClient);

/**
 * GET /api/dashboard?user_id=... — Fetch dashboard data.
 *
 * Returns aggregated stats from consumption profiles and transactions.
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("user_id");

    // Fetch consumption profile (use primary user if no specific user)
    const profileResult = await docClient.send(
      new ScanCommand({
        TableName: PROFILES_TABLE,
        Limit: 1,
        ...(userId
          ? {
              FilterExpression: "user_id = :uid",
              ExpressionAttributeValues: { ":uid": userId },
            }
          : {}),
      })
    );

    const profile = profileResult.Items?.[0] || null;

    // Fetch all transactions (or user-specific)
    const txResult = await docClient.send(
      new ScanCommand({
        TableName: TRANSACTIONS_TABLE,
        ...(userId
          ? {
              FilterExpression: "user_id = :uid",
              ExpressionAttributeValues: { ":uid": userId },
            }
          : {}),
      })
    );

    const transactions = txResult.Items || [];

    // Compute stats from transactions
    const borrowCount = transactions.filter((t) => t.type === "borrow").length;
    const buyCount = transactions.filter((t) => t.type !== "borrow").length;
    const totalCo2 = transactions.reduce(
      (sum, t) => sum + Number(t.co2_saved_kg || 0),
      0
    );
    const totalSaved = transactions.reduce(
      (sum, t) => sum + Number(t.amount || 0),
      0
    );

    // Category breakdown from transactions
    const catBreakdown: Record<string, { count: number; co2: number }> = {};
    for (const tx of transactions) {
      const cat = String(tx.category || "other");
      if (!catBreakdown[cat]) catBreakdown[cat] = { count: 0, co2: 0 };
      catBreakdown[cat].count++;
      catBreakdown[cat].co2 += Number(tx.co2_saved_kg || 0);
    }

    // Sort categories by CO₂ desc
    const categoryStats = Object.entries(catBreakdown)
      .map(([name, data]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        count: data.count,
        co2: Math.round(data.co2 * 10) / 10,
        pct: totalCo2 > 0 ? Math.round((data.co2 / totalCo2) * 100) : 0,
      }))
      .sort((a, b) => b.co2 - a.co2);

    // Use consumption profile data if available
    const ecoScore = profile ? Number(profile.eco_score || 87) : 87;
    const co2SavedKg = profile ? Number(profile.total_co2_saved_kg || totalCo2) : totalCo2;
    const moneySaved = profile ? Number(profile.total_money_saved || totalSaved) : totalSaved;

    return NextResponse.json({
      stats: {
        borrow_count: profile ? Number(profile.total_borrows || borrowCount) : borrowCount,
        buy_count: profile ? Number(profile.total_purchases || buyCount) : buyCount,
        co2_saved_kg: Math.round(co2SavedKg * 10) / 10,
        money_saved: Math.round(moneySaved),
        eco_score: ecoScore,
        trees_equivalent: Math.round(co2SavedKg / 21), // ~21kg CO₂ per tree/year
        car_miles_avoided: Math.round(co2SavedKg * 2.5),
      },
      category_breakdown: categoryStats,
      transaction_count: transactions.length,
    });
  } catch (err) {
    console.error("GET /api/dashboard error:", err);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
