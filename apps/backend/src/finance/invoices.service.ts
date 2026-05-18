import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const invoices = await this.prisma.invoice.findMany({
      include: { client: true, quotation: true, items: true, payments: true },
      orderBy: { created_at: 'desc' },
    });

    return invoices.map((invoice) => {
      const totalPaid = invoice.payments.reduce(
        (sum, p) => sum + Number(p.amount),
        0,
      );
      return {
        ...invoice,
        total_paid: totalPaid,
        balance_due: Number(invoice.total_amount) - totalPaid,
      };
    });
  }

  async findOne(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { client: true, quotation: true, items: true, payments: true },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');

    const totalPaid = invoice.payments.reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    );
    return {
      ...invoice,
      total_paid: totalPaid,
      balance_due: Number(invoice.total_amount) - totalPaid,
    };
  }

  async create(data: any) {
    const { items, ...invoiceData } = data;

    // Generate invoice number if not provided (e.g. INV-2026-0001)
    if (!invoiceData.invoice_number) {
      const year = new Date().getFullYear();
      const latestInvoice = await this.prisma.invoice.findFirst({
        where: {
          invoice_number: {
            startsWith: `INV-${year}-`,
          },
        },
        orderBy: {
          invoice_number: 'desc',
        },
      });

      let nextInvSerial = 1;
      if (latestInvoice) {
        const parts = latestInvoice.invoice_number.split('-');
        const lastSerial = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastSerial)) {
          nextInvSerial = lastSerial + 1;
        }
      }

      invoiceData.invoice_number = `INV-${year}-${String(nextInvSerial).padStart(4, '0')}`;
    }

    // Server-side financial calculations
    const subtotal = items.reduce(
      (acc: number, item: any) =>
        acc + Number(item.unit_price) * Number(item.quantity),
      0,
    );
    const cgst = subtotal * 0.09;
    const sgst = subtotal * 0.09;
    const igst = 0;
    const taxAmount = cgst + sgst + igst;
    const totalAmount = subtotal + taxAmount;

    return this.prisma.invoice.create({
      data: {
        ...invoiceData,
        subtotal,
        tax_amount: taxAmount,
        cgst,
        sgst,
        igst,
        total_amount: totalAmount,
        items: {
          create: items.map((item: any) => ({
            description: item.description,
            quantity: Number(item.quantity),
            unit_price: Number(item.unit_price),
            total: Number(item.quantity) * Number(item.unit_price),
          })),
        },
      },
      include: { items: true },
    });
  }

  async update(id: string, data: any) {
    const { items, ...invoiceData } = data;

    // Use a transaction to update invoice and its items
    return this.prisma.$transaction(async (tx) => {
      // 1. Update main invoice data
      const updatedInvoice = await tx.invoice.update({
        where: { id },
        data: invoiceData,
      });

      // 2. If items are provided, replace them
      if (items && Array.isArray(items)) {
        await tx.invoiceItem.deleteMany({
          where: { invoice_id: id },
        });

        await tx.invoiceItem.createMany({
          data: items.map((item: any) => ({
            ...item,
            invoice_id: id,
          })),
        });
      }

      return tx.invoice.findUnique({
        where: { id },
        include: { items: true },
      });
    });
  }

  async remove(id: string) {
    return this.prisma.invoice.delete({ where: { id } });
  }

  async updateStatus(id: string, status: string) {
    return this.prisma.invoice.update({
      where: { id },
      data: { status },
    });
  }
}
