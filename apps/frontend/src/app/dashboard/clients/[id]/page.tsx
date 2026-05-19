"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { API_BASE_URL } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2, Mail, Phone, MapPin, FileText, ShieldAlert, CheckCircle2, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface Compliance {
  id: string;
  compliance_type: string;
  expiry_date: string;
  status: string;
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
  compliances?: Compliance[];
  assigned_staff?: {
    name: string;
    designation?: string;
    email?: string;
  };
}

export default function ClientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  
  const token = useAuthStore((state) => state.token);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    const url = `${API_BASE_URL}/clients/${id}`;
    console.log(`[ClientProfilePage] Fetching: ${url}`);
    
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
  }, [id, token]);

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

          <div className="bg-card/40 backdrop-blur-md rounded-3xl border border-border p-8 shadow-sm">
            <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              Assigned Account Manager
            </h3>
            {client.assigned_staff ? (
              <div className="flex items-center gap-4 p-4 bg-background border border-border rounded-2xl shadow-sm">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-lg border border-emerald-500/20">
                  {client.assigned_staff.name.charAt(0).toUpperCase()}
                </div>
                <div className="space-y-0.5">
                  <p className="font-bold text-foreground text-base leading-none">{client.assigned_staff.name}</p>
                  <p className="text-xs font-medium text-muted-foreground">{client.assigned_staff.designation || 'Staff Member'}</p>
                  {client.assigned_staff.email && (
                    <p className="text-[10px] text-muted-foreground/80 font-mono tracking-tight mt-1">{client.assigned_staff.email}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground bg-muted/20 rounded-2xl border border-dashed border-border">
                <p className="font-bold uppercase tracking-widest text-[10px]">No staff assigned</p>
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
    </div>
  );
}
