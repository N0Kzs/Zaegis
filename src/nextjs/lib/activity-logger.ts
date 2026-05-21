import prisma from './db';
import { getCurrentUser } from './auth';

export async function logActivity(params: {
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: string;
  entityId?: string | number;
  description: string;
}) {
  try {
    const user = await getCurrentUser();
    
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId?.toString(),
        description: params.description,
        metadata: {},
      },
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}