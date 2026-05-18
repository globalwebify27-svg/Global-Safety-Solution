"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth";
import { API_BASE_URL } from "@/lib/config";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { 
  Monitor, 
  Smartphone, 
  Plus, 
  Search, 
  Filter, 
  UserPlus, 
  Wrench, 
  ShieldCheck, 
  Calendar,
  AlertCircle,
  MoreVertical,
  ArrowRightLeft,
  Truck,
  HardDrive,
  Hash,
  Tag
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

interface Asset {
  id: string;
  asset_tag: string;
  name: string;
  serial_number?: string;
  status: string;
  assigned_to?: string;
  assignee?: { name: string; designation?: string };
  purchase_date?: string;
}

interface User {
  id: string;
  name: string;
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [maintenanceOpen, setMaintenanceOpen] = useState(false);
  const [missingOpen, setMissingOpen] = useState(false);
  const [newAssigneeId, setNewAssigneeId] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  
  const token = useAuthStore((state) => state.token);

  const [formData, setFormData] = useState({
    asset_tag: "",
    name: "",
    serial_number: "",
    model_number: "",
    purchase_date: "",
    purchase_value: 0,
    status: "AVAILABLE",
    assigned_to: ""
  });

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [assetRes, userRes] = await Promise.all([
        fetch(`${API_BASE_URL}/assets`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/users`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      const assetData = await assetRes.json();
      const userData = await userRes.json();
      
      if (Array.isArray(assetData)) setAssets(assetData);
      if (Array.isArray(userData)) setUsers(userData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/assets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setOpen(false);
        setFormData({ asset_tag: "", name: "", serial_number: "", model_number: "", purchase_date: "", purchase_value: 0, status: "AVAILABLE", assigned_to: "" });
        fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReassignAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset || !token) return;
    setActionLoading(true);
    try {
      const isPool = newAssigneeId === "";
      const res = await fetch(`${API_BASE_URL}/assets/${selectedAsset.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          assigned_to: isPool ? null : newAssigneeId,
          status: isPool ? 'AVAILABLE' : 'IN_USE'
        })
      });
      if (res.ok) {
        toast.success(`Asset reassigned successfully!`);
        setReassignOpen(false);
        fetchData();
      } else {
        toast.error("Failed to reassign asset.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error reassigning asset.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleScheduleMaintenance = async () => {
    if (!selectedAsset || !token) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/assets/${selectedAsset.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status: 'MAINTENANCE',
          assigned_to: null
        })
      });
      if (res.ok) {
        toast.success(`Asset marked under maintenance.`);
        setMaintenanceOpen(false);
        fetchData();
      } else {
        toast.error("Failed to schedule maintenance.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error scheduling maintenance.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReportMissing = async () => {
    if (!selectedAsset || !token) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/assets/${selectedAsset.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status: 'RETIRED'
        })
      });
      if (res.ok) {
        toast.success(`Asset reported as missing/retired.`);
        setMissingOpen(false);
        fetchData();
      } else {
        toast.error("Failed to report missing.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error reporting missing.");
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20 shadow-emerald-500/10';
      case 'IN_USE': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-blue-500/20 shadow-blue-500/10';
      case 'MAINTENANCE': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-500/20 shadow-amber-500/10';
      case 'RETIRED': return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-rose-500/20 shadow-rose-500/10';
      default: return 'bg-muted text-muted-foreground ring-border';
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600">
            Asset Registry
          </h1>
          <p className="text-muted-foreground font-medium">Track high-value equipment, IT assets, and operational hardware.</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-xl shadow-indigo-500/20 px-8 h-12 transition-all active:scale-95 border-0" />}>
              <Plus className="w-5 h-5 mr-2" /> Register Asset
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] bg-card border-border text-foreground rounded-[2rem]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">New Enterprise Asset</DialogTitle>
              <DialogDescription className="text-muted-foreground">Record a new physical asset and assign it to personnel.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateAsset} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Asset Tag (Unique ID) *</Label>
                  <Input required value={formData.asset_tag} onChange={(e) => setFormData({...formData, asset_tag: e.target.value})} placeholder="GSS-AST-2026-001" className="bg-background border-border text-foreground" />
                </div>
                <div className="space-y-2">
                  <Label>Asset Name *</Label>
                  <Input required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Laptop - Dell Latitude" className="bg-background border-border text-foreground" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Serial Number</Label>
                  <Input value={formData.serial_number} onChange={(e) => setFormData({...formData, serial_number: e.target.value})} placeholder="SN: 8XJ2K92" className="bg-background border-border text-foreground" />
                </div>
                <div className="space-y-2">
                  <Label>Initial Status</Label>
                  <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full bg-background border border-border rounded-md h-10 px-3 text-sm text-foreground">
                    <option value="AVAILABLE">AVAILABLE</option>
                    <option value="IN_USE">IN USE</option>
                    <option value="MAINTENANCE">MAINTENANCE</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Assign to Personnel</Label>
                <select value={formData.assigned_to} onChange={(e) => setFormData({...formData, assigned_to: e.target.value})} className="w-full bg-background border border-border rounded-md h-10 px-3 text-sm text-foreground">
                  <option value="">Keep in Central Pool</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <DialogFooter className="pt-4">
                <Button type="submit" disabled={submitting} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold w-full h-12 shadow-xl shadow-indigo-500/20 border-0">
                  {submitting ? "Processing..." : "Authorize Registry"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: "Tracked Assets", value: assets.length, icon: Tag, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10" },
          { label: "Currently Assigned", value: assets.filter(a => a.status === 'IN_USE').length, icon: UserPlus, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-500/10" },
          { label: "Maintenance Required", value: assets.filter(a => a.status === 'MAINTENANCE').length, icon: Wrench, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/10" }
        ].map((stat, i) => (
          <div key={i} className="bg-card/40 border border-border rounded-2xl p-6 flex items-center justify-between shadow-sm backdrop-blur-md hover:border-primary/20 transition-all group">
            <div className="space-y-1">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</p>
              <p className="text-3xl font-black text-foreground group-hover:text-primary transition-colors">{stat.value}</p>
            </div>
            <div className={`w-14 h-14 rounded-2xl ${stat.bg} flex items-center justify-center ${stat.color} shadow-lg shadow-black/5`}>
              <stat.icon className="w-7 h-7" />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-card/40 border border-border rounded-3xl overflow-hidden shadow-sm backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Asset & Tag</th>
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Serial Number</th>
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Assignment</th>
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground italic font-medium">Syncing with hardware registry...</td>
                </tr>
              ) : assets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground italic text-[10px] uppercase font-bold tracking-widest">No assets currently registered.</td>
                </tr>
              ) : assets.map((asset) => (
                <tr key={asset.id} className="hover:bg-accent/5 transition-colors group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center border border-border group-hover:border-primary/30 transition-all">
                        {asset.name.toLowerCase().includes('phone') ? <Smartphone className="w-5 h-5 text-muted-foreground group-hover:text-primary" /> : <Monitor className="w-5 h-5 text-muted-foreground group-hover:text-primary" />}
                      </div>
                      <div>
                        <div className="text-foreground font-bold">{asset.name}</div>
                        <div className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">{asset.asset_tag}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2 text-muted-foreground font-mono text-xs">
                      <Hash className="w-3 h-3" /> {asset.serial_number || "NO_SERIAL"}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    {asset.assignee ? (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                          <UserPlus className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <div className="text-foreground font-bold text-xs">{asset.assignee.name}</div>
                          <div className="text-muted-foreground text-[10px] font-medium">{asset.assignee.designation || "Staff"}</div>
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs italic font-medium">Unassigned / Central Pool</span>
                    )}
                  </td>
                  <td className="px-6 py-5">
                    <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ring-1", getStatusStyle(asset.status))}>
                      {asset.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                       <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hover:bg-accent/10 rounded-xl" />}>
                             <MoreVertical className="w-4 h-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-card border-border text-foreground min-w-[180px] shadow-2xl rounded-xl p-2">
                          <DropdownMenuItem 
                            onClick={() => {
                              setSelectedAsset(asset);
                              setNewAssigneeId(asset.assigned_to || "");
                              setReassignOpen(true);
                            }}
                            className="hover:bg-accent/10 cursor-pointer flex items-center gap-3 py-3 rounded-xl font-bold text-sm"
                          >
                            <ArrowRightLeft className="w-4 h-4 text-muted-foreground" /> Reassign Asset
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => {
                              setSelectedAsset(asset);
                              setMaintenanceOpen(true);
                            }}
                            className="hover:bg-accent/10 cursor-pointer flex items-center gap-3 py-3 rounded-xl font-bold text-sm"
                          >
                            <Wrench className="w-4 h-4 text-muted-foreground" /> Schedule Maintenance
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => {
                              setSelectedAsset(asset);
                              setMissingOpen(true);
                            }}
                            className="hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 cursor-pointer flex items-center gap-3 py-3 rounded-xl font-bold text-sm mt-1 border-t border-border"
                          >
                            <AlertCircle className="w-4 h-4" /> Report Missing
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

      {/* Reassign Dialog */}
      <Dialog open={reassignOpen} onOpenChange={setReassignOpen}>
        <DialogContent className="sm:max-w-[480px] bg-card border-border text-foreground rounded-[2rem] p-6 z-[9999] transform-gpu isolate">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-indigo-500" /> Reassign Asset
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Change personnel assignment for <strong className="text-foreground">{selectedAsset?.name}</strong> ({selectedAsset?.asset_tag}).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleReassignAsset} className="space-y-6 mt-4">
            <div className="space-y-2">
              <Label>Select Personnel</Label>
              <select 
                value={newAssigneeId} 
                onChange={(e) => setNewAssigneeId(e.target.value)} 
                className="w-full bg-background border border-border rounded-md h-12 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">Return to Central Pool (Available)</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="ghost" onClick={() => setReassignOpen(false)} className="rounded-xl font-bold border-0">
                Cancel
              </Button>
              <Button type="submit" disabled={actionLoading} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl px-6 border-0 shadow-lg shadow-indigo-500/20">
                {actionLoading ? "Updating..." : "Confirm Reassignment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Schedule Maintenance Dialog */}
      <Dialog open={maintenanceOpen} onOpenChange={setMaintenanceOpen}>
        <DialogContent className="sm:max-w-[480px] bg-card border-border text-foreground rounded-[2rem] p-6 z-[9999] transform-gpu isolate">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Wrench className="w-5 h-5 text-amber-500" /> Schedule Maintenance
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Are you sure you want to schedule maintenance for <strong className="text-foreground">{selectedAsset?.name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 text-sm text-muted-foreground">
            <p>This action will:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Set status to <span className="text-amber-500 font-bold">MAINTENANCE</span>.</li>
              <li>Revoke current personnel assignment and return to Central Pool.</li>
            </ul>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={() => setMaintenanceOpen(false)} className="rounded-xl font-bold border-0">
              Cancel
            </Button>
            <Button type="button" onClick={handleScheduleMaintenance} disabled={actionLoading} className="bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl px-6 border-0 shadow-lg shadow-amber-500/20">
              {actionLoading ? "Scheduling..." : "Proceed with Maintenance"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Missing Dialog */}
      <Dialog open={missingOpen} onOpenChange={setMissingOpen}>
        <DialogContent className="sm:max-w-[480px] bg-card border-border text-foreground rounded-[2rem] p-6 z-[9999] transform-gpu isolate">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-rose-500">
              <AlertCircle className="w-5 h-5" /> Report Missing / Retired
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Are you sure you want to flag <strong className="text-foreground">{selectedAsset?.name}</strong> as missing?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 text-sm text-muted-foreground">
            <p className="text-rose-500 font-medium">Warning: This action is an administrative lock.</p>
            <p>The asset's status will be changed to <span className="text-rose-500 font-bold">RETIRED</span> to reflect that it is no longer active in inventory.</p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={() => setMissingOpen(false)} className="rounded-xl font-bold border-0">
              Cancel
            </Button>
            <Button type="button" onClick={handleReportMissing} disabled={actionLoading} className="bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl px-6 border-0 shadow-lg shadow-rose-500/20">
              {actionLoading ? "Reporting..." : "Report Missing"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
