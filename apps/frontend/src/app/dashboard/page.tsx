"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth";
import { API_BASE_URL } from "@/lib/config";
import dynamic from "next/dynamic";

const DashboardChart = dynamic(() => import("@/components/DashboardChart"), {
  ssr: false,
  loading: () => <div className="h-[350px] w-full flex items-center justify-center bg-card/10 rounded-[2.5rem] animate-pulse text-xs text-muted-foreground">Loading chart...</div>
});
import { 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck, 
  Users, 
  Briefcase, 
  Activity,
  ArrowUpRight,
  Clock,
  ArrowRight,
  FileText,
  UserPlus,
  Plus,
  Cpu,
  Database,
  Zap,
  Target,
  FileSpreadsheet,
  Package,
  ClipboardCheck,
  AlertTriangle,
  CalendarClock,
  XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface ActivityItem {
  id: string;
  type: 'LEAD' | 'CLIENT' | 'QUOTE';
  title: string;
  detail: string;
  date: string;
}

interface SystemStatusData {
  server: {
    status: string;
    uptime: string;
    latency: string;
    memory: string;
  };
  database: {
    status: string;
    connections: string;
    latency: string;
  };
  criticals: {
    expiredCompliance: number;
    unpaidInvoices: number;
    pendingInspections: number;
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const stripHtml = (html?: string | null) => {
    if (!html) return "";
    return html.replace(/<[^>]*>/g, "");
  };
  const [stats, setStats] = useState<any>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);
  const { token, logout, user } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!token) {
      setLoading(false);
      return;
    }
    fetch(`${API_BASE_URL}/dashboard/stats`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(r => {
      if (r.status === 401) {
        logout();
        router.push("/login");
        throw new Error("Unauthorized");
      }
      return r.json();
    })
    .then(data => {
      if (data) setStats(data);
      setLoading(false);
    })
    .catch((err) => {
      console.error(err);
      setLoading(false);
    });
  }, [hydrated, token, logout, router]);

  const fetchSystemStatus = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/dashboard/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setSystemStatus(data);
    } catch (error) {
      console.error("Failed to fetch system status", error);
    }
  };

  useEffect(() => {
    if (isStatusOpen) {
      fetchSystemStatus();
    }
  }, [isStatusOpen]);

  if (loading || !stats || !token || !user) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      <p className="text-muted-foreground font-bold animate-pulse tracking-widest uppercase text-xs">Synchronizing Intelligence...</p>
    </div>
  );

  // 1. Try to get the dynamic DB role
  let roleName = user?.roles?.[0]?.role?.name;
  
  // 2. Fallback to legacy designation if DB role is missing
  if (!roleName) {
    const designation = (user?.designation || "").toUpperCase();
    if (designation.includes("HR")) roleName = "HR_MANAGER";
    else if (designation.includes("FIELD") || designation.includes("ENGINEER")) roleName = "FIELD_ENGINEER";
    else if (designation.includes("SALES")) roleName = "SALES_EXECUTIVE";
    else if (designation.includes("CLIENT")) roleName = "CLIENT";
    else roleName = "STAFF";
  }
  
  // 3. Admin override
  const isLegacyAdmin = user?.email === "admin@globalsafety.com";
  const userRole = isLegacyAdmin ? "SUPER_ADMIN" : roleName;

  // CLIENT Portal Dashboard
  if (userRole === "CLIENT") {
    return (
      <div className="space-y-10 pb-12 animate-in fade-in duration-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-black tracking-tighter text-foreground">
              Client <span className="text-primary">Portal</span>
            </h1>
            <p className="text-muted-foreground font-medium max-w-md">Welcome back, {stats.clientName || user?.name || 'Valued Client'}. Here is your compliance and safety overview.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={() => router.push('/dashboard/inspections')} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-12 px-6 shadow-xl shadow-primary/20">
              <ClipboardCheck className="w-4 h-4 mr-2" /> View Audits
            </Button>
          </div>
        </div>

        {/* Client Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { title: "Active Quotations", value: stats.activeQuotes || 0, icon: FileText, color: "blue", desc: "Open proposals & quotations" },
            { title: "Scheduled Inspections", value: stats.scheduledAudits || 0, icon: ClipboardCheck, color: "emerald", desc: "Upcoming safety checks" },
            { title: "Compliance Documents", value: stats.certificatesCount || 0, icon: ShieldCheck, color: "purple", desc: "Digital vault certificates" }
          ].map((stat, i) => (
            <div key={i} className="group p-5 lg:p-8 rounded-[2rem] bg-card/40 border border-border relative overflow-hidden transition-all hover:border-primary/20 hover:translate-y-[-4px] flex flex-col justify-between">
              <div className={cn("absolute top-0 right-0 w-32 h-32 blur-[80px] opacity-20 transition-opacity group-hover:opacity-30", 
                stat.color === 'blue' ? 'bg-blue-500' : stat.color === 'emerald' ? 'bg-emerald-500' : 'bg-purple-500'
              )} />
              <div className="relative z-10 space-y-4 lg:space-y-6 flex-1 flex flex-col">
                <div className="flex items-center justify-between">
                  <div className={cn("p-2 lg:p-3 rounded-2xl shrink-0", 
                    stat.color === 'blue' ? 'bg-blue-500/10 text-blue-500' : stat.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-purple-500/10 text-purple-500'
                  )}>
                    <stat.icon className="w-5 h-5 lg:w-6 lg:h-6" />
                  </div>
                </div>
                <div className="space-y-1 mt-auto">
                  <p className="text-3xl lg:text-4xl font-black text-foreground tracking-tighter truncate">{stat.value}</p>
                  <p className="text-muted-foreground text-xs lg:text-sm font-bold truncate">{stat.title}</p>
                  <p className="text-muted-foreground/60 text-[9px] lg:text-[10px] uppercase font-black tracking-widest line-clamp-1">{stat.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Content sections */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Recent Audits & Inspections */}
          <div className="lg:col-span-6 p-8 rounded-[2.5rem] bg-card border border-border shadow-xs backdrop-blur-md">
            <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-emerald-500" /> Recent Site Inspections
            </h3>
            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 scrollbar-hide">
              {stats.recentInspections?.map((insp: any) => (
                <div key={insp.id} className="p-4 rounded-2xl bg-muted/30 border border-border/80 hover:border-emerald-500/30 transition-all flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                  <div>
                    <p className="font-bold text-foreground">Safety Audit</p>
                    <p className="text-xs text-muted-foreground">Scheduled: {new Date(insp.scheduledDate).toLocaleDateString()}</p>
                    <p className="text-xs text-muted-foreground/80 mt-1 line-clamp-1 italic" title={stripHtml(insp.remarks)}>&ldquo;{stripHtml(insp.remarks)}&rdquo;</p>
                  </div>
                  <span className={cn("text-[9px] font-black uppercase px-3 py-1 rounded-full self-start sm:self-auto",
                    insp.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'
                  )}>{insp.status}</span>
                </div>
              ))}
              {(!stats.recentInspections || stats.recentInspections.length === 0) && (
                <p className="text-muted-foreground italic text-sm text-center py-8">No inspections logged yet.</p>
              )}
            </div>
          </div>

          {/* Recent Safety Quotations */}
          <div className="lg:col-span-6 p-8 rounded-[2.5rem] bg-card border border-border shadow-xs backdrop-blur-md">
            <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" /> Safety Quotations
            </h3>
            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 scrollbar-hide">
              {stats.recentQuotations?.map((quote: any) => (
                <div key={quote.id} className="p-4 rounded-2xl bg-muted/30 border border-border/80 hover:border-blue-500/30 transition-all flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                  <div>
                    <p className="font-bold text-foreground">{quote.quoteNumber}</p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">₹{quote.totalAmount.toLocaleString()}</p>
                  </div>
                  <span className={cn("text-[9px] font-black uppercase px-3 py-1 rounded-full self-start sm:self-auto",
                    quote.status === 'ACCEPTED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                  )}>{quote.status}</span>
                </div>
              ))}
              {(!stats.recentQuotations || stats.recentQuotations.length === 0) && (
                <p className="text-muted-foreground italic text-sm text-center py-8">No quotations issued yet.</p>
              )}
            </div>
          </div>

          {/* Financial Summary & Invoices */}
          <div className="lg:col-span-12 p-8 rounded-[2.5rem] bg-card border border-border shadow-xs backdrop-blur-md">
            <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-purple-500" /> Invoices & Billing
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {stats.recentInvoices?.map((invoice: any) => (
                <div key={invoice.id} className="p-5 rounded-3xl bg-muted/20 border border-border hover:border-purple-500/20 transition-all flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-foreground text-sm">{invoice.invoiceNumber}</p>
                      <p className="text-lg font-black text-foreground font-mono mt-1">₹{invoice.amount.toLocaleString()}</p>
                    </div>
                    <span className={cn("text-[8px] font-black uppercase px-2 py-0.5 rounded-md",
                      invoice.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                    )}>{invoice.status}</span>
                  </div>
                </div>
              ))}
              {(!stats.recentInvoices || stats.recentInvoices.length === 0) && (
                <div className="col-span-full text-center py-8 text-muted-foreground italic text-sm">No invoices recorded yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 1. Sales Executive Dashboard
  if (userRole === "SALES_EXECUTIVE") {
    const quickActions = [
      { name: "New Lead", icon: Target, href: "/dashboard/leads", color: "blue" },
      { name: "Create Quote", icon: FileText, href: "/dashboard/quotations", color: "indigo" },
      { name: "Digital Vault", icon: FileSpreadsheet, href: "/dashboard/documents", color: "emerald" },
    ];

    return (
      <div className="space-y-10 pb-12 animate-in fade-in duration-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-black tracking-tighter text-foreground">
              Sales <span className="text-primary">Console</span>
            </h1>
            <p className="text-muted-foreground font-medium max-w-md">Nurture leads and close compliance opportunities.</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Quick Action Modal */}
            <Dialog open={isQuickActionOpen} onOpenChange={setIsQuickActionOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-12 px-6 shadow-xl shadow-primary/20">
                  <Plus className="w-4 h-4 mr-2" /> Quick Action
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl bg-card/95 backdrop-blur-xl border-border rounded-[2.5rem]">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black tracking-tighter">Strategic Handoff</DialogTitle>
                  <DialogDescription className="text-muted-foreground font-medium uppercase tracking-widest text-[10px]">Accelerate your sales pipeline</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 mt-6">
                  {quickActions.map((action) => (
                    <button
                      key={action.name}
                      onClick={() => {
                        setIsQuickActionOpen(false);
                        router.push(action.href);
                      }}
                      className="group p-6 rounded-3xl bg-accent/20 border border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-left flex flex-col gap-4"
                    >
                      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110", 
                        action.color === 'blue' ? 'bg-blue-500/10 text-blue-500' :
                        action.color === 'indigo' ? 'bg-indigo-500/10 text-indigo-500' :
                        'bg-emerald-500/10 text-emerald-500'
                      )}>
                        <action.icon className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-black text-foreground tracking-tighter">{action.name}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Launch Module</p>
                      </div>
                    </button>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { title: "Active Opportunities", value: stats.activeLeads, icon: Target, color: "blue", desc: "Leads under qualification" },
            { title: "Follow-ups Scheduled", value: stats.pendingFollowups, icon: Clock, color: "emerald", desc: "Tasks due in next 7 days" },
            { title: "Won Value (MTD)", value: stats.wonValue, icon: TrendingUp, color: "purple", desc: "Your completed sales value" }
          ].map((stat, i) => (
            <div key={i} className="group p-5 lg:p-8 rounded-[2rem] bg-card/40 border border-border relative overflow-hidden transition-all hover:border-primary/20 hover:translate-y-[-4px] flex flex-col justify-between">
              <div className={cn("absolute top-0 right-0 w-32 h-32 blur-[80px] opacity-20 transition-opacity group-hover:opacity-30", 
                stat.color === 'blue' ? 'bg-blue-500' : stat.color === 'emerald' ? 'bg-emerald-500' : 'bg-purple-500'
              )} />
              <div className="relative z-10 space-y-4 lg:space-y-6 flex-1 flex flex-col">
                <div className="flex items-center justify-between">
                  <div className={cn("p-2 lg:p-3 rounded-2xl shrink-0", 
                    stat.color === 'blue' ? 'bg-blue-500/10 text-blue-500' : stat.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-purple-500/10 text-purple-500'
                  )}>
                    <stat.icon className="w-5 h-5 lg:w-6 lg:h-6" />
                  </div>
                </div>
                <div className="space-y-1 mt-auto">
                  <p className="text-3xl lg:text-4xl font-black text-foreground tracking-tighter truncate">{stat.value}</p>
                  <p className="text-muted-foreground text-xs lg:text-sm font-bold truncate">{stat.title}</p>
                  <p className="text-muted-foreground/60 text-[9px] lg:text-[10px] uppercase font-black tracking-widest line-clamp-1">{stat.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Performance Chart & Recent activity */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 p-8 rounded-[2.5rem] bg-card/30 border border-border backdrop-blur-md">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h3 className="text-xl font-bold text-foreground">My Sales Performance</h3>
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-widest mt-1">Personal growth trajectory</p>
              </div>
            </div>
            <div className="h-[350px] w-full">
              <DashboardChart data={stats.chartData || []} />
            </div>
          </div>

          <div className="lg:col-span-4 p-8 rounded-[2.5rem] bg-card/30 border border-border backdrop-blur-md flex flex-col">
            <h3 className="text-xl font-bold text-foreground flex items-center gap-2 mb-8">
              <Clock className="w-5 h-5 text-indigo-500" /> Active Leads
            </h3>
            <div className="space-y-6 flex-1 overflow-y-auto pr-2 scrollbar-hide">
              {(stats.recentActivity || []).map((item: any, i: number) => (
                <div key={i} className="flex gap-4 group cursor-pointer hover:bg-accent/5 p-2 rounded-xl transition-all" onClick={() => router.push('/dashboard/leads')}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center border bg-blue-500/10 border-blue-500/20 text-blue-500">
                    <Target className="w-4 h-4" />
                  </div>
                  <div className="flex-1 space-y-0.5">
                    <p className="text-xs font-black text-foreground truncate">{item.title}</p>
                    <p className="text-[10px] font-medium text-muted-foreground leading-tight line-clamp-1">{item.detail}</p>
                  </div>
                </div>
              ))}
              {(stats.recentActivity || []).length === 0 && (
                <p className="text-muted-foreground italic text-sm text-center py-10">No active leads assigned yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Field Engineer Dashboard
  if (userRole === "FIELD_ENGINEER") {
    return (
      <div className="space-y-10 pb-12 animate-in fade-in duration-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-black tracking-tighter text-foreground">
              Engineer <span className="text-primary">Portal</span>
            </h1>
            <p className="text-muted-foreground font-medium max-w-md">Assigned site inspections and field operations.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={() => router.push('/dashboard/attendance')} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-12 px-6 shadow-xl shadow-primary/20">
              <Clock className="w-4 h-4 mr-2" /> Clock In / Out
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { title: "Scheduled Inspections", value: stats.pendingInspections, icon: ClipboardCheck, color: "blue", desc: "Pending safety checks" },
            { title: "Pending Operations", value: stats.pendingTasks, icon: Briefcase, color: "emerald", desc: "Tasks assigned to you" },
            { title: "Attendance Rate", value: stats.attendanceRate, icon: Activity, color: "purple", desc: "This month's coverage" }
          ].map((stat, i) => (
            <div key={i} className="group p-5 lg:p-8 rounded-[2rem] bg-card/40 border border-border relative overflow-hidden transition-all hover:border-primary/20 hover:translate-y-[-4px] flex flex-col justify-between">
              <div className={cn("absolute top-0 right-0 w-32 h-32 blur-[80px] opacity-20 transition-opacity group-hover:opacity-30", 
                stat.color === 'blue' ? 'bg-blue-500' : stat.color === 'emerald' ? 'bg-emerald-500' : 'bg-purple-500'
              )} />
              <div className="relative z-10 space-y-4 lg:space-y-6 flex-1 flex flex-col">
                <div className="flex items-center justify-between">
                  <div className={cn("p-2 lg:p-3 rounded-2xl shrink-0", 
                    stat.color === 'blue' ? 'bg-blue-500/10 text-blue-500' : stat.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-purple-500/10 text-purple-500'
                  )}>
                    <stat.icon className="w-5 h-5 lg:w-6 lg:h-6" />
                  </div>
                </div>
                <div className="space-y-1 mt-auto">
                  <p className="text-3xl lg:text-4xl font-black text-foreground tracking-tighter truncate">{stat.value}</p>
                  <p className="text-muted-foreground text-xs lg:text-sm font-bold truncate">{stat.title}</p>
                  <p className="text-muted-foreground/60 text-[9px] lg:text-[10px] uppercase font-black tracking-widest line-clamp-1">{stat.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Schedule & Tasks lists */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="p-8 rounded-[2.5rem] bg-card border border-border shadow-xs backdrop-blur-md">
            <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-blue-500" /> My Inspection Schedule
            </h3>
            <div className="space-y-4 max-h-[360px] overflow-y-auto pr-2">
              {stats.inspections?.map((insp: any) => (
                <div key={insp.id} className="p-4 rounded-2xl bg-muted/50 border border-border flex justify-between items-center hover:border-blue-500/30 transition-all">
                  <div>
                    <p className="font-bold text-foreground">{insp.client}</p>
                    <p className="text-xs text-muted-foreground font-medium">Date: {new Date(insp.scheduledDate).toLocaleDateString()}</p>
                  </div>
                  <span className="text-[10px] font-black uppercase bg-blue-500/10 text-blue-500 px-3 py-1 rounded-full">{insp.status}</span>
                </div>
              ))}
              {(!stats.inspections || stats.inspections.length === 0) && (
                <p className="text-muted-foreground italic text-sm text-center py-8">No inspections scheduled for you.</p>
              )}
            </div>
          </div>

          <div className="p-8 rounded-[2.5rem] bg-card border border-border shadow-xs backdrop-blur-md">
            <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-emerald-500" /> My Assigned Tasks
            </h3>
            <div className="space-y-4 max-h-[360px] overflow-y-auto pr-2">
              {stats.tasks?.map((task: any) => (
                <div 
                  key={task.id} 
                  onClick={() => router.push(`/dashboard/operations?search=${encodeURIComponent(task.project || '')}&expand=${task.projectId || ''}`)}
                  className="p-4 rounded-2xl bg-muted/30 border border-border flex justify-between items-center cursor-pointer hover:border-emerald-500/50 hover:bg-muted/50 transition-all group"
                >
                  <div>
                    <p className="font-bold text-foreground group-hover:text-emerald-500 transition-colors">{task.title}</p>
                    <p className="text-xs text-muted-foreground">Project: {task.project}</p>
                  </div>
                  <span className={cn("text-[9px] font-black uppercase px-2.5 py-1 rounded-md shadow-sm", 
                    task.priority === 'HIGH' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                  )}>{task.priority}</span>
                </div>
              ))}
              {(!stats.tasks || stats.tasks.length === 0) && (
                <p className="text-muted-foreground italic text-sm text-center py-8">No pending tasks assigned.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. Staff / Regular User Dashboard
  if (userRole === "STAFF") {
    return (
      <div className="space-y-10 pb-12 animate-in fade-in duration-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-black tracking-tighter text-foreground">
              Employee <span className="text-primary">Console</span>
            </h1>
            <p className="text-muted-foreground font-medium max-w-md">Welcome back, {user?.name}. Here is your dashboard.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={() => router.push('/dashboard/attendance')} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-12 px-6 shadow-xl shadow-primary/20">
              <Clock className="w-4 h-4 mr-2" /> Clock In / Out
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { title: "My Pending Tasks", value: stats.pendingTasks, icon: Briefcase, color: "blue", desc: "Tasks requiring action" },
            { title: "Attendance Coverage", value: stats.attendanceRate, icon: Activity, color: "emerald", desc: "Current month" },
            { title: "Leave Balance", value: stats.leaveBalance + " Days", icon: ShieldCheck, color: "purple", desc: "Available leaves" }
          ].map((stat, i) => (
            <div key={i} className="group p-5 lg:p-8 rounded-[2rem] bg-card/40 border border-border relative overflow-hidden transition-all hover:border-primary/20 hover:translate-y-[-4px] flex flex-col justify-between">
              <div className={cn("absolute top-0 right-0 w-32 h-32 blur-[80px] opacity-20 transition-opacity group-hover:opacity-30", 
                stat.color === 'blue' ? 'bg-blue-500' : stat.color === 'emerald' ? 'bg-emerald-500' : 'bg-purple-500'
              )} />
              <div className="relative z-10 space-y-4 lg:space-y-6 flex-1 flex flex-col">
                <div className="flex items-center justify-between">
                  <div className={cn("p-2 lg:p-3 rounded-2xl shrink-0", 
                    stat.color === 'blue' ? 'bg-blue-500/10 text-blue-500' : stat.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-purple-500/10 text-purple-500'
                  )}>
                    <stat.icon className="w-5 h-5 lg:w-6 lg:h-6" />
                  </div>
                </div>
                <div className="space-y-1 mt-auto">
                  <p className="text-3xl lg:text-4xl font-black text-foreground tracking-tighter truncate">{stat.value}</p>
                  <p className="text-muted-foreground text-xs lg:text-sm font-bold truncate">{stat.title}</p>
                  <p className="text-muted-foreground/60 text-[9px] lg:text-[10px] uppercase font-black tracking-widest line-clamp-1">{stat.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tasks list */}
        <div className="p-8 rounded-[2.5rem] bg-card/30 border border-border backdrop-blur-md">
          <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-blue-500" /> My Active Tasks
          </h3>
          <div className="space-y-4 max-h-[360px] overflow-y-auto pr-2">
            {stats.tasks?.map((task: any) => (
              <div 
                key={task.id} 
                onClick={() => router.push(`/dashboard/operations?search=${encodeURIComponent(task.project || '')}&expand=${task.projectId || ''}`)}
                className="p-4 rounded-2xl bg-muted/30 border border-border flex justify-between items-center cursor-pointer hover:border-blue-500/50 hover:bg-muted/50 transition-all group"
              >
                <div>
                  <p className="font-bold text-foreground group-hover:text-blue-500 transition-colors">{task.title}</p>
                  <p className="text-xs text-muted-foreground">Project: {task.project}</p>
                </div>
                <span className={cn("text-[9px] font-black uppercase px-2.5 py-1 rounded-md shadow-sm", 
                  task.priority === 'HIGH' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                )}>{task.priority}</span>
              </div>
            ))}
            {(!stats.tasks || stats.tasks.length === 0) && (
              <p className="text-muted-foreground italic text-sm text-center py-8">All caught up! No active tasks assigned.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 4. Default Admin / Manager Dashboard
  const quickActions = [
    { name: "New Lead", icon: Target, href: "/dashboard/leads", color: "blue" },
    { name: "Create Quote", icon: FileText, href: "/dashboard/quotations", color: "indigo" },
    { name: "Onboard Staff", icon: UserPlus, href: "/dashboard/employees", color: "emerald" },
    { name: "Add Inventory", icon: Package, href: "/dashboard/inventory", color: "orange" },
    { name: "Schedule Visit", icon: ClipboardCheck, href: "/dashboard/inspections", color: "rose" },
    { name: "View Finance", icon: FileSpreadsheet, href: "/dashboard/finance", color: "purple" },
  ];

  return (
    <div className="space-y-10 pb-12 animate-in fade-in duration-700">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tighter text-foreground">
            Command <span className="text-primary">Center</span>
          </h1>
          <p className="text-muted-foreground font-medium max-w-md">Real-time operational visibility and compliance health monitoring.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          {/* System Status Modal */}
          <Dialog open={isStatusOpen} onOpenChange={setIsStatusOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto bg-card border-border hover:bg-accent text-foreground font-bold h-12 px-6">
                <Activity className="w-4 h-4 mr-2 text-primary" /> System Status
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-card/95 backdrop-blur-xl border-border rounded-[2.5rem]">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black tracking-tighter">Enterprise Health Monitor</DialogTitle>
                <DialogDescription className="text-muted-foreground font-medium uppercase tracking-widest text-[10px]">Real-time system telemetry and critical alerts</DialogDescription>
              </DialogHeader>
              
              {systemStatus ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  {/* Server Stats */}
                  <div className="p-6 rounded-3xl bg-primary/5 border border-primary/10 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-primary/10 text-primary">
                        <Cpu className="w-5 h-5" />
                      </div>
                      <h4 className="font-bold text-foreground">Cloud Node</h4>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-muted-foreground uppercase tracking-widest">Status</span>
                        <span className="text-emerald-500 uppercase tracking-widest flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          {systemStatus.server.status}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-muted-foreground uppercase tracking-widest">Uptime</span>
                        <span className="text-foreground">{systemStatus.server.uptime}</span>
                      </div>
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-muted-foreground uppercase tracking-widest">Latency</span>
                        <span className="text-foreground">{systemStatus.server.latency}</span>
                      </div>
                    </div>
                  </div>

                  {/* Database Stats */}
                  <div className="p-6 rounded-3xl bg-indigo-500/5 border border-indigo-500/10 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
                        <Database className="w-5 h-5" />
                      </div>
                      <h4 className="font-bold text-foreground">Data Engine</h4>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-muted-foreground uppercase tracking-widest">Prisma</span>
                        <span className="text-emerald-500 uppercase tracking-widest">{systemStatus.database.status}</span>
                      </div>
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-muted-foreground uppercase tracking-widest">Pool</span>
                        <span className="text-foreground">{systemStatus.database.connections}</span>
                      </div>
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-muted-foreground uppercase tracking-widest">Query IO</span>
                        <span className="text-foreground">{systemStatus.database.latency}</span>
                      </div>
                    </div>
                  </div>

                  {/* Critical Alerts */}
                  <div className="md:col-span-2 p-6 rounded-3xl bg-rose-500/5 border border-rose-500/10 space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-rose-500">
                        <Zap className="w-5 h-5" />
                        <h4 className="font-bold text-foreground uppercase tracking-widest text-xs">Priority Interventions</h4>
                      </div>
                      <span className="text-[10px] font-black text-rose-500 bg-rose-500/10 px-3 py-1 rounded-full uppercase tracking-widest">
                        {systemStatus.criticals.expiredCompliance + systemStatus.criticals.unpaidInvoices + systemStatus.criticals.pendingInspections} Issues Detected
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-3 rounded-2xl bg-card border border-border">
                        <p className="text-xl font-black text-rose-500">{systemStatus.criticals.expiredCompliance}</p>
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter">Expired Docs</p>
                      </div>
                      <div className="text-center p-3 rounded-2xl bg-card border border-border">
                        <p className="text-xl font-black text-amber-500">{systemStatus.criticals.unpaidInvoices}</p>
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter">Unpaid Bills</p>
                      </div>
                      <div className="text-center p-3 rounded-2xl bg-card border border-border">
                        <p className="text-xl font-black text-blue-500">{systemStatus.criticals.pendingInspections}</p>
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter">Scheduled Jobs</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center font-black text-muted-foreground animate-pulse tracking-widest uppercase text-xs">Querying Telemetry...</div>
              )}
            </DialogContent>
          </Dialog>

          {/* Quick Action Modal */}
          <Dialog open={isQuickActionOpen} onOpenChange={setIsQuickActionOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-12 px-6 shadow-xl shadow-primary/20">
                <Plus className="w-4 h-4 mr-2" /> Quick Action
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl bg-card/95 backdrop-blur-xl border-border rounded-[2.5rem]">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black tracking-tighter">Strategic Handoff</DialogTitle>
                <DialogDescription className="text-muted-foreground font-medium uppercase tracking-widest text-[10px]">Accelerate your operational workflow</DialogDescription>
              </DialogHeader>
              
              <div className="grid grid-cols-2 gap-4 mt-6">
                {quickActions.map((action) => (
                  <button
                    key={action.name}
                    onClick={() => {
                      setIsQuickActionOpen(false);
                      router.push(action.href);
                    }}
                    className="group p-6 rounded-3xl bg-accent/20 border border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-left flex flex-col gap-4"
                  >
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110", 
                      action.color === 'blue' ? 'bg-blue-500/10 text-blue-500' :
                      action.color === 'indigo' ? 'bg-indigo-500/10 text-indigo-500' :
                      action.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-500' :
                      action.color === 'orange' ? 'bg-orange-500/10 text-orange-500' :
                      action.color === 'rose' ? 'bg-rose-500/10 text-rose-500' :
                      'bg-purple-500/10 text-purple-500'
                    )}>
                      <action.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-black text-foreground tracking-tighter">{action.name}</p>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Launch Module</p>
                    </div>
                  </button>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { 
            title: "Active Projects", 
            value: stats.activeProjects, 
            trend: stats.projectsTrend, 
            icon: Briefcase, 
            color: "blue",
            desc: "Operational delivery units"
          },
          { 
            title: "Compliances Due", 
            value: stats.compliancesDue, 
            trend: stats.complianceTrend, 
            icon: ShieldCheck, 
            color: "emerald",
            desc: "Critical upcoming audits"
          },
          { 
            title: "Revenue (MTD)", 
            value: stats.revenueMTD, 
            trend: stats.revenueTrend, 
            icon: TrendingUp, 
            color: "purple",
            desc: "Gross accepted valuations"
          }
        ].map((stat, i) => (
          <div key={i} className="group p-5 lg:p-8 rounded-[2rem] bg-card/40 border border-border relative overflow-hidden transition-all hover:border-primary/20 hover:translate-y-[-4px] flex flex-col justify-between">
            <div className={cn("absolute top-0 right-0 w-32 h-32 blur-[80px] opacity-20 transition-opacity group-hover:opacity-30", 
              stat.color === 'blue' ? 'bg-blue-500' : stat.color === 'emerald' ? 'bg-emerald-500' : 'bg-purple-500'
            )} />
            
            <div className="relative z-10 space-y-4 lg:space-y-6 flex-1 flex flex-col">
              <div className="flex items-center justify-between gap-2">
                <div className={cn("p-2 lg:p-3 rounded-2xl shrink-0", 
                  stat.color === 'blue' ? 'bg-blue-500/10 text-blue-500' : stat.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-purple-500/10 text-purple-500'
                )}>
                  <stat.icon className="w-5 h-5 lg:w-6 lg:h-6" />
                </div>
                <div className={cn("flex items-center gap-1 text-[10px] lg:text-xs font-black uppercase tracking-tighter", 
                  stat.trend?.startsWith('+') || stat.trend === 'Secure' ? 'text-emerald-500' : 'text-rose-500'
                )}>
                  {stat.trend === 'Secure' ? <ShieldCheck className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                  <span className="truncate">{stat.trend || '0%'}</span>
                </div>
              </div>
              
              <div className="space-y-1 mt-auto">
                <p className="text-3xl lg:text-4xl font-black text-foreground tracking-tighter truncate">{stat.value}</p>
                <p className="text-muted-foreground text-xs lg:text-sm font-bold truncate">{stat.title}</p>
                <p className="text-muted-foreground/60 text-[9px] lg:text-[10px] uppercase font-black tracking-widest line-clamp-1">{stat.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Certificate Expiry Alert Widget */}
      <CertificateExpiryWidget token={token} router={router} />

      {/* Charts & Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-8 p-8 rounded-[2.5rem] bg-card/30 border border-border backdrop-blur-md">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="text-xl font-bold text-foreground">Performance Trajectory</h3>
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-widest mt-1">Consolidated growth analytics</p>
            </div>
            <div className="flex gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Revenue</span>
              </div>
            </div>
          </div>

          <div className="h-[350px] w-full">
            <DashboardChart data={stats.chartData || []} />
          </div>
        </div>

        {/* Activity Feed */}
        <div className="lg:col-span-4 p-8 rounded-[2.5rem] bg-card/30 border border-border backdrop-blur-md flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-500" /> Live Feed
            </h3>
            <button className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">View All</button>
          </div>

          <div className="space-y-6 flex-1 overflow-y-auto pr-2 scrollbar-hide">
            {(stats.recentActivity || []).map((item: any, i: number) => (
              <div 
                key={i} 
                className="flex gap-4 group cursor-pointer hover:bg-accent/5 p-2 rounded-xl transition-all"
                onClick={() => {
                  if (item.type === 'LEAD') router.push('/dashboard/leads');
                  else if (item.type === 'CLIENT') router.push('/dashboard/clients');
                  else if (item.type === 'QUOTE') router.push('/dashboard/quotations');
                }}
              >
                <div className="relative">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border transition-all group-hover:scale-110", 
                    item.type === 'LEAD' ? 'bg-blue-500/10 border-blue-500/20 text-blue-500' : 
                    item.type === 'CLIENT' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500' : 
                    'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                  )}>
                    {item.type === 'LEAD' ? <UserPlus className="w-4 h-4" /> : item.type === 'CLIENT' ? <Users className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                  </div>
                  {i !== stats.recentActivity.length - 1 && (
                    <div className="absolute top-10 left-1/2 -translate-x-1/2 w-px h-6 bg-border/50" />
                  )}
                </div>
                <div className="flex-1 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-black text-foreground truncate max-w-[140px]">{item.title}</p>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tabular-nums">
                      {new Date(item.date).toLocaleDateString([], { day: '2-digit', month: 'short' })}
                    </p>
                  </div>
                  <p className="text-[10px] font-medium text-muted-foreground leading-tight line-clamp-1">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-border">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-blue-500/10 border border-border">
              <p className="text-[10px] font-black text-foreground uppercase tracking-widest mb-1">Audit Ready</p>
              <p className="text-xs text-muted-foreground leading-tight font-medium">All compliance frameworks are currently synchronized and active.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Certificate Expiry Widget Component
function CertificateExpiryWidget({ token, router }: { token: string | null; router: any }) {
  const [dueStats, setDueStats] = useState<{ total: number; active: number; due_soon: number; expired: number } | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE_URL}/documents/due/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data.total === 'number') setDueStats(data);
      })
      .catch(() => {});
  }, [token]);

  if (!dueStats || (dueStats.due_soon === 0 && dueStats.expired === 0)) return null;

  return (
    <div
      className="group p-6 rounded-[2rem] bg-gradient-to-r from-amber-500/5 via-card/40 to-rose-500/5 border border-amber-500/20 hover:border-amber-500/40 transition-all cursor-pointer relative overflow-hidden"
      onClick={() => router.push('/dashboard/documents/due')}
    >
      <div className="absolute top-0 right-0 w-40 h-40 blur-[100px] opacity-20 bg-amber-500" />
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500">
            <CalendarClock className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black text-foreground tracking-tight">Certificate Expiry Monitor</h3>
            <p className="text-xs text-muted-foreground font-medium">
              {dueStats.due_soon > 0 && <span className="text-amber-500 font-bold">{dueStats.due_soon} due soon</span>}
              {dueStats.due_soon > 0 && dueStats.expired > 0 && <span> · </span>}
              {dueStats.expired > 0 && <span className="text-rose-500 font-bold">{dueStats.expired} expired</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-2xl font-black text-emerald-500 tracking-tighter">{dueStats.active}</p>
              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Active</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-amber-500 tracking-tighter">{dueStats.due_soon}</p>
              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Due Soon</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-rose-500 tracking-tighter">{dueStats.expired}</p>
              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Expired</p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="h-10 px-4 text-xs font-bold text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 rounded-xl"
          >
            View All <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
