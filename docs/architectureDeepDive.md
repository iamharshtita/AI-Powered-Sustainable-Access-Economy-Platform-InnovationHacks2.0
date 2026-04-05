# Architecture Deep Dive

This document explains the technical architecture of the ReEarth AI-Powered Sustainable Access Economy Platform in detail — covering every AWS service, data flow, and design decision.

![Architecture Diagram](./media/architecture.png)

---


## Architecture Flow

The following numbered steps describe how a typical user interaction flows through the system, from the browser to AWS and back:

1. **Sign In** — The user visits the Amplify-hosted Next.js frontend and authenticates via **Auth0** (Google OAuth). Auth0 issues a signed **RS256 JWT** token stored in the browser session.

2. **Browse Listings** — On the home page, the frontend calls its own Next.js API route `GET /api/listings`. This route connects directly from Amplify's server environment to **Amazon DynamoDB** (`Items` table) using IAM credentials provided by Amplify's execution role. Results are returned instantly without hitting API Gateway.

3. **AI-Powered Search** — When the user types a natural language query (e.g., "hey can you show me some drones nearby"), the frontend API route calls **Amazon Bedrock Nova Lite**. Bedrock extracts the product keyword ("drone") and optionally a category ("electronics"). The DynamoDB scan is then filtered by category, and an in-memory text filter with synonym expansion and stemming narrows results to matching items.

4. **Voice Search** — The user taps the microphone icon. The browser's **Web Speech API** captures speech and sends the transcript to the search pipeline. The `POST /api/voice/tts` route calls **ElevenLabs** to convert product narration text to audio, which plays back to the user.

5. **View Listing Detail** — Clicking a product fetches full item details from DynamoDB. Product images are served directly from the **S3 Listing Images Bucket** (public-read, AES256 encrypted, CORS enabled).

6. **AI Recommendation** — The listing detail page shows an AI badge ("Borrow" / "Buy Resale" / "Buy New") computed from the item's condition and usage patterns. For richer decisions, the backend **Decision Engine Lambda** (invoked via API Gateway) calls **Bedrock** to analyze user history and return a personalized recommendation.

7. **Checkout** — The user clicks "Borrow for X days" or "Buy Resale". The frontend's `POST /api/checkout` route creates a **Stripe Checkout Session** with the item price fetched from DynamoDB. The user is redirected to hosted Stripe payment UI and returns to a success page on completion.

8. **Transaction Recording** — On checkout success, a transaction is written to the `Transactions` DynamoDB table. The **CO₂ Tracker Lambda** calculates kilograms of CO₂ avoided. The **Reward Engine Lambda** awards Green Points to the user's account in the `Users` table.

9. **Consumption Tracking** — The **Consumption Engine Lambda** tracks borrow/return events in the `Events` table and updates the user's `ConsumptionProfiles` record with cumulative CO₂ saved, eco-score, and spend.

10. **Dashboard** — The user's Dashboard page calls `GET /api/dashboard`, which scans `ConsumptionProfiles` and `Transactions` to return aggregated stats: eco-score, CO₂ saved, money saved, category breakdown, and trees equivalent.

11. **Lifecycle Nudges** — The **Lifecycle Agent Lambda** periodically checks item return timelines and user behavior, generating contextual nudges (e.g., "Your borrowed drill is due back tomorrow") returned by `GET /api/nudges`.

12. **Map View** — The Mapview page calls the **Location Service Lambda** via API Gateway. This Lambda uses **Amazon Location Service** (Place Index backed by Esri) to geocode listing addresses and return nearby items within a radius.

---

## Cloud Services & Technology Stack

### Frontend

- **Next.js 16.2 (Turbopack)** — React framework with App Router. Handles SSR, routing, and server-side API routes that act as a secure BFF (Backend for Frontend).
  - **AWS Amplify** — Hosts and continuously deploys the Next.js app. Provides IAM execution role for DynamoDB and Bedrock access from Next.js API routes.
  - **Auth0** — OAuth2 / OpenID Connect provider (Google sign-in). SDK: `@auth0/nextjs-auth0`.
  - **Framer Motion** — Animations, hover effects, and page transitions.
  - **Stripe** — Payment processing. SDK: `stripe` (server) + Stripe-hosted checkout UI.

### AI & Intelligence

- **Amazon Bedrock (Nova Lite `amazon.nova-lite-v1:0`)** — Used in two places:
  - **AI Search** (Next.js API route): Extracts product keywords and category from natural language queries.
  - **Decision Engine Lambda**: Generates personalized borrow/buy/skip recommendations based on user history and item condition.
- **ElevenLabs TTS** — Converts product description narration text to audio (`eleven_monolingual_v1`, voice: Rachel). API key stored in **AWS Secrets Manager**.

### AWS Backend (CDK-managed)

- **AWS CDK (TypeScript)** — Infrastructure as Code. Single stack: `SustainableAccessPlatformStack`.
- **AWS API Gateway (REST)** — Single REST API (`SustainableAccessPlatformAPI`) at `/prod` stage.
  - Rate limit: 100 req/s, burst: 200 req/s.
  - All routes (except `/api/auth/callback`) protected by Auth0 JWT Lambda Authorizer.
- **AWS Lambda (Python 3.12)** — 12 microservice Lambda functions:
  - **`AuthorizerFn`** — Validates Auth0 RS256 JWT tokens using JWKS. Caches results for 5 minutes.
  - **`AuthTrustFn`** — Handles Auth0 login callback, syncs user profile to DynamoDB, and manages trust scores.
  - **`ListingManagementFn`** — Full CRUD for marketplace listings + presigned S3 upload URL generation.
  - **`SearchFn`** — Backend search handler for API Gateway search routes.
  - **`DecisionEngineFn`** — Calls Bedrock Nova Lite to recommend borrow/buy/skip per item per user.
  - **`ConsumptionEngineFn`** — Records usage events, updates eco-score and cumulative impact in `ConsumptionProfiles`.
  - **`LifecycleAgentFn`** — Generates return nudges and sustainability suggestions based on borrow history.
  - **`RewardEngineFn`** — Awards, redeems, and deducts Green Points from user accounts.
  - **`Co2TrackerFn`** — Calculates CO₂ savings per transaction and cumulative carbon impact.
  - **`VoiceServiceFn`** — Proxies ElevenLabs TTS requests and caches audio in S3.
  - **`LocationServiceFn`** — Geocodes listing addresses and finds nearby listings using Amazon Location.

### Data Layer

- **Amazon DynamoDB** — Five tables, all with:
  - KMS Customer-Managed Encryption (shared `sustainable-access-platform-key`)
  - Point-in-Time Recovery (PITR) enabled
  - On-demand billing (PAY_PER_REQUEST)

  | Table | Partition Key | Purpose |
  |---|---|---|
  | `*-Users` | `user_id` | User profiles, trust scores, reward points |
  | `*-Items` | `item_id` | Marketplace listings with pricing and location |
  | `*-Transactions` | `transaction_id` | Borrow/buy payment records |
  | `*-Events` | `event_id` | Usage events for consumption tracking |
  | `*-ConsumptionProfiles` | `user_id` | Aggregated eco-score, CO₂ saved, spend |

- **Amazon S3** — Two buckets:
  - **Audio Assets Bucket** — Private (BLOCK_ALL). KMS encrypted. Stores ElevenLabs-generated MP3s.
  - **Listing Images Bucket** — Public-read. AES256 (S3-managed) encrypted. Serves product images to browsers without SigV4. CORS enabled for all origins.

### Security

- **AWS KMS** — Customer-managed key for DynamoDB tables and Audio S3 bucket encryption. Key rotation enabled.
- **AWS Secrets Manager** — Stores the ElevenLabs API key post-deploy. Accessed by `VoiceServiceFn` with least-privilege `secretsmanager:GetSecretValue`.
- **Auth0 JWT Authorizer** — Lambda that validates `Authorization: Bearer <token>` on every protected API Gateway route. Uses Auth0 JWKS endpoint (RS256).
- **IAM Least Privilege** — Every Lambda has only the permissions it needs (e.g., `Co2TrackerFn` has `ReadData` on Transactions, Items, ConsumptionProfiles — nothing else).

### External Services

- **Amazon Location Service** — Esri-backed Place Index for geocoding listing addresses (`SearchPlaceIndexForText`).
- **Stripe** — Hosted checkout sessions for borrow-by-day and buy-resale payments.
- **ElevenLabs** — Text-to-speech API (Rachel voice) for product narrations.
- **Auth0** — Google social login, user management, JWT issuance.

---

## Infrastructure as Code

All AWS infrastructure is defined in a single **AWS CDK TypeScript stack** at:

```
backend/lib/sustainable-access-platform-stack.ts
```

### What CDK Provisions

Running `cdk deploy` creates the entire backend from scratch:
- KMS encryption key with annual rotation
- 5 DynamoDB tables with GSIs (Global Secondary Indexes)
- 2 S3 buckets (audio private, images public)
- API Gateway REST API with CORS and throttling
- 12 Lambda functions with environment variables and IAM policies
- Auth0 JWT Lambda Authorizer with 5-minute result caching
- Amazon Location Place Index (Esri data source)
- Secrets Manager secret for ElevenLabs key
- CloudFormation Outputs for all resource names and URLs

### Post-Deploy Scripts

After `cdk deploy`, two Python scripts must be run to populate the environment:

```bash
# 1. Upload product images to the S3 listing images bucket
python3 backend/scripts/upload_images_to_s3.py

# 2. Seed sample listings into DynamoDB Items table
python3 backend/scripts/seed_items.py
```

> ⚠️ **Important:** These scripts must be re-run after every `cdk deploy` because deployment recreates the DynamoDB table and S3 bucket. Automate this in your CI/CD pipeline to avoid data loss.
