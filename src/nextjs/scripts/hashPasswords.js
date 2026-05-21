const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function hashExistingPasswords() {
  const users = await prisma.user.findMany();

  for (const user of users) {
    // Hash the password regardless of whether it's already hashed
    const hashedPassword = await bcrypt.hash(user.user_password, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { user_password: hashedPassword },
    });
    console.log(`Updated password for: ${user.user_email}`);
  }
  console.log("✅ Passwords updated successfully!");
}

hashExistingPasswords()
  .catch(console.error)
  .finally(() => prisma.$disconnect()); 