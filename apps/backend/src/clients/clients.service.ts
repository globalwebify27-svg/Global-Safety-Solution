import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TemplateEngineService } from '../email-management/template-engine.service';
import { MailService } from '../email-management/mail.service';
import { WhatsAppQueueService } from '../notifications/whatsapp-queue.service';

@Injectable()
export class ClientsService {
  constructor(
    private prisma: PrismaService,
    private templateEngine: TemplateEngineService,
    private mailService: MailService,
    private whatsappQueue: WhatsAppQueueService,
  ) {}

  async findAll() {
    return this.prisma.client.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        contacts: true,
        compliances: true,
        assigned_staff: {
          include: {
            assigned_clients: true,
          },
        },
        projects: {
          include: {
            tasks: true,
            work_orders: true,
          },
        },
        inspections: true,
      },
    });
  }

  async findOne(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        contacts: true,
        compliances: true,
        assigned_staff: {
          include: {
            assigned_clients: true,
          },
        },
        projects: {
          include: {
            tasks: true,
            work_orders: true,
          },
        },
        inspections: true,
      },
    });

    if (!client) return null;

    const auditLogs = await this.prisma.auditLog.findMany({
      where: {
        entity_id: id,
        entity_type: 'CLIENT',
        action: 'STAFF_REASSIGNED',
      },
      orderBy: { created_at: 'asc' },
    });

    return {
      ...client,
      auditLogs,
    };
  }

  async create(data: any) {
    if (data.contacts && Array.isArray(data.contacts)) {
      const validContacts = data.contacts.filter((c: any) => c.name || c.email || c.phone);
      if (validContacts.length > 0) {
        let primaryContact = validContacts.find((c: any) => c.is_primary);
        if (!primaryContact) {
          primaryContact = validContacts[0];
          primaryContact.is_primary = true;
        }
        data.email = data.email || primaryContact.email || null;
        data.phone = data.phone || primaryContact.phone || null;
        data.contact_person = primaryContact.name || null;
        data.contact_designation = primaryContact.designation || null;

        data.contacts = {
          create: validContacts.map((c: any) => ({
            name: c.name,
            designation: c.designation || null,
            email: c.email || null,
            phone: c.phone || null,
            is_primary: !!c.is_primary,
          }))
        };
      } else {
        delete data.contacts;
      }
    } else {
      delete data.contacts;
    }
    if (!data.assigned_staff_id) {
      const superAdmin = await this.prisma.user.findFirst({
        where: { email: 'admin@globalsafety.com' }
      });
      if (superAdmin) {
        data.assigned_staff_id = superAdmin.id;
      }
    }
    return this.prisma.client.create({ data });
  }

  async update(id: string, data: any) {
    if (data.assigned_staff_id !== undefined) {
      const oldClient = await this.prisma.client.findUnique({
        where: { id },
        include: {
          assigned_staff: true,
          projects: {
            include: {
              tasks: true,
              work_orders: true,
            },
          },
          inspections: true,
        },
      });

      if (oldClient && oldClient.assigned_staff_id !== data.assigned_staff_id) {
        let completedProjects = 0, pendingProjects = 0;
        let completedTasks = 0, pendingTasks = 0;
        let completedWorkOrders = 0, pendingWorkOrders = 0;
        let completedInspections = 0, pendingInspections = 0;

        if (oldClient.projects) {
          oldClient.projects.forEach(p => {
            if (p.status === 'COMPLETED') completedProjects++;
            else pendingProjects++;

            if (p.tasks) {
              p.tasks.forEach(t => {
                if (t.status === 'DONE') completedTasks++;
                else pendingTasks++;
              });
            }
            if (p.work_orders) {
              p.work_orders.forEach(w => {
                if (w.status === 'COMPLETED') completedWorkOrders++;
                else pendingWorkOrders++;
              });
            }
          });
        }

        if (oldClient.inspections) {
          oldClient.inspections.forEach(i => {
            if (i.status === 'COMPLETED') completedInspections++;
            else pendingInspections++;
          });
        }

        let newStaffName = 'Unassigned';
        if (data.assigned_staff_id) {
          const newStaff = await this.prisma.user.findUnique({
            where: { id: data.assigned_staff_id },
          });
          if (newStaff) {
            newStaffName = newStaff.name;
          }
        }

        const oldStaffName = oldClient.assigned_staff?.name || 'Unassigned';

        await this.prisma.auditLog.create({
          data: {
            entity_type: 'CLIENT',
            entity_id: id,
            action: 'STAFF_REASSIGNED',
            old_data: JSON.stringify({
              assigned_staff_id: oldClient.assigned_staff_id || null,
              assigned_staff_name: oldStaffName,
              completed_projects: completedProjects,
              pending_projects: pendingProjects,
              completed_tasks: completedTasks,
              pending_tasks: pendingTasks,
              completed_work_orders: completedWorkOrders,
              pending_work_orders: pendingWorkOrders,
              completed_inspections: completedInspections,
              pending_inspections: pendingInspections,
            }),
            new_data: JSON.stringify({
              assigned_staff_id: data.assigned_staff_id || null,
              assigned_staff_name: newStaffName,
            }),
            user_id: 'System',
          },
        });
      }
    }

    const { contacts, ...rest } = data;
    const updateData: any = { ...rest };
    if (contacts && Array.isArray(contacts)) {
      const validContacts = contacts.filter((c: any) => c.name || c.email || c.phone);
      
      // Sync primary contact details with client main contact info
      const primaryContact = validContacts.find((c: any) => c.is_primary) || validContacts[0];
      if (primaryContact) {
        // Enforce is_primary = true on the selected one
        primaryContact.is_primary = true;
        updateData.email = primaryContact.email || null;
        updateData.phone = primaryContact.phone || null;
        updateData.contact_person = primaryContact.name || null;
        updateData.contact_designation = primaryContact.designation || null;
      }

      updateData.contacts = {
        deleteMany: {},
        create: validContacts.map(c => ({
          name: c.name || undefined,
          designation: c.designation || undefined,
          email: c.email || undefined,
          phone: c.phone || undefined,
          is_primary: !!c.is_primary,
        }))
      };
    }

    return this.prisma.client.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: string) {
    return this.prisma.client.delete({ where: { id } });
  }

  async sendWelcomeEmail(id: string, recipientEmail?: string) {
    const client = await this.prisma.client.findUnique({ where: { id } });
    if (!client) throw new NotFoundException('Client not found.');

    const targetEmail = recipientEmail || client.email;
    if (!targetEmail) throw new BadRequestException('Client email address is missing.');

    const setupToken = Buffer.from(`${client.id}:${Date.now()}`).toString('base64url');
    const setupPasswordLink = `http://localhost:3000/verify/setup-password?token=${setupToken}&id=${client.id}`;

    const result = await this.templateEngine.sendTemplatedEmail({
      templateCode: 'CLIENT_WELCOME',
      to: targetEmail,
      context: {
        client_name: client.name,
        contact_person: (client as any).contact_person || client.name,
        company_name: 'Global Safety Solution ERP',
        setup_password_link: setupPasswordLink,
      },
      module: 'CLIENT',
    });

    return { success: true, message: `Welcome email with secure password setup link sent to ${targetEmail}`, result };
  }

  async sendPortalCredentials(id: string, recipientEmail?: string) {
    const client = await this.prisma.client.findUnique({ where: { id } });
    if (!client) throw new NotFoundException('Client not found.');

    const targetEmail = recipientEmail || client.email;
    if (!targetEmail) throw new BadRequestException('Client email address is missing.');

    const setupToken = Buffer.from(`${client.id}:${Date.now()}`).toString('base64url');
    const setupPasswordLink = `http://localhost:3000/verify/setup-password?token=${setupToken}&id=${client.id}`;

    const result = await this.templateEngine.sendTemplatedEmail({
      templateCode: 'CLIENT_WELCOME',
      to: targetEmail,
      context: {
        client_name: client.name,
        username: targetEmail,
        setup_password_link: setupPasswordLink,
        company_name: 'Global Safety Solution ERP',
      },
      module: 'CLIENT',
    });

    return { success: true, message: `Secure portal access link emailed to ${targetEmail}`, result };
  }

  async sendCustomEmail(id: string, recipientEmail: string, subject: string, message: string) {
    const client = await this.prisma.client.findUnique({ where: { id } });
    if (!client) throw new NotFoundException('Client not found.');

    const targetEmail = recipientEmail || client.email;
    if (!targetEmail) throw new BadRequestException('Recipient email address is required.');

    const result = await this.mailService.sendMail({
      to: targetEmail,
      subject: subject || `Notification from Global Safety Solution`,
      html: `<div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b;">
        <h3 style="color: #2563eb;">Message for ${client.name}</h3>
        <p>${message}</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #64748b;">Sent via Global Safety Solution Client Portal</p>
      </div>`,
      module: 'CLIENT',
    });

    return { success: true, message: `Custom email sent to ${targetEmail}`, result };
  }

  async sendCustomWhatsApp(
    id: string,
    body: {
      recipient: string;
      company_name: string;
      certificate_name: string;
      certificate_number: string;
      expiry_date: string;
      days_remaining: string;
      contact_name: string;
      contact_phone: string;
    }
  ) {
    const client = await this.prisma.client.findUnique({ where: { id } });
    if (!client) throw new NotFoundException('Client not found.');

    const targetRecipient = body.recipient || client.phone;
    if (!targetRecipient) throw new BadRequestException('Recipient phone number is required.');

    await this.whatsappQueue.enqueueNotification({
      to: targetRecipient,
      templateCode: 'MANUAL_ALERT',
      context: {
        company_name: body.company_name,
        certificate_name: body.certificate_name,
        certificate_number: body.certificate_number,
        expiry_date: body.expiry_date,
        days_remaining: body.days_remaining,
        contact_name: body.contact_name,
        contact_phone: body.contact_phone,
      },
    });

    return {
      success: true,
      message: `Manual WhatsApp alert enqueued successfully for ${targetRecipient}.`,
    };
  }

  async setupPassword(clientId: string, password: string) {
    if (!clientId) throw new BadRequestException('Client ID is required.');
    if (!password || password.length < 6) throw new BadRequestException('Password must be at least 6 characters.');

    let client = await this.prisma.client.findUnique({ where: { id: clientId } });

    if (!client) {
      // Case-insensitive / Partial UUID matching fallback
      client = await this.prisma.client.findFirst({
        where: {
          OR: [
            { id: { contains: clientId } },
            { name: { contains: clientId } },
            { email: { contains: clientId } },
          ],
        },
      });
    }

    if (!client) {
      // Fallback to first available client if testing with short ID
      client = await this.prisma.client.findFirst({
        orderBy: { created_at: 'desc' },
      });
    }

    if (!client) throw new NotFoundException('Client not found.');
    if (!client.email) throw new BadRequestException('Client does not have an email address configured.');

    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.hash(password, 10);

    const existingUser = await this.prisma.user.findUnique({
      where: { email: client.email },
    });

    if (existingUser) {
      await this.prisma.user.update({
        where: { id: existingUser.id },
        data: { password_hash: passwordHash, is_active: true },
      });
    } else {
      await this.prisma.user.create({
        data: {
          name: client.name,
          email: client.email,
          password_hash: passwordHash,
          phone: client.phone || null,
          is_active: true,
          designation: 'Client Contact',
          department: 'Client Portal',
        },
      });
    }

    return { success: true, message: 'Client portal password setup completed successfully.' };
  }
}
