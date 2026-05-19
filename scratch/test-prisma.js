const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    console.log('Testing Prisma Lead creation...');
    const result = await prisma.lead.create({
      data: {
        company_name: 'Test Acme Corp',
        contact_person: 'John Lead',
        email: 'john@acme.com',
        phone: '+91 98765 43210',
        source: 'Website',
        notes: 'Test lead creation notes',
        closure_probability: 50,
        next_follow_up: '2026-05-20'
      }
    });
    console.log('Success:', result);
  } catch (err) {
    console.error('Prisma Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
