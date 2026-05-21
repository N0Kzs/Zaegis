'use server';

import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function getUserActivityLogs(filters?: {
  limit?: number;
  offset?: number;
  entity?: string;
  action?: string;
}) {
  const user = await getCurrentUser();

  const where: any = {
    userId: user.id,
  };

  if (filters?.entity) where.entity = filters.entity;
  if (filters?.action) where.action = filters.action;

  const [logs, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 50,
      skip: filters?.offset || 0,
      select: {
        id: true,
        action: true,
        entity: true,
        entityId: true,
        description: true,
        createdAt: true,
        metadata: true,
      },
    }),
    prisma.activityLog.count({ where }),
  ]);

  return { logs, total };
}