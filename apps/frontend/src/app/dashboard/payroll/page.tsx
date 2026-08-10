"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth";
import { API_BASE_URL } from "@/lib/config";

import { 
  Banknote, 
  Plus, 
  Download, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Search, 
  Filter, 
  Building2, 
  Calendar,
  CreditCard,
  ChevronDown,
  ArrowUpRight,
  UserCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PayrollRecord {
  id: string;
  month: number;
  year: number;
  base_salary: number;
  bonus: number;
  deductions: number;
  pf_deduction: number;
  esi_deduction: number;
  net_pay: number;
  status: string;
  paid_at: string | null;
  user: {
    name: string;
    employee_id: string;
    designation: string;
  };
}

export default function PayrollPage() {
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const token = useAuthStore((state) => state.token);

  // Payment Modal States
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<PayrollRecord | null>(null);
  const [bonusInput, setBonusInput] = useState<number>(0);
  const [deductionsInput, setDeductionsInput] = useState<number>(0);

  useEffect(() => {
    fetchPayroll();
  }, [month, year, token]);

  const fetchPayroll = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/hr/payroll?month=${month}&year=${year}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) setRecords(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateBatch = async () => {
    if (!token) return;
    if (!confirm(`Run payroll batch for ${getMonthName(month)} ${year}?`)) return;

    try {
      const res = await fetch(`${API_BASE_URL}/hr/payroll/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ month, year })
      });
      if (res.ok) fetchPayroll();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateStatus = async (id: string, status: string, bonus?: number, deductions?: number) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/hr/payroll/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status,
          paid_at: status === 'PAID' ? new Date().toISOString() : null,
          bonus,
          deductions
        })
      });
      if (res.ok) fetchPayroll();
    } catch (e) {
      console.error(e);
    }
  };

  const openPaymentModal = (record: PayrollRecord) => {
    setSelectedRecord(record);
    setBonusInput(0);
    setDeductionsInput(0);
    setPaymentModalOpen(true);
  };

  const handleConfirmPayment = async () => {
    if (!selectedRecord) return;
    const finalBonus = Number(bonusInput || 0);
    const finalDeductions = Number(deductionsInput || 0);
    
    // Live validation
    const computedNetPay = Number(selectedRecord.base_salary) + finalBonus - Number(selectedRecord.pf_deduction) - Number(selectedRecord.esi_deduction) - finalDeductions;
    if (computedNetPay < 0) {
      alert("Error: Total deductions exceed earnings, resulting in negative net payout. Please review the values.");
      return;
    }
    
    await handleUpdateStatus(selectedRecord.id, 'PAID', finalBonus, finalDeductions);
    setPaymentModalOpen(false);
    setSelectedRecord(null);
  };

  const getMonthName = (m: number) => {
    return new Date(2000, m - 1).toLocaleString('default', { month: 'long' });
  };

  const generatePayslipPDF = async (record: PayrollRecord) => {
    const jsPDF = (await import("jspdf")).default;
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(37, 99, 235); // Blue-600
    doc.text("GLOBAL SAFETY SOLUTION", 20, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Employee Payslip - Confidential", 20, 26);
    
    // Payslip Details
    doc.setTextColor(0);
    doc.setFontSize(12);
    doc.text(`Period: ${getMonthName(record.month)} ${record.year}`, 140, 20);
    doc.text(`Employee ID: ${record.user.employee_id}`, 140, 26);
    
    // Employee Info
    doc.line(20, 35, 190, 35);
    doc.setFontSize(11);
    doc.text("EMPLOYEE DETAILS", 20, 45);
    doc.setFontSize(10);
    doc.text(`Name: ${record.user.name}`, 20, 52);
    doc.text(`Designation: ${record.user.designation}`, 20, 58);
    
    // Financials Table
    autoTable(doc, {
      startY: 70,
      head: [['Description', 'Earnings', 'Deductions']],
      body: [
        ['Base Salary', `INR ${Number(record.base_salary).toLocaleString()}`, '-'],
        ['Bonus / Incentives', `INR ${Number(record.bonus).toLocaleString()}`, '-'],
        ['PF Deduction', '-', `INR ${Number(record.pf_deduction || 0).toLocaleString()}`],
        ['ESI Deduction', '-', `INR ${Number(record.esi_deduction || 0).toLocaleString()}`],
        ['Other Deductions', '-', `INR ${Number(record.deductions || 0).toLocaleString()}`],
      ],
      headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255] },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
      }
    });
    
    // Summary
    const finalY = (doc as any).lastAutoTable.finalY;
    doc.setFillColor(245, 245, 245);
    doc.rect(120, finalY + 5, 70, 36, 'F');
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80);
    doc.text(`Gross Salary: INR ${(Number(record.base_salary) + Number(record.bonus)).toLocaleString()}`, 125, finalY + 12);
    doc.text(`Total Deductions: INR ${(Number(record.pf_deduction || 0) + Number(record.esi_deduction || 0) + Number(record.deductions || 0)).toLocaleString()}`, 125, finalY + 18);
    
    doc.line(125, finalY + 22, 185, finalY + 22);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text("NET PAYOUT:", 125, finalY + 27);
    doc.text(`INR ${Number(record.net_pay).toLocaleString()}`, 125, finalY + 34);
    
    // Notes
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("Notes:", 20, finalY + 50);
    doc.text("1. This is a computer-generated payslip and does not require a physical signature.", 20, finalY + 56);
    doc.text("2. Please contact the HR department for any discrepancies.", 20, finalY + 62);
    
    doc.save(`Payslip_${record.user.name.replace(' ', '_')}_${getMonthName(record.month)}_${record.year}.pdf`);
  };

  const stats = [
    { label: "Total Payout", value: `₹${records.reduce((acc, r) => acc + Number(r.net_pay), 0).toLocaleString()}`, icon: Banknote, color: "text-blue-600", bg: "bg-blue-500/10" },
    { label: "Paid Salaries", value: records.filter(r => r.status === 'PAID').length, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-500/10" },
    { label: "Processing", value: records.filter(r => r.status === 'PROCESSING').length, icon: Clock, color: "text-amber-600", bg: "bg-amber-500/10" },
    { label: "Pending Budget", value: `₹${records.filter(r => r.status !== 'PAID').reduce((acc, r) => acc + Number(r.net_pay), 0).toLocaleString()}`, icon: ArrowUpRight, color: "text-rose-600", bg: "bg-rose-500/10" },
  ];

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-500">
            Payroll Hub
          </h1>
          <p className="text-muted-foreground font-medium">Process salaries, generate payslips, and manage disbursements.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <div className="flex bg-card border border-border rounded-xl p-1 gap-1 w-full sm:w-auto">
             <select 
               value={month} 
               onChange={(e) => setMonth(parseInt(e.target.value))}
               className="bg-transparent text-sm font-bold px-3 py-1.5 focus:outline-none cursor-pointer text-foreground flex-1 sm:flex-none text-center"
             >
               {[...Array(12)].map((_, i) => (
                 <option key={i+1} value={i+1} className="bg-card text-foreground">{getMonthName(i+1)}</option>
               ))}
             </select>
             <div className="w-px bg-border my-1" />
             <select 
               value={year} 
               onChange={(e) => setYear(parseInt(e.target.value))}
               className="bg-transparent text-sm font-bold px-3 py-1.5 focus:outline-none cursor-pointer text-foreground flex-1 sm:flex-none text-center"
             >
               {[2024, 2025, 2026].map(y => (
                 <option key={y} value={y} className="bg-card text-foreground">{y}</option>
               ))}
             </select>
          </div>
          <Button 
            onClick={handleGenerateBatch}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 px-6 h-11 font-bold rounded-xl transition-all hover:scale-105 active:scale-95"
          >
            <Plus className="w-5 h-5 mr-2" /> Run Payroll
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-card/40 border border-border rounded-2xl p-6 shadow-sm backdrop-blur-md group hover:border-blue-500/20 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center ${stat.color} group-hover:scale-110 transition-transform`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{getMonthName(month)} {year}</span>
            </div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{stat.label}</p>
            <p className="text-2xl font-black text-foreground mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-card/40 border border-border rounded-[2.5rem] overflow-hidden backdrop-blur-xl shadow-xl">
        <div className="p-8 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600">
              <Banknote className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">Disbursement Ledger</h3>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Financial Transparency Suite</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <input 
                className="bg-background border border-border rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-64 transition-all text-foreground font-medium" 
                placeholder="Search employee..." 
              />
            </div>
            <Button variant="outline" className="rounded-xl h-10 border-border bg-background text-foreground hover:bg-muted font-bold">
              <Filter className="w-4 h-4 mr-2" /> Filters
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/30">
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground border-b border-border">Employee</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground border-b border-border">Month / Year</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground border-b border-border">Base Pay</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground border-b border-border">Net Payout</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground border-b border-border">Status</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground border-b border-border text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                      <p className="text-xs font-black uppercase tracking-widest text-muted-foreground animate-pulse">Calculating Salaries...</p>
                    </div>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center text-muted-foreground font-medium italic">
                    No payroll records for this period. Click "Run Payroll" to generate.
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record.id} className="group hover:bg-blue-500/5 transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-primary border border-border group-hover:scale-110 transition-transform">
                          <UserCircle className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-foreground">{record.user.name}</span>
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{record.user.employee_id} • {record.user.designation}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-xs font-bold text-foreground">{getMonthName(record.month)} {record.year}</span>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-sm font-bold text-muted-foreground italic">₹{Number(record.base_salary).toLocaleString()}</span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-foreground">₹{Number(record.net_pay).toLocaleString()}</span>
                        {(Number(record.pf_deduction || 0) > 0 || Number(record.esi_deduction || 0) > 0 || Number(record.deductions || 0) > 0) && (
                          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter mt-0.5">
                            {Number(record.pf_deduction || 0) > 0 && `PF: ₹${Number(record.pf_deduction).toLocaleString()}`}
                            {Number(record.esi_deduction || 0) > 0 && ` • ESI: ₹${Number(record.esi_deduction).toLocaleString()}`}
                            {Number(record.deductions || 0) > 0 && ` • Other: ₹${Number(record.deductions).toLocaleString()}`}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={cn("px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter shadow-sm ring-1", 
                        record.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-600 ring-emerald-500/20' :
                        'bg-amber-500/10 text-amber-600 ring-amber-500/20'
                      )}>
                        {record.status}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {record.status !== 'PAID' ? (
                          <Button 
                            size="sm" 
                            className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest h-9 px-4"
                            onClick={() => openPaymentModal(record)}
                          >
                            Mark Paid
                          </Button>
                        ) : (
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="border-emerald-500/20 bg-emerald-500/5 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest h-9 px-4 hover:bg-emerald-500/10"
                            onClick={() => generatePayslipPDF(record)}
                          >
                            <Download className="w-3.5 h-3.5 mr-2" /> Payslip
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Dialog Modal */}
      {selectedRecord && (
        <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
          <DialogContent className="max-w-md bg-background border border-border rounded-2xl shadow-xl p-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold tracking-tight text-foreground">Confirm Payroll Payment</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                Enter any adjustments (bonus/deductions) for {selectedRecord.user.name} before finalizing payment.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-4">
              <div className="grid grid-cols-2 gap-4 border border-border rounded-xl p-4 bg-muted/20 text-xs">
                <div>
                  <span className="text-muted-foreground block">Base Salary</span>
                  <span className="font-bold text-foreground">₹{Number(selectedRecord.base_salary).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Provident Fund (PF)</span>
                  <span className="font-bold text-rose-500">- ₹{Number(selectedRecord.pf_deduction || 0).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Employee State Insurance (ESI)</span>
                  <span className="font-bold text-rose-500">- ₹{Number(selectedRecord.esi_deduction || 0).toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bonus" className="text-xs font-bold text-foreground">Bonus Payout (INR)</Label>
                <Input 
                  id="bonus"
                  type="number"
                  placeholder="0.00"
                  className="rounded-xl border-border bg-background focus-visible:ring-primary h-10 text-sm"
                  value={bonusInput || ''}
                  onChange={(e) => setBonusInput(Number(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deductions" className="text-xs font-bold text-foreground">Other Deductions (INR)</Label>
                <Input 
                  id="deductions"
                  type="number"
                  placeholder="0.00"
                  className="rounded-xl border-border bg-background focus-visible:ring-primary h-10 text-sm"
                  value={deductionsInput || ''}
                  onChange={(e) => setDeductionsInput(Number(e.target.value))}
                />
              </div>

              <div className="border-t border-border pt-4 flex items-center justify-between">
                <span className="text-sm font-bold text-foreground">Final Net Payable:</span>
                <span className="text-lg font-black text-emerald-600">
                  ₹{(
                    Number(selectedRecord.base_salary) + 
                    Number(bonusInput || 0) - 
                    Number(selectedRecord.pf_deduction || 0) - 
                    Number(selectedRecord.esi_deduction || 0) - 
                    Number(deductionsInput || 0)
                  ).toLocaleString()}
                </span>
              </div>
            </div>

            <DialogFooter className="flex gap-2 justify-end mt-4">
              <Button 
                variant="outline" 
                className="rounded-xl h-10 px-5 text-xs font-black uppercase tracking-wider border-border"
                onClick={() => {
                  setPaymentModalOpen(false);
                  setSelectedRecord(null);
                }}
              >
                Cancel
              </Button>
              <Button 
                className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl h-10 px-5 text-xs font-black uppercase tracking-wider"
                onClick={handleConfirmPayment}
              >
                Confirm & Pay
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
