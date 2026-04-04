# AI-Powered Sustainable Access Economy Platform

## Overview

A platform that transforms consumption behavior by enabling users to borrow, buy resale, or avoid unnecessary purchases. It uses AI-driven recommendations, behavioral tracking (Consumption Mirror), voice-based interaction, and a reward system to reduce waste and carbon footprint.

## Core Services

1. **Decision Engine** — AI service recommending borrow/buy-resale/buy-new based on user history, item data, and sustainability impact
2. **Consumption Engine** — Behavioral intelligence tracking user actions, detecting patterns, and generating nudges
3. **Reward Engine** — Manages sustainability reward points for eco-friendly actions
4. **Voice Service** — Voice search transcription and text-to-speech via ElevenLabs
5. **Lifecycle Agent** — Monitors long-term borrowing patterns and triggers buy suggestions

## Tech Stack

### Frontend
- Next.js with TypeScript
- Tailwind CSS
- Deployed on AWS Amplify

### Backend
- AWS Lambda (Python runtime)
- API Gateway (REST, JWT auth via Auth0)
- DynamoDB (persistence)
- S3 (audio/image assets)
- AWS CDK (TypeScript) for infrastructure

### External Services
- Auth0 — Authentication
- AWS Bedrock / OpenAI — LLM for recommendations and narration
- ElevenLabs — Text-to-speech and voice synthesis
