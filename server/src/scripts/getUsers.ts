import { prisma } from '../config/prisma.js';

async function main() {
  const users = await prisma.user.findMany({
    select: { userId: true, username: true, email: true, role: true, tenantId: true },
  });
  console.log(users.map(u => ({ ...u, userId: u.userId.toString() })));
}

main().finally(() => prisma.$disconnect());
