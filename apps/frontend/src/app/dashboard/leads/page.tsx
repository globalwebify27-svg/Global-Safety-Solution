"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { API_BASE_URL } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  Target, 
  Plus, 
  Search, 
  Filter, 
  Mail, 
  Phone, 
  Building2, 
  ChevronRight,
  TrendingUp,
  Clock,
  MoreVertical,
  CheckCircle2,
  XCircle,
  FileText,
  Kanban,
  List
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

interface Lead {
  id: string;
  company_name: string;
  contact_person: string;
  email?: string;
  phone?: string;
  status: string;
  source?: string;
  created_at: string;
  closure_probability?: number;
  next_follow_up?: string;
  quotations?: Array<{ total_amount: number }>;
  notes?: string;
}

const KANBAN_STAGES = [
  { id: "NEW", name: "New Lead", color: "border-blue-500/20 bg-blue-500/5", iconColor: "text-blue-500" },
  { id: "CONTACTED", name: "Contacted", color: "border-amber-500/20 bg-amber-500/5", iconColor: "text-amber-500" },
  { id: "PROPOSAL", name: "Proposal Sent", color: "border-purple-500/20 bg-purple-500/5", iconColor: "text-purple-500" },
  { id: "WON", name: "Won", color: "border-emerald-500/20 bg-emerald-500/5", iconColor: "text-emerald-500" },
  { id: "LOST", name: "Lost", color: "border-rose-500/20 bg-rose-500/5", iconColor: "text-rose-500" }
];

export default function LeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const token = useAuthStore((state) => state.token);
  
  const [openEmailModal, setOpenEmailModal] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [selectedLeadForEmail, setSelectedLeadForEmail] = useState<Lead | null>(null);
  const [openViewModal, setOpenViewModal] = useState(false);
  const [selectedLeadForView, setSelectedLeadForView] = useState<Lead | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");

  const handleMoveLead = async (leadId: string, newStatus: string) => {
    if (!token) return;
    try {
      let res;
      if (newStatus === 'WON') {
        res = await fetch(`${API_BASE_URL}/leads/${leadId}/convert`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        res = await fetch(`${API_BASE_URL}/leads/${leadId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ status: newStatus })
        });
      }

      if (res.ok) {
        toast.success(newStatus === 'WON' 
          ? "Opportunity Won! Lead successfully converted to Client." 
          : `Opportunity stage updated to ${newStatus}`
        );
        fetchLeads();
      } else {
        toast.error("Failed to update status.");
      }
    } catch (e) {
      toast.error("Network error.");
    }
  };

  const [formData, setFormData] = useState({
    company_name: "",
    contact_person: "",
    email: "",
    phone: "",
    source: "Website",
    notes: "",
    closure_probability: 50,
    next_follow_up: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchLeads();
  }, [token]);

  const fetchLeads = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/leads`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) setLeads(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setOpen(false);
        setFormData({ 
          company_name: "", 
          contact_person: "", 
          email: "", 
          phone: "", 
          source: "Website", 
          notes: "",
          closure_probability: 50,
          next_follow_up: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        });
        toast.success("Lead captured successfully!");
        fetchLeads();
      }
    } catch (e) {
      toast.error("Failed to capture lead.");
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConvertToClient = async (id: string) => {
    if (!token) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/leads/${id}/convert`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success("Lead successfully converted to Client!");
        fetchLeads();
      } else {
        toast.error("Conversion failed.");
      }
    } catch (e) {
      toast.error("Network error.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedLeadForEmail) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/leads/${selectedLeadForEmail.id}/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          subject: emailSubject,
          message: emailMessage
        })
      });
      if (res.ok) {
        toast.success("Email sent successfully!");
        setOpenEmailModal(false);
        setEmailSubject("");
        setEmailMessage("");
      } else {
        const err = await res.json();
        toast.error(err.message || "Failed to send email.");
      }
    } catch (e) {
      toast.error("Failed to connect to email server.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkAsLost = async (id: string) => {
    if (!token) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/leads/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'LOST' })
      });
      if (res.ok) {
        toast.success("Lead marked as LOST successfully.");
        fetchLeads();
      } else {
        toast.error("Failed to update status.");
      }
    } catch (e) {
      toast.error("Network error.");
    } finally {
      setSubmitting(false);
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

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl lg:text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600">
            Sales Pipeline
          </h1>
          <p className="text-muted-foreground font-medium text-sm lg:text-base">Track opportunities and nurture relationships across the sales pipeline.</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex bg-card border border-border p-1 rounded-2xl shadow-sm">
            <Button
              variant={viewMode === "table" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
              className={cn("rounded-xl px-4 py-2 h-9 font-bold text-xs flex items-center gap-2 transition-all", 
                viewMode === "table" ? "bg-accent text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <List className="w-4 h-4" /> List
            </Button>
            <Button
              variant={viewMode === "kanban" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("kanban")}
              className={cn("rounded-xl px-4 py-2 h-9 font-bold text-xs flex items-center gap-2 transition-all", 
                viewMode === "kanban" ? "bg-accent text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Kanban className="w-4 h-4" /> Kanban
            </Button>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-xl shadow-indigo-500/20 px-8 h-12 transition-all active:scale-95 text-sm lg:text-base border-0" />}>
              <Plus className="w-5 h-5 mr-2" /> Capture New Lead
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] bg-card border-border text-foreground rounded-[2rem]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">New Sales Opportunity</DialogTitle>
              <DialogDescription className="text-muted-foreground">Record lead details and start the qualification process.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateLead} className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input 
                    value={formData.company_name}
                    onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                    placeholder="Acme Global"
                    className="bg-background border-border h-11 rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contact Person</Label>
                  <Input 
                    value={formData.contact_person}
                    onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
                    placeholder="John Doe"
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
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="john@acme.com"
                    className="bg-background border-border h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input 
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="+91 98765 43210"
                    className="bg-background border-border h-11 rounded-xl"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Lead Source</Label>
                <select 
                  className="w-full bg-background border border-border rounded-xl h-11 px-3 text-sm focus:ring-2 focus:ring-indigo-500 text-foreground"
                  value={formData.source}
                  onChange={(e) => setFormData({...formData, source: e.target.value})}
                >
                  <option>Website</option>
                  <option>Referral</option>
                  <option>LinkedIn</option>
                  <option>Cold Call</option>
                  <option>Event</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Closure Probability (%)</Label>
                  <Input 
                    type="number"
                    min="0"
                    max="100"
                    value={formData.closure_probability}
                    onChange={(e) => setFormData({...formData, closure_probability: Number(e.target.value)})}
                    className="bg-background border-border h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Next Follow-up</Label>
                  <Input 
                    type="date"
                    value={formData.next_follow_up}
                    onChange={(e) => setFormData({...formData, next_follow_up: e.target.value})}
                    className="bg-background border-border h-11 rounded-xl"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <textarea 
                  className="w-full bg-background border border-border rounded-xl p-3 text-sm min-h-[100px] focus:ring-2 focus:ring-indigo-500 text-foreground"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Additional context about the opportunity..."
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={submitting} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold w-full h-12 shadow-xl shadow-indigo-500/20 rounded-xl mt-4 border-0">
                  {submitting ? "Saving..." : "Create Opportunity"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { 
            label: "Pipeline Value", 
            value: `₹${(leads.reduce((acc, lead) => 
              acc + (lead.quotations?.reduce((sum, q) => sum + Number(q.total_amount), 0) || 0), 0) / 100000).toFixed(1)}L`, 
            icon: TrendingUp, 
            color: "text-blue-600 dark:text-blue-400", 
            bg: "bg-blue-500/10" 
          },
          { 
            label: "Active Leads", 
            value: leads.filter(l => l.status !== 'WON' && l.status !== 'LOST').length, 
            icon: Target, 
            color: "text-purple-600 dark:text-purple-400", 
            bg: "bg-purple-500/10" 
          },
          { 
            label: "New Leads (7d)", 
            value: leads.filter(l => new Date(l.created_at) > new Date(Date.now() - 7 * 86400000)).length, 
            icon: Clock, 
            color: "text-amber-600 dark:text-amber-400", 
            bg: "bg-amber-500/10" 
          },
          { 
            label: "Win Rate", 
            value: leads.length > 0 ? `${((leads.filter(l => l.status === 'WON').length / leads.length) * 100).toFixed(0)}%` : "0%", 
            icon: CheckCircle2, 
            color: "text-emerald-600 dark:text-emerald-400", 
            bg: "bg-emerald-500/10" 
          }
        ].map((stat, i) => (
          <div key={i} className="bg-card/40 border border-border rounded-[2rem] p-6 flex items-center justify-between backdrop-blur-md shadow-sm">
            <div className="space-y-1">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</p>
              <p className="text-3xl font-black text-foreground">{stat.value}</p>
            </div>
            <div className={`w-12 h-12 rounded-2xl ${stat.bg} flex items-center justify-center ${stat.color} border border-border/50`}>
              <stat.icon className="w-6 h-6" />
            </div>
          </div>
        ))}
      </div>

      {viewMode === "table" ? (
        <div className="bg-card/40 border border-border rounded-[2.5rem] overflow-hidden shadow-sm backdrop-blur-md">
          <div className="overflow-x-auto scrollbar-hide">
            <table className="w-full text-left min-w-[800px] lg:min-w-0">
              <thead className="bg-muted border-b border-border">
                <tr>
                  <th className="px-6 py-5 text-xs font-bold text-muted-foreground uppercase tracking-widest">Company & Source</th>
                  <th className="px-6 py-5 text-xs font-bold text-muted-foreground uppercase tracking-widest hidden md:table-cell">Primary Contact</th>
                  <th className="px-6 py-5 text-xs font-bold text-muted-foreground uppercase tracking-widest">Lead Stage & Win %</th>
                  <th className="px-6 py-5 text-xs font-bold text-muted-foreground uppercase tracking-widest hidden lg:table-cell">Next Action</th>
                  <th className="px-6 py-5 text-xs font-bold text-muted-foreground uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground italic">Synchronizing sales pipeline...</td>
                  </tr>
                ) : leads.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground italic">No leads found in the pipeline.</td>
                  </tr>
                ) : leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-accent/5 transition-colors group">
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center border border-border group-hover:scale-110 transition-transform">
                          <Building2 className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="text-foreground font-bold text-base">{lead.company_name}</div>
                          <div className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mt-0.5">{lead.source}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6 hidden md:table-cell">
                      <div className="text-foreground/90 font-bold">{lead.contact_person}</div>
                      <div className="flex items-center gap-2 text-muted-foreground text-xs mt-1">
                        <Mail className="w-3.5 h-3.5" /> {lead.email || "--"}
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex flex-col gap-2">
                        <span className={cn("px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter ring-1 w-fit", getStatusColor(lead.status))}>
                          {lead.status}
                        </span>
                        <div className="flex items-center gap-2">
                           <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden w-20">
                              <div className="h-full bg-indigo-500" style={{ width: `${lead.closure_probability || 0}%` }} />
                           </div>
                           <span className="text-[10px] font-bold text-muted-foreground">{lead.closure_probability || 0}%</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6 text-muted-foreground text-sm font-bold hidden lg:table-cell">
                      {lead.next_follow_up ? (
                        <div className="flex flex-col">
                           <span className="text-xs text-indigo-600 font-black uppercase">Follow-up</span>
                           <span className="text-foreground">{new Date(lead.next_follow_up).toLocaleDateString([], { day: '2-digit', month: 'short' })}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">No action set</span>
                      )}
                    </td>
                    <td className="px-6 py-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => { setSelectedLeadForView(lead); setOpenViewModal(true); }}
                          className="text-muted-foreground hover:text-foreground hover:bg-accent/10 rounded-2xl w-10 h-10"
                          title="View Lead Details"
                        >
                          <FileText className="w-4 h-4" />
                        </Button>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger render={
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hover:bg-accent/10 rounded-2xl w-10 h-10" />
                          }>
                            <MoreVertical className="w-4 h-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-card border-border text-foreground min-w-[180px] rounded-2xl shadow-2xl p-2">
                            <DropdownMenuItem 
                              onClick={() => {
                                setSelectedLeadForEmail(lead);
                                setEmailSubject(`Regarding safety compliance at ${lead.company_name}`);
                                setEmailMessage(`Dear ${lead.contact_person},\n\nWe wanted to follow up on your recent request for safety compliance solutions...\n\nBest regards,\nGlobal Safety Solution`);
                                setOpenEmailModal(true);
                              }}
                              className="hover:bg-accent/10 cursor-pointer flex items-center gap-3 py-3 rounded-xl font-bold text-sm"
                            >
                              <Mail className="w-4 h-4 text-muted-foreground" /> Send Email
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => router.push(`/dashboard/quotations?leadId=${lead.id}`)}
                              className="hover:bg-primary/10 hover:text-primary cursor-pointer flex items-center gap-3 py-3 rounded-xl font-bold text-sm"
                            >
                              <FileText className="w-4 h-4" /> Create Quotation
                            </DropdownMenuItem>
  
                            {lead.status !== 'WON' && (
                              <DropdownMenuItem 
                                onClick={() => handleConvertToClient(lead.id)}
                                className="hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 cursor-pointer flex items-center gap-3 py-3 rounded-xl font-bold text-sm"
                              >
                                <CheckCircle2 className="w-4 h-4" /> Convert to Client
                              </DropdownMenuItem>
                            )}
                            
                            {lead.status !== 'WON' && lead.status !== 'LOST' && (
                              <DropdownMenuItem 
                                onClick={() => handleMarkAsLost(lead.id)}
                                className="hover:bg-destructive/10 text-destructive cursor-pointer flex items-center gap-3 py-3 rounded-xl font-bold text-sm mt-1 border-t border-border"
                              >
                                <XCircle className="w-4 h-4" /> Mark as Lost
                              </DropdownMenuItem>
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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 min-h-[500px]">
          {KANBAN_STAGES.map((stage) => {
            const stageLeads = leads.filter((l) => l.status === stage.id);
            return (
              <div 
                key={stage.id} 
                className={cn("rounded-[2rem] border p-4 flex flex-col space-y-4 backdrop-blur-md transition-all duration-300", stage.color)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  const leadId = e.dataTransfer.getData("text/plain");
                  if (leadId) handleMoveLead(leadId, stage.id);
                }}
              >
                <div className="flex items-center justify-between border-b border-border/40 pb-3">
                  <span className="text-xs font-black text-foreground/90 tracking-widest uppercase">{stage.name}</span>
                  <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-black text-foreground border border-border bg-background/50", stage.iconColor)}>
                    {stageLeads.length}
                  </span>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-3 min-h-[400px] max-h-[600px] pr-1 scrollbar-hide">
                  {stageLeads.map((lead) => (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", lead.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onClick={() => {
                        setSelectedLeadForView(lead);
                        setOpenViewModal(true);
                      }}
                      className="group bg-card/60 hover:bg-card border border-border/80 hover:border-indigo-500/40 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-300 cursor-grab active:cursor-grabbing relative overflow-hidden"
                    >
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>

                      <div className="space-y-3">
                        <div>
                          <p className="font-bold text-foreground text-sm group-hover:text-indigo-400 transition-colors line-clamp-1">{lead.company_name}</p>
                          <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest mt-0.5">{lead.source || "Website"}</p>
                        </div>

                        <div className="space-y-1 text-xs">
                          <p className="font-semibold text-foreground/80">{lead.contact_person}</p>
                          {lead.phone && <p className="text-muted-foreground text-[10px]">{lead.phone}</p>}
                        </div>

                        <div className="space-y-1.5 pt-2 border-t border-border/40">
                          <div className="flex items-center justify-between text-[9px] font-black text-muted-foreground uppercase tracking-wider">
                            <span>Win Chance</span>
                            <span>{lead.closure_probability || 0}%</span>
                          </div>
                          <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${lead.closure_probability || 0}%` }} />
                          </div>
                        </div>

                        {lead.next_follow_up && (
                          <div className="flex items-center gap-1.5 mt-2 text-[9px] font-black text-indigo-400 bg-indigo-500/5 ring-1 ring-indigo-500/10 px-2 py-1 rounded-lg w-fit">
                            <Clock className="w-3 h-3" />
                            <span>
                              {new Date(lead.next_follow_up).toLocaleDateString([], { day: '2-digit', month: 'short' })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {stageLeads.length === 0 && (
                    <div className="h-24 rounded-2xl border border-dashed border-border/40 flex items-center justify-center text-center p-4">
                      <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Drag leads here</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      <Dialog open={openEmailModal} onOpenChange={setOpenEmailModal}>
        <DialogContent className="sm:max-w-[550px] bg-card border-border text-foreground rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
              <Mail className="w-6 h-6 text-indigo-500" /> Send Email to {selectedLeadForEmail?.contact_person}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Direct message to {selectedLeadForEmail?.email || "N/A"} ({selectedLeadForEmail?.company_name}).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSendEmail} className="space-y-5 mt-4">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input 
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Email Subject"
                className="bg-background border-border h-11 rounded-xl"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <textarea 
                className="w-full bg-background border border-border rounded-xl p-3 text-sm min-h-[180px] focus:ring-2 focus:ring-indigo-500 text-foreground"
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                placeholder="Type your email body here..."
                required
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={submitting} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold w-full h-12 shadow-xl shadow-indigo-500/20 rounded-xl mt-2 border-0">
                {submitting ? "Sending..." : "Dispatch Email"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={openViewModal} onOpenChange={setOpenViewModal}>
        <DialogContent className="sm:max-w-[650px] bg-card border-border text-foreground rounded-[2.5rem] p-8 shadow-2xl">
          <DialogHeader className="border-b border-border pb-4">
            <DialogTitle className="text-2xl font-black tracking-tight text-foreground flex items-center justify-between">
              <span>{selectedLeadForView?.company_name}</span>
              <span className={cn("px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ring-1", selectedLeadForView ? getStatusColor(selectedLeadForView.status) : "")}>
                {selectedLeadForView?.status}
              </span>
            </DialogTitle>
            <DialogDescription className="text-muted-foreground font-semibold">
              Sales Lead Profile & Intel Card
            </DialogDescription>
          </DialogHeader>

          {selectedLeadForView && (
            <div className="space-y-6 mt-6">
              {/* Profile Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Primary Contact</span>
                    <span className="font-bold text-foreground text-base block">{selectedLeadForView.contact_person}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Communication Channels</span>
                    <span className="text-sm font-medium text-foreground block">{selectedLeadForView.email || "No email provided"}</span>
                    <span className="text-xs font-semibold text-muted-foreground block">{selectedLeadForView.phone || "No phone number"}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Lead Origin / Source</span>
                    <span className="font-bold text-foreground text-base block">{selectedLeadForView.source || "Website"}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Closure Probability</span>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${selectedLeadForView.closure_probability || 0}%` }} />
                      </div>
                      <span className="text-xs font-bold text-foreground">{selectedLeadForView.closure_probability || 0}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Follow-up & Financial Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-muted/20 border border-border rounded-2xl">
                <div>
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Next Follow-up Action</span>
                  <span className="font-bold text-foreground text-sm mt-0.5 block">
                    {selectedLeadForView.next_follow_up 
                      ? new Date(selectedLeadForView.next_follow_up).toLocaleDateString([], { day: '2-digit', month: 'long', year: 'numeric' })
                      : "No follow-up action set"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Active Quotes Value</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-black text-base mt-0.5 block">
                    ₹{(selectedLeadForView.quotations?.reduce((acc, q) => acc + Number(q.total_amount), 0) || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Lead Notes Section */}
              <div className="space-y-2 border-t border-border pt-4">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Opportunity Notes & History</span>
                <div className="p-4 bg-card/60 border border-border/80 rounded-2xl max-h-[160px] overflow-y-auto text-xs text-foreground/80 leading-relaxed italic">
                  {selectedLeadForView.notes || "No background details recorded for this sales opportunity."}
                </div>
              </div>

              <DialogFooter className="border-t border-border pt-6 gap-2">
                <Button 
                  variant="ghost" 
                  onClick={() => setOpenViewModal(false)}
                  className="text-muted-foreground hover:text-foreground hover:bg-accent/10 rounded-xl"
                >
                  Close Profile
                </Button>
                <Button 
                  onClick={() => {
                    setOpenViewModal(false);
                    router.push(`/dashboard/quotations?leadId=${selectedLeadForView.id}`);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl px-5 border-0 shadow-lg shadow-indigo-500/10"
                >
                  Configure Quotation
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>

  );
}
