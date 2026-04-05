"""Seed script — inserts mock listing data into DynamoDB Items table.

Usage:
    python3 backend/scripts/seed_items.py

The table name is read from the CDK output or can be overridden:
    TABLE_NAME=SustainableAccessPlatformStack-Items python3 backend/scripts/seed_items.py
"""

import boto3
import os
from datetime import datetime, timezone
from decimal import Decimal

TABLE_NAME = os.environ.get(
    "TABLE_NAME", "SustainableAccessPlatformStack-Items"
)

SEED_USER_ID = "seed-user-001"  # placeholder owner for demo items

NOW = datetime.now(timezone.utc).isoformat()

ITEMS = [
    {
        "item_id": "1",
        "owner_id": SEED_USER_ID,
        "title": "Makita Power Drill 18V",
        "category": "tools",
        "condition": "like_new",
        "description": "Professional-grade 18V cordless drill in excellent condition. Comes with 2 batteries, charger, and a full set of bits. Perfect for weekend DIY projects without the commitment of buying.",
        "pricing": {"borrow_price_per_day": 12, "resale_price": 85},
        "location": "Tempe, AZ",
        "latitude": 33.4340,
        "longitude": -111.9280,
        "status": "active",
        "image": "/items/drill.png",
        "narration": "Hi, I'm a power drill! I only get used for about 13 minutes in my entire lifespan. Why not borrow me for your project and let someone else use me next?",
        "co2_saved_kg": 15.4,
        "created_at": NOW,
        "updated_at": NOW,
    },
    {
        "item_id": "2",
        "owner_id": SEED_USER_ID,
        "title": "Vintage Fuji Film Camera",
        "category": "electronics",
        "condition": "good",
        "description": "Classic Fujifilm X-T10 with 35mm f/1.4 lens. Beautiful brown leather half-case included. This camera has character and produces stunning images with that vintage film look.",
        "pricing": {"borrow_price_per_day": 20, "resale_price": 250},
        "location": "Scottsdale, AZ",
        "latitude": 33.4150,
        "longitude": -111.9530,
        "status": "active",
        "image": "/items/camera.png",
        "narration": "I've captured a thousand memories, but I have millions more to give. Take me with you on your next journey!",
        "co2_saved_kg": 32.1,
        "created_at": NOW,
        "updated_at": NOW,
    },
    {
        "item_id": "3",
        "owner_id": SEED_USER_ID,
        "title": "Coleman Camping Tent 4-Person",
        "category": "outdoor",
        "condition": "fair",
        "description": "Reliable 4-person tent perfect for weekend camping trips. Easy setup, good waterproofing, and spacious interior. Minor wear on the rain fly but fully functional.",
        "pricing": {"borrow_price_per_day": 15, "resale_price": 60},
        "location": "Mesa, AZ",
        "latitude": 33.4450,
        "longitude": -111.9100,
        "status": "active",
        "image": "/items/tent.png",
        "narration": "I'm meant to be under the stars, not stuck in a closet. Let's go camping — I promise I'll keep you dry!",
        "co2_saved_kg": 48.0,
        "created_at": NOW,
        "updated_at": NOW,
    },
    {
        "item_id": "4",
        "owner_id": SEED_USER_ID,
        "title": "KitchenAid Stand Mixer",
        "category": "kitchen",
        "condition": "good",
        "description": "Classic KitchenAid stand mixer in excellent working condition. Perfect for baking projects, bread making, and more. Includes standard attachments.",
        "pricing": {"borrow_price_per_day": 18, "resale_price": 180},
        "location": "Phoenix, AZ",
        "latitude": 33.4380,
        "longitude": -111.9600,
        "status": "active",
        "image": None,
        "narration": "Hi, I'm a KitchenAid mixer! I love helping bakers create delicious treats. Borrow me for your next baking adventure!",
        "co2_saved_kg": 25.2,
        "created_at": NOW,
        "updated_at": NOW,
    },
    {
        "item_id": "5",
        "owner_id": SEED_USER_ID,
        "title": "Yoga Mat Premium",
        "category": "wellness",
        "condition": "like_new",
        "description": "High-quality cork yoga mat, barely used. Non-slip surface, eco-friendly materials. Perfect for yoga, pilates, or meditation.",
        "pricing": {"borrow_price_per_day": 5, "resale_price": 30},
        "location": "Tempe, AZ",
        "latitude": 33.4180,
        "longitude": -111.9350,
        "status": "active",
        "image": None,
        "narration": "I'm a premium yoga mat waiting to help you find your zen. Let's stretch together!",
        "co2_saved_kg": 8.7,
        "created_at": NOW,
        "updated_at": NOW,
    },
    {
        "item_id": "6",
        "owner_id": SEED_USER_ID,
        "title": "Mountain Bike - Trek",
        "category": "sports",
        "condition": "good",
        "description": "Trek mountain bike, 21-speed, great for trails and city riding. Recently serviced with new brakes and tires. Helmet included.",
        "pricing": {"borrow_price_per_day": 25, "resale_price": 450},
        "location": "Scottsdale, AZ",
        "latitude": 33.4510,
        "longitude": -111.9450,
        "status": "active",
        "image": None,
        "narration": "I'm a Trek mountain bike ready for adventure! Let's hit the trails together.",
        "co2_saved_kg": 62.5,
        "created_at": NOW,
        "updated_at": NOW,
    },
    {
        "item_id": "7",
        "owner_id": SEED_USER_ID,
        "title": "Standing Desk Converter",
        "category": "furniture",
        "condition": "like_new",
        "description": "Adjustable standing desk converter, fits most desks. Promotes better posture and productivity. Easy to set up, no tools required.",
        "pricing": {"borrow_price_per_day": 10, "resale_price": 120},
        "location": "Mesa, AZ",
        "latitude": 33.4100,
        "longitude": -111.9200,
        "status": "active",
        "image": None,
        "narration": "Hi, I'm a standing desk converter! I'll help you work healthier. Try me before you buy!",
        "co2_saved_kg": 18.9,
        "created_at": NOW,
        "updated_at": NOW,
    },
    {
        "item_id": "8",
        "owner_id": SEED_USER_ID,
        "title": "DJI Mini 3 Drone",
        "category": "electronics",
        "condition": "like_new",
        "description": "DJI Mini 3 drone with 4K camera. Lightweight, easy to fly, and produces stunning aerial footage. Includes 2 batteries and carrying case.",
        "pricing": {"borrow_price_per_day": 35, "resale_price": 400},
        "location": "Phoenix, AZ",
        "latitude": 33.4420,
        "longitude": -111.9700,
        "status": "active",
        "image": None,
        "narration": "I'm a DJI Mini 3 drone! I can capture breathtaking aerial views. Borrow me for your next shoot!",
        "co2_saved_kg": 44.2,
        "created_at": NOW,
        "updated_at": NOW,
    },
]


def _to_decimal(value):
    """Recursively convert floats to Decimal for DynamoDB compatibility."""
    if isinstance(value, float):
        return Decimal(str(value))
    if isinstance(value, dict):
        return {k: _to_decimal(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_to_decimal(v) for v in value]
    return value


def seed():
    dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
    table = dynamodb.Table(TABLE_NAME)

    print(f"Seeding {len(ITEMS)} items into {TABLE_NAME}...")

    for item in ITEMS:
        # Remove None values — DynamoDB doesn't accept None
        # Convert floats to Decimal — DynamoDB requirement
        clean_item = {k: _to_decimal(v) for k, v in item.items() if v is not None}
        table.put_item(Item=clean_item)
        print(f"  ✓ {item['title']}")

    print(f"\nDone! {len(ITEMS)} items seeded.")
    print(f"\nVerify with:")
    print(f"  aws dynamodb scan --table-name {TABLE_NAME} --select COUNT")


if __name__ == "__main__":
    seed()
