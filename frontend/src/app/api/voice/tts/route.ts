import { NextRequest, NextResponse } from "next/server";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

const REGION = process.env.AWS_REGION || "us-east-1";
const SECRET_NAME = "SustainableAccessPlatformStack/elevenlabs-api-key";
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel - warm, natural voice
const ELEVENLABS_TTS_URL = "https://api.elevenlabs.io/v1/text-to-speech";

// Cache the API key in-memory (per serverless cold start)
let cachedApiKey: string | null = null;

async function getElevenLabsApiKey(): Promise<string | null> {
  if (cachedApiKey) return cachedApiKey;

  // Try Secrets Manager first
  try {
    const client = new SecretsManagerClient({ region: REGION });
    const response = await client.send(
      new GetSecretValueCommand({ SecretId: SECRET_NAME })
    );
    const secret = JSON.parse(response.SecretString || "{}");
    if (secret.api_key) {
      cachedApiKey = secret.api_key;
      return cachedApiKey;
    }
  } catch (err) {
    console.warn("Secrets Manager unavailable, falling back to env var:", err instanceof Error ? err.message : err);
  }

  // Fallback to environment variable (available in .env.local for local dev)
  const envKey = process.env.ELEVENLABS_API_KEY;
  if (envKey) {
    cachedApiKey = envKey;
    console.log("Using ELEVENLABS_API_KEY from environment");
    return cachedApiKey;
  }

  return null;
}

/**
 * POST /api/voice/tts — Convert text to speech using ElevenLabs.
 *
 * Body: { text: string, voice_id?: string }
 * Returns: { audio: string (base64), contentType: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, voice_id } = body;

    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: "Missing required field: text" },
        { status: 400 }
      );
    }

    const apiKey = await getElevenLabsApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: "ElevenLabs API key not available", fallback: true },
        { status: 503 }
      );
    }

    const vid = voice_id || DEFAULT_VOICE_ID;
    const url = `${ELEVENLABS_TTS_URL}/${vid}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: text.slice(0, 500), // Limit to 500 chars to save API credits
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("ElevenLabs TTS error:", response.status, errText);
      return NextResponse.json(
        { error: "Voice service error", fallback: true },
        { status: 503 }
      );
    }

    // Convert audio response to base64
    const audioBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString("base64");

    return NextResponse.json({
      audio: base64Audio,
      contentType: "audio/mpeg",
      cached: false,
    });
  } catch (err) {
    console.error("POST /api/voice/tts error:", err);
    return NextResponse.json(
      { error: "Failed to generate speech", fallback: true },
      { status: 500 }
    );
  }
}
