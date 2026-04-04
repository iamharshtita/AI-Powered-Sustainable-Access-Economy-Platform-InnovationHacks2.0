# Architecture

## High-Level Architecture

```
┌─────────────────────┐
│  Next.js (Amplify)  │
└─────────┬───────────┘
          │
┌─────────▼───────────┐
│  API Gateway (JWT)  │
└─────────┬───────────┘
          │
┌─────────▼───────────────────────────────────────┐
│  Lambda Functions (Python)                       │
│  ┌──────────┐ ┌──────────────┐ ┌──────────────┐ │
│  │ Search   │ │ Decision Eng │ │ Consumption  │ │
│  ├──────────┤ ├──────────────┤ ├──────────────┤ │
│  │ Listing  │ │ Lifecycle    │ │ Reward Eng   │ │
│  ├──────────┤ ├──────────────┤ ├──────────────┤ │
│  │ Voice    │ │ CO2 Tracker  │ │ Auth/Trust   │ │
│  └──────────┘ └──────────────┘ └──────────────┘ │
└─────────┬───────────────────────────────────────┘
          │
┌─────────▼───────────────────────────────────────┐
│  Data Layer                                      │
│  DynamoDB: Users, Items, Transactions,           │
│            Events, Consumption Profiles           │
│  S3: Audio assets, Listing images                │
└─────────────────────────────────────────────────┘
```

## DynamoDB Tables

| Table | Partition Key | Sort Key | GSIs |
|-------|--------------|----------|------|
| Users | user_id | — | trust_score-index |
| Items | item_id | — | category-index, owner-index, status-index |
| Transactions | transaction_id | — | user-index, item-index |
| Events | event_id | timestamp | user-event-index |
| Consumption Profiles | user_id | — | — |

## Key Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Compute | Lambda (Python) | Serverless, scales to zero, cost-effective |
| API | API Gateway REST | JWT validation, throttling, CORS built-in |
| Database | DynamoDB | Single-digit ms latency, pay-per-request |
| Frontend | AWS Amplify | Managed Next.js hosting with CI/CD |
| Auth | Auth0 | Quick integration, social logins, JWT |
| AI/LLM | Bedrock / OpenAI | Flexible LLM for recommendations and narration |
| Voice | ElevenLabs | High-quality TTS |
| IaC | AWS CDK (TypeScript) | Type-safe L2/L3 constructs |
