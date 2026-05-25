import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  const cookieStore = cookies();
  const tokenCookie = (await cookieStore).get("token");

  if (!tokenCookie || !tokenCookie.value) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const decoded = jwt.verify(tokenCookie.value, process.env.JWT_SECRET!) as {
      userId: number;
    };
    
    const { email, currentPassword } = await req.json();

    // Verify current user
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.user_password);
    if (!isPasswordValid) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { user_email: email },
    });

    if (existingUser && existingUser.id !== user.id) {
      return NextResponse.json({ error: "Email already in use" }, { status: 400 });
    }

    // Update email
    await prisma.user.update({
      where: { id: user.id },
      data: { user_email: email },
    });

    return NextResponse.json({ message: "Email updated successfully" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update email" }, { status: 500 });
  }
}