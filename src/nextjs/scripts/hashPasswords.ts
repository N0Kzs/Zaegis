import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function hashExistingPasswords() {
  const users = await prisma.user.findMany();

  for (const user of users) {
    const pw = user.user_password;

    // Check if already hashed (bcrypt hashes start with $2a$, $2b$, or $2y$)
    const isHashed =
      pw.startsWith("$2a$") || pw.startsWith("$2b$") || pw.startsWith("$2y$");

    if (!isHashed) {
      const hashedPassword = await bcrypt.hash(pw, 10);
      await prisma.user.update({
        where: { id: user.id },
        data: { user_password: hashedPassword },
      });
      console.log(`✅ Hashed password for: ${user.user_email}`);
    } else {
      console.log(`ℹ️ Already hashed: ${user.user_email}`);
    }
  }

  console.log("🎉 Password hashing completed!");
}

hashExistingPasswords()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

// Run with: npx tsx scripts/hashPasswords.ts
