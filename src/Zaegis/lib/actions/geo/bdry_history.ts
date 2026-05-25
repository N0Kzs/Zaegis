'use server';

import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/db';

export async function getShapefileUploadHistory() {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const history = await prisma.boundaryShapefileUpload.findMany({
      orderBy: {
        uploadedAt: 'desc',
      },
      include: {
        uploader: {
          select: {
            id: true,
            user_email: true,
          },
        },
      },
    });

    return { success: true, data: history };
  } catch (error) {
    console.error('Error fetching shapefile upload history:', error);
    return { success: false, error: 'Failed to fetch upload history' };
  }
}