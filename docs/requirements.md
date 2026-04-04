# Requirements

## R1: User Search and Discovery
Users can search for items via text or voice. Results return within 2 seconds with category, condition, pricing, and availability. Voice search transcribes audio and falls back to text search on failure.

## R2: AI-Driven Decision Recommendations
The Decision Engine recommends borrow, buy resale, or buy new based on user history, item data, and sustainability impact. Includes explanation and CO2 savings estimate. Falls back to showing all options if AI is unavailable.

## R3: Voice AI Companion
AI explains recommendations via voice (ElevenLabs TTS). Play/pause controls provided. Falls back to text-only if voice service is unavailable.

## R4: Sentient Listings
Items describe themselves in first person via LLM-generated narration with voice synthesis. Falls back to standard description if LLM or voice is unavailable.

## R5: Consumption Mirror and Behavioral Tracking
Tracks user actions (search, view, borrow, buy). Dashboard shows consumption patterns, CO2 saved, money saved. Lifecycle Agent generates nudges for unnecessary purchasing patterns.

## R6: Confidence Commerce Loop
Tracks repeat borrowing by category. Generates buy suggestion with cost comparison when borrow count >= 3. Recommends continued borrowing when infrequent.

## R7: Reward System
Awards points for borrow and resale transactions. Points redeemable for discounts. Points deducted on transaction cancellation.

## R8: User Authentication and Trust
Auth0 authentication required for protected actions. Trust score updated on transaction completion. Low trust score restricts high-value borrowing.

## R9: Listing Management
CRUD for item listings with validation of required fields. Changes reflected within 5 seconds. Deactivated listings removed from search.

## R10: CO2 Impact Tracking
Calculates CO2 saved per transaction. Displays cumulative savings on dashboard and per-transaction on confirmation page.

## R11: API and Infrastructure
Serverless API (Lambda + API Gateway), AWS CDK IaC, secrets in Secrets Manager, encryption at rest via KMS, structured error responses without PII.
