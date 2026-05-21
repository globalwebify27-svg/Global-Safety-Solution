import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

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
      include: { payments: true },
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

    return payment;
  }

  async findByInvoice(invoiceId: string) {
    return this.prisma.payment.findMany({
      where: { invoice_id: invoiceId },
      orderBy: { created_at: 'desc' },
    });
  }
}
