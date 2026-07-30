import { Injectable, NotFoundException } from '@nestjs/common';
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

  async findAll() {
    return this.prisma.project.findMany({
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
    const project = await this.prisma.project.update({
      where: { id },
      data,
    });

    if (data.stage) {
      await this.logActivity(id, `Stage set to ${data.stage}`, data.updated_by, data.remarks);
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
    return this.prisma.project.delete({
      where: { id },
    });
  }
}
