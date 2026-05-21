"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth";
import { API_BASE_URL } from "@/lib/config";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { 
  Plus, 
  Banknote, 
  FileText, 
  Search, 
  Filter, 
  MoreVertical, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ArrowUpRight,
  ArrowDownLeft,
  ChevronDown,
  Download,
  CreditCard,
  Building2,
  Calendar,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger, 
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
interface Client {
  id: string;
  name: string;
  city: string;
  email?: string;
  phone?: string;
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
  client: Client;
  client_id: string;
  total_amount: number;
  status: string;
  date: string;
  due_date: string;
  items: InvoiceItem[];
  payments: any[];
  total_paid?: number;
  balance_due?: number;
  notes?: string | null;
}

export default function FinancePage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
  const [openNewInvoiceDialog, setOpenNewInvoiceDialog] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [openViewDetailsDialog, setOpenViewDetailsDialog] = useState(false);
  const [openModifyInvoiceDialog, setOpenModifyInvoiceDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [invoiceForm, setInvoiceForm] = useState({
    client_id: "",
    due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: "",
    items: [{ description: "", quantity: 1, unit_price: "" as any }]
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    payment_method: "BANK_TRANSFER",
    transaction_id: "",
    notes: ""
  });
  
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    fetchInvoices();
    fetchClients();
  }, [token]);

  const fetchClients = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/clients`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) setClients(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchInvoices = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/invoices`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) setInvoices(data);
    } catch (e) {
      console.error("Invoices fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedInvoice) return;

    try {
      const res = await fetch(`${API_BASE_URL}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          invoice_id: selectedInvoice.id,
          amount: Number(paymentForm.amount),
          payment_method: paymentForm.payment_method,
          transaction_id: paymentForm.transaction_id,
          notes: paymentForm.notes
        })
      });

      if (res.ok) {
        setOpenPaymentDialog(false);
        setPaymentForm({ amount: "", payment_method: "BANK_TRANSFER", transaction_id: "", notes: "" });
        fetchInvoices();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedInvoice) return;

    try {
      const totalAmount = invoiceForm.items.reduce((acc, i) => acc + (Number(i.quantity || 0) * Number(i.unit_price || 0)), 0);
      const res = await fetch(`${API_BASE_URL}/invoices/${selectedInvoice.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          due_date: new Date(invoiceForm.due_date).toISOString(),
          subtotal: totalAmount,
          total_amount: totalAmount,
          notes: invoiceForm.notes,
          items: invoiceForm.items.map(i => ({
            description: i.description,
            quantity: Number(i.quantity || 0),
            unit_price: Number(i.unit_price || 0),
            total: Number(i.quantity || 0) * Number(i.unit_price || 0)
          }))
        })
      });

      if (res.ok) {
        setOpenModifyInvoiceDialog(false);
        fetchInvoices();
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error("Update Invoice Failed:", errorData);
        alert(`Failed to update invoice: ${errorData.message || 'Unknown error'}`);
      }
    } catch (err: any) {
      console.error("Fetch Error during update:", err.message);
      alert(`Network error: ${err.message}`);
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    if (!token) return;
    if (!confirm("Are you sure you want to void this invoice? This action is permanent.")) return;

    try {
      const res = await fetch(`${API_BASE_URL}/invoices/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchInvoices();
    } catch (err) {
      console.error(err);
    }
  };

  const generatePDF = (invoice: Invoice) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(16, 185, 129); // Emerald-500
    doc.text("GLOBAL SAFETY SOLUTION", 20, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Professional Safety & ERP Solutions", 20, 26);
    
    // Invoice Details Header
    doc.setTextColor(0);
    doc.setFontSize(14);
    doc.text(`INVOICE: ${invoice.invoice_number}`, 140, 20);
    doc.setFontSize(10);
    doc.text(`Date: ${new Date(invoice.date).toLocaleDateString()}`, 140, 26);
    doc.text(`Due: ${new Date(invoice.due_date).toLocaleDateString()}`, 140, 32);
    
    // Client Info
    doc.line(20, 40, 190, 40);
    doc.setFontSize(12);
    doc.text("BILL TO:", 20, 50);
    doc.setFontSize(10);
    doc.text(invoice.client?.name || "N/A", 20, 56);
    doc.text(invoice.client?.city || "N/A", 20, 62);
    
    // Table
    autoTable(doc, {
      startY: 75,
      head: [['Description', 'Quantity', 'Rate', 'Total']],
      body: invoice.items.map(i => [
        i.description,
        i.quantity,
        `INR ${Number(i.unit_price).toLocaleString()}`,
        `INR ${Number(i.total).toLocaleString()}`
      ]),
      headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });
    
    // Total
    const finalY = (doc as any).lastAutoTable.finalY;
    doc.setFontSize(12);
    doc.text(`TOTAL AMOUNT: INR ${Number(invoice.total_amount).toLocaleString()}`, 130, finalY + 15);
    
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text("This is a computer generated invoice. No signature required.", 105, 285, { align: "center" });
    
    doc.save(`${invoice.invoice_number}.pdf`);
  };

  const handleCreateManualInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    try {
      const totalAmount = invoiceForm.items.reduce((acc, i) => acc + (Number(i.quantity || 0) * Number(i.unit_price || 0)), 0);

      // Prevent duplicate/similar invoices
      const duplicateInvoice = invoices.find(inv => 
        inv.client_id === invoiceForm.client_id && 
        Number(inv.total_amount) === totalAmount &&
        inv.status !== 'VOID'
      );

      if (duplicateInvoice) {
        alert(`Duplicate Invoice Found!\n\nA similar invoice (${duplicateInvoice.invoice_number}) for ₹${totalAmount.toLocaleString()} already exists for this client.\n\nTo prevent duplicate billing, this manual invoice cannot be created.`);
        return;
      }

      const res = await fetch(`${API_BASE_URL}/invoices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          client_id: invoiceForm.client_id,
          due_date: new Date(invoiceForm.due_date).toISOString(),
          subtotal: totalAmount,
          total_amount: totalAmount,
          notes: invoiceForm.notes,
          items: invoiceForm.items.map(i => ({
            description: i.description,
            quantity: Number(i.quantity || 0),
            unit_price: Number(i.unit_price || 0),
            total: Number(i.quantity || 0) * Number(i.unit_price || 0)
          }))
        })
      });

      if (res.ok) {
        setOpenNewInvoiceDialog(false);
        setInvoiceForm({
          client_id: "",
          due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          notes: "",
          items: [{ description: "", quantity: 1, unit_price: 0 }]
        });
        fetchInvoices();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const addInvoiceItem = () => {
    setInvoiceForm({
      ...invoiceForm,
      items: [...invoiceForm.items, { description: "", quantity: 1, unit_price: "" as any }]
    });
  };

  const updateInvoiceItem = (index: number, field: string, value: any) => {
    const newItems = [...invoiceForm.items];
    if (field === 'description') {
      (newItems[index] as any)[field] = value;
    } else {
      (newItems[index] as any)[field] = value === "" ? "" : Number(value);
    }
    setInvoiceForm({ ...invoiceForm, items: newItems });
  };

  const stats = [
    { 
      label: "Total Receivables", 
      value: `₹${invoices.reduce((acc, i) => acc + Number(i.balance_due || 0), 0).toLocaleString()}`, 
      icon: ArrowUpRight, 
      color: "text-blue-600", 
      bg: "bg-blue-500/10" 
    },
    { 
      label: "Received This Month", 
      value: `₹${invoices.reduce((acc, i) => {
        const monthPayments = i.payments?.filter(p => {
          const pDate = new Date(p.created_at);
          const now = new Date();
          return pDate.getMonth() === now.getMonth() && pDate.getFullYear() === now.getFullYear();
        }).reduce((sum, p) => sum + Number(p.amount), 0) || 0;
        return acc + monthPayments;
      }, 0).toLocaleString()}`, 
      icon: ArrowDownLeft, 
      color: "text-emerald-600", 
      bg: "bg-emerald-500/10" 
    },
    { label: "Pending Invoices", value: invoices.filter(i => i.status === 'UNPAID' || i.status === 'PARTIAL').length, icon: Clock, color: "text-amber-600", bg: "bg-amber-500/10" },
    { 
      label: "Overdue", 
      value: invoices.filter(i => {
        const isOverdue = new Date(i.due_date).getTime() < Date.now();
        return isOverdue && i.status !== 'PAID';
      }).length, 
      icon: AlertCircle, 
      color: "text-rose-600", 
      bg: "bg-rose-500/10" 
    },
  ];

  const getPaymentTypeFromInvoice = (invoice: Invoice) => {
    let allNotes = (invoice.notes || "").toLowerCase();
    if (invoice.payments && invoice.payments.length > 0) {
      allNotes += " " + invoice.payments.map(p => p.notes || "").join(" ").toLowerCase();
    }
    
    if (!allNotes.trim()) return { label: 'PENDING', color: 'bg-muted text-muted-foreground ring-border' };
    
    if (allNotes.includes('completed') || allNotes.includes('full')) {
      return { label: 'FULL PAYMENT', color: 'bg-emerald-500/10 text-emerald-600 ring-emerald-500/20' };
    }
    if (allNotes.includes('advance')) {
      return { label: 'ADVANCE', color: 'bg-indigo-500/10 text-indigo-600 ring-indigo-500/20' };
    }
    if (allNotes.includes('partial')) {
      return { label: 'PARTIAL', color: 'bg-amber-500/10 text-amber-600 ring-amber-500/20' };
    }
    
    return { label: 'PENDING', color: 'bg-muted text-muted-foreground ring-border' };
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-500">
            Finance & Revenue
          </h1>
          <p className="text-muted-foreground font-medium">Monitor invoices, track payments, and manage cash flow.</p>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            onClick={() => setOpenNewInvoiceDialog(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 px-6 h-11 font-bold rounded-xl transition-all hover:scale-105 active:scale-95"
          >
            <Plus className="w-5 h-5 mr-2" /> New Invoice
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-card/40 border border-border rounded-2xl p-6 shadow-sm backdrop-blur-md group hover:border-emerald-500/20 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center ${stat.color} group-hover:scale-110 transition-transform`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Live Data</span>
            </div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{stat.label}</p>
            <p className="text-2xl font-black text-foreground mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-card/40 border border-border rounded-[2.5rem] overflow-hidden backdrop-blur-xl shadow-xl">
        <div className="p-8 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">Invoice Registry</h3>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Enterprise Revenue Tracking</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <input 
                className="bg-background border border-border rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 w-64 transition-all text-foreground font-medium" 
                placeholder="Search invoice # or client..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground border-b border-border">Invoice Details</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground border-b border-border">Client</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground border-b border-border">Total Amount</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground border-b border-border">Paid / Due</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground border-b border-border">Status</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground border-b border-border">Payment Type</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground border-b border-border text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                      <p className="text-xs font-black uppercase tracking-widest text-muted-foreground animate-pulse">Synchronizing Ledger...</p>
                    </div>
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center text-muted-foreground font-medium italic">
                    No invoices generated yet. Convert a Quotation to begin.
                  </td>
                </tr>
              ) : (
                invoices.filter(i => 
                  i.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  i.client?.name.toLowerCase().includes(searchTerm.toLowerCase())
                ).map((invoice) => (
                  <tr key={invoice.id} className="group hover:bg-emerald-500/5 transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-foreground group-hover:text-emerald-600 transition-colors">{invoice.invoice_number}</span>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1">
                          {invoice.date ? new Date(invoice.date).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center text-primary border border-border group-hover:scale-110 transition-transform">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-foreground">{invoice.client?.name}</span>
                          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">{invoice.client?.city}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-foreground">₹{Number(invoice.total_amount).toLocaleString()}</span>
                        <span className={cn(
                          "text-[10px] font-bold uppercase mt-1",
                          new Date(invoice.due_date).getTime() < Date.now() && invoice.status !== 'PAID' ? "text-rose-500" : "text-muted-foreground"
                        )}>
                          Due: {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'Set Date'}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col w-32">
                        <div className="flex justify-between text-[10px] font-bold uppercase mb-1">
                          <span className="text-emerald-600">₹{Number(invoice.total_paid || 0).toLocaleString()}</span>
                          <span className="text-rose-600">₹{Number(invoice.balance_due || 0).toLocaleString()}</span>
                        </div>
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-emerald-500 transition-all duration-500" 
                            style={{ width: `${Math.min(100, ((invoice.total_paid || 0) / invoice.total_amount) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={cn("px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter shadow-sm ring-1", 
                        invoice.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-600 ring-emerald-500/20' :
                        invoice.status === 'PARTIAL' ? 'bg-blue-500/10 text-blue-600 ring-blue-500/20' :
                        'bg-amber-500/10 text-amber-600 ring-amber-500/20'
                      )}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <span className={cn("px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter shadow-sm ring-1", 
                        getPaymentTypeFromInvoice(invoice).color
                      )}>
                        {getPaymentTypeFromInvoice(invoice).label}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {invoice.status !== 'PAID' && (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-9 px-4 rounded-xl text-xs font-black uppercase tracking-widest text-emerald-600 hover:bg-emerald-500/10"
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setOpenPaymentDialog(true);
                            }}
                          >
                            <CreditCard className="w-3.5 h-3.5 mr-2" /> Pay
                          </Button>
                        )}
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-9 w-9 rounded-xl hover:bg-accent/10 text-muted-foreground border-0"
                          onClick={() => generatePDF(invoice)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger render={
                            <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl hover:bg-accent/10 text-muted-foreground border-0">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          } />
                          <DropdownMenuContent align="end" className="w-48 bg-card border-border rounded-xl shadow-2xl p-2 z-[100]">
                             <DropdownMenuItem 
                               onClick={() => {
                                 setSelectedInvoice(invoice);
                                 setOpenViewDetailsDialog(true);
                               }}
                               className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer focus:bg-emerald-500/10 focus:text-emerald-500 font-bold text-xs"
                             >
                               <FileText className="w-4 h-4" /> View Details
                             </DropdownMenuItem>
                             <DropdownMenuItem 
                               onClick={() => {
                                 setSelectedInvoice(invoice);
                                 setInvoiceForm({
                                   client_id: invoice.client_id,
                                   due_date: new Date(invoice.due_date).toISOString().split('T')[0],
                                   notes: invoice.notes || "",
                                   items: invoice.items.map(i => ({
                                     description: i.description,
                                     quantity: i.quantity,
                                     unit_price: i.unit_price
                                   }))
                                 });
                                 setOpenModifyInvoiceDialog(true);
                               }}
                               className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer focus:bg-blue-500/10 focus:text-blue-500 font-bold text-xs"
                             >
                               <Plus className="w-4 h-4" /> Modify Invoice
                             </DropdownMenuItem>
                             <DropdownMenuSeparator className="bg-border/50" />
                             <DropdownMenuItem 
                               className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer focus:bg-rose-500/10 focus:text-rose-500 font-bold text-xs"
                               onClick={() => handleDeleteInvoice(invoice.id)}
                             >
                               <Trash2 className="w-4 h-4" /> Void Invoice
                             </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Dialog */}
      <Dialog open={openPaymentDialog} onOpenChange={setOpenPaymentDialog}>
        <DialogContent className="sm:max-w-[500px] bg-card border-border text-foreground shadow-2xl rounded-[2.5rem]">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-foreground flex items-center gap-3">
              <CreditCard className="w-6 h-6 text-emerald-600" /> Record Payment
            </DialogTitle>
            <DialogDescription className="font-medium">
              Updating ledger for Invoice <span className="text-foreground font-bold">{selectedInvoice?.invoice_number}</span>
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRecordPayment} className="space-y-6 mt-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Payment Amount *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted-foreground font-bold text-sm">₹</span>
                  <Input 
                    required
                    type="number"
                    placeholder="0.00"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})}
                    className="h-11 bg-background border-border pl-8 font-black text-lg focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Payment Method *</Label>
                <select 
                  required
                  value={paymentForm.payment_method}
                  onChange={(e) => setPaymentForm({...paymentForm, payment_method: e.target.value})}
                  className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none appearance-none"
                >
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="UPI">UPI / GPay</option>
                  <option value="CASH">Cash</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Transaction ID / Ref Number</Label>
              <Input 
                placeholder="UTR Number, Transaction Hash, etc."
                value={paymentForm.transaction_id}
                onChange={(e) => setPaymentForm({...paymentForm, transaction_id: e.target.value})}
                className="h-11 bg-background border-border font-medium"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Notes</Label>
              <textarea 
                placeholder="Internal payment notes..."
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({...paymentForm, notes: e.target.value})}
                className="w-full p-4 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-[80px] resize-none"
              />
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setOpenPaymentDialog(false)} className="rounded-xl font-bold">
                Cancel
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black uppercase tracking-widest px-8 shadow-lg shadow-emerald-500/20">
                Confirm & Record
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* New Manual Invoice Dialog */}
      <Dialog open={openNewInvoiceDialog} onOpenChange={setOpenNewInvoiceDialog}>
        <DialogContent className="sm:max-w-[700px] bg-card border-border text-foreground shadow-2xl rounded-[2.5rem] max-h-[90vh] overflow-y-auto">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-foreground flex items-center gap-3">
              <FileText className="w-6 h-6 text-emerald-600" /> Create Manual Invoice
            </DialogTitle>
            <DialogDescription className="font-medium">
              Issue a new invoice directly without a quotation.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateManualInvoice} className="space-y-6 mt-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Select Client *</Label>
                <select 
                  required
                  value={invoiceForm.client_id}
                  onChange={(e) => setInvoiceForm({...invoiceForm, client_id: e.target.value})}
                  className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none appearance-none"
                >
                  <option value="">Choose a client...</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Due Date *</Label>
                <Input 
                  required
                  type="date"
                  value={invoiceForm.due_date}
                  onChange={(e) => setInvoiceForm({...invoiceForm, due_date: e.target.value})}
                  className="h-11 bg-background border-border font-bold"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Payment Type</Label>
              <select 
                value={invoiceForm.notes}
                onChange={(e) => setInvoiceForm({...invoiceForm, notes: e.target.value})}
                className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none appearance-none"
              >
                <option value="">Pending / None</option>
                <option value="Advance">Advance</option>
                <option value="Partial">Partial</option>
                <option value="Full Payment">Full Payment</option>
              </select>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Line Items</Label>
                <Button type="button" variant="ghost" size="sm" onClick={addInvoiceItem} className="text-emerald-600 hover:bg-emerald-500/10 font-bold">
                  <Plus className="w-4 h-4 mr-1" /> Add Row
                </Button>
              </div>
              
              <div className="space-y-3">
                {invoiceForm.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-3 items-end bg-muted/20 p-4 rounded-xl border border-border">
                    <div className="col-span-6 space-y-1">
                      <Input 
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => updateInvoiceItem(idx, 'description', e.target.value)}
                        className="h-10 bg-background border-border text-sm font-medium"
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <Input 
                        type="number"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateInvoiceItem(idx, 'quantity', e.target.value)}
                        className="h-10 bg-background border-border text-sm font-medium"
                        required
                      />
                    </div>
                    <div className="col-span-3">
                      <Input 
                        type="number"
                        placeholder="Rate"
                        value={item.unit_price}
                        onChange={(e) => updateInvoiceItem(idx, 'unit_price', e.target.value)}
                        className="h-10 bg-background border-border text-sm font-medium"
                        required
                      />
                    </div>
                    <div className="col-span-1 text-center">
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setInvoiceForm({...invoiceForm, items: invoiceForm.items.filter((_, i) => i !== idx)})}
                        className="text-destructive hover:bg-destructive/10"
                        disabled={invoiceForm.items.length === 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end border-t border-border pt-4">
              <div className="text-right">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Total Amount</p>
                <p className="text-2xl font-black text-foreground">₹{invoiceForm.items.reduce((acc, i) => acc + (Number(i.quantity || 0) * Number(i.unit_price || 0)), 0).toLocaleString()}</p>
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setOpenNewInvoiceDialog(false)} className="rounded-xl font-bold">
                Cancel
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black uppercase tracking-widest px-8 shadow-lg shadow-emerald-500/20">
                Generate Invoice
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {/* View Invoice Details Dialog */}
      <Dialog open={openViewDetailsDialog} onOpenChange={setOpenViewDetailsDialog}>
        <DialogContent className="sm:max-w-[600px] bg-card border-border text-foreground shadow-2xl rounded-[2.5rem]">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500" />
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-foreground flex items-center gap-3">
              <FileText className="w-6 h-6 text-blue-600" /> Invoice Details
            </DialogTitle>
            <DialogDescription className="font-medium text-muted-foreground">
              Detailed view of <span className="text-foreground font-bold">{selectedInvoice?.invoice_number}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Client Information</p>
                <p className="text-sm font-bold text-foreground">{selectedInvoice?.client?.name}</p>
                <p className="text-xs font-medium text-muted-foreground">{selectedInvoice?.client?.city}</p>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Invoice Timeline</p>
                <p className="text-xs font-bold text-foreground">Issued: {selectedInvoice ? new Date(selectedInvoice.date).toLocaleDateString() : ''}</p>
                <p className="text-xs font-bold text-rose-500">Due: {selectedInvoice ? new Date(selectedInvoice.due_date).toLocaleDateString() : ''}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-border overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 font-black uppercase tracking-widest text-muted-foreground">Description</th>
                    <th className="px-4 py-3 font-black uppercase tracking-widest text-muted-foreground text-center">Qty</th>
                    <th className="px-4 py-3 font-black uppercase tracking-widest text-muted-foreground text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {selectedInvoice?.items.map((item, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3 font-medium text-foreground">{item.description}</td>
                      <td className="px-4 py-3 font-bold text-foreground text-center">{item.quantity}</td>
                      <td className="px-4 py-3 font-black text-foreground text-right">₹{Number(item.total).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted/20">
                  <tr>
                    <td colSpan={2} className="px-4 py-4 font-black uppercase tracking-widest text-muted-foreground">Total Payable</td>
                    <td className="px-4 py-4 font-black text-lg text-foreground text-right">₹{Number(selectedInvoice?.total_amount || 0).toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
                  <Clock className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-amber-700 uppercase tracking-widest">Payment Status</span>
              </div>
              <span className="text-sm font-black text-amber-600 uppercase tracking-tighter">{selectedInvoice?.status}</span>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setOpenViewDetailsDialog(false)} className="rounded-xl font-bold h-11 px-8">Close Details</Button>
            <Button 
              onClick={() => selectedInvoice && generatePDF(selectedInvoice)}
              className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black uppercase tracking-widest h-11 px-8 shadow-lg shadow-blue-500/20"
            >
              <Download className="w-4 h-4 mr-2" /> Download Copy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modify Invoice Dialog */}
      <Dialog open={openModifyInvoiceDialog} onOpenChange={setOpenModifyInvoiceDialog}>
        <DialogContent className="sm:max-w-[700px] bg-card border-border text-foreground shadow-2xl rounded-[2.5rem] max-h-[90vh] overflow-y-auto">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500" />
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-foreground flex items-center gap-3">
              <Plus className="w-6 h-6 text-blue-600" /> Modify Invoice
            </DialogTitle>
            <DialogDescription className="font-medium">
              Updating Invoice <span className="text-foreground font-bold">{selectedInvoice?.invoice_number}</span>
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateInvoice} className="space-y-6 mt-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Client (Read Only)</Label>
                <Input disabled value={selectedInvoice?.client?.name || ""} className="h-11 bg-muted/50 border-border font-bold opacity-70" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Due Date *</Label>
                <Input 
                  required
                  type="date"
                  value={invoiceForm.due_date}
                  onChange={(e) => setInvoiceForm({...invoiceForm, due_date: e.target.value})}
                  className="h-11 bg-background border-border font-bold"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Payment Type</Label>
              <select 
                value={invoiceForm.notes}
                onChange={(e) => setInvoiceForm({...invoiceForm, notes: e.target.value})}
                className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none"
              >
                <option value="">Pending / None</option>
                <option value="Advance">Advance</option>
                <option value="Partial">Partial</option>
                <option value="Full Payment">Full Payment</option>
              </select>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Line Items</Label>
                <Button type="button" variant="ghost" size="sm" onClick={addInvoiceItem} className="text-blue-600 hover:bg-blue-500/10 font-bold">
                  <Plus className="w-4 h-4 mr-1" /> Add Row
                </Button>
              </div>
              
              <div className="space-y-3">
                {invoiceForm.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-3 items-end bg-muted/20 p-4 rounded-xl border border-border">
                    <div className="col-span-6 space-y-1">
                      <Input 
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => updateInvoiceItem(idx, 'description', e.target.value)}
                        className="h-10 bg-background border-border text-sm font-medium"
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <Input 
                        type="number"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateInvoiceItem(idx, 'quantity', e.target.value)}
                        className="h-10 bg-background border-border text-sm font-medium"
                        required
                      />
                    </div>
                    <div className="col-span-3">
                      <Input 
                        type="number"
                        placeholder="Rate"
                        value={item.unit_price}
                        onChange={(e) => updateInvoiceItem(idx, 'unit_price', e.target.value)}
                        className="h-10 bg-background border-border text-sm font-medium"
                        required
                      />
                    </div>
                    <div className="col-span-1 text-center">
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setInvoiceForm({...invoiceForm, items: invoiceForm.items.filter((_, i) => i !== idx)})}
                        className="text-destructive hover:bg-destructive/10"
                        disabled={invoiceForm.items.length === 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end border-t border-border pt-4">
              <div className="text-right">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Adjusted Total</p>
                <p className="text-2xl font-black text-foreground">₹{invoiceForm.items.reduce((acc, i) => acc + (Number(i.quantity || 0) * Number(i.unit_price || 0)), 0).toLocaleString()}</p>
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setOpenModifyInvoiceDialog(false)} className="rounded-xl font-bold">
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black uppercase tracking-widest px-8 shadow-lg shadow-blue-500/20">
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
