"use server";

import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { startOfWeek } from 'date-fns';

const prisma = new PrismaClient();

// Get deployment plans for a specific date
export async function getDeploymentPlans(date: string) {
  try {
    const schedules = await prisma.patrolSchedule.findMany({
      where: {
        date: new Date(date)
      },
      include: {
        patrolCar: true,
        personnel: {
          include: {
            personnel: {
              select: {
                id: true,
                name: true,
                position: true,
                contact: true,
                weeklyHours: {
                  where: {
                    weekStartDate: startOfWeek(new Date(date))
                  }
                },
                lastShift: true
              }
            }
          }
        }
      },
      orderBy: {
        timeSlot: 'asc'
      }
    });

    if (!schedules || schedules.length === 0) {
      return { success: true, data: null };
    }

    // Transform the data to match the expected format
    const transformedSchedules = schedules.map(schedule => {
      // Properly map personnel with all required fields
      const personnelData = schedule.personnel.map(p => ({
        id: p.personnel.id.toString(),
        name: p.personnel.name,
        position: p.personnel.position,
        contact: p.personnel.contact || '',
        weeklyHours: p.personnel.weeklyHours[0]?.hours || 0,
        hoursRemaining: Math.max(0, 48 - (p.personnel.weeklyHours[0]?.hours || 0)),
        lastShiftDate: p.personnel.lastShift?.date?.toISOString() || null,
        canStartShift: true,
        onDuty: false,
        currentTimeSlot: null,
      }));

      return {
        id: schedule.id.toString(),
        timeSlot: schedule.timeSlot,
        date: schedule.date.toISOString().split('T')[0],
        patrolCar: schedule.patrolCar?.name || '',
        personnel: personnelData,
        areas: Array.isArray(schedule.areas) ? schedule.areas : [],
      };
    });

    console.log('Fetched schedules with personnel:', transformedSchedules); // Debug log

    return {
      success: true,
      data: {
        schedules: transformedSchedules,
      },
    };
  } catch (error) {
    console.error('Error fetching deployment plans:', error);
    return { success: false, error: "Failed to fetch deployment plans" };
  }
}

// Save deployment plan
export async function saveDeploymentPlan(data: {
  date: string;
  schedules: Array<{
    id?: string;
    timeSlot: string;
    patrolCar: string;
    personnel: Array<{ id: string; name: string }>;
    areas: string[];
  }>;
}) {
  try {
    const planDate = new Date(data.date);

    console.log('Saving deployment plan for:', planDate);
    console.log('Number of schedules:', data.schedules.length);

    // Delete existing schedules and assignments for this date
    await prisma.personnelOnSchedule.deleteMany({
      where: {
        schedule: {
          date: planDate
        }
      }
    });

    await prisma.patrolSchedule.deleteMany({
      where: {
        date: planDate
      }
    });

    // Create new schedules and assignments
    for (const schedule of data.schedules) {
      console.log('Processing schedule:', schedule.timeSlot);
      console.log('Personnel count:', schedule.personnel.length);

      // Find patrol car by name
      const patrolCar = await prisma.patrolCar.findFirst({
        where: { name: schedule.patrolCar }
      });

      if (!patrolCar) {
        console.error(`Patrol car not found: ${schedule.patrolCar}`);
        continue;
      }

      // Validate personnel exist before creating schedule
      const personnelIds = schedule.personnel.map(p => parseInt(p.id));
      console.log('Personnel IDs to assign:', personnelIds);

      const validPersonnel = await prisma.personnel.findMany({
        where: {
          id: { in: personnelIds }
        },
        select: { id: true, name: true }
      });

      console.log('Valid personnel found:', validPersonnel);

      if (validPersonnel.length === 0) {
        console.error(`No valid personnel found for schedule: ${schedule.timeSlot}`);
        continue;
      }

      // Create the schedule
      const newSchedule = await prisma.patrolSchedule.create({
        data: {
          timeSlot: schedule.timeSlot,
          date: planDate,
          areas: schedule.areas,
          patrolCar: {
            connect: {
              id: patrolCar.id
            }
          }
        }
      });

      console.log('Created schedule:', newSchedule.id);

      // [!code focus:start]
      // Calculate shift hours with robust split logic
      let timeSlotParts = schedule.timeSlot.split(' - ');

      // Fallback: try splitting by hyphen only if spaces weren't found
      if (timeSlotParts.length !== 2) {
        timeSlotParts = schedule.timeSlot.split('-');
      }

      if (timeSlotParts.length !== 2) {
        console.error(`Invalid time slot format: ${schedule.timeSlot}`);
        // Consider whether to continue or just skip hours calculation. 
        // For now, we continue to prevent calculating wrong hours, but we log strictly.
        // Ideally, ensure input data is clean.
        continue;
      }
      // [!code focus:end]

      const [start, end] = timeSlotParts.map(t => {
        const parts = t.trim().split(':');
        return parseInt(parts[0]);
      });

      if (isNaN(start) || isNaN(end)) {
        console.error(`Invalid time values: ${start}, ${end}`);
        continue;
      }

      const hours = end > start ? end - start : (24 - start) + end;
      console.log(`Shift hours calculated: ${hours}`);

      // Create personnel assignments and update their hours
      for (const person of schedule.personnel) {
        const personnelId = parseInt(person.id);

        // Verify personnel exists
        if (!validPersonnel.find(p => p.id === personnelId)) {
          console.error(`Personnel not found: ${personnelId}`);
          continue;
        }

        // Create assignment
        const assignment = await prisma.personnelOnSchedule.create({
          data: {
            personnelId: personnelId,
            scheduleId: newSchedule.id
          }
        });

        console.log('Created assignment:', assignment);

        // Update weekly hours
        await prisma.weeklyHours.upsert({
          where: {
            personnelId_weekStartDate: {
              personnelId: personnelId,
              weekStartDate: startOfWeek(planDate)
            }
          },
          create: {
            personnelId: personnelId,
            weekStartDate: startOfWeek(planDate),
            hours: hours
          },
          update: {
            hours: {
              increment: hours
            }
          }
        });

        // Update last shift
        await prisma.lastShift.upsert({
          where: {
            personnelId: personnelId
          },
          create: {
            personnelId: personnelId,
            date: planDate
          },
          update: {
            date: planDate
          }
        });
      }
    }

    revalidatePath("/dashboard/reports");
    console.log('Deployment plan saved successfully');
    return { success: true, message: "Deployment plans saved successfully" };
  } catch (error) {
    console.error('Error saving deployment plan:', error);
    return { success: false, error: "Failed to save deployment plan" };
  }
}

// Delete deployment plan
export async function deleteDeploymentPlan(date: string) {
  try {
    const planDate = new Date(date);

    // Delete personnel assignments first
    await prisma.personnelOnSchedule.deleteMany({
      where: {
        schedule: {
          date: planDate
        }
      }
    });

    // Delete schedules
    await prisma.patrolSchedule.deleteMany({
      where: {
        date: planDate
      }
    });

    revalidatePath("/dashboard/reports");
    return { success: true };
  } catch (error) {
    console.error('Error deleting deployment plan:', error);
    return { success: false, error: "Failed to delete deployment plan" };
  }
}

// Get list of weeks that have saved deployment plans
export async function getSavedDeploymentWeeks() {
  try {
    // Find all distinct dates from patrol schedules
    const distinctDates = await prisma.patrolSchedule.findMany({
      select: {
        date: true
      },
      distinct: ['date']
    });

    if (!distinctDates || distinctDates.length === 0) {
      return { success: true, data: [] };
    }

    const uniqueWeeks = new Set<string>();

    distinctDates.forEach(record => {
      // Normalize to start of week (Monday)
      const weekStart = startOfWeek(record.date, { weekStartsOn: 1 });
      const weekString = weekStart.toISOString().split('T')[0];
      uniqueWeeks.add(weekString);
    });

    // Convert to array and sort descending (newest first)
    const sortedWeeks = Array.from(uniqueWeeks).sort((a, b) => {
      return new Date(b).getTime() - new Date(a).getTime();
    });

    return { success: true, data: sortedWeeks };
  } catch (error) {
    console.error('Error fetching saved deployment weeks:', error);
    return { success: false, error: "Failed to fetch saved weeks" };
  }
}