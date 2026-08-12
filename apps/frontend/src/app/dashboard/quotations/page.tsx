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
  Banknote,
  Mail
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
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { numberToWords } from "@/lib/numberToWords";

const RichTextEditor = dynamic(() => import("@/components/RichTextEditor"), { ssr: false });

interface QuoteItem {
  description: string;
  quantity: number;
  unit_price: number;
  uom?: string;
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
  const router = useRouter();
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
  const { token, user } = useAuthStore();
  const roleName = user?.roles?.[0]?.role?.name || "";
  const designation = (user?.designation || "").toUpperCase();
  const isClient = roleName === "CLIENT" || designation.includes("CLIENT");

  const [editMode, setEditMode] = useState(false);
  const [editQuoteId, setEditQuoteId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    lead_id: "",
    client_id: "",
    notes: "",
    billing_address: "",
    apply_gst: true,
    discount_type: "flat", // "flat" or "percent"
    discount_value: 0,
    quote_number: "",
    date: "",
    items: [{ description: "", quantity: 1, unit_price: 0, uom: "NOS" }] as QuoteItem[]
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
      billing_address: quote.billing_address || "",
      apply_gst: Number(quote.tax_amount) > 0,
      discount_type: discountType,
      discount_value: discountValue,
      quote_number: quote.quote_number || "",
      date: quote.date ? quote.date.split('T')[0] : "",
      items: quote.items.map((item: any) => ({
        description: item.description,
        quantity: item.quantity,
        unit_price: Number(item.unit_price),
        uom: item.uom
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
      items: [...formData.items, { description: "", quantity: 1, unit_price: 0, uom: "NOS" }]
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
    
    newItems[index] = { ...item, [field]: field === 'description' || field === 'uom' ? value : parsedValue };
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

  const handleSendProposal = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/quotations/${id}/send-proposal`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Proposal email sent successfully!");
        fetchData();
      } else {
        toast.error(data.message || "Failed to send proposal email.");
      }
    } catch {
      toast.error("Error connecting to email service");
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
        
        doc.write(`
          <html>
            <head>
              <title>Quotation ${quote.quote_number}</title>
              <style>
                body { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; color: #333; margin: 0; padding: 0; }
                ul { list-style-type: disc !important; margin: 5px 0 5px 20px !important; padding: 0 !important; }
                ol { list-style-type: decimal !important; margin: 5px 0 5px 20px !important; padding: 0 !important; }
                li { margin-bottom: 3px !important; display: list-item !important; }
                p { margin: 5px 0 !important; }
                @media print {
                  html, body {
                    height: auto !important;
                    overflow: visible !important;
                  }
                  body { padding: 0; }
                  @page { size: A4; margin: 20mm; }
                  tr, img { page-break-inside: avoid !important; }
                }
              </style>
            </head>
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
        toast.success("Success! Operations Project and Invoice generated.");
        fetchData();
        router.push("/dashboard/operations");
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
      billing_address: formData.billing_address,
      apply_gst: formData.apply_gst,
      discount: calculateDiscountAmount(),
      quote_number: formData.quote_number || undefined,
      date: formData.date || undefined,
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
        setFormData({ lead_id: "", client_id: "", notes: "", billing_address: "", apply_gst: true, discount_type: "flat", discount_value: 0, quote_number: "", date: "", items: [{ description: "", quantity: 1, unit_price: 0, uom: "NOS" }] });
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

        {!isClient && (
          <Dialog open={open} onOpenChange={(isOpen) => {
            setOpen(isOpen);
            if (!isOpen) {
              setFormData({ lead_id: "", client_id: "", notes: "", billing_address: "", apply_gst: true, discount_type: "flat", discount_value: 0, quote_number: "", date: "", items: [{ description: "", quantity: 1, unit_price: 0, uom: "NOS" }] });
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
                        setFormData({...formData, lead_id: e.target.value, client_id: "", billing_address: ""});
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
                        const cid = e.target.value;
                        const client = clients.find(c => c.id === cid);
                        let addr = "";
                        if (client) {
                          const parts = [
                            client.billing_address,
                            client.city,
                            client.state,
                            client.country,
                            client.pincode
                          ].filter(Boolean);
                          addr = parts.join(", ");
                        }
                        setFormData({...formData, client_id: cid, lead_id: "", billing_address: addr});
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

                <div className="space-y-2">
                  <Label className="text-foreground/80">Billing Address</Label>
                  <textarea 
                    placeholder="Enter client billing address..."
                    className="w-full bg-background border border-border rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 text-foreground min-h-[80px]"
                    value={formData.billing_address}
                    onChange={(e) => setFormData({...formData, billing_address: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-foreground/80 font-bold text-xs uppercase tracking-wider">Quotation Number (Optional)</Label>
                    <Input 
                      placeholder="e.g. QT-2026-0001 (Leave empty to auto-generate)"
                      className="w-full bg-background border-border text-foreground h-11 text-sm rounded-xl"
                      value={formData.quote_number || ""}
                      onChange={(e) => setFormData({...formData, quote_number: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-foreground/80 font-bold text-xs uppercase tracking-wider">Quotation Date (Optional)</Label>
                    <Input 
                      type="date"
                      className="w-full bg-background border-border text-foreground h-11 text-sm rounded-xl"
                      value={formData.date || ""}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                    />
                  </div>
                </div>
  
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-lg font-bold text-foreground">Line Items</Label>
                  </div>
                  
                  <div className="space-y-3">
                    {formData.items.map((item, idx) => (
                      <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-muted/50 p-4 rounded-2xl border border-border group relative">
                        <div className="absolute -top-2 -left-1 bg-emerald-600 text-white text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center shadow">{idx + 1}</div>
                        <div className="col-span-1 md:col-span-5 space-y-1.5">
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
                        <div className="col-span-1 md:col-span-2 space-y-1.5">
                          <Label className="text-[10px] uppercase font-black text-muted-foreground">UOM</Label>
                          <Input 
                            value={item.uom || ""}
                            onChange={(e) => updateItem(idx, 'uom', e.target.value)}
                            placeholder="e.g. PCS, Nos"
                            className="bg-background border-border h-10 text-sm rounded-lg text-foreground"
                            required
                          />
                        </div>
                        <div className="col-span-1 md:col-span-2 space-y-1.5">
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
                  <RichTextEditor
                    content={formData.notes}
                    onChange={(html: string) => setFormData({...formData, notes: html})}
                    placeholder="Standard validities, milestone payments, etc."
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
        )}
      </div>

      <div className="bg-card/40 border border-border rounded-[2.5rem] overflow-hidden shadow-sm backdrop-blur-md">
        <div className="overflow-x-auto">
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
                          {!isClient && (
                            <>
                              <DropdownMenuItem onClick={() => handleSendProposal(q.id)} className="hover:bg-blue-500/10 text-blue-600 dark:text-blue-400 cursor-pointer flex items-center gap-3 py-3 rounded-xl font-bold text-sm transition-colors">
                                <Mail className="w-4 h-4 text-blue-500" /> Send Proposal Email
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
                            </>
                          )}
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
        <DialogContent className="w-[95vw] sm:w-full sm:max-w-[800px] bg-card border-border text-foreground p-0 overflow-hidden shadow-2xl max-h-[90vh] flex flex-col rounded-[2rem]">
          {selectedQuote && (
            <div className="flex flex-col h-full max-h-[90vh] overflow-hidden">
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

              <div className="p-8 space-y-8 overflow-y-auto flex-1 glass-scrollbar">
                <div className="grid grid-cols-2 gap-10">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Issuer</p>
                    <div className="text-sm font-bold text-foreground">Global Safety Solution</div>
                    <p className="text-xs text-muted-foreground leading-relaxed">Corporate Office, Safety Plaza,<br />Industrial Hub, Maharashtra - 400001</p>
                  </div>
                  <div className="space-y-2 text-right">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Recipient</p>
                    <div className="text-sm font-bold text-foreground">{selectedQuote.lead?.company_name || selectedQuote.client?.name}</div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{selectedQuote.authorized_rep_name || selectedQuote.lead?.contact_person || "—"}</p>
                    {selectedQuote.authorized_rep_designation && (
                      <p className="text-xs text-muted-foreground">{selectedQuote.authorized_rep_designation}</p>
                    )}
                    {selectedQuote.billing_address && (
                      <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line mt-1">{selectedQuote.billing_address}</p>
                    )}
                  </div>
                </div>

                <div className="border border-border rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted border-b border-border">
                      <tr>
                        <th className="px-4 py-3 font-bold text-muted-foreground w-12">SR</th>
                        <th className="px-4 py-3 font-bold text-muted-foreground">Description</th>
                        <th className="px-4 py-3 font-bold text-muted-foreground text-center">Qty</th>
                        <th className="px-4 py-3 font-bold text-muted-foreground text-center">UOM</th>
                        <th className="px-4 py-3 font-bold text-muted-foreground text-right">Rate</th>
                        <th className="px-4 py-3 font-bold text-muted-foreground text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {selectedQuote.items?.map((item: any, i: number) => (
                        <tr key={i} className="hover:bg-accent/5 transition-colors">
                          <td className="px-4 py-3 text-muted-foreground text-center font-mono text-xs">{i + 1}</td>
                          <td className="px-4 py-3 text-foreground/80 font-medium">{item.description}</td>
                          <td className="px-4 py-3 text-muted-foreground text-center">{item.quantity}</td>
                          <td className="px-4 py-3 text-muted-foreground text-center">{item.uom || "PCS"}</td>
                          <td className="px-4 py-3 text-muted-foreground text-right">₹{Number(item.unit_price).toLocaleString()}</td>
                          <td className="px-4 py-3 text-foreground font-bold text-right">₹{Number(item.total).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-muted/50 font-black text-right">
                      <tr>
                        <td colSpan={5} className="px-4 py-2 text-muted-foreground uppercase tracking-widest text-[10px]">Gross Subtotal</td>
                        <td className="px-4 py-2 text-foreground tabular-nums">₹{Number(selectedQuote.subtotal).toLocaleString()}</td>
                      </tr>
                      {Number(selectedQuote.discount) > 0 && (
                        <tr className="text-rose-600">
                          <td colSpan={5} className="px-4 py-2 uppercase tracking-widest text-[10px]">Discount Applied</td>
                          <td className="px-4 py-2 tabular-nums">-₹{Number(selectedQuote.discount).toLocaleString()}</td>
                        </tr>
                      )}
                      <tr>
                        <td colSpan={5} className="px-4 py-2 text-muted-foreground uppercase tracking-widest text-[10px]">Taxable Value</td>
                        <td className="px-4 py-2 text-foreground tabular-nums">₹{Math.max(0, Number(selectedQuote.subtotal) - Number(selectedQuote.discount)).toLocaleString()}</td>
                      </tr>
                      {Number(selectedQuote.tax_amount) > 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-2 text-muted-foreground uppercase tracking-widest text-[10px]">GST (18%)</td>
                          <td className="px-4 py-2 text-foreground tabular-nums">₹{Number(selectedQuote.tax_amount).toLocaleString()}</td>
                        </tr>
                      )}
                      <tr className="border-t border-border/80 bg-emerald-500/5 text-base font-black">
                        <td colSpan={5} className="px-4 py-4 uppercase tracking-widest text-[10px] text-emerald-600 dark:text-emerald-400">Grand Total</td>
                        <td className="px-4 py-4 text-emerald-600 dark:text-emerald-400 text-xl tabular-nums">₹{Number(selectedQuote.total_amount).toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Terms & Notes</p>
                  {selectedQuote.notes ? (
                    <div className="text-xs text-muted-foreground prose prose-xs max-w-none [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:my-0.5" dangerouslySetInnerHTML={{ __html: selectedQuote.notes }} />
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Standard professional terms apply. This quotation is valid for 30 days from the date of issue.</p>
                  )}
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
          <div style={{ padding: '40px', fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', color: '#333', backgroundColor: '#fff', width: '100%', boxSizing: 'border-box', border: '1px solid #0f172a', position: 'relative' }}>
            {/* Header */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
              <tbody>
                <tr>
                  <td style={{ verticalAlign: 'top', width: '65%' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', letterSpacing: '-0.5px', textTransform: 'uppercase' }}>M/s Global Safety Solution</div>
                    <div style={{ fontSize: '10px', color: '#475569', marginTop: '5px', lineHeight: '1.4' }}>
                      Shop No. 51, 2nd Floor, AC Market, Gel Church Complex, Main Road, Ranchi-834001 (Jharkhand)<br/>
                      Phone: +91 6201186550 | Email: id-globalsafety56@gmail.com<br/>
                      <strong>GSTIN: 20BILPA8494E1ZE</strong> | ISO: 9001:2015
                    </div>
                  </td>
                  <td style={{ verticalAlign: 'top', textAlign: 'right', width: '35%' }}>
                    <img src="/logo.webp" alt="Logo" style={{ height: '60px', objectFit: 'contain', marginBottom: '5px', display: 'inline-block' }} />
                  </td>
                </tr>
              </tbody>
            </table>

            <hr style={{ border: 'none', borderTop: '2px solid #b8860b', marginBottom: '15px' }}/>

            {/* Quotation Title Banner */}
            <div style={{ backgroundColor: '#0f172a', color: '#ffffff', fontSize: '14px', fontWeight: 'bold', textAlign: 'center', padding: '6px 0', marginBottom: '25px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Quotation Proposal
            </div>

            {/* Metadata layout (two columns) */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px', fontSize: '11px' }}>
              <tbody>
                <tr>
                  <td style={{ verticalAlign: 'top', width: '50%', paddingRight: '20px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#0f172a', textTransform: 'uppercase', marginBottom: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '3px' }}>Quotation Details</div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', lineHeight: '1.6' }}>
                      <tbody>
                        <tr>
                          <td style={{ color: '#475569', width: '30%' }}><strong>Quote No:</strong></td>
                          <td style={{ color: '#0f172a', fontWeight: 'bold' }}>{selectedQuote.quote_number}</td>
                        </tr>
                        <tr>
                          <td style={{ color: '#475569' }}><strong>Date:</strong></td>
                          <td style={{ color: '#0f172a' }}>{new Date(selectedQuote.date).toLocaleDateString('en-IN')}</td>
                        </tr>
                        {selectedQuote.valid_until && (
                          <tr>
                            <td style={{ color: '#475569' }}><strong>Valid Upto:</strong></td>
                            <td style={{ color: '#0f172a' }}>{new Date(selectedQuote.valid_until).toLocaleDateString('en-IN')}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </td>
                  <td style={{ verticalAlign: 'top', width: '50%' }}>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#0f172a', textTransform: 'uppercase', marginBottom: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '3px' }}>Bill To (Client / Lead)</div>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#b8860b' }}>{selectedQuote.lead?.company_name || selectedQuote.client?.name}</div>
                    <div style={{ fontSize: '11px', color: '#334155', marginTop: '4px', lineHeight: '1.5' }}>
                      <strong>Attn:</strong> {selectedQuote.authorized_rep_name || selectedQuote.lead?.contact_person || 'Authorized Representative'}<br/>
                      <strong>Email:</strong> {selectedQuote.client?.email || selectedQuote.lead?.email || 'N/A'}<br/>
                      <strong>Phone:</strong> {selectedQuote.client?.phone || selectedQuote.lead?.phone || 'N/A'}<br/>
                      <strong>Address:</strong> {selectedQuote.billing_address || selectedQuote.client?.billing_address || 'N/A'}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Items Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '25px', fontSize: '11px', border: '1px solid #e2e8f0' }}>
              <thead>
                <tr style={{ backgroundColor: '#0f172a', color: '#fff' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'center', width: '8%', border: '1px solid #0f172a' }}>S.No</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', width: '47%', border: '1px solid #0f172a' }}>Description of Safety Audit / Service</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', width: '10%', border: '1px solid #0f172a' }}>Qty</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', width: '10%', border: '1px solid #0f172a' }}>UOM</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', width: '12%', border: '1px solid #0f172a' }}>Rate (INR)</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', width: '13%', border: '1px solid #0f172a' }}>Total (INR)</th>
                </tr>
              </thead>
              <tbody>
                {selectedQuote.items?.map((item: any, i: number) => (
                  <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                    <td style={{ padding: '8px 10px', textAlign: 'center', border: '1px solid #e2e8f0' }}>{i + 1}</td>
                    <td style={{ padding: '8px 10px', border: '1px solid #e2e8f0', wordBreak: 'break-word', whiteSpace: 'pre-line' }}>{item.description}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', border: '1px solid #e2e8f0' }}>{item.quantity}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', border: '1px solid #e2e8f0' }}>{item.uom || 'Nos'}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', border: '1px solid #e2e8f0' }}>{Number(item.unit_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', border: '1px solid #e2e8f0', fontWeight: 'bold' }}>{Number(item.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5} style={{ padding: '6px 10px', textAlign: 'right', border: '1px solid #e2e8f0', color: '#475569', fontWeight: 'bold' }}>Subtotal:</td>
                  <td style={{ padding: '6px 10px', textAlign: 'right', border: '1px solid #e2e8f0', fontWeight: 'bold', color: '#0f172a' }}>{Number(selectedQuote.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
                {Number(selectedQuote.discount) > 0 && (
                  <tr style={{ color: '#b91c1c' }}>
                    <td colSpan={5} style={{ padding: '6px 10px', textAlign: 'right', border: '1px solid #e2e8f0', fontWeight: 'bold' }}>Discount Applied:</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', border: '1px solid #e2e8f0', fontWeight: 'bold' }}>-{Number(selectedQuote.discount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                )}
                {Number(selectedQuote.cgst) > 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: '6px 10px', textAlign: 'right', border: '1px solid #e2e8f0', color: '#475569' }}>CGST:</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', border: '1px solid #e2e8f0' }}>{Number(selectedQuote.cgst).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                )}
                {Number(selectedQuote.sgst) > 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: '6px 10px', textAlign: 'right', border: '1px solid #e2e8f0', color: '#475569' }}>SGST:</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', border: '1px solid #e2e8f0' }}>{Number(selectedQuote.sgst).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                )}
                {Number(selectedQuote.igst) > 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: '6px 10px', textAlign: 'right', border: '1px solid #e2e8f0', color: '#475569' }}>IGST:</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', border: '1px solid #e2e8f0' }}>{Number(selectedQuote.igst).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                )}
                <tr style={{ backgroundColor: '#f8fafc', fontWeight: 'bold', fontSize: '12px', color: '#0f172a' }}>
                  <td colSpan={5} style={{ padding: '8px 10px', textAlign: 'right', border: '1px solid #cbd5e1', textTransform: 'uppercase', color: '#b8860b' }}>Grand Total:</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', border: '1px solid #cbd5e1', fontSize: '13px', color: '#0f172a' }}>INR {Number(selectedQuote.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
              </tfoot>
            </table>

            {/* Amount in Words */}
            <div style={{ fontSize: '11px', marginBottom: '25px', padding: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              <strong>Amount in Words:</strong> <span style={{ textTransform: 'capitalize', color: '#0f172a' }}>{numberToWords(Number(selectedQuote.total_amount))}</span>
            </div>

            {/* Notes & Signatures layout */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '30px', fontSize: '11px', pageBreakInside: 'avoid' }}>
              <tbody>
                <tr>
                  <td style={{ width: '55%', verticalAlign: 'top', paddingRight: '20px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#0f172a', marginBottom: '5px', borderBottom: '1px solid #e2e8f0', paddingBottom: '3px', textTransform: 'uppercase' }}>Terms & Conditions / Special Notes</div>
                    {selectedQuote.notes ? (
                      <div 
                        className="prose prose-xs max-w-none [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:my-0.5"
                        style={{ lineHeight: '1.5', color: '#334155' }} 
                        dangerouslySetInnerHTML={{ __html: selectedQuote.notes }} 
                      />
                    ) : (
                      <div style={{ lineHeight: '1.5', color: '#334155' }}>
                        <p style={{ margin: '3px 0' }}>1. This quotation is valid for 30 days from the date of issue.</p>
                        <p style={{ margin: '3px 0' }}>2. 50% advance payment required along with the work order. Balance within 15 days of service delivery.</p>
                        <p style={{ margin: '3px 0' }}>3. Standard statutory taxes (GST) are charged as applicable.</p>
                      </div>
                    )}
                    <div style={{ fontStyle: 'italic', fontSize: '9.5px', color: '#b8860b', marginTop: '15px' }}>Thank you for your business!</div>
                  </td>
                  <td style={{ width: '45%', textAlign: 'right', verticalAlign: 'top', position: 'relative' }}>
                    <div style={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '5px', textAlign: 'center', display: 'inline-block', width: '200px' }}>For M/s Global Safety Solution</div>
                    
                    <div style={{ height: '70px', margin: '5px 0', textAlign: 'center' }}>
                      <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAacAAAC4CAYAAABHGCNiAAAQAElEQVR4AeydBYAdRbb3f9Xd18ZnMpm4uxtJIAmB4BAkOCwOC+zCuu/3/K27AQsLi7s7wUMEiRB3dxnXq939/esm2cfuW3nvLbAEptPnVnd1dcmpU+d/zql7J07YfnwgHAiCIMxms38g3/fz10EQhB/IYav9c/RHjdkCyvAPkL21FNqPrD5TolZRs6gxDILWfJ9zOT/0/eAPlM3m8vl2fLlcLrTk+34YhrkD5Kusr/wgDHJBGL73Ue5AEZvafN3uL2DbFwWh3hFl91OodsMwFYZhmygpsteWMrq2lFWaO0B/qFD3H60zCALxM/jjTtnuHqBcxg9zmVyYTWfDZEtb2NbSqnuNLQjDQLwNlIbtRzsHPkEccGg/PjAOOI7DQZJMYYz5wNr6sxX/oblAjw+SD0bXlrDXIrJA5j1k73OEyg9D5Yc5MJZsWZ8gyOL7GYIwSxCoXOhrbCpHCmjTe5aSSkVG+fZd58D7JoQ/9IsDh/IIVJetz9ara2UF6magFNW0n5Txh+v8A71v04Ok24/oaYzBGPPHvdPqC8UPX/wLNBc2zZPlhcYZiNArdnR/+uofV9R+186Bjx8HtDw+foP6KIzIGPMHYLIA5bouloyRtuH9PqS+LNgYH/5AAgMOkvKl/MiT8kxa5Q5QHlCyepI7QKFSW9JINRo8L4LjOgIOqc9cjmwuo3tDJOLhuSLP0bhsWQscAiKBnCGN66Rw3SSO06q2WvaT0wx5yuqe9xzqv1XIQQY/TImSInu9H/j0ksq6B8hRepB0aU/1dD942XryGYfERyD0/VOyRswh0fn2TrZz4APmgF3lH3AT7dV/8BywSlkKX8BAnuz1e+kgONlyFkQEUHngstc2T2IQeIR+VBQTxUUFeSKMyHgXCDlRIm6MqBfHMxEc9uej9wg90H0Y6l1LxHQf1XsRQY4R+aKsKCNKidS+bfYgqTZU2jghRh6WcdMYt20/OXYcDnAQnA6myvqzZ/hncz+qmcYYjPkv+qj2s71f7Rz4sDlgV/2H3WZ7e+87B6xCPghAB1MLPLYhow9LB5W6BZK48hIHqDCfmqBATlchTq4A108QEch4eMqDXBrSbYbWJkNTnUM25ZDSfX0t1NWQz8+2RZRfoLJF+OkigmwxQa4EJywX9FSIyjGUEgYlIBDUjdo9cIZWDD15WRFcx4gCXDeH62Uwjh2H7bsH6g95kHJ0fZCMru1py4X24pAh50DY13Vdjd35Ax0yA2jv6PvJgfa6/oQDzp/ct98eAhywoaCcQmwH02zWhr8MYWgVtUsgZR+GrkYSIZRHEwQRclmHTEbTretMKkJrs5R9ziXTBunmgGRzSP2+gJo9AZvWJln41l5embmWWa9uZPZrW3jgnne4+YaZ/O6mF7jhly8pfZXbbnqeG37xmOhZ7r1jPo89sIpnHlnPS09vZeaTm3nztb28+2Y9S9+uZ83SJPW7o2osjuO7Ai7IZiA8gCm++hIKFA0FGAGjEQg5gjREYWDwcxD47D/y4zT7r/Of7wWl9+bnH35kP2wIz5LtoDEmD07G7E8tcBljOPic9qOdA58wDkhbfcJGfIgP1yor39+vpY0xBxSaK+AJyVkFn1fsCqspbWsJSLaEmEDTHLj4AoOG2iRb1tcyf94OZr2ynUcfWMRtN8/ijltnc8uNL/LTHz3Gv//LXfzkh49w469fEAi9xG23vMDdtz/PM0/OE83hvruf5/GHX2fm8/N56YUFvDxzIU89toAbf/Yyv/rpqwKv1/nJD57l5z+ayQ/+82n+818e53v/9iS33vgOr71Qy/IlTWxcV8um9Q1U707R0hQSZMEXgAa5qMYSFZjG8P046ZQhmQzywGRC8mk26xNYUMu7X8oUBOsJh9ph59IaGJYO9t0YI6/RxfM8jDF5cDLG0H60c+CTxgFprU/akA/t8VpFZsNAlqz3ZBWcVWQRL4HnxDHymiwFWYOf8Ui3hqxavpc3XlvHC08v4+YbX+LHP3iAH37vt9x0wwM8+/RcXn9tMS88P5fXXnuLFSvWs237DlpaW4nHYgfAz2HgwP4cffRUxk84jBHDR9C/f38GDxrE+MMOy+eNHTOayZOP4LBxY+jZvafeLaKmuoGtm3exd08D27bs5cUX3uLmm57lR99/gP/8j5v42U9/x29vfIKH75+n/q1lzfJ91OzOQDYmv6mAbDoq0HKJRx08F3wBkgUlO3Ynr7Ct0rYUAgdJl4fQaYzJg5Ax+9NDqOvtXW3nwAfKgXZw+kDZ+/5XnlfM2quwwJRKpfKWtdXLYc6QTUFTfUhTXY6GmgxzZq3mlt/O5Gc/eoSf//gB7r7zRebNXsHevXU0NzeRTicpKIzRobKE3n27MGXqKM45bxqXXTGd8y44mjPOOpzzLzyBK646has/cwKXXDZR10fzxa+exZe/djZf/PLpfO6Lp3LNtcdz2ZXjufiK4Vxw6VDOPG8Yp581hmnHDeWwI3pz+OQBDB/Vk+LSkJr6zezYuZnq6kY2b9rN3NmLefD+l+S1PcdPvv8wv/31izz1+FJWL6+ltTEgI88pnQqkwBHwCqCsh+WT95xC4VFIoOEfJGVw6Bw2dPenZIw5dAbQ3tN2DnyAHHA+wLrbq/4AOWB1WDwek2djqKlpoEGAtHVTK7NfX8/jj77Lbbe+xl23v8CTj85mxdIdNNSgfaUo3bv2Z+rUIzj7nOkCnpMFOMdzzWdO4QtfOotrrzuN8y+ayPmfmsgFl0zkrPPGcMwJfTj62B6Mm9yJfsNLGDaqgqEjyhk2sphBI4voOyhBr74x+gyOMmJCAeOPLObYUztx0VWj+MwXj+Zr3z6D6798vIBrCpdeNY1rrj+Oq649hTNOn8Ex005hzOjJlBV3p3pPhvUK9b3y0hIB1FP89IePc+tvX+XRh+Ywb+4Kdu9uUpgPolEU9kKAhAAq2E+hUpH1Ij9AlrdX/b5yoL2ydg78dQ60g9Nf58/7/9Qa9wcpr2K1009OHlCWIMwQaNffKtlQylZwovwWUVKU07OQUF5DvlNBhLbGKKuW1mvfaD633/Yad97+Io88OJPXXn6HhfNX0NDQQklZIWPHDeak6ZM465xpfPrak7j0smPlAZ3IGTMmcMSk/owc3Y1+/cro2DFKIuHkw2c11a1s2FDN6tV7ePvtLSx4cyeL3t7H7De28Masdbz77l6FCxt4a94W5s7boPsdzF+wnuUrtrFrV4O6GFDeIULnrgX07l8g76krp505hgsvmsL5F0zlwguncOmlx3DZZSdw8cXTOemUqYwaPZCu3TqQzbWwYuUSnnnmOe684zF+/fNH+cWPn+Leu+bw5pwt1AjI7M+6XMfFMR72yx8GR9z0da2woPgJ+/lJ/try2DLuIOMDUGl9fOROYwzG7KePXOfaO9TOgQ+RA86H2FZ7U5YDVj9a3Wiv8woyq88kftgqpdxGECpupXhVaEGKZgWtakVKgyy+HmWS0LAHlrzVyh03reTX31/Aq8/UsnjBbrZtqaWwsAM9evRkwICeCtEdzde/dS5f/faZfPq6KZynkNuw0aVUdXKoqDDksiFbNrexdHE1s2dt4eWZawR0y7nxl8/xL9+6jX/+xu/56fee4uc/eIFf/uhVfvOTV/nxfz7Dzb+axS2/nsudt7yjsi/xH/90Lz/4t8f4/j8/w4/+/Xl+9r0X+cl3X+DWG+dy351v8fhDS3jlxTXaV9rAujX1NDRkSRRCt94uQ4YnmD6jG9defzhf+ebpfOkbM7jmcydy5vnjGXt4Vzp06MyercW8/vwunnhgJb+7cRa3/fY11beODWtqaW0CJ4yDKJfNkPMbyWTr8IMWgiCp/LQ4nTlAYqBAi/zPjO0khMr/aJ02zBeJRPJfiHAPfMXcGPPR6mR7b9o58CFw4FAApw+BDR9yE3/QNfuVowUi24OoV4DnxDDyAgyewKMAx3TEpRLXSWACw7KlO7nl5ue58YYHePTRR1mybAGRqK99ozhDh/fhlFMncdHFx3LZFSdy/oVHctzxw+g/oJTKDgli0Qh7drUxa9ZmHn5wMTf8+jl+9IM7+MH3buV7372Z7/zHb/n5z37PU0++yvKlm9iyeTc7d+5WP6zXAa2tbTQ1NWOPxsZGamvrdGm0f9XMurWb2bxxN6tWbGX+Wyt45aW3ePLxVxVafJyf/fgOfvnz+7jj9sf57U2P8bOfPKj9r1k89/RqliyppaEhQzQW0qNnIRPGd+Oss47lmqsv4qtfuV50DWeccTw9e3XBAvfOHbt4/bW3+MVP7uQ//vUW7r79ZdatbCSX8oi6pRhTSDIVksu5uE6c0HjqoyOyTLf8PkjKaj/bOdDOgY8sB+yq/ch27mPZMasj/2hgjhRqHFdK1RAlmzEiFRAQeWERmZYCVi5u5rWZG3n8kfncdefDPPTIHby7bCaxon2MGF/ISTP6c90XTuXSK49l2nF9GDSkSIq+NO9pbVzbxtuz9/HC09u45YZ3+M6/3ccvf3Y/v7vlEZ544jkWLHiX7dt3kUwmcVwjr6qCCRPGcuLJx3Dq6dO49KoT5XUdz6VXTuWiy6fw2S+erPtj89dny7v51CVH8dnPn82V15ymfarjOW3GZKZOG8nwUb3p3qNS/ehKUVExjsZmwhh7djYqNLeYRx55hd/86gH+9Z9v5BtfvY1/+tZ93P67ubz4/Ba2b2nDCyNUVZQyfkIVn75+FP/ynbP4sryq086YQt++XWlpbmXxonU8/vBs7rrtdR57YD1vvLqd7ZvSxL0qPFNMKukIWCNipjaqsKku5Yfu95wsSNn7dmrnQDsHPooccD6KnfrY98ly3dhR2o+IwCmm8FMk/xseT88cZaeToRRtRqC0kztvmynP405uuOFOeRrL6NylI4dPGcl5nzpGoHQmZ507nr4DCqnqaMikc9r32ctzzy7h1t+9Iu/oWX7z6ye5644XeO2lxaxeuZ26+gZ5UR4DB/Zj6tTDOUX7PZddfi7f+OZn+fY/XcWXvzqDq689jsuvOo6LLjuCU04fxLQTe3OS0nMvHMOJ0/tx8ukDOWF6f449cSAXXjyJa647luu/cILoZD7/5el8+WtnKD2Dr3z9PL74xUu54FOnM2XKeAYP6cegQf3p17eP9rdi1NfXs2LFWua/s5THHn2Bm296SKD1tED4Hea+sV2eWwPRRJIhIxJMPboHn7r4SK773JnaL5vOkVOOpaK8O+8uWMcNv7qPH/zn7fzm54/x7OPvsmf7foBzQzE0EAkewQUMYIEpUGqvlXwYZ3sb7Rxo58D/igN21f6vXmgv/HdywP6SNG+9S0FaxWlJXlL+iw7Sl0GOvOfw4nOr5N08x69+fTtz575FQ0MrXbt059hjTuDyyy/ii1+4hosuOoOxo/sq1JbSflM9b721lXvueU3K/QGF/u5n5szX2LhpgwCgGtfN0atXJ46cOp7zLjhFYHI2X/vmJXztW5/i8186nQsumsRJpw5i0pHdHHunjwAAEABJREFU6Du4hB59Cundr4h4QUjgpNXjFnCbCEwT2dBepwjdLE4khxcPcaNZCkszVHQO6NYnwaDhVYwY243xk7oJzAZy9rmjOOf8CXzmuhP5xrcvEvidwfWfP59rP3sep884hkmTR1NWXkBLaz3Lly/mgQce48cKB/7oh/cIXB/h4YffZMP6GkpLDUOHVnHxpcdw1VXTOe/8aRx9zATtoRWzbeteXnhO+2C/eZTf/fYF5s3eRn1tsB+L7F+VCD3AkgUpR9eaA322n+0caOfAR48DdoV+9Hr1Me5RYH9FKkUZ+EYhJwWYcpDLgP3rDXXVKV58fhm33Pwwv7vtLl586Sl27l5FSbnL8Sccyec+fzGf+cw5nHHqZHp07cymDS28/OIa7r3zNX76/cf59c+f4LGHX9P+z3Y6duzE8OGDGDGqD0cdO5IZ507ksmuO4nNfPYVLrpjGCaeMYsyETvTqV0h5xziFZchDCQQ4IHWOukeOND4pXC+HF/O1t5XF8VJ4kRRGgBWGae0VOThy9YwbgtuCG2nSMwterbpOExgfJxbgJUJKKz06dknQf3Apo8dXcszx/QWKR3DVNafw2S+cqfR0AeQERo/rRZ9+pXixFtasWcsTj84S2Dwsr+pJgdQCli3bQ0HCaGwVArahXPHpaVz/pbM486xTxJeB1NWk5TnO5qc/uY2773qe1StraGny81KVSRv8rIf9hl+oLof6sH9xw1K+QPtHOwfaOfCXOPCh5reD04fKbggUYkpLQWa0aW+Zb6m5Mcvc2Wv45S8e4Ne/uYPnn3+JDRvXES3IctyJE+RdXMgllx6r/ZeelJdHqKvzBUrruPW3z/C7m57jxecWsXjhJtJJj+FDDuPU6adx7nmncNGlJ3PZlSdyxdUncOb5Yxl7eAXdeocCoiSReIZckKYt3SQQShKaDKGTA8cXuPh4nk9o//ngOp6CYQ7pTBqckKyfxTEejhMFC7R6zZVHYkEqDHVDlkDAZgHM5P97jkwe5Dx5V3hZ8AIcT7Vb0Ev4VHWL0GdAEcefMlx9PZmvfONCvv2vl3Ht9Wdy7PFH0rvXMFJtHnPnLOaeu57kvvtm8uBDs5kzdy279tRTWOJzjPbaPnP9SXz+i+dx8knHKcTZic2btgmsn+O7/3kTjz74Ovt2t+IZFz9nROEfZt5xLMA6f7hvv2jnQDsH/vEcaF+RH+IcyEjf7yVJPzvGECjds9Pn2WcW8d3v3MTjjz2vPZZdlJUVc9xxR3HllZdw8cVny2saR4fKEvbsyfD229u5846XpKCfzu/TbN9eTWFhOSefejwXX3IqV119IpdePpVTpg9h3GFd6DewQt5KhFiBACKsJ52tAwGGK2BwBRLRqIv96rIrAAoFnIQuRnszRkrchHEIEmTTEQwJAVKB0kJcp5hk0mX3zlZ2bkvRXI+8EYd0qpBspgSQ1+OU4DgFKh/BSMqiUUMo0HLcLH7QRirTQs5PkUq3gkDROL48rRyVnaL07FPM4GFVHHvCaC65/BSuv/5ihfAu5aijp2ifKsrKlct5/vmZ3HnnfQLzO3n8idfYs7eBnj0inHRKL66zP/S9+jwmTzmChoYm3npzEb+98T5+88vHWPTOTnwZB57rYAzYv7RhyXpQB1MNoP1s50A7B/7BHHD+we1/opqXLsTzDAVxsH+Ude6cbdzw60flDTxBTU0zXbv1ZOzYMZx2xol86UuXcvFFJzFiSE/27Ezy8INvKUx1JzfdeDfPPPscmzatpku3cs7X/tG//+flfOGrRzPj3N6MnlhMl54OsSIwUXA9kGMgYIGIFyUWLRC4qANhlNCP4WeiNNX7NNb67NuVY/PaNrasa2PN0mZefWEt9931Cg8/8Do7tjYSj5bhhkV5eufNNfz8x3fyg+/czQ2/fJm7b1vG0w9t4PknNjP3lT0snFfDO3N38Nory1nw9nqNV56SH8WoXdeJqi8J9aWIWKwQg0MQhOqnAUFYTjHOQCHDohKPfgOKOebEzlx5zRi++o1ztD92mUJ5J9Grd19aWn1mv7GUu25/lp/84GEee3wZW7Y20UEAd/L0AXzpKxfyuS98hnFjDycM4jz/zDx+9XPx+875bFrXSODvb9OCUhAEWIBSB9rPdg60c+AjwAHnI9CHT1QXwhxsXN/M44/O4/bbH+W5517R3tF2evbozZkzTuUrX7maa645g06dy9m1LccrM+u46Tcvcav2oRa8vZxkW5IxY4bwhS9dzrf/+QquunaKwnWllFS2EMbryISN8k9aCeQdGTdHaHLyVEKFsaL4foEAqRCkqEPfY+O6ah596HV+f8uz/PaGZ7nhF0/y6589wXf+9UH+5Zt38d1/vwP7de8H73uRbZtrBWTgq//ZDOzdmZIXspmZz87nofte47e/fp7v/9tjfO+fH+MH//EY3//3B/nOv9zBT39wL48/PIe9u9sIcp7m2sPPRtmxpZ7lSzbS3KDK5LE5eATqk/XcYrE48XgB1rPJBmmIZHETOaq6ehx9bO98iPOqK8/j2KNOpGPpQGp2R3jp2RXcest9/PzXv+T5F2fT1NLGgIElnHPuZL74xSs5++wL8t/sm//Wau6+4xluueV+3np7vjy9LLFYTEaDRyQSUZsWIGk/2jnQzoF/MAecf3D7H4/mQ2R1W9KFdlcgo/u0vIGsUuUHGqYo2QJLF7Vw/90Luf13T7NowVK6dunEWeeczFe/fiUXX3wU/fp1oLE+4IVnV3Lzja/w+COvy8rfSiKeYMCg3pxy2tFc/8ULOP/iKYyZ2JWSDoacgMiJNEu5toiy2K+jh4GrsKFLus2lpdEnnfaxoUT5L3mAUY9Yv66BB++dzb13vsxjD73GG68vYNnSFSxetFDPVikE2UpFWRH9+/WisqIkPxZjQiJRGD12MOdfeCZnn3caJ55ypEKIYymMd1II0KOosJiSskIpep/Wtjay2YCIwmjRCFjVv29Pq0KTL/P9797B66+8S2uT+JT3nAKBaSC+WTL4Aq1Q7YUaHwJZJxLgeCFFxQ7DR5Zz7gVH8K1//ixfFqBPOGIk6XSOeXOWctstj3HLb5/ntZe3Ck0Nh08Uj888gvPOPZ3howdS37iHRx54kfvveJN35++V55gTMNo27ZwJ2BV2DAXxEOZPm/xZ4r2HJhhLeue92e3XhzAH2rv+j+SA849s/GPRtnSRnwulyJFS1U1eqaWky0T2e+FhiLZWqN0ZMPPJHdzw0zd4+J63tV+TonOnblKwJ3Pd58/K/4bHF7AtmL9NYarZ3HnbS8x+bZYU5xYGDajgnPOmcs1nz+C8i6YyYGgFJp4liGRoSDeT9JNqLyLQKZQyLiObLCTZ4LJvW5ZXnl+v0NwLzJv3tvZ56gidJoFZgLpMYVElBYnBRN0eamM0Z511IueefwRXf+YoPnPdkXz2c8fxpS+doz2cM+jRuxyj/aLQpDBOht7ySi6+ehpf+NYZfOVfT+HSa6bQu38ZkUQ9Z104hq//03Q+++Xj+cznT+WMs46ipLQIJG25wCcjD2mr+jZ//hZeeelNGmobEDrgmAxOmML3c+T8QH10cdy4xMSSi+ua/erfDTACyMpuHpOnlfOpTw/iG/92AjPOOoH+PY5h345CHrt/ocKOz4iP78pDzNK9R1RAOowrrj6aE04ZQY+uo1n4RshPvzOTu259Q2BcTaC5Ck1S/Wsgm2sVqGbygGfnVwzmL1L+QaB++iIrA0raz3YOtHPg7+KA83e93f5yngPZnC/1FOI6RveulFxMujZBqPBZkDUK28lDefgN7rzzAZYsn0sqt1eWfx+Fp87ilFPGUdmxkMWLd3Lr715QaOppnntmLrX7mhXaK2bKkcO46prpXHzZ0Yw/vA/lFVEcRcdCqelsLiegcNVmDPwy/HQJDdo7WrlsH48+/Ba/vfEZbrn5Xu6660HmzJpPKmlwnJjeD1AUjarORfTu000hNI/xE4dw+RUncMVVp/Lp687hqmvP5aKLT+WUU49kQP/u8twihKEvpZ3CD7NEY0H+7+OVynMr7wiReE7jTlNUGqFXnzKGj+rKtGMncNrp05g4cTDFJREBDjoCioqiGnMnXBOnprpZAJyRR2UH5ZJLGXl8Dtbza6hPsXnzPnbt2kcqldG7BgtQmBBLjhsSOlkiMZ/Bw7tw4UVHcdU1p3P0tMPp2bsz1dU7efjhJ7ntthcVPl2rvoccd+xoPvvZi7n8ynMYN2EQe/ft4cH7n5MX9ToL5u4l2VRKhMp838JQbTpt4rGv9kCd/C/izx12/v9cfnteOwfaOfC/5YDzv32hvfyfcMCEUtQQiUpRSnv5fgQTxHCCKPb/Itq8sZlnn53Dgw8+yO7qVfQfkuDCSyfx2c+fJsU9hmgkzhuvreI3v3hQobVXZMFvo7CgiBNOnMRXvnkh5118JAOHV1BaFtfeiIvjSDHLwo9EYsS8hMJlCbZvbWLZomrmvLKNu2+fxS9+fh/33vskL778IrV1O7Sf1ZOqqh5EnWL1La46sjjqt7Z18GJJgVWSyiqPio4QL3Q0Fhcv4mG/dk0O7RGhw+DgEY3GpayNvIhQKWibJk/ZbI50Jonnuapf4BKC4zokEupjNIIcIdUT4gjACwoM3buXE1Oosra6ieq9zdi9ODKR/HhcE2XFsr3cdcdMfvLj3/LYo4+xb99e7BFq7AfJcWw7IZlMFqN/JeVRpkzrwZe+eZJCn2dw5LRhxAqSzJr9Evfd+xQPPfAWK5fVK0RZwWkzhnPp1ZOUTiYRL+f1l9Zz5y0LeOqhbaxdkSXVGsdVfNTx1DenjdAEf0IaoFGPLKltcHVjyVHafrZzoJ0Dfy8H2lfS38tBvR8oFGVMFhv+kQ7DKvSWxpBZr6zlpz++kwceeITde7bQuWshZ553JPYvMkw8oh/bdzZy331v8Ptbn+Rlhbeam7WJP6CHwk9Tufq6o6Vc+9K5TyEmFkoxpkFhr9D48lB8gQNS+IaGuhRPPPw6P/rOI/zip4/LY3qF1avXEFXYb/RhvbngklP4+jev49RTTyAmkAiEEmGYBIUf7Q9n7de6c35anl6ETErZgUjVqxlMBIEJuJISJ2LIyUPMCgj8nEKKofqhEF0okFOV2D+JVFtbLTUd4kWskkZ1qozARDXiKstVfaE8Pk9p5y4dKCsrk0cUUF/XSpBRKQFhGBh2bmvlMXma9979DPPfXqwyKXlbxRhjsMDk+z6W9Ab2SwzRaFT9dAS0IYVlOXr09TjmpD5cec1xnHnONDp1KWH7ji3ce8/j/PLnD+V/IxaJweGTK8TrIzn22BOIuB1Y9M42HrxnroyEBSxfuo9cJorrREHhVvuD4zyRUh80F9pXxE40AimVIDTkyV63UzsH2jnwd3NAaufvruMTXkEopWlZYHCkPC1DG2rh+Wc28KufP8i82YvJZnz69e/N2eeewrSjD6O4KM6cN1Yp7PYId/3+UVav3EDfvn0557yT5VHN4AXTZaAAABAASURBVKLLx9GjX5TQyYD2QHCSGC8j3SfFKC2eUzgvkwmkDPVYbe7YXsv6tXvYumUf5aXlnH/BaXz565fx1W9cqjanMnZ8T7p1K5OHIXWasx5AKNUaSOHH6FjZUfsqDju3N1NXrSoFEMkm2L09y65NSd6at5nXX13N7i0NeF6USDSq8ToCg1CN+xh5coEum5obaGisz3sbBQWe8pGX5Qo8HBxXRY3qDgMBaw45PJSWJigpKVadCYFigJ9SJTp3bMzw3JNLeGPWAj2v5NzzLuS0006noqIiD0jGGL3v5MkCVCaTIbAdIBRYN4JTS+A048ZSDB1ZxUWXHKtw5dlMnTqJ4uISVixfz6OPvMZTTyxSuLWRXj3jamMc511wDBOOGIIfNjNn9lxefUn7gtt9wkxHeXXFqj0QKOWUZkVpQvslDQG8OAqo4/o85M/2AbRz4CPEAatLP0LdOTS6Yq13S7a3VjE6JiYFKYUsHdVQBy+8sIb773mWbVurKSyq4IQTpvPtb3+DM2ccT2GimGeeXMvvfvsMs19flP+7eEOGDuJf//06AcqZHDapEwXlzQTuPoi0gVyYIMgK4JJSjj6BPJZQ3oj1ZgwIAKL06dMXWy4Wczn1jGO57IrpHHvCKAYOqaSqc5Rc2CZwUxFXZFwcCkDhx5hnKC/upOsS9WU5P/3h4/zmZ69z0y9f5j/+6Xa+/IVf88Pv/5bv/OcPeeLxF0gm04QCAqOGQylkx7EXhkw6K++nhlDgY/elvEhc/QxAXpIqV6pTRV3X4B3oeOeulYw9bCRtrW1s3FStuqFmt88jD83jySdnUtWxI9dc8ymuumoGQ4cMyoORMUbAaAR4kfy9BScL1EEQEKhflgcINBx5N0bkRX2qusU57sTRfPlrZ/H1b1zJqNEj2bRxCzff8Dhf/vxvufXm2RQUhVxxzWCuum4s3fpkqKnfwGuvzuUn33uEl57ehp/2xLM4GO27ybPDHpoH3us55fP0IRnQZ/vZzoF2DvydHHD+zvc/Ua+HAgWrDI3ZryRDKWOktsLAo60FWpuR1b1GextPsGHDerp06cxFnzqXiy86jQnj+tHW7HDvnQu55cZntU9UD6HH8JGDuf4LF3DMCX2o6BQQK2iRAq/HOI2kW5PkUo5aSMhjKZJijgoAHKVGZQzoLEi4jBs/lGEj+2PcJC1t9URivvZ/2rTfVIPjqhn1M6dQXCRC/t73PRw9kBMkD6aMWKScHdvreP21RTz91Fxmz1rE2jU72LF1D/X1NVRWlgpkEwIAH2MMjqtKMeqLAd1jQuyXM+KJGLFYRBRDTzAOOvZra6MMR+CkBMcN6Nk7xmHje2svrZjmxhQb1tXx2xue4+mnn8P+xuuzn7uQ6aePokOl6lI9xhgcRxfY8YTs95iCfFuu+mOfxSKFuE4RucAheyD0F2rOSisMPXoXcPik3vJOj2Hq0RNwTTEb1zbx4AMvc/e9z9PQ1sag4WV89ouncekVp2KMYeE7m3j+yc0K99XR0hSS30skgdHem6pVT+wZ6sOSkvaznQPtHHjfOLB/tf+vq/vkvmCVoB29BamM9l9y2ochZwjSDq++vIrbf/8ga9eupLyiQOGooznzzHEMG1pMbW2GRx6cr3DS6+zZvY/SkkJmnHUcX/36eUw5qhcmksPu/YTkFFoyOFKesWgHHOvlBAIlvwDHJKR8Y7iuB1KevjwGNwKDh3Rl4sQRDBzci7q6OnbuaCBi4hQXVNHSGGX9mr3MenUhL74wT89qBTIgvBLAoXBZYR4gSkoKBBbDueCCU7jo0tO57Mpz+PS15/O5z18ur+OzHHfCFHlpnt4NcPQvDF1dgwHdgW+/my5PKRaPqFxE+QFBaENgoUocPO21zQ9RhFDtqiYnYPWq1dx886M8+9wLDNIYLr/qDCYf1ZOScr1nRH/mtPMQFboaYwi09xWIF74fE4CU4Jkyom6x3nLJZMXPIEQJiSI47sReXH3tiVxy2dkMGDAA38/y5puzuPfeBwTE9YwcNUBhvulcd90V9O7dg7lz58q7eoy35qwjkzRkUqK0wTFR0CiRB0n70c6Bdg687xxoB6f/BUuNMXnr3SpCa5Fbiz0a8aitDnnp+TXcd++zbNu2gxGjBnHBRSdrv2cikahA67WdCuO9jt3g37BxLb36lnLOhUcqlHQMhx3eFSeaIZWR6yXdHeSKCP2OJJsq2LahjW3rm8i2hvvVYKDpCj3t03jY9nMK96VzGSn5CCNH9xPQdJRHVsOqpXUKkbls3xTyxENL+P3NL6j9p7j5xsdYv24PrhMShDmBIPKIHAGpQ2FpjsMm9uGci8Yy47yhnH3+KC68bCJnXXAkEycPoVuPSqJxtS3vB3uEBhM6qCqFHAMa6ltoa0uiTIw8qSD084rfhvlsHgYd+0N9jgApFoOy8jjl5YXU1u/NA/rR0yZx1dXnyLPpRzwRyANqBcd++SDkTw/Le5uXzWZtIp64GN8l2exRr72zutqcgAQirgXyEMeFnMYcTYQMHl7ESaf24zQZDuPGD6K2pomH7n+JO3//vLypRqoqE0ybNljPJzJ0dDkrV67kuafms3jBbtJJh0jEepGqEIf2o50D7Rz4YDjQvrr+l3wNZKFbingRKd+AXTureeH5pdzw68dYuXwTkycfwWWXn62N+KkUyFJ/YeYifnfLozz68IskBTKDh/Tk5NPGcN7Fh9Ozb4zW9F6M2yzlmcVo7yrMFeAnC3hr9i5u/NXz3HLjc7w1Z6vAxs8rW+vxBL61132F45SGUt5uViHERP75lo21Aspl3HrTAn7xw5d54O43mT93N7V7HSpK+1JS2EHtpAiNJYgW+LixRlqT22hObhdgteFGAgpKA+KlBscYfPslCjVqBCoclBijC5Ee09riU72vgXQqiesiz8nFOEaemYdjDHAQXGy6n6wnE8ijyQUpckGGUSOHcuWVpzJmXBeBdSDwbMVxmvWmAEqfquSPzlBxtf1EHphaWtpYOH8rjz28hJsVHrxFQPzcs7NZv2GLxhtiPJ9ILCSZSco3zdCtl8N5F41UCO9Ejph4NJWlI3j1+S3coT2oVcuaiAo8zzhnGOdfOobuvTpobndw1x3PMG/OKpItgYwDF7DkKG0/2znQzoH3mwPtK+svcTSUSrUgoBSpM7TBDlJsflJKOIufgbUr6rjn9jk88dgL7Ni1gY5VFRw9dTLHTBtKPOLm958eefhZha1WyPPowOkzpvLFr57PBRcfTUWHCDg5ioriUuguhhhBzkHOEEnp43feWs9b81YyZ84ybr/tWSndOeze0Uouow4HSC0aXIFF1PWJKi0s8hgwqFv+t0Pz5r3LM0+9Ki9pM926VXL8iRO58OITuOozpzJwaCXGOETwiKoLRUWOvJSQ5tZaauqqsf8dhh5h4hq1QMnI8XAjBjUGei+TySj8mMU1QZ7kJOELaVpbG0hnW0gkNB5HRXHxrNdCBkiKBKKIoRg5Ui4WUxsU6mxqaqZDxyJOPWcqfYaWEykW31Uu56dVg1FXXL37p2eoDFsX2D9m21wHb72xS57pTO668wEeevBJnnpiFvfd+TJ33voK78zbTu2+rMYbIaJx4SQx0QbiZY2MHFclL/EYhgwdLHAPeO3Vd7j1d8/w7LOL87w48qgRnDB9LF60hdlvvMVdt73E6y9uwU9HkJ2isGGjoLMFP0jj+7ZfgfqW+ROyfbX5ym4/2znQzoH/EQec/1GpT2Ihq0ukUxSdkvLJajellSBskQJKyxuIsHJpPQ/fs4yXn9nGli3b6FDlcM65JzP1qMEKy8Hrr+zh0YfeZv3abZRp/+mk6Ydx+TXTOOaEQVR0TOBGHCKRGK5bSBjIxQoKVK9RHnqGvC5DrCAhS99h6YpNPPTwTJ59+m22b6vDE1i4xsNVaC3m6B15BWWVEUaN7SlFnyCXS2J/E3XS9PF85vPT+eyXj+aya8Yw6egSysozCsUl8II4jsZXGItSWlImgIlRsy9HKuXi2B+fqn85he3kMOFrT62uNtDzNrLZkCDIkfPb1O+MgAYiAtmIl9JYMiQKC0ilc4AjxS2+hWldqz95gAp0HcXkXEgFbN1QTUNDE117lTHssK5E7R5TJNT4ELgX4WnfzSGhdwyaBLCvh7rVRYjqtv3QXt+CN/fx0J0reOfNtUQTSQYM7M3QQRPIJTvx+gtbufmXAqjZO7VnBFEviid+BaaObLiXSLxZYcvuTD9jLKMO6wVOM2/MnsU9dz/B7FfXkmlNMP20iRx1fF8qKspZs7yJxx5YwdKFzWRTEYzJEYSN6lQKLFKrX9CGBiiyY88qteQrtQNQYsdgSZftZzsH/j4OfHzfdj6+Q/s7R2bAuEgnhqRSPpmMi+/HlBGntTnH44+9yjNPv8CevbupKKvkkksu4pyzJ8n6RiCykXvve5Y1a1fQs1clZ517AmedN4W+A+K4EVVxUDEZo/p1n9dZBsdVo5qRWBztW/WjY6cO1NTWMGXKkfKAesojeJwH7p/J6mU12vsIcJw4QZAgJ48rFnMZNLgzVVUlUpg+iYIYI0ZWMXFSRzp1KSaqOu3vpjK5VhwjUHFDjQf80Mh7K6G0uBO7t7fxxss7Wb20lRUL63n0gaXcessCbr5pFj/64W3867/8mFdefhPLi9CPCoRdHPEolczlQSsajZCIJcB+3Tok36/A14DzAKN8m4b2Pdi6uZUF81fQlmyma49OFBarg9gjACl5YwxGvhN5DgnsDH84jDG4lpF63toayMNcoXDbEooKirno4nP47ne/xD//85VcffVF9OnTn0ULlzFz5mz27c0IUB1yvqO6CwTSxQQah/1vTCZP6csXvng+J598LPFEIdu27OPWm59m7qwNdO5YyWWXXqRw7QXan0uwcNE73HX708x/e5t42VF1FKuXUVwPhLzsP8QA5e6/tp23tP+u/fMjxgGJnJx1iZqdM8maoiS+QiO5bCADRBGS5S0ycraxZ3sO2UPk91EPGiD5OLvGY+uwr+uy/Xx/OOC8P9V8/GoJJHT2rx9gFaFiXFGnhIhbQt3egIcfmM3SpcvxYhnKKlzOPvs0Lv7UNIX74L773+Tue+5nydLZ9Olbzme/cD6XXH4cvexfevDeK7322kp0QKDQl5H3gWbDkbKPRmHwkG506dpBwBFn3LgRfObaCxk9egwvvzSbX/7i97w1dw2tTT6OlL2nvSqkCKuqogLDjhQUejQ111AvryTwIfBD/Jyn6ovw3BiYNozTilwvSspdRowYSOdO3dm6pU57Y7O54eez+NVPXldI7AXuv+9JHlSYzIa0Vi5fz6YNu+RlOUS8BAZpY9XvZx3i0QQVHcoYOKg3NsSIQC8RL5GXUgRY4FG7FrQC3ercsm0n69avF4hG6dW7B/F4VLl/7lQD4g9We5j9z8PA0Xgcte9qTFBXXycDoo1+/Xppz284g4eViQ8Rpkyt4tjjx5NIeGzYsFbgVCswdwixqETWAAAQAElEQVSDhPhWQcSphDAusAXLd/tfbHzqkuO54IKz6Na1LxvX1fDKi+uY83I9pYWFTD91NCefPk5gGmOBAOp2hf9WLGpSiLRMdUYE0G3YfTAEmv9Fjjpt3kMHLpW0nx8hDuSnaL+s2ciAr4VjJK87t7WxcW0927bW4WckvFq2Bn3kSfcfoSF83LpiV87HbUzvw3jCPGCEJisFiBSxFLtCXDU7Q2Y+u0z7PzPZtGkLVZ2KOeucYzjxpJFSkobXX1vDSy+/yMYtq+jYuZDJRw1n6tFDqOoaIxu0EYRp9c0KtpJ8zXZFhNhvr7me2gxzqCLUFJUdo/Qf0ENAk2DxkqX5v0V39afPZdLhR0lp7uKB+55nwdtbySmaZL/eHKraSMxj5KghjBo9VIqylTVrtrFX3oLnuRpDgaouVMNRLSs7rjTGzVFS7OidnvQb0EteQYmUfkB1dQOtLTk6VXWjS7cq9aMX06ZN5cILL+CIIyZiAc5alYEfSLkjPpRpX+tIzj3/FAHCcAEOZHPhAUVtVMYVqWl76tbum23fsYvWtgY6diynS+dKIgoj2sf7SYXy/LF3VmGkdZEV6dQ4EfARuoRSHjbMaAHB7vk0tzbR0pYh2abAWhKKilGIr5NgLUl1zW727KnBVzURL0YQROWgRfCESl4kFC/AiUK/gQlOO30CJ554DAMHDGXZ4k3cf89c5r5RrbmIMv30sUw7fiRxhUOXL97Ls48JsNdkSbcZdQ5MPvEgD1AHU40fozxLSuz5nkt7207/QA44attIlvMh2SzG+DjGIadw9sYN9axevYe21gyOa/AljkGo8n84/+jmD7ntF38/B+y0/P21fOxqCCWIvoQ0JwGVkvXJf0nhzbk7ue/uF9mzu1lKtZMs6WM5+9wjKC+L89oru3jssZns3LVFCrEHV376LGacfRQlZVEBRQovEuA4qosQe2IRCMt+o3YMjgnxhTQhOazVZqNW3QQM0bjHihUr2bptNwMHlnL1Vadz+mkzqKlu46EHZjLrtS2kpIyxi0s0blxfjp42UeBYzspVy1m2bK3GwH7vSeMIfBcjbwspzzAMMNKfHaoiTDpyIGcr9Hj2+RM476IxnHPhaC69air//G+X80//chXXfvZTXHzpGYyfMIKY+qRKwAG7UEtKI5xw0ng+denx9BnQwY4AR8CHSRMEaVAYUSWVAgbaUlm2bN6hfrWKj2WUlZWoPAeO8ECqgrawoAVUh8yF/JP8B3piROhw6Nylkg6VhfKO1vPO28tIpwNKy8nXacOYdq8wkXDz945DvutiNxZIQidUfgYiLep3Mzl5lT37xRSGHcsJJx9GNGZYMH+VjIE3WLZ0F/0HVnDUtFEMHz6UmFvJqzPXcsetC9i1LY3rRDReB+RLhWGEUABKns/KwtiPdvoIciBQn/z89NirrO6yhPKccpK5QKHqFhlBvQdXUF7l4sqAQcaR72vhaJ6xi0BvtJ/vPwec97/Kj0ONRiLngpRLGIRkUrBtc5pnn5nNju3VUkIJph55JGfMmEpVVaFCfDU8+MCLbN++lZ49O3Pq6UdzyumT6dGzA66VYYPqi0hxudqnIa+mXGlGY8NiaiOX89EtnqfpEMAY+00FA8UlBfJsCmlpaWb5sm0CL3kpaq9bt25EvAKWLVnN7255gHcXbsoDlDGG0jJDly5ldOhQqnBXNRs2rqO1Nal+OHiOWsyvrmL1JQGBKyAEu0103IlDuOLao/jUFWM58/yhnHbOQI45sRdDhpUKcErkQcXlOdiAho9eJBJxiUYdu3yxCt4CVMfOcdXlY5y01q9cF4GKHyQJ7B+atUAVptReGuMF9O5TxZChA5h27JH07tcVx0WHVQ4WfSzpFjEB8V+ulqYBbQOQFY7s3tHCimVbqa1tlpdmOP74cUycNIy6hn28+MIbvDl3lbyngIz0TBBmtHdXQJ/+XRU+7IQFJ/vTKFuzrT7Ucz9oEWA14boiT+FOr41uPQ1nnjeIs86fSFWnUlatWM0LL7zGlq27FT7splDuCXTv0YOmhgxzZr3LSzPf0fzXEwQevgwAX9ouUPgxlBGy/1t8djzt9Hdz4AOowEpbKGEI83WHugokw4acQKhOa6dB1l/XnkVEYoFKBBjjYPLAFAEjSXJACxwM7cf7yAHL1vexuo9LVUZKJiJF6BDzHHbvauWhh16RBb2QkpJS7dGM1N7GKCrKo6xaVYP9LzG2CphsGHDS5FGcefbRApaEQltZKTxXchslm43gKJTkZxxS0n/26+I2xGSMh2OiYpyD43gYo0uRI4u+W7dSBg8ahOdFFJ6rZ/OWDM8/v4IXX5ylENVuKd8Ma9es1j7X48yds0h7Km3YOq0yjURddu/ZztJlyq+uBtVpHORB6UJWfeDb8RmNMxSgQEm5oaAkhxdPEnoteLFWUQ5f8UI1TzRG/rD1GuNKASPr0qhvDpGowY2A61py8HSzfywRPVcYUXXk/LSATCQwsHtiJ59yBJ/93GXyPqdS2aGIUGXIe0kB+w+jRB3GIeeH6qfJ11+9t4WHHnyFn/z4Jl59eZ5AMsfow8qYfsZ4KirKWblsI48/9hIrVu4mIrb27d9RxsI0tXM09r/psDwQ3tmTQG362uHOBUH+3nGM+hvgeFmFYVN07ZngwksO49wLp4pHhgULF2lP7kWaGpuZPKU758rT7NqjUnOzmycee5k3Z6/REDReAZOjfiPKZUNcxxWzDPuPUImlQGn7+dHjgGTORLDr0s7djm3VtLW1yjMvxbUCrg4byYklXbafHyAHNBMfYO2HcNWhrF+DRy4Hixau4dnnns1/yaBb945cdNF0jji8JxvXN3D/fS/w5ltv0dpWzdSp45hx9rFUVhZIMRpcAZvdEzGyoBuED889tYYbfvUsv/jZw9x046M8/cRs1q3ZQSjQCmRxB9JZgf2QxSZtRs8eBYwfP5xAynPJkiXcfvuT/OaG3+fDdeMnjOaaay7mjDNPYvPmDdx0023ccduTLFy4k3i8kJEKOxXL86qr30Nd3V6ymQxIPzp2xtWOYxyM46pukx9jNucLuOT1qIwxAp/Qw1c4w6gvu7a18tbc9QpdrmDhvC1s2VAnENjHovnbWbJwNyuX1mgc9Wze0MDWzU1U78mRaYkRZBLySIoxpgjHJPCcAux+lcFR2LFUY+ursF4h5NtUp3jvoUyVQ3Ng30WAqq0ANq2v4YVn32DLpl3qt/rrgN0rOmxiL6ZPP4WCeCcZEct57bVF8qxS9O5bxmVXnMHpM44iXmAEqj6uh95FfDdEvEIZIBU4ppxstlCUIGK/NOL6pHMtlHWEo4/vx+FTBlNf18xTj8/i2acWs0We9AkndeKSKybQo08HaqtbePqxBcyetUpeWxpHCiydDNSe2vnToeWh8L1jbb/+aHDA1WRFFN2QgaH9ph0769i+Yx9du3aisFDyrHVojMl31Zj9af6m/eMD4YCW9gdS70eg0r+vC1b0woxhzhsbePLJmdpQ30nP3pWcctpkjpjUhU2bmvL7EG+/uUxhs2ZGjBrAOeefzLDhnUhnMlL6OSk8B1eKfsOaFu7+/Txu/NUz2lx/mccffZU7bn+EX/3q99x6y32sWrlJilKAkHOU2ilRKlBIJGDAgC4UFBSwcdNGWe7vSJmXc975M7jyqtO59Ioj+fQ1Z2gD/0SFHg2PPvK8wnxPKNy3jQsuPI5vfvOLAtIL6NmrCyYfKgyx2OfLaDdqJhYDhdTz3lYm5WlTP07dXpdVS1p54fH13Hf7O9xzx3wB6jP89jfPcvOvn+E//vUuvvXV3/O1L/yar37hl3z5cz/nW1+5gR/95/38+LsPK32QX//0aX5/8+vcd+dbvDlrI1vWCbB2+7Q0uWTTWvhqPyavxs5QWpjpq0O+dfnQA5v5HgoUFrMAYmQsZLMIBHK0NGcpL6+kq8KbjjUAciEFxS6fuugkjj/uVAoTVSxdvFI82479Y7cFxVHsV+lbko2ks615cPIEUK2NPls3NLNDQNNckyBMlQpQ5cX5caKeSH30okm69vY4U3uL48aOx8+U8eD9r/LEE3ORzcFxJ3fm0itPoGNVd96dv5NHHnyZbdt24ecgELNjCn1aA+c9Q9KlRSs7Vpvqtv38iHBAi4IoxmhhyDjbtH4r69dvIBaL4DpGa7N9vj7MibKz8WG2d8i0ZSSH27e28PRTsxW6W0WXrhXMOOsEAcF43EjIC88v5mWFlTJJh4EDB3LZ5TMYM7YbrocsdFe2cYgNVbU2Bcx8/l0euOdFanaH9O01giOOOJJhg0dLURvtJa1l754aWWtWmRkpNL2rfSjktVil1qVLsfZKeub5VlpawpVXnsMllxzLgEEKM3jQvWehwogncMH5n6J/v6H5b9rV1jXQqVOEU089jFNPO1Z7UB1xXfUHaUwNzHFC0pk0O2UVLl60llmvLZRSncXNv3mRn/3gBX70H8/w8x/M5IafvsRtNz/LG6+uYfumlIArKopRuzuGn6yiINqPTGsFe7aHbFmfYv7cHbz8/CqeeHg+9989h1t/+wLf/Y/7+b6A6ze/eJw7b3ueeW+sZvu2JmrrUvLM8sMSgBh5LBbQA2WEovecAidHyiIQP4wee54r7ytBQ30TNTX78MMcbiRLYXFIr15xBg3sLzCvpL6uiYaGJrIasiMvyH4po7gkjuMGAo9tvP7qYu6+/VV++ZNH+eWPn+P2W+bz3BMb2Lq+jdZG8UrIk9amVVu6QfU3M3Z8V84+51QG9B0rHmSY9foc3pizkJxJMfWoAQweOIyyol4sXrSeJ594ic2b9hKPuRpISMQzSt972jFaCt6b2X79D+OAnQc7H5ov+2UhRTG0gLH/FYwNqRfJuLGesOM4/7AefhIb/oRx2wqhr3m2ZK91qdPXnoYlXeL7Pr5CXA17Ql5/fiNL311LUVmM4+UxnXruVCJFhvmLtrFmzWacIMuAfh1lsU9jwpSelFSAHB5sXRE3ChLyhfO3MfuNxbS2ZJl85Diu/cJU/uW70/nRz6/nBz/6J775ja8xcfxYhb/A1T8bbhOqEeDjCATLq5CHUEKQ765D1+4VlKodNxogfY3dN+nRo5BzzjuKf/rXz/C1b14k724IsQKwyy2nscmRk/J3CXIezY1ZFry1lfvumMXPfnQ///lvt/Dv/3IDv73hXh55+GleefkVtmzZSGFRjCFDe3D45H6ccvpops84jDPOmcD1Xz6Tz3/1DL7yzbP5ytfP4arPnsJZ509i+pnjOPO8wzlx+mgm6p3+gyqp7FigdpOsW7uZp558iV/+7Hb++f/9mn/755vliT3FM08sZvXyvezbnZZHEsMQ19Cj2kvLKeyW0XU2PwbEFzsWIzDu2DFOx8pKQoVC9+xqpkXej/2dlWMi2C+uuLJ8U20+GQFLKB6GBNj59DX2xhqPF59ezy9/PFPg+xgP3v0Cr770pkKAc3jg4Sf4/o9/z9e/fgv33vMOtXuz+TE5JAAAEABJREFUJCKlCvmVYBUUMRg1oYojjhpE34E92bx5C7ff/ihbNu6lvCzK2WePY9Kk3jTWonGt4pUXF0Dgk25tIbQImQX7TeVQ4SI/zKhnLcqwcqjkT85cLocvOQzDEJsG+yf/T0q1377vHLCLV8aQrdeyvLExI6MuQmVlsYwaJIuhfdROHxIHnA+pnY9IM1a4rEKwmv4AhcrLk3RHJpRSCAmyhlXvNvDcIwvZu3Mf3Xp25JQzj6JzrwIWr9jLr37zPKtXrZeV3oUZpx/GCScOoLhMCoUcRl6Jp5iRwZBJ+ixdsopNGzfnf0N06hmHMeXYBB277qJLr4BJk/szbepwHIUQ9u1pZdOGau3Z7KOxvo2cQIWYT6IE+vTtKIVcpXBWK/uq9+FKUeKliMTT+UWDZrFQ5UYd1pFjTupD74HyEKKQklJ0jEuYi9JUD8sW7+DRB+dw+82vcu/tc3hHnk7tPiMF3IHu3XsyeuxATj5tPFdcewxf/PoJfOnbJ/Dlb5/Cl751Ctd/9Riu+Ox4zr14IDMu7MX087px3OlVnH/pUK776lFc/fnD+exXpvC1fzmZ//efZ/L//v0svvkv53Pt9adzxllHM2XKZIYNHU08Ws42hUSfffIdfvnTB/jZDx/gpl89rf2a+QKqfTQ3SHFnPHHPyQNMKp2WjvfzfHU86DewI1OOmojnFrBudY3eaaCpTg+k9FNtsG9fi/Z8Wigp1V5SPIZmV55LnJYGh1dnrufu2+Yz58Vaon4Pphw+lbPOOoUzzj6awzUPVd07sHbTFh555GVefnEVTbUBTlAgeIugCC+l8kbPuGA0k6YNplPnLgoHNvPEA3NpbUgxdWpnTjm1P0OGTKStqSvz31ov2dlDVBtlxs5lWksgi+YCzW1OktKqepWh7D89LRhZgLJpVrFM3/f/tEj7/fvGgVA1WbL6wOhap27TbRl27aqlpKSIbt1LcF3lt58fKgecD7W1f3hjRj04OOScrjNgsrj2B7AyldKpQDa6x64dKebOXarN0I1UVZUz6YhJ9OrRnW1bWnntlWXs3L6TouIYhx8xUuGegbixEKRqjI075dUhUqZIufpSltUkk81SZhV0715KPF4OYSVOGFNbhoZ6mDdnMzfd8AQ//cnv+ckPb+WeO19m/ptbFO5rkOcBI0YOYeiwwao0ZO/efVLWAb7d1JD97UXtmNBVStREEKQITZgHrUTMo7Upxzuq66F7ZnPLjU/z0H0vsnr1GhwvoG+/Hhxz7GSu+eyFfP0bV/D1b17G5754NhdePJWp0wYxZHgPuvXoQEGRl//KdmFJBKMQmR/k1E6ABeJEkUtJaZTikhgdZGF279FR9XZh0LBuTDi8H6eePoHLLjuR664/j+u/cDGfve5CzrvgVIYOHY5jory7aDlPPD6T237/GN/7zs3cdfvzLF+yi5ZGT/wpxCNCYP9fKM1TVntTpRUek6cMwv4lin17a7UnuJx5s7Yz9/W9zHxhLbPnvibQTqrMBPr27iVDw2HPziaBzTs8+MCj7NmzjTHjBnHuBcdz5VUnas9uugD0NK797Bm6n8HYcWPYvbuGJx57kbWrdkHgYozBdQIQqzt3lRd9wrj8nDiOK09zNs88OZd0JmDchKGceNIkOneuoHZfMy8/+zZNdQFGXh16F4meXsGVV+1QCBqdPv7b6bquyrj5fAtQvsDJelH5jE/0h11nf47+HqYYRS0ckQEjb11yZueppdWnqd6ntDhBhwoXxwFjVIb243/Pgf/bG2L5/+3FQ/KtvMtuF70V8IyG0CpqIbS/v5ECsHsDbc3wxCNv8+zzz0O0kSOPOpyTTjiKVHNEHsdLzHl9ISXFxYyfOJyjjh9L70EdiRdGMNowNRjVJ9KpCxzXCMQS4ORobK6mqSWleorwU51kbceZ/1Ytv791Nr+96QGeefYFVq1Yp7y1PHivgETe2ZuzVylUFWgvqZKqThW0tTZpk3+rAK8JI8Ueajz2rzRYxZXNpgn1z3FdMumA3buamDt7Jbfd8iw3/uohHrj3ZexfNIjHqpg4aSSXX3Uqn//SWVLOx3HmOeMYN7EHvfqUUdW5kIJiQUIsIBIJcbQq7W+9wOAYB2MM9rBK05KaJAhCgWUgsnw14mdIKGPfOqSu51DRMcrwUeVMO7Yvp505gosumcA3vnWGwoIXc9Y5pzFw4CB5mQFLFq3jsYff4Pfq84P3vMXs17ZSvdfHdTw87dsE8kKcKAwYUsn006YIODuxfOkaHhTg/vA7D/L7O+5jb/1yphw1jFOmH0Hv3mW0tWR46IFXuOfuh9mzbytHHzecq6+byvQZfRk4soCqrhEqqyIMGFwkQO7H8ccfqTBORzZt2qY9uZr8OAIZAp7aDmTA2P260WOqBEITFG6toi2V4qmnX+ateWsoLHQ1xm6MG9+DuppW7TPOZf3KRuQmQZgDNwNeFiPANZQojfLnDtuOBSTrNWUUk7Vk8/5c2U9eXqAhS7jyTM3q2t5budPl//F0FM6zZEiC00JWgrt+U5qWlkI6d6wQQDloGWCMgzHm/9hK+2v/Ww44/9sXDvnyEkRpCg3DCraE0QqkrKVo1MWV8C1ZWMfMZxezdecWeg+oUMhuPB0rypj9yjpmv7yEhppGOnQoYfLUYQwe0VFLpCm/KW+Mpzpd0X7hlR4jEvVkiQ9j5MiB1NXvwP5PtG+8sovXZu7Kh5d+8bMHuO++B9krpTlwUA+OO24aM844D7vpvnVzs8BlFbt21uFFoGNVGdZzCYIs6bQvSy+C/UGq3d8yjtF9nCBTIKWYZdGC9VLGT3HrrQ/x2KPPsXatPMBOXTlzxnS+/OVL+Mx1Mzj7vImMOaw7XXsVa39K76v7MuixAJDzU+TsX3ZwZEkKZbRWsWEmqzA1QDzPy5MrIDRG74qs8rR7O/lUgw9V0IgdlnDAOg+ePEz7P/7Gi2DwsA6cPH2wvLZT+No3LuELX7yM8RMm4LkJ1qzexmOPvJQH1SceniPQ3k1zY6BnHlZJlJRHOPaEkQKIwwUQlYTyFDEOvfuWc/LpIzjnwqMYMLACOXgK/TUz69Wl1NS0cOqpJ3L+p45j9MRKSioFFJE0XjyDI89Z24wUFBjNVQ+GDx+lOe5Ec1MSX+E4T/U7pPFMTsALcdkbxx0/kPMuOIUuXbuxe28Dt936DIsXb6Frj5g86sH06TWIHVsD3pq7S+G/JPavuOMIqEwrwjkZ6WKO3TTkj49QzLY8tKkxBstjS8YYPpGHFSRL2A8LRL7YYCmr1FJO6d9/Wu7KpMKmdk0tWbKO3bur6datEwWF0Xz+399Kew3/Gw5Ibfxvih/iZa1854dgRdDeWCFX/D+XIZcN2bEty1NPvM36NXuldDoxfspQhg7vyab1dTzz+Dxa6tKUxAuYOH4QEyf2xYlkpdxCKRAj4XUxUpBWqViSfiYaM0yaMpizzj1eVn55PuR004338Iuf3cX9DzzJunUr6dg5zvkXncA//evnuOraM/ncF07lqqvOYGC/4axfu1sW/G55MMgiH84ZM05g0qTD6VBeLi/FJZv2pLBdHAPZ1hhL5tdx/12vc8uNj/DoQzNZsWw1JSUFnH3uyXz9W+dx2VWHceS0TvTqW0yi2M0DESbAhuocL4PxkjheCk/jciMZHCeLUd2OY6SUQyxAWfbZ8dlra9kbY1TGkoPrqT8WSVUoa3kaZLDegq0fKXZpZPEqhxMJCAQI0ULo0iPKxEldOW3GWIHU+fKqZjBs+AAy2TbWb9jAs8/O465bX2P+vO0Ks4D9xnlWe4PRuJGHNJBrrz+ZL35pBp/74nl86Wvn8unPnMrYw3qqv7BnNwppbs7/P1h9eg3knPNPYuiIKtyIvGWvCUShU09Am8A4wHGRpxujU1VnKso60NTYQjLj43mO7JkMEccn6iFPEQpLHc3HKA6fPI5IvJC1G3fxyisrZDgYjpzSm+OOmUZJUR9mzlzMq7OWkhZSBrSCvHRZM4RijRoWp/74NMZgvVVPvIxGoyQSiTzZPD7xRyAOWMoqtWSZ6Ov6/TodVeQSqol9+2pIJluxBotRdqgn7eeHywGx/cNt8B/amjnYuhU1exOVPSaPI4hg8Hjj9cXaU5pHp07dGCwFecJph+PGXBa+s41t63cSpNNMOlyW+VlHUNohIoWTwXFdjHEPVowxJk/SLdjsgmKXs86ewD/9y3UKm1VS17BLirCJwUO7ceIpk/jGt6/kkitOYeTY7nTtUURFJfTrX0SnLmVSrjXc/vuHqaltYdiIUoXgTuboaaOIRhxctRj1PCnKkHcX7ODnP57Jd/71Hh6+fx7rVtXQqao3V336Kv7ze1/nms+dyuFHdaVjDxcvEeBEc+pjllg8wLVhJpMWwGksZHG0c2VErvUWJB3GGBzHwSrKeDyOmx+vyadWgaLDGCMF7irPUVl0bct7RBSKcy34yTOFDEZg53o5orE2eZWNGLcJN5rEqD+JYhg8ojOXXTmR7/7gMr72zSs4cuoIUm05Zr+6hZt+9Xz+91Mzn1tBXW2zWoXi0ggDh5Uz8aiOHH9aJ0aOqaBLlzjGC9QH2LZll7zVOQKJTpx/3vn06F5GNJ4FtwHjtBKGAqVcipzcI9c1SBhoqG9R6HSTeF5NoFCccQKV8yUdDo54EsijTGeytLaFJBTGO0fAf9TRR2vcBcx88S2eVYjP9VoYd1gvevYawL7aJC+/+g4bt+xVOxFyOXBcWxd/8YhEIuq/pzky+dQR//9i4U/Yg0Ah5DAf/XA0ckdzY0S61BmG8n1Euvw/nkbvuWSzkM0YyainucpqHoRWetJ+frgcsDP84bb4D20tBBtTwQphHKk3CEplEZexd1crC+Yvo76+FqO9ga69q+jUtRNvvLGGF56fTTqZZPTI/px44lhZ+1LSkRyulK+vvZ9AqssqNlV44JQwS5GpNexi8mIwbnxPrv/8hXz165fxmevP4bOfO1t0jsBmOPaPloYCBiPL3L7T2NJKdc12hZUayWSStGpfQ9tLFJa4FBYaAh/t0UA2Bcve3cFtv3uQmc/P0RiaBFzFTJ48hS998WouvuR4DtNeUmWVR+gkwTRgFbMjMEIBSQRCYgDkO2+UHiQrFgdJ2X/mNMZgjPmTJ7b3ofKDA2SvbZlA5cL3UFbXbaJWlWvJp6h/Wb+N0A2p6BjlyKMH8vmvnJcH9ZNPOoXG+hzPPTOHu25/hkcffJ16AZRxxQOFIDN+PV68UaDUoP2CNhwBiq8m9+5tJpv1GTt2HKNG9SRRoBHLLA409lxOfQgjxGKlRN1iCIw8pZD16+upq6sVRzIMHNJDAKhG9MwQVRnNtG4LCh3VpXHpus+AIkaOHkC8qJA6eVqvvvSGwni7GTDA4VOXHkFFp3I2bdvNIw/PYtPGFjynlFwyqz6CcWg//ioHJDMybqx3ny8WepJ9V3uqokyUMCjE9yMCfF/rTBOuQoENWSj9X58CvFDrOMDWbVRflP0WSTQAABAASURBVLKyMsoqSiSjGUx+rfwPa20v9r5w4BO0PEKwoSVZ8OgIwzihXwhBXOGikFdeWsay5asUcWlhwJCOHHP8ZDJZk/+N0soVq4gqDHXaqZOYMrWXQmI5Qicl5eKqfJzAIofq3H+qHexCCXClJK3lnc6GRBTiGzW2M6ecPpbTzxzLhIld6N4tQSYDKVnhQc7FhC61tVlWrtzOvuo9UoyFUqzDqahMkFaYK5WxVj54LtTXBDz9+Epu+s1jLFywTC22MHx0b4WujuMznzuZqUf3pqTMwVUIDZLqozwF1Gcp5v39dJRYcpUepKiuLQlNsRTRvZSwPv/2GaqIHbev1F4r0ZIG24Yl24atz5KtO64CNrX3RtcBETUdyssKNE+lFa68y05MO64nV14zUV7jWfTq1Yu1q7bz2stLePXl1fn/Z8fPOrieppEmQsXK/JzBNZoXdaOhoVWKK0VTc71CNGmES+C74nMMxylWWoqfSUjheeTSsH1bi4yRRQKnGoaPGMDQkT1B8xxkNd9ZF0XmsC0Z9dH2U/qMojIYNbYHI0aPpLi4jNp9LWxaU40XhUlHVTB+0kAy6ssLLyxl4Vs7tYcVI7B/wdZVg0YPVGP7+Zc4YOXI8sjKlcqI4Y6JaN2KhxlLHo7WjDGGg16T83/2Mo0acPNkDZogcBV9qKSiQzE4mn+tMD1sPz9EDlit8SE2949uKqMOSCkQSsClwOS6hzKgd26pY9Zri2Q5N9OhY0IANJChw3vwzvyNvLtkLa7j0rdPZw6f1I+CSl/AVLdf2WthgBVog6rcT2rBnqEqDgSEXoQ8mKAi0oZ6N4MrxVVdk+KtN7dqs34tO7Y0kWp22Lcry6svreDRh19g1649DB44iGOPn0JV5wRuJIkjheaouab6kNdf2cx997zKm3NXUNWxE+dceET+t0kXXDpWe0qFGIGSr05ppBjHwzXKo4hAYAwRdVEVyVLcfx3V/Z8jT/m240r+5mkViVUiluy1JfuuJdvee+svFK9KVKOlIqUForj4HMN1PYxeCcJA4c8MoefTvS+cfHpvrvnsDE484XiaGzzu+f0r3Hvn6wppbqe10cVBdZq4WJxQXbp3IF7g4UUDNm9Zx5q1O1CVuK6ntlUmV0SYKxBfYoS+Ye2aZma+sEL7dGvp1KmK02ccS5euhWCaVEZJGMNx4oQalp1bRwCa83MyTsh/qeTk0yYxbNQosskYr734NiuW76CoAkZP6EpBURmNdUUsmd/E3p1ZogXih1sLMhb00X7+RQ6I2WT11AKUvYZcBvbsaGPBm7sUNWgg2Qauq8lWqb//W40ORmuitTlJ9b56hdbL6dy5WPXntJKsXKuR9vND44DzobX0kWjICnlOykmnZM1awslmWL5kH7u21xAGWYaP7M2UaYNJpTK8884atm7eQYcOZZx86hS69yrSKBSGCltwJa6YA+zbv2707OB5MCPEGPAiEnnpI3TtOKG8pSDvHT3y8Kv84qf38/tbXuW+O99UeG4mjz/6Chs37GDw4CGcdsaJDB3WW4CSxpPnZhfhxg17ta+xgpdmLlLYL8PoURM49/wzOO/iSQwfV0hJeSuZoFEgmCYaD3AcRwo7hhEohYGUbVCkwUfVUSlpjQKpdRVWniMy+ylQakmWqgr+D89Q5cTUP7IwVY9tw4K49S4PUqC27P+Hk1MfbGpJlioqZyxJQTiOqzGLoq040TpKOmaYclQPrv7MdM4770yKCrvy5uw13PX7mfJ6l9NQ62HCMlx5RL7voG0bgUsBhUWe9ocaWL16LdlMiJ9zCHIFhLK8jcYYijaua+WlF+Yz9423KSkt5tRTj1QYtgdeJIsftGHDqKhcptWndm89TQ2NIK/H0ZxaFsXF1tHjKhkyrCetKmM92ZkvvmZfYdDQjowcM4xYpJLVyxt5Z+5OhWOtDDaAjBd9tJ9/lQN2zQbkjQKVa2r0mTNnE08+Nl/7q3bOttPYlMU4Bse18md5qzQkf4QcuMjf/YWPfBG9g94lIJ3KYf9PsKLCCImEc+ClfKED1+3Jh8GBg5z/MNr6h7fhh1FFjl0C00rOT0Iu5J03djPzmSXs2Lma8k5pTjptMr17VVC9M8PeLS0QphkyqoopJ/QjUioBNlKCTjnGFEntGuw+uvQ/VsdjD6utQpXRHoVjYnr/PSyWfDuOhy1fUVlM954dQfs/r7z6Gnfd/SDPP/c8GzatpN/Acs771BSmndhXIT1oacmRaStl46oA+xcOHn90rsJ/tUw4YjCXXXkCM86eoJBXlRZwoKUYUlAQxfNsu2oQdSFPRn02alv5hj8+7P17SUU4eP/HJf/KnX3J1XNL9mV7b0nXOv9Q31+5NgefqRbyLzj6dAmNUhMSiYf0HhDlrPMGcfFlR8uj7MDqFTt55N53eenp3eTa4njybvxA4xaY9x1YoZBbPxkaWRYv2K553srurb5CQZY/HskmWLUkI0X3DvPffpPy8iznXXAYJ546gOLyEN8kcdyEPKs4e7YEzHxWYHj7y8ybu4Z0yhDRRHoOkoGQygoYM6aT9iM705YpZtmyRhrl4fbsXSTvtzc9ekWpr21jzqwdVO/WS06p5ksWeU5yGGSBQPehDBFQ7/MkabO5eVKBT+QZaC6tsZEJDG0+7KjJ0tDq0bFzP/btzvLSS9t5+9022nKB+FSLMbUgfoYqm9O7Mi+Ubzn5F9hnmW0fBxmCsFqGXRtbtkNoSkiUyojR8wh2rUf+QgXt2R8UB7RKPqiqP2r1GgleVHgUlRC2SelkpfBDFr+5l9XvbhQAbGP0YZ055qSR8mxg4bztrFq8mQ4VBRw2qRuV3V3CSAZMQpJbLipEOQqQpXDyoQdJseHAoQt5CcYS9np/tiMkC7VgPHlSg4Z05oyzpnDJ5adqf2gUo8b0Z8rUMcw46yguumwaRx7XnaquWVJ+C0WJYjatSnH7TfOZ/fImGupTUrr9ueDiKRx7cm+KbHe0uR/1KvDcEoz6aEwUo94ZY5AOxdiZVlfUWf5Hhy37Pyp4sJB9wdONXcQ2dXVt85T86Wmz7WNLtl+WbJ4lW/ZgqhEYCuQRleI4USLyBCMFvubCYepxvTj73COpqqxi9bJaHn9gHa88V0eLnJpoxBA6Gbr2LOGsc46iT6++bNnYxC03vcLDDy7gqceWcO9dK7jpxhX5vLfmzadzVRHnXzCFc84ZQ9duHqFJ47pxfL+jDBePRx5by09+8jAPPfQGmzbWk8vazgfqYU48D4jHYIj2KsdPHkWXXsMFXp3l4S4lyGUYPjxOWVkjScWgli2pYfWqnIyjCsK8t5gDpEkPuga6s2egD+VinwaE+qeMj+j5wXbLITQGPzS0JEN2V7dSUFzA0dMGMnJULxlz1cydt5vde7Karyhiqmh/j/aLkeXk/vu//pnDmJT2dn2FgdsEaBEqKxNEJc6uXUda7X/9/fan7zcHrFp4v+v8yNZnMMjAIquwj2cK2bE1y5ateyX8WYYOGcrkyVPpUF7B3DnNssgWK0RTzeQp4zhi8hgK5eIbIwDKj87o05ISbJ5dADbV/cFsm76X9AiVtaEH4/jE5QUMHFTOmWdP4Qtfukh0MZ+57gI+9/mLmX7aFEpKCvGzhQSpQtasrObJJ99g5otP06FThBlnH8VpZ05UCLIMNxKSzWaxG8JofH9MfAyOP2VigHFCyitdJh05WB7mSQrBDdQe3QYeevBFhefW0lwfyHh2xe5Qe4dVXPOZGUw5ahjZXC2zZ7/GHXfezY03/5JnX7yL+pbVjJvQm3POPYljj5lAWYkUXE7vZgrYuy3KS89u5sYbn+KRxx8hla3Ly8PYscPFdylNa55LJgKbam4rK+Mce9x4RowcLDlLsXDhImpqGulUVcX4CWPp2q2K2vp9vDV/GXV1WRyvCGO/yikjJvQ1LgGUY4d7YNb+6/K/rg48+gQlmgtZVGIN9k8KNbc2gtNMj94u02f0pnuPYlYu3cSSRXvIpMsIg1JC43FwKRjC/CV/7Qj1UOBniJNKeuzeVUs0BmUVEbyIxMg+FrWfHy4HPlHg5MlzMbKCCIuorckx+40VrFu/lg6Vhcw482yOOHwyzZL9V19bxJatq+jdpxLrzfTr1w3725lQ9tQfTY8E+o/utRDyoiyFhQn4Y9IKMOA4Wi5BTt6ZDSOEFJWghVbA4KEV9OlfQnnHCHnASYekW10aahzuvmMmL778EsUVIUcf14eLrxjLiNElGBfV4xPxoqpXN3yMj/C9YwsEyD5FxYbTZgzm2s+dyMQpfdm4eSN33PqcAGo16TZDxG48GaPwaA+u+8JxXHHNqRxz3GF5Y+PYk0Zy3iUTuPbz07nqmtOYNGUwBQWePB20pwSL3m7ktpve4Vc/eYaXX3qNvgOK+fY/X8MXvnwpY8cPknFhMJpjc0AmfD8kFodhI8qYdORACopC0ulW1q/dSiJewFlnnsy4wwZL6WVZvnQpWzbu0oCiEERAYeBQ7wdWAyv3j0+jW0tKPmmnXV92D1Kp5UBba4qGxmqi8SQx8beyS4wePQu1X7yHJYu20ai167jFoIVhtAYdzY0L2Hf5a4ctIPkyFpzaHPburcN+kSZeEGpFBwSB1rKe/7Uq2p+9/xxw3v8q/0qN/+BHoRa/YyKyw4rYvGEfr7/+Bvuqt9KxqpipRx5O9y5V7NzRojDOVjKysrv1KqZv/yqiCTAHQy+6wh55YbXss+JvyV7bB74+cgcoeyC19zbfJwwDhSgCQpPTGgpwvP3X6VyOnNw63xZTG4m4oXpXVuGqpaxbuxOj8tOOHclRxw2molNIojggEgtk2bkCpojasStMycf63D/GMMwRaC8wJuXhauiHHd6Bcy4YLw+lgq2b6nny0dksXbyDVGuA6xnxOWTQ8ASnnzWMT118HFdfcy6f/+JlfOrS6Uw8YhDdehRSUGiwX+nfsLZJe1NruO2WF3jy8VmYsJAzzzpR4Ha2LPUx9OxTTDTuaz6yIs2d5MKI5xItzR/Y/8Bx0uQuCjl1Z83a5bw5dyENtRm6d4sKuDpQXAabtmxiwdvraa3R+xn7tqMaFCRWJaGUKoS6D/OfuvgEn/v5gnG0blBYVN6m49KjV0ecKBSUOIwd05UOJXE2rd3H5o0pecegrWTBUqj58XEEbH+bgZbXIUEQlcwgOcjIaHRISCZUG5ri/VPytytqL/E+csDO/vtY3Ue7Kl8WkE5yaUdKrIG16zbiRFKUdYhSVurR2gTLFm9h69aNJGSZjTmsvxZCBZ4rZaSh2XcRtOnywGmURkTeAeG195ZyWkwZ5WcPkCwvqRrpHi0AF4NHxPMwApxckNSTNI6bJesLoLK+NuBDqvfleOGZtTzx+Bxi0WKOOvpwzr3wOIYM74JvWsj4jfgkVUeottR8qKY+rucfxmZ5i8YMYh9+kMa4AW4URoztxAWfOpkhg4exds1Onnj0DYVn5UFlsipjCJ1QyiyksrMrTzlOZYdSSosd+a2OAAAQAElEQVQL8ORNtzajzfU089/ZzO9+9zgPPfIIO3atl4fUj2uvO5WrP3OirnsSiQpMUJtkQNxHKjCQUDiqw8gj9oOQbA6KymDipD758hs37mXuG+vQ1Mrb7UDvfiVkMxnsf7q4asVOXasqexqD3Y/U5OvOykvA/tHq9hN7hogtWD74WYFTm6894I70VSQjHnPwIj4jR3Vh3Nju2nOqZsWKOhpa0MyE+FpbYqimyEWTz18/wv2PwyhtLeK7DNiefTpSWZVQ2z76UB20Hx8yB5wPub1/aHPGOAS+Yff2HGtX19Hc3Ja3gnv37qQ9pQI2rmvgpZlvs2fvDlnIlRwxaTjFJR5ZPyNFKKFVSLClKUvt3pSsq/1D0XYPmVSoPQ7dByLtH0hH4cu6D/N7EQHWWwqUGQS2fYcwF8UxMYGSwRiw+1B+kCEiJafCtDRnmPXaYu0xzaG+oZ7Dxo/h9Bkn0advV6KxnBRqWmV9bHG1iNGHrUfJx/O0A8yPzF5YcnAEBp68Ius9yjzO//WM40/szelnTqB3796sWrlFPHyX3Tua8vzxhQ6ZTBuBLIScQmh2auwXNlMCpsUL9vDA/a/zwANPsnzlEjp0jDLjnEl86esncdJp3anqFsGGeYz2Cj0vxIaM8t3BaB7VFxPiuqHAiDxQejHo3b8D48aNINkSCpxWsXefr/BtKUcfO4IePbqzeUM9c2cvIdkmoJNuNKorsDIjwCNPoeRDD/gEH+Kr5YWmTGvVx36NvCBeTGHC0xpwCQOjqIfHhMO7UFQUYfW6XeyuSeK74lkenMS/v+U5GZV1AsR+HIX1mhp8GRIOnTuXUVIsoAtToA58rNcXH83D+Wh264Ppla+YmZXFZYv3Mv/NDcS8OGXlUYaN6k487rHk3b2sWL4FR4pmwMDudO/REbv5buxLJoLjJNi0fh+3/u5pHn1oDhvXNpBNGTxbQOtA+o9c1hAIhBzjktPekjAJ+4vznGINrnG0FxIIBGvYtqVO10ZrwtO+URZHcQrHURt4LF64TSGl16mp3cX4iYOZetRwhgypyv9mJySnd0Icx8UYD4MjQgtI9Ik4HY1SfNPYHcdei/HiCfiUVBpOndGXCy+eJq+oA5vX1TL7tTU0NuRwPRexShSId5BOwoplKV54Vrx+bA4vPj+Pmup6zjjjRD73pU9x/sWTGTSiiGhJq95Jq82Q/aBkdG3bVX2q0Bh7b5/lVG+AFyUPUB2qYhwxZRyuU8jWzU3y5mqwe1KjxnRT6tHUEGL/v6iG2rypD1K0nvbIDIHq90VgaD9CWRGBjImmxox4lsZoDyoUiw4S2vcbPKQTffpVac9xC3ur2yQJFthzhJZ9Krv/wt78ObKlQowxWrvQUJ8FyZY1SnHTBGGWfFsfickIIT+Y96bK+m+nff7fMg+5DLvKDrlO/1877HqGlAyhlcv3sW7Nbk2zw/CR/Rg0uCspKau1q/cq5hwyePBAJkwcRYfKEow45BhXXkqcbBq9t4vHHn6ZW25+hN8LpF56YRG7drTmlZ3WCZLmvDAHeYvNKjAX33dwJPA5yf2cWeu5+aYneFJhp62ba+XJRYh4Rao/Jg8MVi6v49WXVtHSBGMPG8inLjmSkWNKKCi2ow6wAIgsPEgoQ5pQnx/r0yqFg5QfqKPPA6FUXF3be0tivUljf6x7+OSeHHbYOBrqDM88OZ83Xl0rfvrEhQ5W2TketLWFzHxhgQyNe6muruGYY6ZxxZUXcs65xzBqTA95YjmyYQ2O04SrkCvYTtj29DKW7wf7YPMtmGhyD4T7rBds52vcYUMpK+nMvj1JFi1az649bRSWRolpY6ow3oXa6hR1NQIn6RKd+SZ8GTTkwTaQfNJ+GCM+GNpaM+RkXBbIQ4qI/UYGpNG0h1oQfXqWcOy0ofipDBvXtGidhgKotKIXaeT0/E0ehiaj8jl5sSF79rQQT4R06ODi6E2jdWy0sO0s6/YffFopyagPaZFNRQJPhWJAII5CzFIoemZl0VJO14Hoz5yHQJbl/yHQzfenixHjCkha5Lnsxc8mpCQKmTxlPJUdK1m2tJbVK7bR2pKje/euDBzUUyE0B0crwHUiGAsukgXPLaN/39Fk2qI89eTL/PiHN/Pd/7ibhx94l+3bUuRDTVo9njwh14nhyOOKRhK4jqvnrbw5Zy3z561j+9ZGLQYtPHlZnhvNg1tDnc/rryxVGGgFnlPK5COHMXZiJ2KFGr9Wh+2D49qbAgljDGRta+WSJxX5eJ52QR4kjfDgpZQGsqLzlAcpg+M2kGUnHbsYTj5lNIMGjGbbxjYeuPtF3pq7SorKEdkKAopLDbFEitqGbUTjIdOOGcOxxw5VmChG/ksJJiTiOiC1Zd9A4Vry7QmcQpE8XLDPjcoEIl+UAeMTaC/QcZJ07FjGoIEjCHJxli9dqX2sLVR0KJAxNEhWelyg1Zz3oG1oWOKByTdk60JH/kbpJ/s0mlujuQ4l63ZtRQuycmx8cNLkoxoYvEiOEcPKKStMsGpRA/t2WHDKkjVJfOdv8VHPBU72jRaFYDdv3osTaaVQxqATRnA158aGCPkIHOIDoeTDApElXUrYQLzJk32Ozcyqs5bstcanu0PxtKvrUOz3/6nPWcn0ti21rFi1Dvs140GD+tNP4btkNskbsxayft1WXNdjxIiB9O7dmYzVGlJAQeAS6F0ZvBw5uT+f/9ylXHTx+Rxx+FQqyjsx/+1l3HP3E/zqFw9w950vK1y0lWQSLZuoBMfFdRyS2sx9d8FatmzcR4fyHowZPZ7evapUBtIprTXjsGzJNtW1inSbS78+AxhzWF+KyhzSWRUwYK1AQ0QXrshmoFSkS31+TE+7wMT8Px1d+J4Me51fmG14bhMmmpRxEefMMw9n8KAxLFq4jkcemsmeXc3it4MvCzMifJ8+YyJnnTuNVLpGFvMeWeZip+pyjcE1An9iKhsRid/o0DMs6ZJ8ezbfkmNz8hTK63HyX6DxSRQ4TJgwhKqOndmyZRsbNm7QvpThpBOnMnjgAGr2NbF06XqaG9P5ubVVe5I/JHNg9I/2Q1xwDPJmoroKydrwg+6NCdE04dh5kIgUlyTo0rVM81jD3r1JqWhXMxHkpyn8m1wMJTcemYxPdY0MnFxSe9Bx1e/gGBfHWg5/s44PqYAfB1/C6ycgkIwKQBGAkjeexBib4qgzuuYg6fYQPO0oDsFu/+0uB6FCYEFGQpojK2Xk65XmGljxTiMNjVsoqNzC+Kld6dytA3t2J9m8SUIZtNGtp8O4wzpSWuqSn3BZyKEm3wJDSEhRuWHSUcVcde14vvqNC7ju+ouYfuopxCKlvPPmGn5/ywvc8puZPPfEKjatTtNcL2WYhramgOVLttCwr4b+vTswcHAFxR0MOU8LTrOwZUcLM19cyq6dtYwY2pPTpg+jT98yiVeI6xopr5Aw0DKzHeHA8aHI3oG2/mHJXxikzf6jPtmMjpiwuyIcMVyt3eHjYpxyxhB5Qx1Zv7qFN2dto6ke8dSQ1b+eA0s4YvLheKaKBbO3smGxBCQfCQmx/6VGRkZJzpQQGvHdyNpwUpKnFL5CKXYasvm/1efKcEkQ5IrJpQvItDkYKY1A5EZD+gyNM3R8Fc2pNhkttTTU5BgzNsbRx5dI4RazaWOKFSt3kf+mZi5FKFkjjOP40bzi9QilanLqs/rAJ+2QzOfXMWTSgXhv79/DB12aA8BRVOTlv8SESjU1ZQmDhEjcUxkx768yzg9CvRWQTGZobW0mkXApLIqL83pNhqWDo4uPwikZt4j8B1Kf8rKpQdrUCcCmuIAnUnl9Hqqnc6h2/G/3O5TA5cgFWdKKS6cz0FYL65c1SNRa6do7xWiFzIpLC9m1I8Pefem8pTt4aBnde0iwSWN/DIt16Q+Q8bJEEqrTfmurMKD3gCKOOm4Il1xxApdcfjqnzziRzp27CaRW8ouf3MNvb3iOt2bvZtfWkG2bsgox1QvEDOPH9aVHryJ8o0XkBlTXZ3jq2ZUsXbadgniBrO3e8poqFW7SKI2L58UwxuB6LsaakQY0iD8mo7yP5WlF1NXIDgzQJn+BTFgEQQdchVRNJEthpc8RR3dl6lETiZhK5s3azM5tSdXlEFigkYdT1bUTPbsOYcvqOt55Yz3Ne9PgQzTq4bgFBCauWxe7F+RLjnzte4R+IMUXSg84pJOGnVvTrFRYeLfkiGwUJ68YlXqO9sAcho6roqisiO1b0uxS6DeSgL6DoLxDBevW1TF33nLSstodGSG+bzAK9Rr1weoaR+EbtaI+50SfrNMaAKE1LMWL5tZ0nuexaAQM+4EDexhC8SgaCyivcKlvqGbH9hYZCwlckyCwlai8LfmXyBhPdURoamojm80oHFssgLJyF2CMXs57I3/p7Q8vP9RYAkljaAIkJOBk8xQ4SQKnhdC0EeRDlLbvFpxcjYtD9rCjOGQ7/9c6boyRkrLDMzjGQQYYW7dlBUK1+fzeffrQu08P6hth5ao92g/YRqcuHTh62lQqK8sklFJSmnAc+22tNnCTmHycO4MfpiT0SRwvTUxg1X9IhDMvGMinrpjAZVdPY/qMw4jGU7z22ssK9z3FrbfM4v575pFsg8FD+zFxyjAqq4pJ278CkXJYtngXi+avJNnapv2IPhwxdRBFHVzaj/8LB0LNTZZQnpENw3bvHmPGjCn0H9iX3bv3sX7tblqbQmk3o8oz9OgR15yPoM+ATmzevpEFC1freVLelyfvyeBiMLkYxi/CCQtljxbqOka61ZBsDln27k4efvB1fv3L+3j2qbfIpKRJDQRSqoFALJ6A7t1LFXLqrJBRLSuWb5N3hdrtRr/+vdVPn5qaehobU3heQq1ZmQUOJMrQjT2N/fhEkR2x42jtSiln01nxx6W8vABHBpoRY4wxYrTBiFduNEuP3hVYj6e5MUcu4+K6FsgseMFfZpzBdSIizWk6jeOGdO3egUhMcoRAwO7nGP5hR16OJEu5XA5rIIUmTSAv3hcg5UiRCyWrkvVAoBXYQKZ4lZNHn06rfC6UHP7Duv53N+z83TV8ZCvQxITgOC4Rz5Mow5Il69i8dT2lZcX06NZbez+VbNu8h4ULF9OsmN+gQT046sjRxOJRcgoJIu8JTTyadEvWYlGtWgw5URZXlrenzdjQrSdasI9O3dMceUxfrr3+TL7+ras58+yTcOXtvP76PJ595lVZZhmGje5Lz34lSIaI6J+TNaxfsZeG6jblZRk8vCt9BnaQ0spB3kWn/fifcsCooBOKdxlyvkj7E67004jRZfJGB9DW1sLc2YtYs3K3gEYPZLHEEwFjxlcwbGw3Un4tm7ZtJJXJSRE4hDmjcuS/mxemDU21ho1r0rz+8g7uvWsev/nFs/zsx3fx2CPPs3L5Zqr3teg9CZ16IP2JBZhoFDp2KqCqqpJsJsPmzVtJpdJ07dKJCRNHykovo662kb2766VoHVzH4w+HsVf2w5K9/uSR5ab9FKNmDQAAEABJREFUGUZKwFFamqC4OIb503WhxWSkqDtWJSgrL9ZeXpKG2kDsjxJojtF8/DXOhfKMQu1dBUFILObSf0AVjmv0isAJpaEuLSn5sM9AwGQ9JmMMRkLlqx8521eZTaGJassiSjIdp601Tl2DJxl3pUcM2DJ61zHOh93l9629Q7fnf4MFvp/VJIUSrf1DrKsNWb9hE61tNVQonNKtaw+iCrssX7GGtetWa+KzdOoaldUU0Tt2cl1NsCUpizAOQYEoQWD3AkyBlIjuTQRf0uLoDT3EccB+0aJTpxKOPmo0l19xmugMpk8/jsna2xgypJ+Ap0pApvol9/ZHt/t2+qxZtpOGmiaG6vmoMX2IFQRy01sJ88BI+/E/5kAO+1+QuIqHWQXma3Ha+SkshAGDKoknPHku61k4f5P2AI1mLZAR4ue/pt9/SAUTjxzOsFFDZH0X4BhDPGqo1x7R2tUp3n6znmeeXMsjD73Fg/e/xEMPPs8zz75KQ30LI0eN5IILzuLUU6dQVCw0kpKzys2YQGAFpdqs7z+gF0VFRQKhfTTW5SgodBg1pqPm2mXrlu1s2bSHjDxpdVljABxR/jT6lAyqt7r4ZJ2aAyNGZLNaCSILHBbszXt5YQABUEiSSDwrfmfF4wbNW1oPHFyX95bmLx0ZeRvNLb4M05jm38PkATDcX1yKfv/Fh//pagCu60i3GIx4gRPXGOMycGJUV3ssW9zMvXe+w49/8AI/+s5Mbr7hRRa8s4JczsezRrnhkD2cQ7bnf6PjQRii2cSXYGUUmt21s4WGxjq8aIqKilJ6du+l/YKAtWs209hQQ6IwJGHxRhzxcwbPLYSgFOOX4QRFcpwSoP0EclHcMELEkVWm+1RbnGy6jHSqUuU64KcL8/9tg/09VXFRhHHab7jgool8659O4/ovH82AoZ0EOb4supC9O0Kef3w1yxauoSgR56yzJjNybGf5aWl8ue+hFh3tx/+YA36QJhBJp+E5EaIRzZMARgYm3XuXMHRYH0qLO1C9J0v17hSO72oeIaJ5Hzq2krM+dSQTJg/GOB7JFmhtyLFw3ibuuv1Zfve7h3noocdYunQR0RhMPHykDI+z+N4Pv8h/fucSrvj0FEaOkQy4kjuZFcZBfQnJ5IK8shs8uDsdZBTV1jWyc0cbsp3o2TvGsOH9VV8Bi9/dgP02oTVw8gM2+lQdqC6sUrLCrKxP1mkINO5UWp9iaKAQmy/7I88W8SUUBWJ3oDVu+ZKIukS0h9uovaO2lAw8PXftfBgVsgX+Ahnxt6E2ycqVO4jE4wrJxxS0CEVqyX5Bxb5vib/jCDWTB0jdwq7tUHtloVZ7qAjNfspqvHZUKBWpvB1zMhlSX59l374Mm9ZlWDy/lTffqOP5Jzdw123zuO+O+fnrN17ey9zXNzFv3iKaxYMggJyvSv6Obv8jXxX3/5HNf3BtRz1PlTtY/S4DltrqZnbv2UFD8w7F+nsybGgXTWBAa3NWyihkiBTXqDFD80KRFpplMxGCrCcl5VC7J2THJp/6vSHrV7bx5qxdzHltq9LNLF24h3ffbODdOSnmvlTPm6/u5oWn13PX79/gRz98kO98724eeexZduzZTnlHh3hxQFsqQzIVsmXDXha+uRQ38Bk/tp+ArDuJQnBiIZ4XVb8+ttOjuXn/T9dxsQR27sU/46IT6Te69YhyzvnHMuXIqTTV+yxbsIV0syHUvlDo+IQKz0aL9F7EoSUZsGjBVn53w0xemTmLlpY9dOuZ4JgTRnHhJcdx/ZfO4mvfOp8rr5nKuImd6Ng1TnGFg7aMcFRFoDr9XFaGUUqetuTLhT59q+jZsws2RLV65SalkCgwFJdEiHoxNq3fg/3tm/QVtr9YoZUZQ/5QBVKg+ctP0EcgRmQ07mQQKtyWoCgey4dYPXzNcJDnhO+B73liVxlF2hMsjqZpyzRS3eSTyoWqoUmUyZf98x8GQo86ecir17fSYjQfxQ5xR5QtwhU4hW4T9oe6f/799+SGuv4LFMpYVqSZMLu/TKA1H2i/KAgbCakV7SMTNJGU7LT5UN8csG1XimUrm1i4KMnbb2d44/VWZr9Sw5olLezemiWpvdO9u6ppaVYdfpqYF5LLKr8tI70XEuTg78VU/oGH8w9s+wNtOtR0BxJqxzGavJA1q7fS0FBDWUVc8f4KiTyyVLO0NAWUlhYpNNOP3n06YySrBfJiQk1sLo1c5E3cdssr/PY3z/HznzzPj37wON/7z3v5/n/eyS9+dqc2wu/i5z9+TorsHX7+oxf56Y+e4K47nuGRR57mpZde5M03X2XN+ndoTm7HRHzcSISITG/Hcdi5rUkhnnqGDOzGCSeMoVwKznhadLISc1owYajOfKBc+rhVbvllFXlMA4uI7L1PLkgSulnt/XjyUgzbtu6VYbGaresb8NyY5jyH4+XwTYivt5Yv36l9pNdZsnAVXTp25vzzT+byT0/niqtP5OQzRjFoaBnFZSGeor1uNAQnRyBP19e+R6g6jGuXVYDnhEQ8B0e3Has87S+Va28gzbp1O9i3uxn7hY3C4gieUC3wE3rmal9KHVAdqC4OgtP/Xg5UycfjtEPPSmG74mN5WUyhVrFbQzNa33at4oJvlBHGBPIRCuKGrJ+mVZ6TDeliF7LK8pcOTR/SBsm2QO84JEqKiSVcPJV3BEx5G0GejVpRzt9zhjiRDHhpsmGGQO0GQVTAqKhMUI6f60BrSyH79ubYsK5JHnoNc+dsUTh5J4sW7WDTpgbtWeekIzz6DSzSPmklx57UixnnjuPYE/vTe4BD/6ExjjtpNJMmj6ewMIFxyLfz9/T6H/muuv+PbP6DazskkEiGUjyG2n0plixeT03NHgFRjO49KvJ/rmjlin3s2l2rvYACRozsR6cuBWRzYADXNdpc9Jn9xkKeePwpAc0sXn9tIfW1zbhOVJZvQFsySTqdxcZ2mxoaWbd2rfYNkowfP5bTzziJs862Su1cPnXJqQwf1VPCmcXHIes7NGjfYc2qHTQ11jB8RGcOP6Kn9h/S6nNK5JLTPleQXyLqTPv5P+SANFXetlZqtVp+Jn1wWsBtpqTcoVu3ChKxIrZuqGfbukakxzQfOayJ6at8XUMog2I527bt44iJUzh9+lQOn9yP3v0qKChyCGX6hhY0BEiYjOYqq3ezGJMTBaAc43lomvFluhqFmYyBiDyyEim+ZoVbVmqfc9PG3TjqZrduHejRvTfFhVUKM5O3dvWpejKirCgUfXJPG5pKpbLaY9HaCEPxeD8vwnwS7r9XfqgQSVx7il27VoKuG+pbyVgW5uVBE5Av/5c/WppSWrtZKsrLiMc8zaLm0r5mKXT0or1Q8lfOUG/9EcnI+MO9DJWsURtOmpzyc8YjULw5m4tRV5dg3eoESxYEvD1nN2/P3cq2TY1kUoZ43JNRE5XxXMzxJ1Vw7CmVjJsSZeAIn76D4ZQz+/Klb53K935yOd/6t7PlzR/L1KPGCpziefmyfPkrXf5IP7Jc/0h38P/auVACa9A/yVh1dSPbt+8llUlRIEu1srJUVgisXrVVlkqNJrKQzhLqSMyg17ALIpeDaNylR68OlMhii0QCuvfsJOAZw1WfPo9//rdr+dd/u45vfusaLr/qJHoPjFNaleaIqQM594JJXPvZ4/ncF8/lootOzf93Fz17dSMujwzj5BfNKgHjxo3bQFZ93z5lFJVnpMzqCcI0gdVseWAytB//Gw5InGXtioHiq94LRQIS10nhuW140QwDB3fU3tMgKop70ljj0qbQiDGejAbwpTTqG9vYsr2WwkQHjj5yBAMHlWE9IC8S4gpzvIixU4gNy2S06ZzzAwLfSG48SVsEI1DMpdPKC4AcOW0uBRKqqIzkzp2LKSsvk4eUpqa6AS+ODKIEnheRF1/D7h01qlevScmR/zt9FpxsPcrLj0XpJ+i0Q7YehmWHXc/ZrHhtMw/wwF7a58YY5fh48mJ79O5EKt3C5i27Sbcpm4jmxrUXf5l8BBAtNDc3YwHOcUOVFe81b2g+MfZ924ay/8JpZykwhj8iScQf7rWmM9qr9kmQlcfUILnbuj3L8pVp3p6f5M2361m8eIcM6Xo6V5UzelRXph3dk+NO6MVxJ/ZgzGElVHYOKShqwY3VYNxqUS3FxSmqOhn69C8VlVFY7OJKRgNCyVIo2XL+Qo8/+tnOR7+L/7ceBj64xkNGFE0NraTa0nmLqKgwSnlZIdmMn1cQ1vMpLimkpCSOjcZYJWIXQkSCnigImSwFde75p9CtZ7ms6TUsfHcu7y55l6S8psFDujHusE70H1xILthNSXmKcYd3p2ffKKXlUFRqiMSkJ2VBB0K8MDBYefe1Sb5ixRYBY60AECo7FYObxPFE9teXdm1Y+r8N/RP8lqOxG7Qu/0Chbnx5O474an+n1k17T917lNLQmOTteevYJA/KlSdspEjCMJABkyHqJoi4MRkLOYViUchFpI1lO3dh4KBiqt/B/v1ER5a5n4uSSUdEnkK11bzx6mzWr9uIZ+sR8LguGFFZhSvLvAS777RvbytBDrp2K6Fnr675H+Fu2LBHSlJKUX0mf9jxWNKNEX3CTjtkx4T4fg5jDLGoh837LzaY/L3jGGVpwchLHTCwE527VmnvJdB8gP12rcHhLx56NZcJqK1uIqY4a9duhcTiysxv/tm3dP03DEXf9zWnARIRfL2i5Y3US5607SXdEJJMh7Q2JaivjrBqRZLXX9/KG7PXM3/RWnbs3UpxhzRjJnbg2OP6MWVKVwZLp3TvGaNL11C6RIAU2YcbqQUj+QijGncE1K8QV9cerhvVKG1fQyy4SuyUBrA/LsmheDiHYqf/J312pTTcwMuHbeqkCMJMliDbQqeOhVgAqt3Xxu5te4hJMZUXl1KciEqS0URrQhUTdtwcuFl69a3kgkum8bVvXsoJpxzO3pptPPLQE/zo+3dz62/fZv3KHHW7Yc/ugKrKXgwc2JtYoQTVbcE3tYSOvCGSqtfFc1ycDKQac2xVWKc52crgkcPoPqAn2G+VyWJz8CVyAeoNLu3H/4kDRm85IpuKk0GuGD8owZgY8SLo1i+NibeyeNlW5i/Yiv3ThVFxPapwa5EApXNlGcUlBfK5JD8SB2VhBBgWvBwpSdeJEPWi2s5waWk02J8DvPn6Zm78+RP8+Lu38dj9r+W/KJNKFeqtCGnthAea24ouUTp1jZNOBmxc3UZDNbqPMXBIIUHYwvattWza2ChlHEjZeVKsxeQyDoH2n0J5YRrRJ/L05Z3av9yACXHyc7qfDfZS04ExBuOEICrvUEBJcZzGxhba2qTINa96sP+Fv/BpjQ6j1VZeVqY1HJdx4mvefNAnGCUuYAVKyYEz1EvW4LTAZLOM0aclJdabs5EXYZb6ELB9RxMrlu9hw8oUi95q1tw3Ube3nkyqgc6dHcZPqODoYyqZMLGCfgNKKNF+ZiSawXFaVVsTEadF8taKp7Cgay2i6ZwAABAASURBVAp1X6E+VUg+ysQSyTWFOMbDGKN3UJoVZXSdE4kvHJrHH3P80BzDn+11qPCOtUwzmt+GuhRZhVoqO5QycsQQirRZ2KIYc3NjI1r5RDxZHpJ6nVghd0xWCqKVnBSG/bMgRSUwflIfLrvqFK655lOMn3gYe3bVcv89z/DrX76s9F12bW2hd89BVHUqI7SbsNqPiGqTPSKKRg2uJ1ZLTmIuAsyQSCRKZceOHHHU4XSWJU/+0EN1yBV5uj8g67pqP/86B97z1DJNrMaSro3AyVAGYbHmRVyV0dFDnm2vAR3IyAtatnw99hub1huKmICeneP07qFnmRZmz1vMhi2NUgKGcP/Xwki1GfbuzrF+TRtzZm3h3jte55c/e4jf/fZxZj77Dju31tOxoiddqwbqPUfqzWA8KTs3RVG5R+dupUSdBM11Rs99yZso2kwQtLF50y4psfUCJF8SEFGboiAAkwYZLfr4RJ1aLuLf/iEHAqggsDn77//4U/nGB+37ReRdxQsi1NU1sHtXIwRaU8bw144mRVb27aklJ167EQeT53VOr6he3SHg0s1/O40xmrdAusIXoXlDEZWQ5iaf6n1Jli2tYfG7u5XuVNSljtamVoWTXcYMr+CEY4dw6kmjOPaowQwf0pEOEtF4JI3nZvC0n2lCH6NIi+NHJSdxTFgikS6TgR0jyLi6j4D2pQ0x9csR2dP2N6eLzAHKKrX3Sg7B8+CoDsGu//UuWzn2fahvSElIq0mnFJut6sTQoYMpLvIk9HbRB0pzRCMurmOQrIFBh5HFYYgKUOx+Q05hBVd6rf/AEmacM5HrPneuNh5n0G9QOW++8xwvvPQQLcm99OjZhcpyI+GKgl+svaUChWv0ouLWjuOrzhD718nXrdlDa1sLFRVFDBtWpTg3OpwD5O5P8/3QZfv5d3PAk/HhOIJ8KR9r8Xbt1plJk8bTo1cXdmzfTktzilCb3qFEwjZW3qGEnN/K/Q/cze9vf5BlS+oERq289so6br/1eX743Vv413/+Ob/46e956MFnWDB/mRRFlKOPPobLrvgUn7rkDA6b2Je41RuSMImR1FugfawEPbr30B5nseY/JVnIYYzJUyjVs3vXXoUDN0hmspLHiO1K/pmDyojyGZ+gD6OxBpqzTCajNRJVuM1FS0m5B87wQHqQN/KsNNVEtORamtuorWlR+D7Q3Bws9+fT6up6tm/fI54bEnFHhXyR3rMd0BWaG5uE/KFB1bn/2uiZbWv7jjpWr2lk+fJGFr27l/nzt7JlS7Xm0lBeXsnAAT0ZOryIcePkKQ/06Ns7Ro+u8vIKXJlPakFNGnnuJi+H0gGBQChXgC+v3wkqyLRWsGlNlnlzNrBkyQ6SyRyuvHHyHrU1XkQyiPNhv3ye7Z8ljYND87AzcWj2/G/0WlgjhQM1tS0SvB1SNr4m06OsTBaIgUBueTTmUCArq0NlKdG4JPpAncZIOFAhQgm6g5FFlsmksHsFxWWGCZMque7zx/H1b1/ICaeOoM+AhMShmllvvMwzT61k26Y28CO4phgTFhDIAgpJYmN6tbUp3nlnBbt3b6e8ooAOlbKMrAxJyNHmLXgHetGevF8cMMb8oSrHcSiUcTLusCp69CyjtraGtWu2kUmGslAdyQGMHdebk6dPyc/Piy/M5J++9X3+3zd/zE++fwv3ylte/O46qvc2SZEVC5CO5rrrL+NLX76Mq689gVPPHsug0d0osBvTLlhvzJV0IIpHY3Tt3pVoIk5TaxsbNrdiNO9FhcX6dPC8qJROmmQqI0MmIvkN2d91VcQn88hkApplPHgyIOMCDmtcaPUeYIaDlqhIKQkwPtFYlg7xOE5LsaIlhbT4KXmhgcrwBwqDUNc2L6c5z7C3LkebX07P7sV0L4sSJ4ITJAi1bq35igk0exlRQFqvtbbCnt2wYa3PgrebmP92LcuX1rFhY73WdT3NDS1UlhcyalhXRg3tLE+pioF9i+jcJaewcgtOJInjZbD6AOmWnJ/GhgcDAVNLm8c2bREsWFHL2h1tJB2H3erfc89v4YZfzefG387jmZkr2Vevd+zgTRKD6qQNV6EiJ3B0HwdkIGsc4Or60DydQ7Pb/4NeG7ALu7kpSU1NjQAioKK8QhuMlSjCR6MEyA9SFBRG6Ny1A9GEJwGRwASB3pOFpklNa1cz5wvUxCWjcJAl19NzL5SQBYwa15XLFeq7/KrpTJoynM1bN3DTb2Vty7p+c/Z2avf6kusYxomQybVpkbSRSkLNvibFotvo2buKRHHcihhIPaFlQV6oDOjME+3H+8EBq9QcLXRLhCGJwoBkuoa6+lqF594R2DQTamHbtjp1cTliSj/OPPtERo8ZSVJetyODxf6x4GlHT+Xqay7i69+8mi9/7TKuvW46Z58zjIlHlFHZyWA8JEch2awUoCozmnVXag1534Y0pSUFGLnhLapz1aotkgMoKyukTLKZiCd0nyKTzmrqJXSqQjXma9HHJ/MUD3w/xIgdrtadMZYNgf0Q5W+UOoShVca+vNUUfTtVUeJ0ER8LyWk+kEelQu85Q5XfT8gVq65zaMt1oFvnBF1KXGK5KMYvBK1J4ZPCvx6tWYe9DT4rVid5+51mFixoZd7cepYtbZR+iWj+OjNgQDdGj+ouXdCXCRO60q93IV2qoKzYJxFXnzUGX7ogEGVyEZpaDI1N4KvvjhelriHH22/v5Ve/ns33fjyTG29/g9kL93HD7XO49Y7ZLFzYxLbtMeqaCsj6riRLXZSkGCVG4UvjxzDyuFC4j7wuielJVHRonmLXodnxv9nrUCU0a8lkipaWZk0hAqau8lRKaWnz2b5jB01NNXjRgJKSBK6NvTgSIERaCa4TxzUJeUsOQehilCdzi5yfJVQZP8xif+E/dHg3jj1hPFdeda72o84TAFby2stvcvONj/L8M+8q9pyRdWbf9AkCn4aGNPv2NuKora49iolEHdUXqrOuyAqSyGha1HdltJ/vEwfCMCQPTKrP1/6FMYHu0yJYu3YLdXWNxGIGX8/RVFRJUZ1x5jF87ZvX8f/+6Xq+8e1P8+WvXsI1nz2Tc86dwPEnDmDchE506ubhxUG6Afv7lbQFoQhEEwbHzqG9DwJVaXB1H416OK5LKpth3YaNUmz1CvsU0bNnT+V78uTqSSbTgApLcarbUqSSByzxiTscMTGh+GjEc3H2I9MBHog/4pH93J/hKIngRQwdO5eorE9dbSO5rKv8HKFCXqH2kkN5V6HeC4Q6voyRnNZ2W1rzIV63BZCy+Xqe8w0tqZAde1KsWd/EwrdaeffNJlYt28uOXftI+/V06JKle/8IkcJmreM0WzbvZc3a7RQUGaIFOUy0jVzYTDrbBkEoECqktj7K0mXNPPTwCn7961nceutC3n6rmXnzGrjn7kXcffvLLH93D/u2xVm92OeW37zJuuXV8uq6M3r0IIFvjJiX0JZDREDkgCIzdj/KBEVCOQ/Uf9T/PyYOyUOjOyT7/Tc7LVmAEJJtbbS2tGnhu5SVlklBeNTVNMsFX6+4f0N+36djVYnAyVYZEtoXJaihtE0YxHEoEMU13QlRFM+N5MEG42EcQ6DyxSVRxoztzsUXT+Oqqy7iiCMmsW9fLevWbSaX8/NtRr0CGc8OmzbupaUpq9DRKEaM7I4XzeI66qhaIW/teOqIXXJaKXYAuvtvZ3vG/5oDrgDBGIMxBleKrlBht959O2n+y6mva2Pf7gaQHnO9EKvA3EhI564Jhg/vxDHHD2HipK4MHVFKrz5xYtIDqJwT8zFeBt9JgScZU7jGNwH1jWm2aL+huSGFE7qq1iMqaznqxXBdXRfESWbTbNu2XYZKDUVFJfTp3Z+OlZ0ks4bW1iT2cBzdSoEaowub8YkkQySyf01kc5obu1T+wAd7c4C0ZkHlxLTyioTmMMnevfV5zySQyRHKaw3JEeqfL8QPMISamzYh0t7aVlpyWZUA2a1UN2RZsU6AtLiedxbuYfHSanZsypJp8qgoTdC7T5RBwxKKnFRQ27CD+x56gltueYlH7lugPaH11FQn1aI66TkEjocjMGlqNSxaspu773+LX/7mJe5/cDEvv7KTxx5fxe9uW8TtdyxlofapSouLOObIyZQkutFaV4jJlDBp4miuuXYKw0bGiEYbKSs1JOK2/6H0j1FDEZGDhrSf+HgcGtHHYyB/OgrpIAkftGih+77CJMrwIlGtdpeWllYaGqqJxV0GD+1H/0Hdcd1A4JFRNWKJrA9fl0HWA9/D/hHQZLNhf56Da1xdq5yEG4FYLkteLnxZW0cc0ZVrP3sil152DsdMO5zyspjqBcIErXLj9+xopqSkitFjRtCpcxnGtS/nVEBCFto6RVpAaCHpJeW3nx8EB+IFhi7dy+X9JmhrC2luCsilbUuaC6eV0EkSmoDA6j5NjURCRmlIKDkJrQXuqLCRReyKVB6nBeMIqAJ4bdZSbrrhAea+sZRMm4MjI0cIhtVYjusQLYwqVJQlK8PFzxnJjqFDhw507dqDsrIOmnZjO5In81+X+ftP0odlvR2v53nygII82XtL/8UWzZdlrM0MtF41YcVlLqXl4nEqoKU5RyDQCrRWfVx5Mg5ZzZGKKR/pghz7qpvIKaph/yuujVtqmb94I0uWbWatDMm09o679+zMuLFlHDa+iPETqvKGaN/+Hdlb08LjT8xj7eo02ze71Oz22LU5w6L5e2ltjsgwLQBTwM7dGZ5/cS0PPPIys+e9QzxRxNSjJtCrT2+a23LsrW6QJ51VKHkkl1x6FIWFGdpaqikucpk8ZSCnnj6AYcMT9B+I9q3aKCxqlu4CY3zJZ1LjkDHj5PKyGUhm+ZgcVhN+TIbyx8Mwus1KCuvrmxT/93XnEI/K+9GDTCYphdQCUjLFJQkKCiLIEcKLKQWs9+SqXGtjwPw3d/HgfW/wu98+xe9umslzzyzVXlKOpMBqy/o0787fycxnl/Pg/Qt4Y9YWCXqGjh2LOfOsURK2nlJ+jsBJlSmu3NJk2LenVZZVU779bJDGtXtZ2hSVJlTDtnERdlkeJHvfTu87BzQlHavKND8JWppS2oPMoEgb2LmwoGMBR/KBDjsTGH1akirAKgBL1lrPk6u581QySlNLwKIFG3nu2XnMef1dmmukOIKogMkllOUfi3qUdSjBRCCdyWqmHaK6LiuVIpMCzaRz5Hy1pdrypy5DUf764/XxN0djVMJxHFzHw3GMlLHogMb6A0ukoEEGngAHa0FoXjp1jtKle7FCpI1s3dggQyBCRusvK0Mz6zuI7djQ/u49WZYt38uWrbs1D77WfUB1dS0tzQ2UlkYYOLADY8Z0VISjlEFD4vToZSgt84ko/BuovRUrd7FyRR0dKkYyfOhYunfuzPZNjbz03BrenlMjgHJYurSNx5/ayMuvrZEXV89JJx2mPctjOObYPrhuM77fILBJaWugHzPOGU6P3hHeXfoybZk1DBwSMP2FX//oAAAQAElEQVT0bhpLiIm0cfiU7px/wWEMH1YhXaY8jTuQrOZoIydjKnAkT+KPFUmx7pA/NZRDfgx/cQCptK+9hAZycm2sBVpUXJgvW1/XRGNjvfLTOAKHwEpaGOB4RkIaks3mWK7Y8o2/eYZ//9cbtH/0ME88Mov773mJX/3sIR64eyHPPbWWG3/5DP/xL7fz/e/cwk9+9Ftu+M3tfPd7v+EXv76TnXv2UViq5gyqU6m8qpaGCLXVGVpb0sTjEXlQngQ0K+vHWuEqE76HkPTvf1OZ7ecHwYEBAzoxcEB/XCeuzfNQKTiyQLHfrMxTBgz7D7vi856tpwmNgvWGFO8nkEzZeH8gwFFY1ghgHEceMQoXVmfJqQpVqvIutqriUgdriReXFmoPIsAxLq6L5MFoD7SZ2po6yUerFCV5yr+Eoz7Yt5V8ws5cLhCI5yhIRGRIiFHhnzJAwGQ9J5tvSesmUehSpLBtbW0TO7blyKaN5sGjod6wY3uG9Wsbtc+ziyVL9rBi5XblN1ES9xg+qCsjh3bl8HEDmTyxH+NGV9G7e4yieKgpbMNYALDhExkPrc0BO7bV40YLGTSiF+dd0ofPfH4448b3o6k+YNYru2WwbuPhh9eyYm01HbpWccrJk5lx2hH06l7Iyy8sZNni5XTq6DFmVKVAqxedqiAWRaHkKo45rg+nntWf3n0g4qVwTJpC6YxpU8cx+fChuPmtAJQfF0MKJEtRMjaKE+j2Y3I6H5Nx/LdhWCMqnQ1obpVVoQ1wV8qlsNBBhimbt+2RK70PjKGktIjCoijJZDM5azo7Lm3aCN22pZXFC7cKTFoYNXIcM844nTNOP43hQw5n5nMLuOv3T7F0yTptZPfn3HPP5gtfvIpxE0dR11jDrLmzePHl1/VuRnWCa8Bav8mUkZBHKSspokRA6Qc2tJPXXvz3I7/S/nt2e87fzwGxVk4MHToV0r1n9/wc1exrJp08WLUmDIMxIpul8tZpypMWv5FwOXYvyJKscSOy4V+ZrwogRYjHOpKIVOIrLOznVIHVnxbYVF9hEdrLqqCkolgKN46jNzK2jBfIOMqRkTJuaZBcJANCdBiRSkH+gk/ikdG6zCrm6kpb2XX0xzzwwVgGokMFTEC8IKC8IoLl/ZaN9Sye38bSRS0sWVTPovm75O3UKIwbUlxcRpeu3agsr6BH5wrGDu9A/54l9O5WRMcKl8IERGSshH6juO/LYY4QMzHIGt6at4535i+lsrvH5OMrGTAqwsiJCSYeWUUy3cC8eau5/96FLF2xlY49ijjtnDGceOw4Sr0YC2Zt5e3XV1BVXM7IQf045YTRlBUaArl0JUUJLrn4ZD73uVOYNKk7xiTxgzbcMK7wcAEJN4rnu7TUBtTsCWhtiEnOCshl4hqvKx4Y9guOLg/x0zkU+v9/6WNO89Tm+jSk2vDTPk4yR6i4sp8I2FG3R26zlr4sZi8SB5VzowGBtE9KCicZRNm4sYUdW5uZNOUwrvviDK7/0jQ+98VpTD95Kn6mlF076qjsGOGiyyfw+a8dxWXXTebyz53KCWdNh2gxS9/dwO6N+4hmwEYeZLzRTAo/bKI4nsITMLlBTKqpCMdI4KX0sIeRbFlCH/a+nd53DshOIb89IbYnSmO4XoL66jZyrWiuCqUEykTlmueC/H5jc31Iaz0014bsluW9c3OSPdtTbNvQxpb1raxc0sjSBfUseNNSA03VgepJKHzkkpNhRKA59bL4kYBcBHoOKKOiqkhRZYPja57Vj1hVgClpwc9G2bc5xKRDPC+N/X+mssZRFR/bpcpfOsQZzYMhJ6BubRYvtFFk5CUFYUavZKWDswRBFvtNzPyc6iOTiueBx76rxcbWDftYuGgHGzfXa38pjeuisHuRwnXdGD26mD59inEFaFEnpCQhHitqEshKMarXJUtUe8JxL9A8eZrTGC3NDq/YLzI8+i4NDW0cd+xIjjumG8VFKYXeUiT9Grbt3UxDSxsVHasUDuzOCcf3Z/jQQjz1b83Sah65/xViTpQ+PXtxxIShDB9cRdQxRGTFulr3HSuLBJpFeOpORkDY1hZnw8Yss16v5snH1vHrX77Kr37xNL/55RPcfuvr3H/XEm6+YT733bmWzetT2G+j5nny35GcQ+nQ8A+l7v7P+6p9ZtokzG2+j5FQmGxITp4UEQcnFideUEokWiwrtwhjjFznCLgRchISX/dNLVnSArWBg7ozZHgFiZKQgmIUWoBkKiMrN6Rbr2J69Y9SUNJG4KYorYrRuVd3KZI41XsaqdvdABkEPmD/zNeWvdXsq91K6DdLGEPiXkTPpJlCTwMzoDNPWna0Hx8sBxzQusd+/dvVPGTSARl5zGhPwpgE2ZQjz3kDDz7wFvfe9Rb33TOfu+98k9/dPJNf/uJJfvrjxxTKfVDpQ/z4h3eJbueH37uDn//4ft55czG+PCA0mTkpU6TcQidH4AQo6kdJpWSmKEa2LUOqNZPPc0sETgWZ/fKQKpKYShgUzsFJ2xo+nhIRgBbLfgp1/Qfa/8Bo1Bakk/UOEa2RmJZJEIqPoeVJWq/myMnKaGtzqa7Nsm0rrFoeZ8HbbdTVpIkIYCKyBkoqEvQdXMyYcWUcPbUTUydV0L+3IyNRBkdDI62tNQodtpLL+QIvD8ctUp+0Ln1POiOquSwSAHq0pbLMX7KJ515ewNbtSXp3Gc0pkyfQvcghJiOksS5g+Yod7K5OEkYK6NS1kunHD2PcwBJKSZLwQu072bDtbhKJNnr2iDFhfGddgycQhFbJSIqcxrhndx2LF21l9cqAx5/Yx49+M59f3vEudz2ykAVLNlPTlKGovEplPbW5jScef4enn1gn2dunKFCWQNsUQRBgiUP0cA7Rfv/NbtvwXUrWpyvAiScSFBUV4zhx7SchICokKmCKeIUKrRTiup7qcyWADq7ASVEEautqaGzeSTTmy4KVELekSKYhCJP5fNw2unTroJBgod6VIOeiOCEUKhaQSBQTicYoLEjgxMC15EJTUyt19XVkMhk9N6A8NUqeVEv7+SFywIDWrigHJkMm20ZLqxZ1TvfZJPb/2Xr1tRe59967efDhe3n8qQeYNedFVq5ayOatq9i2c70MjW0KG+8Ft5WiUhSuizF0eFf6D+hGLO7Q2FSrUKGERhZxEIb4MpYcByIRgxfxaGtrU5kWKT8km67kpUCiEGLlI5SyAwkUBz918Yk49495/1ANGSnZnNOqdZQj1AILiEqBlyn8WcG+fQVsXJNg6Xyf+W+2sGhBM+vX15HOZuk/sIIOVYK3oJWOVSUMGFxGz14JqmRAFheGOIL8qJa96/gYJ4uRIWAiPk4krXaawLPzhp45mgBP4bMIb83eyUszl9PWaqgo78iI4X0Z0K8cz2kjkNKY9eoG5r6xVjJlKCoOFFrM0q9PnOIYCsv5hEGOLl3VF+1tDR8lj+qUofTuW6JZDtVODtcN8TyP+pokt9zwOP/x/+7i2cfXsH5dmr37AoFRCeMO78unP3tCni645AjOF1366aM4etoQSsszsq8zOMbILCJ/hIew9yTO58fwsfuISvCKCl2KihLYCXIch0gkQqotJNkaECp0h6wuO415Jhi9YFw0rzQ0ZGhpaaGw2KOgMCLFAVFZ1/Eo8rgcCopcSooTEtAKYtECIIJWDCYAEzoqH6OosJjySrlaLnoGVkYy2TTpVEo34MmDw9GzUET+w16004fIgYjmM1HgYqSg0pkWMvbPk5PV/KSJxx369e/F1GmHc/Qxh3Hk0SM45dRJXHz5dD77ufP4wpc/xde+eSVf/9YVfOPbV/Ot/3cV3/ynS/nq105l+mnj6NS5VGCUFvngGKxgBUJDKweOwCoMfTKZtAAqZR8RFVglCgpIpVPU1dXJo0qC9foBvc3H8bBgs58CAi0e+9X90ISExhBq1FpOZAUYpiiNKQjJiI8tio/v2uuwZFmWt970WbbIZefmOE11URzP1R5ilHETyzjyuC4MHlpOa6qGNas3yUgIULVahwFapCIjEIFWRUiC0OBGQ3ADfNMMkRpCt4XQCBAxpJKG11/ezTNPrqUo0ZUxw8eQiLgybH30Brmgjb17Wnj5+Y3kUiV071JJPFpDSUm99EeA47ogUHVc6N23kis/PYMrrjqBkaO74EXByKNSzBBfG6FB1hE4ZXj37Z1s35ihfm9IeVE5Rx05kEsuHcUlV4xjyrTuDBlRRNduIVVdcgwZXsQln57A575yJJOO7C7d4mL1HYf44Rzi/f+L3ZccUCpwKS8vwZVUJOIFVFYUEEpBtDTnIIgqPw44BKESAYxj3Lzc1lS3Yjdgu3frKoGJsntXRgLqIqdHFOAYW94jUMjAyPXngP6RvpFVFZLNBMRjMaJxD8k2hChkENLc3IhVULFYFM89wHpblwCNg4fKHrxsTz84Dli2F8agrCKK6waaH4GELHPHzkvEUFRWyPRTj+Xznz+Pz3/pfK697jzO/9QxnHLaBI49fgRTpg5k/MSejBzTmSHDKukzoIxuPYup7OzRqWuc0ooY6UwTLa0pTT64jqO5D7GGkt0TSKWSug/Ubk6KRM+lWOMKNwcCpGwmSyCPAatNPzgW/MNrDrUw/Lx6t1foymgpmXwaYlNIS1k3t7rs3JNjzfo089/dLdrC6nX7sD+ezSoEVlZh6DPAZfiYGMPGROjQJUlFx5Defcrza3XP7loCP8yPN7D7zr41QALkYBEEERmaVThuMSntBeQEVAhIcCIY47Fje5onnljBy7MW07VHJaedNpJe3aL4qRaCjOYOQzaTYM6cXWzZEDBk4CiuvuJkLjhvLKecMICyUo1J4UIUlgw1Mjca0EdeXWWnQjVhCJ0A67mH9ifACv2i8F5V5yKOP/5IBg3oq/BuhpjXyJRJlYwfV0jnzg6ek4GgDdekcUNd+6307lXEuPGdBFhxgZMD6pcxhvf7+DDrs6P4MNv70NrSdhEYiYMvINIi6NatGx0rK3Bd8LWv4Lpx4vFiPNfTNGquJbRIIVgRrqmrpy3ZIoAKeOet1dx/90vcceuLojeY/cZqktoraGxIsXzJDt55cxcbVjdoo7yVmhqwwOZ5VukVE01EQO0J9zBOqPp8HAGl69lMICeyi+G9s2CU135+4BwIpSikFohGo5ob5OFkNf35CQFZGaGUXiwWobQ0QYcOhVR0SMhrjuAJuALJU1YKziqWQBY/8rxCqVUrb9JpqjlFTe1m7UtsYM/e3VKAgHGlKB21AzkfXMmBJ0EpSMRQonv1SMAUlVFTUlpCTF6UhEUtkX/HyiWH+GGB2dLBYVi8yMkytFvBORloWfHF8ianiUkJP6prQtYs99m0BlYta2PZknqaFV43XgsVnTOMmRxn6gkeRxzrMW5ShB79UsQKqwlNPdbg6NK1k7ybclyniOamLL72nUMZp2iGAs1xTvdNDWl5qjnqtK/V2GgNiFLphy7UVReyab3P3Nk7mPfmGoaMq+SC5MRudwAAEABJREFUK0cwdERcocGQskJD7a5WqncZdmyL8M471fjG4YjDB3De2UO48pLDGTuqMwXxAMfRiPVhoyUSNzx5g5FYiBsJMQIno/64jofj+drybKKk3HDFp6fyk1+cy9nn9VP4MEq3Lll5a614+LgmQsQU4JkiIk4hjiMZVhOuASufjqML3RtjcByHQ/U4dHv+NzgecSGXC2lobCaZTFKgxe5F4kT0oKykHBt2i8fjqsXRBCrRpOe0gWoXRmlZnM6dK3HdCOvXbueVlxZw/z3P88gjz7Ngwbuguc9mfOa8sYSf/OAevv2tXyi881O+/4M7ue/BB9i5axOJQiiU4pHPb3Wd9JZDWUkZViH5udx+heUDBwRJV+3nh8iBUG3ZfckwiElOctTW1rJp4yYy2lgMBRKoQM4P0frGaJWEUiA2/GfJcaUgPPQsBBW0CiaUpRGIbE7GT0rxpOnVu5PAz8HPG0gOdp8plDESyjgqKS2mS9culJaV2ioozIePDYl4gvLycry4CxjsEapS2U328mNDoR0UDsZ44q8rLoIv3qQzIXt2p1m1qo4F83exdX2WdHOChFtO544lUvg9mDypH4dP7MyQQTF5qQGRwiZwk6oni8HyTcpa9RYXFeBoH2ffviZ27UzJODRYZjseuLJSW1t8GutTWoseLS0BmzdlaG70BIRpHnlgNb+/bR7zF65n5GEDOOXskVT1BCeeYdDgCnk1FaxbuZknHtnCfXevZ+OmagaPKOOIIyuoKIMChWk9k9MIA/L4YEKMKH8tXYPxdZ8TBSKDIQLqM04WvDaKKwLtk5VwxOSOHDm1O107RoiZrEo58pY8POJKRSSImrjuHYRzykN1kT+MUb2i/M0h+OEcgn3+H3XZqJTVMZ4XIZEooLVVG97NbTgGKQwJgpRNW7KZxuYk8s4lrIFyUoRhlsPGd+XyK4/l+s+dw7WfOZ8rLj+XK664kAsuPF3CMlLu80CmHTORww8/jKKiIvbs28HKlQuY99aLbNu+WiGFKD17VxKJqxNhTiEFiEShoqIMz4thN8ZdLRpJmgog8Aryaf4jzH8e+h8f8RG4OHgOeFJSETchpZRk27bdhMbFRBKERIlHJSeaD4stnieNpmWfkbBkZeJbA9zqV0uoLqP3HOMQjcHosd350teu5itfu55xh43QnBtNMiIH22ZWFfoSzpKSEhlLMWx4KZW0yspQVFxEcUkReR2rcqFQSV1EVfNxOUIxLRDtTyGVCqmpycg4aGbRwhrefHMbqwVOrc0BZYUhvboWMHZ4ORNGF9Kl0qOsAIriOWLyWPFdhdgKaGuKy4spVgSjjNo9hdqzM5RVuNr3DamT4ZFs27/GQgsMgY+fC9i7V6AmtV7VuYzm1F5en72Y++9dyV23v8Os19bS2Jpk4pF9OO3sQVRWRcmEbVrLzZSXhRx55AA6VcV5+50FvLt8Lf1HdODEs7rRd7Cn+Q5ljIaQMxCIJE3YdvMTaO/thW8/RPbeVRrXO0WiMozxMALb0GnEcdpIyMuKCIDcXJEAyMUR7xSIUWokeSgN9pO8eCPiY3I4H5Nx/LdhhMqxZJVPoAW+e/dOmprqNfFaDJlWGhpr8veBn87nBSh+6+SwEbfiEhgxrpSTZ/TnDLnoZ507nMuuPIIrr57Mpz9zNF/79gy+9S9n823Rv3/ncn7046/xne99g698/VrRNXk69vgJOF5OkuOr/lDWGdoADwR+tmOB7tU7Y6+Vqn/Ya93+IbXX7fSBckBrXF6TESCUM2zYaAYPGopjogRpzVUyJwUWIgyRMQGhlIwRYrhOTDISwxEY+fLM7XNk8bsKD1tr3CdHaXmEI44YzNSpo6nqXJqf61DhK3QYrbjW1oy8+VbS6ZTACeyj6ppG5SUpLChUuDmhkqjNgFD/rGhYymd+6B+Szz/Xps3+c/SHsvbh/v7bMdhsY/aPIg9KGnQyGQogMqxfX8+ypbtZtWI39osF8VgRfeR1jhjWVXMSoUNFCx07ZikpCjUDWTyF5FyBElmHmp0hqxbDsoUOi98MefftNIsFcEuWbKe6pp6yDkbgl1QbO2lsTGPsBKgbvh/IW2rLR0iOOX4gXXuFbNqynDffepfm5gxHTBrJhRdP4viT+yrMliQtQHMVSnOdKG4ErAFy8RVHctL04ZxyxgjOOG8UY8eX4kVbCeX9hOpjaH83ELiaSKNZVIIjNlhSgjphk3zq6aFIXrwJCpWTwHEMjsmA9JKR7JFzCVO2TEDeu1IbOD6Y7IH7tK7bRPYdleHQPw5y6tAfyZ+MQHqDWNShoLAA13FobWuTkkljPZhI1MXIB/YU840nNOECpSBM4hpfAhEgw5icNhojiVYcWWjWw3FjEJcV16OvS/+hMcW3XTr3cBg4tJRJU4dw8qlTOfOsozljxpEcNW0UPXtVkgcn1Slpw2ithlJiES9KqOuMwhd5Y0pCaBxNg/LyQziY5m/aPz4oDlj5sMCSEggFWvh9evVn+NB+RIwrRRHBk/fU0pKjrVUKQGdKlncui4BJjzVHmbTRtHo4SGkEDoGe5f9UUSiFLNI0E0sgJbN/BIEmXSd6RFOjNY4acOUSZTIqryLlFcXyumKkMxkBopSLUaYxasPo4sM+1b791mKeNHjsvfqgcR/QsuSzDj56T74F4VBupY1ABGGLRLxZlFbxMA/COXkTtTWwdlUri97axcpF+9ghcDJaD906FTN2VCcmTqhi5IhC+mutlcfEn1ySMO7jR9EeSxZXXk9MYa3aRnjj7WrmvlPN8jX7aMkmFQ6LqS2XzZvrWLV6L/a/TE82+yxfvI0tm5oIwzjpbLG8oCh1bfUUCfSOP74L118xjs9cfgRXXTGBL3z5cK64aiATJpRQXmwoECDFtHa90BMTtH61XmNFDqMPr+T8iwZz/jmDOXxUVzqVFBMxDkZrWg4ZuAZUFmMwkhRLKAWX/eQoPUhgjNlPem40PkOR7uMYJyIyEAFs3UrAsP+wqSVHt7Zem9p73R7ipx3JIT6EP9/9XDpDVBNZIYFJFJYQKyglCCRYWlAxgVJERJglK2WALBNXM2+ZkbP7BUIS+3e0QrcZ10vjeEEe1KzCkf+sBgMJCxgJX1b1KfqSl5mEhMeGHGIK2eX8EBOR0hLI2b/tF9Wzbh2LKS2pwA8jJNMBdvM3NAHYhtERivKnyX+2f3xwHAj8AGs3pAVAtfuaaWhqlir2CWSNhlIOdgP92afncMOvH+Oeu1/iwftn8sxT83j7zQ0semczb89by5JFO1m1vIatm5Ls2Zmjod4nlTSyyHM0N2ZIK1QngxtjjIwTgwUmq9ztzxRaWpqpqdsjIEorPAV+W0g2mSUnBZuVMga9Iy/NMVKIf5ALPqTDNhiorfeSBN12/r+RitniIusRGd1quKAPX30Pwqg8RI+GxhD7d+2WLmlg3pxtrFxeT93eHAWy+vp178xho3owdmQXevUopLIipCCRUlg1RyyIEPWK8ApdAs+A6+OFkMs4LFtVz/J1e6lvq6egQ5KxUwoYN7mIMeO70at3V6JunJp9DbTJGNi+cQ/vzt9Bfb0hUMi2WaHE6oYaIoksZcUwflgnph87mOOm9WXk6ApK5HHZNRvTGBKmiIQWqReEGPUnlEcUqBOugFPb12j7kITjEKOAiCkUHkVwIh56FaQjMC4GF1THfrLXB8lRvk4DRpeOsh3HqHwUY2RYu4UYVw+kP0wMsNfqP3j2RmTTqFL7UNZQ/pnR/aF/Oof+EP78CAowRDMeXco6gKylpnRCiiMk6kOxPoJMHZ4Ct3U1LWTaXAldKWEmoeeuFkSWqKwVJGhIIhwJlfAGpHgy9R57N7tsWZtlw7pWliyrY8niajavaWHbqgyN23xMi5EiihC4UXIRCYrnI9miS1EppUWdac0UUG9DO36LAKqRXNDKftAjfxh9WlLSfr7PHLAKNFTIJebk0EmqwdfcF9OWbSXnJQljaULXyGiJUVfTxptvzeHhB5/nkfvf4vabX+an33+Cn//wSX71k6f5/r89wI+/8xg3/eJlfvzdZ/jtL17noXsWcfdtr3HDT59g1gurtZkf4gSO2ghBm0vWu8qksgr/SKnE2kgUeLgpaNmaJrUviZXL8k4RkMFEWKh343jyykzwPjPir1bn6KkrsqmVRPWdHJjMAbI8ShJafqnzoZuRd5SRHGfz0IXWS+hHNPYC9m6PsHqp1olCbcsW72PzxlrSGZ8ePcsYJxAZe1gHBg8v1J6OSywOFhA8z8F1xZ/QIdkaEvEiFCY8HDeUgQm4EfZpj+qVVxayafNahg4v4tgTetKxc4RYDDpWRTlsQmcmT+1J335FNDXspnrfXma9vohF7+7EGHTfwK4dtVqPBTgangmN3o3huq4MBl+N/PHpOA77yexPVYkxhj/80zXtx/vKAed9re0jVJkid1hPprw4IaEv0OKJ0pYEOUF0qSyhtLiAnJRFc1OKrJQDihkYxXwjskgcWdWh3OpAyiGUK681gbap2Lw6yQuPr+WW38zkh9+7nx9+/z6+972b+dd//iU//eGd3HXrs9x586vMeX0zyRarTbTAtJHuxVycICTV0kqyLUNTa46WtjRIoB1Xeki94+ChhbJ/hduLg5nt6fvJgVBzEfo5CiNQkohSUlhOaWkCL5YhGzTTlm6jRPfTjpnMeRdMZ9oxRzB58uFMmjSRsWNHMnbcKAYO6qfQnyEi46OhsZZNm9axffsOVixby7w3FrJ86RrJV46IgM723Ui5uZpvG/5rtTKXzlKkNiIS1EwbbFtbT/2eWoqKY5R2iIKLBMPBKAxm5c/o9sM7bWuOmrNkr60sWsopTwCFpbTE1FJOqbKN7XBEXpKhpjpg0/oUixe0yFupx/4V8PqaJAVFcYYM68KkKb0ZMaaUHn08jRWiiYDQurFugNFgjTECIQfLK23LoakCAwd7Y3Rl/1Dv2lVb6d61I8NGVFFa5hLV+4RZPc0Qj+XoN6CYCz91FB06uLS21LB9x16WLt3F3n2wZk113oDs1LEcOSrY0e03XOwV/+0wxmDMX6f/9lJ7xt/FATvff1cFH9WXrdKQPsAKnJHZ6UWNvBQH14Nu3TrSqWMnGbI5Uul03pKz0mnMfuEDowUh1shya5PltmplPc88sZA77nyMX/7y1zzz7GNs37kOL56hpMyjvEOc7Ts2MWfuGzz99DP8+le38PDDzwuIsnjynrIZLWoDAwdWyVocLAvNY+3a9WzetFuLMKJFlcC2r2Zt0yIVRu3TfnwwHDA4JoIrFmeyWQIp26Ji3XsBQai5AqLRkGHDO3D+Bcfzxa+czdf/38l89Vsn8vmvHM9nPj+NL3xtOv/8nxfz1X86hy9/8zS+9W/n8pVvn8b1Xzidz1x3Pp++5nztRQ4jUqKptUpTSteJuNjf2tRWN9Dc0EZhYYHa8cimYcuWXSSTbZLNrlK0Qk1PndBpVaWVY4mm7j7EU7Lv+xDIgwt1DRYwDPZKt9wAABAASURBVDbPV14QxhSeLhTvCrR+ojQ0GnbsyLJyRSvvLmxk4YJ97N5TT2GRiwWPsRO6MXJUB/oNTNCpqyEiQyAwsgqNBm/JycgjUYPyasMwJLRtiNLJgHQqIJsBZesDAt+wd3ej+BajV6+udOtaiKc1bkirl0lc1WvCtOY3Q+/epYwZ3U39bsYPQjZuaeSVWTtZt7GBfv36Sg8USRZQ2wZjjFIHV94T7cc/nAPOP7wHH1gHjIQRLZwUWblGjoTXNmWtpKqqjvTo2VsgkZB1Gyrc5xNK4MGF0NUicDDSCnpNC20zt/7uAX76s1/y8kvPkygyTJoyimuuPY+vff0SvvGtK/nGtz/LV7/2GS44f4YEvr8W6R6eenImL740m7a2rATeJS1LuaJDhO49yzFOjt27q2lp1oI0CXVLmsgo+aPT0Z0lJe3n+8oBY4wUUoSdO2Ddmhpw0vJYXBxPcyUQKUgU5JWy3U+MFxpZ/C7RQgcv5uBGHQq0Sd61R1zWfycGDCll+OhKDp/Sm36DShg0uIxjjh3E0ccOpkzzHYaB7I4MyDNwHPJftmmoaSYp7ykWiVJYEMFx9ViCWVCYoFAUVRsYyBM67LWSD/78rxYsEKjr5ITVvu9IuUe0LmIqEFe3EuJPQrIdZfeuUIDUzPx39vHWWztYtaqW1jYoLS9i7ISOjJlQxqBhcbr2NPKSckRjSY23UV5nA67XBkYNCOIcjV+QRKCGQ5HjOBhjaG0N1IdQ7Ru1D3pZoGRYt3qH1mwhiWhCxl2IDdF7eifieFgP9f+z9x4AdhzXme5X3X3D5ISZQRzknHMkEgGQBAiCJJizREoiKSpYsnfX6137vbV3n21JlqxEBYoSc84gSCQSAEHknHMOA2Byvqn7/XVBSEzyypZEU9Tt6XOrurq6wqmq89c5p+8d1/Ex8iIWFTrcfNNUBgxoT0NLPdt3H+XlBRuorU8wYGBXaVg+aEOiqjDGpEm1ZM5PAQecT0Eb/ihNSKUSWPt1Xn6YrByPQPZy+8aeNROUlRUwoH8/8uXNbGluxfoAtB7UDgeMQyAfgeY2VZUy4y1YKwfuesDlsssv5Wtf/zyf/8J8pkwfQh8Jon4D2tFfNP3SPjIBTeGuu67jsssup6khycq313LubB2eF8ZxHZIpKCx0tWtM0djQpHp9mS7CWhwh9AHW+K0mgAE8kQ0VZM4/MAeMNBhfTvlTHDlyhk6d21HeqZBszRPX01zRBsW3MkuTIhZv1QYngX1HoaaqjdOnqjWmDTTUtdEgAedLttq8Vqj6KR8/6eNoHCUzcTS0aCI50sICCWFfO55kMqBV/kY/HmhehMjKjUhIQ35eTvo5ayL0rXpi1GWREakZWFLKJ3JacPCDlNrj4LmugFxrIulAysWPhWiq8zh+OCHTZYM0pEp27jhBTW0DuQVRevUrZsioAoaOKaJDV4/swhhpp5pRKI1GW0Gw/it9kp7jEcUshUB8Jz33DQiwbJ9jsSANTEbgZW95jqsNpU/lmTrx0SHi5WgjaUQObhAShRVXeUFYRRjQpnTUqAruvW8eXbuXUdfcREzru7R9OaVlOQQp2foDEQGZ49PFAefT1Zw/XGt82Z7tz4P06FnOwEF9sDu06uoqmfES5GQ5lMrW3CxgamxsoaVVk1PzWJl02ojB/j7rhvVH2bRxN8XF7bnnnju47/5buGzOCIaO6EJBUQjJGQIJIscLcDwoaecwdWonrr7qEkpLOnLk8FkJs/OklDES9sjKgg6donTsVER9fTOnT9bT0gzIGUva76QFnF64dqE4umHboiBz/l4cCCTlfIsg75WiS4ETnDh2jqrqGorb5dKtWynZ0RCBhHBSwGGHIyJTcFVVNfatvZdf2MaTjy3nVw+9zmO/XMzDP3uTRx56Qz6VE5w5HiPV5moHH8GOGhLsvhwlvgAppd27/UHZlCq1ZqVEW4LG2hYioWz69u5Nbm42cWnVza1N1DfUScO2c9FFsllahK+pEaRDC1L8hw47ly7S71aA5VcyGUc1ow/bHW2iAuqqU+zd2cKq5Sd5553D8rNVYadup4oSho/uzPjJHRg8MpuO3QKKyuK4XiuuNoVGJjsLEoH8t5ADFIgKwc8VhUVaPL76bMHJku5CIED2aZPlQazEEWN12mQCmftck4UJcrS2PBw1wijNSMMjpbLkP7Y+ZPwoyGeXX2SYOWsoU6aOJKZNa15RISPH9CA3R3XSorLb0jVmPj5dHEiP96erSX+Y1nieS0qzurx9CWPGDiU7N0yDFn9Cu1LJCUK6H5OgaKir5+SJszL9aTH4qts4WlAO1ecSrHn3ILXVLQwZPJjZV06kQ0UWRnP/AvkYmefQ4kvJvm08uxOGUAgqOhdSVtohbRevOtdAPJ7ECkcrIrLl2+jQsVi7v+DCm0utSVupyBfJ/CP/B7aBNrNSMufvzwErbC1dKCnQBtxI4BrtvBEYxIlmBZS3zxceJDVWBmsaqquG9Wsree6ZBfzswadZvHArxw+1cvpYkl3baljyxi6efHQ5v/r5MoHVGlYuO8fJwymQoMTawlSZo7nk2AkhzdnHJSmAbG2N09zQInNUNsOGDtaGxRUoNWsOnqCpqUEboSKycyIEyms1MQLUXrjwwe946CH7IHZuJfSMJRu36bpUEPhqqh+onouktosDiIz2RK4bEW+0DmoCDh+JsWrNaVatPsGWHceoPF+vjViO/KcdmHhJJ0aPK6d7z2zy8wI8L66aGyBoQgtQlTlquqdrV6GAiIjSFFrNBlfx951GcVu5Aj2glgQ0+3F8rTHHBHreJykTnBN26dGjglxtHuLNjek+6LaeCkTqZ6B15KdUvy6lJdmxj2SH6Ne3gvLCPErzQ1R0VN1GTHBsTfY5S8qfOT81HNDQfGra8gdtiNESSaXi2NdP7Y925uVFqaurkSO6FfsTMzk5OZSXdaC6pp6DB45KUMW1ExM7NKftNG1o8KmuahWIpCQw8rTDdRHWoRUisjk0sVFmkaOdod1pxu0vWIIWaIiSonLtzEoJh7NIpQL5v5Ik/SS5WhilMivm5+XLN1VLc1OzgFEPYcuLKRIXKW6rsKSrzPn7ccAYg6Otd0obk0QiiXEQECDzXGP6JYSiklyZWqEtHiPsZVFz3mHpomP84Lsv8PayjdqcjGDOnEu47fZZ3HHHVdxw/SzmzZ3N9GlziLWFpUls45FfLObZJ9dybH81saaENCgJP9UZWNOVE8GXRuBrd4/uRLwIuZEszY8ojuR2U1OcGs3NQGBSXl5CjuaqFZlIEBsJUOMY/l2HBUhpb2DnU7MebRUlVKQmVEpRi0yab4HAKZVMEYvFNM+TaSGfiPk01CU5dCjJuvVNvLv2PPaXwPce0QZO/rjCDln0GFjCSAFS315ZlBVBQRZE1MSQFkeYEFFydZ1PyM1R77NEUUImgmdcXFWfJgPpbhklvEeOA45uGmMwxiGlDM0hrZtIXOPia33GSantbtRl8JAK8jyZ9mqqtHYDrXbwTYrANONTS2Ca1J8kWL6L/1XVzZw+cpIBXUqZPqKC0iyXkMr3TZSUCRNg1JDM+WnigKbDp6k5f7i2JP0Y4ZBLyDMEWqhBkODo8WPs23cE1wNHHxEBR6PAobqmjpR2Wo42dJqlaP5TWBiic+f2hMJ24vpqmBFdPO21XeX22qBlRDzRkgYfyT8Oa2GfOtmE52SRnZUvp6sWpidWa/Hk5Xt0796BoqJ2VJ1roqUxrnzosOXFFEqI2EYoljl/fw7YXbMlY34zfhpqThxvlrYi9Ui87tGzM3m5URw8PJPLhtXnee7JjezecY5hgyfx9b+4ndlX92DIiBzGX9JOpt1u3HjLML72F9O4864rmHnZRLJzHFatepeXnn5DWncD+IaYMCEVBDTGE8SNnSWulCqfSChMt85dyM2JYGVirC0l824zWVlRzblihXauAAImHIlN5zdt5+OP96UGiqfeIztPLdlrm65kFWWFeELmrDhtJMUXX76allaXk8cDtm5uY8Xy86xZe5xjx88LxJsJTBvdupcwZHgHxk+qYNjIclkGwsj4YJufJrVY/DMiVxRKk2sUCpBsqtUiVXU676/DX0cgfQPSgbHpigk7aWkLCPBUl0Mg0E0JsFU4nSqilJU57N6zh517BZxAXA+kVB9OCCzqi29JjUNzsyu/8QEO7j/IhHHdmDqlA3l5YIxkA2FA46DPzPnp4oDz6WrOH641vrQUu7g9zdOsbA8vZKiRz2nz5l0y76HJGSI7Owf7mrf1Odlv89t5bye+AQoLHfr17ywQKaCxsZkm2b61EQRjF7ld8OiwOSFFnFDIJyK/0v59rTzxxHI2b9mpZ9uRl5uHzWWfMno2Px969y3FviRx/mwdO3ZUo82ryrJlphRqt6flaE9dZM7fmwOW+5bACkhXDn47nnv2HObs2WqNUSEDB1RQUBzSJiJHIOHKFxintsowoPclXD7rSrr0zCGU0wbhNkK5CUwkpWso7+wwaWo7PveFUdz/tSsZPrIb69auZ8+2w/JBBRKowig7+sYjFTgSri61tQ3U19bSrqiY/PwIdiPUJM2pTUjWqVNHevTqguOipxxcxy7PAF8qeyDBy+90KL82QRaA7IzyJdh9CWCfkPDSIPlOSkJZPSDme5w538aufXWsXlPLW2+fY8uWVs6dc9WGFrr1iDBybJl8Nd0ZN74LnbtEyct3iEYNaiAQiP54pzVr1ta0EG91cFCbjItrmaO1XdIupLZVUFVXyfqNB6mqSYIXUt9ySLpFAt1cUm6YNpn1DuxtZNeOk3Tq0o4xE7uTW2zwHR9XmiAamyDw1An1SZ+Z89PDAefT05Q/bEs8RxM1ZcsMKCsvpKAgB8+NSquppLahmbIOYTp2KcH3I9TX+JyritFm/4eC3am64IgzpaUhsrJ9Dh0+wNo1e+T4biNIGYwWtaMF78hu7hGVgMkj3pbDvr31PPv8SjZvXSNg68o1186iR48yjMpMycSYSKmOpK+68+jarZw8geM7b63j6AG7g3cJAnRIiGkp2qglJWTOfw8HfGW+SGKgMWDkswhok3BOiowAIiGt6AQnj53VPUNWjpHp1SdhnzOBlXEYJ0GZbFadO5QJHARMphEnVE8y0Fh5DWTlxQgk3BLSyLPzkZkpX5uOYgn2Bt5YsIEjB6tUBjIbpvAcT+SSjMMJ1XnyxFHs785ZQS+lSqblZuxXDrp27USXihIsYAUmJrmZUuN9AZsvGAj4uMNqhTb9Ymhz+tg/CWALSGh+kqX6QgRCJk0/mq2WdMbRxqiJ9evPsGVbJcdO1xNIFWpfkcuAYQWMGF2uPpVSIUAqKfXIyQ1wxEdDQtW1EcgXpMgHTtuGD9MHMvw7LoyBpBp76mQV9bUxUkmDZzwc/RkviRtOMf2y/gwc1Is1qw7JDHuS0ycCWloNtfUB+w/GWLepkRdfPchLL24lJ6uQGbPG0rtfkZ5tAdMqLiUJtGk2VqkPAAAQAElEQVRwND5KIHP8J3PgQ9U7H7r+zFwmUy4IPNrajDQkj3BWirbWKOfPJbWraiW3PGDMJf3Iy+0qc0aIo0drSQQSQm6bhA6Es2HoiCLGyAxwpvIUD/7kaR784VLeWV7L/l1tnNDkP7a3gZP7GtixJsbLTx7jH//+KV566QXalcOcef244qr+ZOe7JFJ2McSJyDDvh9rILnIYNboP3SvKqD15hsPbD0LCu0BBVMLIRfvAz8xYfGId8VVTSmTlp4AgLUetpDdNpKiVea2e1rjPufMBxw4myDJ5dOvWnpB8GG0JV3myaE2lqG3bT8zZRn5RHUV5mkYxjUmimMAvwHPzcB0tG/kZfWnMjqv6bL0BZEUKSaU6sHn7KXbuPQkeRKIOLoaQzEsnD51l9cqNNDed1bxoJFoA9jfeTlU2qewoPbt3o7AgjIkkMF49OM2kjI8JhTDGUUUfPS0YJJNJbHjhbsAFFriazyHNvTAJX31T/c2tPnv31bPu3QbWLG+ShheT4PdwnAidBUpTZpQycXoWQ0Zm0btPO60No/4mcYzaE8QvhMQuhGrXhfoufNoXfj5M1sdn037Ttgt5f9unzWfp4v2qqmb27TvIgQPHOHminrSFwYgPTkprNEnHznmMGzMIJ5nDkte389CPVvPLn+3kpz/ayA9+8BY//slbLF68h9KyEq6YPVxA1h43FNP4tYniGMGTY1CoD/64h+2XHSfLExv/49b22ShdI/3Z6MiHe2GMqyQHmfEpLHIpKomA8eT0diWgEuTmh+jctZiSdu2prWnj2NHTBOm/uBZBioQWfHFJFpMmDWPEqKE0NjXzwouv88//9Cu+9a0X+c63XhI9qevH+fY/Pc4Tj78iJ/JhevTsyDXzpzN15nDtNh28kCHkRXBNDo6EgOOmsG+HDRrUmf59utPaGJMT/QzJWjBOAYHvkV4q6Q8yx7+LA75yCyV0aiiFKrrUmRRK+RJEWZEsHCFG5ZlWYjKjDR3ZiWmX9qWk3CUprcDXQ27ExY2oAF3X1zZTfU5lSrAn4640qIjGx8VobtnhcV2HrKwQ2uCDEgoLC8jOLSYcySU7LwejNAQVypbWmmqr4zSozLy8KO3KssCF6ro2Tp2pJi4VynVdtQCQ8EVtDkiq1eDbgozSf8vpCCyNuZjBUa4QRpq9JDhJaRx1Mnnt2tkoX9Ix1q2TsN9zjubqJO0Kchk6oCOTJ3Zj3NhyyttDNCrh7cXU7ITaHMNPJnD8AFcahqu5eYFCGJnLLPBcJFWKMeYD9P522Xy/i1C2+S5SdXU1NbXnpVlWcfr0eZIpOy4Ojuqx3yWT25ixo7tx7ZWjKSsIcfrYMTau3sRBmWyDVJJuXYu4+tox3PG5wfTun6O1qFaqCCzjNQ+MHUeVpdRP5Hw/Pz6RCv/EK3H+xNv/W5tvjNEuNple7HYyh0IXutranOLMyXo83e9QnkupqKm5ijNnTpOSlIlJSFjh4Gun6LqB/Ah9uemWudxy69WMHN2fllgVpyr3cejIdk6ePqCFc4Ko/BGjxvXg/q/M5y//y+1cNnsc5eUFtMmZW32+hUMy8Rw71ESsJax6XVyZJTp0CtO1WxmxhGHvrtMcPSh08nMuCD+1Ws37rX3L3PgtHDA+kqSkZY+rPI4IA+lfo48qOYvzZxNs3XSImvoDDByew7hLOpKTJwEcasX3UxofQ9fO3Whf2kdmvxb27KjBVTkR7W0C3U8ktGuXoA6kjSQ1X6RoIWzAjpev6qNRsF/q7dCxCMl04rIVqgV4npqhhNbWVmnQIdqVFqSfqays5/z5SsLy4+RLawqF32szeiBN9vq3kzFG5Zh0Bl8NSMl056t9ba0pTp1sZfPGapYtOcn6NWc4fLCFWGuIwvyAwYNCTLkkl+HDwvSo8CjKM3iB+i9Q9PyEanbJjuYQCWXjmTBGJkLjW1BSXPw0eBhjRKTJAk8gLfWjFKTvG3MhL5rbF8nmtW22ZOOWEokE9nAcl8LCfDp0KNT4hMjKcpDVEaO+pevGUbmB1pnLNfMq+MoDl/D1r8zkm39xBffeO5V7vzSJL391ArOuKCO3KEXKSSLW6BltMIIcIFvkinQa0SdwGmNUv0nXdKHPQTqe+fh4Djgfn/ynn5pMBtiJboc/mu3Jft6bTp3KaayPsWPrcWqqAwoKXQqLfZJBk4DmFCdl307Jp4R2zVbIWIDKL4wwdHhXbrxlGt/4y1v5739zN1+69ybtxq7hi/fewle/fhdf+4tb+dKX53D9zeOZMLknpdoVax6SlB1iw/rd/Pj7T/LoL9/krISFi8FPxdHak9aWS35hO06cbmLDhiO01AU4jha/SSlXDKywJXP8bhzQSItvyNyG6yMkukDipEOuPvNobTKsfeewfBQbpUGfo3N3h9KORkKrkbC0FbuJsePWv38Fo0ePpq62jldfWcW61eeor0sQEsJEwxJqflRjGMUJQtjffAu5cE4a1qHDVXghn0FDetGpSz6B/qyQDSQVk7LTVlc1qpx68vKzadeuSOY92L/vDKdOHZe2lZIQ9nA8JLvtsowoEhIZkfqmz4+eAba9adJNg0GKDmfPtsmPdDr9RdkNG05x+LD6Fy5g0KAejBnTmynTujNsZAH5hQaLoPrE/mJFEHNINoeoO+9z7mwrJ47VcehAFZXSNNuajfrqvI8M8TiiQFpooI2YT3PzB6mpKSWfm6884PtGZMPfkOWLMbavDjZuyRgXY4zWDnSpKOXWO2bRq3d3LFAhfiJeGgET9jmjljsJcotb6d3XZfioAoaPLmL02FKZ8HIoLGjDOE16pBHXjWFIihyR+Bq4oBgEXCAFf8TTGIMxFygIAvHCT9Mfsco/+aKdP/ke/JYOGE1g45j0vAvJVDN8xAC69+hMY0ML27cek/YUx1XvQ+EWjNvKnt172br5gHaKudjXwh0Jq0CTObBmGQmMkjKPQUNLmD6jB5ddMYA5MiVcdvkIJk7qx+DhHelYEcWLpGTfj2EFpOMFhMOu6sji8KEq3l68nY3rKmmoS+KZAFfUrjyfThVdqNei3rLlBGdOtYFxJPiSancrqG59ZM7fiQNGuSRojHgngYUFKJukVEe+x7AJ01SbYMv6vXKcn6Z9WTHtO5RINKVoaWvRbAlpZ+5iNw2dO4eZfWV/Ro/vwYlTO/j5z57h2afeZcuG85w9FdDW7OApo2scEq2k/5fT88+sY8FrK2iLNTFgUEcKiyISsAFhbfdjGtaqczF27zqIrxrHjR9Dv4EVtLUEaks1DY21AiaHnAIP4wJpwRlWxJKC9DxQ32z0A9Qiod5GPJ6URhRwaG8zK5dWs+TNZt5a0sjq1dWsWXOK3XtrNccCahsSHDySZP3GVhYvPcfTTx/h2WdP8Pxzp3j0Vwf43nc38C/fXiez9Tr+6dtb+Yd/3ML//qdN/MP/t4l//PYOvveDgzz0y7M8/MhZfvHwMR762QF+/uA+fvHzA/xC8e9+exP/5+9X8a1/XMd3/nk9P/zX7Tz1xCleePYcj/3qKI89ckLxKt5Y0MDby5p4950mVr/byDsrG1n+dhNLlzSwZEkdL798hqeeOsjzzx9m395GqqpaOF+dUD8NRnwPcH7DBceAo2vP4ETA1bh7bjK9xiJOiGwvpLglT2vOYNlrSU+kS7Gh4ZM9jDFqsoMFqaR2LTYkc3yEA3ZsPpL42UgwhGUj0UYLS0XtIrQrzyaaFeacHNBbNu7TwnYlJHrSs1eZNKl6CYpmkvGIFoG2hNqFO64hkDgxmvBoBhtPnBF5EYhkG9yQ0V3lMAmFklJOq9JiuOG4Jp8WiO7379ebwf1HqfwEK9/azokjVVKIjMpN0aFrFlNmDaO4tJTK880c1C410YyEU0Ag0woys9iJa0mpmfP/wgErvn2ZlvygDT9oEY/jpHnng689Q/WZGJUnqnF8n369BtKxrAeksnCCQuXNFblIbuAJE/oNivL5e0dz6exeNDTVsPiN9fzrvzwtgfsSrzy/hWVvHmDBS3t49cVt/OLnb/HU4wupq2nlssunMWBwBY7miWMFp9qcSsGZ0zE59k/iGIdefTtTUhzFTyTlU2mRQDVUdGtH54o80nNMpiv8LD2phuAoVAfUOkU+dCbVvxT2u3yxVp9tm46zfOlOVmierV+7l907j2pjdIzjx46wePFqfvCD1/jxj17m4V8s5JcPL+aRR5fx/AureOKp5by6YAOr3j3Ainf2snPPWXbtPc3xk3U0aj6eqmxk1ZrdLFq2gVcXvsMzLy7lqWfe4qWX1vLGm9tYufIgGzeeZOvW02nauescO3eeZ8PGY7z91m5efW2j6lnD88+v5ZlnVvPLX73NTx5cyg9/tIgf/eh1fv7zN3n00aU8+eRbPPfsOyp3Ha8v2Mibb2xl89b9Mp1XcubMORobk+q/K7I8sQtSUcswR7xyoroQv0xEYxjBcSK4low2jSYHV+meBsV1DDovEOBg0mT45A5jDI7jYA87Py3ZeIY+yIELHPpg2mfiSuOPq12rNk4KITsHKioKBE4e9tXUQwdPKY5Mdj3pN6grnpNNfbVDQ61PTlYeGBdHJLGG40g42NkrskBnk42DxEWgfD72vpGmhd2xm5jSYgKrmO4n6dwpwthxQyWM2rNv9zEO7z5D0OYRyMyRnQsTp1bQf1gPztXWSICsZ+fWc5ggC8/NIVBlVtiSOX5HDnikjIsvc2hgEgTaYAiHsJrLmeMpXnh6DccOH6V3jwo50sdQUlSkXbVHNJyPfauzqTElMxQIM1QG9BxcxBe/eiVf+/qdjB45VhpSPS8+v0jaxS/5f/7nz/nnf3yUp596U5r4IXJz85kwcSxXXjWZTnLES+ZhNF9s/fhIY26TJgXFxcX06NGRcLbqSQgb4y5lZSWMHtefsk75oGewR6AJJj+PjSqXgkD04dMKYoeU0C8r16H/4FKKimPyH9XQsTRGv14RxowsZcjAAgb2zWWYwgG9I3Tr6tKzTw6DhhQzZHg7xo7vyKwr+jL/hlHyr47ltttGc//9o7nnniF86UtDue++4fLjDONznxvE7bf34fbb+nLzrYO45vrBzLm6LzMv78qMyyu49obB3Hz7KG64ZajCodz5+THKM4C58/px3Y3Dueqafsy4ohtTL+3M+MnlDBtZTP9BBVp/+fQdkMeAQUUMH1UmPnZm2oxeKrcPMy7rng579ynEvtzkiJkGxCbHLkD+lA8LUJaMsT36U+7JH6ftGuE/TsH/2aW6bghjLgy6NbE5ns/Qkb3p0rWUttYkzbKHS/pTUuoKtEpw3GyOHGzg4J4GIpE8At9VFzwtABsqKkGHhN5vSNthe63FAmJjoLw2VFZkDkTC0eZ1QtCvfxfGjR8lc53Pnm2naapDgOkSUxHFHQx9hpTSHG9g/YbN8m/spK1B0iwRwaRcjP5Il5n5+L9xwMdVliiBhHqgz4BUGhDsV3KOHa6Tr2krOdEQl0wcyugxXcjOIj1iSng84AAAEABJREFULc1xlixaxzNPLmLXjiM06dpuavB9cvNcxk+s4LY7L+Evvnk7D3zlTq6+9jKmXzqWmbMmSOBO54v3zeW//c3t3H6XgKl7GG3YVXsK4wTYXXpDfYL163dx6kQlruPQsWORVYo5esQXKAaUlbdTewapPZpDfoAe/g2lL1Lql9L1+cEzpEtXc9fRfDL07FvK5++exv/4b3P5X397LX/3N1fz3/9yLn/zV1fwza9O46//8nKBqtL++1V8879cyTf+6kru/8o0vnT/ZPlQR3L9Tf258dahXDWvL3Mv787cK7ozXSAyc3pHrlXaTfMHcPP1g7jz1hHcddco8WS4fELDuem2Qcy/qS/XXt9HINSPudf0YvbcHlx+ZQVzrurKvPk9mX9jPwHWID0zmDvvHsE9XxrHfQ9M4YGvzuS++y/lC1+ayue/cIl4OF5ljuLm20Zy482D+Pw9QwWEQ2U+70FuLlqXca0I8UJnmjU25E/zMMbgaD6QOT6WA87Hpn4GEh3Hfa8XviZAEjeUokevIgYP7UEoFKK+XiaecwkKiyMyqZSRl1PCoX3VbFh7lCaZD1IpsUYOb9ICT/H0SkipzIsUKG5P3fM98COikBJ0rbyOtC35z7EvH3WSD2PylMHk5uVwYHclR/fXWLmHCcVJCTT7DS1n0tQRWEm2dfM+aVfV+K0uxrgqL3P+rhzwMYIjT9sFS2B/ksq+FVWvzcCK5bupOlstbSlP4JBHQZEr/oMd3ph8Nls2b+Pxx1/gu995SiC1QXOhCfsCRSAtNp4MKGpnmD6rK3fdM5Gv/sUcvvnfruGr35zDTbeOZrI0gUlT29NnYC6hbF+FxvCDGK6mgpU91dUNbN64k/r6JkraFZFf6GqOBaxdc5RjR07jyV9SVJJNYNpE1nSlIuz0sqSoeqJPW66C959p7crBmAAjIIxEApmIw5SWRtIae0VFhK7dwjIXRujQKUT7jh5lZWHKy3XdwYZhafQh8gTA9m3EUCjQ2gjkK/UxQZKQG2B9o47My57lrDZoro1rUxYJ+WRlpYhGU8ovCqUIhZOihLT+OI4rkiXBDenakhsjEk4RjfhkRS9QTg7k53kUytdWVKhQlJfrYt/Mi4QcPJnFw2Ej0CZN0hHVLh/jOyDLAz4QiP5ET2OMxu4CWdOepT/RrvxRmq1R/qOU+59eaKBJa18NDrTIELlOikiWYeCgHpr8Uc5JUG3YuIt4so3OnUvp0qk71efjbN18mLOnm7Qow2AXgExrpIWAudAnLUzevyLsvYt5Aj3zngYVaBFb7clogVvzXbuyCIYEJ49W8+7bOzh3RgBFi7SnRnr2ayfzx1T69O0jP8Fh3nj5XWrONYEmLzreCxTLnP8WB2TdIpmyo+PgK2PCTxKL+ezcfpJ9u46Tq4Ho378nI8Z0FYgkIRwn8GLk5jmMHjOcYUNHa+xbeO2ldTz5yDqWvnaQY3ubCExAKDeBm5XAicSI5MbIL/bJbycqTqqsGOHcNrysFgKnTcDUKlNbG3bG2P9ye/5cSxqYevboxfRpl1BQnMPxU6cFTpvki6ynpLSIcJaDkSPfAg2BGm9JAelSfn3BBw+DMXouTT44AY6bwhFQGC+la5Gu0dxPA5wFF91zvQRG2r3rJHFEnur1lMdSWM95XoDrhpTH/TWB4k4IjIeNO1oHnokTcuIyjcZ1V6RrVxaDkMqz5Flw0py3YTiU0t4rgUNcZcZxlNcR4Jk0+UrzcVWmq01dumxt2kKuL79xCldtczWiIddRHtWfXm9G7XjvDN4L/4QDYwzGmD/hHvzhm+784Yv8dJRodyFB4EtQWELr3RDR2ho4qD25+S4nTx1jwYIlHNh3QrvJEvoN6Ew42or9NQj7ZUlXCwETYHfeRosGLY5AoTEGX8gXiAz60zVa9EGQQFYgCLIwfj6J1gIaqiOcOBJnzbvnefvtTdTWn6Ml0cCh44epqqnFF4AFQSy9o+wif9jYccPUhhw5pXeyY8tZ4s2QShhpX76Y6hMEcYWWEgqVZhelJUWV8Gd8XmBC4KcIfB8TuBhpsiaZw6nj9Tz51CvUN1XRqVsxQ0b2oHP3Ygi3QqRem5PzmFALU6cMk1/lRr785VsZPXogx46e4FePvMx3v/eU/Exvs2PbIVqaE0Qijnb0vmZDC4lUvUR8nTS0elJBM4lkC+m3rzQnjEAhkYzTWIM05WaSMZdBg3oyblIPXO1hdu84xskTR8iT1tK/X0+VG8aXSS/QRsqCDA5oeilwRRHAFX3oNPba0Ye9Z0NFNWdR3YElCfXgItlrkb2H8rgEKvE35Oj6/RSoD/8WoaedD5Gr6/8b2Wd+k8eob5ZQeIFcUCkXyCh+oU1G9x2MH9L68kSOiN8cNuNvrjKxzwgHNMqfkZ58pBu+UjRrrSYThOTvscsR7VI9mWgcmlur2LR+H8ePtJKfl8uk6d3o3KeFyvO7OXcygRQqjHaigcSPESghcWQESL4VfumSHQkTI+BIELjScrxG7UJ9Um1hzhyNsH1dwKvPnOKhH67iR997jeVvraasYz6XXTeWa+6aSrfeHXFNFk4qgqOmFubB6LHd6dqrOyfPtvHG4mMSiA0k2gz2n98F2mEG0rRAdaXDJJInqFkXyMpnteuzd9qOiUEXO2YvLV28TjMgpasknsxiEe3ktVmHWBYtNWFWr9zHth3baElVMmRsFwaN6ixNx8GRuSgZtOEpdE2M/Jw2+vWOcM21fbj3y5cw77ox9B/Sk9OV9Tz6i9X86Nvv8Orzuzmyv5l4LKTdfATPdUimAuJxV2Mgk54pIkjmkkx4hDxIyql4dF+MLe+cw41n06NHPgUlrsyFCPwgmhUwYECRQKsb4ZDAKYhg/3klXgy8JMYEOAJaN4hiJJ75yOErxc5xS47impO4mrGOZsvHU1LlBCLSpHYrPx8iez+lSflvkW+f9yPq9+9DIT2vdqfNdB8NHaU7Wr+O7ymf2qprLAVGfbVnSh+WAoWZ87PGAc2IT1+X/hAtMsZgjIN5j+ybd62tgUw4WUyZOpKKru1pa0lQX+OjrAwe0pkhw3rQ2tbM8uXb2L9PYKNnXc8h0J/jOGqWkeAJlD+E47g49sG08MiVYCwk1hxmy8bz/PKhxfzgB0/wwguvSAt6S7vqJubOu4S//C93yAl8NWPGDyAqb7xjsqTN5Uk0uNo5Q8/eeYybMJjyTqWs37SFV19ZTk11k+z0Hsm4AdVF+gj0qUVpbKjoZ/pUv3F+00N7aUljgkQwEsWk0SghQHAJpGkmY0ppc9i84ShvL11DUo6/jp1LuP3OqXSUhprSs0ntwhPxXG0wBCbxEL6EoOs6uC60b5/NFbP786X75nDt/Kvo3XN4GpR++bM3+eUvlrHmnWOcP+Pj+EVEvRKNYQF+0oKLi6MyHA+1zNFHNju3nOH44XMMkDmxR+9yHC/g8KG4fE1xcrKyGDW6P127FuPqGS8cxuh50n3S+KrXtqsmLYxtTAkfOH1dBaL3nzaf6saGv4XsPPq1OVp5bPkfIFueLfvfog/Xa5/5I5Oa+pFu/ZGrzBT/n8cBO4v/82r/I9ZsjMGY3xAGwhFDfoHDjFnDGD9xFJGox759+6k630JRYQ5TLpnOqBFjWL9uK6tWbqS5MSkzkSPtKKCtVdpUEjw3rPQUjfUSgBKCsWYJm10x3nq9ih9/bznf/+7jvPnmAo4e30RJhxi3fm4yf/v3d3DPfZMYPKyUaDRMS6PETxwJU0OQctJvbLXFAvLyDbMuH8BV8ycQ98/w/Asv8uMfvJr+Fw4hSa9kIkSg3TW44pwPRgJM2l36kj+nQ/1OC3Br3tSgpOOCHAGMEX+ywq7MebW8vmAZO3ftoqe00TlXzqC8Qz52HiRTRpuJKGGKcIMCjF8IqVxcbRbwXYEZ0mQMXbpG0m+uffVrV3HrrfNoX9ad9asP84Nvv8B3/r+XWPDiAQ7ubsaPe4JPgzAPN9QqoGumtcXQWBuwd1clrbF6BgztQN8BHbQJMezbc5qTRxrkD0vSpUtxOi0Wg2QyJV+V7Q+/4+Eqn+rViSVdOSJXrXH57X/GKPO/QcY4/8bTF8p1lEfV8Ecnow457yNX8V+TbqTB3GZSeub8THFAo/uZ6s+vO2OMwZgPkhcJ8CVBSkojdO/eHsl73l6+QmCylkD2/t69ulBQUMLZyvPs339MYQ2e4xD2woRCETzrJDauNJkQtTXNrF97lGefWsM//D+v8L//7jkef3QhlZXnuGTqCB74+k3c/9VruP7mS+g/qBAvBDW1SdauPsqiN7ax8q29bFl/ivOVrYS1wMIho7ZB565Rpl7aU0DWScLO8Nory3h3xR6amwJcJ6I+RdVHT2R3rm0gUxZyLmPsNZ+9w3brIqV7dxGYhO5pjckKc5uGWOCk8frs6bh8fDvYsHEbOTk5XH3NTC6/fKjAADBiq3x99TUJgUeK1vqAuvNw7nSCylNtVJ9vpbWljbPn2ti5vZbDh2tpizfSSSAyetRoKjr1oa7GZfmyvXz3W0/ywnNrOHMqjqNyHdenNXFWdbSSHc7nyMFWDh08hyNTY0X3XIpLwjQ2tHL8WJ02Ox4dOpRTVp6LY4UtFw7XCSliExyF/7dTlX5MFpv6f6OPeewDSUaM+rfpA9k/mQujaj5AFy+Unjk/cxz4XVbAZ6TTknBBgtZ4C9EsJBTyBUT5nD17lu3bdtPY2EK7dtmUty8n5cPOHfvYsmV/+pVf+xaYMRcEhv3NvlgsydtvreEH33+YJ554ie3b95CTm8Oc2TO4974bufNzc7ly3gRGju5FaWk2iRgSVDFefWEDP/nRi/z8Zy/w05+8wHe+8wgP/+Il1XVCu2bS9foGevQpZO41kxg+YgiRcB4vPL+IxQt3EGvRUGhnj/b8aG+LgBZalSiQkiFJkc/mqaG70DEb0eCk+5oiEMhcSHcVeGktdM+uRh762TJeeWkJ1o8zZeoEpk4bTla2wbw326uqqgUq7/DLn6/l6cd38suHVkpDfZ0ffu8Vfvz9l6X9vsj3//UZvvMvv+Bff/AI3/nuz/nhg9/jrRWvUFNzlpD8QyEvR/W51NU1EIvHQGX7phXXbUrHm+pcXn95n4DodNqU2KtPCXYTYb/8ffJYtdqWzYiRgyjvWISrvYaKVH8C0g+nx9YonjkzHPjz5YCW1J9P5wOZf1ztbpN+ki4V7WRS6SItKAsLTJWVMQEBDB/Wm6KiAvkETrNi2WaOH60kEfe1606SSCbxpWG1ysR36OAh9u7ZS35+HlfPn8Y3/suVfOWbM7jymmF061VIJCslE02C6qoY9hehH3t4Dc888a4EWy5jRg+nU8cuVJ6p5cUX3uD73/sVr7+2ivq6NpJCwlDEZez4gUybPlFO9O7s3bufha+/La3rELXV0hLkMwgC6+MwArQkfiDhmAaqz+BYWnn9gW75uvKxJjD7/SRfznLfjxL4WTJ/Jli2ZCcLXl3GyZOnmDR5HOCMDRIAABAASURBVNffeKk2HFHiYpsXCjDGp662Qebcwyx6cwWP/OpFXn5hEcsWr5WPaq94fUKbhUO6f5S4NiFBkMSLNNGxq0uvfgWMGFsh/+E4+a+u4IvaiFx+xTiKpYkHJqYRaEiXb82Dhw/EWLd6l+ZAKwMGd6RzRaHMxw1s3XSYo0dP0rEiRxpyf21q1LaENiZqH9bvgwWlDy1Lm6ReZ85PDweCIMDSp6dFf5yW/GeW+qFV8J/ZlD9+3db0Egp52qk6lJXlM3LEKLKz8jh+7BibN++hsTnGwEHldOhYSFNTjD27TspkU4PnOTLpOQR+Civg7P+CGj9xBLfedh33fPEGbrl9PBOmtqOsgyGSnZSMacEKtaamJO+u3MNDP3mNJQu30Kl8EDfdNJf7vzyb++67mi/cfRvDh46R5raf5597XSagk7iOK/HkCyCzuXTmUK64cpJ8Jl3ZuXM3Tz7+Gtu3HJKPA5JxVzt3a+bLwpgwfx6Hr24GIqQFeRqTXGJtIdpaXJlHkyyWuXThwrdpbm6UVjKEGTNHMXBwOY40E6stBxiMMZSXl3Ll3Gny702ifcdiUtKoQ6EQvXr1ZfblV3HDDTdz9+du5p67b+Kee27kvi/fxjf/6m6++o0b+dwXLuGWO4Zx7Y2DuHxub8ZM7ExhsQuOtFdHYx/kgvxXjXVKkrnWAtPY8T3JluZmTYdbNhwTcB6lWy+P3v1ykMVYGX2ME+CFPLVPZVk1LE1GHQUUkDk+VRzwfV8bj5TWefCRdgUCLnvfhh+5mUn4nTng/M45PwMZ44mEJlNSJhWH3OwQs2cPp3//3tTW1rN4ySK2y5RX3jHM+InDaF/eSf6HGEcO1dMqf48XcqQ5teC6SaLZMPGSoWnz3axZ/WWGi0oni9Eca8K4gbQjD8cJE/GihNw8aWYJ4nHo0b0nnTqXUNYxQree+cy5cihfuOcmhgmgzp5pZP/eE6S0i0bSyDg+XXtEZB4cKqf8dPIL8mVm3MHLL65k0/pK4i2B8nq0NnsCqSzAE/05nFZSu+JQmFQyhJHmFNXmYeuGk9IuV0obPc3Q4f257Y55DB9ZQThLfJJPzrhgHDT+UNaugEmX9OT2uybypfuv4ZprZzB4cB8c3d+xfQctzW2MGN6DSyZ1Y8zoLtKme9CzV0c6dSmgfaccispD5BUZcgs01pG4NiNtKtyXMS4HL+jIyUMhdu08RU5ewORLezF2QmdSGv/jB3327KwTCCXpM8gjOw9C4RSuF+C6BmMMpEHJeS9UkDk/lRwwxmi+2HHi18f7wcgY8+v0TOQ/xoEPcvc/VsafzFNGC98PpAEFF4RU14os7ZY7aefss3v3NrZu3UFcprurrx3PJZdMorkxYMO63ezafQpZ2wiHjUxoTaT8RvIlnNp3zsKNGFJBgEQgkUhYpqCAs2eaaKhNEfIMQ4d2FfUj4Z9ny87FHDy6FV8+k1AE7I/RDhhQyrAho2WmCrFVPq5TJ2ulFTnp+pLS1Eo7eMyeO5rPf+4WBg0cyro1O/nJgy9JIztCkDDkRKMEfpggbRLiP+/4Y9Vs17ilD5QfAvXZ0VhGNSY7tjTwygsbaaxPMGzEAK6df5nMot3JyXfwTVLCP4bvtwkUfJHRJiNASEJ5hcuU6Z25596Z3HrHbHr1rmD3nt089dTzPPTQUha8dlwmvmZtAAQeBm0CIJkC3/q6pCmlaCHlx3Rt8FPZmKCQppowC1/eK5/WIrxoIz37ZRHJhiNHYmxcU0eyuYjJU0cxYEQWTiiO4/o4ni9gCj7Qww9e/Fv3Ppgzc/XJcMAYozEz6cp8aVHvp3Ri5uP35sCfFTiFQlFcJ5rexWpuSaB4EviD6NmzF4lEG/sO7OLgoRNUdMtiwoThFBW0Z9PGHax4+13OnDmPfRX9wr9iaCYVNAmQElhNyY5CttQphwirV27n8V+9xvatB9FmmHbtPCZP68/k6X1JmiOsXP0Su/fukJBLqAwEaFBSkktrU4q9u49z4lhN+jlPD7teCkxK5sIwl10xjOuumydNbzgH95/m6aeWsGzJPuprQRYhCUY+24ex3bsopB0JdUNcCsvKt8/ww++/KX/RUfr3GyZz3QxGjelJOGpBJA5G2q5ned0K2hQEPmktNuUnsG86mlCSEmlCo8e1k+9wjMx4t9Kndx+WLlnFd779ID/4wTMseuMA504pO+BoxQT4AryUxs6IooTdLBUdIdbsUFMZsG9XHbFYwLRLRzJyTFda2pq0mdjDjs3nKW/Xj9lXTqBLDz1CNQg8LeoFArzANi4ATSx9XDw/knDxRib8T+SAMeYD4JTUpjalHawFqSAI0veMMf+JLfzTr9r50+/C79gDaRbJmKGhJkZTQ1xCBQkww9TpA7j66ulk5+awddsOlixdS20dDBlaLsHSR76nFjZu2MvGtQeoq00K3CLIwidNJU5rW6tAJilfVaOEUZLD+xt44emtvPnaPk4etWlqmwNjJ3bUznwmQ0f0ol15GDfajP1ZGbsLdz2w/oiQgBPfEEhbcjSnrZxyXFcaVIpY3KewxAjkunHd9dMYOXIwp06e5kc/fJrHfvkuZ08nkVKIL4GbTMZUqa94SmTDgFTSVzxAa0b33n8GuvBFKZHKSL+aLYGOJVuOBPgHJaXy/QdOW837KV2ErfMi2TakEz/4oWfUanySaoXtgyvBLS0x6SB5z8rlB/judx5n/bp1lHcoYuy4vlwxu4/Mb2EcF2lJYi5Gfw6OUMX2P5kK0psM4ybEkzjWfJpM+Xhh6FThMffqXvzN317H/Q9cL/NgD44d38MTjz/LM0+/w7bNVVSebCEZc9LtjCca1LYW8dUHdaWpFja8W8vBvSfJzU3o+fYUFIaoPHWeTet2SrOrpVefMnr3LiAsU54FJOzAqZ++H6g9Pr5tpEkXn/n45Dnw767RGIPneYTD4TTZuJ1r/+6CMg98hAMXVtlHkj9bCYEkvS/VO97qU3e2kZqqepnvfMI5UNbFYdDQUgqLi6gW+Lzz7h5pUDW065jFNTeOEUgN5OjBZp5/cjNnjhuMyZegDEvrAseE5ekJCVxcolGPVSsPsGVNGz07XUa/XkMJRYBwTGDUSr+BHZg//2rmXjWbbt3KNZFdlRVIaEKNALO5pYGo/GD5RVHJuUCgl5LQcwWGYSJhBwwUtINZsyu4+bYpEnKdOH3qDM8+vYQliw4JoFpIpZICyThtbRfItzs5Cd6kUDClUJJdZUoSYo/3hzaeUqIFo7hCC0yW7LW9p6Tf6fSVy5ICe9pHP5YuJtq8F+NqnQSzhkq8DUglRQISP4irzS1KS5HQ5sIXVR5P8PJzO3n0l4s4dPAA5R2jzJs/jEsv70R+IRixS7iu5zwccvBlAkSUFhrSRB2pmo4T0jhGlTeETbf/w8m4EM6Gdh3CzLt+KH//z3dz/9euEfBFWbJkGd/6x8f50b++Ic21FmNCGFc8CupIyWRoAtguzej5Z9+hsnIvFV2NzISF+EmoOpWQRnxMvkmH2fMqBFhhmWSLpPEW4hBV/RFcN4TreoproHn/Ya/VofcnZeIZDvwZcODPZ9YbI8HdJk2olsbGKpoaG4gnfCS/6dq9K9OmTaW0XTnnqxpYu3a38qUYNLgzAwb0pqUpzj6Z3DatP0JLY0jTIpeEZLijMiWTCIeysC88VJ1t1nNx7aRcIhEH3/i4Xj2J4CxZea0MG9meIYMHEQ23I6XdfzRqJMhSnDh5jvyCXIYO6095eQleyGB39IEAlYuHuRBxwwjoSpk7bwpDhg2gru68wOltFry0kcN72yT0ciEZxpXQg5DKMYQjEArFJVBbJJDbVFAgJFCB0iaReES5lUPpyijTJOlno7pWZRiFv+vpKKMlBfa8+KgN30+23sBTGyy5ynnhGSMJH0hLiqdaiaea8INWAmmSfiqMazxirQF7djfw+oKtPPXkQg4fOsTAwb25/obZTJ85mNKyEMIzlffeqW5aTSRQfcZxSaVvKtG2JVC96TbYC+VX3emu6lJZNQZQVOww8/JR3HXPtVw6c5yuszWHmkUWtB08J4zvu8TafBHplyAOHtpCcSnMuHQiuVl51J312bbpiOZFLT17Z9N3QFibEHCdbIyJcOEwF4LMZ4YDGQ78mgPOr2Of6ciFxZ/yY8QTjTS31FBXf56W1mYJF9I+n9tum8f06dOpPl/D6nfXs33HbgolnIaN6E3v3r2oqm7k8cdeY+2qg6QSEUJeLkamIivIUlI6tBmX9hQmmWySme8c9t81IHBynDYi4Ta8cD3Ga8UEUUjladfs0FAHK1fuk1lqA57MPGPGDqZdWY6EaALXS0p4SZDaEXofSQkiK8dh8tS+PPCV67lSIHXy1Amee3INP/ru27z95klaGxxpdAa50bAaiDX3JXwr7OtwTAvWx8HFQ4KbNKkSCVr8EBdIwPR+4X0x/783TAt9H8SLC2SZheqwpHFJ161Ql+nTJKQ9xMWPJF4oIXASu+IhbQoMG9Yc4aGfvaxxeI5Tp48xauwQbrtzHnOuGiVTXoRAXcAW9eswhUlrSo744OMLnMJeSDxQpnS9yigWgz6UhMgIs6TEoG0LCZlDc3LDjBjVQ9rqpTL1zef2z8+mt0xzrqMyU1GSqVzwIxw5GOfw4WqieQ1MnTGISZMHYVKGxQsO8e47e+jSpYwhIztQ0l4VyL9k0iPkkjkyHMhw4OM5oNX58Tc+e6k+0SyX7DwJBAFGS1stLa2NSILgSza1b59Pr549SUqbSn/p9c1FVFfXcMnkPlx+xWQ6dugq01kbC15eR+WJGJFQjoSowbhWAAaKIz+Dh28aOXZyH6fPnsGo3EDaS8pXuhWGVvr5DiHjShszrFt9koULllNbW8XwEQPpP6iCSCTQ7j+u8lIYh/cOFYSvuI8bCrDFRLJgxOgO3Hv/HOZdM0vtaceG1Ud59OFlonXs2tFAW7OPg4ujHb5Jf2nXAfuwbdhFsoKZ33IEvyX9d06+0GakDUFCT8VFMoXZuG2KJaOk985UShEBYsjNklaSJWCK4JgsGmsNy5cd4vFHF/DuqvVkZ2drXMYy/7rpTJ7Sm/adIgTyISVSSbhYprGF6Vr9cx2PQJqSMQ5nztRz7GiVwEp1XTyNOprO72OBPFB7Q2G48LKL+uDEadfeo8+gEvoPaEd2jktC3Uklsgk7ecSaXZYt2c3WrTvpO6iYK+YOpn1ZlDPHYP07NSTbsrWZGMvgEV0woTiBSWpueFxorILMmeFAhgMf4YBdyh9J/EwmBIE0jqhMMzlEo452vG3aGbdIGKXwXCS8YMKkQRJ4c0Fen/37DrJp0048L87o0Z2o6NyZeKvDwX1V7NtTK+0JjEHltJL0W3FCyHfVRWUMkGZ2jkWL3mbDhsPEWgoIm86Sze1w/Sgp+Uyqz0porVGeN1ezb/9ehg4fyB13Xkn79tKaCHA8X2VKa1Cc9OHr84KwDeSDMdKqUN3NrQk6V+Qy96rxzLpsMva5J6dZAAAQAElEQVQLpZWVp1i0eDm/fPhVXnttg3b0TWqDh0MeQbJE/c1VWbY8CxICC2MpCVazcQKU8QIZSMeNwt/11OMfzGoTbF2WLrSfNMjaOlvBqA0WFCw42KxSfRxCakpEAj1Kc32Ug3tbeerxd/j5T59j9+7D9Os7gBtvns8X772GiZd0JTff4EsTSaZaSNGGHhapLqM+iX+BNgX2J6fCoZBMbz4rl2/hnRXb0sBt0JGu18b0jP0SLTFSfpuejGlOtOH7ccXbcNw23HAroajNFxD4DiE3QlOdw5pVp9iy+QCpVIzho3pR0b0g/Rblay+cTr8kY0w2Awb2oH2nLBKpGtD4+WJuYNnCf+aRqTvDgU8vB5xPb9P+cC0zxmAcB9dzyM6OEImGcBwf14UgCJCNjWgO9OtfwA03zWbAoN6cPHGaJx5/mWPHztGlawn33mfBo5TKM408+9RS1r57DD/pSiAlJbwSErkJhowo56bbpqc1oOVvreJH33uBNcsraayKcP6Ex7qVSQnaPfz9/3qCn//scQ4e3MfIUYNU50ztyMtUDhKGvnDH4Erbkbsl3b5UyieRtMIyjpEwdyR43ZBPVq6LBcWuPcPccmdP/vpv53DzHVNoV+6yYeNqHv7F4/zD//tjnn1iHWePpzDxMH5MJKmYooVkILOm9evQKnNnA/Fkg9ogAU9c/YkJeNtIJpPE5VBL84kLh+/76XZ+MAwk1ANpFElisZhClaF8KT9QXtQPR2SUB5k8m0n651RXtdLqRTHlCXCNyhemtNbDmpVV/PBflvEPf/tLXnh+ofh+lhHDh3LLbVdx1VWD6Ns3T0AhYBKwGS9BJCvAap2ONFk7to4xOMYjlbShgzpEQ02SPTtPs3v7GWqrEwRJsFXa76N5Xgjr43M98FwfI7B2HIMRuQLtRKpRbW4UADbroQT2sM+fkRa9cvlujh87rjHszuhRQ8nPz+XIkThLl2zC8m2Uxrh33zKVFcML27JTqluV20IylOFAhgMfywHnY1M/g4nGGPXKIRSKSngUUlBQQFY0LMAKRAb7tlYK6NE7j7Hjh8hMlp8WZCtXHqC5NcmgYYXMnTeVxoZ67bw38Ppr6ziwr4bAl2lHNqCmlnp8aQJjxndm9txJdO1aoedP8uN/fZP//Xfv8K/f2sy//NOr/PiHj7Nx0zoqupVxw81z+MK91zJ+YncJLXDcgHDIk3DMJpA/w8gUhXb+rhMi5EWQxBSlFPhIxCNlAAw4MvXltQsYfUkpN94xhhtvm8bQET1wJFR3bD8gMF3OYw9vYfXyZmoqIRkTKqfCqsPF+rCEH9jDTyV13YbVzhz5fqyQtgDuedJmxL+U7G6WbN4Pk7EgkRboqF0hPC+MMR6JWIpW8U/4hq8+EcgcShT7Kn0s1UYsmUgDloOh+lxCPGvhpeeP8OD33+Dl59axb+9JysoLuOHG2dz9has1Np3JkbYkJYvANkJgjcBa0KirQKUIh4TqsXhCgGfEzzCkHCyQBEkPP1FI5emk6hI4x8C+kl5fG6OhvoW2WBvqPMYYARvaILgKXQJjQ4eIVGxPmxrdJuSZ975ndYA1q9fLXOxw6axhDBzQn5rzIXbuOEIiqGb0hK5cdc1w8grCKlflOGHAwcjHiFE0c2Y4kOHAx3LA+djUjyZ+BlIkCSTsw+FcigtLaVdSRk6uBKUAAXwJyIBAvSwqhmnTRzJ16mz8eBFvLlzGlm27kBWHKdP7cdnlk6V95Ulz2s6KZduprUpgZZrreIQjhrxClxmzhvPlr9zGVfNmkZeXw4njxzl6bD/VdSfo1qM4DV433DxdvokR9OnXDi/ia0ceSJj6xGMKrTD1XZIJg31DLRG3LfPUOksK0i21aSkwAipLbgu+00xxmSP/xiDuvuc6br7lasaMGaUyEyxbuoqnn3yHZ57aymsvbWbzhlM01IZx/AJRLmEvn2ikiJCbgzFhUmpDPBEQi1khn5LMtvWRPuyr1x8mK7AdzSYLZpafyWRK2lOA60bJiqh8hQ6uQELjkMzB9TuIOhIkiqiqTLF182ke+eVSfvXwm+m2trW1MmrUMG6QJnvXPVdx7fWTpJkWScgHGMsGAS+O7X9SbQpAvirw1E4jPqoOxZsb4xzcd4atm04K9Oo5r3pMqoS2xmxWrzzJm6/v5+mnVvH97z3B8uVrVYarvodUniNyRRdCR2DqOvn4mj8xOZtiAty6Gp9N66tZtWqr0pOMl0l47MQueHpk6cJdvLloEfklDfQfGqZ7XwiFDPYNPcgB42A1POP4ZI4MBzIc+HgOOB+f/BlNlXBx3Wyyc4rJzSuW7ykLJMd8EkRlFvIk9HxdDxpSyszp08nP7sHevYdZvXYF9U2VdO+dxY23TGP8uAk01qdYtWI7u7adliYSITtaCCosJZ9FeccI02f24WvfmCNT2w18/b9cyZe/cSl/93/m8z///g4+/4UrGTaqIwXFEk5eCwlpEK6XIhxxpF1IRkreOtKY0r+zp9AYQ6CGBQIs0kJYjcQegT4CjPFxZYpKJJsFJi0C3RDDRnbjuhuncf9XrpeP5gqBYAdOVe7jhRdf4YfffZnvSov7+Q/fYvGCg+zb2cy509BS7wg8QmpAGEM2+BGMQNeVxmCMwXEu1PtBc56PvbYaVUq+Gl8qilE+13UERQ6puC9wDPATkGhVHQ1Qdcbh4A6PNW/X8/Qjm/j+d17hu996iueeeVVa5RqKSsLcfPt0Hvj6DO68exIzLx9E115ZuJFASlASJ6TCXJGJgwVqjStBmCDlCdB9td0lGorQ2Bhj1TvbefDB5/hX9fmpJzZwYG8VDXWuwOkQjz2ygpdfXMXZs03SovNxjKfy3PfIxkWW/5bnflhjE8J1wmRnRbXhqOLhh19ix/ZddO3WkUum9KdT5yinj/usfeck585XMu2ybgwZk42XHWDfAMT3IKk5Z8tzbNtTqitzZjiQ4cDHccD5uMTPdpqDMSFcEcZVHFGAYyQoHF9mrZRAIqB/vzKmTZkiQVTItm3rWPjmApl9GiTkC5gxYzzdu/VNm25eeXGFduVnsT+l4/sSlUEcP2giSQM5BSl6D8hi1MQCJkzPY9KMQgaPKKZDl2xC0paMExMoJlVfCiNnvCOhbr/7ZAX5vj01LH97B8ePVguYbLlImwkIJCzBQSkie15IS0kwh9xcrKaSSoFtS0GBy+BhxWmz0p2fn8V1N01gyLDelBT249yJLBa+soNfPLiUn/xwEU8/to43Xt3DO28dZdfWKo4fbub82TYJ8iZSCR+rCcn1pQoDtSHdUdXhpykIbFpK8ZTuBRLiAfGYT2tboOd8aX8JThxr5d13TvDs0xv4xU/W8PCPt4jW8aufvsOKpftoEjCOGz+ROVdO5ar545k6swd9h4QpaQ9eNCbNsgnjNhMOxzBOq9oRE6kd+lQOfQpUcXEcT/ddMJCTnU3PHj3o0bUn8TaXU8fr1BaPnGgZsTaPWAv07jmEz991O9OnjtGzrtqPDuc9MgrFS20WLD8DIuJvNufP1/POyg1sFzC179CeyVNG07N3Cacrq1m88Cgnjsbp1Kk9l14xkD6Dc3HCbdj2qBMaRJCiro8MOIkJmTPDgd/KAbsKf+vNz9wNK2tsj0WBcbTndnEEUo6RMJOAdaSBhNyAVNKnvKMjLWmgTEuDqTzVwqsvvsuKt3drhw1jxraj/8AKmluq2LBxXdqns39XgwxJIeRMAe3oQ5FWTKgJ37FCNYbVbnyhRiKeTAvvQH4RX4BoTIA9kgmjehWTvLVmwvVrDvLEowtY9OZ6WppTJGXas9oT6oMvKZey0tJeSCAn4660t6gsfFk4qA2Aqy75gU/CDygqdRg6soS5Vw/n7i9cwZfun8vnvzhXPpJxZOU4bNu6mVdefo1HfvUCP/z+s3zv28/LV/aagGsRTz22glde2MCShbvZtPY0Z46lqDwRcPRAG7Vnjcjl1JEkZ074HD3Uhv1duY1rTvHWov289OxmHnrwHX74L0t58Idv8uivFvPKi8t44/XlrFixhuaWRsZOGMytd8zm/q9ex733X8stt89g9Ngu0p4cAo2FsaY7SfNEsgWrGRrxDPWSIKTehzHp0FU8wMj35LhJhSnx0pdJNcz48b2463OXy1R7CdnZeUTCUd13BaQBAwb2Y86c8fTpXYTrqFTXQzc1L4zuozJAF6o9wE8GEPeoPu3w5mu7ZO5dQWmHMNdcP5a5Vw2TqTiLbRurWLx4DVU1p6no3pnS8mIc2fkC+e9wU+CqDGPL1Ic0PTR2usqcGQ5kOPAxHNCS/JjUz2qS7a3kj5XfJuTgOPZCFFwgxzd4AilPEsm+f9Cjfw4zZ02gotMwCaU83nrzGBvWNFBQAJMu6crESwYRiaZ4d9UmCd1NArE44XAOhrDKDjBuK0g78uWw8hMykyXzcbT7DqT9+NYUJTOPb7/0GmThmAgWUIzASfJMO32HU8db2Lb5GLHmJOGwkd/CUz5H5Rvt8A32x0X9lMGmeMbFqFzHGDxbgOPjhFN4oRSunO9eGPKLPAYMKWLCtGKuvL4rt98zmtvunsC868YyZHgPSsuskI5y5lQjG9YdYNHCLbz41GYefvBtfvTdhfzgWwv45U/f5Uf/soR//PsX+d63Fskkt4h//F8v8M//8Dzf+6fn+ddvvaT7C/jx917n5wKk117YJhPaMfbvOUci5tKpY1dGjh7IlBl9mT2vH194YBI33TWUidM70Lt/NmUdIuKp+uSiwxcgJdIgEfKyxdMQcZkJY20OpCI4qZD67qnfLslUjBTN+KaVwLSBQEo3BQ6GdqVh+g8oJ78gTLt2eUSjDgGthCIpCopC5OSB2I49giAlX1lC4BSgTOm6ESBa/rU1wbI3jvPs4xuoqWlm/MTeTJzWmZx8l93bY6x9u4Ga+vN06RNh4uRR5OUVkYhnqxhP7dFcCEtVk+aHHR+Tq+pCosyZ4cC/iwN/Npm1yv9s+vq7d9SAFUahKEyePpjZc2YRiUTZs/sAL764nD17Wxk3oScPfOU27cwnSGgann/2RZYu3i4ggVhrWP6PfAI/R2QFkIOwQ6SCdaYbItmHlZ6EJAAD6mpbqDrbqtCnrhqamxzwCzl/Jilz2ClOHGli84b9rF2zjePHKwVQTrreVCqQAAYvolKdQEI1RcpPilLKoxocVK9PILCyb8jh+URzDPmF0KNXDpfOGMjn7p7N175+M9/4y9v5q/96Jw989Qauv+EypkwbS6/eXSksyqOlpZ5du7ezaPEbrF69kt17titcxbZtWzhTeZJDhw9gf6miuvqsAKWN4pJ8+vXvybQZ47jq6qnMv2EGt9xxBZ//wlzu/8ocvvoXM7n6uuH06psrLckQiSbVRgjEF0ukj0DA6uJ5EVwnSzI9l2QyjGsiVJ2PsW7tcQ4frMNPKbM2GH7KVQGOLoxIBQkWbFmOB+FIEvsdo+KykLTIrnTpWiiz3DoWL1lFU7OP0SOp+RomDQAAEABJREFUlPgm7daXtmlNlXazkEioSJXb0hiweYs0wrdXcebMcZkL+3DFZXPo36eLxizFq6+s5d21q+lcUcjcay5h1LguaoOe9dGY6ENtIU2O0kWBSLHMmeFAhgMfz4HMCvlYvvj4gY8bho6dHKZdOpip00dTU3eKrds38eyzyzmwv5Yhgzpx/XXXMGbMSOLJJp5//jWZ/g7LxBbBJQc/mS+QksYkoWTNTY6XxLjvVWgCySqDq4T6uhYWL3qHf/o/j/B//uElfvSjVSx8bSNtTVEa68M8/cRK/vF/P8v//vsHee6ZNzh2tFJCOpAm5UqYpyR0tdM3DfhuvcqP4agOTxLZCPiwGhqQ9tM4deA2KJ7EWgUtudrF5xV4dO2Rw8Ch+YwYV8CsOV257XNjeOBrV/DX/+M6/tvf3Mjf/N09/PX//BJf/+Zt3P652dz5uStl9pzF5+65gm/81bX85V/dzt/87X3K+0X+69/cwf/8f27m7/5+Pvd9ZRw33tafK6/uyeRp5QwfkysNyaOso0t+kaP2xPFNM4GJgTx1GAVpEn+MhLq0Qft2nDV1GpnCwtKgXFzOVdbx8ssLefaZ1zh1qoawFxXUSxtRHgRUvCf8HY/0OB4/dYCjJ7fQsSIQeHTgqmtHUlIe4fTZA9Q3tqZ5ZhwNiYDJ/ldcC/px+dqiUaXJ5Pr2kiM88siznKvex9RLh6TfxOzTo5zac7B903l27tqi8pLMuWasQL2XwNlg+xIKOxojdLiisApTKA0ddQ11UYmZM8OBDAc+hgNajh+TmknCDxIS4j5JCZEuXXO58ebpjBjVn/qGc/KXLOOtt7Zr9+4zeFAJ06aNYvqlUzhz+hzPPPGmTDznaayVcEpIEKUkHSU2jWnFmEZxNi76zSlZSHZONkUFJdKIzqa/Q2W1I/s9p+xIB4J4EYcP1LJl0xGyI+1V3xgG9BuE54Vl1othZL4KheIyadViaMZxgrSZy/6Cd6IN+aoMaX+WKgrkC7PtSCTjAjdf2lWAZH9ajttQSpj6DUbKXn4JEuQePfsVMHhEKdNn9pD2MzRNd3xuMnd/cYqAaSrz5g/jkhm9mD6rD2PGVTBsVCcGDCmle+88OnULSWAb8ooCsvJThLIFzqEU1pfkiC1OKCn+NgpcmxSqsTKf8YEjIJlK4BjxUuNQXxsT8KNrKCnOxRiX9Rs2sXf3yfTbgEFS/E6DU0ilKG7UP8Va23yiuYaJU3ozdlI53XojX1cxV8+fzOgxA/BkMg2Uz3VUtj4c42CB22pdba0Bu7Y1887yfezcuQ0/qNGz/Zk9u5/qdHjlufMa85XU1p1j/JTuTJ/Rk/YdI1gXlZqHBoMLhzqMJVVyISHzmeFAhgP/BgcyK+VjmGNlodV0fAl74/pk5cKQYSUSyNcycZK0pEQzS5as4NVXN3P+fJLxE/pw402zGT5sFFs37eenP36T5UuO0toYSHtSBZL8ErOKxERJ0YXTCj9LkUiISSr361//IrfffguDBg6hb9+BtC+vIOTlUZBbTr/eQ7n3i3dx9VXTaSeTmRWekqHYH4xN+m3anVvxGsKXD6upAY7sj3HsYBsN1YHMjBK2yQgO2aIojuPgegYvZDAy9yFo84kJqGIYN6EwIVBoI+HHsNpDUpI2hcq3s8WFwE1Jx0kSzg5A/iyrZaTUJduzQPnsb8elTJK4zGQJgXxS/h3fNBE4AmdXobQkXyUYk8BRPilveFaSW23HqHwVa/mimO4H4oEnTfUsP33wDVYtP4YF3aLCXAYO7COfTpwd2w/S1JC8gANWK7HliOf2+UD1eCGfUWN6y6x4OX36l+IIu/KKnbRGPOvy8RTaf1OS8vH1jOtESMmM5wmhI/JLHjpYK5PtGrZtOcKA/gO46darGT+xP/GY4Y0F1bz60mbqpPlOmTqWOXPHUNYpilVWjQN2o+AHKYzRhbQ90u0So9Q/sUmRzJnhQIYDv40DdtX8tnt/NunGGKzAtuR5Hp7nigKMfb3bjeNIAIciyL/Umctnj6dzlzLOnTstgFrO6wu2SIOJC5jKmHPldAnMEeyUsHz2qbdY/OYBGupSuI6TFnjJlAEJKV1ijCNA8dNkBVVWtmHosA7MnDWIfv0qaIs1EY6C/ZHRUBgqunWhe/dSCvPDekaluC7hUAijh+1O3yGXZDyXIBHC/kO8F59fy4/+9XXeeO0gh/e1yfzkkmzLV/58HBNWqCeFAIlEEt9Pkpbs0lwCEtKoWkj6LRgngRtK4FswCWKgawvW9gUBq9EkU3HVLuErgLManKP7gTREnFYctxUvHMMLicJxQtKYXAF9gO1zIH74IvHYCO2IYEwWRrxxjSAlJRJQGKWkgqTq8Gmoj7N86XqWLdnG2UrQMDF8eB+GDh3M3j0H2LjuBBbk1CU9BRg9bQALfqGAouIoHTsXEs11cELgeJBXGKKkNJtwxME44od9cSXlYH1YvsaqudFn147D7NlzSLyOMGb0OCZfMomCvHxpUbUsXrxBJsUTdOhUKt/dWHr16YArn56rsjU8qttXMwyuqwpxyBz/EQ5knvlz5UBmxbxv5I0xaWFijMEKayMTWSCBjUjykmg2DBvWnWuunc24CcOlVbSwcOES1q07REgC6dKp3blu/iw6derCzl37ee3Vlaxfe5hzZ+L4ySyBQK4EsiuSUAY8gaDjKGJ9K6rSCtyiEoPjtdLYdJqcghi9BxSRCKoIReJYs1sAaiNIlgIGRK4TxaMIJ4jKx2U4cbSW7VsOsm3rMRa9uZkXn13Ngpc3s3rF8fT3lxKxAEf1JuRTSe/mBQpGJTjSFqyW9Jt0ZTKq8SIJWBBZ4RuNumq/g6ssAUn1KSHQTCnNiBcG1w0EKglSfgIwuPaFBjcXR9ob9i1FgUDKmjyDHBWZSzIWxf58UfU5ASUov5KlHloh77jQoX0x+XnlAosTAv+ztLQgwC5j7Lih1NbWCLS2UlMFcZnhEnFUTyB+ByrHwVj+Sjs0AiobNypPzFL71G4/rnYrn8bcU0VJNdfFEG/zWbJoJ8uWrqGltZ4xYwcw67JR5MkEu2NbJQtfX8WhwzvpM6CEyVMG0LtvKZ5AEPHCcXzQnEGHo8qMWsPFwyhiyXkvVJA5MxzIcOCjHLBL5KOpmRTQzv0CG6ygEQmopGRQWp7NtdeN5JLJIygqyaa1rY53VmzknXdO4wigxo4v54o5kxg5epD8EFU8/fRrvLVsJ23NHiFycI2HMUbCPODC4UvcJzDacYekKZ08XcnufRsoLE0x84quXHZld9p3TnH0xGbWb9xAS5tg0gq39MM2YofQmvNcle1Iq2hl48Yd4MS4/sbpXDJpsLS8GhYtXMUvfvoyP/nRi6xcsZnWljhGZiYjwWlwSSYcAagHqShhNx/X5CpPgFGrPS+EJcfRfRyZ0pIkEql0H+LxFIFMaa4Twqhv9l+OtLS2kUz6ug7pXhj8LHyV6yci0uwipOIh1eERdsKS4dkC1GziMYdXX3qX555exZGDjWoboPZ5jqNIgtLSPCZNnKI2+axdq/bHmsktdBk+sh+9+/Rgy9Y9LFiwVX1tQhijtqH67bOGC0egwJKC9BkQCLCs2S3w0wnqGYJoqK1KCdR38MqLy6k8VU+37u0YP1njoLE/fbyF9WuOsmnjVorLDFddN4TL5nZL/9iu1dqC9Lyx9dh6HRV8kRS1SWnSfZuspMyZ4UCGAx/Pgc/SEvn4Hv5HU41YY50HaWFjpZePcSEUDcgv9Bg9rm/6d/asiW/NmvU89+xSdu5opKSd4eqr+zJTu+ysLE9gcV5+ki0sfeOgTGukBaBrkLD2JcCTOI6EO23SwppFKQHTbk6f3cuQ4R0kENszZlIx99x3Bb37FSr9EG1xa15Tp1QG2A9XAOBgtYVYW8CWbXvYtvNdBg0tZ961/Zh3XX9uvX0Ks6+8lK5d+8p3coCXX1zIyZPnCMnvFAgAXGMISQWyZdTWxGltDvAERJ6JgnjgSGQ7xkvHk0lDOJyVJqP0VAr1xZWW4ghklOJFiUZyVF4WqYQncnFMCD9hOHvSl/Z2lqce28ybMjfu39NEi/xjIQyu+Fx5uoVNG/azZcsxmprAtSqaNJBYvJmImjJzxmB69ezNvv0Hqa9XBsFLeacCrpx7GSXFpbz22hvsP3AAdYV4PFCpBguiFwDDQSWKbKhAWwKjsh3jqH1GfbD9gBPHG7D/ouPlF1Zw8MBZ+vQews23zZGfqYNMeHEe/eVGXn9lg7S4Iq66ZgKTZ3amrIvBatgxDY1vf2IKVxU4IvMhCnSdBCMiAdhrBZkzw4EMBz7CAbuCPpKYSRBbJJSR8AXnPXb42B25JJ78QQG9euVz+RUj036m8vIytm3bzSuvviPBWkehTHNTp/XimvlXUNGlK9u27uORhxew4NUDHNjbIoEJnnWQqLAgULkyA1mTnhfxBUo9ufsL13PN9eMpbu9KO/C5ZFpfbrx1FpfOGi0h7bzXHhsYfeha4KKTmrpW1b+Olvhpxk3qQrsOUfKLDOMmlnLTzYP5/Odn0LdPX86dr+XIkTN6FlxDWjCbAA7uO8svH3pRbX2d40ebiIZdAR8EuqdmprUR64upOt9Ac2MMYxw8NwyWRwIXcNOgUFvbQlyy13HCBH5EmkjAyreP8OTjy3ny0aU88ovX+MmPX+IXP1vCqy/vlBkyjmXH5bMmU1zUic0bdqn+Koz+7He2ApnlAjWia1eX7t26pAF/06Y9tLY0K0eCsWO7cfnll0r7SrB50w4qzzQQCjkCf3CcEEbgyMWxDNRckU5FlOq5ug/xOJw9k2Thgq0seG0l9bUJhg0Zx9VXX8qwkaVU1TWzZ1eV2tpIW3OYgQMHcvncUbTv5AvmaglMnJDA1DFOulxsBRcpnWIvhOQy+6k2pahCaW6KZM4MBzIc+BgOvLeSPubOn3mSYzwc+0sPJoRjXBzHYH1QfpDCeAFJyZqcfI/ZV43QznouhUW5LF2yhF/84tX0l2YL8jxmTO/H1ddcypQpEwVo1Tz2+M94feHrVJ6txtH23lH5qWQU4+ekzWpx7fb79u3KjMuH0aFztupLkUwlSKTidOjYjgH9exOJhNNgYsGC9GEkHH2skmMF6OlTKToUjqR7+16EQ6iealJuE3Ht1POKHYpK21NS2E0wEk2DjXEQ+oD99YPNa8/z0rPbeOKRt1i1Yh9Ju8EXagUCBits5Z7h6P56nnp0OSve2k1DfRI/SOI4rbihJOoSO9Y388TD69m+7RCOm5AWlmDF0kMqcxkbNqwnlNXKiHHt6TsoXyByjpeeW8/bS4/QJG1t0LB8evQq58ihc/KN1ZOMOzID5hMOiok3OdTVqD/E1NYYW9cfp/qMT6othFEXxk4sYcCgYm0EdvLu6o3qW0rg1YLvp3Q3wHbBl9MuqYFLJ6Vc8TGMMS72+arKGG8tPsC7b58iP6sXvXv25/qbJzB+ak6aP0tfP8TDv3gRx2vhjrtnctMdEz+T8sYAABAASURBVDRGIZWd0PMpXBdcD4zhtxyaMNibluHKrBH42IyZxAwHMhxIc8CulHQk8/FhDrgYAdNvSJJHWSxAeSGfwEnihpOEZOabPHUg9hcV+vXvI1/EFn7+0wVsWF8l04/LzBm9mTtvAqPG9saLNGtnv4u3l+zm8P5GEnGDIyFljEskHCHseRcEnEYlmVId0kZcaSYhN4IrDcCXfHMcJw0a1pwWKOHCrxkY6ppiMgmepeZsLgWhkSRqckk0BCq/lVCokXB2gloBQG29Ubs60qNHV9wQYAJcF44eirN1Ux0R05MgXsyZMzWkfN12JHyluRgg2Qarlh/npWfWs3bVQWlEMezzxhUIpJoFRAF7tiZY9MoRTh6tI5VsET/2p/1I5ysTzLxsIvfcexn3ff1SvvSV6QLuy0i0RdggTel8TS3hXOjZp1AakMuRAy00CYz8ljA1JwNWvX2YZ55ZJrPdNnKz8jh/wnB4RytO3MUCdeeeKabPHEhIZsUVb62XFlRHNBoi0E1fAKrWY1HG9gN9BOKtn/KItRjOnEhKszvMay+to6aqhcGDB8gkeglDRxZxvqaGFctOs2tzq0yUMHhYGdOv6ETvAREcN6UyPRWXI/KwvFCE9KE60nEbphM0qIjR2pBARCmW9IximTPDgQwHPsoBu2I+mppJ+a0cuLAzDiR3AuXRjlx6S3n7EPOuGcUdd86ja/dObN+1leeeW8a6dVXYn78ZKbPQzTfPZdTIqTRWdeTVZ47y/NObpSHUkgra8J1ajFuDF5YDRv6IpCw+QfK9odF12kdhrCAMsD/4agQoVuYlEoE0A4NrHOqqEmzfdDatbdTX1fHGG9t4+409nD8Zla8rj+qzHuvWHuV8VQ2du3agqDhLmoN93icm0Nm7r5LmpmZGjxpG5y6dyM7K1n1ICQWDwPaVdF+am+I4TjZ7dh5l4/q9JGMexmQRT6ZobU1QU9uI/UUHV3mSCY99u09w8lgtXbv0YNKkYQwd1kXA2IFefTozYVIFl8k0OnBwJ7xoG8ZpoV1ZNu07FLFj+1FpoodZu/oMSxfv5dVXF/HWW2+RJ23V/k+tvLw8jhyup60FXLEqEooydswYJk2YIQ0rJc3tqNqvtsmcZwTRlmeOm8SRhudLi/TVp+YGny0bqnjkoTW8+tJKYqlKRkwMMW1OHqMn5hJrNqxe0sbiBbtkMj3FqHH9mTytv/gXwfXQkRLZUw1QHWD43Q6bz9LvljuTK8OBPzEO/EGaa1fVH6SgP5dCHMeRcH4fGYMRF4vlZxo7oSO33zmXESP6sXvvNl58cTGrVh2jrjZF/37F3H7rHC6fNYf87Ar2bD/L4oWbeXflbk6fqJMgdcVCh6TMeMlkDMcNVG4C+wvnOFZDEWJZLcb104LRqE5jjASzwSoGVSdS1J1zGT58AP2HlFPXXM3zL6zkx/+6kod/uIWHfrRKJrQltC+PMn58X3JzQxij56U2HTtez569++nWI59rrx9Gh065VFaeIiZHjCefTIAOaVGOgZzsXDq074L9yaAli9Zz+ngjxs/GExhFs11C4RSuyjRk0SaTW21NiqxICX369kv/6GpSYBxPtko7SqV/4ufm2/tx8+1jad8xKg9MPRXdC7hkynCqa6p54dkVLHlzM5VnzzJwcHduve1KvvzVuVx/02i6divm9JmzVFa2EIhNiTaHrHAOw4cOIj+/HS+/+Gb6fzkFKUf99JCSie+nMNpMINNsTVWM1e8c5tGHF/LM0y/T2HxWPqSh0uhmMf6SLjQ1xnnqsV089vOd8nHVMWxkR669bjSDhpYSjliOJCHtP7JxRTNnhgMZDvxBOeD8QUv7jBdmjOEj4GTBykPaD+TkwfRLe3PLbbMZN34o56vP8PQzC1i8ZA+StdIYcrjm+k7cfOdIho8YKI2ilQXPH2HZggb2bsuipSEPY1/E8JoxoRqMfDlIZGOFYFqDSkjwJ9UG0ofrGAlbqD4Pm9Y00lwfY/yk7lx7yxBuuH0S/QYMYtvmRpng6qivishn1ZPrbxwjAVuGozYbAw11baxfu4Xdu7dTXGro0tXD9ZLs2bOXuromjLGgqf75YMWwowezormUFHXkzMl6Duytoq3JqE0eEZk4C4uyBWA54Lsy2Tk01Cak3QREw9l4IbBgG1LdjuPiRQyRnCCtNYXDCRx5xvIKAoaN6CIgK5SZ0JUJsgMTJgzlhpumcemskXTpVkRhcZj2nYpkejwms+EBWlp8QqEIOundr4ghQ3tSV1/F4cPHpO0lSCXBT4Zw5Jhra3U4daKJjWtP8fbincpzkL6D87nu5rHMvXo87du359xpl3eWn2LZ0rWcrTrE6AldufyqAQySTywrF2mJMfEijkoV2dPow0GJCjNnhgMZDvwhOKAV9Yco5s+4DJnYfEklNxQQiJu5BQ5TL+3F/OsnUtY+j0OH9/HiCwt57NF3OXosRkF5gpGTw1w2py99eg2i7lx7mY7grddaqT5l0kI2EnHBNIOAKZBvBKzw8+U/SaomkXb+1oxm/U1W8J4+0cbBPeekjdRT0C5Fpx6G/iNyGTV+sJ4poqy4M7ffPp777p/KoCFl8sUgLQJUmITzedat24pQkd69O5CT61JaVizNoUVCvxV72Nod9c2+gVdTW8uJ4ydpV9JRrcph6+ZjHJO/KtaaJJGME8kKEQqHVb6rIh3VJWkuoEqqoa4HSb9Nwj2u+9CWSGDCAaFICl/qX1ImxKTfSseKCB07l+CnQkTCOdKSSsjKdti8eZtA84jirjSxMppba9O/rXfubANGQO2bgNxCJ/2Syte++XlmzRyH64YEkuD6hkSrYfe2Gp56dCUrlu6RGdNn2Mhe3P/Vq7nymgkU5RdydE/Ac48e4cWnN9HQeIbJlxUx74YB9OybjxPx8U0C48bFOiGePi1/QMwRNy7EM58ZDmQ48IfggF1Vf4hy/mzKMMZgzAfJdXUtTkoZwLgQzTUMGd6ZO+6ax+QpY2WiqmT1mrWsXLmDyqrT5BY20ru/x5XzunHVVWOIRrLYtOEIr75wjG1rajhzDDnq20m4F8gJHwI/IvEXAQGVn/JJJlK6Z3CMkWYgrWnjNtpaK7nssiES6kpzTxF3aynqmEV+STanz9Vw/nwTHTt65OQ0C/JiOE5ATNhz8lgD9q27CRNGMHpMN4ELeJ4jYEpJqHuAi+87MjeC/eJuVdU5ytuXcdnl09X2K6k8U8f27cfkewoTlt/HYMjPzaNDhwI8AU9WdoTC4oK0GTFiuyCQCHlRQmFdSNBjWgiHQ7hOvqiQUChMbr7Mk6N6yi9WwLEjldTWtgn4ktQ1VMnU2IDdBPTo3Y4BA7tw7PgB9u8/QVszWNAw4VqZBrOYNHkgFd3KiYQchHvUSrvcvLael57ewcqlh2lsqmPOvOF84UvzGTZkEDleHhvfbeRH/7KeNxdsEzjXcsXVg7nnK+PoNzhLffHFs5R4kyTkOWneg8MFChRaUpA5MxzIcOAPwgG7uv4gBf15F2IFk8iIC+9x1Asjs1o5N996BbffcT0VFeWsX7+J115cy4q39lJX30x5Z7QzD3H9XZ3p1reNt1cu4h/+1ws8+J3NbFyRoKkmRNjJAj+kgsO4brYEZATrzJcrCAuGJ0/UcPToAbp1yxK4dKSwxCfuN4CTpLDUo6xLmObEKU5VHpdm1ULgN+M6AjdjOHK4iX17KsmOtqNrRXtcD+qbAoxRfals9u+pFXDFCIIAR/1KCRgbG2sFVK3ybRUyaVInyspK2Lp1F6dONuInHZJxh5J2JeTkRohK2+nRq4zC4ghVVXXSVAKyIoUEqWwCOYHCMgN6YbU3hsAjLBNgNsmEi+MmGDi0TPzrzHFpadu3HRO4ZTFj5iX0H9QLx/NVpkvfgeU0tZynqqZSYCetLNmGNYUGCHVlBg3ENftCyq7tNTz91FaefXoNLc0uU6bMkKY0guHjc+jZIwe/xeX155t5+CfbtYlYjZt1jDnze3PH56fJzFksba9FJcVFCZGP0R+/BiZHaUak2mygWOb8c+NApr9/DA7YlfXHKPfPrEwrlSwrffVbZAKr5BDNgv4Dipl3zVhmXzmZ9uUd5Buq43k52tevPU1jc0BOMYyamMONd/Vnxux+Euz57NtVzZO/2iogO8zhA800NwbSoBwJf0MyHmCMS6Ca7Ft2W7bsYe/e7bTGjlPULiA7O0uAVkAiFcF+r6mfhHy7Dg7GbRS5eiqC7/sqC/bsPMPWTUc4X9kq381xHntshUyQb3Po0FEaG+Ns3XKIZMLgOI7ABFICqUSqVZrMGfXNl7ktTN++HTh58jgbN+6iRc9EPJe6ujoSfovAKcGosRX0G9iBs+cqqTwt9UamOvwwqAe+THxB4HPo4HmefnQVb7y6m/oaH8dLCRQ8+vYTMCQT7Nx2hFPHWykoyCUnL4IXVR6ZUbv1bC9AHij/VC6BeJ5KGvmXskVZ0uRCNNWnOH60WT6/DaxcsZLGpiomXtKH2+4YJv9Vb4qLc+SvC1i5rInXXtrD8WNHpNFGue2e4cy9vh8lZa4gKIprstReexp9CMGxFHov7ii0p8ZdOikE9iJDGQ5kOPB7cuDiyvo9i/kzf/zX8sgKL3thNRM/LariyYDiEocJE7vIFDaVoYOm0FCVx6LXtrF00Q5OnaqXMA7oP7iE+TeO5bqbJtJ3SC7nqveycMFKHv75cl6Q/2Pb5pPE2lIygUXEbAsyjkADStsVM37cKMaO6U1+QVjAI8GcbAcmD1cYkF8SITtPbUm1CV1CmKTSTRT7n2QPHzor4Vsg0OxJbU0bK1asZ+Hri9m6eSf4EvIJ1RV4WPOhFB1c18jf4+FFAmksaksU+vRvR26ex/K3VrB9ywmVExNYnSQerwNq04BZWh7hiLS7NWt2UVedIuQ6+Na/lIqrbI+zp2MsX3KEt944QFODgyHA/hp6p675VHQV+B2vZc+uM+obGGl9oL5Iu+revSNfvPdmxk0aInObIRrOx28t5MQhh7Urz7Lg5Z08/+wqjh09SpduJcy4fCjjJ5dS1gmCZIjTR6K8vew0by5ZQUtyB1MvL+cLX7mUmVcMpUPHfAKBsS8zJMYFLIUUht8jG7cg5ejanr4+UqJAlDkzHMhw4PflwMWV9fuWk3k+LZOM+GAjvgSbdZgncCW/fMmtaJaRjySfSy/tzcRJoySEU/JtbOL5JzawaME+Kk8kKCiIMHZiB26+axB33TdGmkNXDuw9zeJFqyVkl/LyCys5dOAsrnGkSQU4Gr3hI3pzw01zmDprFDnSmoKkrTAiQW6kQYAfxGlpraautpZUmw/SXJobfVa9s421726mS+euXH/dJVx33WSFl3P1NbMYPXos3bv2ldbkcu5stcoJ8CSbs2Wmy8kJE4m6NDU3pvvWrXsBo8b049y587z2ymbeWbmP3NxsIupvikZycgO69SiQr6ieDeu2ckKajEVtIwgKhyLqhyNtKUUynks01F7Hp4SWAAAQAElEQVTAJZMfCWlerXTqkkv/Ad2oqa2TX2svzS0JEEBCEp840RxPoNOeQmlAFjxPHEmwfHEVjz28lscfWcyyJes4LC1w4OCeXDFnNJOm9qK4PERrIsaubQneXdbAlk07ySo+xuwb8rjq5s6MHNeVrGgByUSWfGjZeKEkBCmNq/iKmGAdXvL9YUl9UIN0z475+0lJmTPDgQwHfi8OSLz9Xs9nHrYcMPqwpAArwERWVNnLcMTghCTfJNfyi6B7f5h/a09uun2CtIIydu08wOuvrOWlZ7axZX0dIe3SB/TrxIxLhzLv2jHMuXISnTp0Z9fW8zzz2Gaef3InW9fXUlcNba0BOXkBHXuEySpUjaGUZKaPsZI6DpLxFOU7+H4ddY21xBIBCfl3Th6Js3rlXuobqxg6qpgxE7IYPa6IufMGc/tt05h31WzKyrrI3HZYWtAprK8pKRnteg45OTnk5lgAUYIDufku4yf1o2ev3tKcTnPg4D569e5AaUmZ2pcn81+EHn1y6D+klGPHj7BxwyFaZd0zqTCJ1mIOH2xk957dOOEaps7oQWGBQyourS0WpbDIod+QHHoNipJblJBZMQGImU421jeVlBkvITNncwOsf/cET/xqDb96aAVvvP42J0/vo6KXxw23jxSvxzFmfC/aFWVxZE+Cp39xmCcfeZcVK5cTT9Uy47JRzJt/Cf0HVghYQ2qzI+D3VVebNLtWjLHgZHQt0slFUsqF01VwkRzFM2eGAxkO/L4cyKyk35eDH3neSi5XQi2M50mQ6lJ4g2uj8pOE8xKUVwSMn9KZa64fw6UzxpKXV8BS7fLtf1V949VKNq9pJtliGDI8hxtu7c/n7pnFjTdeT4+uQySEj/LQj5fy0rObWLX8sMxdNdLCjEApjAnZeg2eY8iJQH42DOjbjv4DOlBQHCHmJ0mpPUcP1bN/3ykmTR6sdnQinA9ejiiKzHaG7t3z6di5UGBWR23deWkpARbvjKRyUVGRzId5ROzr7g4kJcO7dCtm5KgRhD09E6+iOXZe4BEi4pYLlUNU9Mhj3rVjaVdWwNatu1m3ppHN62OsebuWpx5ZresN9B2Uy9jJMhEWgOt4hEMOOflJxk1rx9f/+koB+mTyi7Ow/2cp8EPir4DmcDOvvryHX/xkg2gtby7czLHjB+navVR+vslcM388k6b0paxDNnV1Sd5eco4nHt7JS0/v4fTp41T0TnLZ7OFcMnEkxfnl+Iks9RAcN4nrtmFMG+qh6P92ihFpP5SnjEb0GT8z3ctw4BPggF1Vn0A1mSrSHJDcCnlG/pg2QmGfAYNKpa2MYOas0XTtVkZV1WkWLX6LJ55cwmOPv8vmTScEOkn6DMjiyuu68cA3J3PNjUOJ+1UsfH0lD/9kNY/86BgLn25h9dt1HN0fo7XRwTOqKAW+lJuOHQu4+wvzuenWyyTcQ8SUVlVbpXKbGTmmF6XyBzW11oObIGVhSDOifWfo2jOE75zn1OkjApo27GvgjU2t6TfjqmtO0hZvIn2YgGwh4ciRA6Q9dSSSnZDJ7xzNzW0S7tDaFiOlhvTsXcHcq2ZSWpbPksXrZXpbzY+/9xrr3j1Ej+4DuOaaGZR3zJIGlSSlepPuUZLeQQLvHIVFuZSWFuF5hlir4eTxFpYt3s9rL23mlee3yDy6h+OHUnSpKOOq64bx+btnc9210xnavz9OLI8dAsJFC/bw4otvsPvAO/QclOTq60dx0y0zmDy1D/a7XYk4OAJ1jJPuFhjAgk1YoSPKnBkOZDjwSXIgs+o+SW4j05vx8cJGmpTBkezLK4TpMyp44Guz6dOvREL/PEeP7+SlV17jR99/ncWvH6O2JiFtRYDRJ8q86wbxpS/PllAdSWFee3ZvbeBXP9vIT763lF/8eDmvPLefPdubiVnTmapzHYfOFaWUd8gnkaqXnyYmbaIX3/irz6V9RVnZRqYsV6JY5iunBSPTYHYB5Jc0kQhOUddQSSzehiyVVJ6tZMfODZw5e0QA1EAyqeSQwQiguvfMp9+gEpWfALeFUNQXKCluUroPRcVhrrp6JJ/7/AyGj+yl/oSlnRVz3fWX8eUHrpHm1ZFQBB1SxcQjNVtVOoScLFw/TKvw8+zxpMyRx/jlzxfx4nNvsW3LLoFfCwMH9+BrfzGbv/uHa7jvq5fKTNed7EiIg7tg0cvNfOv/XcVrL2xRO3wuu6o3939zLPNu7EvfAUVqpyGmZqKV4IXBYA8NDLYxUV1kiVxR5sxwIMOBT5IDWpJ/zOoyZX+YA1b4WbOb4wRpk5jwA/uLRR065XDv/ZfzxfvmMm5iPyq6dOL8qSwe/N47fO+fl/Pu8lPUnGslmh1h+Oiu3HXPFO7/+gxuunMoXXoEVFVX8+Yb7/Dtb/+Mb/3TEzz5uH19+gh791RSeaqBeMwQ9vJxTIiuFTlMv7QnRfLBtLUFBGpAgMFxHcGnYpLFPXoVCTRHM2z4UMLRiPJAXkFEQNCTSZeMokPnEgQjeJLjqVSSUDhg4ND2DB5eQbfuZRQUhAmHRZEwIZnoLICl/ICOXbKYeUVX7v3aBP7H38/h1rsG07NfFo5H2oKWioWJN5XTWtuDqtPdOLSzkJVvxPjVj4/z0x9sY9mifZw8WkdxUaF8VCP44gOz+NLXxjBrXj490uUk2L37jDTL07z43Gmee3of5ypj9OndT6a+aVw+exT9BuSrT60kAx8csD+7ZL87lYgn0/1HvODXWlOYC3EFmTPDgQwHPjEOOJ9YTZmK0hywb+6l9OEHSYFBCuOCK8HsSAZGcg0TJvfgC1+ax213zmPcmDGETDHLl+zlH//+Bf7lnxby+ks7OHqwWk77FP2HGq69rZh7vzlEQDWbq+dPp0Ja0tFjh3j++Rf5+U+f5CcPPseDP3yBl55bzc5t5yXY26irDWQeg5Dq9aU1JAUIpLIhyJI2JIAKkBbXiZtvvo7JkyaTHc1ROnTt2oFbbpnPrbddh/2pIy+kR5Q3SBn1LWDQoPbcdddVzL9+FoVF2bTYt+t8RxoUpFLKqFw2iOb4lHeJkV/aRijLJ5mClqaAqsokJ2We27k+xeJXGnn6F6d4/OcHef3Vw2zZfEIg00J5abmAdSLXXjedufNGMOXSrnTr49KcquPMuWr5rw7xy4ff4JVX3+T46V3kFjYy/6aR3Pn5UUyd3o32HYrlPzMk1XHHSWCMzIh+XKEvgHUVqi+2qWmycZHanTkzHMhw4JPlgPPJVvfnXpuR8AvhOCGFDo41X7kp3JBPJCvAE0BhoKhdWIK0K7fc3Y+77h3H0BFdaayP886yg/IzreRXD61m6aI9HDpykgS1DBiaw8zLK/jCvZfw1W9cx/U3XMagwf0w0pJ2bT8u0+Bmnnl8FU8/+i4vP7eZV17czsrlRzh2qFmA4FN11tBU79JUa4jJZyW5TUQqUedOHSkqLEItxVW7omFP/qFSevYsIxpxMBLgVvkwqseV1pVf6NB/QBl9+3YiFHKJhOS3SjkggApLe8rKUhyIJwLOn43Ld9TMnl3nWL70IM8+tUFguoLHH1kvjWcDLz+/hvVrDsoU2UBF7zYmzSjnxttGcNOtg5kztzfDR5TRriRMfW2c7VtPsGjhWl5/eSNvvbmX/XtP0Nhyhs49klx3Wzfm31pO3yEeoaiakvJIxXPxnGwcxxePkrgu6bgjbRbUKaNGvu/MRDMcyHDgk+fABWnxydf7Z1qjkTB0MYRE7ns8SGG0e4ckGB8hgUIFkRRd+tRyxXUe3/wfl3DP/bMFOP1pbQyz/t3TPPTgUr7zf17k0V+8xfq1+2lsbqRdeYiJk3ty/c3T+Ytv3MADX76dO26/g3lXXUvfXsOoq3JYvWo3Tz/9Kg/91GpWSwUGK3jkoWU889gGCffdMpvtZ+PacwKNZo4cauTUsVrOVzbRIBBobQ1oa1XbjER4Cmk7qD0QayH9ino85hOPJ2lujAvw2jh7uoWzp5o4caSefXuq2bLpOK8vWMXDP13Ey08f4uWnDvPEw5t48ZkNLFywnmVLVrF1+waOnNhMcXkzM+d048rry7ni+ghXzM9l/NQsOvXwyMp1aG3xOXwwJjA6zcIXjrHizQY2vltPzXkYMmQwV84by5xrBjBpZikF5S24WTEQy41BLPYwGgPSR4BNs6ReKSW4QEaBJQWZM8OBDAc+eQ5kwOmT5rn9xQFL9sucVlqmPTdJtSIhksRPXytqwcqtJDvvpHwpSWbP68UDfzGDu780k1EjB5ITbceBPY3Y70c9+L2FadPdoje2cvZMG1JiKCnOYuiwDsyfP5i75Z+6+55Z3HTLNGZfOYbRYwdSUprH+aqzHDt2kkMHTgkYNvLs02/yxBMLeOjnz/Oznz7DT3/8FN/+52f56YNv8PSTa1j65n5pOUd4e+kR3liwl+ef3cArL29jwcvbeen5jbzwwjs89+wKHn90ucBvEQ/+4HV++qM3pBEtFL3Cww+9JK1tGatW7GDfrloqTyRpqHMoyCtnQP9+XHfDbK6/aRozZw8UsPTnyuu6CZBKGTCogKKSBPVNZzl4uIpNG8+r7h089JOVPKm6Nq89S8T0ZMTwkVx/4wTue2A2N946mT792+F6jeA0CIBaFE+KwHPB6I80/x1Ix9FhgSml0JIdE4VGZLUppWbODAf+dDnwp9dyuzL/9Fr9p95iKwMt/bofvmKW3i8I7e6+ncRiERiX4jLD4FG5XHtzd77yVxP48tdnc+31V1DWriuH9jcILLYKoF7i+999jod/vpg339zD4cM1IFNVcalDv0Fhps8s4dY7h/H1b87ha9+Yz9XX2FepxzJh4mjsiw/2i7R5efkCrfPs2rmdjRu2pU1r61cfYe2qA/Ln7GfZ0k088+TbPP7oUgHScgHWJl5/bR1PP7GIJx9/mdcWvM3bb21m3bsH2LLxBGvfPczxwy2ETQm5WWWUqr19+3Wn3+Aixk6qwP4y+C13jBHoTuTm20cze+4gLp89jlFjelNYFKK53uPw/hBr36kXCO7jzVd2s+rtg6xcsZM9uw/jhVIMH92L624exK139WTqZR3p1DUq/5HBcQNcNyroiYIFIpMQKwU6MqNKfVKa9x7ZZWAUt4PiK1QeGUwhprgle61o5sxwIMOBT4wDdlV+YpVlKnqPA1YGpqNWINohsKFN+PUN8F2ceBkm1gWTlBNfMjOWqiHhnaa0opFLZhVy5xdGcM+9lzP/usvp03O4/EZZ7Nx2ihdfWMo//eNP+K//7Z/59nce4+VX17J153FOn6+hsbUZT/6inn1KmDajB9dd34/PfX4gX7p3Ag88cCUPfOVmHnjgTr7ytc/xta/fw+233cLV82YzbuwounfrQnZWDqmkIeRF6VDeGfsWXEXn7pS170yv3gMYPnQkY0aPYcL4iUybOpUrLp/J3DmzuEFa0X333cBXv3I7X//L+dx1/wDm3dqBWVe1p8/gXDp0ySK/AAGJIaKyTx0NeElmv1/9dPVSegAACY1JREFU+CBP/bSZ15/2Wb8sxIn9ucRbCujQviPTZg7hjnvGMf/2bgwY7ZJV1Eo8qCNpWgRODp6rtiby8FMqOMgGQb1v6vCNQDsNPI7SLpJR/OJpNwkWkC5ScPFGJsxwIMOBT4gDdmV+QlVlqklzwMpAy3UbShSTfmU5pFsRUVjkkE5Gh80jsqLRGI9wKFvaR4GAIUwgc1N+MUybVcED35wqTWout981m/EThtCjZ1eKCtsRJLPYs6OGV5/fyoPfe4vv/J9lfO8f3+LZJzawYc05ThyNyZ8Up74+iecFlEk7G9g/hylTujH7iqFcM384d94znNs+P4jb7xnGLZ8bxgPfmMV/+R/X8t/+dj5/9TfzuOf+Cdz/F9P56/9xA//9v3+e+798DV+6b7pAc7y0oRHc+5URzLuuCwOGhOjY2aVdqUs04tJUC9WnE9ifUjq0N8a6VdW8tegci18/y5uvneatN0/w7vLj7Nh2lJOn7feqKskr9Bk4rB0zZleo7FHcfvcYmf8GquwiCosThMI+kUgYk/7dO3AcIzOeg2McAmlOge8RpEIk4w7oWh86zXvkKnQJAk95w+9RRGFE6Ta/gsyZ4UCGA58YBzKr7hNj9XsVWVlouW7DdJK9CCsWElkB+d4Nm6wko1uOB1bQGqLKkyvK0nUIR9lDWZBTCGMmFnPLHUP4wv2z+PJXruPOz13DvKuvZOjgkYS9dlSeTLBrWw1r3jnGay9s5eXntvHkI2vlW1rJ449tkpnsGJu3VLNG/ps1qyvZu7uemuok8aQvTQPs/5Bqbklgvw9U0S2fvgOKqOiRTW4+lJY5VHTNoqSdS24OAgjwQhCOIjManD3XxrZt59iy9Qx79pxm26bjLFt4mhee2sujD63miV+9y69+vpxXX9zGwtc2sPiNtZw4fp7S0k4MHdGLmVd04/rb+nHzXYOYNbcTI8bl0mtwHu3au4QiFroTIBiBkIAoG8/LwrHMUapN94NUOma/NBzy8vHcgjQIpRPTH0afllyFjh7xROHfELrWncyZ4UCGA58cB7QSP7nKMjX9cThgX+dOpBK40RTtO3uMHFvOnKsHcdOtI7nzC2O5+75LuOuLU7jlzvFcNX8sg4f2IxQKp7+4u3fPId56ay2PPLIw/dLC448t4vlnV/LCcxt48tGNPPP4Vp57YgeP/3IDv/zpCh75+WpefnYfi189xsIXD/Hmq0ek7Rxn4SuHWbboGCuXH+fNhQd44fltLHh1D6++tINnn1nFU08s5vFfLeIXP1vEE0+8xbr1Gzl85AjNLY2iGhpbzoLbKCCsJSs3Rr+BxUy9tDNXXNmTy+b0Zur0CoYML6JcgORZrPAReIjSp9GnBRYbKvqh0xiD7/sCpICGhkZRQ/r6Q9nS94Mg+GDoX7j+cN7M9aecA5nm/clzIANOf/JDCMb4GDeOnFTgJnAjKaI5KbKLknTo6jBqQjuumNeLq67vz9xrhzLnqmGMG9+TqdMGMf3SkfTu042srCxpSUnaWtukfYSorm5gxfJNrF5xiKVv7OWNV7fz1qK9vPv2Yd556yiLFhzmtRd3s2LJEd5ZdoKXn9vE00+u4KUX17Bk0WZWv7OdTRsOsXH9EY4cPE9dTTxNrpNH+/adpGVl071nO8aMH8DUS4cwe+4w5s0fyQ03T+T6WybKdNedkeOy6NrTIzsPfM3UuFxAcSlBOtVpwKDDfuhm2kxnQ6tJKfm90xh7H5JSmxzH4fDhQxw8ePBjwck+kkql+AD5qTRY2XsZynAgw4FPjgN2NX9ytWVq+qNwIDA+fpAg5beSCppl4GoGtwXHbSMwbSRpxITqyS9qlSnOYeSYYiZN7cSceb257qYRMgHO5Ctfv4ovfekKrrp6OjNnjeLSGSMZOnwQ+XkFZGflpv8FRpfOFRQXl9LcHCMeSxIT1dU1S/OJ09TUQtX5s5w/X0ki2UZuXjZ5+dkyzRXRsWMZ7TuU0qVrJ4YOG8T06cOZdulgRozqzYgxnZk8rTfzrx+rsCtTZ/Vg4pQKOlWE8KKQkm/NFznyiYWiPl44wDgBF4CJ9w47jV3FbWgUfvA0xmCBCR3RaBRLimbODAcyHPgUc8Cu5k9x8z6Jpv3p12FwCXnZafKcKMZ4GP0F+BgnRThs0uS6PsYClpckKl9RVr4hv8Sh3+Bsho0qYcKULsy5qhczrujCzMu7cvOt47nnvol8+euT+a//cwZ//Xcz+PJfTOPG28Zw1xfH8cUvT5GWM5rrbh7BV75xFX/9t3fx9b+8hfu+Mo+7vzSLG28Zyy13jOSOu8fxhXuniaZz2ew+DBzSjqHDrZmuPV27RygoNoSyXHyBTiSbtNaHFxegJohkJXFDceKpRlrb6kj5Al3HB1IigZQ+UV9/Q3zguGim8zwPa9rr1asXffv2xRiTvr54395LSWu6eP2BQjIXGQ5kOPCJc8D5xGvMVPhH4IDBMWEcLDBFcUyWKBvPycE12dh0x0QlkCMiAUG0WWAg/47biBtpwYQFBOEETjgp0AoIZ0MkD3oNCDN0bA5DxuTQZ2g2vQZlM2JCDpfP68DICXlMmFbMZfPaM+nSAsZPKWLspFLGiYYML6T/oDx69s2hfZdsOnbJkcaWS+duWZR2cMgrgtxCUT44HgIfCEcgJK0oII6RidILJTBOTO1VKCCKhAzZWWHCIQd0DReBSZf2/NClTbJkjMF1XZVjiEQihEIhwuFw2lRnTX0WkGzY2tpKW1tbOt0Yg+M46ecsqNk4HzosiF0ENPu8jV8MP5Q1c5nhQIYD/wEOOP+BZzKPfNo4YAWzVSYuhvYXKKyTJnAlw0OisFos6S/wAl2bOJjWC+TIBOg0CiEUuhcocFt0rfuuJRtXejrfe2GoCcIXyCi0RMjmTeo5NcR7HzlJAvnBLhKewMbeN8AHKBDcpAQOvkIbV7OxdDGThzGeUlyRI7LpCi6eH7q8mPzbQgs4rkDr/WSMUR3mtz3ykXQLUJbsDRsaY/5dz9vn/lCUKSfDgc8aB+wq/6z16c+vP0ZdtiP5YbLpaUp/KJPBEMalVFQuKhPZeInCQlxTIMrFdbJFWdIesvRMtijnA+SQK23sQ2S1NalBVui/n7yQh9VW3k+u66CGXCAuHgbHhERRHLJFOaJcDDmQpiyFUVFY5IksSBmF/7HTfQ+YjDHqp5P2Q+Xk5GC1KttWe9+R9mTMx9dhjMHm8WQutGTjloz5+PxkjgwHMhz4d3FAUuLflT+TOcOBDAcyHMhwIMOBPwIHPljk/w8AAP//A0ziawAAAAZJREFUAwCw9Rj6x2wXlAAAAABJRU5ErkJggg==" alt="Stamp and Signature" style={{ height: '65px', objectFit: 'contain', display: 'inline-block' }} />
                    </div>
                    
                    <div style={{ borderTop: '1px solid #94a3b8', display: 'inline-block', width: '200px', paddingTop: '5px', textAlign: 'center', color: '#b8860b', fontWeight: 'bold' }}>
                      {selectedQuote.authorized_rep_name || 'Er. Rahul Sharma'}<br/>
                      <span style={{ fontSize: '8px', color: '#64748b', fontWeight: 'normal' }}>
                        {selectedQuote.authorized_rep_designation || 'Competent Person (Chief Inspector)'}<br/>
                        Global Safety Solution
                      </span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
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
