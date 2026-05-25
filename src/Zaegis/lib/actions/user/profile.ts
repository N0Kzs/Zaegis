'use server';

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import prisma from "../../db";
import { getCurrentUser } from "../../auth";

type ActionResult = {
  success: boolean;
  error?: string;
  message?: string;
};

export async function getUser() {
  try {
    const user = await getCurrentUser();

    return {
      success: true,
      user: {
        id: user.id,
        user_email: user.user_email,
        role: user.role,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to fetch user",
    };
  }
}

export async function updateEmail(
  email: string,
  currentPassword: string
): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();

    if (!email || !email.includes("@")) {
      return { success: false, error: "Invalid email format" };
    }

    if (!currentPassword) {
      return { success: false, error: "Current password is required" };
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { user_password: true },
    });

    if (!dbUser) {
      return { success: false, error: "User not found" };
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, dbUser.user_password);
    if (!isPasswordValid) {
      return { success: false, error: "Current password is incorrect" };
    }

    // Check if email is already used
    const existingUser = await prisma.user.findUnique({
      where: { user_email: email.toLowerCase().trim() },
    });

    if (existingUser && existingUser.id !== user.id) {
      return { success: false, error: "Email is already in use" };
    }

    // No change needed
    if (user.user_email === email.toLowerCase().trim()) {
      return { success: true, message: "Email is already up to date" };
    }

    // Update email
    await prisma.user.update({
      where: { id: user.id },
      data: { user_email: email.toLowerCase().trim() },
    });

    revalidatePath("/settings");

    return { success: true, message: "Email updated successfully" };
  } catch (error: any) {
    console.error("Update email error:", error);
    return { success: false, error: "Failed to update email" };
  }
}

/**
 * Update user password
 */
export async function updatePassword(
  currentPassword: string,
  newPassword: string
): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();

    if (!currentPassword) {
      return { success: false, error: "Current password is required" };
    }

    if (!newPassword || newPassword.length < 8) {
      return { success: false, error: "New password must be at least 8 characters" };
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { user_password: true },
    });

    if (!dbUser) {
      return { success: false, error: "User not found" };
    }

    // Verify old password
    const isPasswordValid = await bcrypt.compare(currentPassword, dbUser.user_password);
    if (!isPasswordValid) {
      return { success: false, error: "Current password is incorrect" };
    }

    // Prevent reuse of same password
    const isSamePassword = await bcrypt.compare(newPassword, dbUser.user_password);
    if (isSamePassword) {
      return { success: false, error: "New password must be different from current password" };
    }

    // Hash new password and update
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { user_password: hashedPassword },
    });

    return { success: true, message: "Password updated successfully" };
  } catch (error: any) {
    console.error("Update password error:", error);
    return { success: false, error: "Failed to update password" };
  }
}
