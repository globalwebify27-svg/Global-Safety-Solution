"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/store/auth";
import { API_BASE_URL } from "@/lib/config";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Plus, Calculator, ArrowUpRight, ArrowDownLeft, Search,
  Download, TrendingUp, DollarSign, ShieldAlert, ChevronDown,
  ChevronRight, Pencil, X, Activity, Scale, Waves, User,
  FileSpreadsheet, Banknote, History, AlertTriangle, Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Account { id: string; name: string; code: string; type: string; balance: number; parent_id?: string | null; }
interface Voucher {
  id: string;
  voucher_no: string;
  description: string;
  amount: number;
  transaction_date: string;
  debit_account: Account;
  credit_account: Account;
  created_by: string;
  invoice_id?: string;
  payment_id?: string;
  is_corrected?: boolean;
  last_corrected_by?: string;
  last_corrected_at?: string;
  audit_logs?: any[];
}
type TabType = "ledgers" | "accounts" | "reports" | "trialbalance" | "audit";

export default function AccountingPage() {
  const [activeTab, setActiveTab] = useState<TabType>("ledgers");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [openVoucherDialog, setOpenVoucherDialog] = useState(false);
  const [openAccountDialog, setOpenAccountDialog] = useState(false);
  const [openTransactionDialog, setOpenTransactionDialog] = useState(false);

  // States for Entry Correction & Mandatory Audit Trail
  const [correctVoucher, setCorrectVoucher] = useState<Voucher | null>(null);
  const [correctionForm, setCorrectionForm] = useState({
    debit_account_id: "",
    credit_account_id: "",
    amount: "",
    description: "",
    reason: "",
  });
  const [correctSubmitting, setCorrectSubmitting] = useState(false);
  const [viewAuditVoucher, setViewAuditVoucher] = useState<Voucher | null>(null);
  const [voucherAuditLogs, setVoucherAuditLogs] = useState<any[]>([]);
  const [auditLoadingLogs, setAuditLoadingLogs] = useState(false);
  const [deleteVoucherTarget, setDeleteVoucherTarget] = useState<Voucher | null>(null);
  const [deletingVoucher, setDeletingVoucher] = useState(false);
  const [editOBAccount, setEditOBAccount] = useState<Account | null>(null);
  const [editOBAmount, setEditOBAmount] = useState("");
  const [editOBLoading, setEditOBLoading] = useState(false);
  const [drillAccount, setDrillAccount] = useState<Account | null>(null);
  const [drillEntries, setDrillEntries] = useState<any[]>([]);
  const [drillLoading, setDrillLoading] = useState(false);
  const [drillStart, setDrillStart] = useState("");
  const [drillEnd, setDrillEnd] = useState("");
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [cashFlowData, setCashFlowData] = useState<any>(null);
  const [cashFlowLoading, setCashFlowLoading] = useState(false);
  const [transactionForm, setTransactionForm] = useState({ type: "EXPENSE" as "EXPENSE" | "REVENUE", category_id: "", bank_account_id: "", amount: "", description: "", transaction_date: new Date().toISOString().split("T")[0] });
  const [voucherForm, setVoucherForm] = useState({ debit_code: "", credit_code: "", amount: "", description: "", transaction_date: new Date().toISOString().split("T")[0] });
  const [accountForm, setAccountForm] = useState({ name: "", code: "", type: "ASSET", parent_id: "", opening_balance: "" });
  const [reportFilter, setReportFilter] = useState({ period: "monthly" as "monthly" | "halfyearly" | "yearly", year: new Date().getFullYear(), month: new Date().getMonth() });
  const [reportData, setReportData] = useState<any>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [expandedAccounts, setExpandedAccounts] = useState<Record<string, boolean>>({});
  const token = useAuthStore((state) => state.token);
  const searchParams = useSearchParams();

  useEffect(() => {
    const q = searchParams.get("search");
    if (q) {
      setSearchQuery(q);
    }
  }, [searchParams]);

  const getInvoiceNumber = (description: string) => {
    const match = /INV-\d{4}-\d{4}/.exec(description);
    return match ? match[0] : "";
  };

  const [ledgerStart, setLedgerStart] = useState("");
  const [ledgerEnd, setLedgerEnd] = useState("");
  const [debitParentId, setDebitParentId] = useState("");
  const [creditParentId, setCreditParentId] = useState("");

  const toggleAccountExpand = (id: string) => setExpandedAccounts(prev => ({ ...prev, [id]: !prev[id] }));
  const accountTypeColor = (type: string) => { if (type === "ASSET") return "bg-blue-500/10 text-blue-500"; if (type === "LIABILITY") return "bg-amber-500/10 text-amber-500"; if (type === "EQUITY") return "bg-purple-500/10 text-purple-500"; if (type === "REVENUE") return "bg-emerald-500/10 text-emerald-500"; if (type === "DIFF_OP_BALANCE") return "bg-orange-500/10 text-orange-500"; return "bg-rose-500/10 text-rose-500"; };

  const renderCollapsibleAccountRows = (accountsList: any[], type: string, colorClass: string) => {
    if (!accountsList || !Array.isArray(accountsList)) return null;
    const topLevel = accountsList.filter((a: any) => a.type === type && (!a.parent_id || !accountsList.some((p: any) => p.id === a.parent_id)));
    return topLevel.map((parent: any) => {
      const children = accountsList.filter((a: any) => a.parent_id === parent.id);
      const hasChildren = children.length > 0;
      const isExpanded = !!expandedAccounts[parent.id];
      return (
        <div key={parent.id} className="space-y-1">
          <div onClick={() => hasChildren && toggleAccountExpand(parent.id)} className={cn("flex justify-between items-center py-2.5 text-sm border-b border-border/40 font-semibold select-none", hasChildren ? "cursor-pointer hover:bg-accent/5 px-2 -mx-2 rounded-lg transition-colors" : "")}>
            <div className="flex items-center gap-1.5">
              {hasChildren ? (isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />) : <div className="w-4 h-4 shrink-0" />}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDrillAccount(parent);
                  setDrillStart("");
                  setDrillEnd("");
                }}
                className="hover:text-indigo-500 hover:underline transition-colors text-left"
              >
                {parent.name} ({parent.code})
              </button>
            </div>
            <span className={cn("font-bold shrink-0", colorClass)}>₹{Number(parent.periodBalance || 0).toLocaleString()}</span>
          </div>
          {hasChildren && isExpanded && (
            <div className="pl-6 border-l border-border/60 ml-2 space-y-1 mt-1">
              {children.map((child: any) => (
                <div key={child.id} className="flex justify-between items-center py-1.5 text-xs text-muted-foreground border-b border-border/20">
                  <button
                    onClick={() => {
                      setDrillAccount(child);
                      setDrillStart("");
                      setDrillEnd("");
                    }}
                    className="hover:text-indigo-500 hover:underline transition-colors text-left font-medium"
                  >
                    {child.name} ({child.code})
                  </button>
                  <span className="font-semibold">₹{Number(child.periodBalance || 0).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    });
  };


  const getChildrenOf = (parentId: string) => {
    return (accounts || []).filter(a => a.parent_id === parentId);
  };

  const filteredVouchers = (vouchers || []).filter(v => {
    const textMatch = v.voucher_no.toLowerCase().includes(searchQuery.toLowerCase()) || 
                      v.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
                      v.debit_account?.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                      v.credit_account?.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                      v.created_by.toLowerCase().includes(searchQuery.toLowerCase());
    if (!textMatch) return false;
    if (ledgerStart) {
      const vDate = new Date(v.transaction_date);
      const sDate = new Date(ledgerStart);
      if (vDate < sDate) return false;
    }
    if (ledgerEnd) {
      const vDate = new Date(v.transaction_date);
      const eDate = new Date(ledgerEnd);
      eDate.setHours(23, 59, 59, 999);
      if (vDate > eDate) return false;
    }
    return true;
  });

  const fetchAccountsAndVouchers = async () => {
    if (!token) return; setLoading(true);
    try {
      const [accRes, vRes] = await Promise.all([fetch(`${API_BASE_URL}/accounting/accounts`, { headers: { Authorization: `Bearer ${token}` } }), fetch(`${API_BASE_URL}/accounting/vouchers`, { headers: { Authorization: `Bearer ${token}` } })]);
      const accData = await accRes.json(); const vData = await vRes.json();
      if (Array.isArray(accData)) setAccounts(accData); if (Array.isArray(vData)) setVouchers(vData);
    } catch { toast.error("Failed to load ledger data."); } finally { setLoading(false); }
  };

  const fetchReport = useCallback(async () => {
    if (!token) return; setLoadingReport(true);
    try {
      const { period, year, month } = reportFilter;
      const url = `${API_BASE_URL}/accounting/reports?period=${period}&year=${year}${period === "monthly" ? `&month=${month}` : ""}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json(); setReportData(data);
    } catch { toast.error("Failed to load reports."); } finally { setLoadingReport(false); }
  }, [token, reportFilter]);

  const fetchCashFlow = useCallback(async () => {
    if (!token) return; setCashFlowLoading(true);
    try {
      const { period, year, month } = reportFilter;
      const url = `${API_BASE_URL}/accounting/reports/cashflow?period=${period}&year=${year}${period === "monthly" ? `&month=${month}` : ""}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json(); setCashFlowData(data);
    } catch { toast.error("Failed to load cash flow."); } finally { setCashFlowLoading(false); }
  }, [token, reportFilter]);

  const fetchAuditLog = useCallback(async () => {
    if (!token) return; setAuditLoading(true);
    try { const res = await fetch(`${API_BASE_URL}/accounting/audit`, { headers: { Authorization: `Bearer ${token}` } }); const data = await res.json(); if (Array.isArray(data)) setAuditLogs(data); }
    catch { toast.error("Failed to load audit log."); } finally { setAuditLoading(false); }
  }, [token]);

  const fetchAccountLedger = useCallback(async (account: Account) => {
    if (!token) return; setDrillLoading(true); setDrillEntries([]);
    try {
      const params = new URLSearchParams(); if (drillStart) params.append("startDate", drillStart); if (drillEnd) params.append("endDate", drillEnd);
      const res = await fetch(`${API_BASE_URL}/accounting/accounts/${account.id}/ledger?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json(); if (data.entries) setDrillEntries(data.entries);
    } catch { toast.error("Failed to load account ledger."); } finally { setDrillLoading(false); }
  }, [token, drillStart, drillEnd]);

  useEffect(() => { fetchAccountsAndVouchers(); }, [token]);
  useEffect(() => { if (activeTab === "reports") { fetchReport(); } if (activeTab === "reports" || activeTab === "accounts") { fetchCashFlow(); } }, [activeTab, reportFilter]);
  useEffect(() => { if (activeTab === "audit") fetchAuditLog(); }, [activeTab]);
  useEffect(() => { if (drillAccount) fetchAccountLedger(drillAccount); }, [drillAccount, drillStart, drillEnd]);

  useEffect(() => {
    if (!openVoucherDialog) {
      setDebitParentId("");
      setCreditParentId("");
      setVoucherForm({ debit_code: "", credit_code: "", amount: "", description: "", transaction_date: new Date().toISOString().split("T")[0] });
    }
  }, [openVoucherDialog]);

  const handleCreateVoucher = async (e: React.FormEvent) => {
    e.preventDefault(); if (!token || !voucherForm.debit_code || !voucherForm.credit_code || !voucherForm.amount || !voucherForm.description) { toast.error("Fill all fields."); return; }
    try {
      const res = await fetch(`${API_BASE_URL}/accounting/vouchers`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ debit_code: voucherForm.debit_code, credit_code: voucherForm.credit_code, amount: parseFloat(voucherForm.amount), description: voucherForm.description, transaction_date: voucherForm.transaction_date }) });
      if (res.ok) { toast.success("Voucher posted!"); setOpenVoucherDialog(false); setVoucherForm({ debit_code: "", credit_code: "", amount: "", description: "", transaction_date: new Date().toISOString().split("T")[0] }); setDebitParentId(""); setCreditParentId(""); fetchAccountsAndVouchers(); }
      else { const err = await res.json(); toast.error(err.message || "Failed."); }
    } catch { toast.error("Network error."); }
  };

  const handleCorrectVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !correctVoucher) return;
    if (!correctionForm.reason || !correctionForm.reason.trim()) {
      toast.error("Reason for correction is mandatory.");
      return;
    }
    setCorrectSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/accounting/vouchers/${correctVoucher.id}/correct`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          debit_account_id: correctionForm.debit_account_id || undefined,
          credit_account_id: correctionForm.credit_account_id || undefined,
          amount: correctionForm.amount ? parseFloat(correctionForm.amount) : undefined,
          description: correctionForm.description || undefined,
          reason: correctionForm.reason,
        }),
      });

      if (res.ok) {
        toast.success(`Voucher ${correctVoucher.voucher_no} corrected & audit log created!`);
        setCorrectVoucher(null);
        setCorrectionForm({ debit_account_id: "", credit_account_id: "", amount: "", description: "", reason: "" });
        fetchAccountsAndVouchers();
      } else {
        const err = await res.json();
        toast.error(err.message || "Failed to submit correction.");
      }
    } catch {
      toast.error("Network error submitting correction.");
    } finally {
      setCorrectSubmitting(false);
    }
  };

  const handleViewAuditLogs = async (v: Voucher) => {
    setViewAuditVoucher(v);
    setAuditLoadingLogs(true);
    try {
      const res = await fetch(`${API_BASE_URL}/accounting/vouchers/${v.id}/audit-trail`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (Array.isArray(data)) setVoucherAuditLogs(data);
      else setVoucherAuditLogs(v.audit_logs || []);
    } catch {
      setVoucherAuditLogs(v.audit_logs || []);
    } finally {
      setAuditLoadingLogs(false);
    }
  };

  const handleDeleteVoucher = async () => {
    if (!token || !deleteVoucherTarget) return;
    try {
      setDeletingVoucher(true);
      const res = await fetch(`${API_BASE_URL}/accounting/vouchers/${deleteVoucherTarget.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        toast.success(`Voucher ${deleteVoucherTarget.voucher_no} deleted successfully.`);
        setDeleteVoucherTarget(null);
        fetchAccountsAndVouchers();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || "Failed to delete voucher.");
      }
    } catch (e) {
      toast.error("Network error occurred.");
    } finally {
      setDeletingVoucher(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault(); if (!token || !accountForm.name || !accountForm.code) { toast.error("Fill all fields."); return; }
    try {
      const res = await fetch(`${API_BASE_URL}/accounting/accounts`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ name: accountForm.name, code: accountForm.code, type: accountForm.type, parent_id: accountForm.parent_id || undefined, opening_balance: accountForm.opening_balance ? parseFloat(accountForm.opening_balance) : undefined }) });
      if (res.ok) { toast.success("Account created!"); setOpenAccountDialog(false); setAccountForm({ name: "", code: "", type: "ASSET", parent_id: "", opening_balance: "" }); fetchAccountsAndVouchers(); }
      else { const err = await res.json(); toast.error(err.message || "Failed."); }
    } catch { toast.error("Network error."); }
  };

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault(); if (!token || !transactionForm.category_id || !transactionForm.bank_account_id || !transactionForm.amount || !transactionForm.description) { toast.error("Fill all fields."); return; }
    try {
      const res = await fetch(`${API_BASE_URL}/accounting/transactions`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ type: transactionForm.type, category_id: transactionForm.category_id, bank_account_id: transactionForm.bank_account_id, amount: parseFloat(transactionForm.amount), description: transactionForm.description, transaction_date: transactionForm.transaction_date }) });
      if (res.ok) { toast.success("Transaction saved!"); setOpenTransactionDialog(false); setTransactionForm({ type: "EXPENSE", category_id: "", bank_account_id: "", amount: "", description: "", transaction_date: new Date().toISOString().split("T")[0] }); fetchAccountsAndVouchers(); if (activeTab === "reports") { fetchReport(); } if (activeTab === "reports" || activeTab === "accounts") { fetchCashFlow(); } }
      else { const err = await res.json(); toast.error(err.message || "Failed."); }
    } catch { toast.error("Network error."); }
  };

  const handleUpdateOpeningBalance = async (e: React.FormEvent) => {
    e.preventDefault(); if (!token || !editOBAccount || !editOBAmount) return; setEditOBLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/accounting/accounts/${editOBAccount.id}/opening-balance`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ amount: parseFloat(editOBAmount) }) });
      if (res.ok) { toast.success(`Opening balance for ${editOBAccount.name} updated!`); setEditOBAccount(null); setEditOBAmount(""); fetchAccountsAndVouchers(); }
      else { const err = await res.json(); toast.error(err.message || "Failed."); }
    } catch { toast.error("Network error."); } finally { setEditOBLoading(false); }
  };

  const downloadExcelReport = async () => {
    if (!reportData) { toast.error("No report data."); return; }
    try {
      const XLSX = await import("xlsx");
      const plData = [
        ["GLOBAL SAFETY SOLUTION"],
        ["PROFIT & LOSS STATEMENT"],
        [],
        ["Type", "Account", "Code", "Amount (INR)"],
        ...(reportData.profitAndLoss?.revenues || []).map((r: any) => ["Revenue", r.name, r.code, Number(r.periodBalance)]),
        ["Total Revenue", "", "", Number(reportData.profitAndLoss?.totalRevenue || 0)],
        ...(reportData.profitAndLoss?.expenses || []).map((e: any) => ["Expense", e.name, e.code, Number(e.periodBalance)]),
        ["Total Expense", "", "", Number(reportData.profitAndLoss?.totalExpense || 0)],
        ["Net Profit", "", "", Number(reportData.profitAndLoss?.netProfit || 0)]
      ];
      
      const bsData = [
        ["GLOBAL SAFETY SOLUTION"],
        ["BALANCE SHEET SUMMARY"],
        [],
        ["Classification", "Account Name", "Code", "Balance (INR)"],
        ["ASSETS", "", "", ""],
        ...(reportData.balanceSheet?.assets || []).map((a: any) => ["Asset", a.name, a.code, Number(a.periodBalance)]),
        ["Total Assets", "", "", Number(reportData.balanceSheet?.totalAssets || 0)],
        [],
        ["LIABILITIES", "", "", ""],
        ...(reportData.balanceSheet?.liabilities || []).map((l: any) => ["Liability", l.name, l.code, Number(l.periodBalance)]),
        ["Total Liabilities", "", "", Number(reportData.balanceSheet?.totalLiabilities || 0)],
        [],
        ["EQUITY", "", "", ""],
        ...(reportData.balanceSheet?.equity || []).map((eq: any) => ["Equity", eq.name, eq.code, Number(eq.periodBalance)]),
        ["Difference in Opening Balances", "", "", Number(reportData.balanceSheet?.differenceInOpeningBalances || 0)],
        ["Total Equity", "", "", Number(reportData.balanceSheet?.totalEquity || 0)],
        ["Total Liabilities & Equity", "", "", Number(reportData.balanceSheet?.totalLiabilities || 0) + Number(reportData.balanceSheet?.totalEquity || 0) + Number(reportData.balanceSheet?.differenceInOpeningBalances || 0)]
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(plData), "Profit & Loss");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(bsData), "Balance Sheet");
      const { period, year, month } = reportFilter;
      const ds = period === "monthly" ? `${new Date(year, month).toLocaleString("default", { month: "short" })}-${year}` : period === "halfyearly" ? `H-${year}` : `${year}`;
      XLSX.writeFile(wb, `Audit_Financial_Statement_${ds}.xlsx`); 
      toast.success("Excel downloaded!");
    } catch { toast.error("Excel generation failed."); }
  };

  const downloadPDFReport = async () => {
    if (!reportData) return;
    const jsPDF = (await import("jspdf")).default;
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF();
    const { period, year, month } = reportFilter;
    const ds = period === "monthly" ? new Date(year, month).toLocaleString("default", { month: "long", year: "numeric" }) : period === "halfyearly" ? `Half Yearly (${year})` : `Yearly (${year})`;
    doc.setFontSize(20); doc.setFont("helvetica", "bold"); doc.text("GLOBAL SAFETY SOLUTION", 14, 20);
    doc.setFontSize(12); doc.setFont("helvetica", "normal"); doc.text(`Consolidated Audit Statement - ${ds}`, 14, 28); doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 34); doc.line(14, 38, 196, 38);
    autoTable(doc, { startY: 42, head: [["Indicator", "Balance"]], body: [["Total Revenue", `INR ${(reportData.profitAndLoss?.totalRevenue || 0).toLocaleString()}`], ["Total Expenses", `INR ${(reportData.profitAndLoss?.totalExpense || 0).toLocaleString()}`], ["Net Profit", `INR ${(reportData.profitAndLoss?.netProfit || 0).toLocaleString()}`]], theme: "striped", styles: { fontSize: 10 }, headStyles: { fillColor: [79, 70, 229] } });
    let y = (doc as any).lastAutoTable.finalY + 15;
    autoTable(doc, { startY: y, head: [["Classification", "Balance"]], body: [["Total Assets", `INR ${(reportData.balanceSheet?.totalAssets || 0).toLocaleString()}`], ["Total Liabilities", `INR ${(reportData.balanceSheet?.totalLiabilities || 0).toLocaleString()}`], ["Total Equity", `INR ${(reportData.balanceSheet?.totalEquity || 0).toLocaleString()}`], ["Difference in Opening Balances", `INR ${(reportData.balanceSheet?.differenceInOpeningBalances || 0).toLocaleString()}`], ["Total Liabilities & Equity", `INR ${(Number(reportData.balanceSheet?.totalLiabilities || 0) + Number(reportData.balanceSheet?.totalEquity || 0) + Number(reportData.balanceSheet?.differenceInOpeningBalances || 0)).toLocaleString()}`]], theme: "striped", styles: { fontSize: 10 }, headStyles: { fillColor: [13, 148, 136] } });
    const savDs = period === "monthly" ? `${new Date(year, month).toLocaleString("default", { month: "short" })}-${year}` : `${year}`;
    doc.save(`Audit_Financial_Statement_${savDs}.pdf`); 
    toast.success("PDF downloaded!");
  };

  const downloadCOAExcel = async () => {
    try {
      const XLSX = await import("xlsx");
      const data = [
        ["GLOBAL SAFETY SOLUTION"],
        ["CHART OF ACCOUNTS"],
        [],
        ["Code", "Account Name", "Classification", "Current Balance (INR)"],
        ...(accounts || []).map(a => [a.code, a.name, a.type, Number(a.balance)])
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), "Chart of Accounts");
      XLSX.writeFile(wb, "Chart_of_Accounts.xlsx");
      toast.success("COA Excel downloaded!");
    } catch { toast.error("COA Excel export failed."); }
  };

  const downloadCOAPDF = async () => {
    const jsPDF = (await import("jspdf")).default;
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF();
    doc.setFontSize(18); doc.setFont("helvetica", "bold"); doc.text("GLOBAL SAFETY SOLUTION", 14, 20);
    doc.setFontSize(12); doc.setFont("helvetica", "normal"); doc.text("Chart of Accounts Registry", 14, 27); doc.line(14, 32, 196, 32);
    autoTable(doc, {
      startY: 36,
      head: [["Code", "Account Name", "Classification", "Balance (INR)"]],
      body: (accounts || []).map(a => [a.code, a.name, a.type, `₹${Number(a.balance).toLocaleString()}`]),
      theme: "striped",
      headStyles: { fillColor: [79, 70, 229] }
    });
    doc.save("Chart_of_Accounts.pdf");
    toast.success("COA PDF downloaded!");
  };

  const downloadTrialBalanceExcel = async () => {
    if (!reportData?.trialBalance) { toast.error("No trial balance data."); return; }
    try {
      const XLSX = await import("xlsx");
      const tb = reportData.trialBalance;
      const td = tb.reduce((s: number, t: any) => s + Number(t.debit), 0);
      const tc = tb.reduce((s: number, t: any) => s + Number(t.credit), 0);
      const data = [
        ["GLOBAL SAFETY SOLUTION"],
        ["TRIAL BALANCE"],
        [],
        ["Code", "Account Name", "Type", "Debit (INR)", "Credit (INR)"],
        ...tb.map((t: any) => [t.code, t.name, t.type === "DIFF_OP_BALANCE" ? "Diff in Op. Balance" : t.type, t.debit > 0 ? Number(t.debit) : "", t.credit > 0 ? Number(t.credit) : ""]),
        [],
        ["Total Sum", "", "", td, tc],
        [Math.abs(td - tc) < 0.01 ? "✓ Balanced" : "✗ Unbalanced", "", "", "", ""]
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), "Trial Balance");
      XLSX.writeFile(wb, "Trial_Balance.xlsx");
      toast.success("Trial Balance Excel downloaded!");
    } catch { toast.error("Trial Balance Excel export failed."); }
  };

  const downloadTrialBalancePDF = async () => {
    if (!reportData?.trialBalance) { toast.error("No trial balance data."); return; }
    const jsPDF = (await import("jspdf")).default;
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF();
    const tb = reportData.trialBalance;
    const td = tb.reduce((s: number, t: any) => s + Number(t.debit), 0);
    const tc = tb.reduce((s: number, t: any) => s + Number(t.credit), 0);
    const isBalanced = Math.abs(td - tc) < 0.01;
    doc.setFontSize(18); doc.setFont("helvetica", "bold"); doc.text("GLOBAL SAFETY SOLUTION", 14, 20);
    doc.setFontSize(12); doc.setFont("helvetica", "normal"); doc.text("Trial Balance Summary Sheet", 14, 27); doc.line(14, 32, 196, 32);
    autoTable(doc, {
      startY: 36,
      head: [["Code", "Account Name", "Classification", "Debit (Dr)", "Credit (Cr)"]],
      body: [
        ...tb.map((t: any) => [t.code, t.name, t.type === "DIFF_OP_BALANCE" ? "Diff in Op. Balance" : t.type, t.debit > 0 ? `₹${Number(t.debit).toLocaleString()}` : "—", t.credit > 0 ? `₹${Number(t.credit).toLocaleString()}` : "—"]),
        ["Total Sum", "Aggregate Totals", "", `₹${td.toLocaleString()}`, `₹${tc.toLocaleString()}`],
        [isBalanced ? "✓ Balanced — Books Correct" : "✗ Unbalanced", "", "", "", ""]
      ],
      theme: "striped",
      headStyles: { fillColor: [234, 88, 12] }
    });
    doc.save("Trial_Balance.pdf");
    toast.success("Trial Balance PDF downloaded!");
  };

  const downloadDrillLedgerExcel = async (account: Account, entries: any[]) => {
    try {
      const XLSX = await import("xlsx");
      const data = [
        ["GLOBAL SAFETY SOLUTION"],
        [`LEDGER STATEMENT: ${account.name.toUpperCase()} (${account.code})`],
        [],
        ["Voucher No", "Date", "Particulars", "Debit (INR)", "Credit (INR)", "Running Balance (INR)", "Audited By"],
        ...entries.map(e => [
          e.voucher_no,
          new Date(e.transaction_date).toLocaleDateString(),
          `${e.particulars} (${e.particulars_code})`,
          e.debit > 0 ? Number(e.debit) : "",
          e.credit > 0 ? Number(e.credit) : "",
          Number(e.balance),
          e.created_by
        ])
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), "Ledger Account Details");
      XLSX.writeFile(wb, `Ledger_Account_${account.code}.xlsx`);
      toast.success("Ledger Excel downloaded!");
    } catch { toast.error("Ledger Excel export failed."); }
  };

  const downloadDrillLedgerPDF = async (account: Account, entries: any[]) => {
    const jsPDF = (await import("jspdf")).default;
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF();
    doc.setFontSize(18); doc.setFont("helvetica", "bold"); doc.text("GLOBAL SAFETY SOLUTION", 14, 20);
    doc.setFontSize(12); doc.setFont("helvetica", "normal"); doc.text(`Ledger Statement for Account: ${account.name} (${account.code})`, 14, 27); doc.line(14, 32, 196, 32);
    autoTable(doc, {
      startY: 36,
      head: [["Voucher No", "Date", "Particulars", "Debit", "Credit", "Running Balance", "Audited By"]],
      body: entries.map(e => [
        e.voucher_no,
        new Date(e.transaction_date).toLocaleDateString(),
        `${e.particulars} (${e.particulars_code})`,
        e.debit > 0 ? `₹${Number(e.debit).toLocaleString()}` : "—",
        e.credit > 0 ? `₹${Number(e.credit).toLocaleString()}` : "—",
        `₹${Number(e.balance).toLocaleString()}`,
        e.created_by
      ]),
      theme: "striped",
      headStyles: { fillColor: [79, 70, 229] }
    });
    doc.save(`Ledger_Account_${account.code}.pdf`);
    toast.success("Ledger PDF downloaded!");
  };

  const downloadLedgerBoardExcel = async () => {
    try {
      const XLSX = await import("xlsx");
      const data = [
        ["GLOBAL SAFETY SOLUTION"],
        ["GENERAL LEDGER VOUCHERS BOARD"],
        [],
        ["Voucher No", "Date", "Particulars (Dr / Cr)", "Debit (INR)", "Credit (INR)", "Narration", "Audited By"],
        ...filteredVouchers.map(v => [
          v.voucher_no,
          new Date(v.transaction_date).toLocaleDateString(),
          `Dr: ${v.debit_account?.name || ""} / Cr: ${v.credit_account?.name || ""}`,
          Number(v.amount),
          Number(v.amount),
          v.description,
          v.created_by
        ])
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), "Ledger Board");
      XLSX.writeFile(wb, "Ledger_Board_Vouchers.xlsx");
      toast.success("Ledger Board Excel downloaded!");
    } catch { toast.error("Ledger Board Excel export failed."); }
  };

  const downloadLedgerBoardPDF = async () => {
    const jsPDF = (await import("jspdf")).default;
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF();
    doc.setFontSize(18); doc.setFont("helvetica", "bold"); doc.text("GLOBAL SAFETY SOLUTION", 14, 20);
    doc.setFontSize(12); doc.setFont("helvetica", "normal"); doc.text("General Ledger Vouchers Audit Log", 14, 27); doc.line(14, 32, 196, 32);
    autoTable(doc, {
      startY: 36,
      head: [["Voucher No", "Date", "Dr Particulars", "Cr Particulars", "Debit Amount", "Credit Amount", "Audited By"]],
      body: filteredVouchers.map(v => [
        v.voucher_no,
        new Date(v.transaction_date).toLocaleDateString(),
        `${v.debit_account?.name || ""} (${v.debit_account?.code || ""})`,
        `${v.credit_account?.name || ""} (${v.credit_account?.code || ""})`,
        `₹${Number(v.amount).toLocaleString()}`,
        `₹${Number(v.amount).toLocaleString()}`,
        v.created_by
      ]),
      theme: "striped",
      headStyles: { fillColor: [79, 70, 229] }
    });
    doc.save("Ledger_Board_Vouchers.pdf");
    toast.success("Ledger Board PDF downloaded!");
  };

  const tabs = [
    { key: "ledgers" as TabType, label: "Ledger Board", icon: Activity },
    { key: "accounts" as TabType, label: "Chart of Accounts", icon: Scale },
    { key: "reports" as TabType, label: "Financial Reports", icon: TrendingUp },
    { key: "trialbalance" as TabType, label: "Trial Balance", icon: Scale },
    { key: "audit" as TabType, label: "Audit Trail", icon: ShieldAlert },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 px-1 sm:px-0">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground to-muted-foreground flex items-center gap-2 sm:gap-3">
            <Calculator className="w-7 h-7 sm:w-9 sm:h-9 text-indigo-500 shrink-0" /> Tally Ledger & Accounts
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-1">Professional double-entry ledger book, chart of accounts, and audit reports.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full lg:w-auto">
          <Dialog open={openAccountDialog} onOpenChange={setOpenAccountDialog}>
            <DialogTrigger asChild><Button variant="outline" className="border-border hover:bg-accent/10 rounded-xl h-10 sm:h-11 font-bold w-full sm:w-auto">Add Account</Button></DialogTrigger>
            <DialogContent className="bg-card border-border text-foreground rounded-2xl max-w-md p-4 sm:p-6 w-[95vw] sm:w-full">
              <DialogHeader><DialogTitle className="text-lg sm:text-xl font-bold">New Ledger Account</DialogTitle><DialogDescription className="text-xs sm:text-sm">Initialize a new account in your Chart of Accounts.</DialogDescription></DialogHeader>
              <form onSubmit={handleCreateAccount} className="space-y-3 sm:space-y-4 py-2 sm:py-4">
                <div className="space-y-1"><Label className="text-xs sm:text-sm">Account Name</Label><Input placeholder="e.g. Petty Cash" value={accountForm.name} onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })} className="bg-background border-border h-9 sm:h-10 text-xs sm:text-sm" /></div>
                <div className="space-y-1"><Label className="text-xs sm:text-sm">Account Code (Unique)</Label><Input placeholder="e.g. 1020" value={accountForm.code} onChange={(e) => setAccountForm({ ...accountForm, code: e.target.value })} className="bg-background border-border h-9 sm:h-10 text-xs sm:text-sm" /></div>
                <div className="space-y-1"><Label className="text-xs sm:text-sm">Classification</Label>
                  <select value={accountForm.type} onChange={(e) => setAccountForm({ ...accountForm, type: e.target.value, parent_id: "" })} className="w-full h-9 sm:h-10 px-3 rounded-lg border border-border bg-background text-foreground text-xs sm:text-sm">
                    <option value="ASSET">ASSET</option><option value="LIABILITY">LIABILITY</option><option value="EQUITY">EQUITY</option><option value="REVENUE">REVENUE</option><option value="EXPENSE">EXPENSE</option>
                  </select>
                </div>
                <div className="space-y-1"><Label className="text-xs sm:text-sm">Parent Account (Optional)</Label>
                  <select value={accountForm.parent_id} onChange={(e) => setAccountForm({ ...accountForm, parent_id: e.target.value })} className="w-full h-9 sm:h-10 px-3 rounded-lg border border-border bg-background text-foreground text-xs sm:text-sm">
                    <option value="">None (Primary Category)</option>
                    {(accounts || []).filter(a => a.type === accountForm.type && !a.parent_id).map(a => (<option key={a.id} value={a.id}>{a.name} ({a.code})</option>))}
                  </select>
                </div>
                <div className="space-y-1"><Label className="text-xs sm:text-sm">Opening Balance (INR - Optional)</Label><Input type="number" step="0.01" placeholder="0.00" value={accountForm.opening_balance} onChange={(e) => setAccountForm({ ...accountForm, opening_balance: e.target.value })} className="bg-background border-border h-9 sm:h-10 text-xs sm:text-sm" /></div>
                <DialogFooter className="pt-2"><Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold w-full rounded-xl h-10 text-xs sm:text-sm">Create Account</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={openTransactionDialog} onOpenChange={setOpenTransactionDialog}>
            <DialogTrigger asChild><Button className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl h-10 sm:h-11 font-bold px-4 sm:px-6 shadow-lg shadow-emerald-500/20 w-full sm:w-auto"><Plus className="w-4 h-4 mr-1.5 sm:mr-2 shrink-0" /> Log Transaction</Button></DialogTrigger>
            <DialogContent className="bg-card border-border text-foreground rounded-2xl max-w-lg p-4 sm:p-6 w-[95vw] sm:w-full">
              <DialogHeader><DialogTitle className="text-lg sm:text-xl font-bold">Log Transaction</DialogTitle><DialogDescription className="text-xs sm:text-sm">Record a manual expense or income receipt.</DialogDescription></DialogHeader>
              <form onSubmit={handleCreateTransaction} className="space-y-3 sm:space-y-4 py-2 sm:py-4">
                <div className="space-y-1"><Label className="text-xs sm:text-sm">Transaction Type</Label>
                  <select value={transactionForm.type} onChange={(e) => setTransactionForm({ ...transactionForm, type: e.target.value as any, category_id: "" })} className="w-full h-9 sm:h-10 px-3 rounded-lg border border-border bg-background text-foreground text-xs sm:text-sm">
                    <option value="EXPENSE">Expense (Outflow / Payment)</option><option value="REVENUE">Revenue (Inflow / Receipt)</option>
                  </select>
                </div>
                <div className="space-y-1"><Label className="text-xs sm:text-sm">Category Account</Label>
                  <select value={transactionForm.category_id} onChange={(e) => setTransactionForm({ ...transactionForm, category_id: e.target.value })} className="w-full h-9 sm:h-10 px-3 rounded-lg border border-border bg-background text-foreground text-xs sm:text-sm">
                    <option value="">Select Category</option>
                    {(accounts || []).filter(a => a.type === (transactionForm.type === "EXPENSE" ? "EXPENSE" : "REVENUE")).map(a => (<option key={a.id} value={a.id}>{a.name} ({a.code})</option>))}
                  </select>
                </div>
                <div className="space-y-1"><Label className="text-xs sm:text-sm">{transactionForm.type === "EXPENSE" ? "Paid From (Bank/Cash Account)" : "Deposit To (Bank/Cash Account)"}</Label>
                  <select value={transactionForm.bank_account_id} onChange={(e) => setTransactionForm({ ...transactionForm, bank_account_id: e.target.value })} className="w-full h-9 sm:h-10 px-3 rounded-lg border border-border bg-background text-foreground text-xs sm:text-sm">
                    <option value="">Select Account</option>
                    {(accounts || []).filter(a => a.type === "ASSET").map(a => (<option key={a.id} value={a.id}>{a.name} ({a.code})</option>))}
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-1"><Label className="text-xs sm:text-sm">Amount (INR)</Label><Input type="number" step="0.01" placeholder="0.00" value={transactionForm.amount} onChange={(e) => setTransactionForm({ ...transactionForm, amount: e.target.value })} className="bg-background border-border h-9 sm:h-10 text-xs sm:text-sm" /></div>
                  <div className="space-y-1"><Label className="text-xs sm:text-sm">Transaction Date</Label><Input type="date" value={transactionForm.transaction_date} onChange={(e) => setTransactionForm({ ...transactionForm, transaction_date: e.target.value })} className="bg-background border-border h-9 sm:h-10 text-xs sm:text-sm" /></div>
                </div>
                <div className="space-y-1"><Label className="text-xs sm:text-sm">Narration</Label><Input placeholder="e.g. Paid Wi-Fi bill" value={transactionForm.description} onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })} className="bg-background border-border h-9 sm:h-10 text-xs sm:text-sm" /></div>
                <DialogFooter className="pt-2"><Button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold w-full rounded-xl h-10 text-xs sm:text-sm">Save Transaction</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={openVoucherDialog} onOpenChange={setOpenVoucherDialog}>
            <DialogTrigger asChild><Button className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl h-10 sm:h-11 font-bold px-4 sm:px-6 shadow-lg shadow-indigo-500/20 w-full sm:w-auto"><Plus className="w-4 h-4 mr-1.5 sm:mr-2 shrink-0" /> Post Voucher</Button></DialogTrigger>
            <DialogContent className="bg-card border-border text-foreground rounded-2xl max-w-lg p-4 sm:p-6 w-[95vw] sm:w-full">
              <DialogHeader><DialogTitle className="text-lg sm:text-xl font-bold">New Journal Voucher (JV)</DialogTitle><DialogDescription className="text-xs sm:text-sm">Record a custom double-entry ledger voucher.</DialogDescription></DialogHeader>
              <form onSubmit={handleCreateVoucher} className="space-y-3 sm:space-y-4 py-2 sm:py-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs sm:text-sm">Debit Account (Dr.)</Label>
                    <select
                      value={debitParentId}
                      onChange={(e) => {
                        const pId = e.target.value;
                        setDebitParentId(pId);
                        const acc = (accounts || []).find(a => a.id === pId);
                        const kids = getChildrenOf(pId);
                        if (kids.length === 0) {
                          setVoucherForm({ ...voucherForm, debit_code: acc ? acc.code : "" });
                        } else {
                          setVoucherForm({ ...voucherForm, debit_code: "" });
                        }
                      }}
                      className="w-full h-9 sm:h-10 px-3 rounded-lg border border-border bg-background text-foreground text-xs sm:text-sm"
                    >
                      <option value="">Select Account Head</option>
                      {(accounts || []).filter(a => !a.parent_id || !(accounts || []).some(p => p.id === a.parent_id)).map(a => (
                        <option key={a.id} value={a.id}>{a.name} ({a.code})</option>
                      ))}
                    </select>
                    {debitParentId && getChildrenOf(debitParentId).length > 0 && (
                      <div className="space-y-1 mt-2">
                        <Label className="text-xs sm:text-sm text-indigo-500">Select Debit Sub-head</Label>
                        <select
                          value={voucherForm.debit_code}
                          onChange={(e) => setVoucherForm({ ...voucherForm, debit_code: e.target.value })}
                          className="w-full h-9 sm:h-10 px-3 rounded-lg border border-indigo-500/50 bg-background text-foreground text-xs sm:text-sm font-medium"
                        >
                          <option value="">Select Sub-head</option>
                          {getChildrenOf(debitParentId).map(a => (
                            <option key={a.id} value={a.code}>↳ {a.name} ({a.code})</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs sm:text-sm">Credit Account (Cr.)</Label>
                    <select
                      value={creditParentId}
                      onChange={(e) => {
                        const pId = e.target.value;
                        setCreditParentId(pId);
                        const acc = (accounts || []).find(a => a.id === pId);
                        const kids = getChildrenOf(pId);
                        if (kids.length === 0) {
                          setVoucherForm({ ...voucherForm, credit_code: acc ? acc.code : "" });
                        } else {
                          setVoucherForm({ ...voucherForm, credit_code: "" });
                        }
                      }}
                      className="w-full h-9 sm:h-10 px-3 rounded-lg border border-border bg-background text-foreground text-xs sm:text-sm"
                    >
                      <option value="">Select Account Head</option>
                      {(accounts || []).filter(a => !a.parent_id || !(accounts || []).some(p => p.id === a.parent_id)).map(a => (
                        <option key={a.id} value={a.id}>{a.name} ({a.code})</option>
                      ))}
                    </select>
                    {creditParentId && getChildrenOf(creditParentId).length > 0 && (
                      <div className="space-y-1 mt-2">
                        <Label className="text-xs sm:text-sm text-indigo-500">Select Credit Sub-head</Label>
                        <select
                          value={voucherForm.credit_code}
                          onChange={(e) => setVoucherForm({ ...voucherForm, credit_code: e.target.value })}
                          className="w-full h-9 sm:h-10 px-3 rounded-lg border border-indigo-500/50 bg-background text-foreground text-xs sm:text-sm font-medium"
                        >
                          <option value="">Select Sub-head</option>
                          {getChildrenOf(creditParentId).map(a => (
                            <option key={a.id} value={a.code}>↳ {a.name} ({a.code})</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-1"><Label className="text-xs sm:text-sm">Amount (INR)</Label><Input type="number" step="0.01" placeholder="0.00" value={voucherForm.amount} onChange={(e) => setVoucherForm({ ...voucherForm, amount: e.target.value })} className="bg-background border-border h-9 sm:h-10 text-xs sm:text-sm" /></div>
                  <div className="space-y-1"><Label className="text-xs sm:text-sm">Posting Date</Label><Input type="date" value={voucherForm.transaction_date} onChange={(e) => setVoucherForm({ ...voucherForm, transaction_date: e.target.value })} className="bg-background border-border h-9 sm:h-10 text-xs sm:text-sm" /></div>
                </div>
                <div className="space-y-1"><Label className="text-xs sm:text-sm">Narration</Label><Input placeholder="Enter transactional details" value={voucherForm.description} onChange={(e) => setVoucherForm({ ...voucherForm, description: e.target.value })} className="bg-background border-border h-9 sm:h-10 text-xs sm:text-sm" /></div>
                <DialogFooter className="pt-2"><Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold w-full rounded-xl h-10 text-xs sm:text-sm">Post Journal Voucher</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex overflow-x-auto whitespace-nowrap border-b border-border/80 -mx-1 px-1 sm:mx-0 sm:px-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={cn("px-4 sm:px-5 py-3 font-bold text-xs sm:text-sm border-b-2 transition-all flex items-center gap-2 shrink-0", activeTab === tab.key ? "border-indigo-500 text-indigo-500" : "border-transparent text-muted-foreground hover:text-foreground")}>
            <tab.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />{tab.label}
          </button>
        ))}
      </div>

      {loading && activeTab !== "reports" && activeTab !== "trialbalance" && activeTab !== "audit" ? (
        <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div></div>
      ) : (
        <>
          {activeTab === "ledgers" && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 sm:p-6 border-b border-border flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <h3 className="font-bold text-base sm:text-lg">Voucher Audit Entries</h3>
                <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full lg:w-auto">
                  <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
                    <div className="flex items-center gap-1.5 w-full">
                      <span className="text-[10px] sm:text-xs text-muted-foreground uppercase font-bold shrink-0">From</span>
                      <Input type="date" value={ledgerStart} onChange={e => setLedgerStart(e.target.value)} className="h-9 text-xs bg-background border-border w-full sm:w-32 rounded-xl" />
                    </div>
                    <div className="flex items-center gap-1.5 w-full">
                      <span className="text-[10px] sm:text-xs text-muted-foreground uppercase font-bold shrink-0">To</span>
                      <Input type="date" value={ledgerEnd} onChange={e => setLedgerEnd(e.target.value)} className="h-9 text-xs bg-background border-border w-full sm:w-32 rounded-xl" />
                    </div>
                  </div>
                  <div className="relative w-full sm:w-48">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                    <Input placeholder="Search vouchers..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9 w-full bg-background border-border rounded-xl text-xs sm:text-sm" />
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                    <Button onClick={downloadLedgerBoardExcel} size="sm" variant="outline" className="h-9 rounded-xl border-border hover:bg-indigo-500/10 hover:text-indigo-500 font-bold text-xs w-full sm:w-auto"><Download className="w-3.5 h-3.5 mr-1.5" /> Excel</Button>
                    <Button onClick={downloadLedgerBoardPDF} size="sm" variant="outline" className="h-9 rounded-xl border-border hover:bg-emerald-500/10 hover:text-emerald-500 font-bold text-xs w-full sm:w-auto"><Download className="w-3.5 h-3.5 mr-1.5" /> PDF</Button>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[850px]">
                  <thead><tr className="bg-accent/5 border-b border-border text-muted-foreground text-xs font-black uppercase tracking-wider"><th className="py-4 px-6">Voucher No</th><th className="py-4 px-6">Date</th><th className="py-4 px-6">Particulars (Dr / Cr)</th><th className="py-4 px-6 text-right">Debit (Dr)</th><th className="py-4 px-6 text-right">Credit (Cr)</th><th className="py-4 px-6">Narration</th><th className="py-4 px-6">Audited By</th><th className="py-4 px-6 text-center">Actions / Audit</th></tr></thead>
                  <tbody className="divide-y divide-border/60 text-sm">
                    {filteredVouchers.length === 0 ? (<tr><td colSpan={8} className="py-10 text-center text-muted-foreground italic">No vouchers found.</td></tr>) : filteredVouchers.map(v => (
                      <tr key={v.id} className="hover:bg-accent/5 transition-colors">
                        <td className="py-4 px-6 font-bold text-indigo-500">
                          <div>{v.voucher_no}</div>
                          {v.is_corrected && (
                            <span className="inline-block text-[10px] font-extrabold bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-md mt-1">
                              Corrected
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-muted-foreground">{new Date(v.transaction_date).toLocaleDateString()}</td>
                        <td className="py-4 px-6 font-medium space-y-1"><div className="flex items-center gap-1.5 text-emerald-500"><ArrowUpRight className="w-3.5 h-3.5" />{v.debit_account?.name || ""} ({v.debit_account?.code || ""})</div><div className="flex items-center gap-1.5 text-rose-500 pl-4"><ArrowDownLeft className="w-3.5 h-3.5" />{v.credit_account?.name || ""} ({v.credit_account?.code || ""})</div></td>
                        <td className="py-4 px-6 text-right font-bold text-emerald-500">₹{Number(v.amount).toLocaleString()}</td>
                        <td className="py-4 px-6 text-right font-bold text-rose-500">₹{Number(v.amount).toLocaleString()}</td>
                        <td className="py-4 px-6 text-muted-foreground max-w-xs truncate cursor-help" title={v.description}>{v.description}</td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-indigo-400" />
                            <span className="text-xs font-bold text-indigo-400">{v.created_by}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setCorrectVoucher(v);
                                setCorrectionForm({
                                  debit_account_id: v.debit_account?.id || "",
                                  credit_account_id: v.credit_account?.id || "",
                                  amount: String(v.amount),
                                  description: v.description,
                                  reason: "",
                                });
                              }}
                              className="h-8 text-xs font-bold border-amber-500/30 text-amber-500 hover:bg-amber-500/10 rounded-lg"
                            >
                              <Pencil className="w-3.5 h-3.5 mr-1" /> Edit / Correct
                            </Button>
                             {(v.is_corrected || (v.audit_logs && v.audit_logs.length > 0)) && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewAuditLogs(v)}
                                className="h-8 text-xs font-bold border-indigo-500/30 text-indigo-500 hover:bg-indigo-500/10 rounded-lg"
                              >
                                <History className="w-3.5 h-3.5 mr-1" /> Audit Trail
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setDeleteVoucherTarget(v)}
                              className="h-8 text-xs font-bold border-rose-500/30 text-rose-500 hover:bg-rose-500/10 rounded-lg"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "accounts" && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
                <div className="lg:col-span-2 bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                  <div className="p-4 sm:p-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h3 className="font-bold text-base sm:text-lg">Chart of Accounts Ledger</h3>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto justify-end">
                      <Button onClick={downloadCOAExcel} size="sm" variant="outline" className="h-8 rounded-lg border-border hover:bg-indigo-500/10 hover:text-indigo-500 text-xs font-bold w-full sm:w-auto"><Download className="w-3 h-3 mr-1" /> Excel</Button>
                      <Button onClick={downloadCOAPDF} size="sm" variant="outline" className="h-8 rounded-lg border-border hover:bg-emerald-500/10 hover:text-emerald-500 text-xs font-bold w-full sm:w-auto"><Download className="w-3 h-3 mr-1" /> PDF</Button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[650px]">
                      <thead><tr className="bg-accent/5 border-b border-border text-muted-foreground text-xs font-black uppercase tracking-wider"><th className="py-4 px-6">Code</th><th className="py-4 px-6">Account Name</th><th className="py-4 px-6">Type</th><th className="py-4 px-6 text-right">Current Balance</th><th className="py-4 px-6 text-center">Actions</th></tr></thead>
                      <tbody className="divide-y divide-border/60 text-sm">
                        {(accounts || []).map(a => (
                          <tr key={a.id} className="hover:bg-accent/5 transition-colors">
                            <td className={cn("py-4 px-6 font-mono font-bold text-indigo-500", a.parent_id ? "pl-8 text-indigo-500/70" : "")}>{a.parent_id && <span className="text-muted-foreground mr-1">↳</span>}{a.code}</td>
                            <td className={cn("py-4 px-6 font-medium", a.parent_id ? "pl-8 text-muted-foreground text-xs" : "")}>{a.name}</td>
                            <td className="py-4 px-6"><span className={cn("text-xs px-2.5 py-1 rounded-full font-bold", accountTypeColor(a.type))}>{a.type}</span></td>
                            <td className={cn("py-4 px-6 text-right font-black text-base", Number(a.balance) >= 0 ? "text-emerald-500" : "text-rose-500")}>₹{Number(a.balance).toLocaleString()}</td>
                            <td className="py-4 px-6 text-center"><button onClick={() => { setEditOBAccount(a); setEditOBAmount(String(a.balance)); }} title="Edit Opening Balance" className="p-1.5 rounded-lg hover:bg-indigo-500/10 text-muted-foreground hover:text-rose-500 transition-colors"><Pencil className="w-3.5 h-3.5" /></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 shadow-sm">
                    <h3 className="font-bold text-base sm:text-lg mb-4">Financial Equilibrium</h3>
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex justify-between items-center"><div><p className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase">Total Assets</p><p className="text-lg sm:text-xl font-bold text-emerald-500 mt-1">₹{(accounts || []).filter(a => a.type === "ASSET").reduce((sum, a) => sum + Number(a.balance), 0).toLocaleString()}</p></div><TrendingUp className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-500 opacity-35" /></div>
                      <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/10 flex justify-between items-center"><div><p className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase">Total Liabilities</p><p className="text-lg sm:text-xl font-bold text-rose-500 mt-1">₹{(accounts || []).filter(a => a.type === "LIABILITY").reduce((sum, a) => sum + Number(a.balance), 0).toLocaleString()}</p></div><ShieldAlert className="w-7 h-7 sm:w-8 sm:h-8 text-rose-500 opacity-35" /></div>
                      <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/10 flex justify-between items-center"><div><p className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase">Total Equity</p><p className="text-lg sm:text-xl font-bold text-purple-500 mt-1">₹{(accounts || []).filter(a => a.type === "EQUITY").reduce((sum, a) => sum + Number(a.balance), 0).toLocaleString()}</p></div><DollarSign className="w-7 h-7 sm:w-8 sm:h-8 text-purple-500 opacity-35" /></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-8">
                <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 shadow-sm">
                  <div className="flex items-center justify-between border-b border-border pb-4 mb-6"><h3 className="font-bold text-base sm:text-lg text-cyan-500 uppercase tracking-wider">Cash Flow Statement</h3><Waves className="w-5 h-5 text-cyan-500" /></div>
                  {cashFlowLoading ? (<div className="flex items-center justify-center py-10"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-500"></div></div>) : cashFlowData ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {[{ key: "operating", label: "Operating Activities", color: "text-emerald-500", bg: "bg-emerald-500/5 border-emerald-500/20", data: cashFlowData.operating }, { key: "investing", label: "Investing Activities", color: "text-blue-500", bg: "bg-blue-500/5 border-blue-500/20", data: cashFlowData.investing }, { key: "financing", label: "Financing Activities", color: "text-purple-500", bg: "bg-purple-500/5 border-purple-500/20", data: cashFlowData.financing }].map(section => (
                        <div key={section.key} className={cn("rounded-xl p-4 sm:p-5 border flex flex-col justify-between h-full backdrop-blur-sm transition-all duration-300 hover:shadow-md", section.bg)}>
                          <div>
                            <h4 className={cn("text-[10px] sm:text-xs font-black uppercase tracking-wider mb-4 pb-2 border-b border-current/10", section.color)}>{section.label}</h4>
                            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                              {(!section.data || !section.data.items || section.data.items.length === 0) ? (
                                <div className="py-6 text-center">
                                  <p className="text-xs text-muted-foreground italic">No activity recorded for this period</p>
                                </div>
                              ) : section.data.items.map((item: any, i: number) => (
                                <div key={i} className="group flex justify-between items-start text-xs py-2 border-b border-border/20 last:border-0 hover:bg-black/5 dark:hover:bg-white/5 px-2 rounded-lg transition-colors">
                                  <div className="flex-1 pr-3 min-w-0">
                                    <p className="font-semibold text-foreground truncate text-xs" title={item.description}>{item.description}</p>
                                    <p className="text-[9px] sm:text-[10px] font-medium text-muted-foreground mt-0.5 tracking-wide uppercase">{item.opposite_account}</p>
                                  </div>
                                  <span className={cn("font-bold shrink-0 text-xs tabular-nums mt-0.5", item.amount >= 0 ? "text-emerald-500" : "text-rose-500")}>
                                    {item.amount >= 0 ? "+" : "-"}₹{Math.abs(item.amount).toLocaleString()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className={cn("flex justify-between items-center font-bold text-xs sm:text-sm mt-6 pt-3 border-t border-border/60", section.color)}>
                            <span className="uppercase tracking-wider text-[10px] sm:text-xs">Total Net Flow</span>
                            <span className="text-sm sm:text-base tabular-nums">₹{Number(section.data?.total || 0).toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                      <div className="md:col-span-3 p-4 sm:p-5 rounded-xl bg-gradient-to-r from-cyan-500/5 to-cyan-500/10 border border-cyan-500/20 flex justify-between items-center shadow-inner">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                          <span className="font-black text-[10px] sm:text-xs md:text-sm uppercase tracking-wider text-cyan-600 dark:text-cyan-400">Net Cash Flow (Period)</span>
                        </div>
                        <span className={cn("font-black text-base sm:text-xl md:text-2xl tracking-tight tabular-nums", Number(cashFlowData.netCashFlow || 0) >= 0 ? "text-emerald-500" : "text-rose-500")}>
                          ₹{Number(cashFlowData.netCashFlow || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
              {editOBAccount && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center backdrop-blur-sm px-4" onClick={() => setEditOBAccount(null)}>
                  <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-4"><div><h3 className="font-bold text-base sm:text-lg">Edit Opening Balance</h3><p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{editOBAccount.name} ({editOBAccount.code})</p></div><button onClick={() => setEditOBAccount(null)} className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition-colors"><X className="w-4 h-4" /></button></div>
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-4"><p className="text-[10px] sm:text-xs text-amber-500 font-medium">Warning: This will reverse the old opening balance entry and create a new one. Both account balance and the ledger entry will be updated.</p></div>
                    <form onSubmit={handleUpdateOpeningBalance} className="space-y-4">
                      <div className="space-y-1"><Label className="text-xs sm:text-sm">New Opening Balance (INR)</Label><Input type="number" step="0.01" placeholder="0.00" value={editOBAmount} onChange={e => setEditOBAmount(e.target.value)} className="bg-background border-border h-9 sm:h-10 text-xs sm:text-sm" autoFocus /></div>
                      <Button type="submit" disabled={editOBLoading} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold w-full rounded-xl h-10 text-xs sm:text-sm">{editOBLoading ? "Updating..." : "Update Opening Balance"}</Button>
                    </form>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === "reports" && (
            <>
              {!drillAccount ? (
                <div className="space-y-6 sm:space-y-8">
                  <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 flex flex-col xl:flex-row xl:items-center justify-between gap-4 shadow-sm">
                    <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 sm:gap-4 w-full xl:w-auto">
                      <div className="flex flex-col gap-1 w-full sm:w-auto"><Label className="text-xs font-bold text-muted-foreground">Reporting Period</Label><select value={reportFilter.period} onChange={(e) => setReportFilter({ ...reportFilter, period: e.target.value as any })} className="h-10 px-3 rounded-xl border border-border bg-background text-xs sm:text-sm text-foreground font-medium w-full"><option value="monthly">Monthly Statement</option><option value="halfyearly">Half Yearly (H1/H2)</option><option value="yearly">Yearly Statement</option></select></div>
                      {reportFilter.period === "monthly" && (<div className="flex flex-col gap-1 w-full sm:w-auto"><Label className="text-xs font-bold text-muted-foreground">Month</Label><select value={reportFilter.month} onChange={(e) => setReportFilter({ ...reportFilter, month: Number(e.target.value) })} className="h-10 px-3 rounded-xl border border-border bg-background text-xs sm:text-sm text-foreground font-medium w-full">{Array.from({ length: 12 }, (_, i) => (<option key={i} value={i}>{new Date(0, i).toLocaleString("default", { month: "long" })}</option>))}</select></div>)}
                      <div className="flex flex-col gap-1 w-full sm:w-auto"><Label className="text-xs font-bold text-muted-foreground">Year</Label><select value={reportFilter.year} onChange={(e) => setReportFilter({ ...reportFilter, year: Number(e.target.value) })} className="h-10 px-3 rounded-xl border border-border bg-background text-xs sm:text-sm text-foreground font-medium w-full">{[2025, 2026, 2027].map(y => (<option key={y} value={y}>{y}</option>))}</select></div>
                    </div>
                    <div className="flex flex-col sm:grid sm:grid-cols-2 xl:flex xl:flex-row gap-2 w-full xl:w-auto mt-2 xl:mt-0">
                      <Button onClick={downloadExcelReport} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl h-10 font-bold shadow-md shadow-indigo-500/20 text-xs w-full xl:w-auto"><Download className="w-4 h-4 mr-1.5 shrink-0" /> Audit Excel</Button>
                      <Button onClick={downloadPDFReport} className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl h-10 font-bold shadow-md shadow-emerald-500/20 text-xs w-full xl:w-auto"><Download className="w-4 h-4 mr-1.5 shrink-0" /> Audit PDF</Button>
                    </div>
                  </div>
                  {loadingReport ? (<div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div></div>) : reportData ? (
                    <div className="space-y-6 sm:space-y-8">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                        <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 space-y-6 shadow-sm">
                          <div className="flex items-center justify-between border-b border-border pb-4"><h3 className="font-bold text-base sm:text-lg text-indigo-500 uppercase tracking-wider">Profit & Loss</h3><TrendingUp className="w-5 h-5 text-indigo-500" /></div>
                          <div className="space-y-4">
                            <div><h4 className="text-[10px] sm:text-xs font-black text-muted-foreground uppercase mb-2">Revenue Streams</h4><div className="space-y-1">{renderCollapsibleAccountRows(reportData.profitAndLoss?.revenues, "REVENUE", "text-emerald-500")}</div><div className="flex justify-between py-3 font-bold text-xs sm:text-sm border-b-2 border-border/80 mt-1"><span>Total Revenue</span><span className="text-emerald-500 underline decoration-double">₹{Number(reportData.profitAndLoss?.totalRevenue || 0).toLocaleString()}</span></div></div>
                            <div className="pt-4"><h4 className="text-[10px] sm:text-xs font-black text-muted-foreground uppercase mb-2">Operating Expenses</h4><div className="space-y-1">{renderCollapsibleAccountRows(reportData.profitAndLoss?.expenses, "EXPENSE", "text-rose-500")}</div><div className="flex justify-between py-3 font-bold text-xs sm:text-sm border-b-2 border-border/80 mt-1"><span>Total Expenses</span><span className="text-rose-500">₹{Number(reportData.profitAndLoss?.totalExpense || 0).toLocaleString()}</span></div></div>
                            <div className="p-3 sm:p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex justify-between items-center mt-6"><span className="font-black text-xs sm:text-sm uppercase text-indigo-500">Net Business Profit</span><span className={cn("font-black text-sm sm:text-base underline decoration-double", Number(reportData.profitAndLoss?.netProfit || 0) >= 0 ? "text-emerald-500" : "text-rose-500")}>₹{Number(reportData.profitAndLoss?.netProfit || 0).toLocaleString()}</span></div>
                          </div>
                        </div>
                        <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 space-y-6 shadow-sm">
                          <div className="flex items-center justify-between border-b border-border pb-4"><h3 className="font-bold text-base sm:text-lg text-teal-500 uppercase tracking-wider">Balance Sheet Summary</h3><DollarSign className="w-5 h-5 text-teal-500" /></div>
                          <div className="space-y-4">
                            <div><h4 className="text-[10px] sm:text-xs font-black text-muted-foreground uppercase mb-2">Assets (Dr.)</h4><div className="space-y-1">{renderCollapsibleAccountRows(reportData.balanceSheet?.assets, "ASSET", "text-emerald-500")}</div><div className="flex justify-between py-3 font-bold text-xs sm:text-sm border-b-2 border-border/80 mt-1"><span>Total Assets</span><span className="text-emerald-500 underline decoration-double">₹{Number(reportData.balanceSheet?.totalAssets || 0).toLocaleString()}</span></div></div>
                            <div className="pt-4">
                              <h4 className="text-[10px] sm:text-xs font-black text-muted-foreground uppercase mb-2">Liabilities & Equity (Cr.)</h4>
                              <div className="space-y-1">
                                {renderCollapsibleAccountRows(reportData.balanceSheet?.liabilities, "LIABILITY", "text-rose-500")}
                                {renderCollapsibleAccountRows(reportData.balanceSheet?.equity, "EQUITY", "text-purple-500")}
                                {reportData.balanceSheet?.differenceInOpeningBalances !== undefined && (
                                  <div className="flex justify-between items-center py-2.5 text-sm border-b border-border/40 font-semibold select-none">
                                    <div className="flex items-center gap-1.5">
                                      <div className="w-4 h-4 shrink-0" />
                                      <span>Difference in Opening Balances</span>
                                    </div>
                                    <span className="font-bold text-purple-500">₹{Number(reportData.balanceSheet.differenceInOpeningBalances).toLocaleString()}</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex justify-between py-3 font-bold text-xs sm:text-sm border-b-2 border-border/80 mt-1">
                                <span>Total Liabilities & Equity</span>
                                <span className="text-teal-500 underline decoration-double">
                                  ₹{(
                                    Number(reportData.balanceSheet?.totalLiabilities || 0) +
                                    Number(reportData.balanceSheet?.totalEquity || 0) +
                                    Number(reportData.balanceSheet?.differenceInOpeningBalances || 0)
                                  ).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="bg-card border border-indigo-500/30 rounded-2xl shadow-lg overflow-hidden mt-6 sm:mt-8">
                  <div className="p-4 sm:p-5 border-b border-border flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-indigo-500/5">
                    <div><h3 className="font-bold text-sm sm:text-base text-indigo-500">{drillAccount.name} ({drillAccount.code})</h3><p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">Individual account ledger — date-filtered transaction history</p></div>
                    <div className="flex flex-col sm:flex-row lg:items-center gap-3 w-full lg:w-auto">
                      <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
                        <div className="flex items-center gap-1.5 w-full">
                          <span className="text-[10px] sm:text-xs text-muted-foreground uppercase font-bold shrink-0">From</span>
                          <Input type="date" value={drillStart} onChange={e => setDrillStart(e.target.value)} className="h-8 text-xs bg-background border-border w-full sm:w-32" />
                        </div>
                        <div className="flex items-center gap-1.5 w-full">
                          <span className="text-[10px] sm:text-xs text-muted-foreground uppercase font-bold shrink-0">To</span>
                          <Input type="date" value={drillEnd} onChange={e => setDrillEnd(e.target.value)} className="h-8 text-xs bg-background border-border w-full sm:w-32" />
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 border-t sm:border-t-0 sm:border-l border-border pt-2 sm:pt-0 sm:pl-3 w-full lg:w-auto">
                        <div className="flex items-center gap-1.5">
                          <Button onClick={() => downloadDrillLedgerExcel(drillAccount, drillEntries)} size="sm" variant="outline" className="h-8 rounded-lg border-border hover:bg-indigo-500/10 hover:text-indigo-500 text-[10px] sm:text-xs font-bold"><Download className="w-3 h-3 mr-1" /> Excel</Button>
                          <Button onClick={() => downloadDrillLedgerPDF(drillAccount, drillEntries)} size="sm" variant="outline" className="h-8 rounded-lg border-border hover:bg-emerald-500/10 hover:text-emerald-500 text-[10px] sm:text-xs font-bold"><Download className="w-3 h-3 mr-1" /> PDF</Button>
                        </div>
                        <button onClick={() => { setDrillAccount(null); setDrillEntries([]); }} className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition-colors border border-border shrink-0"><X className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </div>
                  {drillLoading ? (<div className="flex items-center justify-center py-10"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500"></div></div>) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead><tr className="bg-accent/5 border-b border-border text-muted-foreground text-xs font-black uppercase tracking-wider"><th className="py-3 px-5">Voucher No</th><th className="py-3 px-5">Date</th><th className="py-3 px-5">Particulars</th><th className="py-3 px-5 text-right">Debit (Dr)</th><th className="py-3 px-5 text-right">Credit (Cr)</th><th className="py-3 px-5 text-right">Running Balance</th><th className="py-3 px-5">Source</th><th className="py-3 px-5">Audited By</th></tr></thead>
                        <tbody className="divide-y divide-border/60 text-sm">
                          {drillEntries.length === 0 ? (<tr><td colSpan={8} className="py-8 text-center text-muted-foreground italic">No transactions found for selected range.</td></tr>) : drillEntries.map((e: any) => (
                            <tr key={e.id} className="hover:bg-accent/5 transition-colors">
                              <td className="py-3 px-5 font-bold text-indigo-500 text-xs">{e.voucher_no}</td>
                              <td className="py-3 px-5 text-muted-foreground text-xs">{new Date(e.transaction_date).toLocaleDateString()}</td>
                              <td className="py-3 px-5 text-xs">{e.particulars} ({e.particulars_code})</td>
                              <td className="py-3 px-5 text-right text-xs font-bold text-emerald-500">{e.debit > 0 ? `₹${Number(e.debit).toLocaleString()}` : "—"}</td>
                              <td className="py-3 px-5 text-right text-xs font-bold text-rose-500">{e.credit > 0 ? `₹${Number(e.credit).toLocaleString()}` : "—"}</td>
                              <td className={cn("py-3 px-5 text-right text-xs font-black", e.balance >= 0 ? "text-emerald-500" : "text-rose-500")}>₹{Number(e.balance).toLocaleString()}</td>
                              <td className="py-3 px-5 text-xs">
                                {e.invoice_id ? (
                                  <Link href={`/dashboard/finance?search=${getInvoiceNumber(e.description)}`} className="font-bold text-indigo-500 hover:underline inline-flex items-center gap-1">
                                    <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-400" /> Invoice
                                  </Link>
                                ) : e.payment_id ? (
                                  <Link href={`/dashboard/finance?search=${getInvoiceNumber(e.description)}`} className="font-bold text-emerald-500 hover:underline inline-flex items-center gap-1">
                                    <Banknote className="w-3.5 h-3.5 text-emerald-400" /> Payment
                                  </Link>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>
                              <td className="py-3 px-5 text-xs text-indigo-400 font-semibold">{e.created_by}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {activeTab === "trialbalance" && (
            <div className="space-y-6">
              <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 flex flex-col xl:flex-row xl:items-center justify-between gap-4 shadow-sm">
                <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 sm:gap-4 w-full xl:w-auto">
                  <div className="flex flex-col gap-1 w-full sm:w-auto"><Label className="text-xs font-bold text-muted-foreground">Reporting Period</Label><select value={reportFilter.period} onChange={(e) => setReportFilter({ ...reportFilter, period: e.target.value as any })} className="h-10 px-3 rounded-xl border border-border bg-background text-xs sm:text-sm text-foreground font-medium w-full"><option value="monthly">Monthly</option><option value="halfyearly">Half Yearly</option><option value="yearly">Yearly</option></select></div>
                  {reportFilter.period === "monthly" && (<div className="flex flex-col gap-1 w-full sm:w-auto"><Label className="text-xs font-bold text-muted-foreground">Month</Label><select value={reportFilter.month} onChange={(e) => setReportFilter({ ...reportFilter, month: Number(e.target.value) })} className="h-10 px-3 rounded-xl border border-border bg-background text-xs sm:text-sm text-foreground font-medium w-full">{Array.from({ length: 12 }, (_, i) => (<option key={i} value={i}>{new Date(0, i).toLocaleString("default", { month: "long" })}</option>))}</select></div>)}
                  <div className="flex flex-col gap-1 w-full sm:w-auto"><Label className="text-xs font-bold text-muted-foreground">Year</Label><select value={reportFilter.year} onChange={(e) => setReportFilter({ ...reportFilter, year: Number(e.target.value) })} className="h-10 px-3 rounded-xl border border-border bg-background text-xs sm:text-sm text-foreground font-medium w-full">{[2025, 2026, 2027].map(y => (<option key={y} value={y}>{y}</option>))}</select></div>
                </div>
                <div className="w-full xl:w-auto flex justify-end">
                  <Button onClick={fetchReport} className="bg-orange-600 hover:bg-orange-500 text-white rounded-xl h-10 font-bold w-full xl:w-auto text-xs sm:text-sm">Generate Trial Balance</Button>
                </div>
              </div>
              {loadingReport ? (<div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div></div>) : reportData?.trialBalance ? (
                <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                  <div className="p-4 sm:p-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-base sm:text-lg">Trial Balance</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">In a balanced system, Total Debits = Total Credits</p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto justify-end">
                      <Button onClick={downloadTrialBalanceExcel} size="sm" variant="outline" className="h-9 rounded-xl border-border hover:bg-indigo-500/10 hover:text-indigo-500 font-bold text-xs w-full sm:w-auto"><Download className="w-3.5 h-3.5 mr-1.5" /> Excel</Button>
                      <Button onClick={downloadTrialBalancePDF} size="sm" variant="outline" className="h-9 rounded-xl border-border hover:bg-emerald-500/10 hover:text-emerald-500 font-bold text-xs w-full sm:w-auto"><Download className="w-3.5 h-3.5 mr-1.5" /> PDF</Button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                      <thead><tr className="bg-accent/5 border-b border-border text-muted-foreground text-xs font-black uppercase tracking-wider"><th className="py-4 px-6">Code</th><th className="py-4 px-6">Account Name</th><th className="py-4 px-6">Type</th><th className="py-4 px-6 text-right">Debit (Dr)</th><th className="py-4 px-6 text-right">Credit (Cr)</th></tr></thead>
                      <tbody className="divide-y divide-border/60 text-sm">
                        {(reportData.trialBalance || []).map((t: any) => (<tr key={t.id} className="hover:bg-accent/5 transition-colors"><td className="py-3 px-6 font-mono font-bold text-indigo-500">{t.code}</td><td className="py-3 px-6 font-medium">{t.name}</td><td className="py-3 px-6"><span className={cn("text-xs px-2.5 py-1 rounded-full font-bold", accountTypeColor(t.type))}>{t.type === "DIFF_OP_BALANCE" ? "Diff in Op. Balance" : t.type}</span></td><td className="py-3 px-6 text-right font-bold text-emerald-500">{t.debit > 0 ? `₹${Number(t.debit).toLocaleString()}` : "—"}</td><td className="py-3 px-6 text-right font-bold text-rose-500">{t.credit > 0 ? `₹${Number(t.credit).toLocaleString()}` : "—"}</td></tr>))}
                      </tbody>
                      <tfoot>{(() => { const td = (reportData.trialBalance || []).reduce((s: number, t: any) => s + Number(t.debit), 0); const tc = (reportData.trialBalance || []).reduce((s: number, t: any) => s + Number(t.credit), 0); const bal = Math.abs(td - tc) < 0.01; return (<tr className={cn("border-t-2 font-black text-sm", bal ? "bg-emerald-500/5 border-emerald-500/30" : "bg-rose-500/5 border-rose-500/30")}><td colSpan={3} className="py-4 px-6">{bal ? <span className="text-emerald-500">✓ Balanced — Books are correct</span> : <span className="text-rose-500">✗ Unbalanced — Diff: ₹{Math.abs(td - tc).toLocaleString()}</span>}</td><td className="py-4 px-6 text-right text-emerald-500">₹{td.toLocaleString()}</td><td className="py-4 px-6 text-right text-rose-500">₹{tc.toLocaleString()}</td></tr>); })()}</tfoot>
                    </table>
                  </div>
                </div>
              ) : (<div className="bg-card border border-border rounded-2xl p-12 text-center text-muted-foreground"><Scale className="w-10 h-10 mx-auto mb-3 opacity-30" /><p className="font-medium">Select a period and click Generate Trial Balance</p></div>)}
            </div>
          )}

          {activeTab === "audit" && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 sm:p-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-base sm:text-lg">Audit Trail</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Complete log of all financial actions performed by staff</p>
                </div>
                <Button onClick={fetchAuditLog} variant="outline" className="rounded-xl h-9 text-xs sm:text-sm font-bold border-border w-full sm:w-auto">Refresh</Button>
              </div>
              {auditLoading ? (<div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div></div>) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead><tr className="bg-accent/5 border-b border-border text-muted-foreground text-xs font-black uppercase tracking-wider"><th className="py-4 px-6">Timestamp</th><th className="py-4 px-6">Action</th><th className="py-4 px-6">Entity</th><th className="py-4 px-6">Staff (Who)</th><th className="py-4 px-6">Details</th></tr></thead>
                    <tbody className="divide-y divide-border/60 text-sm">
                      {auditLogs.length === 0 ? (<tr><td colSpan={5} className="py-10 text-center text-muted-foreground italic">No audit logs recorded yet.</td></tr>) : auditLogs.map((log: any) => {
                        let parsedData: any = {};
                        try { parsedData = JSON.parse(log.new_data || "{}"); } catch {}
                        const staffName = log.user_id || parsedData.created_by || parsedData.updated_by || "System";
                        const actionColors: Record<string, string> = { CREATE_ACCOUNT: "bg-blue-500/10 text-blue-500", POST_VOUCHER: "bg-emerald-500/10 text-emerald-500", EDIT_OPENING_BALANCE: "bg-amber-500/10 text-amber-500" };
                        return (
                          <tr key={log.id} className="hover:bg-accent/5 transition-colors">
                            <td className="py-4 px-6 text-xs text-muted-foreground whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                            <td className="py-4 px-6"><span className={cn("text-xs px-2.5 py-1 rounded-full font-bold", actionColors[log.action] || "bg-gray-500/10 text-gray-500")}>{log.action}</span></td>
                            <td className="py-4 px-6 text-xs font-mono text-muted-foreground">{log.entity_type}</td>
                            <td className="py-4 px-6"><div className="flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-indigo-400" /><span className="text-xs font-bold text-indigo-400">{staffName}</span></div></td>
                            <td className="py-4 px-6 text-xs text-muted-foreground max-w-xs">
                              {parsedData.voucher_no && <span className="font-bold text-foreground mr-1">{parsedData.voucher_no}</span>}
                              {parsedData.debit && <span>Dr: {parsedData.debit} | Cr: {parsedData.credit}</span>}
                              {parsedData.name && <span>Account: {parsedData.name} ({parsedData.code})</span>}
                              {parsedData.opening_balance !== undefined && <span>Opening Balance: ₹{Number(parsedData.opening_balance).toLocaleString()}</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Delete Voucher Confirmation Dialog */}
      <Dialog open={!!deleteVoucherTarget} onOpenChange={(open) => { if (!open) setDeleteVoucherTarget(null); }}>
        <DialogContent className="sm:max-w-[500px] bg-card border-border text-foreground shadow-2xl rounded-3xl p-6 relative">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-rose-600" />
          
          <DialogHeader>
            <DialogTitle className="text-xl font-black flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-5 h-5" /> Confirm Voucher Deletion
            </DialogTitle>
            <DialogDescription className="text-xs">
              This action will remove the voucher from the ledger, reverse the balances of linked accounts, and create a delete audit trail log.
            </DialogDescription>
          </DialogHeader>

          {deleteVoucherTarget && (
            <div className="space-y-4 my-2">
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl space-y-2 text-xs">
                <p className="font-bold text-rose-500">
                  Are you sure you want to delete Voucher <span className="font-mono font-black">{deleteVoucherTarget.voucher_no}</span>?
                </p>
                {(deleteVoucherTarget.invoice_id || deleteVoucherTarget.payment_id) && (
                  <p className="text-rose-400 font-bold bg-rose-500/5 p-2.5 rounded-xl border border-rose-500/10 flex items-start gap-1.5 mt-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                    <span>
                      WARNING: This voucher is associated with an {deleteVoucherTarget.invoice_id ? "Invoice" : "Payment"}. Deleting this voucher will decouple it and might lead to accounting mismatches.
                    </span>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-muted/40 p-3 rounded-2xl border border-border">
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Debit Account</span>
                  <p className="font-semibold text-emerald-500">{deleteVoucherTarget.debit_account?.name} ({deleteVoucherTarget.debit_account?.code})</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Credit Account</span>
                  <p className="font-semibold text-rose-500">{deleteVoucherTarget.credit_account?.name} ({deleteVoucherTarget.credit_account?.code})</p>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Description</span>
                  <p className="font-semibold">{deleteVoucherTarget.description}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Amount</span>
                  <p className="font-bold text-foreground">₹{Number(deleteVoucherTarget.amount).toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Transaction Date</span>
                  <p className="font-bold text-foreground">{new Date(deleteVoucherTarget.transaction_date).toLocaleDateString()}</p>
                </div>
              </div>

              <DialogFooter className="pt-3 border-t border-border flex items-center justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setDeleteVoucherTarget(null)}
                  className="h-9 text-xs"
                  disabled={deletingVoucher}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleDeleteVoucher}
                  disabled={deletingVoucher}
                  className="h-9 px-5 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white"
                >
                  {deletingVoucher ? "Deleting..." : "Confirm Delete"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit / Correct Voucher Dialog Modal */}
      <Dialog open={!!correctVoucher} onOpenChange={(open) => { if (!open) setCorrectVoucher(null); }}>
        <DialogContent className="bg-card border-border text-foreground rounded-2xl max-w-lg p-4 sm:p-6 w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2 text-amber-500">
              <Pencil className="w-5 h-5" /> Correct Ledger Entry ({correctVoucher?.voucher_no})
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Authorized CA / Admin correction interface. Modifications will be recorded permanently in the audit trail.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCorrectVoucher} className="space-y-3 sm:space-y-4 py-2 sm:py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1">
                <Label className="text-xs sm:text-sm">Debit Account (Dr.)</Label>
                <select
                  value={correctionForm.debit_account_id}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, debit_account_id: e.target.value })}
                  className="w-full h-9 sm:h-10 px-3 rounded-lg border border-border bg-background text-foreground text-xs sm:text-sm"
                >
                  <option value="">Keep Original Account</option>
                  {(accounts || []).map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({a.code})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs sm:text-sm">Credit Account (Cr.)</Label>
                <select
                  value={correctionForm.credit_account_id}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, credit_account_id: e.target.value })}
                  className="w-full h-9 sm:h-10 px-3 rounded-lg border border-border bg-background text-foreground text-xs sm:text-sm"
                >
                  <option value="">Keep Original Account</option>
                  {(accounts || []).map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({a.code})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs sm:text-sm">Corrected Amount (INR)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={correctionForm.amount}
                onChange={(e) => setCorrectionForm({ ...correctionForm, amount: e.target.value })}
                className="bg-background border-border h-9 sm:h-10 text-xs sm:text-sm font-bold text-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs sm:text-sm">Description / Narration</Label>
              <Input
                placeholder="Enter transactional details"
                value={correctionForm.description}
                onChange={(e) => setCorrectionForm({ ...correctionForm, description: e.target.value })}
                className="bg-background border-border h-9 sm:h-10 text-xs sm:text-sm"
              />
            </div>

            <div className="space-y-1 bg-amber-500/5 p-3 rounded-xl border border-amber-500/20">
              <Label className="text-xs sm:text-sm font-bold text-amber-500 flex items-center gap-1">
                Reason for Correction <span className="text-rose-500">*</span>
              </Label>
              <textarea
                required
                rows={3}
                placeholder="Mandatory: Explain why this entry is being corrected (e.g. Staff entered wrong amount)"
                value={correctionForm.reason}
                onChange={(e) => setCorrectionForm({ ...correctionForm, reason: e.target.value })}
                className="w-full p-2.5 rounded-lg border border-border bg-background text-foreground text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="submit"
                disabled={correctSubmitting}
                className="bg-amber-600 hover:bg-amber-500 text-white font-bold w-full rounded-xl h-10 text-xs sm:text-sm shadow-lg shadow-amber-600/20"
              >
                {correctSubmitting ? "Saving Correction & Audit..." : "Save Ledger Correction"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Audit Trail History Dialog Modal */}
      <Dialog open={!!viewAuditVoucher} onOpenChange={(open) => { if (!open) setViewAuditVoucher(null); }}>
        <DialogContent className="bg-card border-border text-foreground rounded-2xl max-w-2xl p-4 sm:p-6 w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2 text-indigo-500">
              <History className="w-5 h-5" /> Immutable Audit History for Voucher {viewAuditVoucher?.voucher_no}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Complete history of all modifications made to this financial record.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            {auditLoadingLogs ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
              </div>
            ) : voucherAuditLogs.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground italic text-xs">
                No audit logs found for this voucher.
              </div>
            ) : (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                {voucherAuditLogs.map((log: any) => (
                  <div key={log.id} className="p-4 rounded-xl bg-accent/5 border border-border space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-500 bg-indigo-500/10 px-2.5 py-1 rounded-md">
                        {log.field_name || "Field Modified"}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                      <div className="p-2 rounded-lg bg-rose-500/5 border border-rose-500/10">
                        <span className="text-[10px] font-bold text-rose-500 uppercase block">Original Value</span>
                        <span className="font-mono text-muted-foreground">{log.old_value || "—"}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                        <span className="text-[10px] font-bold text-emerald-500 uppercase block">Updated Value</span>
                        <span className="font-mono text-emerald-400 font-bold">{log.new_value || "—"}</span>
                      </div>
                    </div>

                    <div className="pt-2 text-xs border-t border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <User className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="font-bold text-foreground">{log.edited_by_name}</span>
                        <span className="text-[10px] bg-card px-2 py-0.5 rounded border border-border text-muted-foreground">
                          {log.edited_by_role}
                        </span>
                      </div>
                      <div className="text-xs text-amber-500 font-medium bg-amber-500/5 px-2.5 py-1 rounded-lg border border-amber-500/10">
                        <span className="font-bold text-[10px] uppercase block text-amber-400">Reason:</span>
                        {log.reason}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


