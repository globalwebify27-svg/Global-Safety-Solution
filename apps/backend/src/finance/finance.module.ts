import { Module } from '@nestjs/common';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { AccountingModule } from '../accounting/accounting.module';
import { EmailManagementModule } from '../email-management/email-management.module';

@Module({
  imports: [AccountingModule, EmailManagementModule],
  controllers: [InvoicesController, PaymentsController],
  providers: [InvoicesService, PaymentsService],
  exports: [InvoicesService, PaymentsService],
})
export class FinanceModule {}
