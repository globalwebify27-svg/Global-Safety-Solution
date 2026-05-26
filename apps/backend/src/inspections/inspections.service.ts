import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateInspectionDto,
  UpdateInspectionDto,
  UpdateInspectionItemDto,
} from './dto/create-inspection.dto';
import { MailService } from '../common/mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import * as path from 'path';
import * as fs from 'fs';

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
    const { admin_feedback, draft_cert_type, draft_cert_data, ...rest } = data;
    const completed_date = rest.completed_date
      ? new Date(rest.completed_date)
      : undefined;
    const scheduled_date = rest.scheduled_date
      ? new Date(rest.scheduled_date)
      : undefined;

    // Handle JSON remarks updates safely
    let updatedRemarks = rest.remarks;
    if (admin_feedback !== undefined || draft_cert_type !== undefined || draft_cert_data !== undefined) {
      const current = await this.prisma.inspection.findUnique({ where: { id } });
      let currentRemarksJson: any = {};
      if (current?.remarks) {
        if (current.remarks.startsWith('{') && current.remarks.endsWith('}')) {
          try {
            currentRemarksJson = JSON.parse(current.remarks);
          } catch (e) {
            currentRemarksJson = { legacy_text: current.remarks };
          }
        } else if (current.remarks.startsWith('Verification Photos: ')) {
          try {
            const urls = JSON.parse(current.remarks.replace('Verification Photos: ', ''));
            currentRemarksJson = { verification_photos: urls };
          } catch (e) {
            currentRemarksJson = { legacy_text: current.remarks };
          }
        } else {
          currentRemarksJson = { legacy_text: current.remarks };
        }
      }

      if (admin_feedback !== undefined) currentRemarksJson.admin_feedback = admin_feedback;
      if (draft_cert_type !== undefined) currentRemarksJson.draft_cert_type = draft_cert_type;
      if (draft_cert_data !== undefined) currentRemarksJson.draft_cert_data = draft_cert_data;
      if (rest.remarks !== undefined) {
        if (rest.remarks.startsWith('Verification Photos: ')) {
          try {
            const urls = JSON.parse(rest.remarks.replace('Verification Photos: ', ''));
            currentRemarksJson.verification_photos = urls;
          } catch (e) {
            currentRemarksJson.legacy_text = rest.remarks;
          }
        } else {
          currentRemarksJson.legacy_text = rest.remarks;
        }
      }

      updatedRemarks = JSON.stringify(currentRemarksJson);
    }

    // If status is changed away from COMPLETED, clean up existing certificate & compliance
    if (rest.status && rest.status !== 'COMPLETED') {
      const cert = await this.prisma.certificate.findUnique({
        where: { inspection_id: id }
      });
      if (cert) {
        await this.prisma.compliance.deleteMany({
          where: { reference_number: cert.certificate_no }
        });
        await this.prisma.certificate.delete({
          where: { id: cert.id }
        });
      }
    }

    const inspection = await this.prisma.inspection.update({
      where: { id },
      data: {
        ...rest,
        ...(updatedRemarks !== undefined ? { remarks: updatedRemarks } : {}),
        ...(completed_date ? { completed_date } : {}),
        ...(scheduled_date ? { scheduled_date } : {}),
      },
      include: {
        items: true,
        client: true,
        engineer: true,
        work_order: {
          include: {
            service_product: true,
          },
        },
      },
    });

    // If completed, trigger email and notification
    if (data.status === 'COMPLETED') {
      // Create Certificate entry if it doesn't exist
      const existingCert = await this.prisma.certificate.findUnique({
        where: { inspection_id: id },
      });

      if (!existingCert) {
        // Parse draft certificate data if available in remarks JSON
        let validityPeriod = '1y';
        let expiryDate = new Date(new Date().setFullYear(new Date().getFullYear() + 1));
        let cycleDays = 365;

        if (inspection.remarks) {
          try {
            const parsedRemarks = JSON.parse(inspection.remarks);
            if (parsedRemarks.draft_cert_data) {
              const dataObj = typeof parsedRemarks.draft_cert_data === 'string'
                ? JSON.parse(parsedRemarks.draft_cert_data)
                : parsedRemarks.draft_cert_data;
              if (dataObj.validity_period) {
                validityPeriod = dataObj.validity_period;
                if (validityPeriod === '3y') {
                  cycleDays = 1095;
                } else if (validityPeriod === 'One-Time') {
                  cycleDays = 9999;
                }
              }
              if (dataObj.expiry_date) {
                const testDate = new Date(dataObj.expiry_date);
                if (!isNaN(testDate.getTime())) {
                  expiryDate = testDate;
                }
              }
            }
          } catch (e) {
            console.error('Error parsing draft cert details in update:', e);
          }
        }

        // Generate a certificate number (e.g., GSS-YEAR-RANDOM)
        const certNo = `GSS-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

        await this.prisma.certificate.create({
          data: {
            inspection_id: id,
            certificate_no: certNo,
            issue_date: new Date(),
            expiry_date: expiryDate,
            validity_period: validityPeriod,
            status: 'ACTIVE',
          },
        });

        // Automatically sync to Compliance Hub Registry for client tracking & 30-day alerts!
        const serviceName =
          inspection.work_order?.service_product?.name || 'Safety Compliance';
        await this.prisma.compliance.create({
          data: {
            client_id: inspection.client_id,
            compliance_type: serviceName,
            reference_number: certNo,
            issue_date: new Date(),
            expiry_date: expiryDate,
            renewal_cycle_days: cycleDays,
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

  async autoUpdateInspectionStatus(inspectionId: string) {
    const inspection = await this.prisma.inspection.findUnique({
      where: { id: inspectionId },
      include: { items: true },
    });

    if (!inspection) return;

    // Don't auto-update if status is CANCELLED
    if (inspection.status === 'CANCELLED') return;

    const items = inspection.items || [];

    // Guard: if there are no items at all, never auto-complete
    if (items.length === 0) return;

    const pendingItems = items.filter(item => item.status === 'PENDING');
    const failItems = items.filter(item => item.status === 'FAIL');
    const resolvedItems = items.filter(
      item => item.status === 'PASS' || item.status === 'FAIL' || item.status === 'NA',
    );

    let newStatus = inspection.status;

    if (pendingItems.length > 0) {
      // There are still unresolved items — must be IN_PROGRESS (or stay as-is if already there)
      if (
        inspection.status === 'COMPLETED' ||
        inspection.status === 'REJECTED' ||
        inspection.status === 'SCHEDULED'
      ) {
        newStatus = 'IN_PROGRESS';
      }
      // If already IN_PROGRESS with pending items, no change needed
    } else if (resolvedItems.length === items.length) {
      // ALL items are explicitly resolved (PASS / FAIL / NA) — no PENDING remaining
      if (failItems.length > 0) {
        newStatus = 'REJECTED';
      } else {
        newStatus = 'COMPLETED';
      }
    }
    // else: mixed edge-case — leave status as-is

    if (newStatus !== inspection.status) {
      await this.update(inspectionId, { status: newStatus as any });
    }
  }

  async updateItem(itemId: string, data: UpdateInspectionItemDto) {
    const updatedItem = await this.prisma.inspectionItem.update({
      where: { id: itemId },
      data,
    });

    // Automatically recalculate and update parent inspection status in real-time
    await this.autoUpdateInspectionStatus(updatedItem.inspection_id);

    return updatedItem;
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

  async approve(id: string) {
    return this.update(id, {
      status: 'COMPLETED' as any,
      completed_date: new Date().toISOString(),
    });
  }

  async reject(id: string, feedback: string) {
    const inspection = await this.update(id, {
      status: 'REJECTED' as any,
      admin_feedback: feedback,
    });

    if (inspection.engineer_id) {
      await this.notificationsService.notifyUser(
        inspection.engineer_id,
        'Inspection Rejected',
        `Your inspection for ${inspection.client.name} has been rejected: ${feedback}`,
        'ERROR',
        `/dashboard/field-tasks`,
      );
    }

    return inspection;
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

    // 1. Download/Generate QR Code image linking to public verification page
    let qrCodeBuffer: Buffer | null = null;
    try {
      const qrUrl = `https://globalsafetysolution.in/verify/certificate/${inspection.certificate?.id || inspection.id}`;
      const response = await fetch(`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrUrl)}`);
      if (response.ok) {
        qrCodeBuffer = Buffer.from(await response.arrayBuffer());
      }
    } catch (err) {
      console.error('Failed to generate QR Code:', err);
    }

    // 2. Parse Remarks for custom certificate type and dynamic parameters
    let draftType = 'STANDARD';
    let draftData: any = {};

    if (inspection.remarks) {
      try {
        const parsedRemarks = JSON.parse(inspection.remarks);
        draftType = parsedRemarks.draft_cert_type || 'STANDARD';
        draftData = parsedRemarks.draft_cert_data || {};
      } catch (e) {
        console.error('Error parsing draft cert details for PDF:', e);
      }
    }

    const PDFDocument = require('pdfkit');

    // Load GSS logo from local assets — try multiple paths for ts-node dev vs compiled dist
    let logoBuffer: Buffer | null = null;
    try {
      const possiblePaths = [
        path.join(__dirname, '..', 'assets', 'gss-logo.png'),           // ts-node: src/inspections/../assets
        path.join(__dirname, 'assets', 'gss-logo.png'),                  // dist: dist/inspections/assets
        path.join(process.cwd(), 'apps/backend/src/assets/gss-logo.png'),// absolute from project root
        path.join(process.cwd(), 'src/assets/gss-logo.png'),             // absolute from backend root
      ];
      for (const logoPath of possiblePaths) {
        if (fs.existsSync(logoPath)) {
          logoBuffer = fs.readFileSync(logoPath);
          console.log('GSS logo loaded from:', logoPath);
          break;
        }
      }
      if (!logoBuffer) console.warn('GSS logo not found in any path:', possiblePaths);
    } catch (err) {
      console.error('Failed to load GSS logo:', err);
    }

    return new Promise((resolve) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      // --- Colors & Branding ---
      const primaryColor = '#0f172a';
      const goldColor = '#b8860b';

      // Draw outer gold border (matches reference)
      doc.rect(15, 15, 565, 812).lineWidth(1.5).stroke(goldColor);
      doc.rect(20, 20, 555, 802).lineWidth(0.5).stroke(primaryColor);

      // -------------------------------------------------------
      // Helper: Draw the professional branded header with logo
      // Matches reference: Logo left | Company name right | GSTIN/ISO top-right
      // -------------------------------------------------------
      const drawEnterpriseHeader = () => {
        // GSTIN & ISO — top right
        doc.fillColor('#000000').fontSize(7.5).font('Helvetica-Bold');
        doc.text('GSTIN: 20BILPA8494E1ZE', 40, 26, { align: 'right', width: 510 });
        doc.text('ISO:9001:2015', 40, 36, { align: 'right', width: 510 });

        // GSS Shield Logo — left side
        if (logoBuffer) {
          doc.image(logoBuffer, 30, 28, { width: 60, height: 60 });
        }

        // Company Name & Address — right of logo
        doc.fontSize(20).font('Helvetica-Bold').fillColor(primaryColor);
        doc.text('M/s Global Safety Solution', 100, 34);
        doc.fontSize(7).font('Helvetica').fillColor('#334155');
        doc.text('\u2609 Shop No. 51, 2nd Floor, AC Market, Gel Church Complex, Main Road, Ranchi-834001 (Jharkhand)', 100, 58);
        doc.text('\u260E 6201186550   \u2709 id-globalsafety56@gmail.com', 100, 68);

        // Divider line
        doc.moveTo(28, 92).lineTo(567, 92).lineWidth(1.2).stroke(primaryColor);
      };

      // -------------------------------------------------------
      // Helper: Factories Act competency footer block
      // -------------------------------------------------------
      const drawCompetencyFooter = (startY: number, competencyNo: string, competentPerson: string) => {
        doc.moveTo(28, startY).lineTo(567, startY).lineWidth(0.5).stroke('#94a3b8');
        startY += 6;
        doc.fontSize(7.5).font('Helvetica-Bold').fillColor(primaryColor);
        doc.text('Global Safety Solution', 160, startY, { align: 'center', width: 280 });
        doc.text('Competent Person under the Factories Act. 1948', 160, startY + 10, { align: 'center', width: 280 });
        doc.text(`Competency No. from Govt. of Bihar \u2013 Memo. No.: ${competencyNo}`, 160, startY + 20, { align: 'center', width: 280 });
      };

      // -------------------------------------------------------
      // Helper: Draw a standard numbered 2-column table row
      // -------------------------------------------------------
      const makeRowDrawer = (yPosRef: { val: number }) => (num: string, label: string, val: string, labelWidth = 220) => {
        const y = yPosRef.val;
        doc.font('Helvetica-Bold').fontSize(8).fillColor(primaryColor).text(`${num}.`, 38, y, { width: 16 });
        doc.font('Helvetica-Bold').text(label, 56, y, { width: labelWidth });
        doc.font('Helvetica').text(`:  ${val || 'N/A'}`, 56 + labelWidth + 4, y, { width: 560 - 56 - labelWidth - 4 });
        yPosRef.val += 24;
        doc.moveTo(28, yPosRef.val - 2).lineTo(567, yPosRef.val - 2).lineWidth(0.3).stroke('#e2e8f0');
      };

      if (draftType === 'FACTORIES_ACT_28_29') {
        // =============================================
        // CERTIFICATE 1: FACTORIES ACT SEC 28/29
        // Chain Pulley Block / Lifting Tackle Test Report
        // =============================================
        drawEnterpriseHeader();
        doc.fillColor(primaryColor);
        doc.fontSize(11).font('Helvetica-Bold').text('TEST REPORT/CERTIFICATE', 30, 105, { align: 'center' });
        doc.fontSize(8).font('Helvetica-Bold').text('(Lifting Tackles, Tools, Chains, Ropes, Cranes, Hoists etc.)', { align: 'center' });
        doc.fontSize(8).font('Helvetica').text('As required under Sub-Clause-III of Sub Sec. -1', { align: 'center' });
        doc.fontSize(9).font('Helvetica-Bold').text('U/S (28/29) OF THE FACTORIES ACT, 1948', { align: 'center' });
        doc.fontSize(10).font('Helvetica-Bold').fillColor(goldColor).text('TESTING REPORT OF CHAIN PULLEY BLOCK', { align: 'center' });
        doc.moveDown(0.5);

        const refNo28 = `GSS/RRL-K/TEST/CPB/${inspection.id.substring(0, 4).toUpperCase()}/${new Date().getFullYear()}`;
        const testDate28 = new Date(inspection.completed_date || new Date()).toLocaleDateString('en-IN');
        const expiryDate28 = draftData.expiry_date ? new Date(draftData.expiry_date).toLocaleDateString('en-IN') : new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toLocaleDateString('en-IN');

        doc.fontSize(8).fillColor(primaryColor);
        doc.font('Helvetica-Bold').text(`REF NO: ${refNo28}`, 40, 160);
        doc.text(`Test Date: ${testDate28}`, 240, 160);
        doc.text(`Valid Upto: ${expiryDate28}`, 430, 160);
        doc.moveTo(35, 172).lineTo(560, 172).lineWidth(0.5).stroke('#cbd5e1');

        const yRef28 = { val: 180 };
        const drawRow28 = makeRowDrawer(yRef28);

        drawRow28('1', 'Name of the occupier of the Factory', draftData.eqpt_occupier_name || inspection.client.name);
        drawRow28('2', 'Address of the Factory', draftData.eqpt_factory_address || inspection.client.city || 'On-site');

        const specText28 = `Name of Eqpt : ${draftData.eqpt_name || 'CHAIN PULLEY BLOCK'}\nCap/S.W.L : ${draftData.eqpt_swl || '2 Ton'},  Lift : ${draftData.eqpt_lift || '4 Mtr'}\nSl/Id No : ${draftData.eqpt_serial_no || 'RRL/CPB/04'},  Mfg: ${draftData.eqpt_mfg || '11/2023'}\nChain dia : ${draftData.eqpt_chain_dia || '6 mm'},  H.Chain dia: ${draftData.eqpt_hchain_dia || '3 mm'}\nMfd by : ${draftData.eqpt_mfd_by || 'N.A'},  Location: ${draftData.eqpt_location || 'Inside the Plant'}`;

        // Render item 3 manually (multi-line)
        const y3 = yRef28.val;
        doc.font('Helvetica-Bold').text('3.', 40, y3, { width: 15 });
        doc.font('Helvetica-Bold').text('Distinguishing marks / chain description to identify the lifting machine, rope or lifting tackle', 60, y3, { width: 230 });
        doc.font('Helvetica').text(specText28, 295, y3, { width: 265 });
        yRef28.val += 80;
        doc.moveTo(35, yRef28.val - 2).lineTo(560, yRef28.val - 2).lineWidth(0.3).stroke('#e2e8f0');

        drawRow28('4', 'Date on which lifting tackle first taken into use in factory', 'N.A');
        drawRow28('5', 'Date & number of certificate relating to any test / last examination', 'Last time tested by us.');
        drawRow28('6', 'Date of each periodical thorough examination by sub-clause (iii) Sec 29', 'Periodically, being examined/tested by technical staff of the company.');
        drawRow28('7', 'Date of annealing or other heat treatment & by whom carried out', testDate28);
        drawRow28('8', 'Particulars of any defects affecting the safe working load', 'No such Defect was observed during thorough examination.');
        drawRow28('9', 'Detail of test performed', 'Thoroughly examined & load test carried out at 125% of SWL,');
        drawRow28('10', 'Result of test', 'Found satisfactory');

        const certY28 = yRef28.val + 12;
        doc.fontSize(8).font('Helvetica-Oblique').fillColor(primaryColor);
        doc.text(`I / we certify that on dt. ${testDate28} thoroughly examined the above mention lifting machine/ chain/ rope/ lifting tackle and that the above is correct report of the result.`, 38, certY28, { width: 516 });
        doc.font('Helvetica-Bold').text(`Next examination date on or before: ${expiryDate28}`, 38, certY28 + 22);
        doc.font('Helvetica').text(`Competency No – ${draftData.competency_no || '663, dated 11.11.2025, valid upto 10.11.2026'}`, 38, certY28 + 34);
        doc.font('Helvetica-Bold').text('Note – The above report is issued subject to daily checking of the above equipment and all its safety devices.', 38, certY28 + 46, { width: 310 });

        // QR Code bottom left
        if (qrCodeBuffer) {
          doc.image(qrCodeBuffer, 38, certY28 + 60, { width: 50, height: 50 });
          doc.fontSize(6).fillColor('#475569').text('SCAN TO VERIFY', 38, certY28 + 112, { align: 'center', width: 50 });
        }

        // Signature block — right side
        doc.moveTo(360, certY28 + 90).lineTo(540, certY28 + 90).lineWidth(0.5).stroke(primaryColor);
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor(primaryColor).text(draftData.competent_person || 'Competent Person', 360, certY28 + 94, { align: 'center', width: 180 });
        doc.fontSize(7.5).text('For Global Safety Solution', 360, certY28 + 106, { align: 'center', width: 180 });

        // Competency footer
        drawCompetencyFooter(certY28 + 130, draftData.competency_no || '663, Dt. – 11/11/2025', draftData.competent_person || 'Competent Person');

      } else if (draftType === 'FORM_34_STABILITY') {
        // =============================================
        // CERTIFICATE 2: FORM NO. 34 STABILITY
        // =============================================
        drawEnterpriseHeader();
        doc.fillColor(primaryColor);
        doc.fontSize(12).font('Helvetica-Bold').text('FORM NO. 34', 30, 105, { align: 'center' });
        doc.fontSize(8).font('Helvetica').text('(See Rule - 3A)', { align: 'center' });
        doc.fontSize(11).font('Helvetica-Bold').fillColor(goldColor).text('FORM OF CERTIFICATE OF STABILITY', { align: 'center' });
        doc.moveDown(0.5);

        const refNo34 = `GSS/ISNPL-M/STAB/${inspection.id.substring(0, 4).toUpperCase()}/${new Date().getFullYear()}`;
        const issueDate34 = new Date(inspection.completed_date || new Date()).toLocaleDateString('en-IN');

        doc.fontSize(8).fillColor(primaryColor);
        doc.font('Helvetica-Bold').text(`REF NO: ${refNo34}`, 40, 150);
        doc.text(`DATE: ${issueDate34}`, 430, 150);
        doc.moveTo(35, 162).lineTo(560, 162).lineWidth(0.5).stroke('#cbd5e1');

        const yRef34 = { val: 175 };
        const drawRow34 = makeRowDrawer(yRef34);

        drawRow34('1', 'Name of the Factory', draftData.stab_factory_name || inspection.client.name);
        drawRow34('2', 'Village, Town and District situated', draftData.stab_location || 'MUZAFFARPUR');
        drawRow34('3', 'Full Postal Address of Factory', draftData.stab_postal_address || inspection.client.city || 'On-site');
        drawRow34('4', 'Name of the Occupier of the Factory', draftData.stab_occupier_name || inspection.client.name);
        drawRow34('5', 'Nature of the manufacturing process', draftData.stab_mfg_process || 'SNACKS & NAMKEENS');
        drawRow34('6', 'Number of floors on which workers employed', draftData.stab_worker_layout_ref || 'As per approved layout (Attached Report)');

        const stabCertY = yRef34.val + 10;
        doc.fontSize(8.5).font('Helvetica').fillColor(primaryColor);
        const certParagraph34 = `I certify that I have inspected the building/buildings the plan of which have been approved by the Chief Inspector of Factories in his letter No. ${draftData.stab_plan_letter_no || '153/P'} Dated ${draftData.stab_plan_letter_date || '09.12.2014'} and examined the various parts including the foundations with special reference to the Machinery, Plant, etc., that have been installed. I am of the opinion that the building/buildings which has/have been constructed/reconstructed/extended/taken into use is/are in accordance with the plans approved by the Chief Inspector in his letter mentioned above, that is/they/are structurally sound and that its/their stability will not be endangered by its/their use as a Factory/part of the Factory for the Manufacturing of ${draftData.stab_mfg_process || 'Machineries'} for which the Machinery, Plant, etc. is intended.`;
        doc.text(certParagraph34, 40, stabCertY, { width: 510, align: 'justify', lineGap: 1.5 });

        const rulesY = stabCertY + 120;
        doc.fontSize(8).font('Helvetica-Bold');
        doc.text('\u25aa  Maintenance work is to be done annually.', 50, rulesY);
        doc.text('\u25aa  Routine maintenance schedule to be attended too.', 50, rulesY + 12);
        doc.text('\u25aa  This stability certificate is valid for 3 Years from the date of issue.', 50, rulesY + 24);

        // Signature label — right side (matches reference)
        doc.font('Helvetica').fontSize(7.5).fillColor('#334155').text('signature', 400, rulesY, { align: 'right', width: 150 });
        doc.font('Helvetica-Bold').fillColor(primaryColor).text('For Global Safety Solution', 360, rulesY + 10, { align: 'right', width: 190 });

        const sigY34 = rulesY + 55;

        // Competent person details — left side (matches reference)
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor(primaryColor);
        doc.text(`(${draftData.competent_person || 'Aqueel Ahmad'})`, 38, sigY34);
        doc.font('Helvetica').fontSize(8).text('Civil Engineer and', 38, sigY34 + 14);
        doc.text('Competent Person', 38, sigY34 + 24);
        doc.text('Shop No. 51, 2nd Floor, AC Market, Gel Church Complex,', 38, sigY34 + 34);
        doc.text('Main Road, Ranchi-834001 (Jharkhand)', 38, sigY34 + 44);
        doc.text(`Govt License Memo No. ${draftData.competency_no || '663'}`, 38, sigY34 + 54);

        // QR code — right side
        if (qrCodeBuffer) {
          doc.image(qrCodeBuffer, 440, sigY34, { width: 55, height: 55 });
          doc.fontSize(6).fillColor('#475569').text('SCAN TO VERIFY', 440, sigY34 + 57, { align: 'center', width: 55 });
        }

        // Competency footer
        drawCompetencyFooter(sigY34 + 82, draftData.competency_no || '663, Dt. – 11/11/2025', draftData.competent_person || 'Aqueel Ahmad');

      } else if (draftType === 'FORM_8_PRESSURE_VESSEL') {
        // =============================================
        // CERTIFICATE 3: FORM NO. 8 - PRESSURE VESSEL
        // Report of Examination of Pressure Vessel
        // =============================================
        drawEnterpriseHeader();
        doc.fillColor(primaryColor);
        doc.fontSize(11).font('Helvetica-Bold').text('FORM NO. 8', 30, 105, { align: 'center' });
        doc.fontSize(7.5).font('Helvetica').text('(Prescribed under Section 31 of Factory Act 1948)', { align: 'center' });
        doc.fontSize(7.5).text('(See Rule-57)', { align: 'center' });
        doc.fontSize(10).font('Helvetica-Bold').fillColor(goldColor).text('Report of Examination of Pressure Vessel', { align: 'center' });
        doc.moveDown(0.3);

        const certNoPV = inspection.certificate?.certificate_no || `GSS/OIL-D/PV/H-TEST/${inspection.id.substring(0, 4).toUpperCase()}/${new Date().getFullYear()}`;
        const issueDatePV = new Date(inspection.completed_date || new Date()).toLocaleDateString('en-IN');
        const expiryDatePV = draftData.expiry_date ? new Date(draftData.expiry_date).toLocaleDateString('en-IN') : new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toLocaleDateString('en-IN');

        doc.fontSize(8).fillColor(primaryColor);
        doc.font('Helvetica-Bold').text(`Certificate No. : ${certNoPV}`, 40, 145);
        doc.text(`Dated: ${issueDatePV}`, 430, 145);
        doc.moveTo(35, 157).lineTo(560, 157).lineWidth(0.5).stroke('#cbd5e1');

        const yRefPV = { val: 165 };
        const drawRowPV = makeRowDrawer(yRefPV);

        drawRowPV('1', 'Name of occupier (or Factory)', draftData.pv_occupier_name || inspection.client.name);
        drawRowPV('2', 'Situation and address of Factory', draftData.pv_factory_address || inspection.client.city || 'On-site');

        const y3pv = yRefPV.val;
        doc.font('Helvetica-Bold').fontSize(8).text('3.', 40, y3pv, { width: 15 });
        doc.font('Helvetica-Bold').text('Name description and distinctive number of Pressure Vessel', 60, y3pv, { width: 220 });
        doc.font('Helvetica-Bold').text(draftData.pv_vessel_desc || 'AIR RECEIVER (VERTICAL)', 295, y3pv, { width: 265 });
        doc.font('Helvetica').text(draftData.pv_vessel_cap_no || 'CAP- 550 Ltr', 295, y3pv + 12, { width: 265 });
        yRefPV.val += 36;
        doc.moveTo(35, yRefPV.val - 2).lineTo(560, yRefPV.val - 2).lineWidth(0.3).stroke('#e2e8f0');

        drawRowPV('4', 'Name and Address of Manufacturer', draftData.pv_manufacturer || 'TALLERES VALSI');
        drawRowPV('5', 'Nature of process in which it is use.', draftData.pv_process || 'For Plant Process.');

        const y6pv = yRefPV.val;
        doc.font('Helvetica-Bold').fontSize(8).text('6.', 40, y6pv, { width: 15 });
        doc.font('Helvetica-Bold').text('Particulars of Vessel: a) Year of Manufacture', 60, y6pv, { width: 220 });
        doc.font('Helvetica').text(draftData.pv_mfg_year || '25/09/2024', 295, y6pv, { width: 265 });
        doc.font('Helvetica-Bold').text('b) Date of commissioning in service', 75, y6pv + 14, { width: 215 });
        doc.font('Helvetica').text(draftData.pv_first_use_date || '2025', 295, y6pv + 14, { width: 265 });
        doc.font('Helvetica-Bold').text('c) Safe working pressure recommended by manufacturer', 75, y6pv + 28, { width: 215 });
        doc.font('Helvetica').text(draftData.pv_safe_pressure || '45 BAR', 295, y6pv + 28, { width: 265 });
        doc.font('Helvetica-Bold').text('d) Thickness of walls - Shell, T.Disc, B.Disc', 75, y6pv + 42, { width: 215 });
        doc.font('Helvetica').text(draftData.pv_wall_thickness || 'Shell- 16.5mm, T.Disc-15.2mm, B.Disc-15.3mm', 295, y6pv + 42, { width: 265 });
        doc.font('Helvetica-Bold').text('e) History: TSV working in order since', 75, y6pv + 60, { width: 215 });
        doc.font('Helvetica').text(draftData.pv_vessel_history || 'As reported, working in order since inspection', 295, y6pv + 60, { width: 265 });
        yRefPV.val += 84;
        doc.moveTo(35, yRefPV.val - 2).lineTo(560, yRefPV.val - 2).lineWidth(0.3).stroke('#e2e8f0');

        drawRowPV('7', 'Date of last Hyd. test and pressure applied', draftData.pv_hyd_test_by_mfg || 'Hydraulic Test done by the manufacturer on N.A');
        drawRowPV('8', 'Is the Pressure Vessel in open or exposed to weather or to damp?', draftData.pv_exposed_weather || 'Under Shed');
        drawRowPV('9', 'What parts [if any were inaccessible]?', draftData.pv_inaccessible_parts || 'Internal Surface');
        drawRowPV('10', 'What examination and were made? [Specify pressure if Hydraulic test]', draftData.pv_exam_details || 'Thorough Physical examination & Ultrasonic test done.');
        drawRowPV('11', 'Are all fittings and appliances properly maintained and in good condition?', draftData.pv_fittings_maintained || 'Yes.');
        drawRowPV('12', 'Repairs [if any required & period within which to be executed]', draftData.pv_repairs_required || 'No major defect affecting the safe working has been observed.');

        const y13pv = yRefPV.val;
        doc.font('Helvetica-Bold').fontSize(8).text('13.', 35, y13pv, { width: 20 });
        doc.font('Helvetica-Bold').text('Where repair affecting the safe pressure are required, state the Set pressure', 60, y13pv, { width: 220 });
        doc.font('Helvetica-Bold').text('a) Before the expiration of the period specified in [15]', 75, y13pv + 14, { width: 215 });
        doc.font('Helvetica').text(draftData.pv_repairs_safe_pressure || 'N.A', 295, y13pv + 14, { width: 265 });
        doc.font('Helvetica-Bold').text('b) After the expiration of such period if repairs not completed', 75, y13pv + 28, { width: 215 });
        doc.font('Helvetica').text('N.A', 295, y13pv + 28, { width: 265 });
        doc.font('Helvetica-Bold').text('c) After completion of the required repairs', 75, y13pv + 42, { width: 215 });
        doc.font('Helvetica').text('N.A', 295, y13pv + 42, { width: 265 });
        yRefPV.val += 64;
        doc.moveTo(35, yRefPV.val - 2).lineTo(560, yRefPV.val - 2).lineWidth(0.3).stroke('#e2e8f0');

        drawRowPV('14', 'Other observations', draftData.pv_other_observations || 'Satisfactory.');

        const pvCertY = yRefPV.val + 6;
        doc.fontSize(7.5).font('Helvetica-Oblique').fillColor(primaryColor);
        doc.text(`I / We certify that on ${issueDatePV} the pressure vessel described above was thoroughly cleaned and (so far its construction permits) made accessible for thorough examination and for such tests as were necessary for thorough examination and that on the said date. I/We thoroughly examined this pressure vessel including its fitting and that the above is true report of my examination.`, 38, pvCertY, { width: 516, align: 'justify' });

        const pvSigY = pvCertY + 45;
        doc.font('Helvetica-Bold').fontSize(8).fillColor(primaryColor).text(`Test Date: ${issueDatePV}`, 38, pvSigY);
        doc.text(`Due Date: ${expiryDatePV}`, 38, pvSigY + 14);
        doc.font('Helvetica').text(`Competency No – ${draftData.competency_no || '663, dated 11.11.2025, valid upto 10.11.2026'}`, 38, pvSigY + 28);

        // QR code — bottom right
        if (qrCodeBuffer) {
          doc.image(qrCodeBuffer, 450, pvSigY, { width: 55, height: 55 });
          doc.fontSize(6).fillColor('#475569').text('SCAN TO VERIFY', 450, pvSigY + 57, { align: 'center', width: 55 });
        }

        // Signature — center
        doc.moveTo(220, pvSigY + 50).lineTo(420, pvSigY + 50).lineWidth(0.5).stroke(primaryColor);
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor(primaryColor).text(draftData.competent_person || 'Competent Person', 220, pvSigY + 54, { align: 'center', width: 200 });
        doc.fontSize(7.5).text('Civil Engineer & Competent Person', 220, pvSigY + 66, { align: 'center', width: 200 });
        doc.fontSize(7).text('For Global Safety Solution', 220, pvSigY + 76, { align: 'center', width: 200 });

        // Competency footer
        drawCompetencyFooter(pvSigY + 96, draftData.competency_no || '663, Dt. – 11/11/2025', draftData.competent_person || 'Competent Person');

      } else if (draftType === 'FORM_8_SAFETY_VALVE') {
        // =============================================
        // CERTIFICATE 4: FORM NO. 8 - THERMAL/PRESSURE SAFETY VALVE
        // =============================================
        drawEnterpriseHeader();
        doc.fillColor(primaryColor);
        doc.fontSize(11).font('Helvetica-Bold').text('FORM NO. 8', 30, 105, { align: 'center' });
        doc.fontSize(7.5).font('Helvetica').text('(Prescribed under Section 31 of Factory Act 1948)', { align: 'center' });
        doc.fontSize(7.5).text('(See Rule-57)', { align: 'center' });
        doc.fontSize(10).font('Helvetica-Bold').fillColor(goldColor).text('Report of Examination of Pressure safety Valve', { align: 'center' });
        doc.moveDown(0.3);

        const certNoSV = inspection.certificate?.certificate_no || `GSS/OIL-D/PSV/H-TEST/${inspection.id.substring(0, 4).toUpperCase()}/${new Date().getFullYear()}`;
        const issueDateSV = new Date(inspection.completed_date || new Date()).toLocaleDateString('en-IN');
        const expiryDateSV = draftData.expiry_date ? new Date(draftData.expiry_date).toLocaleDateString('en-IN') : new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toLocaleDateString('en-IN');

        doc.fontSize(8).fillColor(primaryColor);
        doc.font('Helvetica-Bold').text(`Certificate No. : ${certNoSV}`, 40, 145);
        doc.text(`Dated: ${issueDateSV}`, 430, 145);
        doc.moveTo(35, 157).lineTo(560, 157).lineWidth(0.5).stroke('#cbd5e1');

        const yRefSV = { val: 165 };
        const drawRowSV = makeRowDrawer(yRefSV);

        drawRowSV('1', 'Name of occupier (or Factory)', draftData.sv_occupier_name || inspection.client.name);
        drawRowSV('2', 'Situation and address of Factory', draftData.sv_factory_address || inspection.client.city || 'On-site');

        const y3sv = yRefSV.val;
        doc.font('Helvetica-Bold').fontSize(8).text('3.', 40, y3sv, { width: 15 });
        doc.font('Helvetica-Bold').text('Name description and distinctive number of Thermal Safety Valve', 60, y3sv, { width: 220 });
        doc.font('Helvetica-Bold').text(draftData.sv_valve_desc || 'PRESSURE SAFETY VALVE', 295, y3sv, { width: 265 });
        doc.font('Helvetica').text(draftData.sv_valve_cap_no || 'CAP- 14182.0 kg/hr', 295, y3sv + 12, { width: 265 });
        yRefSV.val += 34;
        doc.moveTo(35, yRefSV.val - 2).lineTo(560, yRefSV.val - 2).lineWidth(0.3).stroke('#e2e8f0');

        drawRowSV('4', 'Name and Address of Manufacturer', draftData.sv_manufacturer || 'Anderson Greenwood Crosby Sanmar Limited.');
        drawRowSV('5', 'Nature of process in which it is use.', draftData.sv_process || 'For Plant Process');

        const y6sv = yRefSV.val;
        doc.font('Helvetica-Bold').fontSize(8).text('6.', 40, y6sv, { width: 15 });
        doc.font('Helvetica-Bold').text('Particulars of TSV: a) Year of Manufacture', 60, y6sv, { width: 220 });
        doc.font('Helvetica').text(draftData.sv_mfg_year || 'N.A', 295, y6sv, { width: 265 });
        doc.font('Helvetica-Bold').text('b) Date of commissioning in service', 75, y6sv + 14, { width: 215 });
        doc.font('Helvetica').text(draftData.sv_commission_date || 'N.A', 295, y6sv + 14, { width: 265 });
        doc.font('Helvetica-Bold').text('c) Set pressure recommended by the manufacturer', 75, y6sv + 28, { width: 215 });
        doc.font('Helvetica').text(draftData.sv_set_pressure || '58.52 kg/cm²', 295, y6sv + 28, { width: 265 });
        doc.font('Helvetica-Bold').text('d) History: TSV working in order since inspection', 75, y6sv + 42, { width: 215 });
        doc.font('Helvetica').text(draftData.sv_valve_history || 'As reported, the TSV has been working in order since inspection', 295, y6sv + 42, { width: 265 });
        yRefSV.val += 64;
        doc.moveTo(35, yRefSV.val - 2).lineTo(560, yRefSV.val - 2).lineWidth(0.3).stroke('#e2e8f0');

        drawRowSV('7', 'Date of last Hyd. test (if any) and pressure applied', draftData.sv_last_hyd_test || 'N.A');
        drawRowSV('8', 'Is the TSV in open or otherwise exposed to weather or to damp?', draftData.sv_exposed_weather || 'Under Shed');
        drawRowSV('9', 'What parts [if any were inaccessible]?', draftData.sv_inaccessible_parts || 'Internal');
        drawRowSV('10', 'What examination and were made? [Specify pressure if Hydraulic test was carried out]', draftData.sv_exam_details || 'Through Physical examination & Hydro test done.');
        drawRowSV('11', 'Are all fittings and appliances properly maintained and in good condition?', draftData.sv_fittings_maintained || 'Yes.');
        drawRowSV('12', 'Repairs [if any required & period within which to be executed]', draftData.sv_repairs_required || 'No major defect affecting the set pressure has been observed.');

        const y13sv = yRefSV.val;
        doc.font('Helvetica-Bold').fontSize(8).text('13.', 35, y13sv, { width: 20 });
        doc.font('Helvetica-Bold').text('Where repair affecting the set pressure are required, state the Set pressure', 60, y13sv, { width: 220 });
        doc.font('Helvetica-Bold').text('a) Before the expiration of the period specified in [15]', 75, y13sv + 14, { width: 215 });
        doc.font('Helvetica').text(draftData.sv_repairs_set_pressure || 'N.A', 295, y13sv + 14, { width: 265 });
        doc.font('Helvetica-Bold').text('b) After the expiration if repairs not been completed', 75, y13sv + 28, { width: 215 });
        doc.font('Helvetica').text('N.A', 295, y13sv + 28, { width: 265 });
        doc.font('Helvetica-Bold').text('c) After completion of the required repairs', 75, y13sv + 42, { width: 215 });
        doc.font('Helvetica').text('N.A', 295, y13sv + 42, { width: 265 });
        yRefSV.val += 64;
        doc.moveTo(35, yRefSV.val - 2).lineTo(560, yRefSV.val - 2).lineWidth(0.3).stroke('#e2e8f0');

        drawRowSV('14', 'Other observations.', draftData.sv_other_observations || 'Satisfactory.');

        const svCertY = yRefSV.val + 6;
        doc.fontSize(7.5).font('Helvetica-Oblique').fillColor(primaryColor);
        doc.text(`I / We certify that on ${issueDateSV} the thermal safety valve described above was thoroughly cleaned and (so far its construction permits) made accessible for thorough examination and for such tests as were necessary for thorough examination and that on the said date. I/We thoroughly examined this thermal safety valve including its fitting and that the above is true report of my examination.`, 38, svCertY, { width: 516, align: 'justify' });

        const svSigY = svCertY + 45;
        doc.font('Helvetica-Bold').fontSize(8).fillColor(primaryColor).text(`Test Date: ${issueDateSV}`, 38, svSigY);
        doc.text(`Due Date: ${expiryDateSV}`, 38, svSigY + 14);
        doc.font('Helvetica').text(`Competency No – ${draftData.competency_no || '663, dated 11.11.2025, valid upto 10.11.2026'}`, 38, svSigY + 28);

        // QR code — bottom right
        if (qrCodeBuffer) {
          doc.image(qrCodeBuffer, 450, svSigY, { width: 55, height: 55 });
          doc.fontSize(6).fillColor('#475569').text('SCAN TO VERIFY', 450, svSigY + 57, { align: 'center', width: 55 });
        }

        // Signature — center
        doc.moveTo(220, svSigY + 50).lineTo(420, svSigY + 50).lineWidth(0.5).stroke(primaryColor);
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor(primaryColor).text(draftData.competent_person || 'Competent Person', 220, svSigY + 54, { align: 'center', width: 200 });
        doc.fontSize(7.5).text('Civil Engineer & Competent Person', 220, svSigY + 66, { align: 'center', width: 200 });
        doc.fontSize(7).text('For Global Safety Solution', 220, svSigY + 76, { align: 'center', width: 200 });

        // Competency footer
        drawCompetencyFooter(svSigY + 96, draftData.competency_no || '663, Dt. – 11/11/2025', draftData.competent_person || 'Competent Person');

      } else {
        // =============================================
        // DEFAULT: STANDARD SAFETY COMPLIANCE CERTIFICATE
        // Uses the same GSS branded header
        // =============================================
        drawEnterpriseHeader();
        const certScope = draftData.scope || inspection.work_order?.service_product?.name || 'Safety Audit';
        const certRemarks = draftData.remarks || '';
        const certNo = inspection.certificate?.certificate_no || 'PENDING';

        // Title block
        doc.fillColor(primaryColor);
        doc.fontSize(12).font('Helvetica-Bold').text('SAFETY COMPLIANCE CERTIFICATE', 28, 104, { align: 'center', width: 539 });
        doc.fontSize(9).font('Helvetica').fillColor(goldColor).text(certScope, { align: 'center', width: 539 });
        doc.moveDown(0.3);

        // Cert No + Date
        const stdIssueDate = new Date(inspection.completed_date || new Date()).toLocaleDateString('en-IN');
        const stdExpiryDate = inspection.certificate?.expiry_date ? new Date(inspection.certificate.expiry_date).toLocaleDateString('en-IN') : 'N/A';
        doc.fontSize(8).font('Helvetica-Bold').fillColor(primaryColor);
        doc.text(`Certificate No.: ${certNo}`, 38, 130);
        doc.text(`DATE: ${stdIssueDate}`, 430, 130);
        doc.moveTo(28, 142).lineTo(567, 142).lineWidth(0.5).stroke('#cbd5e1');

        // Client info
        doc.fontSize(10).font('Helvetica-Bold').fillColor(primaryColor).text('This is to certify that a comprehensive safety inspection was conducted for:', 38, 152, { width: 520, align: 'center' });
        doc.rect(38, 170, 519, 55).lineWidth(0.5).stroke('#cbd5e1');
        doc.fontSize(16).font('Helvetica-Bold').fillColor(primaryColor).text(inspection.client?.name || 'N/A', 38, 184, { align: 'center', width: 519 });
        doc.fontSize(8.5).font('Helvetica').fillColor('#64748b').text(`${inspection.client?.city || ''} | Inspection ID: ${inspection.id.substring(0,8).toUpperCase()}`, 38, 202, { align: 'center', width: 519 });

        // Grid info
        const stdGridY = 238;
        doc.moveTo(28, stdGridY - 2).lineTo(567, stdGridY - 2).lineWidth(0.3).stroke('#e2e8f0');
        doc.fontSize(8).font('Helvetica-Bold').fillColor(primaryColor);
        doc.text('Assigned Engineer:', 38, stdGridY); doc.font('Helvetica').text(inspection.engineer?.name || 'Authorized Personnel', 145, stdGridY);
        doc.font('Helvetica-Bold').text('Scope:', 350, stdGridY); doc.font('Helvetica').text(certScope, 395, stdGridY, { width: 155 });

        doc.moveTo(28, stdGridY + 18).lineTo(567, stdGridY + 18).lineWidth(0.3).stroke('#e2e8f0');
        doc.font('Helvetica-Bold').text('Inspection Date:', 38, stdGridY + 22); doc.font('Helvetica').text(stdIssueDate, 145, stdGridY + 22);
        doc.font('Helvetica-Bold').text('Validity:', 350, stdGridY + 22); doc.font('Helvetica').text(inspection.certificate?.validity_period === '3y' ? '3 Years' : '1 Year', 395, stdGridY + 22);

        doc.moveTo(28, stdGridY + 40).lineTo(567, stdGridY + 40).lineWidth(0.3).stroke('#e2e8f0');
        doc.font('Helvetica-Bold').text('Expiry Date:', 38, stdGridY + 44); doc.font('Helvetica').fillColor(goldColor).text(stdExpiryDate, 145, stdGridY + 44);

        // Inspection summary
        const stdSumY = stdGridY + 70;
        doc.fillColor(primaryColor).fontSize(9.5).font('Helvetica-Bold').text('INSPECTION SUMMARY', 38, stdSumY);
        doc.moveTo(28, stdSumY + 14).lineTo(567, stdSumY + 14).lineWidth(0.5).stroke(primaryColor);

        let itemY = stdSumY + 20;
        inspection.items.slice(0, 8).forEach((item: any, index: number) => {
          doc.fontSize(8).font('Helvetica-Bold').fillColor(primaryColor).text(`${index + 1}. ${item.description}`, 38, itemY, { width: 400 });
          const statusColor = item.status === 'PASS' ? '#059669' : item.status === 'FAIL' ? '#dc2626' : '#64748b';
          doc.fillColor(statusColor).font('Helvetica-Bold').text(item.status, 450, itemY, { align: 'right', width: 110 });
          doc.fillColor(primaryColor);
          itemY += 18;
        });

        if (certRemarks) {
          itemY += 8;
          doc.fontSize(9).font('Helvetica-Bold').text('Recommendations & Observations:', 38, itemY);
          itemY += 14;
          doc.fontSize(8).font('Helvetica').fillColor('#334155').text(certRemarks, 38, itemY, { width: 520, align: 'justify' });
          itemY += 50;
        }

        // QR & Signature
        const stdFootY = Math.max(itemY + 20, 700);
        if (qrCodeBuffer) {
          doc.image(qrCodeBuffer, 38, stdFootY, { width: 55, height: 55 });
          doc.fontSize(6).fillColor('#475569').text('SCAN TO VERIFY', 38, stdFootY + 57, { align: 'center', width: 55 });
        }
        doc.moveTo(350, stdFootY + 45).lineTo(550, stdFootY + 45).lineWidth(0.5).stroke(primaryColor);
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor(primaryColor).text('Authorized Signatory', 350, stdFootY + 49, { align: 'center', width: 200 });
        doc.fontSize(7.5).text('Global Safety Solution', 350, stdFootY + 61, { align: 'center', width: 200 });

        drawCompetencyFooter(stdFootY + 80, '663, Dt. \u2013 11/11/2025', 'Competent Person');
      } // end else (standard cert)

      doc.end();
    });
  }
}
