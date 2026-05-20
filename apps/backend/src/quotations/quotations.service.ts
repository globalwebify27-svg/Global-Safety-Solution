import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class QuotationsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async findAll() {
    return this.prisma.quotation.findMany({
      include: {
        items: true,
        lead: true,
        client: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async create(data: any) {
    const { items, apply_gst, ...quoteData } = data;

    // Clean up empty strings for IDs to prevent Prisma UUID validation errors
    if (quoteData.lead_id === '') quoteData.lead_id = null;
    if (quoteData.client_id === '') quoteData.client_id = null;

    // Generate professional quote number: GSS/YEAR/SERIAL (Scoped to current year)
    const year = new Date().getFullYear();
    const latestQuote = await this.prisma.quotation.findFirst({
      where: {
        quote_number: {
          startsWith: `GSS/${year}/`,
        },
      },
      orderBy: {
        quote_number: 'desc',
      },
    });

    let nextSerial = 1;
    if (latestQuote) {
      const parts = latestQuote.quote_number.split('/');
      const lastSerial = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSerial)) {
        nextSerial = lastSerial + 1;
      }
    }
    const quoteNumber = `GSS/${year}/${String(nextSerial).padStart(3, '0')}`;

    // Calculate totals on server-side for integrity
    const subtotal = items.reduce(
      (acc: number, item: any) =>
        acc + Number(item.unit_price) * Number(item.quantity),
      0,
    );

    // GST Calculation (Assume 18% total if apply_gst is active)
    const activeGst = apply_gst !== false;
    const cgst = activeGst ? subtotal * 0.09 : 0;
    const sgst = activeGst ? subtotal * 0.09 : 0;
    const igst = 0; // Interstate would be 18% IGST
    const taxAmount = cgst + sgst + igst;
    const totalAmount = subtotal + taxAmount;

    const quotation = await this.prisma.quotation.create({
      data: {
        ...quoteData,
        quote_number: quoteNumber,
        subtotal: subtotal,
        total_amount: totalAmount,
        tax_amount: taxAmount,
        cgst,
        sgst,
        igst,
        items: {
          create: items.map((item: any) => ({
            description: item.description,
            quantity: Number(item.quantity),
            unit_price: Number(item.unit_price),
            total: Number(item.quantity) * Number(item.unit_price),
          })),
        },
      },
      include: { items: true, lead: true, client: true },
    });

    await this.notificationsService.notifyAdmins(
      'New Quotation Created',
      `Quotation ${quoteNumber} has been generated for ${totalAmount.toLocaleString()} INR.`,
      'INFO',
      `/dashboard/quotations`,
    );

    return quotation;
  }

  async findOne(id: string) {
    return this.prisma.quotation.findUnique({
      where: { id },
      include: { items: true, lead: true, client: true },
    });
  }

  async updateStatus(id: string, status: string) {
    return this.prisma.quotation.update({
      where: { id },
      data: { status },
    });
  }

  async remove(id: string) {
    return this.prisma.quotation.delete({
      where: { id },
    });
  }

  async convertToProjectAndInvoice(id: string) {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const year = new Date().getFullYear();
          const quotation = await tx.quotation.findUnique({
            where: { id },
            include: { items: true, lead: true, client: true },
          });

          if (!quotation) throw new NotFoundException('Quotation not found');

          // Check if already converted
          const existingInvoice = await tx.invoice.findUnique({
            where: { quotation_id: id },
          });
          if (existingInvoice) {
            throw new BadRequestException(
              'This quotation has already been converted to a Project and Invoice.',
            );
          }

          // Determine Client ID - either from quotation directly or from linked lead
          let clientId = quotation.client_id;
          if (!clientId && quotation.lead?.client_id) {
            clientId = quotation.lead.client_id;
          }

          // Auto-convert lead to client if client_id is still missing but lead is linked!
          if (!clientId && quotation.lead_id) {
            const lead = await tx.lead.findUnique({
              where: { id: quotation.lead_id },
            });
            if (lead) {
              // 1. Create the Client record
              const client = await tx.client.create({
                data: {
                  name: lead.company_name,
                  email: lead.email,
                  phone: lead.phone,
                  industry: lead.source || 'General',
                  is_active: true,
                },
              });

              clientId = client.id;

              // 2. Create primary contact
              await tx.clientContact.create({
                data: {
                  client_id: clientId,
                  name: lead.contact_person,
                  email: lead.email,
                  phone: lead.phone,
                  is_primary: true,
                },
              });

              // 3. Update Lead status and client_id
              await tx.lead.update({
                where: { id: lead.id },
                data: {
                  client_id: clientId,
                  status: 'WON',
                },
              });

              // 4. Update the Quotation itself with the new client_id
              await tx.quotation.update({
                where: { id },
                data: { client_id: clientId },
              });
            }
          }

          if (!clientId) {
            throw new BadRequestException(
              'Cannot convert quotation: No associated client or lead found.',
            );
          }

          // Prevent duplicate/similar invoices for this client
          const similarInvoice = await tx.invoice.findFirst({
            where: {
              client_id: clientId,
              total_amount: quotation.total_amount,
              status: { not: 'VOID' },
            },
          });
          if (similarInvoice) {
            throw new BadRequestException(
              `A similar invoice (${similarInvoice.invoice_number}) with the total amount of ₹${Number(quotation.total_amount).toLocaleString()} already exists for this client. Conversion blocked to prevent duplicate billing.`,
            );
          }

          // 1. Update Quotation Status
          await tx.quotation.update({
            where: { id },
            data: { status: 'ACCEPTED' },
          });

          // 2. Create Project
          const project = await tx.project.create({
            data: {
              client_id: clientId,
              name: `Project: ${quotation.quote_number}`,
              description: `Automatically created from Quotation ${quotation.quote_number}. ${quotation.notes || ''}`,
              status: 'PENDING',
              tasks: {
                create: quotation.items.map((item) => ({
                  title: item.description,
                  description: `Task for ${item.description}`,
                  priority: 'MEDIUM',
                  status: 'TODO',
                })),
              },
            },
          });
          // 2.5 Generate Work Orders for each item
          const latestWO = await tx.workOrder.findFirst({
            where: {
              work_order_no: {
                startsWith: `WO-${year}-`,
              },
            },
            orderBy: {
              work_order_no: 'desc',
            },
          });

          let nextWOSerial = 1;
          if (latestWO) {
            const parts = latestWO.work_order_no.split('-');
            const lastSerial = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(lastSerial)) {
              nextWOSerial = lastSerial + 1;
            }
          }

          for (const item of quotation.items) {
            // Try to find a matching service product by name
            const service = await tx.serviceProduct.findFirst({
              where: {
                name: {
                  contains: item.description,
                },
              },
            });

            const workOrderNo = `WO-${year}-${String(nextWOSerial).padStart(4, '0')}`;
            nextWOSerial++;

            await tx.workOrder.create({
              data: {
                project_id: project.id,
                quotation_id: quotation.id,
                service_id: service?.id,
                work_order_no: workOrderNo,
                description: item.description,
                status: 'PENDING',
                items: {
                  create: {
                    description: item.description,
                    quantity: Number(item.quantity) || 1,
                    unit_price: item.unit_price,
                    gst_rate: 18.0,
                    total_amount:
                      Number(item.quantity || 1) * Number(item.unit_price),
                  },
                },
              },
            });
          }

          // 3. Create Invoice (Status: UNPAID/Draft)
          const latestInvoice = await tx.invoice.findFirst({
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

          const invoiceNumber = `INV-${year}-${String(nextInvSerial).padStart(4, '0')}`;

          const invoice = await tx.invoice.create({
            data: {
              client_id: clientId,
              quotation_id: quotation.id,
              invoice_number: invoiceNumber,
              subtotal: quotation.subtotal,
              tax_amount: quotation.tax_amount,
              cgst: quotation.cgst,
              sgst: quotation.sgst,
              igst: quotation.igst,
              total_amount: quotation.total_amount,
              status: 'UNPAID',
              due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // Default 15 days
              notes: `Invoice generated for Quotation ${quotation.quote_number}`,
              items: {
                create: quotation.items.map((item) => ({
                  description: item.description,
                  quantity: item.quantity,
                  unit_price: item.unit_price,
                  total: item.total,
                })),
              },
            },
          });

          // Notify Admin
          await this.notificationsService.notifyAdmins(
            'Sales Conversion Success',
            `Quotation ${quotation.quote_number} was accepted and converted to Project and Invoice.`,
            'SUCCESS',
            `/dashboard/finance`,
          );

          return { project, invoice, quotationId: quotation.id };
        },
        { timeout: 15000 },
      );
    } catch (error: any) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(error.message || 'Conversion failed.');
    }
  }
}
