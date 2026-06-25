import { PrismaClient } from '@repo/database';
const prisma = new PrismaClient();

async function check() {
  const docs = await prisma.document.findMany({
    take: 10,
    orderBy: { id: 'desc' }
  });

  console.log(`Found ${docs.length} documents in database:`);
  docs.forEach(doc => {
    console.log(`\nDoc ID: ${doc.id}`);
    console.log(`Name: ${doc.name}`);
    console.log(`Category: ${doc.category}`);
    console.log(`File URL value:`, doc.file_url ? doc.file_url.substring(0, 100) + '...' : null);
    console.log(`File URL length:`, doc.file_url ? doc.file_url.length : 0);
  });
}

check().catch(console.error).finally(() => prisma.$disconnect());
