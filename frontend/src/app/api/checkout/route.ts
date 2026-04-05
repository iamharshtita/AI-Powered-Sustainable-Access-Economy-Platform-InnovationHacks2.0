import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-03-31.basil",
});

const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" });
const docClient = DynamoDBDocumentClient.from(ddbClient);
const ITEMS_TABLE = "SustainableAccessPlatformStack-Items";

/**
 * POST /api/checkout — Create a Stripe Checkout Session.
 *
 * Body: {
 *   item_id: string,
 *   type: "borrow" | "buy_resale",
 *   duration_days?: number (required for borrow),
 *   user_id: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { item_id, type, duration_days, user_id } = body;

    if (!item_id || !type || !user_id) {
      return NextResponse.json(
        { error: "Missing required fields: item_id, type, user_id" },
        { status: 400 }
      );
    }

    if (type === "borrow" && (!duration_days || duration_days < 1)) {
      return NextResponse.json(
        { error: "Duration must be at least 1 day for borrow" },
        { status: 400 }
      );
    }

    // Fetch item from DynamoDB
    const itemResult = await docClient.send(
      new GetCommand({ TableName: ITEMS_TABLE, Key: { item_id } })
    );

    if (!itemResult.Item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const item = itemResult.Item;
    const pricing = item.pricing || {};
    const title = item.title || "Item";
    const category = item.category || "";

    let amount: number;
    let description: string;

    if (type === "borrow") {
      const dailyRate = Number(pricing.borrow_price_per_day || 0);
      amount = dailyRate * (duration_days || 1);
      description = `Borrow "${title}" for ${duration_days} day${duration_days > 1 ? "s" : ""} @ $${dailyRate}/day`;
    } else {
      amount = Number(pricing.resale_price || 0);
      description = `Buy Resale "${title}"`;
    }

    if (amount <= 0) {
      return NextResponse.json({ error: "Invalid price" }, { status: 400 });
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: title,
              description,
              metadata: {
                item_id,
                category,
                type,
              },
            },
            unit_amount: Math.round(amount * 100), // Stripe uses cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.AUTH0_BASE_URL || "http://localhost:3000"}/checkout/success?session_id={CHECKOUT_SESSION_ID}&item_id=${item_id}&type=${type}&duration=${duration_days || 0}`,
      cancel_url: `${process.env.AUTH0_BASE_URL || "http://localhost:3000"}/listings/${item_id}`,
      metadata: {
        item_id,
        type,
        duration_days: String(duration_days || 0),
        user_id,
        category,
        co2_saved_kg: String(item.co2_saved_kg || 0),
        title,
      },
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (err) {
    console.error("POST /api/checkout error:", err);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
