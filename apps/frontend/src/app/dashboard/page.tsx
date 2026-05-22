"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth";
import { API_BASE_URL } from "@/lib/config";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
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
  ClipboardCheck
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
  const [stats, setStats] = useState({
    activeProjects: 0,
    compliancesDue: 0,
    revenueMTD: "₹0",
    projectsTrend: "+0%",
    complianceTrend: "Secure",
    revenueTrend: "+0%",
    recentActivity: [] as ActivityItem[],
    chartData: [] as any[]
  });
  const [systemStatus, setSystemStatus] = useState<SystemStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);
  const { token, logout } = useAuthStore();
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
      if(data && data.activeProjects !== undefined) setStats(data);
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

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      <p className="text-muted-foreground font-bold animate-pulse tracking-widest uppercase text-xs">Synchronizing Intelligence...</p>
    </div>
  );

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
        <div className="flex items-center gap-3">
          {/* System Status Modal */}
          <Dialog open={isStatusOpen} onOpenChange={setIsStatusOpen}>
            <DialogTrigger render={<Button variant="outline" className="bg-card border-border hover:bg-accent text-foreground font-bold h-12 px-6" />}>
              <Activity className="w-4 h-4 mr-2 text-primary" /> System Status
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
            <DialogTrigger render={<Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-12 px-6 shadow-xl shadow-primary/20" />}>
              <Plus className="w-4 h-4 mr-2" /> Quick Action
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
          <div key={i} className="group p-8 rounded-[2rem] bg-card/40 border border-border relative overflow-hidden transition-all hover:border-primary/20 hover:translate-y-[-4px]">
            <div className={cn("absolute top-0 right-0 w-32 h-32 blur-[80px] opacity-20 transition-opacity group-hover:opacity-30", 
              stat.color === 'blue' ? 'bg-blue-500' : stat.color === 'emerald' ? 'bg-emerald-500' : 'bg-purple-500'
            )} />
            
            <div className="relative z-10 space-y-6">
              <div className="flex items-center justify-between">
                <div className={cn("p-3 rounded-2xl", 
                  stat.color === 'blue' ? 'bg-blue-500/10 text-blue-500' : stat.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-purple-500/10 text-purple-500'
                )}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div className={cn("flex items-center gap-1 text-xs font-black uppercase tracking-tighter", 
                  stat.trend.startsWith('+') || stat.trend === 'Secure' ? 'text-emerald-500' : 'text-rose-500'
                )}>
                  {stat.trend === 'Secure' ? <ShieldCheck className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                  {stat.trend}
                </div>
              </div>
              
              <div className="space-y-1">
                <p className="text-4xl font-black text-foreground tracking-tighter">{stat.value}</p>
                <p className="text-muted-foreground text-sm font-bold">{stat.title}</p>
                <p className="text-muted-foreground/60 text-[10px] uppercase font-black tracking-widest">{stat.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

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
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.chartData || []}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border/50" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 10, fontWeight: 700 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 10, fontWeight: 700 }}
                  dx={-10}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--card)', 
                    border: '1px solid var(--border)', 
                    borderRadius: '16px',
                    color: 'var(--foreground)'
                  }}
                  itemStyle={{ color: 'var(--primary)', fontSize: '12px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="var(--primary)" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorRev)" 
                />
              </AreaChart>
            </ResponsiveContainer>
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
            {(stats.recentActivity || []).map((item, i) => (
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
