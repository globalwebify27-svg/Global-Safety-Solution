import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateInspectionDto,
  UpdateInspectionDto,
  UpdateInspectionItemDto,
} from './dto/create-inspection.dto';
import { MailService } from '../common/mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class InspectionsService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
    private notificationsService: NotificationsService,
  ) {}

  async create(data: CreateInspectionDto) {
    const { items, ...inspectionData } = data;
    return this.prisma.inspection.create({
      data: {
        ...inspectionData,
        scheduled_date: new Date(inspectionData.scheduled_date),
        items: {
          create: items || [],
        },
      },
      include: { items: true, client: true, engineer: true, work_order: true },
    });
  }

  async findAll() {
    return this.prisma.inspection.findMany({
      include: {
        client: true,
        engineer: true,
        project: true,
        work_order: true,
        items: true,
      },
      orderBy: { scheduled_date: 'desc' },
    });
  }

  async findOne(id: string) {
    const inspection = await this.prisma.inspection.findUnique({
      where: { id },
      include: {
        client: true,
        engineer: true,
        project: true,
        work_order: {
          include: {
            service_product: true,
          },
        },
        items: true,
      },
    });
    if (!inspection) throw new NotFoundException('Inspection not found');
    return inspection;
  }

  async update(id: string, data: UpdateInspectionDto) {
    const completed_date = data.completed_date ? new Date(data.completed_date) : undefined;
    const inspection = await this.prisma.inspection.update({
      where: { id },
      data: {
        ...data,
        ...(completed_date ? { completed_date } : {}),
      },
      include: { items: true, client: true, engineer: true, work_order: true },
    });

    // If completed, trigger email and notification
    if (data.status === 'COMPLETED') {
      // Create Certificate entry if it doesn't exist
      const existingCert = await this.prisma.certificate.findUnique({
        where: { inspection_id: id },
      });

      if (!existingCert) {
        // Generate a certificate number (e.g., GSS-YEAR-RANDOM)
        const certNo = `GSS-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

        await this.prisma.certificate.create({
          data: {
            inspection_id: id,
            certificate_no: certNo,
            issue_date: new Date(),
            expiry_date: new Date(
              new Date().setFullYear(new Date().getFullYear() + 1),
            ), // Default 1y
            validity_period: '1y',
            status: 'ACTIVE',
          },
        });
      }

      const pdfBuffer = await this.generateCertificate(id);

      // Notify Admin
      await this.notificationsService.notifyAdmins(
        'Inspection Completed',
        `Engineer ${inspection.engineer?.name || 'Authorized Personnel'} completed inspection for ${inspection.client.name}.`,
        'SUCCESS',
        `/dashboard/inspections`,
      );

      // Email Client (if email exists)
      if (inspection.client.email) {
        await this.mailService.sendCertificate(
          inspection.client.email,
          inspection.client.name,
          inspection.id,
          pdfBuffer,
        );
      }
    }

    return inspection;
  }

  async updateItem(itemId: string, data: UpdateInspectionItemDto) {
    return this.prisma.inspectionItem.update({
      where: { id: itemId },
      data,
    });
  }

  async findByEngineer(engineerId: string) {
    return this.prisma.inspection.findMany({
      where: { engineer_id: engineerId },
      include: {
        client: true,
        project: true,
        work_order: {
          include: {
            service_product: {
              include: {
                checklist: true,
              },
            },
          },
        },
        items: true,
      },
      orderBy: { scheduled_date: 'asc' },
    });
  }

  async scheduleWorkOrder(
    workOrderId: string,
    engineerId: string,
    scheduledDate: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Get Work Order and its Service Checklist
      const workOrder = await tx.workOrder.findUnique({
        where: { id: workOrderId },
        include: {
          project: true,
          service_product: {
            include: {
              checklist: true,
            },
          },
        },
      });

      if (!workOrder) throw new NotFoundException('Work Order not found');

      // 2. Update Work Order status and assignment
      await tx.workOrder.update({
        where: { id: workOrderId },
        data: {
          status: 'SCHEDULED',
          scheduled_date: new Date(scheduledDate),
        },
      });

      // 3. Create Inspection
      const inspection = await tx.inspection.create({
        data: {
          client_id: workOrder.project.client_id,
          project_id: workOrder.project_id,
          engineer_id: engineerId,
          work_order_id: workOrderId,
          scheduled_date: new Date(scheduledDate),
          status: 'SCHEDULED',
          // 4. Initialize Checklist Items from Service Product
          items: {
            create: workOrder.service_product?.checklist.map((ci) => ({
              description: ci.question,
              status: 'PENDING',
            })) || [
              { description: 'General Visual Inspection', status: 'PENDING' },
              { description: 'Compliance Verification', status: 'PENDING' },
            ],
          },
        },
        include: { items: true },
      });

      // 5. Notify Engineer
      await this.notificationsService.notifyUser(
        engineerId,
        'New Inspection Assigned',
        `You have been assigned to ${workOrder.service_product?.name || 'Inspection'} for ${workOrder.work_order_no}.`,
        'INFO',
        `/dashboard/field-tasks`,
      );

      return inspection;
    });
  }

  async remove(id: string) {
    return this.prisma.inspection.delete({ where: { id } });
  }

  async generateCertificate(id: string): Promise<Buffer> {
    const inspection = await this.prisma.inspection.findUnique({
      where: { id },
      include: {
        client: true,
        engineer: true,
        certificate: true,
        items: true,
        work_order: { include: { service_product: true } },
      },
    });

    if (!inspection) return Buffer.alloc(0);

    const PDFDocument = require('pdfkit');

    return new Promise((resolve) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      // --- Colors ---
      const primaryColor = '#0f172a';
      const secondaryColor = '#b8860b'; // Dark Gold
      const lightBg = '#f8fafc';
      const borderColor = '#e2e8f0';

      // --- Background & Border ---
      doc.rect(15, 15, 565, 812).lineWidth(2).stroke(secondaryColor); // Gold Outer Border
      doc.rect(25, 25, 545, 792).lineWidth(0.5).stroke(primaryColor); // Black Inner Border

      // Header Section
      doc.rect(25, 25, 545, 120).fill(primaryColor);
      doc
        .fillColor('#ffffff')
        .fontSize(26)
        .font('Helvetica-Bold')
        .text('SAFETY COMPLIANCE CERTIFICATE', 25, 60, { align: 'center' });
      doc
        .fontSize(12)
        .font('Helvetica')
        .text('Global Safety Solution - Enterprise Grade Safety Standards', {
          align: 'center',
        });

      // Certificate Number Badge
      if (inspection.certificate) {
        doc.rect(400, 160, 150, 30).fill(secondaryColor);
        doc
          .fillColor('#ffffff')
          .fontSize(10)
          .font('Helvetica-Bold')
          .text(`CERT NO: ${inspection.certificate.certificate_no}`, 405, 172, {
            width: 140,
            align: 'center',
          });
      }

      // --- Certificate Body ---
      doc.moveDown(5);
      doc
        .fillColor(primaryColor)
        .fontSize(14)
        .font('Helvetica')
        .text(
          'This is to certify that a comprehensive safety inspection was conducted for:',
          { align: 'center' },
        );
      doc.moveDown(1);

      // Client Info Box
      doc.rect(50, 240, 495, 80).fill(lightBg).stroke(borderColor);
      doc
        .fillColor(primaryColor)
        .fontSize(20)
        .font('Helvetica-Bold')
        .text(inspection.client?.name || 'N/A', 50, 260, { align: 'center' });
      doc
        .fontSize(11)
        .font('Helvetica')
        .fillColor('#64748b')
        .text('Client Organization', { align: 'center' });

      doc.moveDown(4);

      // Service Details
      const serviceName =
        inspection.work_order?.service_product?.name || 'Safety Audit';
      doc
        .fillColor(primaryColor)
        .fontSize(16)
        .font('Helvetica-Bold')
        .text(`Scope: ${serviceName}`, { align: 'center' });
      doc.moveDown(2);

      // Details Grid
      const gridY = 380;
      
      // Row 1: Inspection ID & Assigned Engineer
      doc.fontSize(10).font('Helvetica-Bold').text('Inspection ID:', 80, gridY);
      doc
        .font('Helvetica')
        .text(inspection.id.substring(0, 8).toUpperCase(), 170, gridY);

      doc.font('Helvetica-Bold').text('Assigned Engineer:', 320, gridY);
      doc
        .font('Helvetica')
        .text(inspection.engineer?.name || 'Authorized Personnel', 430, gridY);

      // Row 2: Scheduled Date & Conducted On
      const row2Y = gridY + 22;
      doc.font('Helvetica-Bold').text('Scheduled Date:', 80, row2Y);
      doc
        .font('Helvetica')
        .text(new Date(inspection.scheduled_date).toLocaleDateString(), 170, row2Y);

      doc.font('Helvetica-Bold').text('Conducted On:', 320, row2Y);
      doc
        .font('Helvetica')
        .text(
          new Date(inspection.completed_date || inspection.certificate?.issue_date || new Date()).toLocaleDateString(),
          430,
          row2Y,
        );

      // Row 3: Validity & Expiry Date
      const row3Y = row2Y + 22;
      doc.font('Helvetica-Bold').text('Validity:', 80, row3Y);
      doc
        .font('Helvetica')
        .text(
          inspection.certificate?.validity_period === '1y'
            ? '1 Year'
            : inspection.certificate?.validity_period === '3y'
              ? '3 Years'
              : 'One-Time',
          170,
          row3Y,
        );

      doc.font('Helvetica-Bold').text('Expiry Date:', 320, row3Y);
      doc
        .font('Helvetica')
        .fillColor(secondaryColor)
        .text(
          inspection.certificate?.expiry_date
            ? new Date(inspection.certificate.expiry_date).toLocaleDateString()
            : 'N/A',
          430,
          row3Y,
        );

      // Restore color and set doc.y
      doc.fillColor(primaryColor);
      doc.y = row3Y + 30;

      // --- Inspection Results ---
      doc
        .fillColor(primaryColor)
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('Inspection Summary', 80, doc.y);
      doc.moveDown(0.5);
      doc.rect(80, doc.y, 435, 1.5).fill(primaryColor);
      doc.moveDown(1);

      inspection.items.slice(0, 8).forEach((item: any, index: number) => {
        const itemY = doc.y;
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .text(`${index + 1}. ${item.description}`, 80, itemY);
        const statusColor =
          item.status === 'PASS'
            ? '#059669'
            : item.status === 'FAIL'
              ? '#dc2626'
              : '#64748b';
        doc
          .fillColor(statusColor)
          .text(item.status, 450, itemY, { align: 'right', width: 50 });
        doc.fillColor(primaryColor);
        doc.moveDown(0.8);
      });

      // --- Footer ---
      const footerY = 700;
      doc.rect(80, footerY, 435, 0.5).stroke(borderColor);
      doc
        .fontSize(9)
        .fillColor('#64748b')
        .text(
          'This certificate is generated digitally and verified via Global Safety Solution Enterprise Systems.',
          80,
          footerY + 10,
          { align: 'center', width: 435 },
        );

      // Signatures
      doc
        .fillColor(primaryColor)
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Authorized Signatory', 380, 780, {
          width: 150,
          align: 'center',
        });
      doc.rect(380, 775, 150, 1).stroke(primaryColor);

      doc.end();
    });
  }
}
