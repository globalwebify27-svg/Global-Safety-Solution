import { Controller, Get, Post, Put, Patch, Body, Query, Param, Req, UseGuards } from "@nestjs/common";
import { AccountingService } from "./accounting.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("accounting")
@UseGuards(JwtAuthGuard)
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  @Get("accounts")
  async getAccounts() {
    return this.accountingService.getAccounts();
  }

  @Post("accounts")
  async createAccount(@Body() body: { name: string; code: string; type: string; parent_id?: string; opening_balance?: number }, @Req() req: any) {
    const user = req.user?.name 
      ? `${req.user.name}${req.user.employee_id ? " (" + req.user.employee_id + ")" : ""}` 
      : (req.user?.email === "admin@globalsafety.com" || req.user?.email === "amrvbloggers@gmail.com" ? "Super Admin (SYSTEM)" : req.user?.email || "System");
    return this.accountingService.createAccount({ ...body, created_by: user });
  }

  @Get("accounts/:id/ledger")
  async getAccountLedger(@Param("id") id: string, @Query("startDate") startDate?: string, @Query("endDate") endDate?: string) {
    return this.accountingService.getAccountLedger(id, startDate, endDate);
  }

  @Put("accounts/:id/opening-balance")
  async updateOpeningBalance(@Param("id") id: string, @Body() body: { amount: number }, @Req() req: any) {
    const user = req.user?.name 
      ? `${req.user.name}${req.user.employee_id ? " (" + req.user.employee_id + ")" : ""}` 
      : (req.user?.email === "admin@globalsafety.com" || req.user?.email === "amrvbloggers@gmail.com" ? "Super Admin (SYSTEM)" : req.user?.email || "System");
    return this.accountingService.updateOpeningBalance(id, body.amount, user);
  }

  @Get("vouchers")
  async getVouchers() {
    return this.accountingService.getVouchers();
  }

  @Post("vouchers")
  async postVoucher(@Body() body: any, @Req() req: any) {
    const user = req.user?.name 
      ? `${req.user.name}${req.user.employee_id ? " (" + req.user.employee_id + ")" : ""}` 
      : (req.user?.email === "admin@globalsafety.com" || req.user?.email === "amrvbloggers@gmail.com" ? "Super Admin (SYSTEM)" : req.user?.email || "System");
    return this.accountingService.postVoucher({ ...body, created_by: user });
  }

  @Patch("vouchers/:id/correct")
  async correctLedgerEntry(
    @Param("id") id: string,
    @Body() body: {
      debit_account_id?: string;
      credit_account_id?: string;
      amount?: number;
      description?: string;
      reason: string;
    },
    @Req() req: any
  ) {
    const userName = req.user?.name || req.user?.email || "User";
    const userRole = req.user?.role || req.user?.roles?.[0]?.role?.name || "Chartered Accountant (CA)";
    const userId = req.user?.userId || req.user?.id || "user-id";

    return this.accountingService.correctLedgerEntry(id, {
      ...body,
      user_id: userId,
      user_name: userName,
      user_role: userRole,
    });
  }

  @Get("vouchers/:id/audit-trail")
  async getLedgerAuditLogs(@Param("id") id: string) {
    return this.accountingService.getLedgerAuditLogs(id);
  }

  @Post("transactions")
  async postTransaction(@Body() body: any, @Req() req: any) {
    const user = req.user?.name 
      ? `${req.user.name}${req.user.employee_id ? " (" + req.user.employee_id + ")" : ""}` 
      : (req.user?.email === "admin@globalsafety.com" || req.user?.email === "amrvbloggers@gmail.com" ? "Super Admin (SYSTEM)" : req.user?.email || "System");
    return this.accountingService.postTransaction({ ...body, created_by: user });
  }

  @Get("reports")
  async getReports(@Query("period") period: "monthly" | "halfyearly" | "yearly", @Query("year") year: string, @Query("month") month?: string) {
    return this.accountingService.getFinancialReports({ period, year: Number(year), month: month ? Number(month) : undefined });
  }

  @Get("reports/cashflow")
  async getCashFlow(@Query("period") period: "monthly" | "halfyearly" | "yearly", @Query("year") year: string, @Query("month") month?: string) {
    return this.accountingService.getCashFlowStatement({ period, year: Number(year), month: month ? Number(month) : undefined });
  }

  @Get("audit")
  async getAuditLog() {
    return this.accountingService.getAuditLog();
  }
}
