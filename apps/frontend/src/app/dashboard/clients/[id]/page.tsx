"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { API_BASE_URL } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2, Mail, Phone, MapPin, FileText, ShieldAlert, CheckCircle2, User, Briefcase, CheckSquare, Calendar, Activity, AlertCircle, Clock, ChevronDown, ChevronUp, BarChart2, Users, Layers, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface Compliance {
  id: string;
  compliance_type: string;
  expiry_date: string;
  status: string;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  assigned_to?: string;
  due_date?: string;
  priority: string;
  status: string;
  assignee?: {
    name: string;
    email?: string;
  };
}

interface WorkOrder {
  id: string;
  work_order_no: string;
  description?: string;
  status: string;
  scheduled_date?: string;
  completed_date?: string;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  status: string;
  tasks?: Task[];
  work_orders?: WorkOrder[];
}

interface Inspection {
  id: string;
  status: string;
  scheduled_date?: string;
  location?: string;
}

interface AssignedClient {
  id: string;
  name: string;
  industry?: string;
  city?: string;
  is_active: boolean;
}

interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  gst_number?: string;
  pan_number?: string;
  industry?: string;
  city?: string;
  is_active: boolean;
  created_at?: string;
  compliances?: Compliance[];
  assigned_staff?: {
    id: string;
    name: string;
    designation?: string;
    email?: string;
    assigned_clients?: AssignedClient[];
  };
  projects?: Project[];
  inspections?: Inspection[];
  auditLogs?: AuditLog[];
}

interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  old_data: {
    assigned_staff_id?: string | null;
    assigned_staff_name: string;
    completed_projects: number;
    pending_projects: number;
    completed_tasks: number;
    pending_tasks: number;
    completed_work_orders: number;
    pending_work_orders: number;
    completed_inspections: number;
    pending_inspections: number;
  } | null;
  new_data: {
    assigned_staff_id?: string | null;
    assigned_staff_name: string;
  } | null;
  created_at: string;
}


export default function ClientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [isWorkloadAnalyzed, setIsWorkloadAnalyzed] = useState(false);
  
  // Reallocation States
  const [usersList, setUsersList] = useState<any[]>([]);
  const [isTransferring, setIsTransferring] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [savingTransfer, setSavingTransfer] = useState(false);
  const isSuperAdmin = 
    user?.role === 'SUPER_ADMIN' || 
    user?.role === 'ADMIN' || 
    (user as any)?.roles?.some((ur: any) => ur.role?.name === 'SUPER_ADMIN' || ur.role?.name === 'ADMIN');

  const fetchClientDetails = () => {
    if (!token) return;
    const url = `${API_BASE_URL}/clients/${id}`;
    fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(async (r) => {
      if (!r.ok) {
        const errorData = await r.json().catch(() => ({}));
        throw new Error(errorData.message || `Server responded with ${r.status}`);
      }
      return r.json();
    })
    .then(data => {
      setClient(data);
      setLoading(false);
    })
    .catch((e) => {
      console.error("[ClientProfilePage] Fetch error:", e.message || e);
      setActionError(`Fetch Failed: ${e.message || 'Check connection'}`);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchClientDetails();
  }, [id, token]);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE_URL}/users`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(r => {
      if (!r.ok) throw new Error("Could not load users list");
      return r.json();
    })
    .then(data => {
      if (Array.isArray(data)) {
        setUsersList(data.filter((u: any) => u.is_active));
      }
    })
    .catch(err => {
      console.warn("Failed to load user list:", err.message);
    });
  }, [token]);

  const handleTransfer = async () => {
    if (!token || !client || !selectedStaffId) return;
    setSavingTransfer(true);
    setActionError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/clients/${id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ assigned_staff_id: selectedStaffId })
      });
      if (res.ok) {
        // Retrieve fresh state to recalculate workloads in real-time
        const freshRes = await fetch(`${API_BASE_URL}/clients/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (freshRes.ok) {
          const freshData = await freshRes.json();
          setClient(freshData);
        }
        setIsTransferring(false);
        setSelectedStaffId("");
      } else if (res.status === 403) {
        setActionError('Permission denied: you do not have UPDATE_CLIENT access.');
      } else {
        setActionError(`Server error: ${res.status} ${res.statusText}`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setActionError(`Transfer Error: ${message}`);
    } finally {
      setSavingTransfer(false);
    }
  };

  const toggleStatus = async () => {
    if (!token || !client) return;
    setToggling(true);
    setActionError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/clients/${id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ is_active: !client.is_active })
      });
      if (res.ok) {
        setClient({ ...client, is_active: !client.is_active });
      } else if (res.status === 403) {
        setActionError('Permission denied: you do not have UPDATE_CLIENT access.');
      } else {
        setActionError(`Server error: ${res.status} ${res.statusText}`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setActionError(`Fetch Error: ${message}`);
      console.warn('[toggleStatus] Raw error:', message);
    } finally {
      setToggling(false);
    }
  };

  if (loading) return <div className="p-8 text-muted-foreground animate-pulse text-center font-bold uppercase tracking-widest text-xs">Loading client profile...</div>;
  if (!client) return <div className="p-8 text-destructive font-bold">Client not found.</div>;

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-10">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-border pb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/dashboard/clients')} className="text-muted-foreground hover:text-foreground hover:bg-accent/10 rounded-xl h-10 px-4 border-0 transition-all">
            <ArrowLeft className="w-5 h-5 mr-2" /> Back to Registry
          </Button>
          <div>
            <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-foreground">{client.name}</h1>
            <p className="text-muted-foreground text-xs font-mono mt-1 uppercase tracking-widest bg-accent/5 px-2 py-0.5 rounded inline-block">Client ID: {client.id.split('-')[0]}</p>
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-2">
          <Button 
            disabled={toggling}
            onClick={toggleStatus}
            className={`font-black uppercase tracking-widest text-[10px] px-6 h-10 rounded-xl shadow-lg transition-all active:scale-95 border-0 ${
              client.is_active 
                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 shadow-rose-500/10" 
                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 shadow-emerald-500/10"
            }`}
          >
            {toggling ? "Updating..." : (client.is_active ? "Deactivate Client" : "Re-Activate Client")}
          </Button>
          {actionError && (
            <p className="text-[10px] text-rose-500 font-bold max-w-xs text-right uppercase">{actionError}</p>
          )}
        </div>
      </div>

      {/* Profile Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Organization Details */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-card/40 backdrop-blur-md rounded-3xl border border-border p-8 shadow-sm">
            <h3 className="text-xl font-bold text-foreground mb-8 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-primary" />
              </div>
              Corporate Intelligence
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
              <div className="space-y-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">Industry Sector</label>
                  <p className="text-foreground mt-1 font-bold text-lg">{client.industry || "Not classified"}</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">Operating City</label>
                  <p className="text-foreground mt-1 font-bold text-lg">{client.city || "Not provided"}</p>
                </div>
              </div>
              <div className="space-y-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">Official Dispatch</label>
                  <p className="text-foreground mt-1 font-bold text-lg break-all">{client.email || "No email mapped"}</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">Communication Line</label>
                  <p className="text-foreground mt-1 font-bold text-lg">{client.phone || "No direct line"}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card/40 backdrop-blur-md rounded-3xl border border-border p-8 shadow-sm">
            <h3 className="text-xl font-bold text-foreground mb-8 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              Compliance Status
            </h3>
            {client.compliances && client.compliances.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                 {client.compliances.map((c) => (
                    <div key={c.id} className="flex items-center justify-between p-5 rounded-2xl bg-background border border-border hover:border-primary/20 transition-all shadow-sm group">
                      <div className="space-y-1">
                        <p className="font-bold text-foreground text-lg group-hover:text-primary transition-colors">{c.compliance_type}</p>
                        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1">Expiry: {new Date(c.expiry_date).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                      </div>
                      <span className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter bg-primary/10 text-primary ring-1 ring-primary/20 shadow-sm">{c.status}</span>
                    </div>
                 ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground bg-muted/20 rounded-2xl border border-dashed border-border">
                <CheckCircle2 className="w-12 h-12 mb-4 opacity-20" />
                <p className="font-bold uppercase tracking-widest text-[10px]">No active compliance cases assigned yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Auth & Financials */}
        <div className="space-y-6">
          <div className="bg-card/40 backdrop-blur-md rounded-3xl border border-border p-8 shadow-sm">
            <h3 className="text-xl font-bold text-foreground mb-8">Tax & Fiscal</h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">Goods & Services Tax (GST)</label>
                <div className="mt-2 px-4 py-3 rounded-xl bg-background border border-border font-mono text-base font-black tracking-widest text-emerald-600 dark:text-emerald-400 shadow-inner">
                  {client.gst_number || "AWAITING MAPPING"}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">Permanent Acct Number (PAN)</label>
                <div className="mt-2 px-4 py-3 rounded-xl bg-background border border-border font-mono text-base font-black tracking-widest text-emerald-600 dark:text-emerald-400 shadow-inner">
                  {client.pan_number || "AWAITING MAPPING"}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card/40 backdrop-blur-md rounded-3xl border border-border p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xl font-bold text-foreground flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                Assigned Account Manager
              </h3>
              
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setIsTransferring(!isTransferring);
                  setSelectedStaffId("");
                }}
                className={cn(
                  "font-black uppercase tracking-widest text-[9px] px-3 h-8 rounded-lg border transition-all active:scale-95 duration-200",
                  isTransferring
                    ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 hover:bg-rose-500/20"
                    : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 animate-pulse"
                )}
              >
                {isTransferring ? "Cancel" : client.assigned_staff ? "Transfer" : "Assign"}
              </Button>
            </div>

            {/* Transfer Selector Panel */}
            {isTransferring && (
              <div className="p-5 bg-background/50 border border-primary/20 rounded-2xl space-y-4 animate-in fade-in slide-in-from-top-2 duration-300 shadow-inner">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-primary animate-bounce" />
                    Select Safety Officer
                  </span>
                  <p className="text-[11px] text-muted-foreground leading-normal mt-1">
                    Select a safety officer to assign/transfer this client portfolio. Caseload ratings and portfolio meters will update dynamically.
                  </p>
                </div>
                
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {usersList.map((user) => {
                    const isCurrentAssigned = client.assigned_staff?.id === user.id;
                    const isSelected = selectedStaffId === user.id;
                    return (
                      <div 
                        key={user.id}
                        onClick={() => !isCurrentAssigned && setSelectedStaffId(user.id)}
                        className={cn(
                          "p-3 rounded-xl border flex items-center justify-between gap-3 transition-all cursor-pointer",
                          isCurrentAssigned
                            ? "opacity-50 cursor-not-allowed bg-muted/20 border-border"
                            : isSelected
                              ? "bg-primary/10 border-primary shadow-sm"
                              : "bg-background border-border hover:border-primary/20"
                        )}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-foreground truncate">{user.name}</span>
                            {isCurrentAssigned && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-muted text-muted-foreground text-[8px] font-black uppercase tracking-wider shrink-0">
                                Current
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[9px] text-muted-foreground truncate">
                            <span>{user.designation || "Safety Officer"}</span>
                            <span>•</span>
                            <span>{user.department || "Operations"}</span>
                          </div>
                        </div>
                        
                        {!isCurrentAssigned && (
                          <div className={cn(
                            "w-4 h-4 rounded-full border flex items-center justify-center shrink-0",
                            isSelected ? "border-primary bg-primary text-white" : "border-muted-foreground/30"
                          )}>
                            {isSelected && <CheckCircle2 className="w-3 h-3" />}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {usersList.length === 0 && (
                    <p className="text-xs text-center text-muted-foreground py-4">No alternative safety officers available.</p>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    disabled={savingTransfer || !selectedStaffId}
                    onClick={handleTransfer}
                    className="flex-1 bg-primary text-white hover:bg-primary/90 font-black uppercase tracking-widest text-[9px] h-8 rounded-lg shadow-sm"
                  >
                    {savingTransfer ? "Transferring..." : "Confirm Assignment"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsTransferring(false);
                      setSelectedStaffId("");
                    }}
                    className="border border-border font-black uppercase tracking-widest text-[9px] h-8 rounded-lg"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
            
            {client.assigned_staff ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-background border border-border rounded-2xl shadow-sm">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-lg border border-emerald-500/20 shrink-0">
                    {client.assigned_staff.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <p className="font-bold text-foreground text-base leading-none truncate">{client.assigned_staff.name}</p>
                    <p className="text-xs font-medium text-muted-foreground mt-1 truncate">{client.assigned_staff.designation || 'Staff Member'}</p>
                    {client.assigned_staff.email && (
                      <p className="text-[10px] text-muted-foreground/80 font-mono tracking-tight mt-1 truncate">{client.assigned_staff.email}</p>
                    )}
                    
                    {client.assigned_staff.assigned_clients && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          onClick={() => setIsWorkloadAnalyzed(!isWorkloadAnalyzed)}
                          className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border transition-all hover:scale-[1.02] active:scale-95 duration-200", 
                          isWorkloadAnalyzed 
                            ? "bg-emerald-500 text-white border-emerald-600 shadow-sm shadow-emerald-500/20" 
                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                          )}
                        >
                          <BarChart2 className="w-3 h-3" />
                          {isWorkloadAnalyzed ? "Hide Portfolio" : `Analyze Workload (${client.assigned_staff.assigned_clients.length})`}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Glassmorphic Slide-down Portfolio & Workload Dashboard */}
                {isWorkloadAnalyzed && client.assigned_staff.assigned_clients && (
                  <div className="p-5 bg-background/50 border border-border/80 rounded-2xl space-y-4 animate-in fade-in slide-in-from-top-2 duration-300 shadow-inner">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-primary" />
                          Capacity Load Index
                        </span>
                        {(() => {
                          const count = client.assigned_staff?.assigned_clients?.length || 0;
                          if (count <= 2) {
                            return <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">OPTIMIZED LOAD</span>;
                          } else if (count <= 5) {
                            return <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/25">BALANCED LOAD</span>;
                          } else {
                            return <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25">HIGH CAPACITY</span>;
                          }
                        })()}
                      </div>
                      
                      {/* Dynamic capacity horizontal indicator */}
                      <div className="pt-2">
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden flex">
                          {(() => {
                            const count = client.assigned_staff?.assigned_clients?.length || 0;
                            const fillPercentage = Math.min((count / 8) * 100, 100);
                            const barColorClass = count <= 2 
                              ? "bg-emerald-500" 
                              : count <= 5 
                                ? "bg-blue-500" 
                                : "bg-amber-500";
                            return (
                              <div 
                                className={cn("h-full rounded-full transition-all duration-500", barColorClass)}
                                style={{ width: `${fillPercentage}%` }}
                              />
                            );
                          })()}
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-[9px] text-muted-foreground font-mono">0 Clients</span>
                          <span className="text-[9px] font-bold text-foreground font-mono">
                            {client.assigned_staff.assigned_clients.length} Clients Active
                          </span>
                          <span className="text-[9px] text-muted-foreground font-mono">8+ Max</span>
                        </div>
                      </div>
                    </div>

                    {/* Explanatory insight statement */}
                    <p className="text-[11px] text-muted-foreground leading-normal border-t border-border/40 pt-3">
                      {client.assigned_staff.name} is actively managing <strong className="text-foreground">{client.assigned_staff.assigned_clients.length}</strong> client enterprises. Their capacity rating is perfectly balanced to provide responsive safety monitoring.
                    </p>

                    {/* Live Portfolio Client List */}
                    <div className="space-y-2 border-t border-border/40 pt-3">
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1 mb-2">
                        <Users className="w-3.5 h-3.5 text-emerald-500" />
                        Live Account Portfolio
                      </span>
                      
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {client.assigned_staff.assigned_clients.map((c) => {
                          const isCurrent = c.id === client.id;
                          return (
                            <div 
                              key={c.id} 
                              className={cn(
                                "p-3 rounded-xl border flex items-center justify-between gap-3 transition-all",
                                isCurrent 
                                  ? "bg-emerald-500/5 border-emerald-500/20 shadow-sm" 
                                  : "bg-background border-border hover:border-primary/20"
                              )}
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-xs text-foreground truncate">{c.name}</span>
                                  {isCurrent && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[8px] font-black uppercase tracking-wider shrink-0 animate-pulse">
                                      Current
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5 text-[9px] text-muted-foreground truncate">
                                  <span>{c.industry || "General"}</span>
                                  <span>•</span>
                                  <span>{c.city || "Global"}</span>
                                </div>
                              </div>
                              
                              {!isCurrent && (
                                <button
                                  onClick={() => router.push(`/dashboard/clients/${c.id}`)}
                                  className="w-7 h-7 rounded-lg bg-accent/10 hover:bg-primary hover:text-white flex items-center justify-center text-muted-foreground transition-all shrink-0 hover:scale-105 active:scale-95"
                                  title="Jump to Client details"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground bg-muted/20 rounded-2xl border border-dashed border-border">
                <p className="font-bold uppercase tracking-widest text-[10px]">No staff assigned</p>
                <p className="text-[10px] text-muted-foreground/60 mt-1 max-w-[180px]">Allocate a safety officer inside user settings to enable portfolio workload tracking.</p>
              </div>
            )}
          </div>

          <div className="bg-card/40 backdrop-blur-md rounded-3xl border border-border p-8 flex flex-col items-center justify-center text-center space-y-4 shadow-sm">
             <div className={cn("w-16 h-16 rounded-3xl flex items-center justify-center border-2 border-dashed transition-all", 
               client.is_active ? "border-emerald-500/20 bg-emerald-500/5" : "border-rose-500/20 bg-rose-500/5"
             )}>
               <ShieldAlert className={cn("w-8 h-8", client.is_active ? "text-emerald-500" : "text-rose-500")} />
             </div>
             <div className="space-y-1">
               <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Account State</p>
               <p className={cn("font-black text-lg tracking-tight", client.is_active ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
                 {client.is_active ? 'ACTIVE & MONITORED' : 'RESTRICTED ACCESS'}
               </p>
             </div>
          </div>
        </div>
      </div>

      {/* Dynamic Operational Progress & Work Hub */}
      {(() => {
        let totalProjects = 0, completedProjects = 0;
        let totalTasks = 0, completedTasks = 0;
        let totalWorkOrders = 0, completedWorkOrders = 0;
        let totalInspections = 0, completedInspections = 0;

        if (client.projects) {
          totalProjects = client.projects.length;
          completedProjects = client.projects.filter(p => p.status === 'COMPLETED').length;

          client.projects.forEach(p => {
            if (p.tasks) {
              totalTasks += p.tasks.length;
              completedTasks += p.tasks.filter(t => t.status === 'DONE').length;
            }
            if (p.work_orders) {
              totalWorkOrders += p.work_orders.length;
              completedWorkOrders += p.work_orders.filter(w => w.status === 'COMPLETED').length;
            }
          });
        }

        if (client.inspections) {
          totalInspections = client.inspections.length;
          completedInspections = client.inspections.filter(i => i.status === 'COMPLETED').length;
        }

        const doneOps = completedProjects + completedTasks + completedWorkOrders + completedInspections;
        const totalOps = totalProjects + totalTasks + totalWorkOrders + totalInspections;
        const overallPercentage = totalOps > 0 ? Math.round((doneOps / totalOps) * 100) : 0;

        return (
          <div className="space-y-8 pt-6 border-t border-border">
            {/* Main Title & Indicator */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Activity className="w-5 h-5 text-primary" />
                  </div>
                  Operational Progress & Work Hub
                </h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Track full compliance activities, service delivery projects, and task progression.
                </p>
              </div>
              
              <div className="flex items-center gap-3 bg-card/30 backdrop-blur-md px-4 py-2 rounded-2xl border border-border">
                <span className="text-xs font-black uppercase text-muted-foreground tracking-widest">Done VS Pending:</span>
                <span className="text-sm font-bold text-foreground bg-primary/10 px-2 py-0.5 rounded-lg text-primary">{doneOps} Done</span>
                <span className="text-sm font-bold text-foreground bg-amber-500/10 px-2 py-0.5 rounded-lg text-amber-600 dark:text-amber-400">{totalOps - doneOps} Pending</span>
              </div>
            </div>

            {/* Grid of Dynamic Completion Rings/Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Overall Circular Progress Card */}
              <div className="lg:col-span-2 bg-card/40 backdrop-blur-md rounded-3xl border border-border p-6 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-sm">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl"></div>
                
                <h4 className="text-sm font-black text-muted-foreground uppercase tracking-widest mb-4">Overall Completion</h4>
                
                {/* Circular Gauge */}
                <div className="relative w-36 h-36 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle 
                      cx="72" 
                      cy="72" 
                      r="60" 
                      className="stroke-muted/40" 
                      strokeWidth="10" 
                      fill="transparent" 
                    />
                    <circle 
                      cx="72" 
                      cy="72" 
                      r="60" 
                      className="stroke-primary transition-all duration-1000 ease-out" 
                      strokeWidth="10" 
                      fill="transparent" 
                      strokeDasharray={2 * Math.PI * 60}
                      strokeDashoffset={2 * Math.PI * 60 * (1 - overallPercentage / 100)}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-3xl font-black text-foreground">{overallPercentage}%</span>
                    <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider mt-0.5">Resolved</span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground mt-4 max-w-[220px]">
                  {doneOps} out of {totalOps} total compliance operations & tasks completed.
                </p>
              </div>

              {/* Progress Breakdowns Grid */}
              <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Projects Card */}
                <div className="bg-card/40 backdrop-blur-md rounded-3xl border border-border p-6 shadow-sm hover:border-border/80 transition-colors flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                      <Briefcase className="w-5 h-5 text-blue-500" />
                    </div>
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest font-mono">
                      {completedProjects}/{totalProjects} Done
                    </span>
                  </div>
                  <div className="mt-4 space-y-2">
                    <h5 className="font-bold text-foreground text-base">Projects Portfolio</h5>
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full transition-all duration-500"
                        style={{ width: `${totalProjects > 0 ? (completedProjects / totalProjects) * 100 : 0}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {totalProjects - completedProjects} projects currently in progress or pending.
                    </p>
                  </div>
                </div>

                {/* Tasks Card */}
                <div className="bg-card/40 backdrop-blur-md rounded-3xl border border-border p-6 shadow-sm hover:border-border/80 transition-colors flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                      <CheckSquare className="w-5 h-5 text-purple-500" />
                    </div>
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest font-mono">
                      {completedTasks}/{totalTasks} Done
                    </span>
                  </div>
                  <div className="mt-4 space-y-2">
                    <h5 className="font-bold text-foreground text-base">Milestone Tasks</h5>
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-purple-500 rounded-full transition-all duration-500"
                        style={{ width: `${totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {totalTasks - completedTasks} items remain on active safety checklists.
                    </p>
                  </div>
                </div>

                {/* Work Orders Card */}
                <div className="bg-card/40 backdrop-blur-md rounded-3xl border border-border p-6 shadow-sm hover:border-border/80 transition-colors flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-emerald-500" />
                    </div>
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest font-mono">
                      {completedWorkOrders}/{totalWorkOrders} Done
                    </span>
                  </div>
                  <div className="mt-4 space-y-2">
                    <h5 className="font-bold text-foreground text-base">Work Orders</h5>
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${totalWorkOrders > 0 ? (completedWorkOrders / totalWorkOrders) * 100 : 0}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {totalWorkOrders - completedWorkOrders} execution plans waiting for completion.
                    </p>
                  </div>
                </div>

                {/* Inspections Card */}
                <div className="bg-card/40 backdrop-blur-md rounded-3xl border border-border p-6 shadow-sm hover:border-border/80 transition-colors flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-amber-500" />
                    </div>
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest font-mono">
                      {completedInspections}/{totalInspections} Done
                    </span>
                  </div>
                  <div className="mt-4 space-y-2">
                    <h5 className="font-bold text-foreground text-base">Safety Inspections</h5>
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-amber-500 rounded-full transition-all duration-500"
                        style={{ width: `${totalInspections > 0 ? (completedInspections / totalInspections) * 100 : 0}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {totalInspections - completedInspections} audits pending or require scheduling.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Operations Ledger Tab/Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Side: Active Projects & Tasks Ledger */}
              <div className="lg:col-span-2 space-y-4">
                <h4 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-primary" />
                  Active Projects & Checklist Tasks
                </h4>

                {client.projects && client.projects.length > 0 ? (
                  <div className="space-y-4">
                    {client.projects.map((p) => {
                      const isExpanded = expandedProject === p.id;
                      const completedTasksCount = p.tasks ? p.tasks.filter(t => t.status === 'DONE').length : 0;
                      const totalTasksCount = p.tasks ? p.tasks.length : 0;
                      const taskPercentage = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

                      return (
                        <div 
                          key={p.id} 
                          className="bg-card/30 rounded-2xl border border-border overflow-hidden transition-all hover:border-primary/20"
                        >
                          {/* Project Header */}
                          <div 
                            className="p-5 flex items-center justify-between cursor-pointer select-none"
                            onClick={() => setExpandedProject(isExpanded ? null : p.id)}
                          >
                            <div className="space-y-1.5 flex-1 pr-4">
                              <div className="flex items-center gap-2">
                                <h5 className="font-bold text-foreground text-base hover:text-primary transition-colors">{p.name}</h5>
                                <span className={cn("px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border", 
                                  p.status === 'COMPLETED' 
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
                                    : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                                )}>
                                  {p.status}
                                </span>
                              </div>
                              {p.description && (
                                <p className="text-muted-foreground text-xs line-clamp-1">{p.description}</p>
                              )}
                              
                              {/* Horizontal mini progress bar for tasks */}
                              <div className="flex items-center gap-2.5 max-w-[280px] pt-1">
                                <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-primary rounded-full transition-all duration-300"
                                    style={{ width: `${taskPercentage}%` }}
                                  />
                                </div>
                                <span className="text-[10px] font-bold text-muted-foreground whitespace-nowrap">
                                  {taskPercentage}% ({completedTasksCount}/{totalTasksCount} Tasks)
                                </span>
                              </div>
                            </div>

                            <button className="w-8 h-8 rounded-lg hover:bg-accent/15 flex items-center justify-center text-muted-foreground">
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </div>

                          {/* Expanded Task Checklist */}
                          {isExpanded && (
                            <div className="border-t border-border bg-background/25 px-5 py-4 space-y-3">
                              <h6 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                                <CheckSquare className="w-3.5 h-3.5 text-primary" />
                                Project Tasks Checklist
                              </h6>
                              {p.tasks && p.tasks.length > 0 ? (
                                <div className="divide-y divide-border/60">
                                  {p.tasks.map((t) => (
                                    <div key={t.id} className="py-3 flex items-start justify-between gap-4 group">
                                      <div className="flex items-start gap-3">
                                        <div className="pt-0.5">
                                          <input 
                                            type="checkbox" 
                                            checked={t.status === 'DONE'}
                                            readOnly
                                            className="w-4 h-4 rounded border-muted-foreground text-primary focus:ring-primary pointer-events-none"
                                          />
                                        </div>
                                        <div>
                                          <p className={cn("font-semibold text-sm", 
                                            t.status === 'DONE' ? "text-muted-foreground/80 line-through font-normal" : "text-foreground"
                                          )}>
                                            {t.title}
                                          </p>
                                          {t.description && (
                                            <p className="text-muted-foreground text-[11px] mt-0.5 line-clamp-1">{t.description}</p>
                                          )}
                                          
                                          {/* Task Meta details */}
                                          <div className="flex items-center gap-2 mt-1">
                                            {t.due_date && (
                                              <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                                                <Clock className="w-3 h-3" /> Due {new Date(t.due_date).toLocaleDateString([], { day: 'numeric', month: 'short' })}
                                              </span>
                                            )}
                                            {t.priority && (
                                              <span className={cn("text-[9px] font-bold px-1 py-0.2 rounded border", 
                                                t.priority === 'HIGH' 
                                                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/15" 
                                                  : t.priority === 'MEDIUM'
                                                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/15"
                                                    : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/15"
                                              )}>
                                                {t.priority}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      
                                      {t.assignee && (
                                        <div className="flex items-center gap-1.5 text-right whitespace-nowrap">
                                          <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold font-mono">
                                            {t.assignee.name.charAt(0).toUpperCase()}
                                          </span>
                                          <div className="hidden sm:block text-left">
                                            <p className="text-xs font-bold text-foreground leading-none">{t.assignee.name}</p>
                                            <p className="text-[9px] text-muted-foreground mt-0.5">Assignee</p>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground italic py-3">No tasks assigned to this project yet.</p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground bg-card/20 rounded-3xl border border-dashed border-border shadow-inner">
                    <Briefcase className="w-12 h-12 mb-4 opacity-15" />
                    <p className="font-bold uppercase tracking-widest text-[10px]">No active projects initialized for this client.</p>
                  </div>
                )}
              </div>

              {/* Right Side: Outstanding Work Orders & Inspections Registry */}
              <div className="space-y-6">
                {/* Pending Work Orders */}
                <div className="space-y-4">
                  <h4 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-500" />
                    Work Orders Registry
                  </h4>
                  {client.projects && client.projects.some(p => p.work_orders && p.work_orders.length > 0) ? (
                    <div className="space-y-3">
                      {client.projects.flatMap(p => p.work_orders || []).map((w) => (
                        <div key={w.id} className="p-4 bg-card/30 rounded-2xl border border-border shadow-sm flex items-start justify-between gap-3 hover:border-emerald-500/20 transition-all">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-foreground text-sm tracking-tight">{w.work_order_no}</span>
                              <span className={cn("px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider", 
                                w.status === 'COMPLETED' 
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" 
                                  : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                              )}>
                                {w.status}
                              </span>
                            </div>
                            {w.description && (
                              <p className="text-muted-foreground text-xs line-clamp-1">{w.description}</p>
                            )}
                            {w.scheduled_date && (
                              <p className="text-[10px] text-muted-foreground/80 font-medium">
                                Scheduled: {new Date(w.scheduled_date).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground bg-card/20 rounded-3xl border border-dashed border-border">
                      <p className="font-bold uppercase tracking-widest text-[9px]">No work orders created</p>
                    </div>
                  )}
                </div>

                {/* Scheduled Safety Inspections */}
                <div className="space-y-4">
                  <h4 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-500" />
                    Safety Inspections Registry
                  </h4>
                  {client.inspections && client.inspections.length > 0 ? (
                    <div className="space-y-3">
                      {client.inspections.map((i) => (
                        <div key={i.id} className="p-4 bg-card/30 rounded-2xl border border-border shadow-sm flex items-start justify-between gap-3 hover:border-amber-500/20 transition-all">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-foreground text-xs font-mono uppercase">ID: {i.id.split('-')[0]}</span>
                              <span className={cn("px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider", 
                                i.status === 'COMPLETED' 
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" 
                                  : i.status === 'SCHEDULED'
                                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                              )}>
                                {i.status}
                              </span>
                            </div>
                            {i.location && (
                              <p className="text-muted-foreground text-xs flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" /> {i.location}
                              </p>
                            )}
                            {i.scheduled_date && (
                              <p className="text-[10px] text-muted-foreground/80 font-medium">
                                Audit Date: {new Date(i.scheduled_date).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground bg-card/20 rounded-3xl border border-dashed border-border">
                      <p className="font-bold uppercase tracking-widest text-[9px]">No safety inspections mapped</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Super Admin Safety Officer History & Progress Log */}
            {isSuperAdmin && (
              <div className="bg-card/40 backdrop-blur-md rounded-3xl border border-border p-8 shadow-sm space-y-6 mt-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
                  <div>
                    <h3 className="text-xl font-bold text-foreground flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Users className="w-4 h-4 text-primary" />
                      </div>
                      Safety Officer History & Progress Log
                    </h3>
                    <p className="text-muted-foreground text-xs mt-1">
                      A clear timeline showing who managed this client, when they worked, and exactly what they accomplished.
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-xl border border-primary/20 shrink-0">
                    <Activity className="w-3.5 h-3.5 text-primary animate-pulse" />
                    <span className="text-[10px] font-black uppercase text-primary tracking-wider">
                      History Tracker Active
                    </span>
                  </div>
                </div>

                {(() => {
                  const tenures: any[] = [];
                  const logs = client.auditLogs || [];

                  if (logs.length === 0) {
                    if (client.assigned_staff) {
                      tenures.push({
                        staffName: client.assigned_staff.name,
                        staffId: client.assigned_staff.id,
                        startDate: client.created_at ? new Date(client.created_at).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' }) : "Initial Assignment",
                        endDate: "Present",
                        rawStartDate: client.created_at ? new Date(client.created_at) : new Date(),
                        rawEndDate: new Date(),
                        isActive: true,
                        completedProjects: completedProjects,
                        completedTasks: completedTasks,
                        completedWorkOrders: completedWorkOrders,
                        completedInspections: completedInspections,
                      });
                    }
                  } else {
                    // 1. First staff tenure (before first log)
                    const firstLog = logs[0];
                    const oldData = (firstLog.old_data as any) || {};
                    tenures.push({
                      staffName: oldData.assigned_staff_name || "Unassigned",
                      staffId: oldData.assigned_staff_id || null,
                      startDate: client.created_at ? new Date(client.created_at).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' }) : "Initial Assignment",
                      endDate: new Date(firstLog.created_at).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' }),
                      rawStartDate: client.created_at ? new Date(client.created_at) : new Date(firstLog.created_at),
                      rawEndDate: new Date(firstLog.created_at),
                      isActive: false,
                      completedProjects: Math.max(0, Number(oldData.completed_projects || 0)),
                      completedTasks: Math.max(0, Number(oldData.completed_tasks || 0)),
                      completedWorkOrders: Math.max(0, Number(oldData.completed_work_orders || 0)),
                      completedInspections: Math.max(0, Number(oldData.completed_inspections || 0)),
                    });

                    // 2. Intermediate tenures
                    for (let i = 0; i < logs.length - 1; i++) {
                      const currentLog = logs[i];
                      const nextLog = logs[i + 1];
                      const curOldData = (currentLog.old_data as any) || {};
                      const nextOldData = (nextLog.old_data as any) || {};
                      
                      tenures.push({
                        staffName: currentLog.new_data?.assigned_staff_name || "Unassigned",
                        staffId: currentLog.new_data?.assigned_staff_id || null,
                        startDate: new Date(currentLog.created_at).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' }),
                        endDate: new Date(nextLog.created_at).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' }),
                        rawStartDate: new Date(currentLog.created_at),
                        rawEndDate: new Date(nextLog.created_at),
                        isActive: false,
                        completedProjects: Math.max(0, Number(nextOldData.completed_projects || 0) - Number(curOldData.completed_projects || 0)),
                        completedTasks: Math.max(0, Number(nextOldData.completed_tasks || 0) - Number(curOldData.completed_tasks || 0)),
                        completedWorkOrders: Math.max(0, Number(nextOldData.completed_work_orders || 0) - Number(curOldData.completed_work_orders || 0)),
                        completedInspections: Math.max(0, Number(nextOldData.completed_inspections || 0) - Number(curOldData.completed_inspections || 0)),
                      });
                    }

                    // 3. Current tenure (since the last log)
                    const lastLog = logs[logs.length - 1];
                    const lastOldData = (lastLog.old_data as any) || {};
                    
                    if (client.assigned_staff) {
                      tenures.push({
                        staffName: client.assigned_staff.name,
                        staffId: client.assigned_staff.id,
                        startDate: new Date(lastLog.created_at).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' }),
                        endDate: "Present",
                        rawStartDate: new Date(lastLog.created_at),
                        rawEndDate: new Date(),
                        isActive: true,
                        completedProjects: Math.max(0, completedProjects - Number(lastOldData.completed_projects || 0)),
                        completedTasks: Math.max(0, completedTasks - Number(lastOldData.completed_tasks || 0)),
                        completedWorkOrders: Math.max(0, completedWorkOrders - Number(lastOldData.completed_work_orders || 0)),
                        completedInspections: Math.max(0, completedInspections - Number(lastOldData.completed_inspections || 0)),
                      });
                    }
                  }

                  const displayTenures = [...tenures].reverse();

                  const buildSummarySentence = (t: any) => {
                    const start = t.rawStartDate || new Date();
                    const end = t.rawEndDate || new Date();
                    const diffTime = Math.abs(end.getTime() - start.getTime());
                    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
                    
                    const accomplishments: string[] = [];
                    if (t.completedProjects > 0) {
                      accomplishments.push(`${t.completedProjects} project${t.completedProjects > 1 ? 's' : ''}`);
                    }
                    if (t.completedTasks > 0) {
                      accomplishments.push(`${t.completedTasks} checklist task${t.completedTasks > 1 ? 's' : ''}`);
                    }
                    if (t.completedWorkOrders > 0) {
                      accomplishments.push(`${t.completedWorkOrders} work order${t.completedWorkOrders > 1 ? 's' : ''}`);
                    }
                    if (t.completedInspections > 0) {
                      accomplishments.push(`${t.completedInspections} safety audit${t.completedInspections > 1 ? 's' : ''}`);
                    }
                    
                    const activeWord = t.isActive ? "has been managing" : "managed";
                    const durationWord = t.isActive ? `for the past ${days} days` : `during their ${days}-day assignment`;
                    
                    if (accomplishments.length === 0) {
                      return `${t.staffName} ${activeWord} this client ${durationWord}, and is currently setting up the safety plan.`;
                    }
                    
                    let listStr = "";
                    if (accomplishments.length === 1) {
                      listStr = accomplishments[0];
                    } else if (accomplishments.length === 2) {
                      listStr = `${accomplishments[0]} and ${accomplishments[1]}`;
                    } else {
                      listStr = `${accomplishments.slice(0, -1).join(", ")}, and ${accomplishments[accomplishments.length - 1]}`;
                    }
                    
                    return `${t.staffName} successfully completed ${listStr} ${durationWord}.`;
                  };

                  if (displayTenures.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground bg-card/20 rounded-3xl border border-dashed border-border shadow-inner">
                        <Users className="w-12 h-12 mb-4 opacity-15" />
                        <p className="font-bold uppercase tracking-widest text-[10px]">No Assignment Transitions Logged Yet.</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1 max-w-[240px]">Reassign this portfolio inside the Assigned Account Manager card to start writing history logs.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="relative border-l border-border pl-6 ml-4 space-y-8 my-4">
                      {displayTenures.map((t, idx) => {
                        const totalWorkResolved = t.completedProjects + t.completedTasks + t.completedWorkOrders + t.completedInspections;
                        
                        return (
                          <div key={idx} className="relative group">
                            {/* Circle Dot for Timeline */}
                            <div className={cn(
                              "absolute -left-[30px] top-2 w-3 h-3 rounded-full border-2 flex items-center justify-center transition-all duration-300 bg-background border-border",
                              t.isActive 
                                ? "bg-emerald-500 border-emerald-500/30 scale-110 shadow-[0_0_8px_rgba(16,185,129,0.5)]" 
                                : "group-hover:border-primary/50"
                            )} />

                            {/* Tenure Card */}
                            <div className={cn(
                              "p-6 rounded-2xl border transition-all duration-300 relative overflow-hidden",
                              t.isActive
                                ? "bg-emerald-500/5 border-emerald-500/30 shadow-md shadow-emerald-500/5"
                                : "bg-card/25 border-border hover:border-border/80 hover:bg-card/30"
                            )}>
                              
                              {/* Card Header */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-4 mb-4">
                                <div className="flex items-center gap-3">
                                  <div className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center font-bold text-base border shrink-0",
                                    t.isActive
                                      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                      : "bg-muted text-muted-foreground border-border"
                                  )}>
                                    {t.staffName.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-foreground text-sm flex items-center gap-2">
                                      {t.staffName}
                                      {t.isActive && (
                                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[8px] font-black uppercase tracking-wider animate-pulse">
                                          Current Safety Officer
                                        </span>
                                      )}
                                    </h4>
                                    <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                                      Assigned: {t.startDate} to {t.endDate}
                                    </p>
                                  </div>
                                </div>

                                <div className="text-right">
                                  <div className="text-sm font-black text-foreground">{totalWorkResolved} {totalWorkResolved === 1 ? 'Activity' : 'Activities'} Completed</div>
                                  <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">Total Accomplishments</div>
                                </div>
                              </div>

                              {/* Beautiful Natural language narrative sentence */}
                              <p className="text-sm font-medium text-foreground/90 leading-relaxed mb-4">
                                {buildSummarySentence(t)}
                              </p>

                              {/* Simplified Progress Log Breakdown */}
                              <div className="space-y-3 pt-3 border-t border-border/30">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Progress Log Details:</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div className="flex items-center gap-3 text-xs bg-background/20 p-2.5 rounded-xl border border-border/50">
                                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border", 
                                      t.completedProjects > 0 ? "bg-blue-500/10 text-blue-500 border-blue-500/20" : "bg-muted text-muted-foreground/40 border-border"
                                    )}>
                                      <Briefcase className="w-3.5 h-3.5" />
                                    </div>
                                    <div>
                                      <p className="font-bold text-foreground">{t.completedProjects}</p>
                                      <p className="text-[10px] text-muted-foreground">Active Projects Completed</p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-3 text-xs bg-background/20 p-2.5 rounded-xl border border-border/50">
                                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border", 
                                      t.completedTasks > 0 ? "bg-purple-500/10 text-purple-500 border-purple-500/20" : "bg-muted text-muted-foreground/40 border-border"
                                    )}>
                                      <CheckSquare className="w-3.5 h-3.5" />
                                    </div>
                                    <div>
                                      <p className="font-bold text-foreground">{t.completedTasks}</p>
                                      <p className="text-[10px] text-muted-foreground">Checklist Tasks Ticked</p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-3 text-xs bg-background/20 p-2.5 rounded-xl border border-border/50">
                                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border", 
                                      t.completedWorkOrders > 0 ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-muted text-muted-foreground/40 border-border"
                                    )}>
                                      <FileText className="w-3.5 h-3.5" />
                                    </div>
                                    <div>
                                      <p className="font-bold text-foreground">{t.completedWorkOrders}</p>
                                      <p className="text-[10px] text-muted-foreground">Work Orders Finished</p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-3 text-xs bg-background/20 p-2.5 rounded-xl border border-border/50">
                                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border", 
                                      t.completedInspections > 0 ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : "bg-muted text-muted-foreground/40 border-border"
                                    )}>
                                      <Calendar className="w-3.5 h-3.5" />
                                    </div>
                                    <div>
                                      <p className="font-bold text-foreground">{t.completedInspections}</p>
                                      <p className="text-[10px] text-muted-foreground">Safety Audits Done</p>
                                    </div>
                                  </div>
                                </div>
                              </div>

                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
