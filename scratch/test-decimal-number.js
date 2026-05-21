const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: '28a1788c-0bf2-49b4-911b-1a39ae3d5514' }
    });
    console.log('lead:', lead.company_name);
    console.log('lead.expected_value:', lead.expected_value);
    console.log('typeof lead.expected_value:', typeof lead.expected_value);
    console.log('Number(lead.expected_value):', Number(lead.expected_value));
    console.log('Number(lead.expected_value.toString()):', Number(lead.expected_value.toString()));
    console.log('lead.expected_value.toNumber():', lead.expected_value.toNumber());
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
