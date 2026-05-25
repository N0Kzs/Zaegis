import { NextResponse } from 'next/server';
import prisma from '../../../lib/db';

export async function GET() {
  try {
    const populationData = await prisma.population.findMany({
      orderBy: {
        barangays: 'asc'
      }
    });

    return NextResponse.json({ data: populationData });
  } catch (error) {
    console.error('Error fetching population data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch population data' },
      { status: 500 }
    );
  }
} 