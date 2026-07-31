import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccountingService } from '../accounting/accounting.service';
import { TemplateEngineService } from '../email-management/template-engine.service';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private accountingService: AccountingService,
    private templateEngine: TemplateEngineService,
  ) {}

  async findAll() {
    return this.prisma.payment.findMany({
      include: { invoice: { include: { client: true } } },
      orderBy: { created_at: 'desc' },
    });
  }

  async create(data: any) {
    const { invoice_id, amount, ...paymentData } = data;

    // Check if invoice exists
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoice_id },
      include: { payments: true, client: true },
    });

    if (!invoice) throw new BadRequestException('Invoice not found');

    // Create payment
    const payment = await this.prisma.payment.create({
      data: {
        invoice_id,
        amount,
        ...paymentData,
      },
    });

    // Update invoice status
    const totalPaid =
      invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0) +
      Number(amount);
    let status = 'PARTIAL';
    if (totalPaid >= Number(invoice.total_amount)) {
      status = 'PAID';
    }

    await this.prisma.invoice.update({
      where: { id: invoice_id },
      data: { status },
    });

    // Auto-Credit Lead Ledger if invoice is linked to a Quotation/Lead
    if (invoice.quotation_id) {
      const quotation = await this.prisma.quotation.findUnique({
        where: { id: invoice.quotation_id },
        select: { lead_id: true, quote_number: true }
      });

      if (quotation && quotation.lead_id) {
        const lastTx = await this.prisma.leadTransaction.findFirst({
          where: { lead_id: quotation.lead_id },
          orderBy: { created_at: 'desc' }
        });
        const currentBalance = (lastTx ? Number(lastTx.balance) : 0) + Number(amount);

        await this.prisma.leadTransaction.create({
          data: {
            lead_id: quotation.lead_id,
            description: `Auto-generated: Payment recorded for Invoice against ${quotation.quote_number}`,
            type: 'CREDIT',
            amount: amount,
            balance: currentBalance,
          }
        });
      }
    }

    try {
      const clientName = invoice.client?.name || 'Unknown Client';
      await this.accountingService.postVoucher({
        description: `Auto-generated: Payment received for Invoice ${invoice.invoice_number} (${clientName})`,
        amount: Number(amount),
        debit_code: '1010', // Bank Current Account
        credit_code: '1200', // Accounts Receivable
        created_by: 'System',
        invoice_id: invoice.id,
        payment_id: payment.id,
      });
    } catch (err) {
      console.warn('[Auto-Accounting] Failed to post payment voucher:', err.message);
    }

    // Auto-dispatch Payment Receipt Email to Client
    if (invoice.client?.email) {
      try {
        await this.sendPaymentReceipt(payment.id);
      } catch (err) {
        console.warn('[PaymentsService] Auto-send payment receipt warning:', err?.message);
      }
    }

    return payment;
  }

  async findByInvoice(invoiceId: string) {
    return this.prisma.payment.findMany({
      where: { invoice_id: invoiceId },
      orderBy: { created_at: 'desc' },
    });
  }

  async sendPaymentReceipt(id: string, recipientEmail?: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: { invoice: { include: { client: true } } },
    });

    if (!payment) throw new NotFoundException('Payment record not found.');

    const targetEmail = recipientEmail || payment.invoice?.client?.email;
    if (!targetEmail) throw new BadRequestException('Client email address is missing.');

    const result = await this.templateEngine.sendTemplatedEmail({
      templateCode: 'PAYMENT_RECEIPT',
      to: targetEmail,
      context: {
        client_name: payment.invoice?.client?.name || 'Valued Client',
        invoice_number: payment.invoice?.invoice_number || 'N/A',
        amount: `₹${Number(payment.amount).toLocaleString('en-IN')}`,
        payment_method: payment.payment_method || 'Bank Transfer',
        payment_date: payment.created_at ? new Date(payment.created_at).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN'),
      },
      module: 'FINANCE',
    });

    return { success: true, message: `Payment receipt emailed to ${targetEmail}`, result };
  }
}
