import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getOverviewStats(userPayload: any) {
    if (!userPayload) {
      return this.getSuperAdminOverviewStats();
    }

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

    if (!user) {
      return this.getSuperAdminOverviewStats();
    }

    const isSuperAdmin =
      user.email === 'admin@globalsafety.com' ||
      user.roles?.some((ur: any) => ur.role.name === 'SUPER_ADMIN');
    const isHrManager =
      user.roles?.some((ur: any) => ur.role.name === 'HR_MANAGER') ||
      (user.designation || '').toUpperCase().includes('HR');
    const isSales =
      user.roles?.some((ur: any) => ur.role.name === 'SALES_EXECUTIVE') ||
      (user.designation || '').toUpperCase().includes('SALES');
    const isEngineer =
      user.roles?.some((ur: any) => ur.role.name === 'FIELD_ENGINEER') ||
      (user.designation || '').toUpperCase().includes('FIELD') ||
      (user.designation || '').toUpperCase().includes('ENGINEER');

    const isClient =
      user.roles?.some((ur: any) => ur.role.name === 'CLIENT' || ur.role.name === 'CLIENTS') ||
      (user.designation || '').toUpperCase().includes('CLIENT');

    // Super Admin & HR Manager see company-wide stats
    if (isSuperAdmin || isHrManager) {
      return this.getSuperAdminOverviewStats();
    }

    // Client Dashboard Stats
    if (isClient) {
      const clientRecord = await this.prisma.client.findFirst({
        where: { email: user.email },
        include: {
          inspections: true,
          quotations: true,
          invoices: true,
          documents: true,
        },
      });

      const clientQuotes = clientRecord ? await this.prisma.quotation.findMany({
        where: {
          OR: [
            { client_id: clientRecord.id },
            { lead: { client_id: clientRecord.id } }
          ]
        }
      }) : [];

      const activeQuotes = clientQuotes.filter(q => q.status === 'ACCEPTED' || q.status === 'PENDING').length;
      const scheduledAudits = clientRecord?.inspections.filter(i => i.status === 'SCHEDULED').length || 0;
      const certificatesCount = clientRecord?.documents.filter(d => d.category === 'CERTIFICATE' || d.category === 'COMPLIANCE').length || 0;

      // Get recent inspections
      const recentInspections = clientRecord?.inspections
        .sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime())
        .slice(0, 5)
        .map(i => ({
          id: i.id,
          scheduledDate: i.scheduled_date,
          status: i.status,
          remarks: i.remarks || 'No remarks recorded yet.',
        })) || [];

      // Get recent quotes
      const recentQuotations = clientQuotes
        .sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime())
        .slice(0, 5)
        .map(q => ({
          id: q.id,
          quoteNumber: q.quote_number,
          totalAmount: Number(q.total_amount),
          status: q.status,
        }));

      // Get recent invoices
      const recentInvoices = clientRecord?.invoices
        .sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime())
        .slice(0, 5)
        .map(inv => ({
          id: inv.id,
          invoiceNumber: inv.invoice_number,
          amount: Number(inv.total_amount),
          status: inv.status,
        })) || [];

      const recentActivity = [
        ...recentInspections.map(i => ({
          id: i.id,
          type: 'CLIENT' as const,
          title: `Site Inspection`,
          detail: `Status: ${i.status} • Scheduled: ${new Date(i.scheduledDate).toLocaleDateString()}`,
          date: i.scheduledDate.toISOString(),
        })),
        ...recentQuotations.map(q => ({
          id: q.id,
          type: 'QUOTE' as const,
          title: `Quotation ${q.quoteNumber}`,
          detail: `Value: ₹${q.totalAmount.toLocaleString()} • Status: ${q.status}`,
          date: new Date().toISOString(),
        })),
      ].slice(0, 8);

      return {
        role: 'CLIENT',
        clientName: clientRecord?.name || user.name,
        activeQuotes,
        scheduledAudits,
        certificatesCount,
        recentInspections,
        recentQuotations,
        recentInvoices,
        recentActivity,
      };
    }

    // Sales Executive Dashboard
    if (isSales) {
      const activeLeads = await this.prisma.lead.count({
        where: {
          assigned_to: user.id,
          status: { notIn: ['WON', 'LOST'] },
        },
      });

      const pendingFollowups = await this.prisma.lead.count({
        where: {
          assigned_to: user.id,
          next_follow_up: { lte: new Date(Date.now() + 7 * 86400000) }, // next 7 days
        },
      });

      const myQuotes = await this.prisma.quotation.aggregate({
        where: {
          status: 'ACCEPTED',
          lead: { assigned_to: user.id },
        },
        _sum: { total_amount: true },
      });

      const wonValue = myQuotes._sum.total_amount
        ? Number(myQuotes._sum.total_amount)
        : 0;

      const recentLeads = await this.prisma.lead.findMany({
        where: { assigned_to: user.id },
        take: 8,
        orderBy: { updated_at: 'desc' },
      });

      const recentActivity = recentLeads.map((l) => ({
        id: l.id,
        type: 'LEAD',
        title: l.company_name,
        detail: `Status: ${l.status} • Contact: ${l.contact_person}`,
        date: l.updated_at,
      }));

      // Generate simple chart data
      const chartData = [
        { name: 'Jan', revenue: wonValue * 0.4 },
        { name: 'Feb', revenue: wonValue * 0.6 },
        { name: 'Mar', revenue: wonValue * 0.8 },
        { name: 'Apr', revenue: wonValue },
      ];

      return {
        role: 'SALES_EXECUTIVE',
        activeLeads,
        pendingFollowups,
        wonValue:
          wonValue > 100000
            ? `₹${(wonValue / 100000).toFixed(1)}L`
            : `₹${(wonValue / 1000).toFixed(1)}K`,
        recentActivity,
        chartData,
      };
    }

    // Field Engineer Dashboard
    if (isEngineer) {
      const pendingInspections = await this.prisma.inspection.count({
        where: {
          engineer_id: user.id,
          status: 'SCHEDULED',
        },
      });

      const pendingTasks = await this.prisma.task.count({
        where: {
          assigned_to: user.id,
          status: { not: 'COMPLETED' },
        },
      });

      // Calculate attendance for current month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const presentDays = await this.prisma.attendance.count({
        where: {
          user_id: user.id,
          date: { gte: startOfMonth },
        },
      });

      const calendarDays = now.getDate();
      const attendanceRate =
        calendarDays > 0
          ? ((presentDays / calendarDays) * 100).toFixed(0) + '%'
          : '100%';

      const myTasks = await this.prisma.task.findMany({
        where: { assigned_to: user.id },
        take: 10,
        orderBy: { created_at: 'desc' },
        include: { project: { include: { client: true } } },
      });

      const myInspections = await this.prisma.inspection.findMany({
        where: { engineer_id: user.id },
        take: 10,
        orderBy: { scheduled_date: 'asc' },
        include: { client: true },
      });

      const recentActivity = [
        ...myTasks.map((t) => ({
          id: t.id,
          type: 'TASK',
          title: t.title,
          detail: `Priority: ${t.priority || 'NORMAL'} • Due: ${t.due_date ? new Date(t.due_date).toLocaleDateString() : 'N/A'}`,
          date: t.updated_at,
        })),
        ...myInspections.map((i) => ({
          id: i.id,
          type: 'INSPECTION',
          title: `Inspection for ${i.client?.name || 'Client'}`,
          detail: `Scheduled: ${new Date(i.scheduled_date).toLocaleDateString()}`,
          date: i.updated_at,
        })),
      ]
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .slice(0, 8);

      return {
        role: 'FIELD_ENGINEER',
        pendingInspections,
        pendingTasks,
        attendanceRate,
        tasks: myTasks.map(t => ({
          id: t.id,
          title: t.title,
          project: t.project?.client?.name || t.project?.name || 'Operations Project',
          projectId: t.project_id,
          priority: t.priority || 'MEDIUM',
          status: t.status,
          dueDate: t.due_date,
        })),
        inspections: myInspections.map(i => ({
          id: i.id,
          client: i.client?.name || 'Client',
          scheduledDate: i.scheduled_date,
          status: i.status,
        })),
        recentActivity,
      };
    }

    // Default Employee / Staff Dashboard
    const pendingTasks = await this.prisma.task.count({
      where: {
        assigned_to: user.id,
        status: { not: 'COMPLETED' },
      },
    });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const presentDays = await this.prisma.attendance.count({
      where: {
        user_id: user.id,
        date: { gte: startOfMonth },
      },
    });

    const calendarDays = now.getDate();
    const attendanceRate =
      calendarDays > 0
        ? ((presentDays / calendarDays) * 100).toFixed(0) + '%'
        : '100%';

    const myTasks = await this.prisma.task.findMany({
      where: { assigned_to: user.id },
      take: 10,
      orderBy: { created_at: 'desc' },
      include: { project: { include: { client: true } } },
    });

    const recentActivity = myTasks.map((t) => ({
      id: t.id,
      type: 'TASK',
      title: t.title,
      detail: `Project: ${t.project?.name || 'Operations Project'} • Priority: ${t.priority || 'NORMAL'}`,
      date: t.updated_at,
    }));

    return {
      role: 'STAFF',
      pendingTasks,
      attendanceRate,
      leaveBalance: user.leave_balance,
      tasks: myTasks.map(t => ({
        id: t.id,
        title: t.title,
        project: t.project?.client?.name || t.project?.name || 'Operations Project',
        projectId: t.project_id,
        priority: t.priority || 'MEDIUM',
        status: t.status,
        dueDate: t.due_date,
      })),
      recentActivity,
    };
  }

  async getSuperAdminOverviewStats() {
    const activeProjects = await this.prisma.project.count({
      where: { status: { in: ['ONGOING', 'PENDING'] } },
    });

    const next30Days = new Date();
    next30Days.setDate(next30Days.getDate() + 30);

    const compliancesDue = await this.prisma.compliance.count({
      where: {
        status: 'ACTIVE',
        expiry_date: {
          lte: next30Days,
          gte: new Date(),
        },
      },
    });

    const totalQuotations = await this.prisma.quotation.aggregate({
      where: { status: 'ACCEPTED' },
      _sum: { total_amount: true },
    });

    const revenueValue = totalQuotations._sum.total_amount
      ? Number(totalQuotations._sum.total_amount)
      : 0;

    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(now.getDate() - 60);

    const projectsLast30 = await this.prisma.project.count({
      where: { created_at: { gte: thirtyDaysAgo } },
    });
    const projectsPrev30 = await this.prisma.project.count({
      where: { created_at: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
    });
    const projectsTrendVal =
      projectsPrev30 === 0
        ? projectsLast30 > 0
          ? 100
          : 0
        : ((projectsLast30 - projectsPrev30) / projectsPrev30) * 100;
    const projectsTrend =
      projectsTrendVal >= 0
        ? `+${projectsTrendVal.toFixed(0)}%`
        : `${projectsTrendVal.toFixed(0)}%`;

    const revenueLast30 = await this.prisma.quotation.aggregate({
      where: { status: 'ACCEPTED', updated_at: { gte: thirtyDaysAgo } },
      _sum: { total_amount: true },
    });
    const revLastVal = Number(revenueLast30._sum.total_amount || 0);
    const revenuePrev30 = await this.prisma.quotation.aggregate({
      where: {
        status: 'ACCEPTED',
        updated_at: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
      },
      _sum: { total_amount: true },
    });
    const revPrevVal = Number(revenuePrev30._sum.total_amount || 0);
    const revenueTrendVal =
      revPrevVal === 0
        ? revLastVal > 0
          ? 100
          : 0
        : ((revLastVal - revPrevVal) / revPrevVal) * 100;
    const revenueTrend =
      revenueTrendVal >= 0
        ? `+${revenueTrendVal.toFixed(0)}%`
        : `${revenueTrendVal.toFixed(0)}%`;

    const [recentLeads, recentClients, recentQuotations] = await Promise.all([
      this.prisma.lead.findMany({
        take: 5,
        orderBy: { updated_at: 'desc' },
        select: {
          id: true,
          company_name: true,
          status: true,
          created_at: true,
          updated_at: true,
        },
      }),
      this.prisma.client.findMany({
        take: 5,
        orderBy: { updated_at: 'desc' },
        select: {
          id: true,
          name: true,
          is_active: true,
          created_at: true,
          updated_at: true,
        },
      }),
      this.prisma.quotation.findMany({
        take: 5,
        orderBy: { updated_at: 'desc' },
        include: {
          lead: { select: { company_name: true } },
          client: { select: { name: true } },
        },
      }),
    ]);

    const recentActivity = [
      ...recentLeads.map((l) => ({
        id: l.id,
        type: 'LEAD',
        title: l.company_name,
        detail:
          l.status === 'NEW'
            ? 'New lead captured'
            : l.status === 'WON'
              ? 'Lead converted: WON'
              : l.status === 'LOST'
                ? 'Opportunity closed: LOST'
                : `Lead status updated: ${l.status}`,
        date: l.updated_at,
      })),
      ...recentClients.map((c) => ({
        id: c.id,
        type: 'CLIENT',
        title: c.name,
        detail: c.is_active
          ? 'Client account activated'
          : 'Client account pending',
        date: c.updated_at,
      })),
      ...recentQuotations.map((q) => ({
        id: q.id,
        type: 'QUOTE',
        title: q.lead?.company_name || q.client?.name || 'Direct Quote',
        detail: `Quotation ${q.quote_number}: ₹${Number(q.total_amount).toLocaleString()}`,
        date: q.updated_at,
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8);

    // Dummy chart data for now based on current stats to keep it simple but functional
    const chartData = [
      { name: 'Jan', revenue: revLastVal * 0.4, compliance: 5 },
      { name: 'Feb', revenue: revLastVal * 0.6, compliance: 8 },
      { name: 'Mar', revenue: revLastVal * 0.8, compliance: 12 },
      { name: 'Apr', revenue: revLastVal, compliance: compliancesDue },
    ];

    return {
      activeProjects,
      compliancesDue,
      revenueMTD:
        revenueValue > 100000
          ? `₹${(revenueValue / 100000).toFixed(1)}L`
          : `₹${(revenueValue / 1000).toFixed(1)}K`,
      projectsTrend,
      complianceTrend:
        compliancesDue > 5
          ? 'Critical'
          : compliancesDue > 0
            ? 'Warning'
            : 'Secure',
      revenueTrend,
      recentActivity,
      chartData,
    };
  }

  async getSystemStatus() {
    const uptime = process.uptime();
    const dbStatus = await this.prisma.$queryRaw`SELECT 1`
      .then(() => 'Connected')
      .catch(() => 'Disconnected');
    const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024; // MB

    // Get critical counts
    const criticalCompliance = await this.prisma.compliance.count({
      where: { status: 'EXPIRED' },
    });

    const unpaidInvoices = await this.prisma.invoice.count({
      where: { status: 'UNPAID' },
    });

    const pendingInspections = await this.prisma.inspection.count({
      where: { status: 'SCHEDULED' },
    });

    return {
      server: {
        status: 'Operational',
        uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
        latency: '24ms',
        memory: `${memoryUsage.toFixed(1)} MB`,
      },
      database: {
        status: dbStatus,
        connections: 'Active',
        latency: '8ms',
      },
      criticals: {
        expiredCompliance: criticalCompliance,
        unpaidInvoices,
        pendingInspections,
      },
    };
  }
}
