import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccountingService } from '../accounting/accounting.service';
import { TemplateEngineService } from '../email-management/template-engine.service';

@Injectable()
export class InvoicesService {
  constructor(
    private prisma: PrismaService,
    private accountingService: AccountingService,
    private templateEngine: TemplateEngineService,
  ) {}

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

    const ledgerEntries = await this.prisma.ledgerEntry.findMany({
      where: { OR: [{ invoice_id: id }, { payment_id: { in: invoice.payments.map(p => p.id) } }] },
      include: { debit_account: true, credit_account: true },
      orderBy: { transaction_date: 'asc' },
    });

    return {
      ...invoice,
      total_paid: totalPaid,
      balance_due: Number(invoice.total_amount) - totalPaid,
      ledger_entries: ledgerEntries,
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

    // Check for similar active invoice to prevent duplicates
    const duplicateInvoice = await this.prisma.invoice.findFirst({
      where: {
        client_id: invoiceData.client_id,
        total_amount: totalAmount,
        status: { not: 'VOID' },
      },
    });

    if (duplicateInvoice) {
      throw new BadRequestException(
        `A similar invoice (${duplicateInvoice.invoice_number}) with the total amount of ₹${totalAmount.toLocaleString()} already exists for this client. Creation blocked to prevent duplicates.`,
      );
    }

    const invoice = await this.prisma.invoice.create({
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
            uom: item.uom || 'PCS',
            total: Number(item.quantity) * Number(item.unit_price),
          })),
        },
      },
      include: { items: true, client: true },
    });

    await this.syncInvoiceVouchers(invoice.id);

    return invoice;
  }

  async update(id: string, data: any) {
    const { items, ...invoiceData } = data;

    // Use a transaction to update invoice and its items
    const invoice = await this.prisma.$transaction(async (tx) => {
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
            description: item.description,
            quantity: Number(item.quantity),
            unit_price: Number(item.unit_price),
            uom: item.uom || 'PCS',
            total: Number(item.quantity) * Number(item.unit_price),
            invoice_id: id,
          })),
        });
      }

      return tx.invoice.findUnique({
        where: { id },
        include: { items: true },
      });
    });

    await this.syncInvoiceVouchers(id);

    return invoice;
  }

  async remove(id: string) {
    await this.accountingService.deleteVouchersForInvoice(id).catch(console.error);
    return this.prisma.invoice.delete({ where: { id } });
  }

  async updateStatus(id: string, status: string) {
    const invoice = await this.prisma.invoice.update({
      where: { id },
      data: { status },
    });

    if (status === 'VOID') {
      await this.accountingService.deleteVouchersForInvoice(id).catch(console.error);
    } else {
      await this.syncInvoiceVouchers(id);
    }

    return invoice;
  }

  async syncInvoiceVouchers(invoiceId: string) {
    try {
      await this.accountingService.deleteVouchersForInvoice(invoiceId);

      const invoice = await this.prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: { client: true, items: true },
      });

      if (!invoice || invoice.status === 'VOID') {
        return;
      }

      const clientName = invoice.client?.name || 'Unknown Client';
      const sub = Number(invoice.subtotal);
      const tax = Number(invoice.tax_amount);

      if (tax > 0) {
        await this.accountingService.postVoucher({
          description: `Auto-generated: Invoice subtotal for ${invoice.invoice_number} (${clientName})`,
          amount: sub,
          debit_code: '1200', // Accounts Receivable
          credit_code: '4000', // Sales Revenue
          created_by: 'System',
          invoice_id: invoice.id,
        });

        await this.accountingService.postVoucher({
          description: `Auto-generated: GST (Tax) for ${invoice.invoice_number} (${clientName})`,
          amount: tax,
          debit_code: '1200', // Accounts Receivable
          credit_code: '2200', // GST / Indirect Tax Payable
          created_by: 'System',
          invoice_id: invoice.id,
        });
      } else {
        await this.accountingService.postVoucher({
          description: `Auto-generated: Invoice created for ${invoice.invoice_number} (${clientName})`,
          amount: Number(invoice.total_amount),
          debit_code: '1200', // Accounts Receivable
          credit_code: '4000', // Sales Revenue
          created_by: 'System',
          invoice_id: invoice.id,
        });
      }
    } catch (err) {
      console.warn('[Auto-Accounting] Failed to sync invoice vouchers:', err.message);
    }
  }

  async sendInvoiceEmail(id: string, recipientEmail?: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { client: true },
    });

    if (!invoice) throw new NotFoundException('Invoice not found.');

    const targetEmail = recipientEmail || invoice.client?.email;
    if (!targetEmail) throw new BadRequestException('Client email address is missing.');

    const result = await this.templateEngine.sendTemplatedEmail({
      templateCode: 'INVOICE_GENERATED',
      to: targetEmail,
      context: {
        client_name: invoice.client?.name || 'Valued Client',
        invoice_number: invoice.invoice_number,
        amount: `₹${Number(invoice.total_amount).toLocaleString('en-IN')}`,
        due_date: invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-IN') : 'Immediate',
      },
      module: 'FINANCE',
    });

    await this.prisma.invoice.update({
      where: { id },
      data: { status: 'SENT' },
    });

    return { success: true, message: `Tax Invoice emailed to ${targetEmail}`, result };
  }

  async sendPaymentReminder(id: string, recipientEmail?: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { client: true, payments: { orderBy: { created_at: 'asc' } } },
    });

    if (!invoice) throw new NotFoundException('Invoice not found.');

    const targetEmail = recipientEmail || invoice.client?.email;
    if (!targetEmail) throw new BadRequestException('Client email address is missing.');

    const totalAmount = Number(invoice.total_amount || 0);
    const paidAmount = (invoice.payments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const remainingDue = Math.max(0, totalAmount - paidAmount);

    let installmentBreakdownHtml = '';
    if (invoice.payments && invoice.payments.length > 0) {
      const rows = invoice.payments
        .map((p, idx) => {
          const payDate = p.created_at ? new Date(p.created_at).toLocaleDateString('en-IN') : 'N/A';
          const pAmount = `₹${Number(p.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
          const pMethod = p.payment_method || 'Payment';
          return `<tr style="border-bottom: 1px dashed #cbd5e1;">
            <td style="padding: 6px 0; color: #475569;">Installment ${idx + 1} (${pMethod}):</td>
            <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #16a34a;">${pAmount} <span style="font-size: 11px; color: #64748b; font-weight: normal;">(Paid on ${payDate})</span></td>
          </tr>`;
        })
        .join('');

      installmentBreakdownHtml = `
        <div style="margin: 16px 0; background-color: #f1f5f9; border-radius: 8px; padding: 12px 16px;">
          <p style="margin: 0 0 8px 0; font-weight: bold; font-size: 13px; color: #334155; text-transform: uppercase; letter-spacing: 0.5px;">Paid Installments History:</p>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            ${rows}
          </table>
        </div>
      `;
    }

    const result = await this.templateEngine.sendTemplatedEmail({
      templateCode: 'OVERDUE_PAYMENT_REMINDER',
      to: targetEmail,
      context: {
        client_name: invoice.client?.name || 'Valued Client',
        invoice_number: invoice.invoice_number,
        total_amount: `₹${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        paid_amount: `₹${paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        remaining_due: `₹${remainingDue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        amount: `₹${remainingDue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        due_date: invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-IN') : 'Overdue',
        installment_breakdown_html: installmentBreakdownHtml,
      },
      module: 'FINANCE',
    });

    return { success: true, message: `Payment reminder emailed to ${targetEmail}`, result };
  }
}
