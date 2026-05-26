const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const newDoc = await prisma.document.create({
    data: {
      name: "Direct DB Test Document",
      category: "OTHER",
      file_url: "http://127.0.0.1:3001/public/OTHER/test.pdf",
      file_type: "PDF",
      file_size: 12345,
      lead_id: "0eda1a64-16d6-4136-8447-5c9951570ab4", // Correct Lead ID for JORDAN
      notes: "Direct database mapping test",
    }
  });

  console.log("Successfully created Document in database via Prisma:");
  console.log(JSON.stringify(newDoc, null, 2));

  // Retrieve lead with its documents to verify the relation
  const lead = await prisma.lead.findUnique({
    where: { id: "0eda1a64-16d6-4136-8447-5c9951570ab4" },
    include: { documents: true }
  });
  console.log("\nLead retrieved from DB with its documents:");
  console.log(JSON.stringify(lead, null, 2));
}

test()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
