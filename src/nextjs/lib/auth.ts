// lib/auth.ts
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import prisma from "./db";
import bcrypt from "bcryptjs";

export async function getCurrentUser() {
  const cookieStore = cookies();
  const token = (await cookieStore).get("token")?.value;

  if (!token) throw new Error("Not authenticated");

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number };
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, user_email: true, role: true },
    });

    if (!user) throw new Error("User not found");
    return user;
  } catch {
    throw new Error("Invalid authentication token");
  }
}

export async function getCurrentRole() {
  const user = await getCurrentUser();
  return user.role;
}

export async function verifyPassword(oldPassword: string) {
  const user = await getCurrentUser();
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { user_password: true },
  });

  if (!dbUser) throw new Error("User not found");

  const match = await bcrypt.compare(oldPassword, dbUser.user_password);
  if (!match) throw new Error("Incorrect old password");

  return true;
}
