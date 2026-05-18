import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../common/mail/mail.service';

@Injectable()
export class LeadsService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  async findAll() {
    return this.prisma.lead.findMany({
      include: { quotations: true },
      orderBy: { created_at: 'desc' },
    });
  }

  async create(data: any) {
    const next_follow_up = data.next_follow_up ? new Date(data.next_follow_up) : null;
    return this.prisma.lead.create({
      data: {
        ...data,
        next_follow_up,
      },
    });
  }

  async update(id: string, data: any) {
    let next_follow_up = undefined;
    if (data.next_follow_up !== undefined) {
      next_follow_up = data.next_follow_up ? new Date(data.next_follow_up) : null;
    }
    return this.prisma.lead.update({
      where: { id },
      data: {
        ...data,
        ...(next_follow_up !== undefined ? { next_follow_up } : {}),
      },
    });
  }

  async findOne(id: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: { quotations: true },
    });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async convertToClient(id: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Fetch lead inside transaction
        const lead = await tx.lead.findUnique({
          where: { id },
        });

        if (!lead) throw new NotFoundException('Lead not found');

        // Use type casting to bypass temporary IDE stale type issues if necessary
        const leadData = lead as any;

        // 1. Prevent double conversion
        if (leadData.client_id) {
          throw new BadRequestException(
            'Lead has already been converted to a client',
          );
        }

        // 2. Create the Client record
        const client = await tx.client.create({
          data: {
            name: lead.company_name,
            email: lead.email,
            phone: lead.phone,
            industry: lead.source || 'General',
            is_active: true,
          },
        });

        const createdClientId = client.id;

        // 3. Create a primary contact for the client
        await tx.clientContact.create({
          data: {
            client_id: createdClientId,
            name: lead.contact_person,
            email: lead.email,
            phone: lead.phone,
            is_primary: true,
          },
        });

        // 4. Update the Lead with the new client_id and mark as WON
        return await tx.lead.update({
          where: { id },
          data: {
            client_id: createdClientId,
            status: 'WON',
          },
        });
      });
    } catch (error: any) {
      console.error('[LEAD CONVERSION ERROR]:', error);
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Conversion failed: ${error.message || 'Internal error'}`,
      );
    }
  }

  async sendEmail(id: string, subject: string, message: string) {
    const lead = await this.findOne(id);
    if (!lead.email) {
      throw new BadRequestException('Lead does not have a registered email address');
    }
    await this.mailService.sendMail(lead.email, subject, message);
    return { success: true, message: 'Email dispatched successfully' };
  }
}
