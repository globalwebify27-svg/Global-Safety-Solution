import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { ClientsModule } from './clients/clients.module';
import { ComplianceModule } from './compliance/compliance.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';
import { AttendanceModule } from './attendance/attendance.module';
import { LeadsModule } from './leads/leads.module';
import { QuotationsModule } from './quotations/quotations.module';
import { InventoryModule } from './inventory/inventory.module';
import { AssetsModule } from './assets/assets.module';
import { DocumentsModule } from './documents/documents.module';
import { SettingsModule } from './settings/settings.module';
import { FinanceModule } from './finance/finance.module';
import { InspectionsModule } from './inspections/inspections.module';
import { NotificationsModule } from './notifications/notifications.module';
import { HRModule } from './hr/hr.module';
import { CommonModule } from './common/common.module';
import { RBACModule } from './rbac/rbac.module';
import { VendorsModule } from './vendors/vendors.module';
import { ExpensesModule } from './expenses/expenses.module';
import { AutomationsModule } from './automations/automations.module';
import { ServiceProductsModule } from './service-products/service-products.module';
import { WorkOrdersModule } from './work-orders/work-orders.module';
import { CertificatesModule } from './certificates/certificates.module';
import { AccountingModule } from './accounting/accounting.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    AuthModule,
    UsersModule,
    PrismaModule,
    ClientsModule,
    ComplianceModule,
    DashboardModule,
    ProjectsModule,
    TasksModule,
    AttendanceModule,
    LeadsModule,
    QuotationsModule,
    InventoryModule,
    AssetsModule,
    DocumentsModule,
    SettingsModule,
    FinanceModule,
    InspectionsModule,
    NotificationsModule,
    HRModule,
    CommonModule,
    RBACModule,
    VendorsModule,
    ExpensesModule,
    AutomationsModule,
    ServiceProductsModule,
    WorkOrdersModule,
    CertificatesModule,
    AccountingModule,
  ],

  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
