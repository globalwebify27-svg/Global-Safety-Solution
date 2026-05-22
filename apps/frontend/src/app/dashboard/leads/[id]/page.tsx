"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { API_BASE_URL } from "@/lib/config";
import { useAuthStore } from "@/store/auth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Phone, Mail, CheckCircle, Clock, Plus, History, ArrowLeft, MoreVertical, FileText, Banknote, TrendingDown, TrendingUp, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

export default function LeadDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const leadId = params.id as string;
  
  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activityNote, setActivityNote] = useState("");
  const [activityType, setActivityType] = useState("NOTE");

  const [openEditModal, setOpenEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState<{
    company_name: string;
    contact_person: string;
    email: string;
    phone: string;
    source: string;
    expected_value: number | "";
    closure_probability: number | "";
    notes: string;
  }>({
    company_name: "",
    contact_person: "",
    email: "",
    phone: "",
    source: "",
    expected_value: "",
    closure_probability: "",
    notes: ""
  });

  const { token, logout } = useAuthStore();

  useEffect(() => {
    if (leadId && token) {
      fetchLeadDetails();
    }
  }, [leadId, token]);

  const fetchLeadDetails = async () => {
    if (!token || !leadId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/leads/${leadId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        logout();
        router.push("/login");
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setLead(data);
      }
    } catch (e) {
      toast.error("Failed to load lead details");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !leadId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/leads/${leadId}/activities`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: activityType,
          subject: `${activityType} logged`,
          description: activityNote,
          date: new Date().toISOString(),
        }),
      });
      if (res.ok) {
        toast.success("Activity logged");
        setActivityNote("");
        fetchLeadDetails();
      }
    } catch (e) {
      toast.error("Error logging activity");
    }
  };

  const generateQuote = async () => {
    if (!token || !leadId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/quotations/lead/${leadId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success("Quote generated successfully!");
        fetchLeadDetails();
      } else {
        toast.error("Failed to generate quote");
      }
    } catch (e) {
      toast.error("Network error");
    }
  };

  const handleOpenEdit = () => {
    setEditFormData({
      company_name: lead.company_name || "",
      contact_person: lead.contact_person || "",
      email: lead.email || "",
      phone: lead.phone || "",
      source: lead.source || "Website",
      expected_value: Number(lead.expected_value) || "",
      closure_probability: lead.closure_probability || "",
      notes: lead.notes || ""
    });
    setOpenEditModal(true);
  };

  const handleUpdateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !leadId) return;
    try {
      const payload = {
        ...editFormData,
        expected_value: editFormData.expected_value === "" ? 0 : Number(editFormData.expected_value),
        closure_probability: editFormData.closure_probability === "" ? 0 : Number(editFormData.closure_probability)
      };
      const res = await fetch(`${API_BASE_URL}/leads/${leadId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success("Lead details updated");
        setOpenEditModal(false);
        fetchLeadDetails();
      } else {
        toast.error("Failed to update lead details");
      }
    } catch (e) {
      toast.error("Network error");
    }
  };

  const handleConvertToClient = async () => {
    if (!token || !leadId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/leads/${leadId}/convert`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success("Lead successfully converted to Client!");
        fetchLeadDetails();
      } else {
        toast.error("Conversion failed.");
      }
    } catch (e) {
      toast.error("Network error.");
    }
  };

  const handleMarkAsLost = async () => {
    if (!token || !leadId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/leads/${leadId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'LOST' })
      });
      if (res.ok) {
        toast.success("Lead marked as LOST successfully.");
        fetchLeadDetails();
      } else {
        toast.error("Failed to update status.");
      }
    } catch (e) {
      toast.error("Network error.");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NEW': return 'bg-blue-500/10 text-blue-400 ring-blue-500/20';
      case 'CONTACTED': return 'bg-amber-500/10 text-amber-400 ring-amber-500/20';
      case 'PROPOSAL': return 'bg-purple-500/10 text-purple-400 ring-purple-500/20';
      case 'WON': return 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20';
      case 'LOST': return 'bg-rose-500/10 text-rose-400 ring-rose-500/20';
      default: return 'bg-muted text-muted-foreground ring-border';
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading CRM data...</div>;
  }

  if (!lead) {
    return <div className="p-8 text-center text-destructive">Lead not found</div>;
  }

  return (
    <div className="space-y-8 pb-10 max-w-6xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="space-y-3">
          <button 
            onClick={() => router.push('/dashboard/leads')}
            className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Pipeline
          </button>
          
          <div className="flex items-center gap-4">
            <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-foreground">
              {lead.company_name}
            </h1>
            <span className={cn("px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ring-1", getStatusColor(lead.status))}>
              {lead.status}
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground font-medium">
            <span className="flex items-center gap-2"><Phone className="w-4 h-4"/> {lead.phone || "No phone"}</span>
            <span className="flex items-center gap-2"><Mail className="w-4 h-4"/> {lead.email || "No email"}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={generateQuote} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-12 px-6 rounded-2xl shadow-xl shadow-indigo-500/20 transition-all border-0">
            <Plus className="w-5 h-5 mr-2" /> Quick Quote
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger render={
              <Button variant="outline" className="h-12 w-12 rounded-2xl p-0 flex items-center justify-center border-border text-muted-foreground hover:text-foreground" />
            }>
              <MoreVertical className="w-5 h-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-card border-border text-foreground min-w-[180px] rounded-2xl shadow-2xl p-2">
              <DropdownMenuItem 
                onClick={handleOpenEdit}
                className="hover:bg-accent/10 cursor-pointer flex items-center gap-3 py-3 rounded-xl font-bold text-sm"
              >
                <FileText className="w-4 h-4 text-muted-foreground" /> Edit Details
              </DropdownMenuItem>
              
              {lead.status !== 'WON' && (
                <DropdownMenuItem 
                  onClick={handleConvertToClient}
                  className="hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 cursor-pointer flex items-center gap-3 py-3 rounded-xl font-bold text-sm"
                >
                  <CheckCircle2 className="w-4 h-4" /> Convert to Client
                </DropdownMenuItem>
              )}
              
              {lead.status !== 'WON' && lead.status !== 'LOST' && (
                <DropdownMenuItem 
                  onClick={handleMarkAsLost}
                  className="hover:bg-destructive/10 text-destructive cursor-pointer flex items-center gap-3 py-3 rounded-xl font-bold text-sm mt-1 border-t border-border"
                >
                  <XCircle className="w-4 h-4" /> Mark as Lost
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tabs / Ledger UI */}
      <Tabs defaultValue="ledger" className="space-y-6">
        <TabsList className="bg-card border border-border p-1.5 rounded-2xl flex flex-wrap h-auto gap-1">
          <TabsTrigger value="ledger" className="rounded-xl px-6 py-2.5 font-bold text-sm data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none transition-all">Account & Ledger</TabsTrigger>
          <TabsTrigger value="timeline" className="rounded-xl px-6 py-2.5 font-bold text-sm data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none transition-all">Activity Timeline</TabsTrigger>
          <TabsTrigger value="quotes" className="rounded-xl px-6 py-2.5 font-bold text-sm data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none transition-all">Quotations</TabsTrigger>
          <TabsTrigger value="documents" className="rounded-xl px-6 py-2.5 font-bold text-sm data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none transition-all">Documents</TabsTrigger>
          <TabsTrigger value="audit" className="rounded-xl px-6 py-2.5 font-bold text-sm data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none transition-all">Audit Trail</TabsTrigger>
        </TabsList>

        <TabsContent value="ledger" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-card/40 border border-border rounded-[2rem] p-6 backdrop-blur-md shadow-sm">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Expected Deal Value</p>
              <p className="text-4xl font-black text-foreground mt-2">₹{Number(lead.expected_value || 0).toLocaleString()}</p>
            </div>
            <div className="bg-card/40 border border-border rounded-[2rem] p-6 backdrop-blur-md shadow-sm">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Active Quotes Value</p>
              <p className="text-4xl font-black text-indigo-500 mt-2">
                ₹{(lead.quotations?.reduce((acc: number, q: any) => acc + Number(q.total_amount), 0) || 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-card/40 border border-border rounded-[2rem] p-6 backdrop-blur-md shadow-sm">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Win Probability</p>
              <div className="mt-2 flex items-center gap-4">
                <p className="text-4xl font-black text-foreground">{lead.closure_probability || 0}%</p>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden max-w-[100px]">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${lead.closure_probability || 0}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card/40 border border-border rounded-[2rem] p-8 shadow-sm backdrop-blur-md">
               <h3 className="text-lg font-black tracking-tight mb-4">Contact Intelligence</h3>
               <div className="space-y-4">
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Primary Contact</p>
                    <p className="text-base font-medium mt-1">{lead.contact_person}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Lead Source</p>
                    <p className="text-base font-medium mt-1">{lead.source || "Website"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Next Follow Up</p>
                    <p className="text-base font-medium mt-1 text-indigo-400 font-bold">
                      {lead.next_follow_up ? new Date(lead.next_follow_up).toLocaleDateString() : "None"}
                    </p>
                  </div>
               </div>
            </div>
            
            <div className="bg-card/40 border border-border rounded-[2rem] p-8 shadow-sm backdrop-blur-md">
               <h3 className="text-lg font-black tracking-tight mb-4">Opportunity Notes</h3>
               <p className="text-sm text-foreground/80 leading-relaxed italic bg-muted/30 p-4 rounded-2xl border border-border/50 min-h-[150px]">
                 {lead.notes || "No context recorded for this opportunity."}
               </p>
            </div>
          </div>

          {/* Cash Flow Ledger Table */}
          <div className="bg-card/40 border border-border rounded-[2rem] p-8 shadow-sm backdrop-blur-md mt-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black tracking-tight">Automated Cashbook & Ledger</h3>
              <span className="bg-emerald-500/10 text-emerald-500 text-xs font-bold px-3 py-1 rounded-full ring-1 ring-emerald-500/20 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Auto-Sync Active
              </span>
            </div>
            
            <p className="text-sm text-muted-foreground mb-6">
              This ledger is automatically synchronized with your Finance & Invoicing system. 
              Quotes accepted will appear as Debits (Billed), and Payments collected will appear as Credits (Money In).
            </p>

            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted text-muted-foreground uppercase text-[10px] font-black tracking-widest">
                  <tr>
                    <th className="px-6 py-4 rounded-tl-2xl">Date</th>
                    <th className="px-6 py-4">Description</th>
                    <th className="px-6 py-4 text-emerald-500">Money In (Credit)</th>
                    <th className="px-6 py-4 text-rose-500">Money Out (Debit)</th>
                    <th className="px-6 py-4 rounded-tr-2xl text-right">Running Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {lead.transactions?.map((tx: any) => (
                    <tr key={tx.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-medium">{new Date(tx.date).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute:'2-digit' })}</td>
                      <td className="px-6 py-4">{tx.description}</td>
                      <td className="px-6 py-4 font-bold text-emerald-500">{tx.type === 'CREDIT' ? `+ ₹${Number(tx.amount).toLocaleString()}` : '-'}</td>
                      <td className="px-6 py-4 font-bold text-rose-500">{tx.type === 'DEBIT' ? `- ₹${Number(tx.amount).toLocaleString()}` : '-'}</td>
                      <td className="px-6 py-4 font-black text-right text-foreground">₹{Number(tx.balance).toLocaleString()}</td>
                    </tr>
                  ))}
                  {!lead.transactions?.length && (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-muted-foreground italic">No financial transactions recorded yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="bg-card/40 border border-border rounded-[2rem] p-8 shadow-sm backdrop-blur-md">
            <h3 className="text-lg font-black tracking-tight mb-6">Log Sales Activity</h3>
            <form onSubmit={handleCreateActivity} className="flex flex-col sm:flex-row gap-4">
              <select 
                value={activityType}
                onChange={(e) => setActivityType(e.target.value)}
                className="bg-background border border-border rounded-xl px-4 font-bold text-sm focus:ring-indigo-500 h-12 w-full sm:w-48"
              >
                <option value="NOTE">Log Note</option>
                <option value="CALL">Log Call</option>
                <option value="EMAIL">Log Email</option>
                <option value="MEETING">Log Meeting</option>
              </select>
              <Input
                value={activityNote}
                onChange={(e) => setActivityNote(e.target.value)}
                placeholder="What happened during this activity?"
                className="bg-background border-border rounded-xl h-12 flex-1"
                required
              />
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl h-12 px-8 font-bold border-0">
                Save Log
              </Button>
            </form>
          </div>

          <div className="space-y-4">
            {lead.activities?.map((act: any) => (
              <div key={act.id} className="bg-card/60 border border-border p-6 rounded-[2rem] flex gap-5 shadow-sm transition-all hover:bg-card">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                  {act.type === 'CALL' ? <Phone className="w-5 h-5 text-indigo-500" /> :
                   act.type === 'EMAIL' ? <Mail className="w-5 h-5 text-indigo-500" /> :
                   act.type === 'MEETING' ? <Activity className="w-5 h-5 text-indigo-500" /> :
                   <FileText className="w-5 h-5 text-indigo-500" />}
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-base text-foreground">{act.subject}</span>
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{new Date(act.date).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-foreground/80 mt-2 leading-relaxed">{act.description}</p>
                </div>
              </div>
            ))}
            {!lead.activities?.length && (
              <div className="text-center p-10 bg-card/20 rounded-[2rem] border border-dashed border-border text-muted-foreground">
                No activities logged yet.
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="quotes" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
           <div className="grid gap-4">
            {lead.quotations?.map((q: any) => (
              <div key={q.id} className="flex justify-between items-center bg-card/60 border border-border p-6 rounded-[2rem] shadow-sm transition-all hover:bg-card hover:border-indigo-500/30">
                <div>
                  <p className="font-bold text-lg text-foreground">{q.quote_number}</p>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">{new Date(q.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <p className="font-black text-xl text-foreground">₹{Number(q.total_amount).toLocaleString()}</p>
                  <span className="px-3 py-1 text-[10px] font-black tracking-widest bg-muted text-muted-foreground uppercase rounded-lg border border-border">
                    {q.status || "DRAFT"}
                  </span>
                </div>
              </div>
            ))}
            {!lead.quotations?.length && (
              <div className="text-center p-12 bg-card/20 rounded-[2rem] border border-dashed border-border text-muted-foreground italic">
                No quotes generated. Click Quick Quote to draft one instantly.
              </div>
            )}
           </div>
        </TabsContent>

        <TabsContent value="documents" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
           <div className="text-center p-12 bg-card/20 rounded-[2rem] border border-dashed border-border text-muted-foreground italic font-medium">
             No documents, proposals, or contracts attached yet.
           </div>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
           <div className="bg-card/40 border border-border rounded-[2rem] p-8 shadow-sm backdrop-blur-md">
             <h3 className="text-lg font-black tracking-tight mb-8">Account Audit Trail</h3>
             <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
              {lead.auditLogs?.map((log: any) => (
                <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border border-border bg-card shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                    <History className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-5 rounded-2xl border border-border bg-card/50 shadow-sm transition-all hover:bg-card">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-bold text-sm text-foreground capitalize flex items-center gap-2">
                         <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block"></span>
                         {log.action} Action
                      </div>
                      <time className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{new Date(log.created_at).toLocaleString()}</time>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono bg-background border border-border/50 p-3 rounded-xl mt-3 overflow-x-auto shadow-inner">
                      User ID: {log.user_id || "System Default"}
                    </div>
                  </div>
                </div>
              ))}
              {!lead.auditLogs?.length && (
                <div className="text-center text-sm font-medium text-muted-foreground italic mt-10">No audit history recorded.</div>
              )}
             </div>
           </div>
        </TabsContent>
      </Tabs>

      <Dialog open={openEditModal} onOpenChange={setOpenEditModal}>
        <DialogContent className="sm:max-w-[600px] bg-card border-border text-foreground rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Edit Opportunity Details</DialogTitle>
            <DialogDescription className="text-muted-foreground">Modify expected deal parameters and primary contacts.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateLead} className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input 
                  value={editFormData.company_name}
                  onChange={(e) => setEditFormData({...editFormData, company_name: e.target.value})}
                  className="bg-background border-border h-11 rounded-xl"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Contact Person</Label>
                <Input 
                  value={editFormData.contact_person}
                  onChange={(e) => setEditFormData({...editFormData, contact_person: e.target.value})}
                  className="bg-background border-border h-11 rounded-xl"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input 
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                  className="bg-background border-border h-11 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input 
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})}
                  className="bg-background border-border h-11 rounded-xl"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Expected Deal Value (₹)</Label>
                <Input 
                  type="number"
                  min="0"
                  value={editFormData.expected_value}
                  onChange={(e) => setEditFormData({...editFormData, expected_value: e.target.value === "" ? "" : Number(e.target.value)})}
                  className="bg-background border-border h-11 rounded-xl"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Closure Probability (%)</Label>
                <Input 
                  type="number"
                  min="0"
                  max="100"
                  value={editFormData.closure_probability}
                  onChange={(e) => setEditFormData({...editFormData, closure_probability: e.target.value === "" ? "" : Number(e.target.value)})}
                  className="bg-background border-border h-11 rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <textarea 
                className="w-full bg-background border border-border rounded-xl p-3 text-sm min-h-[100px] focus:ring-2 focus:ring-indigo-500 text-foreground"
                value={editFormData.notes}
                onChange={(e) => setEditFormData({...editFormData, notes: e.target.value})}
              />
            </div>
            <DialogFooter>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold w-full h-12 shadow-xl shadow-indigo-500/20 rounded-xl mt-4 border-0">
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
