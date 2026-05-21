import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const response = NextResponse.json({ message: "Logged out successfully" });
  response.headers.set(
    "Set-Cookie",
    `token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=-99999999`
  );
  return response;
}
