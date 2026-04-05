# ReEarth Platform APIs

The ReEarth platform exposes two categories of APIs:

1. **Next.js API Routes** — Server-side routes running inside AWS Amplify. These directly access DynamoDB, Bedrock, Stripe, and ElevenLabs. Used by the frontend.
2. **AWS API Gateway Endpoints** — REST endpoints backed by Lambda functions. Protected by Auth0 JWT. Used for domain logic (recommendations, rewards, CO₂, etc.).

---

## Base URLs

### Next.js API Routes (via Amplify)

```
Production:  https://YOUR_AMPLIFY_DOMAIN/api
Local dev:   http://localhost:3000/api
```

### AWS API Gateway

```
https://XXXXXXXXXX.execute-api.us-east-1.amazonaws.com/prod/api
```

> **[PLACEHOLDER]** Replace `XXXXXXXXXX` with your actual API Gateway ID from `cdk deploy` outputs.

All API Gateway routes require:
```
Authorization: Bearer <Auth0_JWT_Token>
```

---

## 1) Listings

### Next.js Route

#### `GET /api/listings` — Fetch listings with optional AI search

- **Purpose**: Returns all active listings from DynamoDB. Supports AI-powered natural language search via Amazon Bedrock and category filtering.
- **Query parameters**:

  | Parameter | Type | Description |
  |---|---|---|
  | `q` | `string` | Natural language search query (e.g., "show me some drones") |
  | `category` | `string` | Filter by category (e.g., `electronics`, `outdoor`, `books`) |

- **No auth required** (public endpoint)
- **Example request**:
  ```
  GET /api/listings?q=camera&category=electronics
  ```
- **Response**:
  ```json
  {
    "listings": [
      {
        "id": "item_abc123",
        "title": "Fujifilm X-T5 Camera",
        "category": "electronics",
        "condition": "like_new",
        "borrowPrice": 25,
        "resalePrice": 950,
        "recommendation": "borrow",
        "co2Saved": 18.5,
        "image": "https://s3.amazonaws.com/.../fujifilm-xt5.jpg",
        "description": "...",
        "location": "Phoenix, AZ",
        "latitude": 33.4484,
        "longitude": -112.074,
        "ownerId": "user_xyz"
      }
    ],
    "count": 1,
    "_search": {
      "aiKeywords": ["camera"],
      "aiCategory": "electronics",
      "effectiveCategory": "electronics"
    }
  }
  ```

---

### AWS API Gateway Routes

#### `POST /api/listings` — Create a new listing *(Auth required)*

- **Purpose**: Creates a new marketplace listing in DynamoDB
- **Request body**:
  ```json
  {
    "title": "string",
    "category": "electronics | furniture | tools | sports | outdoor | wellness | kitchen | clothing | books",
    "condition": "new | like_new | good | fair",
    "description": "string",
    "location": "string",
    "pricing": {
      "borrow_price_per_day": 10,
      "resale_price": 200
    }
  }
  ```
- **Response**: Created item with `item_id`

#### `GET /api/listings/{item_id}` — Get a single listing *(Auth required)*

- **Purpose**: Fetches full details for a specific item by ID
- **Response**: Full item record including all pricing, location, and metadata

#### `PUT /api/listings/{item_id}` — Update a listing *(Auth required)*

- **Purpose**: Updates a listing's details (only by owner)
- **Request body**: Any fields to update (same shape as POST)

#### `DELETE /api/listings/{item_id}` — Delete a listing *(Auth required)*

- **Purpose**: Soft-deletes (sets status to `inactive`) a listing

#### `GET /api/listings/{item_id}/upload-url` — Get S3 presigned upload URL *(Auth required)*

- **Purpose**: Returns a presigned S3 URL for uploading a product image
- **Response**:
  ```json
  {
    "upload_url": "https://s3.amazonaws.com/...?X-Amz-Signature=...",
    "image_url": "https://s3.amazonaws.com/.../item_abc123.jpg"
  }
  ```

#### `GET /api/listings/nearby` — Find nearby listings *(Auth required)*

- **Purpose**: Returns listings sorted by proximity to the user's location
- **Query parameters**: `lat`, `lng`, `radius_km`

---

## 2) Search

#### `GET /api/search` — Backend search *(Auth required)*

- **Purpose**: Text-based search across listing titles and descriptions

#### `POST /api/search/voice` — Voice search *(Auth required)*

- **Purpose**: Accepts a voice transcript and returns matching listings
- **Request body**:
  ```json
  { "transcript": "show me kayaks for rent" }
  ```

---

## 3) User Profile

### Next.js Routes

#### `POST /api/profile` — Create or update user profile

- **Purpose**: Called by the onboarding flow to save a new user's profile to DynamoDB
- **Request body**:
  ```json
  {
    "user_id": "auth0|xxxxxxxx",
    "email": "user@example.com",
    "display_name": "Jane Doe",
    "address": "123 Main St, Phoenix, AZ",
    "phone_number": "+1-555-0100"
  }
  ```
- **Response**:
  ```json
  { "user_id": "auth0|xxxxxxxx", "message": "User created" }
  ```

#### `GET /api/profile?user_id=...` — Fetch user profile

- **Request**: `?user_id=auth0|xxxxxxxx`
- **Response**:
  ```json
  {
    "user_id": "auth0|xxxxxxxx",
    "display_name": "Jane Doe",
    "email": "user@example.com",
    "address": "123 Main St",
    "phone_number": "+1-555-0100",
    "trust_score": 72,
    "reward_points": 340,
    "created_at": "2025-01-15T10:30:00Z",
    "updated_at": "2025-04-01T08:00:00Z"
  }
  ```

### API Gateway Routes (Auth required)

#### `GET /api/users/profile` — Lambda-backed profile fetch

#### `PUT /api/users/trust` — Update trust score

- **Request body**: `{ "user_id": "string", "delta": 5 }`

---

## 4) Authentication

#### `POST /api/auth/callback` — Auth0 post-login callback *(No auth required)*

- **Purpose**: Called by Auth0 after successful login. Syncs the user to DynamoDB Users table with a starting trust score of 50 and 0 reward points.
- **Request body**: `{ "user_id": "string", "email": "string" }`

---

## 5) Checkout & Payments

#### `POST /api/checkout` — Create Stripe Checkout Session

- **Purpose**: Creates a Stripe hosted checkout session for borrowing or buying
- **Request body**:
  ```json
  {
    "item_id": "item_abc123",
    "type": "borrow",
    "duration_days": 3,
    "user_id": "auth0|xxxxxxxx"
  }
  ```
  > For `type: "buy_resale"`, `duration_days` is not required.
- **Response**:
  ```json
  {
    "sessionId": "cs_test_XXXXXXXXXX",
    "url": "https://checkout.stripe.com/pay/cs_test_XXXXXXXXXX"
  }
  ```
  > Redirect the user to `url` to complete payment.

---

## 6) Dashboard & Analytics

#### `GET /api/dashboard?user_id=...` — Fetch user eco-stats

- **Purpose**: Aggregates data from ConsumptionProfiles and Transactions for the dashboard view
- **Response**:
  ```json
  {
    "stats": {
      "borrow_count": 12,
      "buy_count": 3,
      "co2_saved_kg": 47.8,
      "money_saved": 320,
      "eco_score": 87,
      "trees_equivalent": 2,
      "car_miles_avoided": 120
    },
    "category_breakdown": [
      { "name": "Electronics", "count": 5, "co2": 22.5, "pct": 47 },
      { "name": "Outdoor", "count": 4, "co2": 15.0, "pct": 31 }
    ],
    "transaction_count": 15
  }
  ```

---

## 7) Voice (Text-to-Speech)

#### `POST /api/voice/tts` — Convert text to speech via ElevenLabs

- **Purpose**: Generates an audio narration for a listing description. Falls back gracefully if ElevenLabs is unavailable.
- **Request body**:
  ```json
  {
    "text": "This DJI Mini 3 drone is in like-new condition...",
    "voice_id": "21m00Tcm4TlvDq8ikWAM"
  }
  ```
  > `voice_id` is optional. Default: Rachel (`21m00Tcm4TlvDq8ikWAM`).
- **Response**:
  ```json
  {
    "audio": "//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA...",
    "contentType": "audio/mpeg",
    "cached": false
  }
  ```
  > `audio` is a base64-encoded MP3. Play with: `new Audio('data:audio/mpeg;base64,' + audio).play()`

---

## 8) Transactions

#### `GET /api/transactions?user_id=...` — Fetch transaction history

- **Purpose**: Lists all borrow/buy transactions for a user
- **Response**: Array of transaction records with `type`, `amount`, `co2_saved_kg`, `item_id`, `created_at`

---

## 9) Rewards

#### `POST /api/rewards/award` — Award Green Points *(Auth required)*

- **Request**: `{ "user_id": "string", "points": 100, "reason": "borrow" }`

#### `POST /api/rewards/redeem` — Redeem Green Points *(Auth required)*

- **Request**: `{ "user_id": "string", "points": 50 }`

#### `POST /api/rewards/deduct` — Deduct points *(Auth required)*

#### `GET /api/rewards/balance` — Get current point balance *(Auth required)*

- **Response**: `{ "user_id": "string", "reward_points": 340 }`

---

## 10) CO₂ Tracking

#### `GET /api/co2/transaction/{transaction_id}` — CO₂ for a transaction *(Auth required)*

- **Response**: `{ "transaction_id": "...", "co2_saved_kg": 8.5, "category": "electronics" }`

#### `GET /api/co2/cumulative` — Total cumulative CO₂ saved *(Auth required)*

- **Response**: `{ "total_co2_saved_kg": 47.8, "trees_equivalent": 2 }`

---

## 11) Recommendations (Decision Engine)

#### `GET /api/recommendations/{item_id}` — AI borrow/buy/skip recommendation *(Auth required)*

- **Purpose**: Calls Amazon Bedrock Nova Lite with user history and item details to generate a personalized recommendation
- **Response**:
  ```json
  {
    "item_id": "item_abc123",
    "recommendation": "borrow",
    "reasoning": "Based on your usage patterns, you rarely use this item type more than 3 days. Borrowing saves $180 and 12kg CO₂.",
    "co2_saved_kg": 12,
    "money_saved": 180
  }
  ```

---

## 12) Consumption & Lifecycle

#### `POST /api/events` — Record a usage event *(Auth required)*

- **Request**: `{ "user_id": "string", "item_id": "string", "event_type": "borrow_start | return | purchase" }`

#### `GET /api/consumption/profile` — Get consumption profile *(Auth required)*

#### `GET /api/consumption/mirror` — Get consumption mirror insights *(Auth required)*

#### `GET /api/nudges` — Get lifecycle nudges *(Auth required)*

- **Response**: Array of nudge messages (e.g., "Your drill borrow is due back tomorrow")

#### `GET /api/suggestions` — Get personalized suggestions *(Auth required)*

---

## 13) Location & Geocoding

#### `GET /api/listings/nearby` — Nearby listings *(Auth required)*

- **Query**: `?lat=33.4484&lng=-112.074&radius_km=10`

#### `POST /api/geocode` — Geocode an address *(Auth required)*

- **Request**: `{ "address": "123 Main St, Phoenix, AZ 85001" }`
- **Response**: `{ "latitude": 33.448, "longitude": -112.073 }`

---

## Response Format

All endpoints return JSON. Error responses follow this format:

```json
{
  "error": "Human-readable error message",
  "status": 400
}
```

Common HTTP status codes:

| Code | Meaning |
|---|---|
| `200` | Success |
| `201` | Created successfully |
| `400` | Bad request — missing or invalid fields |
| `401` | Unauthorized — invalid or missing JWT |
| `403` | Forbidden — insufficient permissions |
| `404` | Resource not found |
| `500` | Internal server error |
| `503` | External service unavailable (ElevenLabs, Bedrock) |
