import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LocalStorageService } from '../common/services/local-storage.service';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly localStorageService: LocalStorageService,
  ) { }

  // Automatically sync any existing DB certificates that are missing from Digital Vault
  async syncExistingCertificatesToVault() {
    try {
      const certificates = await this.prisma.certificate.findMany({
        include: {
          inspection: {
            include: {
              client: true,
              work_order: true,
            },
          },
        },
      });

      for (const cert of certificates) {
        if (!cert.inspection) continue;
        const clientId = cert.inspection.client_id;
        const projectId = cert.inspection.project_id || cert.inspection.work_order?.project_id || null;
        const fileUrl = cert.pdf_url || `/certificates/${cert.id}/pdf`;
        const certName = `${cert.inspection.client?.name || 'Safety'} - Certificate ${cert.certificate_no}`;

        // Validate Foreign Keys exist in target tables to avoid Foreign Key Constraint errors
        let validClientId: string | null = null;
        if (clientId) {
          const c = await this.prisma.client.findUnique({ where: { id: clientId } });
          if (c) validClientId = clientId;
        }

        let validProjectId: string | null = null;
        if (projectId) {
          const p = await this.prisma.project.findUnique({ where: { id: projectId } });
          if (p) validProjectId = projectId;
        }

        let validEngineerId: string | null = null;
        if (cert.inspection.engineer_id) {
          const u = await this.prisma.user.findUnique({ where: { id: cert.inspection.engineer_id } });
          if (u) validEngineerId = cert.inspection.engineer_id;
        }

        const existingDoc = await this.prisma.document.findFirst({
          where: {
            OR: [
              { file_url: fileUrl },
              { notes: { contains: cert.certificate_no } },
            ],
          },
        });

        if (!existingDoc) {
          await this.prisma.document.create({
            data: {
              name: certName,
              file_url: fileUrl,
              file_type: 'PDF',
              file_size: 102400,
              category: 'CERTIFICATE',
              client_id: validClientId,
              project_id: validProjectId,
              expiry_date: cert.expiry_date,
              test_date: cert.issue_date,
              notes: `Certificate No. ${cert.certificate_no} | Status: ${cert.status || 'ACTIVE'}`,
              uploaded_by: validEngineerId,
            },
          });
        }
      }
    } catch (e) {
      console.error('Error syncing existing certificates to vault:', e);
    }
  }

  async getVaultHierarchy(userPayload?: any) {
    try {
      // 1. Ensure pre-existing certificates are synced to Digital Vault
      await this.syncExistingCertificatesToVault();

      // 2. Identify if request is from a Client user
      let userClientId: string | undefined;

      const userId = userPayload?.userId || userPayload?.id || userPayload?.sub;
      if (userId) {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
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
          userClientId = clientRecord?.id;
        }
      }

      // 3. Query all certificate documents with their relations to ensure NO document is ever missed
      const allCertDocs = await this.prisma.document.findMany({
        where: {
          category: 'CERTIFICATE',
          ...(userClientId ? { client_id: userClientId } : {}),
        },
        include: {
          client: true,
          project: true,
          receipt_uploader: { select: { id: true, name: true } },
        },
        orderBy: { created_at: 'desc' },
      });

      // 4. Query all clients to preserve client metadata
      const allClients = await this.prisma.client.findMany({
        where: userClientId ? { id: userClientId } : {},
        include: {
          projects: {
            orderBy: { created_at: 'desc' },
          },
        },
        orderBy: { name: 'asc' },
      });

      const now = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      let totalCertificates = 0;
      let activeCount = 0;
      let dueSoonCount = 0;
      let expiredCount = 0;

      // Group certificates by client_id -> project_id
      const clientMap = new Map<string, any>();

      // Pre-initialize known clients
      for (const client of allClients) {
        const projectMap = new Map<string, any>();
        for (const project of client.projects) {
          projectMap.set(project.id, {
            project_id: project.id,
            project_name: project.name,
            description: project.description,
            status: project.status,
            certificates: [],
          });
        }
        // General project bucket for direct client documents
        projectMap.set('general', {
          project_id: 'general',
          project_name: 'General / Direct Client Certificates',
          description: 'Certificates linked directly to the client',
          status: 'ACTIVE',
          certificates: [],
        });

        clientMap.set(client.id, {
          client_id: client.id,
          client_name: client.name,
          industry: client.industry,
          city: client.city,
          projectMap,
          total_certificates: 0,
        });
      }

      // Pre-initialize General Unassigned Client for documents without client_id
      const generalClientKey = 'general_unassigned';
      const generalProjectMap = new Map<string, any>();
      generalProjectMap.set('general', {
        project_id: 'general',
        project_name: 'General / Direct Certificates',
        description: 'Certificates stored directly in vault',
        status: 'ACTIVE',
        certificates: [],
      });
      clientMap.set(generalClientKey, {
        client_id: generalClientKey,
        client_name: 'General & Direct Safety Certificates',
        industry: 'General Vault',
        city: 'System',
        projectMap: generalProjectMap,
        total_certificates: 0,
      });

      // Process every single certificate document
      for (const doc of allCertDocs) {
        totalCertificates++;

        // Status calculation
        let computedStatus = 'ACTIVE';
        if (doc.expiry_date) {
          const exp = new Date(doc.expiry_date);
          if (exp.getTime() < now.getTime()) {
            computedStatus = 'EXPIRED';
            expiredCount++;
          } else if (exp.getTime() <= thirtyDaysFromNow.getTime()) {
            computedStatus = 'DUE_SOON';
            dueSoonCount++;
          } else {
            computedStatus = 'ACTIVE';
            activeCount++;
          }
        } else {
          activeCount++;
        }

        // Calculate Due Date (15 days before expiry, if expiry exists)
        let dueDateStr: string | null = null;
        if (doc.expiry_date) {
          const dueDateObj = new Date(doc.expiry_date);
          dueDateObj.setDate(dueDateObj.getDate() - 15);
          dueDateStr = dueDateObj.toISOString().split('T')[0];
        }

        // Extract cert number from notes/name
        let certNumber = null;
        if (doc.notes) {
          const match = doc.notes.match(/Certificate No\.\s*([A-Za-z0-9\/-]+)/i);
          if (match) certNumber = match[1];
        }

        const clientName = doc.client?.name || 'General Safety Client';
        const targetClientId = (doc.client_id && clientMap.has(doc.client_id)) ? doc.client_id : generalClientKey;
        const targetClientNode = clientMap.get(targetClientId);
        targetClientNode.total_certificates++;

        const targetProjectKey = (doc.project_id && targetClientNode.projectMap.has(doc.project_id)) ? doc.project_id : 'general';

        if (!targetClientNode.projectMap.has(targetProjectKey)) {
          targetClientNode.projectMap.set(targetProjectKey, {
            project_id: targetProjectKey,
            project_name: doc.project?.name || 'General / Direct Client Certificates',
            description: 'Project certificates',
            status: 'ACTIVE',
            certificates: [],
          });
        }

        const certItem = {
          id: doc.id,
          certificate_id: doc.id,
          name: doc.name,
          certificate_number: certNumber || 'GSS-CERT-' + doc.id.substring(0, 6).toUpperCase(),
          certificate_type: 'Safety Certificate',
          client_id: targetClientId,
          client_name: clientName,
          project_id: targetProjectKey,
          project_name: targetClientNode.projectMap.get(targetProjectKey).project_name,
          issue_date: doc.test_date ? doc.test_date.toISOString().split('T')[0] : doc.created_at.toISOString().split('T')[0],
          expiry_date: doc.expiry_date ? doc.expiry_date.toISOString().split('T')[0] : null,
          due_date: dueDateStr,
          status: computedStatus,
          file_url: doc.file_url,
          file_type: doc.file_type || 'PDF',
          file_size: doc.file_size || 0,
          created_at: doc.created_at,
          updated_at: doc.updated_at ? doc.updated_at.toISOString() : doc.created_at.toISOString(),
          delivery_receipt_url: doc.delivery_receipt_url || null,
          delivery_receipt_name: doc.delivery_receipt_name || null,
          delivery_receipt_type: doc.delivery_receipt_type || null,
          delivery_receipt_size: doc.delivery_receipt_size || 0,
          delivery_receipt_uploaded_at: doc.delivery_receipt_uploaded_at ? doc.delivery_receipt_uploaded_at.toISOString() : null,
          delivery_receipt_uploaded_by: doc.delivery_receipt_uploaded_by || null,
          receipt_uploader_name: (doc as any).receipt_uploader?.name || null,
        };

        targetClientNode.projectMap.get(targetProjectKey).certificates.push(certItem);
      }

      // Convert clientMap and projectMaps to clean response hierarchy
      const hierarchy = Array.from(clientMap.values())
        .map((clientNode) => {
          const projectsList = Array.from(clientNode.projectMap.values()).filter((p: any) => p.certificates.length > 0);
          return {
            client_id: clientNode.client_id,
            client_name: clientNode.client_name,
            industry: clientNode.industry,
            city: clientNode.city,
            projects: projectsList,
            total_certificates: clientNode.total_certificates,
          };
        })
        .filter((c) => c.total_certificates > 0 || c.projects.length > 0);

      return {
        hierarchy,
        stats: {
          total_certificates: totalCertificates,
          active: activeCount,
          due_soon: dueSoonCount,
          expired: expiredCount,
        },
      };
    } catch (error) {
      console.error('Error in getVaultHierarchy:', error);
      return {
        hierarchy: [],
        stats: { total_certificates: 0, active: 0, due_soon: 0, expired: 0 }
      };
    }
  }

  async findAll(filters: any, userPayload?: any) {
    try {
      let clientId: string | undefined;

      const userId = userPayload?.userId || userPayload?.id || userPayload?.sub;
      if (userId) {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
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

      return await this.prisma.document.findMany({
        where: {
          category: filters.category,
          client_id: clientId ? clientId : filters.client_id,
          project_id: filters.project_id,
          lead_id: filters.lead_id,
        },
        include: {
          client: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
          lead: { select: { id: true, company_name: true } },
          uploader: { select: { id: true, name: true } },
        },
        orderBy: { created_at: 'desc' },
      });
    } catch (error) {
      console.error('Error in DocumentsService.findAll:', error);
      return [];
    }
  }

  async findOne(id: string) {
    const doc = await this.prisma.document.findUnique({
      where: { id },
      include: {
        client: true,
        project: true,
        compliance: true,
        uploader: true,
      },
    });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  async create(data: any, uploaderId?: string) {
    try {
      const cleanUuid = (val: any): string | null => {
        if (!val || val === 'null' || val === 'undefined' || val === 'None' || typeof val !== 'string') return null;
        const trimmed = val.trim();
        return (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') ? null : trimmed;
      };

      const clientId = cleanUuid(data.client_id);
      const projectId = cleanUuid(data.project_id);
      const leadId = cleanUuid(data.lead_id);
      const complianceId = cleanUuid(data.compliance_id);
      const uploadedBy = cleanUuid(uploaderId);

      // Validate foreign keys against DB to prevent 500 Foreign Key Constraint Violation errors
      let validClientId: string | null = null;
      if (clientId) {
        const c = await this.prisma.client.findUnique({ where: { id: clientId } });
        if (c) validClientId = clientId;
      }

      let validProjectId: string | null = null;
      if (projectId) {
        const p = await this.prisma.project.findUnique({ where: { id: projectId } });
        if (p) validProjectId = projectId;
      }

      let validLeadId: string | null = null;
      if (leadId) {
        const l = await this.prisma.lead.findUnique({ where: { id: leadId } });
        if (l) validLeadId = leadId;
      }

      let validComplianceId: string | null = null;
      if (complianceId) {
        const c = await this.prisma.compliance.findUnique({ where: { id: complianceId } });
        if (c) validComplianceId = complianceId;
      }

      let validUploadedBy: string | null = null;
      if (uploadedBy) {
        const u = await this.prisma.user.findUnique({ where: { id: uploadedBy } });
        if (u) validUploadedBy = uploadedBy;
      }

      return await this.prisma.document.create({
        data: {
          name: data.name || 'Untitled Document',
          file_url: data.file_url || '#',
          file_type: data.file_type || 'PDF',
          file_size: Number(data.file_size) || 0,
          category: data.category || 'OTHER',
          client_id: validClientId,
          lead_id: validLeadId,
          project_id: validProjectId,
          compliance_id: validComplianceId,
          expiry_date: data.expiry_date && !isNaN(Date.parse(data.expiry_date)) ? new Date(data.expiry_date) : null,
          test_date: data.test_date && !isNaN(Date.parse(data.test_date)) ? new Date(data.test_date) : null,
          notes: data.notes || null,
          uploaded_by: validUploadedBy,
        },
      });
    } catch (error) {
      console.error('Error creating document in DB:', error);
      throw error;
    }
  }

  async delete(id: string) {
    return this.prisma.document.delete({
      where: { id },
    });
  }

  async uploadDeliveryReceipt(id: string, file: any, uploaderId?: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');

    if (!file || !file.buffer) {
      throw new BadRequestException('File is required');
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds maximum allowed limit of 10MB');
    }

    // Validate file type (JPG, PNG, PDF)
    const originalName = file.originalname || 'receipt.pdf';
    const ext = originalName.split('.').pop()?.toLowerCase() || '';
    const allowedExts = ['jpg', 'jpeg', 'png', 'pdf'];
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];

    if (!allowedExts.includes(ext) && !allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file format. Only JPG, PNG, and PDF files are allowed for delivery receipts.');
    }

    const receiptUrl = await this.localStorageService.saveFile(file.buffer, originalName);

    let validUploadedBy: string | null = null;
    if (uploaderId) {
      const u = await this.prisma.user.findUnique({ where: { id: uploaderId } });
      if (u) validUploadedBy = uploaderId;
    }

    const fileType = ext === 'pdf' ? 'PDF' : 'IMAGE';

    return this.prisma.document.update({
      where: { id },
      data: {
        delivery_receipt_url: receiptUrl,
        delivery_receipt_name: originalName,
        delivery_receipt_type: fileType,
        delivery_receipt_size: file.size || 0,
        delivery_receipt_uploaded_at: new Date(),
        delivery_receipt_uploaded_by: validUploadedBy,
      },
      include: {
        receipt_uploader: { select: { id: true, name: true } },
      },
    });
  }

  async deleteDeliveryReceipt(id: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');

    return this.prisma.document.update({
      where: { id },
      data: {
        delivery_receipt_url: null,
        delivery_receipt_name: null,
        delivery_receipt_type: null,
        delivery_receipt_size: null,
        delivery_receipt_uploaded_at: null,
        delivery_receipt_uploaded_by: null,
      },
    });
  }
}
