# Deployment Guide

This guide covers end-to-end deployment of the ReEarth platform — from zero to a fully working production environment on AWS.

---

## Table of Contents

- [Deployment Guide](#deployment-guide)
  - [Requirements](#requirements)
  - [Pre-Deployment Setup](#pre-deployment-setup)
    - [1. Clone the Repository](#1-clone-the-repository)
    - [2. Configure AWS CLI](#2-configure-aws-cli)
    - [3. Set Up Auth0 Application](#3-set-up-auth0-application)
    - [4. Set Up Stripe Account](#4-set-up-stripe-account)
    - [5. Get ElevenLabs API Key](#5-get-elevenlabs-api-key)
  - [Backend Deployment (AWS CDK)](#backend-deployment-aws-cdk)
    - [Step 1: Install Dependencies](#step-1-install-dependencies)
    - [Step 2: Bootstrap CDK](#step-2-bootstrap-cdk)
    - [Step 3: Deploy the Stack](#step-3-deploy-the-stack)
    - [Step 4: Store the ElevenLabs API Key](#step-4-store-the-elevenlabs-api-key)
    - [Step 5: Seed the Database & Upload Images](#step-5-seed-the-database--upload-images)
  - [Frontend Deployment (AWS Amplify)](#frontend-deployment-aws-amplify)
    - [Method 1: Amplify Console (Recommended)](#method-1-amplify-console-recommended)
    - [Method 2: Amplify CLI](#method-2-amplify-cli)
  - [Post-Deployment Verification](#post-deployment-verification)
  - [Re-Deploying After Changes](#re-deploying-after-changes)

---

## Requirements

Before you begin, you must have the following:

| Requirement | Details |
| :--- | :--- |
| **AWS Account** | With permissions to create CDK stacks (IAM, Lambda, DynamoDB, S3, API GW, etc.) |
| **AWS CLI** | v2.x — [Install guide](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html) |
| **Node.js** | v18+ — [Download](https://nodejs.org/) |
| **Python** | 3.10+ with `pip` — [Download](https://www.python.org/downloads/) |
| **AWS CDK CLI** | `npm install -g aws-cdk` |
| **Auth0 Account** | Free tier works — [Sign up](https://auth0.com/) |
| **Stripe Account** | Free test mode — [Sign up](https://stripe.com/) |
| **ElevenLabs Account** | Free tier (10,000 chars/month) — [Sign up](https://elevenlabs.io/) |
| **Git** | For cloning the repository |

---

## Pre-Deployment Setup

### 1. Clone the Repository

```bash
git clone [INSERT_GITHUB_REPO_URL_HERE]
cd InnovationHacks
```

> **[PLACEHOLDER]** Replace `[INSERT_GITHUB_REPO_URL_HERE]` with your actual repository URL.

### 2. Configure AWS CLI

```bash
aws configure
```

When prompted, enter:
- **AWS Access Key ID**: Your IAM user access key
- **AWS Secret Access Key**: Your IAM user secret key
- **Default region**: `us-east-1` (the stack is hardcoded to us-east-1 for Bedrock availability)
- **Default output format**: `json`

Verify configuration:

```bash
aws sts get-caller-identity
```

You should see your AWS account ID and IAM user ARN.

### 3. Set Up Auth0 Application

1. Log in to [Auth0 Dashboard](https://manage.auth0.com/)
2. Go to **Applications → Create Application**
3. Choose **Regular Web Application** and name it `ReEarth`
4. Go to **Settings** and note down:
   - **Domain** (e.g., `dev-xxxxxxxx.us.auth0.com`) — **write this down**
   - **Client ID** — **write this down**
   - **Client Secret** — **write this down**
5. Under **Allowed Callback URLs**, add:
   ```
   http://localhost:3000/auth/callback
   https://YOUR_AMPLIFY_DOMAIN/auth/callback
   ```
6. Under **Allowed Logout URLs**, add:
   ```
   http://localhost:3000
   https://YOUR_AMPLIFY_DOMAIN
   ```
7. Under **Allowed Web Origins**, add:
   ```
   http://localhost:3000
   https://YOUR_AMPLIFY_DOMAIN
   ```
8. Enable **Google social connection** under **Authentication → Social** (optional but recommended)

> **Note:** The Auth0 domain is already set in the CDK stack as `dev-ld7wncxpjhac4pae.us.auth0.com`. If you use your own domain, update line 278 in `backend/lib/sustainable-access-platform-stack.ts`.

### 4. Set Up Stripe Account

1. Log in to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Go to **Developers → API Keys**
3. Copy your **Secret Key** (starts with `sk_test_...` for test mode) — **write this down**

### 5. Get ElevenLabs API Key

1. Log in to [ElevenLabs](https://elevenlabs.io/)
2. Go to **Profile → API Key**
3. Copy your API key — **write this down**

---

## Backend Deployment (AWS CDK)

### Step 1: Install Dependencies

```bash
cd backend
npm install
```

Also install Python dependencies for the seeding scripts:

```bash
pip install boto3
```

### Step 2: Bootstrap CDK

This only needs to be done once per AWS account/region:

```bash
cdk bootstrap aws://YOUR_AWS_ACCOUNT_ID/us-east-1
```

Replace `YOUR_AWS_ACCOUNT_ID` with your 12-digit AWS account ID (from `aws sts get-caller-identity`).

### Step 3: Deploy the Stack

```bash
cdk deploy
```

When prompted `Do you wish to deploy these changes (y/n)?`, type `y` and press Enter.

CDK will display a progress indicator. Deployment takes approximately **5–10 minutes**.

When complete, you will see **Stack Outputs** in the terminal. **Copy and save all of these values:**

```
Outputs:
SustainableAccessPlatformStack.ApiUrl = https://XXXXXXXXXX.execute-api.us-east-1.amazonaws.com/prod/
SustainableAccessPlatformStack.UsersTableName = SustainableAccessPlatformStack-Users
SustainableAccessPlatformStack.ItemsTableName = SustainableAccessPlatformStack-Items
SustainableAccessPlatformStack.TransactionsTableName = SustainableAccessPlatformStack-Transactions
SustainableAccessPlatformStack.EventsTableName = SustainableAccessPlatformStack-Events
SustainableAccessPlatformStack.ConsumptionProfilesTableName = SustainableAccessPlatformStack-ConsumptionProfiles
SustainableAccessPlatformStack.AudioAssetsBucketName = sustainableaccessplatformst-XXXXXXXXXX
SustainableAccessPlatformStack.ListingImagesBucketName = sustainableaccessplatformst-XXXXXXXXXX
```

### Step 4: Store the ElevenLabs API Key

After deployment, store your ElevenLabs API key in AWS Secrets Manager:

```bash
aws secretsmanager put-secret-value \
  --secret-id "SustainableAccessPlatformStack/elevenlabs-api-key" \
  --secret-string '{"api_key":"YOUR_ELEVENLABS_API_KEY_HERE"}' \
  --region us-east-1
```

Replace `YOUR_ELEVENLABS_API_KEY_HERE` with your actual key.

### Step 5: Seed the Database & Upload Images

> ⚠️ **This step must be repeated after every `cdk deploy`.**

Upload product images to S3:

```bash
cd backend
python3 scripts/upload_images_to_s3.py
```

When prompted (or configured in the script), provide the **Listing Images Bucket Name** from Step 3 outputs.

Seed sample listings into DynamoDB:

```bash
python3 scripts/seed_items.py
```

You should see confirmation messages for each item seeded. Verify in the AWS Console under **DynamoDB → Tables → SustainableAccessPlatformStack-Items**.

---

## Frontend Deployment (AWS Amplify)

Create the `.env.local` file for local development and use these values as Amplify environment variables for production:

```bash
# frontend/.env.local
AUTH0_SECRET=<random-32-char-string, generate with: openssl rand -hex 32>
AUTH0_BASE_URL=https://YOUR_AMPLIFY_DOMAIN
AUTH0_ISSUER_BASE_URL=https://YOUR_AUTH0_DOMAIN
AUTH0_CLIENT_ID=YOUR_AUTH0_CLIENT_ID
AUTH0_CLIENT_SECRET=YOUR_AUTH0_CLIENT_SECRET

AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_ACCESS_KEY

STRIPE_SECRET_KEY=sk_test_YOUR_STRIPE_SECRET_KEY

ELEVENLABS_API_KEY=YOUR_ELEVENLABS_API_KEY
```

### Method 1: Amplify Console (Recommended)

1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
2. Click **"New app" → "Host web app"**
3. Connect your **Git provider** (GitHub/GitLab/Bitbucket) and select your repository
4. Select the branch: `main`
5. On the **App settings** page, Amplify will detect Next.js automatically
6. Expand **Advanced settings** and ensure the build command is:
   ```
   cd frontend && npm ci && npm run build
   ```
   And the output directory is:
   ```
   frontend/.next
   ```
7. Under **Environment variables**, add all variables from your `.env.local` file above (replace `AUTH0_BASE_URL` with your Amplify app URL)
8. Click **"Save and deploy"**

Amplify will build and deploy your app. This takes **3–5 minutes**. You will receive a URL like `https://main.XXXXXXXXXX.amplifyapp.com`.

9. Go back to Auth0 and add this URL to your Allowed Callback, Logout, and Web Origins URLs.

### Method 2: Amplify CLI

```bash
npm install -g @aws-amplify/cli
amplify configure
cd frontend
amplify init
amplify add hosting
amplify publish
```

Follow the interactive prompts. Select **"Hosting with Amplify Console"** when asked.

---

## Post-Deployment Verification

After deployment, verify everything is working:

1. **Open your Amplify URL** — You should see the ReEarth home page with the globe logo.
2. **Sign in** — Click "Sign In" and authenticate with Google via Auth0.
3. **Browse listings** — The Explore Listings section should show seeded products with images.
4. **Search** — Type "camera" in the search bar and verify AI-powered results appear.
5. **View a listing** — Click any product card and verify details, price, and recommendation badge.
6. **Voice narration** — Click the audio icon on a listing detail page to hear ElevenLabs narration.
7. **Check the dashboard** — Click your profile → Dashboard to see eco-stats.
8. **Test checkout** — Click "Borrow" on a listing and verify Stripe checkout loads (use card `4242 4242 4242 4242` for test payments).

---

## Re-Deploying After Changes

### Backend changes (CDK)

```bash
cd backend
cdk deploy

# IMPORTANT: Re-seed data after every deploy
python3 scripts/upload_images_to_s3.py
python3 scripts/seed_items.py
```

### Frontend changes

Simply push to your connected Git branch. Amplify will automatically trigger a new build and deployment.

```bash
git add .
git commit -m "your change description"
git push origin main
```
