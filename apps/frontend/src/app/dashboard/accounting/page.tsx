"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth";
import { API_BASE_URL } from "@/lib/config";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { 
  Plus, 
  Calculator, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Search, 
  Filter, 
  Download, 
  Calendar, 
  Clock, 
  FileText, 
  TrendingUp, 
  DollarSign, 
  ShieldAlert,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Account {
  id: string;
  name: string;
  code: string;
  type: string;
  balance: number;
  parent_id?: string | null;
}

interface Voucher {
  id: string;
  voucher_no: string;
  description: string;
  amount: number;
  transaction_date: string;
  debit_account: Account;
  credit_account: Account;
  created_by: string;
}

export default function AccountingPage() {
  const [activeTab, setActiveTab] = useState<"ledgers" | "accounts" | "reports">("ledgers");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [openVoucherDialog, setOpenVoucherDialog] = useState(false);
  const [openAccountDialog, setOpenAccountDialog] = useState(false);
  const [openTransactionDialog, setOpenTransactionDialog] = useState(false);
  
  // Transaction form state
  const [transactionForm, setTransactionForm] = useState({
    type: "EXPENSE" as "EXPENSE" | "REVENUE",
    category_id: "",
    bank_account_id: "",
    amount: "",
    description: "",
    transaction_date: new Date().toISOString().split('T')[0]
  });
  
  // Voucher form state
  const [voucherForm, setVoucherForm] = useState({
    debit_code: "",
    credit_code: "",
    amount: "",
    description: "",
    transaction_date: new Date().toISOString().split('T')[0]
  });

  // Account form state
  const [accountForm, setAccountForm] = useState({
    name: "",
    code: "",
    type: "ASSET",
    parent_id: "",
    opening_balance: ""
  });

  // Report filters and states
  const [reportFilter, setReportFilter] = useState({
    period: "monthly" as "monthly" | "halfyearly" | "yearly",
    year: new Date().getFullYear(),
    month: new Date().getMonth() // 0-indexed
  });
  const [reportData, setReportData] = useState<any>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [expandedAccounts, setExpandedAccounts] = useState<Record<string, boolean>>({});
  
  const toggleAccountExpand = (accountId: string) => {
    setExpandedAccounts(prev => ({
      ...prev,
      [accountId]: !prev[accountId]
    }));
  };

  const renderCollapsibleAccountRows = (
    accountsList: any[],
    type: string,
    colorClass: string
  ) => {
    if (!accountsList) return null;

    const topLevel = accountsList.filter(
      (a: any) => a.type === type && (!a.parent_id || !accountsList.some((p: any) => p.id === a.parent_id))
    );

    return topLevel.map((parent: any) => {
      const children = accountsList.filter((a: any) => a.parent_id === parent.id);
      const hasChildren = children.length > 0;
      const isExpanded = !!expandedAccounts[parent.id];

      return (
        <div key={parent.id} className="space-y-1">
          <div 
            onClick={() => hasChildren && toggleAccountExpand(parent.id)}
            className={cn(
              "flex justify-between items-center py-2.5 text-sm border-b border-border/40 font-semibold select-none",
              hasChildren ? "cursor-pointer hover:bg-accent/5 px-2 -mx-2 rounded-lg transition-colors" : ""
            )}
          >
            <div className="flex items-center gap-1.5">
              {hasChildren ? (
                isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                )
              ) : (
                <div className="w-4 h-4 shrink-0" />
              )}
              <span>{parent.name} ({parent.code})</span>
            </div>
            <span className={cn("font-bold shrink-0", colorClass)}>
              ₹{Number(parent.periodBalance).toLocaleString()}
            </span>
          </div>

          {hasChildren && isExpanded && (
            <div className="pl-6 border-l border-border/60 ml-2 space-y-1 mt-1 transition-all duration-300">
              {children.map((child: any) => (
                <div
                  key={child.id}
                  className="flex justify-between items-center py-1.5 text-xs text-muted-foreground border-b border-border/20"
                >
                  <span>{child.name} ({child.code})</span>
                  <span className="font-semibold">
                    ₹{Number(child.periodBalance).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    });
  };

  const token = useAuthStore((state) => state.token);

  const filteredVouchers = vouchers.filter(v => 
    v.voucher_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.debit_account.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.debit_account.code.includes(searchQuery) ||
    v.credit_account.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.credit_account.code.includes(searchQuery) ||
    v.created_by.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const fetchAccountsAndVouchers = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [accRes, vRes] = await Promise.all([
        fetch(`${API_BASE_URL}/accounting/accounts`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/accounting/vouchers`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      const accData = await accRes.json();
      const vData = await vRes.json();
      if (Array.isArray(accData)) setAccounts(accData);
      if (Array.isArray(vData)) setVouchers(vData);
    } catch (e) {
      toast.error("Failed to load ledger data.");
    } finally {
      setLoading(false);
    }
  };

  const fetchReport = async () => {
    if (!token) return;
    setLoadingReport(true);
    try {
      const { period, year, month } = reportFilter;
      const url = `${API_BASE_URL}/accounting/reports?period=${period}&year=${year}${period === 'monthly' ? `&month=${month}` : ''}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setReportData(data);
    } catch (e) {
      toast.error("Failed to compile financial statements.");
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    fetchAccountsAndVouchers();
  }, [token]);

  useEffect(() => {
    if (activeTab === "reports") {
      fetchReport();
    }
  }, [activeTab, reportFilter]);

  const handleCreateVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!voucherForm.debit_code || !voucherForm.credit_code || !voucherForm.amount || !voucherForm.description) {
      toast.error("Please fill in all voucher details.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/accounting/vouchers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          debit_code: voucherForm.debit_code,
          credit_code: voucherForm.credit_code,
          amount: parseFloat(voucherForm.amount),
          description: voucherForm.description,
          transaction_date: voucherForm.transaction_date
        })
      });

      if (res.ok) {
        toast.success("Voucher posted to ledger successfully!");
        setOpenVoucherDialog(false);
        setVoucherForm({
          debit_code: "",
          credit_code: "",
          amount: "",
          description: "",
          transaction_date: new Date().toISOString().split('T')[0]
        });
        fetchAccountsAndVouchers();
      } else {
        const err = await res.json();
        toast.error(err.message || "Failed to post voucher.");
      }
    } catch (e) {
      toast.error("Network error occurred.");
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!accountForm.name || !accountForm.code) {
      toast.error("Please enter account name and code.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/accounting/accounts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: accountForm.name,
          code: accountForm.code,
          type: accountForm.type,
          parent_id: accountForm.parent_id || undefined,
          opening_balance: accountForm.opening_balance ? parseFloat(accountForm.opening_balance) : undefined
        })
      });

      if (res.ok) {
        toast.success("New account added to Chart of Accounts!");
        setOpenAccountDialog(false);
        setAccountForm({ name: "", code: "", type: "ASSET", parent_id: "", opening_balance: "" });
        fetchAccountsAndVouchers();
      } else {
        const err = await res.json();
        toast.error(err.message || "Failed to create account.");
      }
    } catch (e) {
      toast.error("Network error.");
    }
  };

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!transactionForm.category_id || !transactionForm.bank_account_id || !transactionForm.amount || !transactionForm.description) {
      toast.error("Please fill in all transaction details.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/accounting/transactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          type: transactionForm.type,
          category_id: transactionForm.category_id,
          bank_account_id: transactionForm.bank_account_id,
          amount: parseFloat(transactionForm.amount),
          description: transactionForm.description,
          transaction_date: transactionForm.transaction_date
        })
      });

      if (res.ok) {
        toast.success("Transaction recorded and synced successfully!");
        setOpenTransactionDialog(false);
        setTransactionForm({
          type: "EXPENSE",
          category_id: "",
          bank_account_id: "",
          amount: "",
          description: "",
          transaction_date: new Date().toISOString().split('T')[0]
        });
        fetchAccountsAndVouchers();
        if (activeTab === "reports") {
          fetchReport();
        }
      } else {
        const err = await res.json();
        toast.error(err.message || "Failed to record transaction.");
      }
    } catch (e) {
      toast.error("Network error.");
    }
  };

  const downloadExcelReport = () => {
    if (!reportData) {
      toast.error("No report data available to export.");
      return;
    }

    try {
      // 1. Prepare Financial Report Sheet Data
      const plData = [
        ["Financial Statement Type", "Account", "Code", "Amount (INR)"],
        ["PROFIT & LOSS STATEMENT", "", "", ""],
        ["Revenue Stream", "", "", ""],
        ...reportData.profitAndLoss.revenues.map((r: any) => ["Revenue", r.name, r.code, Number(r.periodBalance)]),
        ["Total Revenue", "", "", Number(reportData.profitAndLoss.totalRevenue)],
        [],
        ["Operating Expense", "", "", ""],
        ...reportData.profitAndLoss.expenses.map((e: any) => ["Expense", e.name, e.code, Number(e.periodBalance)]),
        ["Total Expense", "", "", Number(reportData.profitAndLoss.totalExpense)],
        [],
        ["Net Business Profit", "", "", Number(reportData.profitAndLoss.netProfit)],
        [],
        ["BALANCE SHEET SUMMARY", "", "", ""],
        ["Assets (Dr.)", "", "", ""],
        ...reportData.balanceSheet.assets.map((a: any) => ["Asset", a.name, a.code, Number(a.periodBalance)]),
        ["Total Assets", "", "", Number(reportData.balanceSheet.totalAssets)],
        [],
        ["Liabilities & Equity (Cr.)", "", "", ""],
        ...reportData.balanceSheet.liabilities.map((l: any) => ["Liability", l.name, l.code, Number(l.periodBalance)]),
        ...reportData.balanceSheet.equity.map((eq: any) => ["Equity", eq.name, eq.code, Number(eq.periodBalance)]),
        ["Total Liabilities & Equity", "", "", Number(reportData.balanceSheet.totalLiabilities) + Number(reportData.balanceSheet.totalEquity)],
      ];

      // 2. Prepare Chart of Accounts Sheet Data
      const coaData = [
        ["Code", "Account Name", "Type", "Current Balance (INR)"],
        ...accounts.map(a => [a.code, a.name, a.type, Number(a.balance)])
      ];

      // 3. Prepare Ledger Board Sheet Data
      const start = new Date(reportData.period.startDate);
      const end = new Date(reportData.period.endDate);
      const periodVouchers = vouchers.filter(v => {
        const d = new Date(v.transaction_date);
        return d >= start && d <= end;
      });

      const ledgerData = [
        ["Voucher No", "Date", "Debit Account (Dr.)", "Credit Account (Cr.)", "Debit Amount (Dr.)", "Credit Amount (Cr.)", "Narration", "Audited By"],
        ...periodVouchers.map(v => [
          v.voucher_no,
          new Date(v.transaction_date).toLocaleDateString(),
          `${v.debit_account.name} (${v.debit_account.code})`,
          `${v.credit_account.name} (${v.credit_account.code})`,
          Number(v.amount),
          Number(v.amount),
          v.description,
          v.created_by
        ])
      ];

      // Create Workbook
      const wb = XLSX.utils.book_new();

      // Convert arrays to sheets
      const wsFinancials = XLSX.utils.aoa_to_sheet(plData);
      const wsCOA = XLSX.utils.aoa_to_sheet(coaData);
      const wsLedger = XLSX.utils.aoa_to_sheet(ledgerData);

      // Append sheets to workbook
      XLSX.utils.book_append_sheet(wb, wsFinancials, "Financial Reports");
      XLSX.utils.book_append_sheet(wb, wsCOA, "Chart of Accounts");
      XLSX.utils.book_append_sheet(wb, wsLedger, "Ledger Board");

      // Generate file name
      const { period, year, month } = reportFilter;
      const dateStr = period === 'monthly'
        ? `${new Date(year, month).toLocaleString('default', { month: 'short' })}-${year}`
        : period === 'halfyearly' ? `H-${year}` : `Yearly-${year}`;

      XLSX.writeFile(wb, `Consolidated_Financial_Report_${dateStr}.xlsx`);
      toast.success("Excel audit file downloaded successfully!");
    } catch (e) {
      toast.error("Failed to generate Excel file.");
      console.error(e);
    }
  };

  const downloadPDFReport = () => {
    if (!reportData) return;
    const doc = new jsPDF();
    const { period, year, month } = reportFilter;
    const dateStr = period === 'monthly' 
      ? new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' })
      : period === 'halfyearly' ? `Half Yearly (${year})` : `Yearly (${year})`;

    // Page 1: Financial Performance Summary
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("GLOBAL SAFETY SOLUTION", 14, 22);
    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.text(`Consolidated Audit Statement - ${dateStr}`, 14, 30);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 37);
    doc.line(14, 40, 196, 40);

    let currentY = 48;

    // Profit & Loss Table
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("1. Profit & Loss Summary", 14, currentY);
    currentY += 5;

    const plRows = [
      ["Total Revenue", `INR ${reportData.profitAndLoss.totalRevenue.toLocaleString()}`],
      ["Total Operating Expenses", `INR ${reportData.profitAndLoss.totalExpense.toLocaleString()}`],
      ["Net Business Profit", `INR ${reportData.profitAndLoss.netProfit.toLocaleString()}`]
    ];

    autoTable(doc, {
      startY: currentY,
      head: [["Indicator / Stream", "Balance"]],
      body: plRows,
      theme: "striped",
      styles: { fontSize: 10 },
      headStyles: { fillColor: [79, 70, 229] }
    });

    currentY = (doc as any).lastAutoTable.finalY + 15;

    // Balance Sheet Table
    doc.setFont("helvetica", "bold");
    doc.text("2. Balance Sheet Summary", 14, currentY);
    currentY += 5;

    const bsRows = [
      ["Assets Total", `INR ${reportData.balanceSheet.totalAssets.toLocaleString()}`],
      ["Liabilities Total", `INR ${reportData.balanceSheet.totalLiabilities.toLocaleString()}`],
      ["Equity Total", `INR ${reportData.balanceSheet.totalEquity.toLocaleString()}`],
      ["Total Liabilities & Equity", `INR ${(reportData.balanceSheet.totalLiabilities + reportData.balanceSheet.totalEquity).toLocaleString()}`]
    ];

    autoTable(doc, {
      startY: currentY,
      head: [["Classification", "Balance"]],
      body: bsRows,
      theme: "striped",
      styles: { fontSize: 10 },
      headStyles: { fillColor: [13, 148, 136] }
    });

    // Page 2: Chart of Accounts
    doc.addPage();
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("3. Chart of Accounts (COA)", 14, 20);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Active ledger classifications and aggregated current balances", 14, 26);
    doc.line(14, 29, 196, 29);

    const coaRows = accounts.map(a => [
      a.code,
      a.name,
      a.type,
      `INR ${Number(a.balance).toLocaleString()}`
    ]);

    autoTable(doc, {
      startY: 33,
      head: [["Code", "Account Name", "Type", "Current Balance"]],
      body: coaRows,
      theme: "striped",
      styles: { fontSize: 9 },
      headStyles: { fillColor: [147, 51, 234] }
    });

    // Page 3: Ledger Board / Audit Trail
    doc.addPage();
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("4. Ledger Board (Journal Vouchers)", 14, 20);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Transaction ledger audit log for period: ${dateStr}`, 14, 26);
    doc.line(14, 29, 196, 29);

    const start = new Date(reportData.period.startDate);
    const end = new Date(reportData.period.endDate);
    const periodVouchers = vouchers.filter(v => {
      const d = new Date(v.transaction_date);
      return d >= start && d <= end;
    });

    const ledgerRows = periodVouchers.map(v => [
      v.voucher_no,
      new Date(v.transaction_date).toLocaleDateString(),
      `${v.debit_account.name} (Dr) / ${v.credit_account.name} (Cr)`,
      `INR ${Number(v.amount).toLocaleString()}`,
      v.description,
      v.created_by
    ]);

    autoTable(doc, {
      startY: 33,
      head: [["Voucher No", "Date", "Particulars", "Amount", "Narration", "Audited By"]],
      body: ledgerRows,
      theme: "striped",
      styles: { fontSize: 8 },
      headStyles: { fillColor: [100, 116, 139] }
    });

    const saveDateStr = period === 'monthly'
      ? `${new Date(year, month).toLocaleString('default', { month: 'short' })}-${year}`
      : period === 'halfyearly' ? `H-${year}` : `Yearly-${year}`;

    doc.save(`Consolidated_Financial_Report_${saveDateStr}.pdf`);
    toast.success("Consolidated PDF audit statement downloaded.");
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground to-muted-foreground flex items-center gap-3">
            <Calculator className="w-9 h-9 text-indigo-500" /> Tally Ledger & Accounts
          </h1>
          <p className="text-muted-foreground font-medium">Professional double-entry ledger book, chart of accounts, and audit reports.</p>
        </div>

        <div className="flex items-center gap-3">
          <Dialog open={openAccountDialog} onOpenChange={setOpenAccountDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-border hover:bg-accent/10 rounded-xl h-11 font-bold">
                Add Account
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border text-foreground rounded-2xl max-w-md p-6">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">New Ledger Account</DialogTitle>
                <DialogDescription>Initialize a new account in your global Chart of Accounts.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateAccount} className="space-y-4 py-4">
                <div className="space-y-1">
                  <Label>Account Name</Label>
                  <Input 
                    placeholder="e.g. Petty Cash"
                    value={accountForm.name}
                    onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                    className="bg-background border-border"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Account Code (Unique)</Label>
                  <Input 
                    placeholder="e.g. 1020"
                    value={accountForm.code}
                    onChange={(e) => setAccountForm({ ...accountForm, code: e.target.value })}
                    className="bg-background border-border"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Classification</Label>
                  <select 
                    value={accountForm.type}
                    onChange={(e) => setAccountForm({ ...accountForm, type: e.target.value, parent_id: "" })}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground"
                  >
                    <option value="ASSET">ASSET</option>
                    <option value="LIABILITY">LIABILITY</option>
                    <option value="EQUITY">EQUITY</option>
                    <option value="REVENUE">REVENUE</option>
                    <option value="EXPENSE">EXPENSE</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Parent Account (Optional Sub-category)</Label>
                  <select 
                    value={accountForm.parent_id}
                    onChange={(e) => setAccountForm({ ...accountForm, parent_id: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground"
                  >
                    <option value="">None (Primary Category)</option>
                    {accounts
                      .filter(a => a.type === accountForm.type && !a.parent_id)
                      .map(a => (
                        <option key={a.id} value={a.id}>{a.name} ({a.code})</option>
                      ))
                    }
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Opening Balance (INR - Optional)</Label>
                  <Input 
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={accountForm.opening_balance}
                    onChange={(e) => setAccountForm({ ...accountForm, opening_balance: e.target.value })}
                    className="bg-background border-border"
                  />
                </div>
                <DialogFooter className="pt-4">
                  <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold w-full rounded-xl">
                    Create Account
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={openTransactionDialog} onOpenChange={setOpenTransactionDialog}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl h-11 font-bold px-6 shadow-lg shadow-emerald-500/20">
                <Plus className="w-4 h-4 mr-2" /> Log Transaction
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border text-foreground rounded-2xl max-w-lg p-6">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">Log Transaction</DialogTitle>
                <DialogDescription>Quickly record a manual expense payment or income receipt.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateTransaction} className="space-y-4 py-4">
                <div className="space-y-1">
                  <Label>Transaction Type</Label>
                  <select
                    value={transactionForm.type}
                    onChange={(e) => setTransactionForm({ ...transactionForm, type: e.target.value as any, category_id: "" })}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground"
                  >
                    <option value="EXPENSE">Expense (Outflow / Payment)</option>
                    <option value="REVENUE">Revenue (Inflow / Receipt)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label>Category Account</Label>
                  <select
                    value={transactionForm.category_id}
                    onChange={(e) => setTransactionForm({ ...transactionForm, category_id: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground"
                  >
                    <option value="">Select Category</option>
                    {accounts
                      .filter(a => a.type === (transactionForm.type === 'EXPENSE' ? 'EXPENSE' : 'REVENUE'))
                      .map(a => (
                        <option key={a.id} value={a.id}>{a.name} ({a.code})</option>
                      ))
                    }
                  </select>
                </div>

                <div className="space-y-1">
                  <Label>{transactionForm.type === 'EXPENSE' ? 'Paid From (Bank/Cash Account)' : 'Deposit To (Bank/Cash Account)'}</Label>
                  <select
                    value={transactionForm.bank_account_id}
                    onChange={(e) => setTransactionForm({ ...transactionForm, bank_account_id: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground"
                  >
                    <option value="">Select Account</option>
                    {accounts
                      .filter(a => a.type === 'ASSET')
                      .map(a => (
                        <option key={a.id} value={a.id}>{a.name} ({a.code})</option>
                      ))
                    }
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Amount (INR)</Label>
                    <Input 
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={transactionForm.amount}
                      onChange={(e) => setTransactionForm({ ...transactionForm, amount: e.target.value })}
                      className="bg-background border-border"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Transaction Date</Label>
                    <Input 
                      type="date"
                      value={transactionForm.transaction_date}
                      onChange={(e) => setTransactionForm({ ...transactionForm, transaction_date: e.target.value })}
                      className="bg-background border-border"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>Narration / Description</Label>
                  <Input 
                    placeholder="Enter details (e.g. Paid Wi-Fi bill)"
                    value={transactionForm.description}
                    onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })}
                    className="bg-background border-border"
                  />
                </div>

                <DialogFooter className="pt-4">
                  <Button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold w-full rounded-xl">
                    Save Transaction
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={openVoucherDialog} onOpenChange={setOpenVoucherDialog}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl h-11 font-bold px-6 shadow-lg shadow-indigo-500/20">
                <Plus className="w-4 h-4 mr-2" /> Post Voucher
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border text-foreground rounded-2xl max-w-lg p-6">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">New Journal Voucher (JV)</DialogTitle>
                <DialogDescription>Record a custom double-entry bookkeeping ledger voucher.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateVoucher} className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Debit Account (Dr.)</Label>
                    <select
                      value={voucherForm.debit_code}
                      onChange={(e) => setVoucherForm({ ...voucherForm, debit_code: e.target.value })}
                      className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground"
                    >
                      <option value="">Select Account</option>
                      {accounts.map(a => (
                        <option key={a.id} value={a.code}>{a.name} ({a.code}) - {a.type}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label>Credit Account (Cr.)</Label>
                    <select
                      value={voucherForm.credit_code}
                      onChange={(e) => setVoucherForm({ ...voucherForm, credit_code: e.target.value })}
                      className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground"
                    >
                      <option value="">Select Account</option>
                      {accounts.map(a => (
                        <option key={a.id} value={a.code}>{a.name} ({a.code}) - {a.type}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Amount (INR)</Label>
                    <Input 
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={voucherForm.amount}
                      onChange={(e) => setVoucherForm({ ...voucherForm, amount: e.target.value })}
                      className="bg-background border-border"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Posting Date</Label>
                    <Input 
                      type="date"
                      value={voucherForm.transaction_date}
                      onChange={(e) => setVoucherForm({ ...voucherForm, transaction_date: e.target.value })}
                      className="bg-background border-border"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>Narration / Description</Label>
                  <Input 
                    placeholder="Enter transactional details"
                    value={voucherForm.description}
                    onChange={(e) => setVoucherForm({ ...voucherForm, description: e.target.value })}
                    className="bg-background border-border"
                  />
                </div>

                <DialogFooter className="pt-4">
                  <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold w-full rounded-xl">
                    Post Journal Voucher
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-border/80">
        <button
          onClick={() => setActiveTab("ledgers")}
          className={cn(
            "px-6 py-3 font-bold text-sm border-b-2 transition-all",
            activeTab === "ledgers" ? "border-indigo-500 text-indigo-500" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Ledger Board
        </button>
        <button
          onClick={() => setActiveTab("accounts")}
          className={cn(
            "px-6 py-3 font-bold text-sm border-b-2 transition-all",
            activeTab === "accounts" ? "border-indigo-500 text-indigo-500" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Chart of Accounts
        </button>
        <button
          onClick={() => setActiveTab("reports")}
          className={cn(
            "px-6 py-3 font-bold text-sm border-b-2 transition-all",
            activeTab === "reports" ? "border-indigo-500 text-indigo-500" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Financial Reports
        </button>
      </div>

      {loading && activeTab !== "reports" ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        </div>
      ) : (
        <>
          {activeTab === "ledgers" && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
              <div className="p-6 border-b border-border flex items-center justify-between">
                <h3 className="font-bold text-lg">Voucher Audit Entries</h3>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-3.5 text-muted-foreground" />
                    <Input 
                      placeholder="Search vouchers..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-10 w-64 bg-background border-border rounded-xl" 
                    />
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-accent/5 border-b border-border text-muted-foreground text-xs font-black uppercase tracking-wider">
                      <th className="py-4 px-6">Voucher No</th>
                      <th className="py-4 px-6">Date</th>
                      <th className="py-4 px-6">Particulars (Dr / Cr)</th>
                      <th className="py-4 px-6 text-right">Debit (Dr)</th>
                      <th className="py-4 px-6 text-right">Credit (Cr)</th>
                      <th className="py-4 px-6">Narration</th>
                      <th className="py-4 px-6">Audited By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 text-sm">
                    {filteredVouchers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-muted-foreground italic">No vouchers found.</td>
                      </tr>
                    ) : (
                      filteredVouchers.map(v => (
                        <tr key={v.id} className="hover:bg-accent/5 transition-colors">
                          <td className="py-4 px-6 font-bold text-indigo-500">{v.voucher_no}</td>
                          <td className="py-4 px-6 text-muted-foreground">
                            {new Date(v.transaction_date).toLocaleDateString()}
                          </td>
                          <td className="py-4 px-6 font-medium space-y-1">
                            <div className="flex items-center gap-1.5 text-emerald-500">
                              <ArrowUpRight className="w-3.5 h-3.5" />
                              {v.debit_account.name} ({v.debit_account.code})
                            </div>
                            <div className="flex items-center gap-1.5 text-rose-500 pl-4">
                              <ArrowDownLeft className="w-3.5 h-3.5" />
                              {v.credit_account.name} ({v.credit_account.code})
                            </div>
                          </td>
                          <td className="py-4 px-6 text-right font-bold text-emerald-500">₹{Number(v.amount).toLocaleString()}</td>
                          <td className="py-4 px-6 text-right font-bold text-rose-500">₹{Number(v.amount).toLocaleString()}</td>
                          <td className="py-4 px-6 text-muted-foreground max-w-xs truncate cursor-help" title={v.description}>{v.description}</td>
                          <td className="py-4 px-6 text-xs font-bold uppercase text-muted-foreground">{v.created_by}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "accounts" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                <div className="p-6 border-b border-border">
                  <h3 className="font-bold text-lg">Chart of Accounts Ledger</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-accent/5 border-b border-border text-muted-foreground text-xs font-black uppercase tracking-wider">
                        <th className="py-4 px-6">Code</th>
                        <th className="py-4 px-6">Account Name</th>
                        <th className="py-4 px-6">Type</th>
                        <th className="py-4 px-6 text-right">Current Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 text-sm">
                      {accounts.map(a => (
                        <tr key={a.id} className="hover:bg-accent/5 transition-colors">
                          <td className={cn("py-4 px-6 font-mono font-bold text-indigo-500", a.parent_id ? "pl-8 text-indigo-500/70" : "")}>
                            {a.parent_id && <span className="text-muted-foreground mr-1">↳</span>}
                            {a.code}
                          </td>
                          <td className={cn("py-4 px-6 font-medium", a.parent_id ? "pl-8 text-muted-foreground text-xs" : "")}>
                            {a.name}
                          </td>
                          <td className="py-4 px-6">
                            <span className={cn(
                              "text-xs px-2.5 py-1 rounded-full font-bold",
                              a.type === 'ASSET' ? "bg-blue-500/10 text-blue-500" :
                              a.type === 'LIABILITY' ? "bg-amber-500/10 text-amber-500" :
                              a.type === 'EQUITY' ? "bg-purple-500/10 text-purple-500" :
                              a.type === 'REVENUE' ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                            )}>
                              {a.type}
                            </span>
                          </td>
                          <td className={cn(
                            "py-4 px-6 text-right font-black text-base",
                            Number(a.balance) >= 0 ? "text-emerald-500" : "text-rose-500"
                          )}>
                            ₹{Number(a.balance).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tally Stats Card */}
              <div className="space-y-6">
                <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                  <h3 className="font-bold text-lg mb-4">Financial Equilibrium</h3>
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex justify-between items-center">
                      <div>
                        <p className="text-xs text-muted-foreground font-medium uppercase">Total Assets</p>
                        <p className="text-xl font-bold text-emerald-500 mt-1">
                          ₹{accounts.filter(a => a.type === 'ASSET').reduce((sum, a) => sum + Number(a.balance), 0).toLocaleString()}
                        </p>
                      </div>
                      <TrendingUp className="w-8 h-8 text-emerald-500 opacity-35" />
                    </div>
                    <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/10 flex justify-between items-center">
                      <div>
                        <p className="text-xs text-muted-foreground font-medium uppercase">Total Liabilities</p>
                        <p className="text-xl font-bold text-rose-500 mt-1">
                          ₹{accounts.filter(a => a.type === 'LIABILITY').reduce((sum, a) => sum + Number(a.balance), 0).toLocaleString()}
                        </p>
                      </div>
                      <ShieldAlert className="w-8 h-8 text-rose-500 opacity-35" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "reports" && (
            <div className="space-y-8">
              {/* Reports Filter Bar */}
              <div className="bg-card border border-border rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs font-bold text-muted-foreground">Reporting Period</Label>
                    <select
                      value={reportFilter.period}
                      onChange={(e) => setReportFilter({ ...reportFilter, period: e.target.value as any })}
                      className="h-10 px-3 rounded-xl border border-border bg-background text-sm text-foreground font-medium"
                    >
                      <option value="monthly">Monthly Statement</option>
                      <option value="halfyearly">Half Yearly (H1/H2)</option>
                      <option value="yearly">Yearly Statement</option>
                    </select>
                  </div>
                  {reportFilter.period === 'monthly' && (
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs font-bold text-muted-foreground">Month</Label>
                      <select
                        value={reportFilter.month}
                        onChange={(e) => setReportFilter({ ...reportFilter, month: Number(e.target.value) })}
                        className="h-10 px-3 rounded-xl border border-border bg-background text-sm text-foreground font-medium"
                      >
                        {Array.from({ length: 12 }, (_, i) => (
                          <option key={i} value={i}>
                            {new Date(0, i).toLocaleString('default', { month: 'long' })}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs font-bold text-muted-foreground">Year</Label>
                    <select
                      value={reportFilter.year}
                      onChange={(e) => setReportFilter({ ...reportFilter, year: Number(e.target.value) })}
                      className="h-10 px-3 rounded-xl border border-border bg-background text-sm text-foreground font-medium"
                    >
                      {[2025, 2026, 2027].map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end">
                  <Button onClick={downloadExcelReport} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl h-10 font-bold shadow-md shadow-indigo-500/20">
                    <Download className="w-4 h-4 mr-2" /> Audit Excel
                  </Button>
                  <Button onClick={downloadPDFReport} className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl h-10 font-bold shadow-md shadow-emerald-500/20">
                    <Download className="w-4 h-4 mr-2" /> Audit PDF
                  </Button>
                </div>
              </div>

              {loadingReport ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                </div>
              ) : reportData ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Profit & Loss Card */}
                  <div className="bg-card border border-border rounded-2xl p-6 space-y-6 shadow-sm">
                    <div className="flex items-center justify-between border-b border-border pb-4">
                      <h3 className="font-bold text-lg text-indigo-500 uppercase tracking-wider">Profit & Loss Statement</h3>
                      <TrendingUp className="w-5 h-5 text-indigo-500" />
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h4 className="text-xs font-black text-muted-foreground uppercase mb-2">Revenue Streams</h4>
                        <div className="space-y-1">
                          {renderCollapsibleAccountRows(reportData.profitAndLoss.revenues, 'REVENUE', 'text-emerald-500')}
                        </div>
                        <div className="flex justify-between py-3 font-bold text-sm border-b-2 border-border/80 mt-1">
                          <span>Total Revenue</span>
                          <span className="text-emerald-500 underline decoration-double">₹{Number(reportData.profitAndLoss.totalRevenue).toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="pt-4">
                        <h4 className="text-xs font-black text-muted-foreground uppercase mb-2">Operating Expenses</h4>
                        <div className="space-y-1">
                          {renderCollapsibleAccountRows(reportData.profitAndLoss.expenses, 'EXPENSE', 'text-rose-500')}
                        </div>
                        <div className="flex justify-between py-3 font-bold text-sm border-b-2 border-border/80 mt-1">
                          <span>Total Expenses</span>
                          <span className="text-rose-500">₹{Number(reportData.profitAndLoss.totalExpense).toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex justify-between items-center mt-6">
                        <span className="font-black text-base uppercase text-indigo-500">Net Business Profit</span>
                        <span className={cn(
                          "font-black text-xl underline decoration-double",
                          Number(reportData.profitAndLoss.netProfit) >= 0 ? "text-emerald-500" : "text-rose-500"
                        )}>
                          ₹{Number(reportData.profitAndLoss.netProfit).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Balance Sheet Card */}
                  <div className="bg-card border border-border rounded-2xl p-6 space-y-6 shadow-sm">
                    <div className="flex items-center justify-between border-b border-border pb-4">
                      <h3 className="font-bold text-lg text-teal-500 uppercase tracking-wider">Balance Sheet Summary</h3>
                      <DollarSign className="w-5 h-5 text-teal-500" />
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h4 className="text-xs font-black text-muted-foreground uppercase mb-2">Assets (Dr.)</h4>
                        <div className="space-y-1">
                          {renderCollapsibleAccountRows(reportData.balanceSheet.assets, 'ASSET', 'text-emerald-500')}
                        </div>
                        <div className="flex justify-between py-3 font-bold text-sm border-b-2 border-border/80 mt-1">
                          <span>Total Assets</span>
                          <span className="text-emerald-500 underline decoration-double">₹{Number(reportData.balanceSheet.totalAssets).toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="pt-4">
                        <h4 className="text-xs font-black text-muted-foreground uppercase mb-2">Liabilities & Equity (Cr.)</h4>
                        <div className="space-y-1">
                          {renderCollapsibleAccountRows(reportData.balanceSheet.liabilities, 'LIABILITY', 'text-rose-500')}
                          {renderCollapsibleAccountRows(reportData.balanceSheet.equity, 'EQUITY', 'text-purple-500')}
                        </div>
                        <div className="flex justify-between py-3 font-bold text-sm border-b-2 border-border/80 mt-1">
                          <span>Total Liabilities & Equity</span>
                          <span className="text-teal-500 underline decoration-double">
                            ₹{(Number(reportData.balanceSheet.totalLiabilities) + Number(reportData.balanceSheet.totalEquity)).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </>
      )}
    </div>
  );
}
