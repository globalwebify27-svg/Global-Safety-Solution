const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const quotation = await prisma.quotation.findUnique({
      where: { id: 'd4e9b69a-0187-43f8-92d3-90210037b5e6' },
      include: {
        invoice: true,
        work_orders: true
      }
    });

    console.log('CONVERSION DETAILS FOR GSS/2026/006:', JSON.stringify({
      quoteNumber: quotation.quote_number,
      status: quotation.status,
      invoiceNumber: quotation.invoice?.invoice_number,
      workOrders: quotation.work_orders.map(w => ({
        no: w.work_order_no,
        description: w.description,
        status: w.status
      }))
    }, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
