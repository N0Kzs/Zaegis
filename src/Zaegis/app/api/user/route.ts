
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: parseInt(userId) },
        select: {
          id: true,
          user_email: true,
          role: true,
          isActive: true,
          createdAt: true
        }
      });

      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(user);
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        user_email: true,
        role: true,
        createdAt: true,
        updatedat: true,
        isActive: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { message: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST - Create new user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, role } = body;

    if (!email || !role) {
      return NextResponse.json(
        { message: 'Email and role are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ['viewer', 'editor', 'admin', 'chief'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { message: 'Invalid role' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { user_email: email }
    });

    if (existingUser) {
      return NextResponse.json(
        { message: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Generate password
    const plainPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        user_email: email,
        user_password: hashedPassword,
        role: role
      },
      select: {
        id: true,
        user_email: true,
        role: true,
        createdAt: true
      }
    });

    return NextResponse.json({
      user,
      password: plainPassword
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { message: 'Failed to create user' },
      { status: 500 }
    );
  }
}

// PUT - Update user
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, role, email, currentPassword, newPassword } = body;

    // Update user role
    if (userId && role) {
      const validRoles = ['viewer', 'editor', 'admin', 'chief'];
      if (!validRoles.includes(role)) {
        return NextResponse.json(
          { message: 'Invalid role' },
          { status: 400 }
        );
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: { role },
        select: {
          id: true,
          user_email: true,
          role: true,
          updatedat: true
        }
      });

      return NextResponse.json(user);
    }

    // Update email
    if (email && userId) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { message: 'Invalid email format' },
          { status: 400 }
        );
      }

      const existingUser = await prisma.user.findUnique({
        where: { user_email: email }
      });

      if (existingUser && existingUser.id !== userId) {
        return NextResponse.json(
          { message: 'Email already in use' },
          { status: 409 }
        );
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: { user_email: email },
        select: {
          id: true,
          user_email: true,
          role: true,
          updatedat: true
        }
      });

      return NextResponse.json({
        message: 'Email updated successfully',
        user
      });
    }

    // Update password
    if (userId && currentPassword && newPassword) {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return NextResponse.json(
          { message: 'User not found' },
          { status: 404 }
        );
      }

      const isPasswordValid = await bcrypt.compare(
        currentPassword,
        user.user_password
      );

      if (!isPasswordValid) {
        return NextResponse.json(
          { message: 'Current password is incorrect' },
          { status: 401 }
        );
      }

      if (newPassword.length < 8) {
        return NextResponse.json(
          { message: 'New password must be at least 8 characters' },
          { status: 400 }
        );
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: userId },
        data: { user_password: hashedPassword }
      });

      return NextResponse.json({
        message: 'Password updated successfully'
      });
    }

    return NextResponse.json(
      { message: 'Invalid request parameters' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { message: 'Failed to update user' },
      { status: 500 }
    );
  }
}

// DELETE - Remove user
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { message: 'User ID is required' },
        { status: 400 }
      );
    }

    // Check if user exists and has uploads
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { uploads: true }
    });

    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    if (user.uploads && user.uploads.length > 0) {
      return NextResponse.json(
        { message: 'Cannot delete user with existing file uploads' },
        { status: 400 }
      );
    }

    await prisma.user.delete({
      where: { id: userId }
    });

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { message: 'Failed to delete user' },
      { status: 500 }
    );
  }
}

/*
TODO: Add authentication before production!

When ready to add auth, wrap endpoints with:

import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

async function requireChief() {
  const token = (await cookies()).get('token');
  if (!token) throw new Error('Unauthorized');
  
  const decoded = jwt.verify(token.value, process.env.JWT_SECRET!);
  if (decoded.role !== 'chief') throw new Error('Access denied');
  
  return decoded;
}

Then use: const user = await requireChief();
*/