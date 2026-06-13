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

    const docs = await prisma.document.findMany({
      include: {
        client: true
      }
    });
    console.log("\nDOCUMENTS:");
    docs.forEach(d => {
      console.log(`- ${d.name} (client_id: ${d.client_id}, client: ${d.client?.name})`);
    });

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
