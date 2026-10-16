import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma.js';

async function main() {
  const hash = await bcrypt.hash('Password@123', 10);
  await prisma.user.updateMany({
    where: { email: 'paul@twelvogym.com' },
    data: { passwordHash: hash },
  });
  console.log('Password for paul@twelvogym.com updated to Password@123');
}

main().finally(() => prisma.$disconnect());
