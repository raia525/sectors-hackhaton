// Makes an existing account an admin.
//
//   npm run admin:grant -- someone@example.com
//
// The recovery path for the admin panel: the migration that added roles
// only promotes the owner's account if it already existed at the time, and
// if every admin is ever lost, this is how access comes back. It runs
// against whatever DATABASE_URL the environment provides (npm run uses
// .env.local; for production, run it through `npx dotenv -e
// .env.production.local -- node scripts/grant-admin.mjs <email>`).
import { PrismaClient } from "@prisma/client";

const email = (process.argv[2] ?? "").trim().toLowerCase();
if (!email.includes("@")) {
  console.error("Usage: npm run admin:grant -- <email>");
  process.exit(1);
}

const prisma = new PrismaClient();
try {
  const user = await prisma.user.update({ where: { email }, data: { role: "ADMIN" } });
  console.log(`${user.email} is now an admin.`);
} catch {
  console.error(`No account found for ${email}. Sign up first, then run this again.`);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
