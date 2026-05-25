"use server";

import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity_logger";

const prisma = new PrismaClient();

// Personnel Actions
export async function getPersonnel() {
  try {
    const personnel = await prisma.personnel.findMany({
      include: {
        position: true,
        role: true,
      },
      orderBy: { name: "asc" },
    });

    return {
      success: true,
      data: personnel.map((p) => {
        const [firstName = "", ...rest] = p.name.split(" ");
        const lastName = rest.join(" ") || "";
        return {
          id: p.id,
          firstName,
          lastName,
          position: p.position?.name || "",
          role: p.role?.name || "",
          contact: p.contact || "",
          isActive: p.isActive,
          isAvailable: p.isAvailable,
          dutyDays: p.dutyDays,
        };
      }),
    };
  } catch (error) {
    console.error("Error fetching personnel:", error);
    return { success: false, error: "Failed to fetch personnel" };
  }
}

export async function createPersonnel(
  personnel: Array<{
    firstName: string;
    lastName: string;
    positionId: number;
    roleId: number;
    contact?: string;
  }>
) {
  try {
    const created = await prisma.personnel.createMany({
      data: personnel.map((p) => ({
        name: `${p.firstName} ${p.lastName}`,
        positionId: p.positionId,
        roleId: p.roleId,
        contact: p.contact || null,
        isActive: true,
        isAvailable: true,
      })),
    });

    await logActivity({
      action: "CREATE",
      entity: "personnel",
      description: `Created ${created.count} personnel record(s)`,
    });

    revalidatePath("/resources");
    return { success: true, data: created };
  } catch (error) {
    console.error("Error creating personnel:", error);
    return { success: false, error: "Failed to create personnel" };
  }
}

export async function updatePersonnel(
  id: number,
  data: {
    name?: string;
    positionId?: number;
    roleId?: number;
    contact?: string;
    isActive?: boolean;
    isAvailable?: boolean;
    dutyDays?: string;
  }
) {
  try {
    const updated = await prisma.personnel.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.positionId && { positionId: data.positionId }),
        ...(data.roleId && { roleId: data.roleId }),
        ...(data.contact !== undefined && { contact: data.contact }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.isAvailable !== undefined && {
          isAvailable: data.isAvailable,
        }),
        ...(data.dutyDays !== undefined && { dutyDays: data.dutyDays }),
      },
    });

    await logActivity({
      action: "UPDATE",
      entity: "personnel",
      entityId: id,
      description: `Updated personnel "${updated.name}"`,
    });

    revalidatePath("/resources");
    return { success: true, data: updated };
  } catch (error) {
    console.error("Error updating personnel:", error);
    return { success: false, error: "Failed to update personnel" };
  }
}

export async function deactivatePersonnel(id: number) {
  try {
    const updated = await prisma.personnel.update({
      where: { id },
      data: { isActive: false },
    });

    await logActivity({
      action: "UPDATE",
      entity: "personnel",
      entityId: id,
      description: `Deactivated personnel "${updated.name}"`,
    });

    revalidatePath("/resources");
    return { success: true, data: updated };
  } catch (error) {
    console.error("Error deactivating personnel:", error);
    return { success: false, error: "Failed to deactivate personnel" };
  }
}

export async function togglePersonnelAvailability(
  id: number,
  isAvailable: boolean
) {
  try {
    const updated = await prisma.personnel.update({
      where: { id },
      data: { isAvailable },
    });

    await logActivity({
      action: "UPDATE",
      entity: "personnel",
      entityId: id,
      description: `Set personnel "${updated.name}" availability to ${isAvailable ? "available" : "unavailable"
        }`,
    });

    revalidatePath("/resources");
    return { success: true, data: updated };
  } catch (error) {
    console.error("Error updating personnel availability:", error);
    return { success: false, error: "Failed to update availability" };
  }
}

// Get Positions (for dropdown)
export async function getPositions() {
  try {
    const positions = await prisma.position.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });

    return { success: true, data: positions };
  } catch (error) {
    console.error("Error fetching positions:", error);
    return { success: false, error: "Failed to fetch positions" };
  }
}

// Get Roles (for dropdown)
export async function getRoles() {
  try {
    const roles = await prisma.role.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });

    return { success: true, data: roles };
  } catch (error) {
    console.error("Error fetching roles:", error);
    return { success: false, error: "Failed to fetch roles" };
  }
}

// Get Barangays
export async function getBarangays() {
  try {
    const barangays = await prisma.population.findMany({
      select: {
        barangays: true,
        type: true,
      },
      orderBy: {
        barangays: "asc",
      },
    });
    return { success: true, data: barangays };
  } catch (error) {
    console.error("Error fetching barangays:", error);
    return { success: false, error: "Failed to fetch barangays" };
  }
}

// Patrol Car Actions
export async function getPatrolCars() {
  try {
    const cars = await prisma.patrolCar.findMany({
      orderBy: { name: "asc" },
    });

    return { success: true, data: cars };
  } catch (error) {
    console.error("Error fetching patrol cars:", error);
    return { success: false, error: "Failed to fetch patrol cars" };
  }
}

export async function createPatrolCar(data: {
  name: string;
  type: string;
  plateNumber: string;
  capacity: number;
}) {
  try {
    const created = await prisma.patrolCar.create({
      data: {
        name: data.name,
        type: data.type,
        plateNumber: data.plateNumber,
        capacity: data.capacity,
        isActive: true,
        isAvailable: true,
      },
    });

    await logActivity({
      action: "CREATE",
      entity: "patrolCar",
      entityId: created.id,
      description: `Created patrol car "${created.name}" (${created.plateNumber})`,
    });

    revalidatePath("/resources");
    return { success: true, data: created };
  } catch (error) {
    console.error("Error creating patrol car:", error);
    return { success: false, error: "Failed to create patrol car" };
  }
}

export async function updatePatrolCar(
  id: number,
  data: {
    name?: string;
    type?: string;
    plateNumber?: string;
    capacity?: number;
    isActive?: boolean;
    isAvailable?: boolean;
  }
) {
  try {
    const updated = await prisma.patrolCar.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.type && { type: data.type }),
        ...(data.plateNumber && { plateNumber: data.plateNumber }),
        ...(data.capacity !== undefined && { capacity: data.capacity }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.isAvailable !== undefined && {
          isAvailable: data.isAvailable,
        }),
      },
    });

    await logActivity({
      action: "UPDATE",
      entity: "patrolCar",
      entityId: id,
      description: `Updated patrol car "${updated.name}"`,
    });

    revalidatePath("/resources");
    return { success: true, data: updated };
  } catch (error) {
    console.error("Error updating patrol car:", error);
    return { success: false, error: "Failed to update patrol car" };
  }
}

export async function deactivatePatrolCar(id: number) {
  try {
    const updated = await prisma.patrolCar.update({
      where: { id },
      data: { isActive: false },
    });

    await logActivity({
      action: "UPDATE",
      entity: "patrolCar",
      entityId: id,
      description: `Deactivated patrol car "${updated.name}"`,
    });

    revalidatePath("/resources");
    return { success: true, data: updated };
  } catch (error) {
    console.error("Error deactivating patrol car:", error);
    return { success: false, error: "Failed to deactivate patrol car" };
  }
}

export async function togglePatrolCarAvailability(
  id: number,
  isAvailable: boolean
) {
  try {
    const updated = await prisma.patrolCar.update({
      where: { id },
      data: { isAvailable },
    });

    await logActivity({
      action: "UPDATE",
      entity: "patrolCar",
      entityId: id,
      description: `Set patrol car "${updated.name}" availability to ${isAvailable ? "available" : "unavailable"
        }`,
    });

    revalidatePath("/resources");
    return { success: true, data: updated };
  } catch (error) {
    console.error("Error updating patrol car availability:", error);
    return { success: false, error: "Failed to update availability" };
  }
}