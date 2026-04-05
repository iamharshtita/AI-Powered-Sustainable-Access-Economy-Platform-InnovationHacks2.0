# User Guide

> **Before using the platform, ensure it is deployed and running.**
> Deployment instructions: [Deployment Guide](./deploymentGuide.md)

ReEarth is an AI-powered sharing economy platform that helps you make smarter consumption decisions. Instead of buying new, you can borrow items from nearby users, buy resale, or — when the AI decides you don't actually need it — skip the purchase entirely. Every sustainable decision earns you **Green Points** and tracks your **CO₂ impact**.

---

## Table of Contents

- [1. Sign In](#1-sign-in)
- [2. Onboarding](#2-onboarding)
- [3. Browsing the Home Page](#3-browsing-the-home-page)
- [4. Searching for Items](#4-searching-for-items)
- [5. Voice Search](#5-voice-search)
- [6. Filtering by Category](#6-filtering-by-category)
- [7. Viewing a Listing Detail](#7-viewing-a-listing-detail)
- [8. Borrowing an Item](#8-borrowing-an-item)
- [9. Buying Resale](#9-buying-resale)
- [10. Your Dashboard](#10-your-dashboard)
- [11. Map View](#11-map-view)
- [12. Your Profile](#12-your-profile)

---

## 1. Sign In

Navigate to the platform URL and click **"Sign In"** in the top-right navigation bar.

![Sign In Page](./media/step-1-signin.png)

> **[PLACEHOLDER]** Screenshot of the login page showing the "Sign In with Google" button. Save as `docs/media/step-1-signin.png`.

- Click **"Sign In"** to launch the Auth0 authentication modal.
- Select **"Continue with Google"** and choose your Google account.
- You will be redirected back to the platform home page, now authenticated.

---

## 2. Onboarding

First-time users are taken through a quick onboarding flow to set up their profile.

![Onboarding Flow](./media/step-2-onboarding.png)

> **[PLACEHOLDER]** Screenshot of the onboarding page (name, address, phone input form). Save as `docs/media/step-2-onboarding.png`.

- Enter your **display name**, **home address** (used for nearby listings), and **phone number**.
- Click **"Complete Setup"** to save your profile.
- You will be redirected to the home page to start exploring.

---

## 3. Browsing the Home Page

The home page is your main discovery hub.

![Home Page](./media/step-3-homepage.png)

> **[PLACEHOLDER]** Screenshot of the full home page showing the hero section, search bar, category filters, and listing grid. Save as `docs/media/step-3-homepage.png`.

The home page includes:
- **Hero Section** — Platform tagline, the ReEarth logo, and the AI search bar.
- **Stats Strip** — Live platform metrics: items available, CO₂ saved, money saved.
- **Category Filters** — Quick filters for Electronics, Furniture, Tools, Sports, Outdoor, Wellness, Kitchen, Clothing, Books.
- **Explore Listings** — A grid of available items with AI recommendation badges.

---

## 4. Searching for Items

Type anything into the search bar — including natural language — and press **Enter** or click the search icon.

![Search Results](./media/step-4-search.png)

> **[PLACEHOLDER]** Screenshot showing search results for a query like "camera" or "yoga mat". Save as `docs/media/step-4-search.png`.

The AI search (powered by **Amazon Bedrock Nova Lite**) understands conversational queries:

| Query | What it finds |
| :--- | :--- |
| `camera` | DSLRs, mirrorless cameras, lenses |
| `hey can you show me some drones` | DJI drones (extracts "drone" from filler) |
| `something for camping` | Tents, sleeping bags, outdoor gear |
| `yoga accessories` | Yoga mats, blocks, wellness equipment |

- Clicking **"Clear"** next to the search results bar resets to showing all listings.
- The page automatically **scrolls to the listings section** when you submit a search.

---

## 5. Voice Search

Tap the **microphone icon** on the right side of the search bar to search by voice.

![Voice Search](./media/step-5-voice-search.png)

> **[PLACEHOLDER]** Screenshot of the search bar with the microphone icon highlighted, or showing the "Listening..." state. Save as `docs/media/step-5-voice-search.png`.

- Your browser will request microphone permission — click **Allow**.
- Speak your search query (e.g., "Show me kayaks").
- The transcript appears in the search bar and results load automatically.

> **Note:** Voice search requires a microphone-enabled browser and HTTPS connection.

---

## 6. Filtering by Category

Click any category pill (Electronics, Furniture, Tools, etc.) to filter listings.

![Category Filter](./media/step-6-category.png)

> **[PLACEHOLDER]** Screenshot showing the category filter row with one category selected (highlighted in green). Save as `docs/media/step-6-category.png`.

- The selected category highlights in **green**.
- The page **smoothly scrolls** to the Explore Listings section.
- Results instantly filter to show only items in that category.
- Click **"All"** to return to the full listing view.

---

## 7. Viewing a Listing Detail

Click any product card to open the full listing detail page.

![Listing Detail](./media/step-7-listing-detail.png)

> **[PLACEHOLDER]** Screenshot of a product detail page showing the image, title, AI badge, pricing, description, and action buttons. Save as `docs/media/step-7-listing-detail.png`.

The listing detail page shows:
- **Product image** — Served from S3
- **AI Recommendation badge** — "Borrow", "Buy Resale", or "Buy New" with reasoning
- **CO₂ saved estimate** — Kilograms of carbon avoided by borrowing/buying resale
- **Borrow price** — Per-day rental rate (e.g., $8/day)
- **Resale price** — One-time purchase price
- **Item condition** — Good / Like New / New
- **Owner location** — City/area of the item owner
- **Voice narration** — Click the 🔊 audio button to hear ElevenLabs read the item description

---

## 8. Borrowing an Item

On the listing detail page, click **"Borrow"** to rent an item for a set number of days.

![Borrow Flow](./media/step-8-borrow.png)

> **[PLACEHOLDER]** Screenshot showing the borrow dialog/input with day selector and the "Proceed to checkout" button. Save as `docs/media/step-8-borrow.png`.

1. Select the **number of days** you want to borrow (minimum 1 day).
2. The total price is calculated: `days × daily rate`.
3. Click **"Proceed to Checkout"** to open the Stripe payment page.
4. Enter your card details (for testing, use: `4242 4242 4242 4242`, any future expiry, any CVC).
5. Click **"Pay"** to complete the transaction.
6. You are redirected to the **Success page** with your transaction summary and CO₂ saved.

---

## 9. Buying Resale

On the listing detail page, click **"Buy Resale"** to purchase the item outright.

![Buy Resale Flow](./media/step-9-buy-resale.png)

> **[PLACEHOLDER]** Screenshot showing the listing detail page with the "Buy Resale" button and a price shown. Save as `docs/media/step-9-buy-resale.png`.

1. Click **"Buy Resale"** — the resale price is shown on the button.
2. You are directly redirected to Stripe Checkout.
3. Complete payment and return to the **Success page**.
4. Your **Green Points** are automatically credited and your CO₂ savings updated.

---

## 10. Your Dashboard

Click your avatar or name in the navigation to go to your **Dashboard**.

![Dashboard](./media/step-10-dashboard.png)

> **[PLACEHOLDER]** Screenshot of the dashboard showing eco-score, CO₂ saved, reward points, and category breakdown chart. Save as `docs/media/step-10-dashboard.png`.

The Dashboard shows your personal sustainability impact:

| Metric | Description |
| :--- | :--- |
| **Eco Score** | Your sustainability rating (0–100) |
| **CO₂ Saved** | Total kilograms of carbon avoided |
| **Money Saved** | Total savings vs. buying new |
| **Trees Equivalent** | CO₂ savings in trees planted equivalent |
| **Car Miles Avoided** | Carbon savings expressed as miles not driven |
| **Green Points** | Reward points earned from sustainable decisions |
| **Category Breakdown** | Which categories you borrow/buy from most |
| **Transaction History** | All your past borrows and purchases |

---

## 11. Map View

Click **"Map"** in the navigation to see listings plotted on an interactive map.

![Map View](./media/step-11-map.png)

> **[PLACEHOLDER]** Screenshot of the map page showing listing pins on a map. Save as `docs/media/step-11-map.png`.

- The map shows all active listings as location pins.
- Click any pin to see the item name, category, and borrow price.
- Click **"View Listing"** on the popup to go to the full detail page.
- Powered by **Amazon Location Service** with Esri map tiles.

---

## 12. Your Profile

Click your avatar in the navigation to access your **Profile** page.

![Profile Page](./media/step-12-profile.png)

> **[PLACEHOLDER]** Screenshot of the profile page showing user details, trust score, and edit options. Save as `docs/media/step-12-profile.png`.

Your profile shows:
- **Display Name** and **Email**
- **Home Address** (used for nearby listing discovery)
- **Trust Score** (0–100) — increases with successful borrows and positive reviews
- **Reward Points** balance
- **Member Since** date

Click **"Edit Profile"** to update your name, address, or phone number.
