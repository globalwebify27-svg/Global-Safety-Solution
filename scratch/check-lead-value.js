const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const leads = await prisma.lead.findMany();
    console.log('Leads:');
    for (const lead of leads) {
      console.log(`- ID: ${lead.id}, Name: ${lead.company_name}, Expected Value: ${lead.expected_value}, Type: ${typeof lead.expected_value}, Constructor: ${lead.expected_value?.constructor?.name}`);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
