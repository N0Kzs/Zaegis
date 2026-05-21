// app/api/user/reset-password/route.ts
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';

// Generate a secure random password
function generatePassword(length = 16): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*';
  
  const allChars = uppercase + lowercase + numbers + symbols;
  let password = '';
  
  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

export async function POST(request: Request) {
  try {
    console.log('Password reset request received');
    
    const body = await request.json();
    console.log('Request body:', { userId: body.userId });
    
    const { userId } = body;

    if (!userId) {
      console.error('Missing userId in request');
      return NextResponse.json(
        { message: 'User ID is required' },
        { status: 400 }
      );
    }

    // Check if user exists
    console.log('Looking up user:', userId);
    const user = await prisma.user.findUnique({
      where: { id: Number(userId) }
    });

    if (!user) {
      console.error('User not found:', userId);
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    console.log('User found, generating new password');
    // Generate new password
    const newPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    console.log('Updating user password');
    // Update user password
    await prisma.user.update({
      where: { id: Number(userId) },
      data: { user_password: hashedPassword }
    });

    console.log('Password reset successful for user:', userId);
    return NextResponse.json({
      message: 'Password reset successfully',
      password: newPassword
    });
  } catch (error) {
    console.error('Password reset error details:', error);
    
    // More detailed error response
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { 
        message: 'Failed to reset password',
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    );
  }
}