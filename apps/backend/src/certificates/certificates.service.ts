import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateCertificateDto,
  UpdateCertificateDto,
} from './dto/create-certificate.dto';
import {
  CreateCertificateTemplateDto,
  UpdateCertificateTemplateDto,
} from './dto/create-template.dto';

import { computeExpiryDate } from '../common/utils/date-utils';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

@Injectable()
export class CertificatesService {
  private readonly certStorageDirs: string[];

  constructor(private readonly prisma: PrismaService) {
    // Resolve persistent storage directories (same pattern as LocalStorageService/main.ts)
    const cwd = process.cwd();
    const homeDir = os.homedir();
    const hostingerAccountDir = '/home/u745630191';

    const candidates = [
      path.join(hostingerAccountDir, 'persistent_uploads', 'certificates'),
      path.join(homeDir, 'persistent_uploads', 'certificates'),
      path.join(cwd, '..', 'persistent_uploads', 'certificates'),
      path.join(cwd, '..', '..', 'persistent_uploads', 'certificates'),
      path.join(cwd, 'persistent_uploads', 'certificates'),
    ];

    // Deduplicate via path.resolve
    this.certStorageDirs = Array.from(new Set(candidates.map(d => path.resolve(d))));

    // Ensure directories exist
    for (const dir of this.certStorageDirs) {
      try {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      } catch (e) {
        // Ignore permission errors (e.g. Hostinger path on local dev)
      }
    }
  }

  // =====================================================================
  // PERSISTENT PDF STORAGE HELPERS
  // =====================================================================

  /**
   * Returns the absolute path where a certificate PDF should be stored.
   * Tries each storage directory and returns the first one that is writable.
   */
  private getWritableStoragePath(certId: string): string | null {
    const fileName = `${certId}.pdf`;
    for (const dir of this.certStorageDirs) {
      try {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        // Test writability
        const testFile = path.join(dir, `.write-test-${Date.now()}`);
        fs.writeFileSync(testFile, '');
        fs.unlinkSync(testFile);
        return path.join(dir, fileName);
      } catch (e) {
        // This directory is not writable, try next
      }
    }
    return null;
  }

  /**
   * Searches all storage directories for an existing certificate PDF.
   * Returns the absolute path if found, null otherwise.
   */
  private findExistingPdf(certId: string): string | null {
    const fileName = `${certId}.pdf`;
    for (const dir of this.certStorageDirs) {
      const filePath = path.join(dir, fileName);
      try {
        if (fs.existsSync(filePath) && fs.statSync(filePath).size > 0) {
          return filePath;
        }
      } catch (e) {
        // Ignore read errors
      }
    }
    return null;
  }

  /**
   * Saves a PDF buffer to persistent storage and updates the certificate's pdf_url.
   */
  private async persistPdfBuffer(certId: string, buffer: Buffer): Promise<void> {
    const storagePath = this.getWritableStoragePath(certId);
    if (!storagePath) {
      console.warn(`[CertStorage] No writable storage directory found for certificate ${certId}`);
      return;
    }

    try {
      await fs.promises.writeFile(storagePath, buffer);
      console.log(`[CertStorage] Certificate PDF persisted: ${storagePath} (${buffer.length} bytes)`);

      // Update pdf_url in the database for future reference
      const relativePdfUrl = `/certificates/${certId}/pdf`;
      await this.prisma.certificate.update({
        where: { id: certId },
        data: { pdf_url: relativePdfUrl },
      }).catch((e: any) => {
        console.warn(`[CertStorage] Could not update pdf_url for ${certId}:`, e?.message);
      });
    } catch (e: any) {
      console.error(`[CertStorage] Failed to persist PDF for ${certId}:`, e?.message);
    }
  }

  // =====================================================================
  // GET OR GENERATE PDF (primary entry point for View/Download)
  // =====================================================================

  /**
   * Returns a certificate PDF buffer. Serves from persistent storage if available,
   * otherwise regenerates and persists the PDF.
   * 
   * This is the method that controllers should call for View/Download.
   */
  async getOrGeneratePdf(id: string): Promise<Buffer> {
    // 1. Validate the certificate ID exists in the database
    const certRecord = await this.prisma.certificate.findUnique({
      where: { id },
      select: { id: true, pdf_url: true },
    });

    if (!certRecord) {
      throw new NotFoundException(`Certificate record with ID ${id} does not exist in the database`);
    }

    // 2. Check for existing persistent PDF on disk
    const existingPath = this.findExistingPdf(id);
    if (existingPath) {
      try {
        const buffer = await fs.promises.readFile(existingPath);
        if (buffer.length > 0) {
          console.log(`[CertStorage] Serving persisted PDF: ${existingPath}`);
          return buffer;
        }
      } catch (e: any) {
        console.warn(`[CertStorage] Persistent PDF exists but cannot be read: ${existingPath}`, e?.message);
      }
    }

    // 3. PDF not on disk — regenerate from certificate data
    console.log(`[CertStorage] No persistent PDF found for ${id}, regenerating...`);
    try {
      const buffer = await this.generatePdfForCertificate(id);

      // 4. Persist the newly generated PDF
      await this.persistPdfBuffer(id, buffer);

      return buffer;
    } catch (e: any) {
      if (e instanceof NotFoundException) {
        throw e;
      }
      console.error(`[CertStorage] PDF regeneration failed for ${id}:`, e?.message);
      throw new InternalServerErrorException(
        `Certificate record exists but PDF generation failed. Please try again or contact support.`,
      );
    }
  }

  async create(createCertificateDto: CreateCertificateDto) {
    const { issue_date, validity_period, metadata, ...rest } = createCertificateDto;
    const issueDate = new Date(issue_date);
    const expiryDate = computeExpiryDate(issueDate, validity_period);

    let metaObj: any = {};
    if (metadata) {
      try {
        metaObj = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
      } catch (e) {
        metaObj = { raw: metadata };
      }
    }

    if (rest.inspection_item_id) {
      const item = await this.prisma.inspectionItem.findUnique({
        where: { id: rest.inspection_item_id },
      });
      if (item) {
        metaObj.equipment_description = item.description;
        metaObj.cert_ref_no = item.cert_ref_no || rest.certificate_no;
        metaObj.cert_competency_no = item.cert_competency_no;
        metaObj.cert_test_date = item.cert_test_date;
      }
    }

    const metadataStr = JSON.stringify(metaObj);

    const existing = await this.prisma.certificate.findFirst({
      where: {
        OR: [
          ...(rest.inspection_item_id ? [{ inspection_item_id: rest.inspection_item_id }] : []),
          ...(rest.certificate_no ? [{ certificate_no: rest.certificate_no }] : []),
        ],
      },
    });

    let cert: any;
    if (existing) {
      cert = await this.prisma.certificate.update({
        where: { id: existing.id },
        data: {
          ...rest,
          issue_date: issueDate,
          expiry_date: expiryDate,
          validity_period,
          metadata: metadataStr,
        },
        include: {
          inspection: {
            include: {
              client: true,
              work_order: true,
            },
          },
        },
      });
    } else {
      cert = await this.prisma.certificate.create({
        data: {
          ...rest,
          issue_date: issueDate,
          expiry_date: expiryDate,
          validity_period,
          metadata: metadataStr,
        },
        include: {
          inspection: {
            include: {
              client: true,
              work_order: true,
            },
          },
        },
      });
    }

    await this.syncCertificateToVault(cert);
    return cert;
  }

  private async syncCertificateToVault(certificate: any) {
    if (!certificate || !certificate.inspection) return;

    const clientId = certificate.inspection.client_id;
    const projectId = certificate.inspection.project_id || certificate.inspection.work_order?.project_id || null;
    const certNo = certificate.certificate_no;
    const clientName = certificate.inspection.client?.name || 'Client';
    const certName = `${clientName} - Certificate ${certNo}`;
    const fileUrl = certificate.pdf_url || `/certificates/${certificate.id}/pdf`;

    try {
      // 1. Sync to Digital Vault (Document)
      const existingDoc = await this.prisma.document.findFirst({
        where: {
          OR: [
            { file_url: fileUrl },
            { notes: { contains: certNo } },
          ],
        },
      });

      if (existingDoc) {
        await this.prisma.document.update({
          where: { id: existingDoc.id },
          data: {
            name: certName,
            file_url: fileUrl,
            file_type: 'PDF',
            category: 'CERTIFICATE',
            client_id: clientId,
            project_id: projectId,
            expiry_date: certificate.expiry_date,
            test_date: certificate.issue_date,
            notes: `Certificate No. ${certNo} | Status: ${certificate.status || 'ACTIVE'}`,
          },
        });
      } else {
        await this.prisma.document.create({
          data: {
            name: certName,
            file_url: fileUrl,
            file_type: 'PDF',
            file_size: 102400,
            category: 'CERTIFICATE',
            client_id: clientId,
            project_id: projectId,
            expiry_date: certificate.expiry_date,
            test_date: certificate.issue_date,
            notes: `Certificate No. ${certNo} | Status: ${certificate.status || 'ACTIVE'}`,
            uploaded_by: certificate.inspection.engineer_id || null,
          },
        });
      }

      // 2. Sync to Compliance Table
      const existingComp = await this.prisma.compliance.findFirst({
        where: {
          client_id: clientId,
          reference_number: certNo,
        },
      });

      if (existingComp) {
        await this.prisma.compliance.update({
          where: { id: existingComp.id },
          data: {
            issue_date: certificate.issue_date,
            expiry_date: certificate.expiry_date,
            status: certificate.status || 'ACTIVE',
          },
        });
      } else {
        await this.prisma.compliance.create({
          data: {
            client_id: clientId,
            compliance_type: 'Safety Certificate',
            reference_number: certNo,
            issue_date: certificate.issue_date,
            expiry_date: certificate.expiry_date,
            status: certificate.status || 'ACTIVE',
          },
        });
      }
    } catch (e) {
      console.error('Failed to sync certificate to Digital Vault & Compliance:', e);
    }
  }

  async findAll() {
    return this.prisma.certificate.findMany({
      include: {
        inspection: {
          include: {
            client: true,
            work_order: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const certificate = await this.prisma.certificate.findUnique({
      where: { id },
      include: {
        inspection: {
          include: {
            client: true,
            work_order: true,
            items: true,
          },
        },
      },
    });

    if (!certificate) {
      throw new NotFoundException(`Certificate with ID ${id} not found`);
    }

    return certificate;
  }

  async findByItem(itemId: string) {
    if (!itemId) return null;
    return this.prisma.certificate.findFirst({
      where: { inspection_item_id: itemId },
      include: {
        inspection: {
          include: {
            client: true,
            work_order: true,
          },
        },
      },
    });
  }


  async update(id: string, updateCertificateDto: UpdateCertificateDto) {
    const { metadata, ...rest } = updateCertificateDto;
    const metadataStr = metadata && typeof metadata === 'object'
      ? JSON.stringify(metadata)
      : metadata;
    return this.prisma.certificate.update({
      where: { id },
      data: {
        ...rest,
        metadata: metadataStr as string,
      },
    });
  }

  async remove(id: string) {
    return this.prisma.certificate.delete({
      where: { id },
    });
  }

  // Method for the scheduler to find expiring certificates
  async findExpiring(days: number) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + days);

    // We want certificates where expiry_date is exactly targetDate (approx)
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    return this.prisma.certificate.findMany({
      where: {
        expiry_date: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: 'ACTIVE',
      },
      include: {
        inspection: {
          include: {
            client: true,
          },
        },
      },
    });
  }

  // --- Certificate Template CRUD Methods ---
  async createTemplate(dto: CreateCertificateTemplateDto) {
    return this.prisma.certificateTemplate.create({
      data: dto,
    });
  }

  async findAllTemplates() {
    return this.prisma.certificateTemplate.findMany({
      orderBy: { created_at: 'desc' },
    });
  }

  async findOneTemplate(id: string) {
    const template = await this.prisma.certificateTemplate.findUnique({
      where: { id },
    });
    if (!template) {
      throw new NotFoundException(`Certificate template with ID ${id} not found`);
    }
    return template;
  }

  async updateTemplate(id: string, dto: UpdateCertificateTemplateDto) {
    return this.prisma.certificateTemplate.update({
      where: { id },
      data: dto,
    });
  }

  async removeTemplate(id: string) {
    return this.prisma.certificateTemplate.delete({
      where: { id },
    });
  }

  async generatePdfForCertificate(id: string): Promise<Buffer> {
    const certificate = await this.prisma.certificate.findUnique({
      where: { id },
      include: {
        inspection: {
          include: {
            client: true,
            engineer: true,
            work_order: true,
          },
        },
        inspection_item: true,
      },
    });

    if (!certificate) {
      throw new NotFoundException(`Certificate with ID ${id} not found`);
    }

    // 1. Parse metadata for template details
    let templateId: string | null = null;
    let fieldValues: any = {};
    if (certificate.metadata) {
      try {
        const meta = JSON.parse(certificate.metadata);
        templateId = meta.template_id || null;
        fieldValues = meta.field_values || {};
      } catch (e) {
        console.error('Error parsing certificate metadata:', e);
      }
    }

    // 2. Fetch template
    let template: any = null;
    if (templateId) {
      template = await this.prisma.certificateTemplate.findUnique({
        where: { id: templateId },
      });
    }

    // 3. QR code generation
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const QRCode = require('qrcode');
    let qrCodeBuffer: Buffer | null = null;
    try {
      const frontendUrl = process.env.FRONTEND_URL || 'https://globalsafetysolution.in';
      const qrUrl = `${frontendUrl}/verify/certificate/${certificate.id}`;
      qrCodeBuffer = await QRCode.toBuffer(qrUrl, {
        width: 150,
        margin: 1,
      });
    } catch (err) {
      console.error('Failed to generate QR Code locally:', err);
    }

    // 4. Logo loading
    const path = require('path');
    const fs = require('fs');
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

    const _PDFDocument = require('pdfkit');
    const PDFDocument = _PDFDocument.default || _PDFDocument;

    return new Promise((resolve, reject) => {
      const docOptions: any = { margin: 20, size: 'A4' };
      const doc = new PDFDocument(docOptions);
      doc.page.margins.bottom = 15;
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err: Error) => {
        console.error('[PDFKit] Document error in generatePdfForCertificate:', err);
        reject(err);
      });

      // Colors
      const primaryColor = '#0f172a';
      const goldColor = '#b8860b';

      // Gold border
      doc.rect(15, 15, 565, 812).lineWidth(1.5).stroke(goldColor);
      doc.rect(20, 20, 555, 802).lineWidth(0.5).stroke(primaryColor);

      // Enterprise header
      // GSTIN & ISO
      doc.fillColor('#000000').fontSize(7.5).font('Helvetica-Bold');
      doc.text('GSTIN: 20BILPA8494E1ZE', 40, 26, { align: 'right', width: 510 });
      doc.text('ISO:9001:2015', 40, 36, { align: 'right', width: 510 });

      // Logo
      if (logoBuffer) {
        doc.image(logoBuffer, 30, 28, { width: 60, height: 60 });
      }

      // Company name
      doc.fontSize(20).font('Helvetica-Bold').fillColor(primaryColor);
      doc.text('M/s Global Safety Solution', 100, 34);
      doc.fontSize(7).font('Helvetica').fillColor('#334155');
      doc.text('\u2609 Shop No. 51, 2nd Floor, AC Market, Gel Church Complex, Main Road, Ranchi-834001 (Jharkhand)', 100, 58);
      doc.text('\u260E 6201186550   \u2709 id-globalsafety56@gmail.com', 100, 68);

      // Divider
      doc.moveTo(28, 92).lineTo(567, 92).lineWidth(1.2).stroke(primaryColor);

      // Certificate header info
      const title = template?.name || 'SAFETY COMPLIANCE CERTIFICATE';
      const description = template?.description || 'Test Report / Safety Certificate';

      doc.fillColor(primaryColor);
      doc.fontSize(11).font('Helvetica-Bold').text(title.toUpperCase(), 30, 105, { align: 'center', width: 539 });
      doc.fontSize(8.5).font('Helvetica').fillColor(goldColor).text(description, { align: 'center', width: 539 });
      doc.moveDown(0.3);

      // Ref and Dates
      const refNo = certificate.certificate_no;
      const issueDateStr = new Date(certificate.issue_date).toLocaleDateString('en-IN');
      const expiryDateStr = new Date(certificate.expiry_date).toLocaleDateString('en-IN');

      doc.fontSize(8).font('Helvetica-Bold').fillColor(primaryColor);
      doc.text(`REF NO: ${refNo}`, 40, 142);
      doc.text(`Test Date: ${issueDateStr}`, 240, 142);
      doc.text(`Valid Upto: ${expiryDateStr}`, 430, 142);
      doc.moveTo(35, 154).lineTo(560, 154).lineWidth(0.5).stroke('#cbd5e1');

      // Helper function to replace placeholders in template fields
      const replacePlaceholders = (text: string) => {
        if (!text) return '';
        let result = text;
        
        // Dynamic section fields
        const compNo = certificate.inspection_item?.cert_competency_no || fieldValues.cert_competency_no || (fieldValues.meta && fieldValues.meta.cert_competency_no) || '663';
        result = result.replace(/{{cert_ref_no}}/g, certificate.certificate_no || '');
        result = result.replace(/{{cert_test_date}}/g, issueDateStr);
        result = result.replace(/{{cert_expiry_date}}/g, expiryDateStr);
        result = result.replace(/{{cert_competency_no}}/g, compNo);
        
        // Client details
        result = result.replace(/{{client_name}}/g, certificate.inspection?.client?.name || '');
        result = result.replace(/{{client_city}}/g, certificate.inspection?.client?.city || '');
        result = result.replace(/{{client_address}}/g, certificate.inspection?.client?.billing_address || certificate.inspection?.client?.city || '');
        
        // Work order details
        result = result.replace(/{{work_order_no}}/g, certificate.inspection?.work_order?.work_order_no || '');

        // Custom fields filled by staff
        Object.keys(fieldValues).forEach((key) => {
          const val = fieldValues[key];
          if (typeof val === 'string') {
            result = result.replace(new RegExp(`{{${key}}}`, 'g'), val || '');
          }
        });

        // Cleanup any remaining placeholders
        return result.replace(/{{.*?}}/g, 'N/A');
      };

      // Prepare all table rows
      const rows: { num: string; label: string; val: string }[] = [];

      // Row 1 & 2 standard defaults
      rows.push({
        num: '1',
        label: 'Name of the occupier of the Factory',
        val: certificate.inspection?.client?.name || 'N/A',
      });
      rows.push({
        num: '2',
        label: 'Address of the Factory',
        val: certificate.inspection?.client?.billing_address || certificate.inspection?.client?.city || 'N/A',
      });

      // Parse custom template fields if defined
      let templateFields: any[] = [];
      if (template?.fields) {
        try {
          templateFields = JSON.parse(template.fields);
        } catch (e) {
          console.error('Error parsing template fields:', e);
        }
      }

      if (Array.isArray(templateFields) && templateFields.length > 0) {
        templateFields.forEach((field: any, index: number) => {
          const label = field.label || field.name || 'Field';
          const placeholderKey = field.key || field.name || '';
          const valueRaw = fieldValues[placeholderKey] || '';
          const finalVal = replacePlaceholders(valueRaw || field.default || '');
          rows.push({
            num: (index + 3).toString(),
            label,
            val: finalVal || 'N/A',
          });
        });
      } else {
        // Fallback standard fields
        rows.push({
          num: '3',
          label: 'Description of Safety Check / Eqpt',
          val: certificate.inspection_item?.description || 'N/A',
        });
        rows.push({
          num: '4',
          label: 'Observations / Notes',
          val: certificate.inspection_item?.notes || 'N/A',
        });
        rows.push({
          num: '5',
          label: 'Scope of Inspection',
          val: certificate.inspection_item?.scope || 'N/A',
        });
        rows.push({
          num: '6',
          label: 'Remarks & Recommendations',
          val: certificate.inspection_item?.recommendations || 'N/A',
        });
      }

      // Certifying Statement
      const finalStatementRaw = template?.html_content || `I / We certify that on {{cert_test_date}} the safety checklist section described above was thoroughly examined and found satisfactory, subject to notes and recommendations.`;
      const finalStatement = replacePlaceholders(finalStatementRaw);

      // --- Dynamic Layout Scaling Engine ---
      const startY = 158;
      const maxAvailableHeight = 507; // Available height for table rows + statement (158 to 665)

      // Candidate configurations for auto-fitting content onto a single page
      const candidateConfigs = [
        { fontSize: 7.5, rowPadding: 3.0, statementFontSize: 7.5, statementGap: 8, labelWidth: 220 },
        { fontSize: 7.0, rowPadding: 2.2, statementFontSize: 7.0, statementGap: 6, labelWidth: 220 },
        { fontSize: 6.5, rowPadding: 1.8, statementFontSize: 6.5, statementGap: 5, labelWidth: 225 },
        { fontSize: 6.0, rowPadding: 1.2, statementFontSize: 6.0, statementGap: 4, labelWidth: 230 },
        { fontSize: 5.5, rowPadding: 1.0, statementFontSize: 5.5, statementGap: 3, labelWidth: 235 },
      ];

      let selectedConfig = candidateConfigs[candidateConfigs.length - 1]; // fallback

      for (const config of candidateConfigs) {
        let testHeight = 0;
        const valWidth = 560 - 56 - config.labelWidth - 4;

        for (const row of rows) {
          doc.font('Helvetica-Bold').fontSize(config.fontSize);
          const lblH = doc.heightOfString(row.label, { width: config.labelWidth });
          doc.font('Helvetica').fontSize(config.fontSize);
          const valH = doc.heightOfString(`:  ${row.val}`, { width: valWidth });
          const rowH = Math.max(lblH, valH) + config.rowPadding;
          testHeight += rowH;
        }

        // Add statement height
        doc.font('Helvetica-Oblique').fontSize(config.statementFontSize);
        const stmtH = doc.heightOfString(finalStatement, { width: 516, lineGap: 1 });
        testHeight += config.statementGap + stmtH;

        if (testHeight <= maxAvailableHeight) {
          selectedConfig = config;
          break;
        }
      }

      // Render Key-Value Rows using selectedConfig
      const fontSz = selectedConfig.fontSize;
      const rowPad = selectedConfig.rowPadding;
      const lblW = selectedConfig.labelWidth;
      const valW = 560 - 56 - lblW - 4;

      let currentY = startY;

      for (const row of rows) {
        doc.font('Helvetica-Bold').fontSize(fontSz);
        const lblH = doc.heightOfString(row.label, { width: lblW });

        doc.font('Helvetica').fontSize(fontSz);
        const valH = doc.heightOfString(`:  ${row.val}`, { width: valW });

        const contentH = Math.max(lblH, valH);
        const rowH = contentH + rowPad;

        // Render number, label, and value
        doc.font('Helvetica-Bold').fontSize(fontSz).fillColor(primaryColor).text(`${row.num}.`, 38, currentY, { width: 16 });
        doc.font('Helvetica-Bold').text(row.label, 56, currentY, { width: lblW });
        doc.font('Helvetica').text(`:  ${row.val}`, 56 + lblW + 4, currentY, { width: valW });

        currentY += rowH;
        doc.moveTo(35, currentY - 1).lineTo(560, currentY - 1).lineWidth(0.3).stroke('#e2e8f0');
      }

      // Render Certifying Statement
      const statementY = currentY + selectedConfig.statementGap;
      doc.fontSize(selectedConfig.statementFontSize).font('Helvetica-Oblique').fillColor(primaryColor);
      doc.text(finalStatement, 38, statementY, { width: 516, align: 'justify', lineGap: 1 });

      // Signatures & Footer fixed bottom positioning
      const sigY = 668;
      const competencyNoVal = certificate.inspection_item?.cert_competency_no || fieldValues.cert_competency_no || '663';

      // Divider line above signature section
      doc.moveTo(28, sigY - 8).lineTo(567, sigY - 8).lineWidth(0.5).stroke('#94a3b8');

      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(primaryColor);
      doc.text(`Test Date: ${issueDateStr}`, 38, sigY);
      doc.text(`Due Date: ${expiryDateStr}`, 38, sigY + 12);
      doc.font('Helvetica').text(`Competency No – ${competencyNoVal}`, 38, sigY + 24);

      // QR Code
      if (qrCodeBuffer) {
        doc.image(qrCodeBuffer, 460, sigY, { width: 50, height: 50 });
        doc.fontSize(5.5).fillColor('#475569').text('SCAN TO VERIFY', 460, sigY + 52, { align: 'center', width: 50 });
      }

      // Signature line
      doc.moveTo(220, sigY + 30).lineTo(420, sigY + 30).lineWidth(0.5).stroke(primaryColor);
      doc.font('Helvetica-Bold').fontSize(8).fillColor(primaryColor).text('Competent Person', 220, sigY + 34, { align: 'center', width: 200 });
      doc.fontSize(7).text('Global Safety Solution', 220, sigY + 44, { align: 'center', width: 200 });

      // Competency footer
      const drawCompetencyFooter = (startY: number, competencyNo: string) => {
        doc.moveTo(28, startY).lineTo(567, startY).lineWidth(0.5).stroke('#94a3b8');
        startY += 4;
        doc.fontSize(7).font('Helvetica-Bold').fillColor(primaryColor);
        doc.text('Global Safety Solution', 160, startY, { align: 'center', width: 280 });
        doc.text('Competent Person under the Factories Act. 1948', 160, startY + 9, { align: 'center', width: 280 });
        doc.text(`Competency No. from Govt. – Memo. No.: ${competencyNo}`, 160, startY + 18, { align: 'center', width: 280 });
      };
      drawCompetencyFooter(sigY + 60, competencyNoVal);

      doc.end();
    });
  }
}
