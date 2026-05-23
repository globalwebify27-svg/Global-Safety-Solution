"use client";

import { useEffect, useState, Suspense } from "react";
import { useAuthStore } from "@/store/auth";
import { API_BASE_URL } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { 
  FileSpreadsheet, 
  Plus, 
  Search, 
  Filter, 
  FileText, 
  Download,
  Clock,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  Trash2,
  Calculator,
  User,
  Hash,
  Banknote
} from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

interface QuoteItem {
  description: string;
  quantity: number;
  unit_price: number;
}

interface Quotation {
  id: string;
  quote_number: string;
  total_amount: number;
  status: string;
  date: string;
  lead_id?: string;
  client_id?: string;
  lead?: { company_name: string };
  client?: { name: string };
}

function QuotationsContent() {
  const searchParams = useSearchParams();
  const leadIdFromQuery = searchParams.get("leadId");

  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [openView, setOpenView] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const token = useAuthStore((state) => state.token);

  const [editMode, setEditMode] = useState(false);
  const [editQuoteId, setEditQuoteId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    lead_id: "",
    client_id: "",
    notes: "",
    apply_gst: true,
    discount_type: "flat", // "flat" or "percent"
    discount_value: 0,
    items: [{ description: "", quantity: 1, unit_price: 0 }] as QuoteItem[]
  });

  const calculateDiscountAmount = () => {
    const subtotal = calculateTotal();
    if (formData.discount_type === 'percent') {
      return (subtotal * (formData.discount_value || 0)) / 100;
    }
    return formData.discount_value || 0;
  };

  const handleEditQuotation = (quote: any) => {
    setEditMode(true);
    setEditQuoteId(quote.id);
    
    // Determine the discount type and value from the quotation data
    const totalItemsAmount = quote.items.reduce((acc: number, item: any) => acc + (Number(item.quantity) * Number(item.unit_price)), 0);
    const savedDiscount = Number(quote.discount) || 0;
    
    let discountType = "flat";
    let discountValue = savedDiscount;
    
    if (savedDiscount > 0 && totalItemsAmount > 0) {
      const calculatedPct = Math.round((savedDiscount / totalItemsAmount) * 100);
      if (Math.abs((totalItemsAmount * calculatedPct / 100) - savedDiscount) < 0.01) {
        discountType = "percent";
        discountValue = calculatedPct;
      }
    }

    setFormData({
      lead_id: quote.lead_id || "",
      client_id: quote.client_id || "",
      notes: quote.notes || "",
      apply_gst: Number(quote.tax_amount) > 0,
      discount_type: discountType,
      discount_value: discountValue,
      items: quote.items.map((item: any) => ({
        description: item.description,
        quantity: item.quantity,
        unit_price: Number(item.unit_price)
      }))
    });
    setOpen(true);
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  // Handle leadId from query parameter
  useEffect(() => {
    if (leadIdFromQuery) {
      setFormData(prev => ({ ...prev, lead_id: leadIdFromQuery }));
      setOpen(true);
    }
  }, [leadIdFromQuery]);

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [qRes, lRes, cRes] = await Promise.all([
        fetch(`${API_BASE_URL}/quotations`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/leads`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/clients`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      const [qData, lData, cData] = await Promise.all([qRes.json(), lRes.json(), cRes.json()]);
      if (Array.isArray(qData)) setQuotations(qData);
      if (Array.isArray(lData)) setLeads(lData);
      if (Array.isArray(cData)) setClients(cData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { description: "", quantity: 1, unit_price: 0 }]
    });
  };

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    });
  };

  const updateItem = (index: number, field: keyof QuoteItem, value: string) => {
    const newItems = [...formData.items];
    const item = newItems[index];
    
    let parsedValue: any = value;
    if (field === 'quantity') parsedValue = parseInt(value) || 0;
    if (field === 'unit_price') parsedValue = parseFloat(value) || 0;
    
    newItems[index] = { ...item, [field]: field === 'description' ? value : parsedValue };
    setFormData({ ...formData, items: newItems });
  };

  const calculateTotal = () => {
    return formData.items.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    if (!token) return;
    const url = `${API_BASE_URL}/quotations/${id}/status`;
    console.log(`[DEBUG] Attempting status update: ${url} -> ${status}`);
    
    try {
      const res = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      if (res.ok) {
        toast.success(`Quotation marked as ${status.toLowerCase()}`);
        fetchData();
      } else {
        const errText = await res.text();
        console.error(`[ERROR] Server returned ${res.status}:`, errText);
        toast.error(`Server error: ${res.status}`);
      }
    } catch (e) {
      console.error("[FETCH ERROR] Failed to connect to backend:", e);
      toast.error("Network error: Backend unreachable. Ensure the NestJS server is running on port 3001.");
    }
  };

  const handleDeleteQuotation = async (id: string) => {
    if (!token || !confirm("Are you sure you want to delete this draft?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/quotations/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success("Draft deleted successfully");
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownload = (quote: Quotation) => {
    setSelectedQuote(quote);
    setTimeout(() => {
        const printContent = document.getElementById('quotation-print-area');
        if (!printContent) return;
        
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);
        
        const doc = iframe.contentWindow?.document;
        if (!doc) return;
        
        doc.open();
        doc.write(`
          <html>
            <head><title>Quotation ${quote.quote_number}</title></head>
            <body>${printContent.innerHTML}</body>
          </html>
        `);
        doc.close();
        
        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          document.body.removeChild(iframe);
        }, 500);
    }, 100);
  };

  const handleViewDetails = (quote: any) => {
    setSelectedQuote(quote);
    setOpenView(true);
  };

  const handleConvertQuotation = async (quote: any) => {
    if (!token) return;
    
    // Check if quote is sent or accepted
    if (quote.status === 'DRAFT') {
      toast.error("Please mark the quotation as SENT before converting.");
      return;
    }

    const isLeadConversion = !!quote.lead_id;
    const confirmMessage = isLeadConversion 
      ? "This will mark the quotation as ACCEPTED, automatically convert the lead to a client, and generate a Project/Invoice. Proceed?"
      : "This will mark the quotation as ACCEPTED and automatically generate a Project and an Invoice for this client. Proceed?";

    if (!confirm(confirmMessage)) return;

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/quotations/${quote.id}/convert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      if (res.ok) {
        toast.success("Success! Project and Invoice generated.");
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.message || "Failed to finalize project conversion. Please check system logs.");
      }
    } catch (e) {
      toast.error("Network error.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!formData.lead_id && !formData.client_id) {
      toast.error("Please select either a Lead or an Existing Client.");
      return;
    }
    setSubmitting(true);

    const payload = {
      lead_id: formData.lead_id || undefined,
      client_id: formData.client_id || undefined,
      notes: formData.notes,
      apply_gst: formData.apply_gst,
      discount: calculateDiscountAmount(),
      items: formData.items
    };

    try {
      const url = editMode 
        ? `${API_BASE_URL}/quotations/${editQuoteId}` 
        : `${API_BASE_URL}/quotations`;
      const method = editMode ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setOpen(false);
        setFormData({ lead_id: "", client_id: "", notes: "", apply_gst: true, discount_type: "flat", discount_value: 0, items: [{ description: "", quantity: 1, unit_price: 0 }] });
        setEditMode(false);
        setEditQuoteId(null);
        toast.success(editMode ? "Proposal updated successfully!" : "Quotation generated successfully!");
        fetchData();
      } else {
        const errData = await res.json().catch(() => ({}));
        const errMsg = errData.message 
          ? (Array.isArray(errData.message) ? errData.message.join(", ") : errData.message)
          : (editMode ? "Failed to update quotation." : "Failed to generate quotation.");
        toast.error(errMsg);
      }
    } catch (e) {
      toast.error("Network error occurred.");
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-muted text-muted-foreground ring-border';
      case 'SENT': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-blue-500/20';
      case 'ACCEPTED': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20';
      case 'REJECTED': return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-rose-500/20';
      default: return 'bg-muted text-muted-foreground ring-border';
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl lg:text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 via-teal-500 to-blue-600">
            Quotation Hub
          </h1>
          <p className="text-muted-foreground font-medium text-sm lg:text-base">Generate and manage professional business proposals with ease.</p>
        </div>

        <Dialog open={open} onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) {
            setFormData({ lead_id: "", client_id: "", notes: "", apply_gst: true, discount_type: "flat", discount_value: 0, items: [{ description: "", quantity: 1, unit_price: 0 }] });
            setEditMode(false);
            setEditQuoteId(null);
          }
        }}>
          <DialogTrigger render={<Button className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-xl shadow-emerald-500/20 px-8 h-12 transition-all active:scale-95 text-sm lg:text-base border-0" />}>
            <Plus className="w-5 h-5 mr-2" /> Draft New Proposal
          </DialogTrigger>
          <DialogContent className="sm:max-w-[800px] bg-card border-border text-foreground max-h-[90vh] overflow-y-auto rounded-[2rem]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">{editMode ? "Edit Professional Proposal" : "Create Professional Quotation"}</DialogTitle>
              <DialogDescription className="text-muted-foreground">Define scope, pricing, terms, and commercial discounts for the client.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateQuotation} className="space-y-6 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-foreground/80">Select Lead / Opportunity</Label>
                  <select 
                    className="w-full bg-background border border-border rounded-xl h-11 px-3 text-sm focus:ring-2 focus:ring-emerald-500 text-foreground"
                    value={formData.lead_id}
                    onChange={(e) => {
                      setFormData({...formData, lead_id: e.target.value, client_id: ""});
                    }}
                    disabled={!!formData.client_id}
                  >
                    <option value="">Choose an active lead...</option>
                    {leads.map(lead => (
                      <option key={lead.id} value={lead.id}>{lead.company_name} ({lead.contact_person})</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-center pt-6 text-muted-foreground font-black text-xs">OR</div>

                <div className="space-y-2">
                  <Label className="text-foreground/80">Select Existing Client</Label>
                  <select 
                    className="w-full bg-background border border-border rounded-xl h-11 px-3 text-sm focus:ring-2 focus:ring-emerald-500 text-foreground"
                    value={formData.client_id}
                    onChange={(e) => {
                      setFormData({...formData, client_id: e.target.value, lead_id: ""});
                    }}
                    disabled={!!formData.lead_id}
                  >
                    <option value="">Choose registered client...</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>{client.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-lg font-bold text-foreground">Line Items</Label>
                </div>
                
                <div className="space-y-3">
                  {formData.items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-muted/50 p-4 rounded-2xl border border-border group">
                      <div className="col-span-1 md:col-span-6 space-y-1.5">
                        <Label className="text-[10px] uppercase font-black text-muted-foreground">Description</Label>
                        <Input 
                          value={item.description}
                          onChange={(e) => updateItem(idx, 'description', e.target.value)}
                          placeholder="Safety Audit, Training, etc."
                          className="bg-background border-border h-10 text-sm rounded-lg text-foreground"
                          required
                        />
                      </div>
                      <div className="col-span-1 md:col-span-2 space-y-1.5">
                        <Label className="text-[10px] uppercase font-black text-muted-foreground">Qty</Label>
                        <Input 
                          type="number"
                          value={item.quantity === 0 ? "" : item.quantity.toString()}
                          onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                          className="bg-background border-border h-10 text-sm rounded-lg text-foreground"
                          required
                        />
                      </div>
                      <div className="col-span-1 md:col-span-3 space-y-1.5">
                        <Label className="text-[10px] uppercase font-black text-muted-foreground">Rate (₹)</Label>
                        <Input 
                          type="number"
                          value={item.unit_price === 0 ? "" : item.unit_price.toString()}
                          onChange={(e) => updateItem(idx, 'unit_price', e.target.value)}
                          className="bg-background border-border h-10 text-sm rounded-lg text-foreground"
                          required
                        />
                      </div>
                      <div className="col-span-1 flex justify-end md:justify-center pb-2">
                        <Button type="button" onClick={() => removeItem(idx)} variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-start">
                  <Button type="button" onClick={addItem} variant="ghost" size="sm" className="text-emerald-600 hover:text-emerald-500 hover:bg-emerald-500/10 font-bold rounded-xl h-9 px-3">
                    <Plus className="w-4 h-4 mr-1" /> Add Item Row
                  </Button>
                </div>
              </div>

              {/* Terms & Notes */}
              <div className="space-y-2">
                <Label className="text-foreground/80">Terms & Special Notes</Label>
                <textarea
                  className="w-full bg-background border border-border rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 text-foreground min-h-[80px] focus:outline-none"
                  placeholder="Standard validities, milestone payments, etc."
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-border pt-6 w-full">
                {/* Left Side: Tax & Discount Controls */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox"
                      id="apply_gst"
                      checked={formData.apply_gst}
                      onChange={(e) => setFormData({ ...formData, apply_gst: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 border-border rounded focus:ring-emerald-500 bg-background accent-emerald-600 cursor-pointer"
                    />
                    <label htmlFor="apply_gst" className="text-xs font-bold uppercase tracking-wider text-muted-foreground cursor-pointer select-none">
                      Apply 18% GST (9% CGST + 9% SGST)
                    </label>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Apply Commercial Discount</Label>
                    <div className="flex gap-2">
                      <select
                        className="bg-background border border-border rounded-xl h-10 px-2 text-xs focus:ring-2 focus:ring-emerald-500 text-foreground focus:outline-none"
                        value={formData.discount_type}
                        onChange={(e) => setFormData({ ...formData, discount_type: e.target.value, discount_value: 0 })}
                      >
                        <option value="flat">Flat (₹)</option>
                        <option value="percent">Percentage (%)</option>
                      </select>
                      <Input
                        type="number"
                        placeholder="Discount value..."
                        value={formData.discount_value === 0 ? "" : formData.discount_value.toString()}
                        onChange={(e) => setFormData({ ...formData, discount_value: Math.max(0, parseFloat(e.target.value) || 0) })}
                        className="bg-background border-border h-10 text-sm rounded-lg text-foreground w-full"
                      />
                    </div>
                  </div>
                </div>

                {/* Right Side: Financial Breakdown */}
                <div className="flex flex-col items-end gap-2.5">
                  <div className="flex items-center gap-10 text-muted-foreground text-sm">
                    <span className="font-bold uppercase tracking-widest text-[10px]">Gross Subtotal:</span>
                    <span className="font-bold text-foreground tabular-nums">₹{calculateTotal().toLocaleString()}</span>
                  </div>
                  {calculateDiscountAmount() > 0 && (
                    <div className="flex items-center gap-10 text-rose-500 text-sm">
                      <span className="font-bold uppercase tracking-widest text-[10px]">Discount Applied:</span>
                      <span className="font-black tabular-nums">-₹{calculateDiscountAmount().toLocaleString()}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-10 text-muted-foreground text-sm font-semibold border-t border-border/30 pt-1.5 w-full justify-end">
                    <span className="font-bold uppercase tracking-widest text-[10px]">Taxable Value:</span>
                    <span className="font-black text-foreground tabular-nums">₹{Math.max(0, calculateTotal() - calculateDiscountAmount()).toLocaleString()}</span>
                  </div>

                  {formData.apply_gst && (
                    <div className="flex items-center gap-10 text-muted-foreground text-sm">
                      <span className="font-bold uppercase tracking-widest text-[10px]">GST (18%):</span>
                      <span className="font-bold text-foreground tabular-nums">₹{(Math.max(0, calculateTotal() - calculateDiscountAmount()) * 0.18).toLocaleString()}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-10 border-t-2 border-border pt-2 w-full justify-end">
                    <span className="text-sm font-black uppercase tracking-widest text-emerald-600">Grand Total:</span>
                    <span className="text-3xl font-black text-foreground tabular-nums">
                      ₹{(
                        Math.max(0, calculateTotal() - calculateDiscountAmount()) * (formData.apply_gst ? 1.18 : 1)
                      ).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="submit" disabled={submitting} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold w-full h-12 shadow-xl shadow-emerald-500/20 rounded-xl border-0">
                  {submitting 
                    ? (editMode ? "Updating Proposal..." : "Generating Proposal...") 
                    : (editMode ? "Update & Save Proposal" : "Finalize & Send Quotation")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card/40 border border-border rounded-[2.5rem] overflow-hidden shadow-sm backdrop-blur-md">
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left min-w-[800px] lg:min-w-0">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="px-6 py-5 text-xs font-bold text-muted-foreground uppercase tracking-widest">Quote Details</th>
                <th className="px-6 py-5 text-xs font-bold text-muted-foreground uppercase tracking-widest">Recipient</th>
                <th className="px-6 py-5 text-xs font-bold text-muted-foreground uppercase tracking-widest hidden md:table-cell">Total Value</th>
                <th className="px-6 py-5 text-xs font-bold text-muted-foreground uppercase tracking-widest">Status</th>
                <th className="px-6 py-5 text-xs font-bold text-muted-foreground uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground italic">Fetching proposal history...</td>
                </tr>
              ) : quotations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground italic">No quotations found in the hub.</td>
                </tr>
              ) : quotations.map((q) => (
                <tr key={q.id} className="hover:bg-accent/5 transition-colors group">
                  <td className="px-6 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform">
                        <Hash className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <div className="text-foreground font-bold text-base">{q.quote_number}</div>
                        <div className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mt-0.5">
                          {new Date(q.date).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="text-foreground/90 font-bold">{q.lead?.company_name || q.client?.name || "Unknown"}</div>
                  </td>
                  <td className="px-6 py-6 hidden md:table-cell">
                    <div className="text-foreground font-black tabular-nums text-base">₹{Number(q.total_amount).toLocaleString()}</div>
                  </td>
                  <td className="px-6 py-6">
                    <span className={cn("px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter ring-1", getStatusColor(q.status))}>
                      {q.status}
                    </span>
                  </td>
                  <td className="px-6 py-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDownload(q)}
                        className="text-muted-foreground hover:text-foreground hover:bg-accent/10 rounded-2xl w-10 h-10"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      
                       <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="text-foreground/70 hover:text-foreground hover:bg-emerald-500/10 rounded-2xl w-10 h-10 ring-1 ring-transparent hover:ring-emerald-500/20 transition-all" />}>
                            <MoreVertical className="w-5 h-5" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-card border border-border text-foreground min-w-[200px] shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-2xl rounded-2xl p-2 z-50">

                          <DropdownMenuItem onClick={() => handleViewDetails(q)} className="hover:bg-emerald-500/10 cursor-pointer flex items-center gap-3 py-3 rounded-xl font-bold text-sm transition-colors">
                            <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> View Details
                          </DropdownMenuItem>
                          {q.status === 'DRAFT' && (
                            <>
                              <DropdownMenuItem onClick={() => handleEditQuotation(q)} className="hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 cursor-pointer flex items-center gap-3 py-3 rounded-xl font-bold text-sm">
                                <Calculator className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Edit Proposal
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateStatus(q.id, 'SENT')} className="hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 cursor-pointer flex items-center gap-3 py-3 rounded-xl font-bold text-sm">
                                <CheckCircle2 className="w-4 h-4" /> Mark as Sent
                              </DropdownMenuItem>
                            </>
                          )}
                          {q.status === 'SENT' && (
                             <DropdownMenuItem onClick={() => handleUpdateStatus(q.id, 'ACCEPTED')} className="hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 cursor-pointer flex items-center gap-3 py-3 rounded-xl font-bold text-sm">
                              <CheckCircle2 className="w-4 h-4" /> Mark as Accepted
                            </DropdownMenuItem>
                          )}
                          {(q.status === 'SENT' || q.status === 'ACCEPTED') && (
                             <DropdownMenuItem onClick={() => handleConvertQuotation(q)} className="hover:bg-blue-500/10 text-blue-600 dark:text-blue-400 cursor-pointer flex items-center gap-3 py-3 rounded-xl font-bold text-sm">
                              <Banknote className="w-4 h-4" /> {q.client_id ? "Generate Project & Invoice" : "Convert Lead to Client & Project"}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleDeleteQuotation(q.id)} className="hover:bg-rose-500/10 text-rose-600 cursor-pointer flex items-center gap-3 py-3 rounded-xl font-bold text-sm mt-1 border-t border-border transition-colors">
                            <Trash2 className="w-4 h-4" /> Delete Draft
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Details Dialog */}
      <Dialog open={openView} onOpenChange={setOpenView}>
        <DialogContent className="sm:max-w-[800px] bg-card border-border text-foreground p-0 overflow-hidden shadow-2xl">
          {selectedQuote && (
            <div className="flex flex-col h-full">
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-8 text-white">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-3xl font-black tracking-tighter">QUOTATION</h2>
                    <p className="text-emerald-100 font-mono text-sm">{selectedQuote.quote_number}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase font-bold tracking-widest text-emerald-200">Date Issued</p>
                    <p className="font-bold">{new Date(selectedQuote.date).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              <div className="p-8 space-y-8">
                <div className="grid grid-cols-2 gap-10">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Issuer</p>
                    <div className="text-sm font-bold text-foreground">Global Safety Solution</div>
                    <p className="text-xs text-muted-foreground leading-relaxed">Corporate Office, Safety Plaza,<br />Industrial Hub, Maharashtra - 400001</p>
                  </div>
                  <div className="space-y-2 text-right">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Recipient</p>
                    <div className="text-sm font-bold text-foreground">{selectedQuote.lead?.company_name || selectedQuote.client?.name}</div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{selectedQuote.lead?.contact_person || "Authorized Representative"}</p>
                  </div>
                </div>

                <div className="border border-border rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted border-b border-border">
                      <tr>
                        <th className="px-4 py-3 font-bold text-muted-foreground">Description</th>
                        <th className="px-4 py-3 font-bold text-muted-foreground text-center">Qty</th>
                        <th className="px-4 py-3 font-bold text-muted-foreground text-right">Rate</th>
                        <th className="px-4 py-3 font-bold text-muted-foreground text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {selectedQuote.items?.map((item: any, i: number) => (
                        <tr key={i} className="hover:bg-accent/5 transition-colors">
                          <td className="px-4 py-3 text-foreground/80 font-medium">{item.description}</td>
                          <td className="px-4 py-3 text-muted-foreground text-center">{item.quantity}</td>
                          <td className="px-4 py-3 text-muted-foreground text-right">₹{Number(item.unit_price).toLocaleString()}</td>
                          <td className="px-4 py-3 text-foreground font-bold text-right">₹{Number(item.total).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-muted/50 font-black text-right">
                      <tr>
                        <td colSpan={3} className="px-4 py-2 text-muted-foreground uppercase tracking-widest text-[10px]">Gross Subtotal</td>
                        <td className="px-4 py-2 text-foreground tabular-nums">₹{Number(selectedQuote.subtotal).toLocaleString()}</td>
                      </tr>
                      {Number(selectedQuote.discount) > 0 && (
                        <tr className="text-rose-600">
                          <td colSpan={3} className="px-4 py-2 uppercase tracking-widest text-[10px]">Discount Applied</td>
                          <td className="px-4 py-2 tabular-nums">-₹{Number(selectedQuote.discount).toLocaleString()}</td>
                        </tr>
                      )}
                      <tr>
                        <td colSpan={3} className="px-4 py-2 text-muted-foreground uppercase tracking-widest text-[10px]">Taxable Value</td>
                        <td className="px-4 py-2 text-foreground tabular-nums">₹{Math.max(0, Number(selectedQuote.subtotal) - Number(selectedQuote.discount)).toLocaleString()}</td>
                      </tr>
                      {Number(selectedQuote.tax_amount) > 0 && (
                        <tr>
                          <td colSpan={3} className="px-4 py-2 text-muted-foreground uppercase tracking-widest text-[10px]">GST (18%)</td>
                          <td className="px-4 py-2 text-foreground tabular-nums">₹{Number(selectedQuote.tax_amount).toLocaleString()}</td>
                        </tr>
                      )}
                      <tr className="border-t border-border/80 bg-emerald-500/5 text-base font-black">
                        <td colSpan={3} className="px-4 py-4 uppercase tracking-widest text-[10px] text-emerald-600 dark:text-emerald-400">Grand Total</td>
                        <td className="px-4 py-4 text-emerald-600 dark:text-emerald-400 text-xl tabular-nums">₹{Number(selectedQuote.total_amount).toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Terms & Notes</p>
                  <p className="text-xs text-muted-foreground italic">{selectedQuote.notes || "Standard professional terms apply. This quotation is valid for 30 days from the date of issue."}</p>
                </div>
              </div>

              <div className="p-6 border-t border-border bg-muted/30 flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setOpenView(false)} className="text-muted-foreground hover:text-foreground">Close</Button>
                <Button onClick={() => handleDownload(selectedQuote)} className="bg-emerald-600 hover:bg-emerald-500 font-bold border-0 text-white shadow-lg shadow-emerald-600/20">
                  <Download className="w-4 h-4 mr-2" /> Download PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>


      {/* Hidden Print Area */}
      <div id="quotation-print-area" className="hidden">
        {selectedQuote && (
            <div style={{ padding: '40px', fontFamily: 'sans-serif', color: '#000', backgroundColor: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #000', paddingBottom: '20px', marginBottom: '30px' }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '28px' }}>QUOTATION</h1>
                        <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>#{selectedQuote.quote_number}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <h2 style={{ margin: 0, fontSize: '18px' }}>Global Safety Solution</h2>
                        <p style={{ margin: '5px 0', fontSize: '12px' }}>Date: {new Date(selectedQuote.date).toLocaleDateString()}</p>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px' }}>
                    <div>
                        <h3 style={{ fontSize: '12px', textTransform: 'uppercase', color: '#666', marginBottom: '10px' }}>To:</h3>
                        <p style={{ margin: 0, fontWeight: 'bold' }}>{selectedQuote.lead?.company_name || selectedQuote.client?.name}</p>
                        <p style={{ margin: '5px 0', fontSize: '13px' }}>{selectedQuote.lead?.contact_person || "Authorized Representative"}</p>
                    </div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '40px' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f5f5f5' }}>
                            <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Description</th>
                            <th style={{ padding: '10px', textAlign: 'center', border: '1px solid #ddd' }}>Qty</th>
                            <th style={{ padding: '10px', textAlign: 'right', border: '1px solid #ddd' }}>Rate</th>
                            <th style={{ padding: '10px', textAlign: 'right', border: '1px solid #ddd' }}>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {selectedQuote.items?.map((item: any, i: number) => (
                            <tr key={i}>
                                <td style={{ padding: '10px', border: '1px solid #ddd' }}>{item.description}</td>
                                <td style={{ padding: '10px', textAlign: 'center', border: '1px solid #ddd' }}>{item.quantity}</td>
                                <td style={{ padding: '10px', textAlign: 'right', border: '1px solid #ddd' }}>₹{Number(item.unit_price).toLocaleString()}</td>
                                <td style={{ padding: '10px', textAlign: 'right', border: '1px solid #ddd', fontWeight: 'bold' }}>₹{Number(item.total).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan={3} style={{ padding: '8px 10px', textAlign: 'right', color: '#555', fontSize: '12px' }}>Gross Subtotal</td>
                            <td style={{ padding: '8px 10px', textAlign: 'right', fontSize: '13px' }}>₹{Number(selectedQuote.subtotal).toLocaleString()}</td>
                        </tr>
                        {Number(selectedQuote.discount) > 0 && (
                            <tr style={{ color: '#b91c1c' }}>
                                <td colSpan={3} style={{ padding: '8px 10px', textAlign: 'right', fontSize: '12px' }}>Discount Applied</td>
                                <td style={{ padding: '8px 10px', textAlign: 'right', fontSize: '13px', fontWeight: 'bold' }}>-₹{Number(selectedQuote.discount).toLocaleString()}</td>
                            </tr>
                        )}
                        <tr style={{ fontWeight: 'bold' }}>
                            <td colSpan={3} style={{ padding: '8px 10px', textAlign: 'right', color: '#000', fontSize: '12px' }}>Taxable Value</td>
                            <td style={{ padding: '8px 10px', textAlign: 'right', fontSize: '13px' }}>₹{Math.max(0, Number(selectedQuote.subtotal) - Number(selectedQuote.discount)).toLocaleString()}</td>
                        </tr>
                        {Number(selectedQuote.tax_amount) > 0 && (
                            <tr>
                                <td colSpan={3} style={{ padding: '8px 10px', textAlign: 'right', color: '#555', fontSize: '12px' }}>GST (18%)</td>
                                <td style={{ padding: '8px 10px', textAlign: 'right', fontSize: '13px' }}>₹{Number(selectedQuote.tax_amount).toLocaleString()}</td>
                            </tr>
                        )}
                        <tr style={{ fontWeight: 'bold', fontSize: '15px', backgroundColor: '#f3f4f6' }}>
                            <td colSpan={3} style={{ padding: '12px 10px', textAlign: 'right', textTransform: 'uppercase' }}>Grand Total</td>
                            <td style={{ padding: '12px 10px', textAlign: 'right', color: '#059669', fontSize: '16px' }}>₹{Number(selectedQuote.total_amount).toLocaleString()}</td>
                        </tr>
                    </tfoot>
                </table>

                <div style={{ fontSize: '12px', color: '#666', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                    <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>Terms & Conditions:</p>
                    <p style={{ margin: 0 }}>1. This quotation is valid for 30 days.</p>
                    <p style={{ margin: 0 }}>2. 50% advance payment required for processing.</p>
                    <p style={{ margin: 0 }}>3. Standard delivery terms apply.</p>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}

export default function QuotationsPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <div className="text-muted-foreground animate-pulse font-bold tracking-widest uppercase text-[10px]">
          Initialising Quotation Hub...
        </div>
      </div>
    }>
      <QuotationsContent />
    </Suspense>
  );
}
