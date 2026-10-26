/**
 * Script to grant ADMIN role to a specific user.
 * Usage: npx tsx scripts/set-admin.ts [email]
 *        npx tsx scripts/set-admin.ts  (defaults to nguyendangminhphuc@dhsphue.edu.vn)
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2] ?? 'nguyendangminhphuc@dhsphue.edu.vn';

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`❌  User not found: ${email}`);
    process.exit(1);
  }

  if (user.role === 'ADMIN') {
    console.log(`ℹ️  ${email} is already an ADMIN.`);
    return;
  }

  await prisma.user.update({ where: { email }, data: { role: 'ADMIN' } });
  console.log(`✅  Granted ADMIN role to ${email}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
