const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const jordanLeadId = '0eda1a64-16d6-4136-8447-5c9951570ab4';
  
  // Find all documents uploaded today (May 22, 2026) that have a null lead_id
  const today = new Date('2026-05-22T00:00:00Z');
  const docs = await prisma.document.findMany({
    where: {
      lead_id: null,
      created_at: {
        gte: today
      }
    }
  });

  console.log(`Found ${docs.length} documents uploaded today with null lead_id.`);

  for (const doc of docs) {
    await prisma.document.update({
      where: { id: doc.id },
      data: { lead_id: jordanLeadId }
    });
    console.log(`Updated document "${doc.name}" (ID: ${doc.id}) to link to lead ${jordanLeadId}.`);
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
