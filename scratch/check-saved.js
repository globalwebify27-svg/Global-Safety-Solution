const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- LATEST SAVED ACTIVITIES ---');
  const activities = await prisma.leadActivity.findMany({
    orderBy: { created_at: 'desc' },
    take: 5,
    include: { lead: { select: { company_name: true } } }
  });
  
  activities.forEach(act => {
    console.log(`[Activity ID]: ${act.id}`);
    console.log(`[Lead]: ${act.lead?.company_name}`);
    console.log(`[Type]: ${act.type}`);
    console.log(`[Subject]: ${act.subject}`);
    console.log(`[Description]: ${act.description}`);
    console.log(`[Saved At]: ${act.created_at}`);
    console.log('------------------------------');
  });

  console.log('\n--- LATEST SAVED DOCUMENTS ---');
  const docs = await prisma.document.findMany({
    orderBy: { created_at: 'desc' },
    take: 5,
    include: { lead: { select: { company_name: true } } }
  });

  docs.forEach(doc => {
    console.log(`[Document ID]: ${doc.id}`);
    console.log(`[Lead]: ${doc.lead?.company_name}`);
    console.log(`[Name]: ${doc.name}`);
    console.log(`[Category]: ${doc.category}`);
    console.log(`[File Path/URL]: ${doc.file_url}`);
    console.log(`[File Size]: ${(doc.file_size / 1024).toFixed(2)} KB`);
    console.log(`[Uploaded At]: ${doc.created_at}`);
    console.log('------------------------------');
  });
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
