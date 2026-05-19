import { PrismaClient } from '@repo/database';
const prisma = new PrismaClient();

async function main() {
  const leads = await prisma.lead.findMany({
    include: { client: true }
  });
  console.log("Leads currently in database:");
  console.log(JSON.stringify(leads, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
