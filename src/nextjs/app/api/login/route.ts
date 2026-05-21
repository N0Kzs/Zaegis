import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET!;

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    const user = await prisma.user.findUnique({
      where: { user_email: email },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Check if account is active (optional, based on your schema)
    if (user.isActive === false) {
      return NextResponse.json({ error: "Account is inactive" }, { status: 403 });
    }

    const isValidPassword = await bcrypt.compare(password, user.user_password);

    if (!isValidPassword) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      SECRET,
      { expiresIn: "1h" }
    );
    console.log("Generated Token:", token);

    // Create the response object
    const response = NextResponse.json({
      message: "Logged in successfully",
      token,
      role: user.role
    });

    // Set the cookie securely using Next.js helper
    response.cookies.set({
      name: "token",
      value: token,
      httpOnly: true, // Prevents JavaScript from reading the cookie
      path: "/", // Available throughout the app
      maxAge: 3600, // 1 hour
      secure: process.env.NODE_ENV === "production", // TRUE on Vercel, FALSE on localhost
      sameSite: "lax", // 'Lax' allows the cookie to be sent on navigation (redirects)
    });

    return response;

  } catch (error) {
    console.error("Login Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}