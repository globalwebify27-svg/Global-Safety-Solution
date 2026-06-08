"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth";
import { API_BASE_URL } from "@/lib/config";
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
  Warehouse
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
  
  const token = useAuthStore((state) => state.token);

  const [formData, setFormData] = useState({
    sku: "",
    name: "",
    category: "PPE",
    unit: "PCS",
    min_stock: 0,
    current_stock: 0,
    price_per_unit: 0,
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
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setOpen(false);
        setFormData({ sku: "", name: "", category: "PPE", unit: "PCS", min_stock: 0, current_stock: 0, price_per_unit: 0, description: "" });
        fetchInventory();
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
          <DialogContent className="sm:max-w-[600px] bg-card border-border text-foreground">
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
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Min Stock Level</Label>
                  <Input type="number" value={formData.min_stock} onChange={(e) => setFormData({...formData, min_stock: Number(e.target.value)})} className="bg-background border-border text-foreground" />
                </div>
                <div className="space-y-2">
                  <Label>Opening Stock</Label>
                  <Input type="number" value={formData.current_stock} onChange={(e) => setFormData({...formData, current_stock: Number(e.target.value)})} className="bg-background border-border text-foreground" />
                </div>
                <div className="space-y-2">
                  <Label>Price Per Unit</Label>
                  <Input type="number" value={formData.price_per_unit} onChange={(e) => setFormData({...formData, price_per_unit: Number(e.target.value)})} className="bg-background border-border text-foreground" />
                </div>
              </div>
              <DialogFooter className="pt-4">
                <Button type="submit" disabled={submitting} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold w-full h-12 shadow-xl shadow-emerald-500/20 border-0">
                  {submitting ? "Processing..." : "Authorize Entry"}
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
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground italic font-medium">Syncing with warehouse database...</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground italic text-[10px] uppercase font-bold tracking-widest">No items found in the registry.</td>
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
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20 whitespace-nowrap">Healthy</span>
                    )}
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                       <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hover:bg-accent/10 rounded-xl" />}>
                             <MoreVertical className="w-4 h-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-card border-border text-foreground min-w-[180px] shadow-2xl rounded-xl p-2">
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
    </div>
  );
}
