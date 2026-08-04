"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth";
import { API_BASE_URL } from "@/lib/config";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  Boxes, 
  ShieldAlert, 
  ArrowDownUp, 
  ClipboardList,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  MoreVertical,
  History,
  FileText,
  Warehouse,
  AlertCircle,
  Loader2,
  Eye,
  XCircle
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

interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  min_stock: number;
  current_stock: number;
  price_per_unit?: number;
  status?: string;
  calibration_cert_url?: string;
  invoice_url?: string;
  transactions?: any[];
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [openAdjust, setOpenAdjust] = useState(false);
  const [openLedger, setOpenLedger] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // File upload states for Required Documents
  const [calibFile, setCalibFile] = useState<File | null>(null);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [calibUploading, setCalibUploading] = useState(false);
  const [invoiceUploading, setInvoiceUploading] = useState(false);
  const [calibUrl, setCalibUrl] = useState("");
  const [invoiceUrl, setInvoiceUrl] = useState("");
  const [openDocsModal, setOpenDocsModal] = useState(false);
  const [docsModalItem, setDocsModalItem] = useState<InventoryItem | null>(null);

  const resolveFileUrl = (url?: string) => {
    if (!url) return "";
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    const cleanUrl = url.startsWith('/') ? url : `/${url}`;
    return `${API_BASE_URL}${cleanUrl}`;
  };

  const handleViewPdf = async (fileUrl?: string) => {
    if (!fileUrl) {
      toast.error("No document attached.");
      return;
    }
    try {
      const resolvedUrl = resolveFileUrl(fileUrl);
      if (resolvedUrl.startsWith('data:')) {
        const response = await fetch(resolvedUrl);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
        return;
      }

      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(resolvedUrl, { headers });
      if (!response.ok) throw new Error("Failed to fetch file");
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
    } catch (error) {
      console.error("Failed to view document:", error);
      const resolvedUrl = resolveFileUrl(fileUrl);
      window.open(resolvedUrl, '_blank');
    }
  };

  const handleOpenDocsModal = (item: InventoryItem) => {
    setDocsModalItem(item);
    setCalibUrl(item.calibration_cert_url || "");
    setInvoiceUrl(item.invoice_url || "");
    setCalibFile(null);
    setInvoiceFile(null);
    setOpenDocsModal(true);
  };

  const handleSaveDocsModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !docsModalItem) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/inventory/${docsModalItem.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          calibration_cert_url: calibUrl || null,
          invoice_url: invoiceUrl || null,
        })
      });
      if (res.ok) {
        toast.success("Documents updated successfully!");
        setOpenDocsModal(false);
        fetchInventory();
      } else {
        toast.error("Failed to update documents.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Network error while updating documents.");
    } finally {
      setSubmitting(false);
    }
  };
  
  const token = useAuthStore((state) => state.token);

  const [formData, setFormData] = useState({
    sku: "",
    name: "",
    category: "PPE",
    unit: "PCS",
    min_stock: 0,
    current_stock: 0,
    price_per_unit: 0,
    status: "AVAILABLE",
    description: ""
  });

  const [adjustData, setAdjustData] = useState({
    transaction_type: "IN",
    quantity: 1,
    remarks: ""
  });

  useEffect(() => {
    fetchInventory();
  }, [token]);

  const fetchInventory = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/inventory`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) setItems(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (
    file: File,
    category: string,
    setUploading: (v: boolean) => void,
    setUrl: (v: string) => void
  ) => {
    if (!token) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("name", file.name);
      fd.append("category", category);
      fd.append("file_type", "PDF");
      fd.append("file_size", String(file.size));
      const res = await fetch(`${API_BASE_URL}/documents`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (res.ok) {
        const data = await res.json();
        setUrl(data.file_url || data.url || "");
        toast.success("File uploaded successfully!");
      } else {
        const errText = await res.text();
        console.error("Upload error response:", errText);
        toast.error("File upload failed.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Upload error.");
    } finally {
      setUploading(false);
    }
  };

  const handleCalibFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCalibFile(file);
    uploadFile(file, "CALIBRATION_CERT", setCalibUploading, setCalibUrl);
  };

  const handleInvoiceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setInvoiceFile(file);
    uploadFile(file, "INVENTORY_INVOICE", setInvoiceUploading, setInvoiceUrl);
  };

  const resetForm = () => {
    setFormData({ sku: "", name: "", category: "PPE", unit: "PCS", min_stock: 0, current_stock: 0, price_per_unit: 0, status: "AVAILABLE", description: "" });
    setCalibFile(null);
    setInvoiceFile(null);
    setCalibUrl("");
    setInvoiceUrl("");
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/inventory`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          calibration_cert_url: calibUrl || null,
          invoice_url: invoiceUrl || null,
        })
      });
      if (res.ok) {
        toast.success("Inventory item registered successfully!");
        setOpen(false);
        resetForm();
        fetchInventory();
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.message || "Failed to register item.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkDamaged = async (item: InventoryItem) => {
    const qty = prompt(`How many units of ${item.name} are damaged?`, "1");
    if (!qty || isNaN(Number(qty))) return;

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/inventory/transaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          item_id: item.id,
          transaction_type: "OUT",
          quantity: Number(qty),
          remarks: "DAMAGED / LOSS"
        })
      });
      if (res.ok) {
        fetchInventory();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  // File upload field component
  const FileUploadField = ({
    label,
    required,
    file,
    uploading,
    uploadedUrl,
    onChange,
    accept = ".pdf",
    icon,
    color,
  }: {
    label: string;
    required?: boolean;
    file: File | null;
    uploading: boolean;
    uploadedUrl: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    accept?: string;
    icon: React.ReactNode;
    color: string;
  }) => (
    <div className="space-y-2">
      <Label className="flex items-center gap-1.5 text-sm font-semibold">
        {icon}
        {label} {required && <span className="text-rose-500">*</span>}
      </Label>
      <div className={cn(
        "relative flex flex-col items-center justify-center w-full h-28 rounded-xl border-2 border-dashed transition-all p-3 text-center",
        uploadedUrl
          ? "border-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/15"
          : "border-border bg-background hover:border-primary/40 hover:bg-accent/5 cursor-pointer"
      )}>
        {!uploadedUrl && (
          <input
            type="file"
            accept={accept}
            onChange={onChange}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
        )}
        {uploading ? (
          <div className="flex flex-col items-center gap-1.5">
            <Loader2 className={`w-6 h-6 animate-spin ${color}`} />
            <span className="text-xs text-muted-foreground font-medium">Uploading PDF to server...</span>
          </div>
        ) : uploadedUrl ? (
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <span className="truncate max-w-[180px]">{file?.name || "PDF Uploaded Successfully"}</span>
            </div>
            <div className="flex items-center gap-2 z-10">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleViewPdf(uploadedUrl);
                }}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-extrabold flex items-center gap-1 shadow-sm transition-all border-0 cursor-pointer"
              >
                <Eye className="w-3 h-3" /> Preview PDF
              </button>
              <label className="px-2.5 py-1 bg-accent hover:bg-accent/80 text-foreground rounded-lg text-[11px] font-bold transition-all cursor-pointer">
                Change
                <input
                  type="file"
                  accept={accept}
                  onChange={onChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 pointer-events-none">
            <FileText className={`w-6 h-6 ${color}`} />
            <span className="text-xs text-muted-foreground font-medium">Click to upload PDF</span>
            <span className="text-[10px] text-muted-foreground/60 uppercase font-bold">PDF ONLY</span>
          </div>
        )}
      </div>
    </div>
  );

  const handleViewLedger = (item: InventoryItem) => {
    setSelectedItem(item);
    setOpenLedger(true);
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedItem) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/inventory/transaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...adjustData,
          item_id: selectedItem.id
        })
      });
      if (res.ok) {
        setOpenAdjust(false);
        setAdjustData({ transaction_type: "IN", quantity: 1, remarks: "" });
        fetchInventory();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const stats = [
    { 
      label: "Total Inventory", 
      value: items.length, 
      icon: Boxes, 
      color: "text-blue-600 dark:text-blue-400", 
      bg: "bg-blue-500/10" 
    },
    { 
      label: "Critical Stock", 
      value: items.filter(i => i.current_stock <= i.min_stock && i.current_stock > 0).length, 
      icon: AlertTriangle, 
      color: "text-amber-600 dark:text-amber-400", 
      bg: "bg-amber-500/10" 
    },
    { 
      label: "Out of Stock", 
      value: items.filter(i => i.current_stock === 0).length, 
      icon: ShieldAlert, 
      color: "text-rose-600 dark:text-rose-400", 
      bg: "bg-rose-500/10" 
    },
    { 
      label: "Stock Value", 
      value: `₹${(items.reduce((acc, i) => acc + (i.current_stock * (i.price_per_unit || 0)), 0) / 1000).toFixed(1)}K`, 
      icon: TrendingDown, 
      color: "text-emerald-600 dark:text-emerald-400", 
      bg: "bg-emerald-500/10" 
    }
  ];

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-600">
            Inventory Ledger
          </h1>
          <p className="text-muted-foreground font-medium">Real-time tracking of safety gear, PPE, and equipment stock.</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-xl shadow-emerald-500/20 px-8 h-12 transition-all active:scale-95 border-0" />}>
              <Plus className="w-5 h-5 mr-2" /> Register New Item
          </DialogTrigger>
          <DialogContent className="sm:max-w-[650px] bg-card border-border text-foreground max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">New Inventory Entry</DialogTitle>
              <DialogDescription className="text-muted-foreground">Initialize a new item in the central safety registry.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateItem} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>SKU / Model Number *</Label>
                  <Input required value={formData.sku} onChange={(e) => setFormData({...formData, sku: e.target.value})} placeholder="PPE-HLMT-001" className="bg-background border-border text-foreground" />
                </div>
                <div className="space-y-2">
                  <Label>Item Name *</Label>
                  <Input required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Industrial Safety Helmet" className="bg-background border-border text-foreground" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full bg-background border border-border rounded-md h-10 px-3 text-sm text-foreground">
                    <option>PPE</option>
                    <option>Fire Safety</option>
                    <option>Medical / First Aid</option>
                    <option>Signage</option>
                    <option>Tools</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Unit of Measure</Label>
                  <Input value={formData.unit} onChange={(e) => setFormData({...formData, unit: e.target.value})} placeholder="PCS, KGS, MTRS" className="bg-background border-border text-foreground" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Initial Status</Label>
                  <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full bg-background border border-border rounded-md h-10 px-3 text-sm text-foreground">
                    <option value="AVAILABLE">AVAILABLE</option>
                    <option value="IN_USE">IN USE</option>
                    <option value="MAINTENANCE">MAINTENANCE</option>
                    <option value="NOT_IN_USE">NOT IN USE</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Price Per Unit</Label>
                  <Input type="number" value={formData.price_per_unit} onChange={(e) => setFormData({...formData, price_per_unit: Number(e.target.value)})} className="bg-background border-border text-foreground" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Min Stock Level</Label>
                  <Input type="number" value={formData.min_stock} onChange={(e) => setFormData({...formData, min_stock: Number(e.target.value)})} className="bg-background border-border text-foreground" />
                </div>
                <div className="space-y-2">
                  <Label>Opening Stock</Label>
                  <Input type="number" value={formData.current_stock} onChange={(e) => setFormData({...formData, current_stock: Number(e.target.value)})} className="bg-background border-border text-foreground" />
                </div>
              </div>              {/* PDF Upload Section */}
              <div className="border border-border rounded-xl p-4 space-y-4 bg-muted/20">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5" /> Optional Documents
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <FileUploadField
                    label="Calibration Certificate"
                    file={calibFile}
                    uploading={calibUploading}
                    uploadedUrl={calibUrl}
                    onChange={handleCalibFileChange}
                    icon={<FileText className="w-3.5 h-3.5 text-indigo-500" />}
                    color="text-indigo-500"
                  />
                  <FileUploadField
                    label="Invoice / Bill"
                    file={invoiceFile}
                    uploading={invoiceUploading}
                    uploadedUrl={invoiceUrl}
                    onChange={handleInvoiceFileChange}
                    icon={<FileText className="w-3.5 h-3.5 text-violet-500" />}
                    color="text-violet-500"
                  />
                </div>
                {(!calibUrl || !invoiceUrl) && (
                  <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Note: You can upload these documents later if skipped.
                  </p>
                )}
              </div>
 
              <DialogFooter className="pt-4">
                <Button
                  type="submit"
                  disabled={submitting || calibUploading || invoiceUploading}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold w-full h-12 shadow-xl shadow-emerald-500/20 border-0 disabled:opacity-50"
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                  ) : (calibUploading || invoiceUploading) ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading Files...</>
                  ) : (
                    "Authorize Entry"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-card/40 border border-border rounded-2xl p-5 flex items-center justify-between gap-4 shadow-sm backdrop-blur-md hover:border-primary/20 transition-all group min-w-0">
            <div className="space-y-1 min-w-0">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest truncate">{stat.label}</p>
              <p className="text-2xl sm:text-3xl font-black text-foreground group-hover:text-primary transition-colors truncate">{stat.value}</p>
            </div>
            <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center ${stat.color} shadow-lg shadow-black/5 shrink-0`}>
              <stat.icon className="w-6 h-6" />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-card/40 border border-border rounded-3xl overflow-hidden shadow-sm backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Item Details</th>
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Category</th>
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest text-center">Stock Level</th>
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Documents</th>
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground italic font-medium">Syncing with warehouse database...</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground italic text-[10px] uppercase font-bold tracking-widest">No items found in the registry.</td>
                </tr>
              ) : items.map((item) => (
                <tr key={item.id} className="hover:bg-accent/5 transition-colors group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center border border-border group-hover:border-primary/30 transition-all">
                        <Package className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
                      </div>
                      <div>
                        <div className="text-foreground font-bold">{item.name}</div>
                        <div className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">{item.sku}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="bg-muted px-2.5 py-1 rounded text-[10px] font-bold text-muted-foreground uppercase">{item.category}</span>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <div className="text-foreground font-black text-lg">{item.current_stock} <span className="text-[10px] font-medium text-muted-foreground">{item.unit}</span></div>
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Min: {item.min_stock}</div>
                  </td>
                  <td className="px-6 py-5">
                    {item.current_stock === 0 ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20 whitespace-nowrap">Out of Stock</span>
                    ) : item.current_stock <= item.min_stock ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20 whitespace-nowrap">Critical Stock</span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20 whitespace-nowrap">{item.status || "Healthy"}</span>
                    )}
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      {item.calibration_cert_url ? (
                        <button
                          type="button"
                          onClick={() => handleViewPdf(item.calibration_cert_url)}
                          title="View Calibration Certificate"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-md shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer border-0"
                        >
                          <Eye className="w-3.5 h-3.5" /> Calib.
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenDocsModal(item)}
                          title="Click to Upload Calibration Certificate"
                          className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground font-bold text-xs transition-all border border-border/80 cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5 text-rose-500/70" /> Calib.
                        </button>
                      )}
                      {item.invoice_url ? (
                        <button
                          type="button"
                          onClick={() => handleViewPdf(item.invoice_url)}
                          title="View Invoice"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-extrabold text-xs shadow-md shadow-violet-500/20 active:scale-95 transition-all cursor-pointer border-0"
                        >
                          <Eye className="w-3.5 h-3.5" /> Invoice
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenDocsModal(item)}
                          title="Click to Upload Invoice"
                          className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground font-bold text-xs transition-all border border-border/80 cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5 text-rose-500/70" /> Invoice
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                       <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hover:bg-accent/10 rounded-xl" />}>
                             <MoreVertical className="w-4 h-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-card border-border text-foreground min-w-[200px] shadow-2xl rounded-xl p-2">
                          <DropdownMenuItem onClick={() => handleOpenDocsModal(item)} className="hover:bg-accent/10 cursor-pointer flex items-center gap-3 py-3 rounded-xl font-bold text-sm">
                            <FileText className="w-4 h-4 text-indigo-500" /> Upload / Update PDFs
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setSelectedItem(item); setOpenAdjust(true); }} className="hover:bg-accent/10 cursor-pointer flex items-center gap-3 py-3 rounded-xl font-bold text-sm">
                            <ArrowDownUp className="w-4 h-4 text-muted-foreground" /> Stock Adjustment
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewLedger(item)} className="hover:bg-accent/10 cursor-pointer flex items-center gap-3 py-3 rounded-xl font-bold text-sm">
                            <History className="w-4 h-4 text-muted-foreground" /> View Ledger
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleMarkDamaged(item)} className="hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 cursor-pointer flex items-center gap-3 py-3 rounded-xl font-bold text-sm mt-1 border-t border-border">
                            <ClipboardList className="w-4 h-4" /> Mark Damaged
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

      {/* Stock Adjustment Dialog */}
      <Dialog open={openAdjust} onOpenChange={setOpenAdjust}>
        <DialogContent className="sm:max-w-[450px] bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <ArrowDownUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> Adjust Stock Levels
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Update quantity for <span className="text-foreground font-bold">{selectedItem?.name}</span>
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdjustStock} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Adjustment Type</Label>
                <select 
                  value={adjustData.transaction_type} 
                  onChange={(e) => setAdjustData({...adjustData, transaction_type: e.target.value})}
                  className="w-full bg-background border border-border rounded-md h-10 px-3 text-sm text-foreground"
                >
                  <option value="IN">STOCK IN (+)</option>
                  <option value="OUT">STOCK OUT (-)</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Quantity ({selectedItem?.unit})</Label>
                <Input type="number" min="1" value={adjustData.quantity} onChange={(e) => setAdjustData({...adjustData, quantity: Number(e.target.value)})} className="bg-background border-border text-foreground" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Remarks / Reference</Label>
              <textarea 
                value={adjustData.remarks} 
                onChange={(e) => setAdjustData({...adjustData, remarks: e.target.value})}
                placeholder="e.g. New shipment from vendor, Assigned to Project A"
                className="w-full bg-background border border-border rounded-md p-3 text-sm min-h-[80px] text-foreground"
              />
            </div>
            <DialogFooter className="pt-4">
              <Button type="submit" disabled={submitting} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold w-full h-11 border-0">
                {submitting ? "Updating Ledger..." : "Commit Adjustment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Ledger Dialog */}
      <Dialog open={openLedger} onOpenChange={setOpenLedger}>
        <DialogContent className="sm:max-w-[700px] bg-card border-border text-foreground p-0 overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-600" />
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
              <History className="w-6 h-6 text-indigo-600 dark:text-indigo-400" /> Stock Transaction Ledger
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Complete historical movement log for <span className="text-foreground font-bold">{selectedItem?.name}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="p-6">
            <div className="bg-accent/5 border border-border rounded-2xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Timestamp</th>
                    <th className="px-4 py-3 text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Type</th>
                    <th className="px-4 py-3 text-muted-foreground font-bold uppercase tracking-widest text-[10px] text-center">Qty</th>
                    <th className="px-4 py-3 text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(!selectedItem?.transactions || selectedItem.transactions.length === 0) ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground italic">No transactions recorded yet.</td>
                    </tr>
                  ) : (
                    selectedItem.transactions.map((t: any, i: number) => (
                      <tr key={i} className="hover:bg-accent/5">
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {new Date(t.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn("px-2 py-0.5 rounded text-[10px] font-black", 
                            t.transaction_type === 'IN' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                          )}>
                            {t.transaction_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-foreground">
                          {t.transaction_type === 'IN' ? '+' : '-'}{t.quantity}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {t.remarks || "--"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <DialogFooter className="p-4 bg-accent/5 border-t border-border">
            <Button onClick={() => setOpenLedger(false)} className="bg-accent hover:bg-accent/80 text-foreground border-0">Close Ledger</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Attach / Update Documents Dialog */}
      <Dialog open={openDocsModal} onOpenChange={setOpenDocsModal}>
        <DialogContent className="sm:max-w-[550px] bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-500" /> Upload / Update Documents
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Attach Calibration Certificate and Invoice PDFs for <span className="text-foreground font-bold">{docsModalItem?.name}</span>
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveDocsModal} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <FileUploadField
                label="Calibration Certificate"
                file={calibFile}
                uploading={calibUploading}
                uploadedUrl={calibUrl}
                onChange={handleCalibFileChange}
                icon={<FileText className="w-3.5 h-3.5 text-indigo-500" />}
                color="text-indigo-500"
              />
              <FileUploadField
                label="Invoice / Bill"
                file={invoiceFile}
                uploading={invoiceUploading}
                uploadedUrl={invoiceUrl}
                onChange={handleInvoiceFileChange}
                icon={<FileText className="w-3.5 h-3.5 text-violet-500" />}
                color="text-violet-500"
              />
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="submit"
                disabled={submitting || calibUploading || invoiceUploading}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold w-full h-11 border-0 shadow-lg shadow-indigo-500/20"
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving Changes...</>
                ) : (calibUploading || invoiceUploading) ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading PDFs...</>
                ) : (
                  "Save Attached Documents"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
