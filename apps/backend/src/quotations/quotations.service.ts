import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TemplateEngineService } from '../email-management/template-engine.service';
import { LocalStorageService } from '../common/services/local-storage.service';
import { getPersistentUploadsDir } from '../common/utils/storage-utils';

@Injectable()
export class QuotationsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private templateEngine: TemplateEngineService,
    private localStorageService: LocalStorageService,
  ) { }

  async findAll(userPayload?: any) {
    let clientId: string | undefined;

    if (userPayload) {
      const user = await this.prisma.user.findUnique({
        where: { id: userPayload.userId },
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      });

      const isClient =
        user?.roles?.some(
          (ur: any) =>
            ur.role.name === 'CLIENT' || ur.role.name === 'CLIENTS',
        ) || (user?.designation || '').toUpperCase().includes('CLIENT');

      if (isClient && user?.email) {
        const clientRecord = await this.prisma.client.findFirst({
          where: { email: user.email },
        });
        clientId = clientRecord?.id;
      }
    }

    return this.prisma.quotation.findMany({
      where: clientId ? {
        OR: [
          { client_id: clientId },
          { lead: { client_id: clientId } }
        ]
      } : undefined,
      include: {
        items: { orderBy: { sort_order: 'asc' } },
        lead: true,
        client: true,
        invoice: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async create(data: any) {
    const { items, apply_gst, ...quoteData } = data;

    // Clean up empty strings for IDs to prevent Prisma UUID validation errors
    if (quoteData.lead_id === '') quoteData.lead_id = null;
    if (quoteData.client_id === '') quoteData.client_id = null;

    if (quoteData.date) {
      quoteData.date = new Date(quoteData.date);
    } else {
      delete quoteData.date;
    }

    // Generate or validate quote number
    let quoteNumber = quoteData.quote_number?.trim();
    delete quoteData.quote_number;

    if (quoteNumber) {
      // Check uniqueness of manually entered quote number
      const existing = await this.prisma.quotation.findUnique({
        where: { quote_number: quoteNumber }
      });
      if (existing) {
        throw new BadRequestException(`Quotation number "${quoteNumber}" already exists.`);
      }
    } else {
      // Auto-generate: QT-YEAR-SERIAL (Scoped to current year)
      const year = new Date().getFullYear();
      const latestQuote = await this.prisma.quotation.findFirst({
        where: {
          quote_number: {
            startsWith: `QT-${year}-`,
          },
        },
        orderBy: {
          quote_number: 'desc',
        },
      });

      let nextSerial = 1;
      if (latestQuote) {
        const parts = latestQuote.quote_number.split('-');
        const lastSerial = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastSerial)) {
          nextSerial = lastSerial + 1;
        }
      }
      quoteNumber = `QT-${year}-${String(nextSerial).padStart(4, '0')}`;
    }

    // Calculate totals on server-side for integrity
    const subtotal = items.reduce(
      (acc: number, item: any) =>
        acc + Number(item.unit_price) * Number(item.quantity),
      0,
    );

    const discount = Number(quoteData.discount) || 0;
    const taxableValue = Math.max(0, subtotal - discount);

    // GST Calculation (Assume 18% total if apply_gst is active)
    const activeGst = apply_gst !== false;
    const cgst = activeGst ? taxableValue * 0.09 : 0;
    const sgst = activeGst ? taxableValue * 0.09 : 0;
    const igst = 0; // Interstate would be 18% IGST
    const taxAmount = cgst + sgst + igst;
    const totalAmount = taxableValue + taxAmount;

    // Auto-populate Authorized Representative if not provided
    if (!quoteData.authorized_rep_name) {
      if (quoteData.client_id) {
        // Try Primary Contact from ClientContact
        const primaryContact = await this.prisma.clientContact.findFirst({
          where: { client_id: quoteData.client_id, is_primary: true },
        });
        if (primaryContact) {
          quoteData.authorized_rep_name = primaryContact.name;
          quoteData.authorized_rep_designation = primaryContact.designation || null;
          quoteData.authorized_rep_email = primaryContact.email || null;
          quoteData.authorized_rep_phone = primaryContact.phone || null;
        } else {
          // Fallback to Client's contact_person
          const client = await this.prisma.client.findUnique({ where: { id: quoteData.client_id } });
          if (client) {
            quoteData.authorized_rep_name = client.contact_person || client.name;
            quoteData.authorized_rep_designation = client.contact_designation || null;
            quoteData.authorized_rep_email = client.email || null;
            quoteData.authorized_rep_phone = client.phone || null;
          }
        }
      } else if (quoteData.lead_id) {
        const lead = await this.prisma.lead.findUnique({ where: { id: quoteData.lead_id } });
        if (lead) {
          quoteData.authorized_rep_name = lead.contact_person;
          quoteData.authorized_rep_email = lead.email || null;
          quoteData.authorized_rep_phone = lead.phone || null;
        }
      }
    }

    const quotation = await this.prisma.quotation.create({
      data: {
        ...quoteData,
        quote_number: quoteNumber,
        subtotal: subtotal,
        discount: discount,
        total_amount: totalAmount,
        tax_amount: taxAmount,
        cgst,
        sgst,
        igst,
        items: {
          create: items.map((item: any, index: number) => ({
            description: item.description,
            quantity: Number(item.quantity),
            unit_price: Number(item.unit_price),
            uom: item.uom || 'PCS',
            total: Number(item.quantity) * Number(item.unit_price),
            sort_order: index,
          })),
        },
      },
      include: { items: { orderBy: { sort_order: 'asc' } }, lead: true, client: true },
    });

    // Auto-update the Lead to PROPOSAL status and update expected_value
    if (quotation.lead_id) {
      try {
        const lead = await this.prisma.lead.findUnique({ where: { id: quotation.lead_id } });
        if (lead) {
          await this.prisma.lead.update({
            where: { id: lead.id },
            data: {
              status: lead.status === 'NEW' || lead.status === 'CONTACTED' || lead.status === 'QUALIFIED' ? 'PROPOSAL' : lead.status,
              expected_value: Number(lead.expected_value) < totalAmount ? totalAmount : lead.expected_value
            }
          });
        }
      } catch (err) {
        console.warn('[QuoteCreate] Failed to update lead status:', err?.message);
      }
    }

    try {
      await this.notificationsService.notifyAdmins(
        'New Quotation Created',
        `Quotation ${quoteNumber} has been generated for ${totalAmount.toLocaleString()} INR.`,
        'INFO',
        `/dashboard/quotations`,
      );
    } catch (err) {
      console.warn('[QuoteCreate] Failed to send admin notification:', err?.message);
    }

    return quotation;
  }

  async quickQuote(leadId: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new NotFoundException('Lead not found');

    let amount = Number(lead.expected_value) || 20000;

    // For quick quote, we generate a quote equivalent to the expected deal value.
    // Assuming the amount is inclusive of 18% GST (if GST applies), but let's just make the unit_price equal to amount to match the expected value directly (no GST).
    return this.create({
      lead_id: leadId,
      items: [
        {
          description: `Custom Proposal for ${lead.company_name}`,
          quantity: 1,
          unit_price: amount
        }
      ],
      apply_gst: false,
      notes: "Auto-generated quick quote based on lead expectations."
    });
  }

  async findOne(id: string) {
    return this.prisma.quotation.findUnique({
      where: { id },
      include: { items: { orderBy: { sort_order: 'asc' } }, lead: true, client: true },
    });
  }

  async updateStatus(id: string, status: string) {
    const quotation = await this.prisma.quotation.findUnique({ where: { id } });
    if (!quotation) throw new NotFoundException('Quotation not found');

    if (status === 'ACCEPTED' && quotation.status !== 'ACCEPTED' && quotation.lead_id) {
      // Auto-Debit Lead Ledger
      const lastTx = await this.prisma.leadTransaction.findFirst({
        where: { lead_id: quotation.lead_id },
        orderBy: { created_at: 'desc' }
      });
      const currentBalance = (lastTx ? Number(lastTx.balance) : 0) - Number(quotation.total_amount);

      await this.prisma.leadTransaction.create({
        data: {
          lead_id: quotation.lead_id,
          description: `Auto-generated: Quotation ${quotation.quote_number} Accepted`,
          type: 'DEBIT',
          amount: quotation.total_amount,
          balance: currentBalance,
        }
      });

      // Automatically move the Lead to WON in the Sales Pipeline
      await this.prisma.lead.update({
        where: { id: quotation.lead_id },
        data: { status: 'WON' }
      });
    }

    return this.prisma.quotation.update({
      where: { id },
      data: { status },
    });
  }

  async update(id: string, data: any) {
    const { items, apply_gst, ...quoteData } = data;

    if (quoteData.lead_id === '') quoteData.lead_id = null;
    if (quoteData.client_id === '') quoteData.client_id = null;

    if (quoteData.quote_number) {
      quoteData.quote_number = quoteData.quote_number.trim();
      const existing = await this.prisma.quotation.findFirst({
        where: {
          quote_number: quoteData.quote_number,
          id: { not: id }
        }
      });
      if (existing) {
        throw new BadRequestException(`Quotation number "${quoteData.quote_number}" already exists.`);
      }
    }

    if (quoteData.date) {
      quoteData.date = new Date(quoteData.date);
    } else {
      delete quoteData.date;
    }

    // Calculate totals on server-side for integrity
    const subtotal = items.reduce(
      (acc: number, item: any) =>
        acc + Number(item.unit_price) * Number(item.quantity),
      0,
    );

    const discount = Number(quoteData.discount) || 0;
    const taxableValue = Math.max(0, subtotal - discount);

    // GST Calculation (Assume 18% total if apply_gst is active)
    const activeGst = apply_gst !== false;
    const cgst = activeGst ? taxableValue * 0.09 : 0;
    const sgst = activeGst ? taxableValue * 0.09 : 0;
    const igst = 0; // Interstate would be 18% IGST
    const taxAmount = cgst + sgst + igst;
    const totalAmount = taxableValue + taxAmount;

    return this.prisma.$transaction(async (tx: any) => {
      // Delete existing line items
      await tx.quoteItem.deleteMany({
        where: { quotation_id: id }
      });

      // Update quotation and create new line items
      return tx.quotation.update({
        where: { id },
        data: {
          ...quoteData,
          subtotal: subtotal,
          discount: discount,
          total_amount: totalAmount,
          tax_amount: taxAmount,
          cgst,
          sgst,
          igst,
          items: {
            create: items.map((item: any, index: number) => ({
              description: item.description,
              quantity: Number(item.quantity),
              unit_price: Number(item.unit_price),
              uom: item.uom || 'PCS',
              total: Number(item.quantity) * Number(item.unit_price),
              sort_order: index,
            })),
          },
        },
        include: { items: { orderBy: { sort_order: 'asc' } }, lead: true, client: true },
      });
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
        async (tx: any) => {
          const year = new Date().getFullYear();
          const quotation = await tx.quotation.findUnique({
            where: { id },
            include: { items: { orderBy: { sort_order: 'asc' } }, lead: true, client: true },
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
              let assignedStaffId = lead.assigned_to;
              if (!assignedStaffId) {
                const superAdmin = await tx.user.findFirst({
                  where: { email: 'admin@globalsafety.com' }
                });
                assignedStaffId = superAdmin?.id || null;
              }

              // 1. Create the Client record
              const client = await tx.client.create({
                data: {
                  name: lead.company_name,
                  email: lead.email,
                  phone: lead.phone,
                  industry: lead.source || 'General',
                  is_active: true,
                  assigned_staff_id: assignedStaffId,
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

          // 1.5 Log Debit if it has a lead
          if (quotation.status !== 'ACCEPTED' && quotation.lead_id) {
            const currentBalanceRecord = await tx.leadTransaction.findFirst({
              where: { lead_id: quotation.lead_id },
              orderBy: { created_at: 'desc' }
            });
            const currentBalance = currentBalanceRecord ? currentBalanceRecord.balance : 0;

            await tx.leadTransaction.create({
              data: {
                lead_id: quotation.lead_id,
                description: `Auto-generated: Quotation ${quotation.quote_number} Converted to Invoice`,
                type: 'DEBIT',
                amount: quotation.total_amount,
                balance: currentBalance,
              }
            });
          }

          // 2. Create Project
          const project = await tx.project.create({
            data: {
              client_id: clientId,
              quotation_id: id,
              name: `Project: ${quotation.quote_number}`,
              description: `Automatically created from Quotation ${quotation.quote_number}. ${quotation.notes || ''}`,
              contract_value: quotation.total_amount,
              stage: 'PROJECT_CREATED',
              status: 'PENDING',
              tasks: {
                create: quotation.items.map((item: any) => ({
                  title: item.description,
                  description: `Task for ${item.description}`,
                  priority: 'MEDIUM',
                  status: 'TODO',
                })),
              },
              activities: {
                create: {
                  action: 'Project Initialized from Quotation',
                  performed_by: 'System Automation',
                  remarks: `Project converted automatically from approved Proposal ${quotation.quote_number} for total amount ₹${Number(quotation.total_amount).toLocaleString()}`,
                },
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
              discount: quotation.discount,
              tax_amount: quotation.tax_amount,
              cgst: quotation.cgst,
              sgst: quotation.sgst,
              igst: quotation.igst,
              total_amount: quotation.total_amount,
              status: 'UNPAID',
              due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // Default 15 days
              notes: `Invoice generated for Quotation ${quotation.quote_number}`,
              items: {
                create: quotation.items.map((item: any) => ({
                  description: item.description,
                  quantity: item.quantity,
                  unit_price: item.unit_price,
                  uom: item.uom || 'PCS',
                  total: item.total,
                })),
              },
            },
          });

          // Post accounting voucher for the auto-created invoice
          try {
            const debitAcc = await tx.account.findUnique({ where: { code: '1200' } });
            const creditAcc = await tx.account.findUnique({ where: { code: '4000' } });
            if (debitAcc && creditAcc) {
              const count = await tx.ledgerEntry.count();
              const voucherNo = `JV-${year}-${String(count + 1).padStart(4, '0')}`;

              await tx.ledgerEntry.create({
                data: {
                  voucher_no: voucherNo,
                  description: `Auto-generated: Invoice created for ${invoiceNumber} (Converted from Quotation ${quotation.quote_number})`,
                  amount: quotation.total_amount,
                  debit_account_id: debitAcc.id,
                  credit_account_id: creditAcc.id,
                  created_by: 'System',
                }
              });

              // Update Debit Account (Accounts Receivable is ASSET, increases on Debit)
              await tx.account.update({
                where: { id: debitAcc.id },
                data: { balance: { increment: quotation.total_amount } }
              });

              // Update Credit Account (Sales Revenue is REVENUE, increases on Credit)
              await tx.account.update({
                where: { id: creditAcc.id },
                data: { balance: { increment: quotation.total_amount } }
              });
            }
          } catch (err) {
            console.warn('[Auto-Accounting] Failed to post converted invoice voucher:', err.message);
          }

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

  async sendQuotationProposal(id: string, recipientEmail?: string) {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id },
      include: { client: true, lead: true, items: { orderBy: { sort_order: 'asc' } } },
    });

    if (!quotation) {
      throw new NotFoundException('Quotation not found.');
    }

    const emailTo = recipientEmail || quotation.client?.email || quotation.lead?.email;
    if (!emailTo) {
      throw new BadRequestException('Client email address is missing for this quotation.');
    }

    const context = {
      client_name: quotation.client?.name || quotation.lead?.company_name || 'Valued Client',
      quotation_number: quotation.quote_number,
      total_amount: quotation.total_amount ? Number(quotation.total_amount).toLocaleString('en-IN') : '0.00',
      amount: quotation.total_amount ? `₹${Number(quotation.total_amount).toLocaleString('en-IN')}` : '₹0.00',
      acceptance_link: `http://localhost:3000/verify/proposal/${quotation.id}`,
    };

    // 1. Get/Generate the Quotation PDF
    let pdfBuffer: Buffer;
    let pdfFilename: string;
    try {
      const pdfData = await this.getOrCreateQuotationPdf(quotation.id);
      pdfBuffer = pdfData.buffer;
      pdfFilename = pdfData.filename;
    } catch (pdfErr: any) {
      throw new BadRequestException(`Failed to generate quotation PDF: ${pdfErr.message || pdfErr}`);
    }

    const attachments = [{
      filename: pdfFilename,
      content: pdfBuffer,
    }];

    const result = await this.templateEngine.sendTemplatedEmail({
      templateCode: 'QUOTATION_PROPOSAL',
      to: emailTo,
      context,
      attachments,
      module: 'QUOTATIONS',
    });

    // Update status to SENT
    await this.prisma.quotation.update({
      where: { id },
      data: { status: 'SENT' },
    });

    const isSkipped = (result as any)?.status === 'SKIPPED_DISABLED';

    return {
      success: true,
      message: isSkipped
        ? `Quotation marked as SENT. Email dispatch skipped (Notification rule is disabled).`
        : `Quotation proposal email sent successfully to ${emailTo}`,
      result,
    };
  }

  async getOrCreateQuotationPdf(quotationId: string): Promise<{ buffer: Buffer, filename: string }> {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id: quotationId },
      include: { client: true, lead: true, items: { orderBy: { sort_order: 'asc' } } },
    });

    if (!quotation) {
      throw new NotFoundException('Quotation not found.');
    }

    const filename = `Quotation-${quotation.quote_number}.pdf`;

    // 1. Check if the document already exists in DB
    const existingDoc = await this.prisma.document.findFirst({
      where: {
        name: filename,
        OR: [
          { client_id: quotation.client_id || undefined },
          { lead_id: quotation.lead_id || undefined },
        ].filter(Boolean) as any,
      },
    });

    if (existingDoc) {
      // Find filename from URL
      const parts = existingDoc.file_url.split('/');
      const uniqueFileName = parts[parts.length - 1];
      
      // Try to read it from persistent_uploads
      const fs = require('fs');
      const path = require('path');
      const uploadDir = getPersistentUploadsDir();
      const filePath = path.join(uploadDir, uniqueFileName);

      if (fs.existsSync(filePath)) {
        try {
          const buffer = fs.readFileSync(filePath);
          return { buffer, filename };
        } catch (e) {
          // Ignore and fall back to regeneration
        }
      }
    }

    // 2. Generate a new PDF using PDFKit
    const buffer = await this.generateQuotationPdfBuffer(quotation);

    // Save file via LocalStorageService
    const fileUrl = await this.localStorageService.saveFile(buffer, filename, 'application/pdf');

    // Create a Document record in DB for tracking/Vault
    await this.prisma.document.create({
      data: {
        name: filename,
        file_url: fileUrl,
        file_type: 'PDF',
        file_size: buffer.length,
        category: 'QUOTATION',
        client_id: quotation.client_id || null,
        lead_id: quotation.lead_id || null,
      },
    });

    return { buffer, filename };
  }

  async generateQuotationPdfBuffer(quotation: any): Promise<Buffer> {
    const fs = require('fs');
    const path = require('path');
    
    // Logo loading
    let logoBuffer: Buffer | null = null;
    try {
      const possiblePaths = [
        path.join(__dirname, '..', 'assets', 'gss-logo.png'),
        path.join(__dirname, 'assets', 'gss-logo.png'),
        path.join(process.cwd(), 'assets', 'gss-logo.png'),
        path.join(process.cwd(), 'dist', 'assets', 'gss-logo.png'),
        path.join(process.cwd(), 'apps/backend/src/assets/gss-logo.png'),
        path.join(process.cwd(), 'src/assets/gss-logo.png'),
      ];
      for (const logoPath of possiblePaths) {
        if (fs.existsSync(logoPath)) {
          logoBuffer = fs.readFileSync(logoPath);
          break;
        }
      }
    } catch (err) {
      console.error('Failed to load logo:', err);
    }

    // Stamp and signature loading
    let stampSigBuffer: Buffer | null = null;
    try {
      const possiblePaths = [
        path.join(__dirname, '..', 'assets', 'gss-stamp-signature.png'),
        path.join(__dirname, 'assets', 'gss-stamp-signature.png'),
        path.join(process.cwd(), 'assets', 'gss-stamp-signature.png'),
        path.join(process.cwd(), 'dist', 'assets', 'gss-stamp-signature.png'),
        path.join(process.cwd(), 'apps/backend/src/assets/gss-stamp-signature.png'),
        path.join(process.cwd(), 'src/assets/gss-stamp-signature.png'),
      ];
      for (const sigPath of possiblePaths) {
        if (fs.existsSync(sigPath)) {
          stampSigBuffer = fs.readFileSync(sigPath);
          break;
        }
      }
    } catch (err) {
      console.error('Failed to load stamp and signature:', err);
    }

    const _PDFDocument = require('pdfkit');
    const PDFDocument = _PDFDocument.default || _PDFDocument;

    return new Promise((resolve, reject) => {
      // Set bufferPages: true to allow footer drawing with correct page count at the end
      const docOptions: any = { margin: 40, size: 'A4', bufferPages: true };
      const doc = new PDFDocument(docOptions);
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err: Error) => {
        console.error('[PDFKit] Document error in generateQuotationPdfBuffer:', err);
        reject(err);
      });

      // Colors
      const primaryColor = '#0f172a'; // Slate-900
      const goldColor = '#b8860b'; // Gold
      const lightGrey = '#f8fafc'; // Slate-50
      const borderGrey = '#e2e8f0'; // Slate-200

      // Enterprise Header (Top information)
      doc.fillColor('#000000').fontSize(7.5).font('Helvetica-Bold');
      doc.text('GSTIN: 20BILPA8494E1ZE', 40, 26, { align: 'right', width: 510 });
      doc.text('ISO:9001:2015', 40, 36, { align: 'right', width: 510 });

      // Logo
      if (logoBuffer) {
        doc.image(logoBuffer, 35, 28, { width: 50, height: 50 });
      }

      // Company details
      doc.fontSize(18).font('Helvetica-Bold').fillColor(primaryColor);
      doc.text('M/s Global Safety Solution', 95, 34);
      doc.fontSize(7).font('Helvetica').fillColor('#334155');
      doc.text('Shop No. 51, 2nd Floor, AC Market, Gel Church Complex, Main Road, Ranchi-834001 (Jharkhand)', 95, 54);
      doc.text('Phone: 6201186550   Email: id-globalsafety56@gmail.com', 95, 64);

      // Gold accent divider line
      doc.moveTo(35, 85).lineTo(560, 85).lineWidth(1.5).stroke(goldColor);

      // Quotation Title Banner
      doc.rect(35, 95, 525, 25).fill(primaryColor);
      doc.fillColor('#ffffff').fontSize(11).font('Helvetica-Bold').text('QUOTATION PROPOSAL', 35, 103, { align: 'center', width: 525 });

      // Metadata Layout (Side-by-side Columns)
      const clientName = quotation.client?.name || quotation.lead?.company_name || 'N/A';
      const contactPerson = quotation.client?.contact_person || quotation.lead?.contact_person || 'N/A';
      const email = quotation.client?.email || quotation.lead?.email || 'N/A';
      const phone = quotation.client?.phone || quotation.lead?.phone || 'N/A';
      const address = quotation.billing_address || quotation.client?.billing_address || 'N/A';

      const metadataY = 135;
      
      // Left Column: Quotation Details
      doc.fontSize(9.5).font('Helvetica-Bold').fillColor(primaryColor).text('Quotation Details:', 40, metadataY);
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#334155').text('Quote No:', 40, metadataY + 15);
      doc.font('Helvetica').text(quotation.quote_number, 100, metadataY + 15);
      doc.font('Helvetica-Bold').text('Date:', 40, metadataY + 28);
      doc.font('Helvetica').text(new Date(quotation.date).toLocaleDateString('en-IN'), 100, metadataY + 28);
      let leftEndY = metadataY + 41;
      if (quotation.valid_until) {
        doc.font('Helvetica-Bold').text('Valid Upto:', 40, metadataY + 41);
        doc.font('Helvetica').text(new Date(quotation.valid_until).toLocaleDateString('en-IN'), 100, metadataY + 41);
        leftEndY += 13;
      }

      // Right Column: Client / Lead Details
      doc.fontSize(9.5).font('Helvetica-Bold').fillColor(primaryColor).text('Bill To (Client / Lead):', 300, metadataY);
      doc.fontSize(9).font('Helvetica-Bold').fillColor(goldColor).text(clientName, 300, metadataY + 15);
      doc.fontSize(8.5).font('Helvetica').fillColor('#334155');
      doc.text(`Attn: ${contactPerson}`, 300, metadataY + 28);
      doc.text(`Email: ${email}`, 300, metadataY + 40);
      doc.text(`Phone: ${phone}`, 300, metadataY + 52);
      doc.text(`Address: ${address}`, 300, metadataY + 64, { width: 250 });
      const addressHeight = doc.heightOfString(`Address: ${address}`, { width: 250 });
      const rightEndY = metadataY + 64 + addressHeight;

      const tableStartY = Math.max(leftEndY, rightEndY) + 25;

      // Table Draw Header Helper
      const drawTableHeader = (y: number) => {
        doc.rect(40, y, 515, 22).fill(primaryColor);
        doc.fillColor('#ffffff').fontSize(8.5).font('Helvetica-Bold');
        doc.text('S.No', 40, y + 7, { width: 35, align: 'center' });
        doc.text('Description of Safety Audit / Service', 80, y + 7, { width: 230 });
        doc.text('Qty', 315, y + 7, { width: 35, align: 'center' });
        doc.text('UOM', 350, y + 7, { width: 40, align: 'center' });
        doc.text('Unit Price (INR)', 390, y + 7, { width: 80, align: 'right' });
        doc.text('Total (INR)', 470, y + 7, { width: 75, align: 'right' });
      };

      // Table items loop
      let currentY = tableStartY;
      const maxY = 740; // Safe height boundary before adding a new page

      drawTableHeader(currentY);
      currentY += 22;

      const items = quotation.items || [];
      items.forEach((item: any, idx: number) => {
        doc.font('Helvetica').fontSize(8.5);
        const descHeight = doc.heightOfString(item.description || '', { width: 230 });
        const rowHeight = Math.max(22, descHeight + 10);

        // Page break if row goes beyond boundary
        if (currentY + rowHeight > maxY) {
          doc.addPage();
          currentY = 50;
          drawTableHeader(currentY);
          currentY += 22;
        }

        // Zebra striping
        if (idx % 2 === 1) {
          doc.rect(40, currentY, 515, rowHeight).fill(lightGrey);
        }

        doc.fillColor('#000000');
        doc.text(String(idx + 1), 40, currentY + 7, { width: 35, align: 'center' });
        doc.text(item.description || '', 80, currentY + 7, { width: 230 });
        doc.text(String(item.quantity || 1), 315, currentY + 7, { width: 35, align: 'center' });
        doc.text(item.uom || 'Nos', 350, currentY + 7, { width: 40, align: 'center' });
        doc.text(Number(item.unit_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }), 390, currentY + 7, { width: 80, align: 'right' });
        doc.text(Number(item.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }), 470, currentY + 7, { width: 75, align: 'right' });

        // Draw light grey row border
        doc.moveTo(40, currentY + rowHeight).lineTo(555, currentY + rowHeight).lineWidth(0.5).stroke(borderGrey);
        currentY += rowHeight;
      });

      // Summary block calculations
      const subtotal = Number(quotation.subtotal || 0);
      const discount = Number(quotation.discount || 0);
      const cgst = Number(quotation.cgst || 0);
      const sgst = Number(quotation.sgst || 0);
      const igst = Number(quotation.igst || 0);
      const totalAmount = Number(quotation.total_amount || 0);

      let summaryLines = 2; // Subtotal and Grand Total
      if (discount > 0) summaryLines++;
      if (cgst > 0) summaryLines++;
      if (sgst > 0) summaryLines++;
      if (igst > 0) summaryLines++;

      const summaryBlockHeight = (summaryLines * 16) + 10;

      if (currentY + summaryBlockHeight > maxY) {
        doc.addPage();
        currentY = 50;
      }

      let currentSummaryY = currentY + 10;
      doc.fontSize(8.5);

      // Subtotal line
      doc.font('Helvetica-Bold').fillColor(primaryColor).text('Subtotal:', 370, currentSummaryY, { width: 100, align: 'right' });
      doc.font('Helvetica').text(`INR ${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 480, currentSummaryY, { width: 75, align: 'right' });
      currentSummaryY += 16;

      // Discount line
      if (discount > 0) {
        doc.font('Helvetica-Bold').text('Discount:', 370, currentSummaryY, { width: 100, align: 'right' });
        doc.font('Helvetica').text(`- INR ${discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 480, currentSummaryY, { width: 75, align: 'right' });
        currentSummaryY += 16;
      }

      // CGST line
      if (cgst > 0) {
        doc.font('Helvetica-Bold').text('CGST:', 370, currentSummaryY, { width: 100, align: 'right' });
        doc.font('Helvetica').text(`INR ${cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 480, currentSummaryY, { width: 75, align: 'right' });
        currentSummaryY += 16;
      }

      // SGST line
      if (sgst > 0) {
        doc.font('Helvetica-Bold').text('SGST:', 370, currentSummaryY, { width: 100, align: 'right' });
        doc.font('Helvetica').text(`INR ${sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 480, currentSummaryY, { width: 75, align: 'right' });
        currentSummaryY += 16;
      }

      // IGST line
      if (igst > 0) {
        doc.font('Helvetica-Bold').text('IGST:', 370, currentSummaryY, { width: 100, align: 'right' });
        doc.font('Helvetica').text(`INR ${igst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 480, currentSummaryY, { width: 75, align: 'right' });
        currentSummaryY += 16;
      }

      // Grand Total line
      doc.font('Helvetica-Bold').fillColor(goldColor).fontSize(10).text('Grand Total:', 370, currentSummaryY, { width: 100, align: 'right' });
      doc.font('Helvetica-Bold').fillColor(primaryColor).fontSize(10).text(`INR ${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 480, currentSummaryY, { width: 75, align: 'right' });
      currentSummaryY += 22;

      currentY = currentSummaryY;

      // Special Notes / Terms & Conditions and Signature block
      const notesHeight = quotation.notes ? doc.heightOfString(quotation.notes, { width: 280 }) + 30 : 0;
      const sigHeight = 120;
      const blockSpaceNeeded = Math.max(notesHeight, sigHeight);

      if (currentY + blockSpaceNeeded > maxY) {
        doc.addPage();
        currentY = 50;
      }

      const sigY = currentY + 15;

      // Draw left side: Terms & Conditions and Thank You
      if (quotation.notes) {
        doc.font('Helvetica-Bold').fontSize(9).fillColor(primaryColor).text('Terms & Special Notes:', 40, sigY);
        doc.font('Helvetica').fontSize(7.5).fillColor('#334155').text(quotation.notes, 40, sigY + 15, { width: 280 });
      }
      
      const thankYouY = Math.max(sigY + notesHeight - 10, sigY + 85);
      doc.font('Helvetica-Oblique').fontSize(9.5).fillColor(goldColor).text('Thank you for your business!', 40, thankYouY);

      // Draw right side: Signatures & Stamp
      const repName = quotation.authorized_rep_name || 'Er. Rahul Sharma';
      const repDesg = quotation.authorized_rep_designation || 'Competent Person (Chief Inspector)';
      
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(primaryColor).text('For M/s Global Safety Solution:', 360, sigY);
      
      if (stampSigBuffer) {
        doc.image(stampSigBuffer, 360, sigY + 15, { width: 140, height: 60 });
      }

      doc.font('Helvetica-Bold').fillColor(goldColor).fontSize(8.5).text(repName, 360, sigY + 80, { width: 190 });
      doc.font('Helvetica').fontSize(7.5).fillColor('#64748b').text(repDesg, 360, sigY + 90, { width: 190 });
      doc.text('Global Safety Solution', 360, sigY + 100, { width: 190 });

      // Add page numbers and borders dynamically to all pages
      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(i);
        
        // Outer border
        doc.rect(20, 20, 555, 802).lineWidth(0.5).stroke(primaryColor);
        
        // Footer text
        doc.fillColor('#64748b').fontSize(7.5).font('Helvetica');
        doc.text(
          `Page ${i + 1} of ${range.count}   |   Global Safety Solution   |   Phone: 6201186550   Email: id-globalsafety56@gmail.com`,
          40,
          808,
          { align: 'center', width: 515 }
        );
      }

      // Finish PDF doc
      doc.end();
    });
  }
}
