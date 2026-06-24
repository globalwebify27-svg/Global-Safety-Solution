import 'dotenv/config';
import { PrismaClient } from '@repo/database';

async function main() {
  const prisma = new PrismaClient();
  try {
    const users = await prisma.user.findMany({
      include: {
        roles: { include: { role: true } }
      }
    });
    console.log("USERS:");
    users.forEach(u => {
      console.log(`- ${u.name} (${u.email}): roles: ${u.roles.map(r => r.role.name).join(', ')}`);
    });

    const clients = await prisma.client.findMany({
      include: {
        contacts: true
      }
    });
    console.log("\nCLIENTS:");
    clients.forEach(c => {
      console.log(`- ${c.name} (${c.email}): contacts: ${c.contacts.map(con => con.email).join(', ')}`);
    });

    console.log("Repairing inspection item photo URL...");
    await prisma.inspectionItem.update({
      where: { id: '4af5d610-0f3e-45e9-86af-dd5c4c39ccc7' },
      data: {
        photo_url: '["http://127.0.0.1:3001/public/OTHER/1782288554520-398873360.jpg","http://127.0.0.1:3001/public/OTHER/1782288554746-199124943.jpg","http://127.0.0.1:3001/public/OTHER/1782288556018-408771066.jpg"]'
      }
    });
    console.log("Repair completed!");

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
