import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@repo/database';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string): Promise<any | null> {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: { include: { permission: true } },
                feature_permissions: true,
              },
            },
          },
        },
        user_feature_overrides: true,
      },
    });
  }

  async findById(id: string): Promise<any | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        attendance: {
          take: 10,
          orderBy: { created_at: 'desc' },
        },
      },
    });
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        is_active: true,
        designation: true,
        department: true,
        employee_id: true,
        join_date: true,
        base_salary: true,
        leave_balance: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async updateProfile(id: string, data: any) {
    return this.prisma.user.update({
      where: { id },
      data: {
        name: data.name || undefined,
        email: data.email || undefined,
        phone: data.phone || undefined,
        is_active: data.is_active !== undefined ? data.is_active : undefined,
        designation: data.designation || undefined,
        department: data.department || undefined,
        address: data.address || undefined,
        pan_number: data.pan_number || undefined,
        aadhar_number: data.aadhar_number || undefined,
        pf_number: data.pf_number || undefined,
        esi_number: data.esi_number || undefined,
        base_salary: data.base_salary
          ? new Prisma.Decimal(data.base_salary)
          : undefined,
        emergency_contact_name: data.emergency_contact_name || undefined,
        emergency_contact_phone: data.emergency_contact_phone || undefined,
      },
    });
  }

  async create(data: any) {
    // Auto-generate Professional Employee ID: GSS/EMP/YYYY/NNN
    const year = new Date().getFullYear();
    const count = await this.prisma.user.count({
      where: {
        created_at: {
          gte: new Date(year, 0, 1),
          lt: new Date(year + 1, 0, 1),
        },
      },
    });
    const employeeId = `GSS/EMP/${year}/${String(count + 1).padStart(3, '0')}`;

    if (data.password_hash) {
      data.password_hash = await bcrypt.hash(data.password_hash, 10);
    } else {
      data.password_hash = await bcrypt.hash('Staff@123', 10);
    }

    const { role_id, ...userData } = data;

    return this.prisma.user.create({
      data: {
        ...userData,
        employee_id: employeeId,
        base_salary: data.base_salary
          ? new Prisma.Decimal(data.base_salary)
          : undefined,
        join_date: data.join_date ? new Date(data.join_date) : new Date(),
        roles: role_id ? {
          create: {
            role_id: role_id
          }
        } : undefined
      },
    });
  }

  async getEmployeeProfile(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        attendance: {
          orderBy: { created_at: 'desc' },
          take: 30, // Last 30 days
        },
        leave_requests: {
          orderBy: { created_at: 'desc' },
        },
        tasks: {
          where: { status: { not: 'COMPLETED' } },
        },
        assets: true,
      },
    });

    if (!user) throw new Error('Employee not found');

    // Calculate attendance percentage for current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthAttendance = user.attendance.filter(
      (a) => new Date(a.created_at) >= startOfMonth,
    );

    return {
      ...user,
      stats: {
        present_days: monthAttendance.length,
        attendance_rate: (
          (monthAttendance.length / now.getDate()) *
          100
        ).toFixed(1),
        pending_tasks: user.tasks.length,
      },
    };
  }

  async createSuperAdmin() {
    const password_hash = await bcrypt.hash('superadmin123', 10);
    const existing = await this.prisma.user.findUnique({
      where: { email: 'admin@globalsafety.com' },
    });
    if (!existing) {
      return this.prisma.user.create({
        data: {
          name: 'Super Admin',
          email: 'admin@globalsafety.com',
          password_hash,
          is_active: true,
          is_email_verified: true,
        },
      });
    }
    return existing;
  }
}
