const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const leadId = '0eda1a64-16d6-4136-8447-5c9951570ab4';

  console.log('Creating sample audit logs for Jordan...');

  const log1 = await prisma.auditLog.create({
    data: {
      entity_type: 'LEAD',
      entity_id: leadId,
      action: 'CREATED',
      new_data: { company_name: 'JORDAN', contact_person: 'Jordan Smith', expected_value: 50000 },
      user_id: 'System'
    }
  });

  const log2 = await prisma.auditLog.create({
    data: {
      entity_type: 'LEAD',
      entity_id: leadId,
      action: 'UPDATED',
      new_data: { expected_value: 100000, closure_probability: 75 },
      user_id: 'user-admin-id'
    }
  });

  console.log('Sample audit logs created successfully:', { log1, log2 });
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
