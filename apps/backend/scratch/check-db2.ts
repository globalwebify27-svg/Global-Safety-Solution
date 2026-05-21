import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const txs = await prisma.leadTransaction.findMany();
  console.log("Transactions:", txs);
  
  const leadId = "14f4a969-1ff1-4f0d-8194-97250bdcfa9f"; // The one from user's URL
  
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      quotations: true
    }
  });
  console.log("Lead:", JSON.stringify(lead, null, 2));

  const invoices = await prisma.invoice.findMany({
    where: { invoice_number: 'INV-2026-0005' },
    include: { payments: true }
  });
  console.log("Invoice:", JSON.stringify(invoices, null, 2));
}

check().catch(console.error).finally(() => prisma.$disconnect());
