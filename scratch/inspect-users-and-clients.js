const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== USERS & ASSIGNED CLIENTS ===');
  const users = await prisma.user.findMany({
    include: {
      assigned_clients: true
    }
  });

  users.forEach(u => {
    if (u.assigned_clients.length > 0) {
      console.log(`[User]: ${u.name} (Email: ${u.email}) - Designation: ${u.designation || 'None'}`);
      console.log(` - Assigned Clients: ${u.assigned_clients.length}`);
      u.assigned_clients.forEach(c => {
        console.log(`   * Client: "${c.name}" (Industry: ${c.industry || 'N/A'}, City: ${c.city || 'N/A'}, Active: ${c.is_active})`);
      });
      console.log('----------------------------------------------------');
    }
  });
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
