import { Injectable, OnModuleInit, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WhatsAppTemplatesService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedDefaultTemplates();
  }

  async seedDefaultTemplates() {
    const defaults = [
      {
        name: 'Certificate Expiration Warning',
        code: 'CERTIFICATE_EXPIRING',
        template_name: 'certificate_expiry_notification',
        variables_map: JSON.stringify({
          company_name: 'company_name',
          certificate_name: 'certificate_name',
          certificate_number: 'certificate_number',
          expiry_date: 'expiry_date',
          days_remaining: 'days_remaining',
          contact_name: 'contact_name',
          contact_phone: 'contact_phone',
        }),
      },
      {
        name: 'Manual Safety Alert',
        code: 'MANUAL_ALERT',
        template_name: 'certificate_expiry_notification',
        variables_map: JSON.stringify({
          company_name: 'company_name',
          certificate_name: 'certificate_name',
          certificate_number: 'certificate_number',
          expiry_date: 'expiry_date',
          days_remaining: 'days_remaining',
          contact_name: 'contact_name',
          contact_phone: 'contact_phone',
        }),
      },
    ];

    for (const item of defaults) {
      const existing = await this.prisma.whatsAppTemplate.findFirst({
        where: { code: item.code },
      });
      if (!existing) {
        await this.prisma.whatsAppTemplate.create({
          data: item,
        });
      }
    }
  }

  async create(data: {
    name: string;
    code: string;
    template_name: string;
    variables_map: string;
    is_active?: boolean;
  }) {
    return this.prisma.whatsAppTemplate.create({
      data: {
        name: data.name,
        code: data.code.toUpperCase(),
        template_name: data.template_name,
        variables_map: data.variables_map,
        is_active: data.is_active !== undefined ? data.is_active : true,
      },
    });
  }

  async findAll() {
    return this.prisma.whatsAppTemplate.findMany({
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string) {
    const template = await this.prisma.whatsAppTemplate.findUnique({
      where: { id },
    });
    if (!template) throw new NotFoundException('WhatsApp Template not found.');
    return template;
  }

  async update(
    id: string,
    data: {
      name?: string;
      code?: string;
      template_name?: string;
      variables_map?: string;
      is_active?: boolean;
    },
  ) {
    const template = await this.findOne(id);
    return this.prisma.whatsAppTemplate.update({
      where: { id: template.id },
      data: {
        name: data.name,
        code: data.code ? data.code.toUpperCase() : undefined,
        template_name: data.template_name,
        variables_map: data.variables_map,
        is_active: data.is_active,
      },
    });
  }

  async remove(id: string) {
    const template = await this.findOne(id);
    return this.prisma.whatsAppTemplate.delete({
      where: { id: template.id },
    });
  }

  async resolveMappedVariables(code: string, context: Record<string, any>): Promise<{ templateName: string; variables: Record<string, any> }> {
    const template = await this.prisma.whatsAppTemplate.findUnique({
      where: { code },
    });
    if (!template || !template.is_active) {
      return {
        templateName: code.toLowerCase(),
        variables: context,
      };
    }

    let map: Record<string, string> = {};
    try {
      map = JSON.parse(template.variables_map);
    } catch {
      map = {};
    }

    const resolvedContext: Record<string, any> = {};
    for (const [providerKey, systemKey] of Object.entries(map)) {
      resolvedContext[providerKey] = context[systemKey] !== undefined ? context[systemKey] : (context[providerKey] || '');
    }

    return {
      templateName: template.template_name,
      variables: resolvedContext,
    };
  }
}
