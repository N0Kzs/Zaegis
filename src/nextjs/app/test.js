import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function test() {
  try {
    const result = await prisma.$queryRaw`SELECT NOW()`;
    console.log("Connected:", result);
  } catch (e) {
    console.error("Prisma connection failed:", e);
  } finally {
    await prisma.$disconnect();
  }
}

test();
