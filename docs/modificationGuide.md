# Modification Guide

This guide is for **developers** who want to extend, customize, or add new features to the ReEarth platform. Whether adding new product categories, swapping AI models, extending the reward system, or building new Lambda functions — this guide covers where to look and what to change.

---

## Table of Contents

- [1. Adding New Product Categories](#1-adding-new-product-categories)
- [2. Changing the AI Model (Bedrock)](#2-changing-the-ai-model-bedrock)
- [3. Extending the Reward System](#3-extending-the-reward-system)
- [4. Adding a New Lambda Function](#4-adding-a-new-lambda-function)
- [5. Modifying the Search Algorithm](#5-modifying-the-search-algorithm)
- [6. Adding New Listing Fields](#6-adding-new-listing-fields)
- [7. Customizing the Frontend UI](#7-customizing-the-frontend-ui)
- [8. Adding a New Frontend Page](#8-adding-a-new-frontend-page)
- [9. Swapping the Payment Provider](#9-swapping-the-payment-provider)
- [10. Changing the Voice Provider](#10-changing-the-voice-provider)
- [11. Adding New DynamoDB Tables](#11-adding-new-dynamodb-tables)
- [Best Practices](#best-practices)

---

## 1. Adding New Product Categories

Categories exist in three places. Update all three to add a new category.

### Step 1: Frontend API Route

File: `frontend/src/app/api/listings/route.ts`

Add your category to the `VALID_CATEGORIES` array:

```typescript
const VALID_CATEGORIES = [
  "electronics",
  "furniture",
  "tools",
  "sports",
  "outdoor",
  "wellness",
  "kitchen",
  "clothing",
  "books",
  "baby_gear",        // ← add here
  "musical_instruments", // ← add here
];
```

### Step 2: Home Page Category Filter

File: `frontend/src/app/page.tsx`

Find the `CATEGORIES` array near the top of the file and add your category:

```typescript
const CATEGORIES = [
  { label: 'All', emoji: '🌿' },
  { label: 'Electronics', emoji: '💻' },
  // ... existing categories ...
  { label: 'Baby Gear', emoji: '🍼' },           // ← add here
  { label: 'Musical Instruments', emoji: '🎸' }, // ← add here
];
```

### Step 3: Seed Data

File: `backend/scripts/seed_items.py`

Add sample items for the new category so it shows up in listings immediately after deployment.

### Step 4: AI Search Synonyms (Optional)

File: `frontend/src/app/api/listings/route.ts`

Add synonyms for better search recall:

```typescript
const SYNONYMS: Record<string, string[]> = {
  // ... existing synonyms ...
  guitar: ["guitar", "acoustic", "bass", "ukulele", "instrument"],
  stroller: ["stroller", "pram", "buggy", "baby carriage"],
};
```

---

## 2. Changing the AI Model (Bedrock)

The platform uses **Amazon Bedrock Nova Lite** for both search intent extraction and item recommendations.

### Search Intent Model

File: `frontend/src/app/api/listings/route.ts`

```typescript
const BEDROCK_MODEL_ID = "amazon.nova-lite-v1:0";
// Change to:
const BEDROCK_MODEL_ID = "amazon.nova-pro-v1:0";      // Higher quality, higher cost
// or:
const BEDROCK_MODEL_ID = "anthropic.claude-3-haiku";  // Anthropic Claude
```

### Decision Engine Model

File: `backend/lambda/decision_engine/handler.py`

```python
BEDROCK_MODEL_ID = "amazon.nova-lite-v1:0"
# Change as needed
```

File: `backend/lib/sustainable-access-platform-stack.ts` (line ~505)

```typescript
environment: {
  BEDROCK_MODEL_ID: "amazon.nova-lite-v1:0", // ← change here
},
```

> ⚠️ **IAM Update Required**: If switching to a different model family, update the `bedrock:InvokeModel` IAM policy resource ARN for the `DecisionEngineFn` (~line 517 in the CDK stack):
> ```typescript
> resources: ["arn:aws:bedrock:us-east-1::foundation-model/YOUR_NEW_MODEL_ID"],
> ```

---

## 3. Extending the Reward System

### Changing Point Values

File: `backend/lambda/reward_engine/handler.py`

Find the points configuration and adjust values:

```python
POINTS_CONFIG = {
    "borrow": 100,       # points per borrow transaction
    "buy_resale": 75,    # points per resale purchase
    "return_on_time": 25, # bonus for on-time returns
    "referral": 200,     # referral bonus
}
```

### Adding New Reward Triggers

1. Identify where the new trigger occurs (e.g., after a user writes a review).
2. Call `POST /api/rewards/award` with the user_id and points amount.
3. Add the new trigger type to the `POINTS_CONFIG` in the reward engine Lambda.

### Adding Badge/Level System

Modify `frontend/src/app/dashboard/page.tsx` to compute a badge level from `reward_points`:

```typescript
const getBadge = (points: number) => {
  if (points >= 1000) return { name: 'Planet Saver', color: '#4CAF50' };
  if (points >= 500) return { name: 'Eco Champion', color: '#2ea078' };
  if (points >= 100) return { name: 'Green Explorer', color: '#1a8a8a' };
  return { name: 'Newcomer', color: '#888' };
};
```

---

## 4. Adding a New Lambda Function

### Step 1: Create the Handler

Create a new directory and handler file:

```
backend/lambda/my_new_service/handler.py
```

```python
import json

def handler(event, context):
    try:
        # Your logic here
        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"},
            "body": json.dumps({"message": "Success"})
        }
    except Exception as e:
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)})
        }
```

### Step 2: Register in CDK Stack

File: `backend/lib/sustainable-access-platform-stack.ts`

```typescript
const myNewFn = new lambda.Function(this, "MyNewFn", {
  runtime: lambda.Runtime.PYTHON_3_12,
  handler: "my_new_service/handler.handler",
  code: lambda.Code.fromAsset("lambda"),
  timeout: cdk.Duration.seconds(30),
  memorySize: 256,
  environment: {
    ITEMS_TABLE: this.itemsTable.tableName,
  },
});

// Grant permissions (least privilege)
this.itemsTable.grantReadData(myNewFn);

// Add API Gateway route
const myNewResource = this.apiRoot.addResource("my-endpoint");
myNewResource.addMethod("GET", new apigateway.LambdaIntegration(myNewFn), {
  authorizer: this.authorizer,
  authorizationType: apigateway.AuthorizationType.CUSTOM,
});
```

### Step 3: Deploy

```bash
cd backend && cdk deploy
```

---

## 5. Modifying the Search Algorithm

File: `frontend/src/app/api/listings/route.ts`

### Improving Synonym Coverage

Add entries to the `SYNONYMS` map for better keyword expansion:

```typescript
const SYNONYMS: Record<string, string[]> = {
  drone: ["drone", "dji", "uav", "quadcopter", "aerial", "flying"],
  // Add more:
  vr: ["vr", "virtual reality", "oculus", "quest", "headset", "immersive"],
};
```

### Improving the Bedrock Prompt

Modify the `extractSearchIntent()` function prompt to add more examples:

```typescript
const prompt = `...
Examples:
- "hey can you like show me some drones nearby" → {"keywords": ["drone"], "category": "electronics"}
// Add your example:
- "games and vr stuff" → {"keywords": ["vr", "gaming"], "category": "electronics"}
...`;
```

### Switching to Vector Search

For large catalogs (1000+ items), replace DynamoDB scan + in-memory filter with a vector database:

1. Use **Amazon OpenSearch Serverless** with k-NN enabled
2. Generate embeddings for listing descriptions using **Amazon Titan Embeddings**
3. Replace `ScanCommand` in `route.ts` with an OpenSearch semantic query

---

## 6. Adding New Listing Fields

### Step 1: DynamoDB (no schema change needed)

DynamoDB is schemaless — you can add new fields to items immediately.

### Step 2: Seed Script

File: `backend/scripts/seed_items.py`

Add your new field to item objects:

```python
{
    "item_id": "...",
    "title": "...",
    "brand": "DJI",          # ← new field
    "weight_kg": 0.249,      # ← new field
}
```

### Step 3: Frontend Types

File: `frontend/src/app/components/ListingCard.tsx`

```typescript
export interface ListingProps {
  id: string;
  title: string;
  // ...existing fields...
  brand?: string;       // ← add new optional field
  weightKg?: number;    // ← add new optional field
}
```

### Step 4: API Route Mapping

File: `frontend/src/app/api/listings/route.ts`

In the `items.map()` block:

```typescript
return {
  id: item.item_id,
  title: item.title || "",
  // ...existing mappings...
  brand: item.brand || "",           // ← add mapping
  weightKg: item.weight_kg || null,  // ← add mapping
};
```

---

## 7. Customizing the Frontend UI

### Design System / Tokens

File: `frontend/src/app/globals.css`

All colors, gradients, and animations are defined as CSS custom properties (variables). Change the brand palette here:

```css
:root {
  --color-leaf: #4caf50;         /* Primary green */
  --color-ocean: #1a9e8f;        /* Secondary teal */
  --color-leaf-dark: #2e7d32;    /* Dark green for text */
}
```

### Navigation & Logo

File: `frontend/src/app/components/Navigation.tsx`

- Logo: Replace `src="/logo.jpeg"` with your new logo path in `public/`
- Brand name colors: Find `<span style={{ color: '#4CAF50' }}>Re</span>` and update hex values
- Nav links: Modify the `NAV_LINKS` array at the top to add/remove navigation items

### Home Page Hero

File: `frontend/src/app/page.tsx`

- Hero headline: Update the `<h1>` text
- Stats strip: Modify the `STATS` array to change displayed metrics
- Category filters: Add/remove entries in the `CATEGORIES` array

---

## 8. Adding a New Frontend Page

Next.js App Router uses file-based routing. Create a new page:

```
frontend/src/app/my-new-page/page.tsx
```

```tsx
'use client';

export default function MyNewPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold gradient-text">My New Page</h1>
      {/* Your content */}
    </div>
  );
}
```

Add it to the navigation in `Navigation.tsx`:

```typescript
const NAV_LINKS = [
  // ...existing links...
  { label: 'My Page', href: '/my-new-page', icon: Star },
];
```

---

## 9. Swapping the Payment Provider

The platform uses **Stripe**. To switch to another provider (e.g., PayPal, Paddle):

1. **Replace** the Stripe logic in `frontend/src/app/api/checkout/route.ts`
2. **Update** environment variables (`STRIPE_SECRET_KEY` → your new provider key)
3. **Update** the checkout buttons in `frontend/src/app/listings/[id]/page.tsx`
4. **Update** the success page `frontend/src/app/checkout/page.tsx` to parse the new provider's callback

> The transaction recording logic (DynamoDB write, reward points, CO₂ calculation) is decoupled from Stripe and only needs the checkout outcome — you just need to call those services from your new success handler.

---

## 10. Changing the Voice Provider

The platform uses **ElevenLabs** for TTS. To switch:

File: `frontend/src/app/api/voice/tts/route.ts`

Replace the `fetch()` call to ElevenLabs with your new provider's API. The response contract must be the same:

```typescript
return NextResponse.json({
  audio: base64AudioString,  // base64-encoded MP3
  contentType: "audio/mpeg",
  cached: false,
});
```

The frontend plays audio using:
```typescript
const audio = new Audio(`data:audio/mpeg;base64,${response.audio}`);
audio.play();
```

---

## 11. Adding New DynamoDB Tables

File: `backend/lib/sustainable-access-platform-stack.ts`

Use this pattern (follows least-privilege, KMS encryption, PITR):

```typescript
const myNewTable = new dynamodb.Table(this, "MyNewTable", {
  tableName: `${id}-MyNewTable`,
  partitionKey: { name: "my_id", type: dynamodb.AttributeType.STRING },
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
  encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
  encryptionKey,  // reuse the existing shared KMS key
  removalPolicy: cdk.RemovalPolicy.DESTROY,
  pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
});

// Grant access to Lambdas that need it
myNewTable.grantReadWriteData(myFunctionThatNeedsIt);
```

Add a CloudFormation output so the table name is easily accessible:

```typescript
new cdk.CfnOutput(this, "MyNewTableName", {
  value: myNewTable.tableName,
});
```

---

## Best Practices

1. **Keep Lambda functions focused** — Each Lambda should do one thing well. Avoid creating a "mega Lambda" that handles multiple domains.

2. **Always use least-privilege IAM** — Grant only `ReadData`, `ReadWriteData`, or specific actions. Never grant `*` permissions to a Lambda.

3. **Add environment variables for all resource names** — Never hardcode table names or bucket names in Lambda code. Use `process.env.TABLE_NAME`.

4. **Re-seed after `cdk deploy`** — The DynamoDB Items table and S3 bucket are recreated on every deploy. Always run:
   ```bash
   python3 backend/scripts/upload_images_to_s3.py
   python3 backend/scripts/seed_items.py
   ```

5. **Test locally before deploying** — Use `npm run dev` in the `frontend/` directory and set `.env.local` with real AWS credentials (pointing to the deployed backend) for end-to-end local testing.

6. **Feature branches** — Use the established branching convention:
   - `feature/` — new features
   - `bugfix/` — bug fixes
   - `doc/` — documentation updates
   - `deploy/` — deployment configuration

7. **Monitor Bedrock costs** — Nova Lite is cost-efficient but AI search runs on every search query. Add CloudWatch metrics on the search API route to track invocation counts and model token usage.

---

## Conclusion

ReEarth's modular architecture makes it straightforward to extend. Lambdas are independent microservices — adding one doesn't affect others. The Next.js frontend's server-side API routes provide a clean BFF layer between the UI and AWS. Start with the area most relevant to your feature, follow the patterns established in existing code, and always test with `npm run dev` before deploying.

The more categories, AI model improvements, and reward mechanics you add, the more valuable and engaging the platform becomes for users making sustainable choices every day.
