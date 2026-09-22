import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async logActivity(projectId: string, action: string, performedBy?: string, remarks?: string) {
    try {
      return await this.prisma.projectActivity.create({
        data: {
          project_id: projectId,
          action,
          performed_by: performedBy || 'System Automation',
          remarks: remarks || null,
        },
      });
    } catch (e) {
      console.warn(`[ProjectsService] Failed to log activity for project ${projectId}:`, e?.message);
    }
  }

  async updateStage(projectId: string, stage: string, remarks?: string, performedBy?: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');

    const updated = await this.prisma.project.update({
      where: { id: projectId },
      data: {
        stage,
        status: stage === 'PROJECT_CLOSED' ? 'COMPLETED' : project.status,
      },
    });

    await this.logActivity(
      projectId,
      `Stage updated to ${stage.replace(/_/g, ' ')}`,
      performedBy,
      remarks || `Lifecycle stage automatically advanced to ${stage}`,
    );

    return updated;
  }

  async findAll(clientId?: string) {
    return this.prisma.project.findMany({
      where: clientId ? { client_id: clientId } : undefined,
      include: {
        client: true,
        quotation: {
          select: {
            id: true,
            quote_number: true,
            total_amount: true,
            status: true,
          },
        },
        activities: {
          orderBy: { performed_at: 'desc' },
          take: 5,
        },
        documents: true,
        inspections: true,
        tasks: {
          include: { assignee: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.project.findUnique({
      where: { id },
      include: {
        client: true,
        quotation: {
          include: { items: true, invoice: true },
        },
        activities: {
          orderBy: { performed_at: 'desc' },
        },
        documents: true,
        inspections: {
          include: { items: true, engineer: true },
        },
        tasks: {
          include: { assignee: true },
        },
      },
    });
  }

  async create(data: any) {
    const project = await this.prisma.project.create({
      data: {
        client_id: data.client_id,
        quotation_id: data.quotation_id || null,
        name: data.name,
        description: data.description || null,
        contract_value: data.contract_value ? Number(data.contract_value) : 0.0,
        stage: data.stage || 'PROJECT_CREATED',
        status: data.status || 'PENDING',
        start_date: data.start_date ? new Date(data.start_date) : null,
        end_date: data.end_date ? new Date(data.end_date) : null,
        order_number: data.order_number || null,
        order_date: data.order_date ? new Date(data.order_date) : null,
      },
    });

    await this.logActivity(
      project.id,
      'Project Initialized',
      data.created_by || 'Admin',
      `Project created for client ${project.client_id}`,
    );

    return project;
  }

  async update(id: string, data: any) {
    const existing = await this.prisma.project.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Project not found');

    const { id: _id, client_id: _cid, quotation_id: _qid, updated_by, remarks, ...allowedData } = data;

    if (allowedData.contract_value !== undefined) {
      allowedData.contract_value = Number(allowedData.contract_value) || 0;
    }
    if (allowedData.start_date) {
      allowedData.start_date = new Date(allowedData.start_date);
    }
    if (allowedData.end_date) {
      allowedData.end_date = new Date(allowedData.end_date);
    }
    if (allowedData.order_date) {
      allowedData.order_date = new Date(allowedData.order_date);
    }
    if (allowedData.order_number !== undefined) {
      allowedData.order_number = allowedData.order_number ? String(allowedData.order_number).trim() : null;
    }

    const project = await this.prisma.project.update({
      where: { id },
      data: allowedData,
    });

    if (data.stage && data.stage !== existing.stage) {
      await this.logActivity(id, `Stage set to ${data.stage}`, updated_by, remarks);
    } else {
      await this.logActivity(id, 'Project Details Updated', updated_by || 'Admin', remarks || `Project details updated`);
    }

    return project;
  }

  async getProjectDashboard(id: string) {
    const project = await this.findOne(id);
    if (!project) throw new NotFoundException('Project not found');

    const totalTasks = project.tasks.length;
    const completedTasks = project.tasks.filter((t) => t.status === 'DONE').length;
    const pendingTasks = totalTasks - completedTasks;

    let progressPercent = 0;
    if (totalTasks > 0) {
      progressPercent = Math.round((completedTasks / totalTasks) * 100);
    } else if (project.stage === 'PROJECT_CLOSED') {
      progressPercent = 100;
    } else if (project.stage === 'CERTIFICATE_GENERATED' || project.stage === 'DOCUMENTS_DELIVERED') {
      progressPercent = 85;
    } else if (project.stage === 'INSPECTION_COMPLETED') {
      progressPercent = 60;
    } else if (project.stage === 'INSPECTION_SCHEDULED' || project.stage === 'ENGINEER_ASSIGNED') {
      progressPercent = 35;
    } else {
      progressPercent = 15;
    }

    const totalInspections = project.inspections.length;
    const completedInspections = project.inspections.filter((i) => i.status === 'COMPLETED').length;
    const upcomingInspections = project.inspections.filter((i) => i.status === 'SCHEDULED' || i.status === 'DRAFT').length;

    const totalDocuments = project.documents.length;
    const certificatesCount = project.documents.filter((d) => d.category === 'CERTIFICATE' || d.category === 'COMPLIANCE').length;

    // Check financial invoice status
    let invoiceStatus = 'PENDING';
    let invoiceNumber = null;
    let invoiceAmount = Number(project.contract_value) || 0;

    if (project.quotation && project.quotation.invoice) {
      invoiceStatus = project.quotation.invoice.status || 'UNPAID';
      invoiceNumber = project.quotation.invoice.invoice_number;
      invoiceAmount = Number(project.quotation.invoice.total_amount) || invoiceAmount;
    }

    return {
      project,
      progressPercent,
      taskSummary: {
        total: totalTasks,
        completed: completedTasks,
        pending: pendingTasks,
      },
      inspectionSummary: {
        total: totalInspections,
        completed: completedInspections,
        upcoming: upcomingInspections,
      },
      documentSummary: {
        total: totalDocuments,
        certificates: certificatesCount,
      },
      financialSummary: {
        quotationNumber: project.quotation?.quote_number || null,
        contractValue: Number(project.contract_value) || Number(project.quotation?.total_amount) || 0,
        invoiceNumber,
        invoiceStatus,
        invoiceAmount,
      },
      recentActivities: project.activities,
    };
  }

  async remove(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        work_orders: { select: { id: true } },
        inspections: { select: { id: true } },
        documents: { select: { id: true } },
        tasks: { select: { id: true } },
        activities: { select: { id: true } },
      },
    });

    if (!project) throw new NotFoundException('Project not found');

    const hasDependencies =
      (project.work_orders?.length || 0) > 0 ||
      (project.inspections?.length || 0) > 0 ||
      (project.documents?.length || 0) > 0;

    if (hasDependencies) {
      throw new BadRequestException(
        'This project cannot be deleted because it contains associated work orders, site inspections, or documents.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.task.deleteMany({ where: { project_id: id } });
      await tx.projectActivity.deleteMany({ where: { project_id: id } });
      return tx.project.delete({ where: { id } });
    });
  }
}

