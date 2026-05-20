import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getOverviewStats() {
    const activeProjects = await this.prisma.project.count({
      where: { status: 'ONGOING' },
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
