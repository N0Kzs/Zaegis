"use server";

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { logActivity } from "@/lib/activity_logger";

const prisma = new PrismaClient();

function generateRandomPassword(length: number = 12): string {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

export async function getUsers() {
  try {
    const users = await prisma.user.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      success: true,
      data: users.map((user) => ({
        id: user.id,
        user_email: user.user_email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
      })),
    };
  } catch (error) {
    return {
      success: false,
      error: "Failed to fetch users",
    };
  } finally {
    await prisma.$disconnect();
  }
}

export async function createUser(data: { email: string; role: string }) {
  try {
    const existingUser = await prisma.user.findUnique({
      where: { user_email: data.email },
    });

    if (existingUser) {
      return {
        success: false,
        error: "A user with this email already exists",
      };
    }

    const plainPassword = generateRandomPassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const newUser = await prisma.user.create({
      data: {
        user_email: data.email,
        user_password: hashedPassword,
        role: data.role,
        isActive: true,
      },
    });

    // Log activity
    await logActivity({
      action: 'CREATE',
      entity: 'user',
      entityId: newUser.id,
      description: `Created user account "${newUser.user_email}" with role ${newUser.role}`,
    });

    return {
      success: true,
      data: {
        user: {
          id: newUser.id,
          user_email: newUser.user_email,
          role: newUser.role,
          isActive: newUser.isActive,
          createdAt: newUser.createdAt.toISOString(),
        },
        password: plainPassword,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: "Failed to create user",
    };
  } finally {
    await prisma.$disconnect();
  }
}

export async function updateUserRole(userId: number, role: string) {
  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    // Log activity
    await logActivity({
      action: 'UPDATE',
      entity: 'user',
      entityId: userId,
      description: `Changed user role for "${updatedUser.user_email}" to ${role}`,
    });

    return {
      success: true,
      data: {
        id: updatedUser.id,
        user_email: updatedUser.user_email,
        role: updatedUser.role,
        isActive: updatedUser.isActive,
        createdAt: updatedUser.createdAt.toISOString(),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: "Failed to update user",
    };
  } finally {
    await prisma.$disconnect();
  }
}

export async function toggleUserStatus(userId: number, isActive: boolean) {
  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isActive },
    });

    // Log activity
    await logActivity({
      action: 'UPDATE',
      entity: 'user',
      entityId: userId,
      description: `${isActive ? 'Activated' : 'Deactivated'} user "${updatedUser.user_email}"`,
    });

    return {
      success: true,
      data: {
        id: updatedUser.id,
        user_email: updatedUser.user_email,
        role: updatedUser.role,
        isActive: updatedUser.isActive,
        createdAt: updatedUser.createdAt.toISOString(),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: "Failed to toggle user status",
    };
  } finally {
    await prisma.$disconnect();
  }
}

export async function resetUserPassword(userId: number) {
  try {
    const plainPassword = generateRandomPassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const user = await prisma.user.update({
      where: { id: userId },
      data: { user_password: hashedPassword },
    });

    // Log activity
    await logActivity({
      action: 'UPDATE',
      entity: 'user',
      entityId: userId,
      description: `Reset password for user "${user.user_email}"`,
    });

    return {
      success: true,
      data: {
        password: plainPassword,
      },
    };
  } catch (error) {

    return {
      success: false,
      error: "Failed to reset password",
    };
  } finally {
    await prisma.$disconnect();
  }
}