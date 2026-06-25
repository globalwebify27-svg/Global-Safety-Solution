import { Controller, Get, Post, Body, Query, Req, UseGuards } from '@nestjs/common';
import { AccountingService } from './accounting.service';

@Controller('accounting')
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  @Get('accounts')
  async getAccounts() {
    return this.accountingService.getAccounts();
  }

  @Post('accounts')
  async createAccount(
    @Body() body: { name: string; code: string; type: string; parent_id?: string; opening_balance?: number }
  ) {
    return this.accountingService.createAccount(body);
  }

  @Get('vouchers')
  async getVouchers() {
    return this.accountingService.getVouchers();
  }

  @Post('vouchers')
  async postVoucher(@Body() body: any, @Req() req: any) {
    const user = req.user?.email || 'Admin';
    return this.accountingService.postVoucher({
      ...body,
      created_by: user,
    });
  }

  @Post('transactions')
  async postTransaction(@Body() body: any, @Req() req: any) {
    const user = req.user?.email || 'Admin';
    return this.accountingService.postTransaction({
      ...body,
      created_by: user,
    });
  }

  @Get('reports')
  async getReports(
    @Query('period') period: 'monthly' | 'halfyearly' | 'yearly',
    @Query('year') year: string,
    @Query('month') month?: string,
  ) {
    return this.accountingService.getFinancialReports({
      period,
      year: Number(year),
      month: month ? Number(month) : undefined,
    });
  }

  @Get('audit')
  async getAuditLog() {
    return this.accountingService.getAuditLog();
  }
}
