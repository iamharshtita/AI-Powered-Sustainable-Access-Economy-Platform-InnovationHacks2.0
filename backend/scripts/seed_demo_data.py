#!/usr/bin/env python3
"""Seed comprehensive demo data into all DynamoDB tables.

Seeds:
  - Items: 25 items across 9 categories (keeps existing 8, adds 17 more)
  - Transactions: 20 demo transactions for the logged-in user
  - Events: 35 user activity events (search, view, borrow, buy)
  - Consumption Profiles: Pre-computed profile for demo user
  - Users: Updates existing users with realistic trust_score / reward_points

Run:
  python3 backend/scripts/seed_demo_data.py
"""

import boto3
import uuid
import random
from datetime import datetime, timedelta, timezone
from decimal import Decimal

REGION = "us-east-1"

# Table names
USERS_TABLE = "SustainableAccessPlatformStack-Users"
ITEMS_TABLE = "SustainableAccessPlatformStack-Items"
TRANSACTIONS_TABLE = "SustainableAccessPlatformStack-Transactions"
EVENTS_TABLE = "SustainableAccessPlatformStack-Events"
CONSUMPTION_TABLE = "SustainableAccessPlatformStack-ConsumptionProfiles"

# S3 bucket for images
S3_BUCKET = "sustainableaccessplatform-listingimagesbucket35876-phncghrg4bto"

# The authenticated user (John Doe) who did onboarding
PRIMARY_USER_ID = "auth0|69d1c56d512bb7809e9410d5"
# Secondary users who "own" listings
SEED_USER = "seed-user-001"
ALEX_USER = "auth0|69d1b9abf160196b86f36940"
JOE_USER = "auth0|69d1c7b0c59672fbe8464b01"

dynamodb = boto3.resource("dynamodb", region_name=REGION)
now = datetime.now(timezone.utc)


def decimal(val):
    """Convert float to Decimal for DynamoDB."""
    return Decimal(str(val))


# ─── NEW ITEMS TO SEED ───────────────────────────────────────────────────
# Items 1-8 already exist. We add items 9-25.
NEW_ITEMS = [
    # Electronics
    {
        "item_id": "9",
        "title": "Sony WH-1000XM5 Headphones",
        "category": "electronics",
        "condition": "like_new",
        "description": "Industry-leading noise canceling headphones with 30-hour battery life. Multipoint connection, speak-to-chat, and exceptional sound quality. Barely used — perfect for work-from-home or travel.",
        "narration": "Hey there! I'm the king of silence. Put me on and the world melts away. Whether you're coding, flying, or just vibing — I've got you covered with 30 hours of pure bliss.",
        "pricing": {"borrow_price_per_day": decimal(8), "resale_price": decimal(280)},
        "co2_saved_kg": decimal(12.3),
        "location": "Tempe, AZ",
        "latitude": decimal(33.4285),
        "longitude": decimal(-111.9340),
        "owner_id": SEED_USER,
        "image": "/items/headphones.png",
    },
    {
        "item_id": "10",
        "title": "iPad Pro 12.9\" M2 with Apple Pencil",
        "category": "electronics",
        "condition": "good",
        "description": "12.9-inch Liquid Retina XDR display, M2 chip, 256GB storage. Comes with Apple Pencil 2nd gen and Magic Keyboard. Great for digital art, note-taking, or media consumption.",
        "narration": "I'm not just a tablet — I'm your creative studio, your notebook, and your entertainment center all in one. My M2 chip makes everything buttery smooth!",
        "pricing": {"borrow_price_per_day": decimal(25), "resale_price": decimal(650)},
        "co2_saved_kg": decimal(28.5),
        "location": "Scottsdale, AZ",
        "latitude": decimal(33.4422),
        "longitude": decimal(-111.9271),
        "owner_id": ALEX_USER,
        "image": "/items/ipad.png",
    },
    {
        "item_id": "11",
        "title": "Portable Bluetooth Projector",
        "category": "electronics",
        "condition": "like_new",
        "description": "Mini 1080p HD projector with built-in speakers and WiFi. Projects up to 120\" screen. Perfect for movie nights, presentations, or outdoor cinema experiences.",
        "narration": "Turn any wall into a movie theater! I'm small enough to fit in your backpack but powerful enough to light up your whole backyard. Movie night, anyone?",
        "pricing": {"borrow_price_per_day": decimal(15), "resale_price": decimal(180)},
        "co2_saved_kg": decimal(14.7),
        "location": "Mesa, AZ",
        "latitude": decimal(33.4152),
        "longitude": decimal(-111.8315),
        "owner_id": JOE_USER,
        "image": "/items/projector.png",
    },
    # Furniture
    {
        "item_id": "12",
        "title": "Herman Miller Aeron Chair",
        "category": "furniture",
        "condition": "good",
        "description": "Ergonomic office chair with PostureFit SL support, size B. Fully adjustable arms, tilt, and height. The gold standard of desk chairs — your back will thank you.",
        "narration": "I've supported thousands of hours of productive work. Your back deserves the best, and I promise to keep you comfortable through even the longest coding sessions.",
        "pricing": {"borrow_price_per_day": decimal(12), "resale_price": decimal(450)},
        "co2_saved_kg": decimal(35.2),
        "location": "Chandler, AZ",
        "latitude": decimal(33.3062),
        "longitude": decimal(-111.8413),
        "owner_id": SEED_USER,
        "image": "/items/chair.png",
    },
    {
        "item_id": "13",
        "title": "Mid-Century Modern Bookshelf",
        "category": "furniture",
        "condition": "fair",
        "description": "Walnut wood 5-tier bookshelf with tapered legs. 72\" tall x 36\" wide. Beautiful grain pattern with minor surface wear that adds character. Perfect for living room or study.",
        "narration": "I've held the worlds of fiction, science, and poetry on my shelves. Each scratch tells a story. Fill me up with your favorite books and I'll make any room feel like home.",
        "pricing": {"borrow_price_per_day": decimal(8), "resale_price": decimal(120)},
        "co2_saved_kg": decimal(42.0),
        "location": "Tempe, AZ",
        "latitude": decimal(33.4370),
        "longitude": decimal(-111.9489),
        "owner_id": ALEX_USER,
        "image": "/items/bookshelf.png",
    },
    # Tools
    {
        "item_id": "14",
        "title": "DeWalt Circular Saw 7-1/4\"",
        "category": "tools",
        "condition": "good",
        "description": "20V MAX brushless circular saw with 5,500 RPM motor. Includes blade, battery, and charger. Clean cuts every time — perfect for decking, framing, or any woodworking project.",
        "narration": "I cut through wood like butter! Whether you're building a deck or framing a wall, I'll make every cut precise. Just remember — measure twice, cut once!",
        "pricing": {"borrow_price_per_day": decimal(15), "resale_price": decimal(120)},
        "co2_saved_kg": decimal(18.5),
        "location": "Gilbert, AZ",
        "latitude": decimal(33.3528),
        "longitude": decimal(-111.7890),
        "owner_id": JOE_USER,
        "image": "/items/circularsaw.png",
    },
    {
        "item_id": "15",
        "title": "Pressure Washer 3000 PSI",
        "category": "tools",
        "condition": "like_new",
        "description": "Gas-powered pressure washer with 3000 PSI and 2.4 GPM. Includes 5 quick-connect nozzles. Perfect for driveways, patios, siding, and deck cleaning. Used only twice.",
        "narration": "Watch the grime disappear! I can make your driveway look brand new in 30 minutes. Rent me for a weekend and your neighbors will want to borrow me next!",
        "pricing": {"borrow_price_per_day": decimal(20), "resale_price": decimal(200)},
        "co2_saved_kg": decimal(22.0),
        "location": "Tempe, AZ",
        "latitude": decimal(33.4195),
        "longitude": decimal(-111.9253),
        "owner_id": SEED_USER,
        "image": "/items/pressurewasher.png",
    },
    # Sports
    {
        "item_id": "16",
        "title": "Kayak - Perception Pescador 12",
        "category": "sports",
        "condition": "good",
        "description": "12-foot sit-on-top fishing kayak. Stable, comfortable with adjustable seat and rod holders. Comes with paddle and life vest. Perfect for lakes around Arizona.",
        "narration": "Take me to Saguaro Lake or Tempe Town Lake! I'm stable enough for fishing and fun enough for a lazy Sunday paddle. The water is calling!",
        "pricing": {"borrow_price_per_day": decimal(25), "resale_price": decimal(400)},
        "co2_saved_kg": decimal(55.0),
        "location": "Mesa, AZ",
        "latitude": decimal(33.4460),
        "longitude": decimal(-111.8220),
        "owner_id": ALEX_USER,
        "image": "/items/kayak.png",
    },
    {
        "item_id": "17",
        "title": "Tennis Racket Set - Wilson Pro",
        "category": "sports",
        "condition": "like_new",
        "description": "Set of 2 Wilson Pro Staff rackets with carrying bag, 3 tubes of balls, and 2 overgrips. Professional quality frames with excellent control. Perfect for doubles!",
        "narration": "Game, set, match! We're a pair of Pro Staff rackets ready to dominate any court. Grab a friend and let's play — we promise no double faults!",
        "pricing": {"borrow_price_per_day": decimal(10), "resale_price": decimal(150)},
        "co2_saved_kg": decimal(8.5),
        "location": "Scottsdale, AZ",
        "latitude": decimal(33.4500),
        "longitude": decimal(-111.9260),
        "owner_id": JOE_USER,
        "image": "/items/tennis.png",
    },
    # Outdoor
    {
        "item_id": "18",
        "title": "Backpacking Set - Osprey 65L",
        "category": "outdoor",
        "condition": "good",
        "description": "Complete backpacking setup: Osprey Atmos AG 65L pack, sleeping bag (20°F rated), and inflatable sleeping pad. Everything you need for a multi-day hiking trip.",
        "narration": "Adventure awaits! I'm your complete backcountry setup. Just add trail mix and ambition. I'll carry everything else while keeping your back happy on the trail.",
        "pricing": {"borrow_price_per_day": decimal(18), "resale_price": decimal(350)},
        "co2_saved_kg": decimal(38.0),
        "location": "Phoenix, AZ",
        "latitude": decimal(33.4484),
        "longitude": decimal(-112.0740),
        "owner_id": SEED_USER,
        "image": "/items/backpack.png",
    },
    {
        "item_id": "19",
        "title": "Portable Propane Grill - Weber",
        "category": "outdoor",
        "condition": "like_new",
        "description": "Weber Q1200 portable gas grill with stand. 189 sq inches of cooking space. Folds flat for transport. Perfect for tailgating, camping, or apartment patios.",
        "narration": "I sizzle, I grill, I make everyone's mouth water! Take me to your next tailgate or camping trip. I promise perfectly seared burgers every single time.",
        "pricing": {"borrow_price_per_day": decimal(12), "resale_price": decimal(180)},
        "co2_saved_kg": decimal(20.0),
        "location": "Tempe, AZ",
        "latitude": decimal(33.4256),
        "longitude": decimal(-111.9410),
        "owner_id": ALEX_USER,
        "image": "/items/grill.png",
    },
    # Wellness
    {
        "item_id": "20",
        "title": "Theragun Pro Massage Gun",
        "category": "wellness",
        "condition": "like_new",
        "description": "Professional-grade percussive massage device with 6 attachments and OLED screen. Reaches 60% deeper into muscle than average massagers. Bluetooth app connected.",
        "narration": "Your muscles will love me after every workout! I hit deep, I hit precise, and I never complain. Think of me as your personal masseuse — available 24/7.",
        "pricing": {"borrow_price_per_day": decimal(10), "resale_price": decimal(250)},
        "co2_saved_kg": decimal(6.5),
        "location": "Scottsdale, AZ",
        "latitude": decimal(33.4942),
        "longitude": decimal(-111.9261),
        "owner_id": JOE_USER,
        "image": "/items/massagegun.png",
    },
    {
        "item_id": "21",
        "title": "Meditation Cushion & Singing Bowl Set",
        "category": "wellness",
        "condition": "new",
        "description": "Organic buckwheat hull zafu cushion with matching zabuton mat. Includes hand-hammered Tibetan singing bowl and wooden mallet. Everything for a peaceful practice.",
        "narration": "Shhh... find your center. I'm your gateway to inner peace. Sit on me, ring the bowl, and let the world fall away. Namaste, friend.",
        "pricing": {"borrow_price_per_day": decimal(6), "resale_price": decimal(85)},
        "co2_saved_kg": decimal(4.2),
        "location": "Tempe, AZ",
        "latitude": decimal(33.4140),
        "longitude": decimal(-111.9100),
        "owner_id": SEED_USER,
        "image": "/items/meditation.png",
    },
    # Kitchen
    {
        "item_id": "22",
        "title": "Breville Barista Express Espresso Machine",
        "category": "kitchen",
        "condition": "good",
        "description": "Semi-automatic espresso machine with built-in conical burr grinder. 15 bar Italian pump, PID temperature control. Makes café-quality espresso, lattes, and cappuccinos at home.",
        "narration": "Good morning, beautiful! I grind, I tamp, I pull the perfect shot — all before you've finished yawning. Your barista has nothing on me!",
        "pricing": {"borrow_price_per_day": decimal(15), "resale_price": decimal(350)},
        "co2_saved_kg": decimal(18.0),
        "location": "Phoenix, AZ",
        "latitude": decimal(33.4484),
        "longitude": decimal(-112.0773),
        "owner_id": ALEX_USER,
        "image": "/items/espresso.png",
    },
    {
        "item_id": "23",
        "title": "Lodge Cast Iron Cookware Set (5-piece)",
        "category": "kitchen",
        "condition": "good",
        "description": "Pre-seasoned cast iron set: 10\" skillet, 12\" skillet, 5-qt dutch oven with lid, and griddle. These will last generations. Perfect for searing, baking, frying, and slow cooking.",
        "narration": "We've been cooking amazing meals since before your grandparents were born. Season us right and we'll give you the best sear of your life. We only get better with age!",
        "pricing": {"borrow_price_per_day": decimal(8), "resale_price": decimal(120)},
        "co2_saved_kg": decimal(15.0),
        "location": "Chandler, AZ",
        "latitude": decimal(33.3062),
        "longitude": decimal(-111.8413),
        "owner_id": JOE_USER,
        "image": "/items/castiron.png",
    },
    # Clothing
    {
        "item_id": "24",
        "title": "Patagonia Better Sweater Fleece Jacket",
        "category": "clothing",
        "condition": "like_new",
        "description": "Classic full-zip fleece jacket, size M. Made from 100% recycled polyester. Fair Trade Certified sewn. Warm, breathable, and sustainably made. Perfect for Arizona winter evenings.",
        "narration": "I was literally made from recycled bottles! Wear me on a cool desert evening and feel good about looking good. Sustainability never felt so cozy.",
        "pricing": {"borrow_price_per_day": decimal(6), "resale_price": decimal(80)},
        "co2_saved_kg": decimal(5.5),
        "location": "Tempe, AZ",
        "latitude": decimal(33.4255),
        "longitude": decimal(-111.9400),
        "owner_id": SEED_USER,
        "image": "/items/jacket.png",
    },
    {
        "item_id": "25",
        "title": "North Face Winter Parka - 700 Fill Down",
        "category": "clothing",
        "condition": "good",
        "description": "700-fill goose down parka with waterproof shell. Size L. Hood with removable faux fur trim. Warmest jacket you'll find — overkill for Arizona but perfect for Flagstaff ski trips.",
        "narration": "Planning a trip to the mountains? I'll keep you toasty at -20°F. Rent me for your ski weekend and return me when the snow melts. No closet space needed!",
        "pricing": {"borrow_price_per_day": decimal(12), "resale_price": decimal(220)},
        "co2_saved_kg": decimal(9.8),
        "location": "Scottsdale, AZ",
        "latitude": decimal(33.4942),
        "longitude": decimal(-111.9261),
        "owner_id": ALEX_USER,
        "image": "/items/parka.png",
    },
    # Books
    {
        "item_id": "26",
        "title": "Computer Science Textbook Bundle (5 books)",
        "category": "books",
        "condition": "good",
        "description": "Essential CS textbooks: CLRS Algorithms, SICP, Clean Code, Design Patterns (GoF), and Computer Networking (Kurose). All in great condition with minimal highlighting.",
        "narration": "We hold the secrets of computer science! From algorithms to clean code, we're a semester's worth of knowledge. Borrow us and save hundreds on textbooks!",
        "pricing": {"borrow_price_per_day": decimal(3), "resale_price": decimal(120)},
        "co2_saved_kg": decimal(3.5),
        "location": "Tempe, AZ",
        "latitude": decimal(33.4235),
        "longitude": decimal(-111.9390),
        "owner_id": JOE_USER,
        "image": "/items/textbooks.png",
    },
    {
        "item_id": "27",
        "title": "Photography & Art Coffee Table Books (3-pack)",
        "category": "books",
        "condition": "like_new",
        "description": "National Geographic Greatest Landscapes, Annie Leibovitz At Work, and Humans of New York. Beautiful hardcover editions perfect for your coffee table or creative inspiration.",
        "narration": "We're not just books — we're windows to the world. Flip our pages and travel from the Sahara to the streets of New York without leaving your couch.",
        "pricing": {"borrow_price_per_day": decimal(4), "resale_price": decimal(65)},
        "co2_saved_kg": decimal(2.8),
        "location": "Mesa, AZ",
        "latitude": decimal(33.4152),
        "longitude": decimal(-111.8315),
        "owner_id": SEED_USER,
        "image": "/items/coffeebooks.png",
    },
]


def seed_items():
    """Add new items (9-27) to the Items table. Existing 1-8 are untouched."""
    table = dynamodb.Table(ITEMS_TABLE)
    ts = now.isoformat()

    count = 0
    for item in NEW_ITEMS:
        record = {
            "item_id": item["item_id"],
            "title": item["title"],
            "category": item["category"],
            "condition": item["condition"],
            "description": item["description"],
            "narration": item["narration"],
            "pricing": item["pricing"],
            "co2_saved_kg": item["co2_saved_kg"],
            "location": item["location"],
            "latitude": item["latitude"],
            "longitude": item["longitude"],
            "owner_id": item["owner_id"],
            "image": item.get("image", ""),
            "status": "active",
            "created_at": ts,
            "updated_at": ts,
        }
        table.put_item(Item=record)
        count += 1
        print(f"  ✅ Item {item['item_id']}: {item['title']}")

    print(f"\n  → Seeded {count} new items (total with existing: {count + 8})")


def seed_transactions():
    """Create 20 demo transactions for the primary user over the past 3 months."""
    table = dynamodb.Table(TRANSACTIONS_TABLE)

    # Realistic transaction patterns:
    # Electronics: 5 borrows (triggers buy suggestion)
    # Sports: 3 borrows (hits threshold)
    # Outdoor: 2 borrows
    # Tools: 1 borrow
    # Kitchen: 1 resale purchase
    # Furniture: 1 resale purchase
    # Wellness: 2 borrows
    # Books: 1 borrow
    # Clothing: 1 borrow
    # Plus a few more extras for rich history

    transactions = [
        # Electronics - 5 borrows
        {"item_id": "9", "type": "borrow", "category": "electronics", "duration_days": 5, "days_ago": 75, "amount": 40, "co2": 12.3, "title": "Sony WH-1000XM5 Headphones"},
        {"item_id": "2", "type": "borrow", "category": "electronics", "duration_days": 7, "days_ago": 60, "amount": 140, "co2": 32.1, "title": "Vintage Fuji Film Camera"},
        {"item_id": "10", "type": "borrow", "category": "electronics", "duration_days": 3, "days_ago": 45, "amount": 75, "co2": 28.5, "title": "iPad Pro 12.9\" M2"},
        {"item_id": "11", "type": "borrow", "category": "electronics", "duration_days": 2, "days_ago": 30, "amount": 30, "co2": 14.7, "title": "Portable Bluetooth Projector"},
        {"item_id": "8", "type": "borrow", "category": "electronics", "duration_days": 4, "days_ago": 15, "amount": 140, "co2": 44.2, "title": "DJI Mini 3 Drone"},
        # Sports - 3 borrows
        {"item_id": "6", "type": "borrow", "category": "sports", "duration_days": 3, "days_ago": 70, "amount": 75, "co2": 62.5, "title": "Mountain Bike - Trek"},
        {"item_id": "17", "type": "borrow", "category": "sports", "duration_days": 2, "days_ago": 40, "amount": 20, "co2": 8.5, "title": "Tennis Racket Set"},
        {"item_id": "16", "type": "borrow", "category": "sports", "duration_days": 1, "days_ago": 10, "amount": 25, "co2": 55.0, "title": "Kayak - Perception Pescador"},
        # Outdoor - 2 borrows
        {"item_id": "3", "type": "borrow", "category": "outdoor", "duration_days": 3, "days_ago": 55, "amount": 45, "co2": 48.0, "title": "Coleman Camping Tent"},
        {"item_id": "18", "type": "borrow", "category": "outdoor", "duration_days": 5, "days_ago": 20, "amount": 90, "co2": 38.0, "title": "Backpacking Set - Osprey"},
        # Tools - 1 borrow
        {"item_id": "1", "type": "borrow", "category": "tools", "duration_days": 2, "days_ago": 50, "amount": 24, "co2": 15.4, "title": "Makita Power Drill 18V"},
        # Kitchen - 1 resale purchase
        {"item_id": "22", "type": "buy_resale", "category": "kitchen", "duration_days": 0, "days_ago": 35, "amount": 350, "co2": 18.0, "title": "Breville Espresso Machine"},
        # Furniture - 1 resale purchase
        {"item_id": "7", "type": "buy_resale", "category": "furniture", "duration_days": 0, "days_ago": 28, "amount": 120, "co2": 18.9, "title": "Standing Desk Converter"},
        # Wellness - 2 borrows
        {"item_id": "5", "type": "borrow", "category": "wellness", "duration_days": 14, "days_ago": 42, "amount": 70, "co2": 8.7, "title": "Yoga Mat Premium"},
        {"item_id": "20", "type": "borrow", "category": "wellness", "duration_days": 7, "days_ago": 18, "amount": 70, "co2": 6.5, "title": "Theragun Pro Massage Gun"},
        # Books - 1 borrow
        {"item_id": "26", "type": "borrow", "category": "books", "duration_days": 30, "days_ago": 65, "amount": 90, "co2": 3.5, "title": "CS Textbook Bundle"},
        # Clothing - 1 borrow
        {"item_id": "25", "type": "borrow", "category": "clothing", "duration_days": 3, "days_ago": 25, "amount": 36, "co2": 9.8, "title": "North Face Winter Parka"},
        # Extra borrows for richer history
        {"item_id": "19", "type": "borrow", "category": "outdoor", "duration_days": 1, "days_ago": 5, "amount": 12, "co2": 20.0, "title": "Portable Propane Grill"},
        {"item_id": "21", "type": "borrow", "category": "wellness", "duration_days": 7, "days_ago": 8, "amount": 42, "co2": 4.2, "title": "Meditation Cushion Set"},
        {"item_id": "12", "type": "borrow", "category": "furniture", "duration_days": 30, "days_ago": 3, "amount": 360, "co2": 35.2, "title": "Herman Miller Aeron Chair"},
    ]

    count = 0
    for txn in transactions:
        txn_date = now - timedelta(days=txn["days_ago"])
        end_date = txn_date + timedelta(days=txn["duration_days"]) if txn["duration_days"] > 0 else None
        is_active = end_date and end_date > now

        record = {
            "transaction_id": str(uuid.uuid4()),
            "user_id": PRIMARY_USER_ID,
            "item_id": txn["item_id"],
            "type": txn["type"],
            "category": txn["category"],
            "title": txn["title"],
            "amount": decimal(txn["amount"]),
            "co2_saved_kg": decimal(txn["co2"]),
            "duration_days": txn["duration_days"],
            "status": "active" if is_active else "completed",
            "reward_points_awarded": 50 if txn["type"] == "borrow" else 30,
            "created_at": txn_date.isoformat(),
            "updated_at": (end_date or txn_date).isoformat(),
        }
        if end_date:
            record["end_date"] = end_date.isoformat()

        table.put_item(Item=record)
        count += 1
        emoji = "🔄" if txn["type"] == "borrow" else "🛒"
        print(f"  {emoji} {txn['type']:>12} | {txn['title']:>40} | ${txn['amount']:>5} | {txn['days_ago']}d ago")

    print(f"\n  → Seeded {count} transactions")


def seed_events():
    """Seed 35 user activity events for realistic consumption tracking."""
    table = dynamodb.Table(EVENTS_TABLE)

    events = []

    # Search events (10)
    searches = [
        ("camera", 80), ("drill", 72), ("tent camping", 60), ("bike", 55),
        ("headphones noise cancel", 48), ("espresso machine", 40), ("yoga mat", 35),
        ("laptop stand", 30), ("kayak", 22), ("drone", 14),
    ]
    for query, days_ago in searches:
        events.append({
            "event_type": "search",
            "item_id": "",
            "metadata": {"query": query},
            "days_ago": days_ago,
        })

    # View events (15) - showing browsing behavior
    views = [
        ("1", 73), ("2", 62), ("3", 58), ("9", 50), ("6", 48),
        ("10", 46), ("11", 38), ("1", 36), ("8", 32), ("17", 28),
        ("22", 26), ("5", 22), ("20", 19), ("1", 12), ("16", 11),
    ]
    for item_id, days_ago in views:
        events.append({
            "event_type": "view",
            "item_id": item_id,
            "metadata": {},
            "days_ago": days_ago,
        })

    # Borrow events (8) - matching transactions
    borrows = [
        ("9", 75), ("2", 60), ("6", 70), ("3", 55),
        ("10", 45), ("5", 42), ("8", 15), ("17", 40),
    ]
    for item_id, days_ago in borrows:
        events.append({
            "event_type": "borrow",
            "item_id": item_id,
            "metadata": {},
            "days_ago": days_ago,
        })

    # Buy events (2) - matching resale purchases
    buys = [("22", 35), ("7", 28)]
    for item_id, days_ago in buys:
        events.append({
            "event_type": "buy",
            "item_id": item_id,
            "metadata": {},
            "days_ago": days_ago,
        })

    count = 0
    for evt in events:
        evt_date = now - timedelta(days=evt["days_ago"])
        record = {
            "event_id": str(uuid.uuid4()),
            "user_id": PRIMARY_USER_ID,
            "event_type": evt["event_type"],
            "item_id": evt["item_id"],
            "metadata": evt["metadata"],
            "timestamp": evt_date.isoformat(),
        }
        table.put_item(Item=record)
        count += 1

    print(f"  → Seeded {count} events (10 search, 15 view, 8 borrow, 2 buy)")


def seed_consumption_profile():
    """Create pre-computed consumption profile for the primary user."""
    table = dynamodb.Table(CONSUMPTION_TABLE)

    profile = {
        "user_id": PRIMARY_USER_ID,
        "total_borrows": 18,
        "total_purchases": 2,
        "total_co2_saved_kg": decimal(465.0),
        "total_money_saved": decimal(1840),
        "category_borrow_counts": {
            "electronics": 5,
            "sports": 3,
            "outdoor": 3,
            "tools": 1,
            "wellness": 3,
            "books": 1,
            "clothing": 1,
            "furniture": 1,
        },
        "category_co2_saved": {
            "electronics": decimal(131.8),
            "sports": decimal(126.0),
            "outdoor": decimal(106.0),
            "tools": decimal(15.4),
            "wellness": decimal(19.4),
            "books": decimal(3.5),
            "clothing": decimal(9.8),
            "furniture": decimal(54.1),
        },
        "monthly_activity": {
            "2026-01": 4,
            "2026-02": 6,
            "2026-03": 8,
            "2026-04": 2,
        },
        "eco_score": 87,
        "updated_at": now.isoformat(),
    }

    table.put_item(Item=profile)
    print("  → Seeded consumption profile for primary user")
    print(f"     Borrows: {profile['total_borrows']}  |  Purchases: {profile['total_purchases']}")
    print(f"     CO₂ Saved: {profile['total_co2_saved_kg']} kg  |  Money Saved: ${profile['total_money_saved']}")
    print(f"     Eco Score: {profile['eco_score']}")


def update_users():
    """Update user records with realistic stats."""
    table = dynamodb.Table(USERS_TABLE)

    updates = [
        {
            "user_id": PRIMARY_USER_ID,
            "trust_score": decimal(92),
            "reward_points": 2450,
        },
        {
            "user_id": SEED_USER,
            "trust_score": decimal(85),
            "reward_points": 1250,
        },
        {
            "user_id": ALEX_USER,
            "trust_score": decimal(78),
            "reward_points": 890,
        },
        {
            "user_id": JOE_USER,
            "trust_score": decimal(71),
            "reward_points": 520,
        },
    ]

    for user in updates:
        table.update_item(
            Key={"user_id": user["user_id"]},
            UpdateExpression="SET trust_score = :ts, reward_points = :rp",
            ExpressionAttributeValues={
                ":ts": user["trust_score"],
                ":rp": user["reward_points"],
            },
        )
        print(f"  ✅ {user['user_id'][:30]:>30} → trust={user['trust_score']}, points={user['reward_points']}")

    print(f"\n  → Updated {len(updates)} users")


def main():
    print("=" * 60)
    print("🌿 ReEarth Demo Data Seeder")
    print("=" * 60)

    print("\n📦 1. Seeding Items...")
    seed_items()

    print("\n💳 2. Seeding Transactions...")
    seed_transactions()

    print("\n📊 3. Seeding Events...")
    seed_events()

    print("\n🧠 4. Seeding Consumption Profile...")
    seed_consumption_profile()

    print("\n👤 5. Updating User Stats...")
    update_users()

    print("\n" + "=" * 60)
    print("✅ All demo data seeded successfully!")
    print("=" * 60)
    print(f"\n  Items:      8 existing + 19 new = 27 total")
    print(f"  Transactions: 20 demo transactions")
    print(f"  Events:     35 user activity events")
    print(f"  Profiles:   1 consumption profile")
    print(f"  Users:      4 users updated")
    print()


if __name__ == "__main__":
    main()
