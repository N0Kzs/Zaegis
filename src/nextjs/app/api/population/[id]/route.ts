import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function PUT(
  req: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  try {
    const updated = await prisma.population.update({
      where: { pop_id: Number(id) },
      data: { population: Number(body.population) },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating population:", error);
    return NextResponse.json(
      { error: "Failed to update population" },
      { status: 500 }
    );
  }
}