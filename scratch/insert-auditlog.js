require('dotenv').config({ path: 'apps/backend/.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.auditLog.create({
    data: {
      entity_type: 'CLIENT',
      entity_id: '5a83713e-e52b-46af-8dcf-6b1b96321ad8',
      action: 'STAFF_REASSIGNED',
      user_id: 'System',
      created_at: new Date(Date.now() - 5000),
      old_data: {
        assigned_staff_id: '1f153e15-48b1-4a14-8b58-ded37b9997d1',
        assigned_staff_name: 'Ankit Paswan',
        completed_projects: 1,
        pending_projects: 1,
        completed_tasks: 0,
        pending_tasks: 0,
        completed_work_orders: 0,
        pending_work_orders: 0,
        completed_inspections: 1,
        pending_inspections: 0
      },
      new_data: {
        assigned_staff_id: '9392cb99-3797-4818-bd64-c6175fe58f7e',
        assigned_staff_name: 'nayan'
      }
    }
  });
  console.log("Audit log created.");
}
main().catch(console.error).finally(() => prisma.$disconnect());
