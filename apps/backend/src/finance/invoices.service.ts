import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccountingService } from '../accounting/accounting.service';
import { TemplateEngineService } from '../email-management/template-engine.service';

function resolveStateFromGst(gst: string): string | null {
  if (!gst || gst.length < 2) return null;
  const stateCode = gst.trim().substring(0, 2);
  const stateCodeMap: Record<string, string> = {
    "01": "Jammu & Kashmir",
    "02": "Himachal Pradesh",
    "03": "Punjab",
    "04": "Chandigarh",
    "05": "Uttarakhand",
    "06": "Haryana",
    "07": "Delhi",
    "08": "Rajasthan",
    "09": "Uttar Pradesh",
    "10": "Bihar",
    "11": "Sikkim",
    "12": "Arunachal Pradesh",
    "13": "Nagaland",
    "14": "Manipur",
    "15": "Mizoram",
    "16": "Tripura",
    "17": "Meghalaya",
    "18": "Assam",
    "19": "West Bengal",
    "20": "Jharkhand",
    "21": "Odisha",
    "22": "Chhattisgarh",
    "23": "Madhya Pradesh",
    "24": "Gujarat",
    "26": "Dadra and Nagar Haveli and Daman and Diu",
    "27": "Maharashtra",
    "28": "Andhra Pradesh",
    "29": "Karnataka",
    "30": "Goa",
    "31": "Lakshadweep",
    "32": "Kerala",
    "33": "Tamil Nadu",
    "34": "Puducherry",
    "35": "Andaman and Nicobar Islands",
    "36": "Telangana",
    "37": "Andhra Pradesh",
    "38": "Ladakh"
  };
  return stateCodeMap[stateCode] || null;
}

function resolveStateFromAddress(address: string): string | null {
  if (!address) return null;
  const states = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", 
    "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", 
    "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Orissa", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", 
    "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi", "Jammu & Kashmir", 
    "Jammu and Kashmir", "Ladakh", "Puducherry", "Pondicherry", "Chandigarh"
  ];
  for (const s of states) {
    if (new RegExp(`\\b${s}\\b`, 'i').test(address)) {
      if (s.toLowerCase() === 'orissa') return 'Odisha';
      if (s.toLowerCase() === 'jammu and kashmir') return 'Jammu & Kashmir';
      if (s.toLowerCase() === 'pondicherry') return 'Puducherry';
      return s;
    }
  }
  return null;
}

export function getResolvedState(gst: string, address: string, defaultVal: string = "Jharkhand"): string {
  const stateByGst = resolveStateFromGst(gst);
  if (stateByGst) return stateByGst;
  const stateByAddr = resolveStateFromAddress(address);
  if (stateByAddr) return stateByAddr;
  return defaultVal;
}

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

    // Fetch client to resolve customer state
    const client = await this.prisma.client.findUnique({
      where: { id: invoiceData.client_id },
    });
    if (!client) throw new BadRequestException('Client not found');

    // Fetch company settings to resolve company state
    const settings = await this.prisma.systemSetting.findMany({
      where: { key: { in: ['address', 'gst_number'] } },
    });
    const settingsMap = settings.reduce(
      (acc, s) => ({ ...acc, [s.key]: s.value }),
      {} as Record<string, string>,
    );
    const companyState = getResolvedState(settingsMap['gst_number'] || '', settingsMap['address'] || '');
    const clientState = client.state || getResolvedState(client.gst_number || '', client.billing_address || '', companyState);

    const isIntraState = companyState.trim().toLowerCase() === clientState.trim().toLowerCase();

    // Server-side financial calculations
    const subtotal = items.reduce(
      (acc: number, item: any) =>
        acc + Number(item.unit_price) * Number(item.quantity),
      0,
    );
    const discount = Number(invoiceData.discount || 0);
    const cgst = isIntraState ? subtotal * 0.09 : 0;
    const sgst = isIntraState ? subtotal * 0.09 : 0;
    const igst = isIntraState ? 0 : subtotal * 0.18;
    const taxAmount = cgst + sgst + igst;
    const totalAmount = subtotal + taxAmount - discount;

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
      await tx.invoice.update({
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

      // 3. Recalculate totals and taxes dynamically
      const currentInvoice = await tx.invoice.findUnique({
        where: { id },
        include: { items: true, client: true },
      });
      if (!currentInvoice) throw new NotFoundException('Invoice not found');

      const subtotal = currentInvoice.items.reduce(
        (acc: number, item: any) =>
          acc + Number(item.unit_price) * Number(item.quantity),
        0,
      );

      const settings = await tx.systemSetting.findMany({
        where: { key: { in: ['address', 'gst_number'] } },
      });
      const settingsMap = settings.reduce(
        (acc, s) => ({ ...acc, [s.key]: s.value }),
        {} as Record<string, string>,
      );
      const companyState = getResolvedState(settingsMap['gst_number'] || '', settingsMap['address'] || '');
      const clientState = currentInvoice.client.state || getResolvedState(currentInvoice.client.gst_number || '', currentInvoice.client.billing_address || '', companyState);

      const isIntraState = companyState.trim().toLowerCase() === clientState.trim().toLowerCase();

      const discount = Number(currentInvoice.discount || 0);
      const cgst = isIntraState ? subtotal * 0.09 : 0;
      const sgst = isIntraState ? subtotal * 0.09 : 0;
      const igst = isIntraState ? 0 : subtotal * 0.18;
      const taxAmount = cgst + sgst + igst;
      const totalAmount = subtotal + taxAmount - discount;

      const finalInvoice = await tx.invoice.update({
        where: { id },
        data: {
          subtotal,
          tax_amount: taxAmount,
          cgst,
          sgst,
          igst,
          total_amount: totalAmount,
        },
        include: { items: true },
      });

      return finalInvoice;
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

      // Ensure Output GST Accounts exist in the Chart of Accounts
      const checkAndCreateAccount = async (code: string, name: string) => {
        let acc = await this.prisma.account.findUnique({ where: { code } });
        if (!acc) {
          acc = await this.prisma.account.create({
            data: {
              code,
              name,
              type: 'LIABILITY',
              balance: 0,
            },
          });
        }
        return acc;
      };

      await checkAndCreateAccount('2210', 'Output CGST');
      await checkAndCreateAccount('2220', 'Output SGST');
      await checkAndCreateAccount('2230', 'Output IGST');

      const clientName = invoice.client?.name || 'Unknown Client';
      const sub = Number(invoice.subtotal);
      const discount = Number(invoice.discount || 0);
      const tax = Number(invoice.tax_amount);
      const cgst = Number(invoice.cgst || 0);
      const sgst = Number(invoice.sgst || 0);
      const igst = Number(invoice.igst || 0);

      // Amount to debit/credit to Sales Revenue (subtotal less discount)
      const netSales = sub - discount;

      if (tax > 0) {
        // 1. Post sales revenue portion
        await this.accountingService.postVoucher({
          description: `Auto-generated: Invoice subtotal for ${invoice.invoice_number} (${clientName})`,
          amount: netSales,
          debit_code: '1200', // Accounts Receivable
          credit_code: '4000', // Sales Revenue
          created_by: 'System',
          invoice_id: invoice.id,
        });

        // 2. Post tax portion
        if (igst > 0) {
          // Inter-state
          await this.accountingService.postVoucher({
            description: `Auto-generated: Output IGST for ${invoice.invoice_number} (${clientName})`,
            amount: igst,
            debit_code: '1200', // Accounts Receivable
            credit_code: '2230', // Output IGST
            created_by: 'System',
            invoice_id: invoice.id,
          });
        } else {
          // Intra-state
          if (cgst > 0) {
            await this.accountingService.postVoucher({
              description: `Auto-generated: Output CGST for ${invoice.invoice_number} (${clientName})`,
              amount: cgst,
              debit_code: '1200', // Accounts Receivable
              credit_code: '2210', // Output CGST
              created_by: 'System',
              invoice_id: invoice.id,
            });
          }
          if (sgst > 0) {
            await this.accountingService.postVoucher({
              description: `Auto-generated: Output SGST for ${invoice.invoice_number} (${clientName})`,
              amount: sgst,
              debit_code: '1200', // Accounts Receivable
              credit_code: '2220', // Output SGST
              created_by: 'System',
              invoice_id: invoice.id,
            });
          }
        }
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
