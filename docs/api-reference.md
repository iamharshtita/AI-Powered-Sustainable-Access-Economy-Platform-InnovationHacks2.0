# API Reference

All endpoints require JWT authentication via Auth0 unless noted otherwise.

## Search

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/search?q={query}` | Text search for items |
| POST | `/api/search/voice` | Voice search (audio blob) |

## Recommendations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/recommendations/{item_id}` | Get AI recommendation for an item |

## Consumption & Behavior

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/events` | Record a user action event |
| GET | `/api/consumption/profile` | Get consumption profile |
| GET | `/api/consumption/mirror` | Get dashboard data |
| GET | `/api/nudges` | Get active nudges |
| GET | `/api/suggestions` | Get buy suggestions |

## Rewards

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/rewards/award` | Award points for a transaction |
| POST | `/api/rewards/redeem` | Redeem points for discount |
| GET | `/api/rewards/balance` | Get reward point balance |

## Voice

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/voice/tts` | Text-to-speech |
| POST | `/api/voice/transcribe` | Speech-to-text |

## Listings

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/listings` | Create listing |
| PUT | `/api/listings/{item_id}` | Update listing |
| DELETE | `/api/listings/{item_id}` | Deactivate listing |
| GET | `/api/listings/{item_id}` | Get listing detail |

## CO2 Tracking

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/co2/transaction/{transaction_id}` | CO2 saved for a transaction |
| GET | `/api/co2/cumulative` | Cumulative CO2 savings |

## Auth & User

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/callback` | Auth0 callback |
| GET | `/api/users/profile` | Get user profile + trust score |
| PUT | `/api/users/trust` | Update trust score |

## Error Response Format

```json
{
  "statusCode": 400,
  "body": {
    "error": "VALIDATION_ERROR",
    "message": "Missing required field: category",
    "requestId": "uuid"
  }
}
```

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| VALIDATION_ERROR | 400 | Invalid or missing input |
| UNAUTHORIZED | 401 | Missing or invalid JWT |
| FORBIDDEN | 403 | Insufficient trust/permissions |
| NOT_FOUND | 404 | Resource not found |
| INSUFFICIENT_POINTS | 400 | Not enough reward points |
| SERVICE_UNAVAILABLE | 503 | External service down |
| INTERNAL_ERROR | 500 | Unhandled server error |
