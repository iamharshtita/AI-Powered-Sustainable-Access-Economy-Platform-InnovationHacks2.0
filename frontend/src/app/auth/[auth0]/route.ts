import { auth0 } from "@/lib/auth0";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  return auth0.handler(request);
}

export async function POST(request: NextRequest) {
  return auth0.handler(request);
}
