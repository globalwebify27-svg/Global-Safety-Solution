"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth";
import { API_BASE_URL } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  FolderKanban, 
  ListTodo, 
  Calendar, 
  User as UserIcon, 
  Clock, 
  ArrowRight,
  Search,
  Filter,
  CheckCircle2,
  Circle,
  AlertCircle,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  Briefcase,
  Trash2,
  ShieldCheck,
  FileCheck,
  Truck,
  Lock,
  FileSpreadsheet,
  FolderOpen,
  ExternalLink,
  History,
  Activity,
  DollarSign,
  FileText
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";

const PIPELINE_STAGES = [
  { key: "PROJECT_CREATED", label: "1. Initialized", icon: FolderKanban, color: "text-blue-500", bg: "bg-blue-500/10" },
  { key: "ENGINEER_ASSIGNED", label: "2. Engineer Assigned", icon: UserIcon, color: "text-indigo-500", bg: "bg-indigo-500/10" },
  { key: "INSPECTION_SCHEDULED", label: "3. Visit Scheduled", icon: Calendar, color: "text-purple-500", bg: "bg-purple-500/10" },
  { key: "INSPECTION_COMPLETED", label: "4. Visit Completed", icon: CheckCircle2, color: "text-amber-500", bg: "bg-amber-500/10" },
  { key: "COMPLIANCE_REVIEW", label: "5. Compliance Review", icon: ShieldCheck, color: "text-cyan-500", bg: "bg-cyan-500/10" },
  { key: "CERTIFICATE_GENERATED", label: "6. Cert Generated", icon: FileCheck, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { key: "DOCUMENTS_DELIVERED", label: "7. Delivered", icon: Truck, color: "text-teal-500", bg: "bg-teal-500/10" },
  { key: "PROJECT_CLOSED", label: "8. Closed", icon: Lock, color: "text-gray-500", bg: "bg-gray-500/10" },
];

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  assignee?: { name: string };
  due_date?: string;
}

interface ProjectActivity {
  id: string;
  action: string;
  performed_by?: string;
  performed_at: string;
  remarks?: string;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  stage?: string;
  contract_value?: number;
  created_at: string;
  client?: { id: string; name: string };
  quotation?: { id: string; quote_number: string; total_amount: number; status: string };
  tasks?: Task[];
  activities?: ProjectActivity[];
  inspections?: any[];
  documents?: any[];
}

export default function OperationsPage() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);

  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [openProjectDialog, setOpenProjectDialog] = useState(false);
  const [openConvertDialog, setOpenConvertDialog] = useState(false);
  const [openTaskDialog, setOpenTaskDialog] = useState(false);
  const [openOverviewDialog, setOpenOverviewDialog] = useState(false);
  const [selectedDashboard, setSelectedDashboard] = useState<any>(null);
  
  const [submitting, setSubmitting] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string>("");
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");

  const [projectForm, setProjectForm] = useState({
    client_id: "",
    name: "",
    description: "",
    contract_value: "",
    status: "ONGOING"
  });

  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    assigned_to: "",
    priority: "MEDIUM",
    due_date: "",
    status: "TODO"
  });

  useEffect(() => {
    fetchData();
  }, [token]);

  useEffect(() => {
    if (typeof window === 'undefined' || projects.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const searchParam = params.get('search') || params.get('client_name');
    const expandParam = params.get('expand') || params.get('project_id');
    if (searchParam) {
      setSearchQuery(searchParam);
      const matching = projects.find((p: any) => 
        p.name?.toLowerCase().includes(searchParam.toLowerCase()) || 
        p.client?.name?.toLowerCase().includes(searchParam.toLowerCase())
      );
      if (matching) {
        setExpandedProjects(prev => ({ ...prev, [matching.id]: true }));
      }
    }
    if (expandParam) {
      setExpandedProjects(prev => ({ ...prev, [expandParam]: true }));
    }
  }, [projects]);

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [projRes, clientRes, userRes, quoteRes] = await Promise.all([
        fetch(`${API_BASE_URL}/projects`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/clients`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/users`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/quotations`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      const projData = await projRes.json();
      const clientData = await clientRes.json();
      const userData = await userRes.json();
      const quoteData = await quoteRes.json();

      if (Array.isArray(projData)) {
        setProjects(projData);
        // Auto-expand and filter if query params are present in URL
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          const searchParam = params.get('search') || params.get('client_name');
          const expandParam = params.get('expand') || params.get('project_id');
          if (searchParam) {
            setSearchQuery(searchParam);
          }
          if (expandParam) {
            setExpandedProjects(prev => ({ ...prev, [expandParam]: true }));
          } else if (searchParam) {
            // Auto expand matching project
            const matching = projData.find((p: any) => 
              p.name?.toLowerCase().includes(searchParam.toLowerCase()) || 
              p.client?.name?.toLowerCase().includes(searchParam.toLowerCase())
            );
            if (matching) {
              setExpandedProjects(prev => ({ ...prev, [matching.id]: true }));
            }
          }
        }
      }
      if (Array.isArray(clientData)) setClients(clientData);
      if (Array.isArray(userData)) setUsers(userData);
      if (Array.isArray(quoteData)) setQuotations(quoteData);
    } catch (e) {
      console.error("Operations fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);

    try {
      const res = await fetch(`${API_BASE_URL}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(projectForm)
      });

      if (res.ok) {
        toast.success("Project launched successfully!");
        setOpenProjectDialog(false);
        setProjectForm({ client_id: "", name: "", description: "", contract_value: "", status: "ONGOING" });
        fetchData();
      } else {
        toast.error("Failed to create project.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error creating project.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConvertQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedQuoteId) {
      toast.error("Please select an approved quotation.");
      return;
    }
    setSubmitting(true);

    try {
      const res = await fetch(`${API_BASE_URL}/quotations/${selectedQuoteId}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        toast.success("Quotation successfully converted to Operations Project & Invoice!");
        setOpenConvertDialog(false);
        setSelectedQuoteId("");
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.message || "Failed to convert quotation.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error converting quotation.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedProject) return;
    setSubmitting(true);

    try {
      const res = await fetch(`${API_BASE_URL}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...taskForm,
          project_id: selectedProject,
          due_date: taskForm.due_date ? new Date(taskForm.due_date).toISOString() : null
        })
      });

      if (res.ok) {
        toast.success("Task assigned successfully!");
        setOpenTaskDialog(false);
        setTaskForm({ title: "", description: "", assigned_to: "", priority: "MEDIUM", due_date: "", status: "TODO" });
        fetchData();
      }
    } catch (err) {
      console.error(err);
      toast.error("Error creating task.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStage = async (projId: string, stageKey: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/projects/${projId}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ stage: stageKey })
      });
      if (res.ok) {
        toast.success(`Project stage updated to ${stageKey.replace(/_/g, ' ')}`);
        fetchData();
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to update project stage.");
    }
  };

  const handleToggleTaskStatus = async (taskId: string, currentStatus: string) => {
    if (!token) return;
    const nextStatus = currentStatus === 'DONE' ? 'TODO' : 'DONE';
    try {
      const res = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        toast.success(`Task marked as ${nextStatus === 'DONE' ? 'completed' : 'pending'}!`);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openDashboardOverview = async (projId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/projects/${projId}/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedDashboard(data);
        setOpenOverviewDialog(true);
      }
    } catch (e) {
      console.error("Dashboard fetch error:", e);
    }
  };

  const toggleProject = (id: string) => {
    setExpandedProjects(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredProjects = projects.filter(p => {
    const q = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || (p.client?.name || "").toLowerCase().includes(q);
  });

  const getStageIndex = (stage?: string) => {
    if (!stage) return 0;
    const idx = PIPELINE_STAGES.findIndex(s => s.key === stage);
    return idx >= 0 ? idx : 0;
  };



  return (
    <div className="space-y-8 pb-10">
      {/* Header section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-2 border-b border-border/50">
        <div className="space-y-1.5 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
            <Activity className="w-3.5 h-3.5" />
            <span className="text-[10px] font-black uppercase tracking-widest">Central ERP Workflow Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 leading-tight">
            Operations Center
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground font-medium leading-relaxed">
            Manage end-to-end project lifecycles, engineer assignments, and site inspection workflows.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">

          {/* New Project Manual Button */}
          <Dialog open={openProjectDialog} onOpenChange={setOpenProjectDialog}>
            <DialogTrigger render={<Button className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-xl shadow-indigo-500/20 px-6 h-11 transition-all active:scale-95 border-0 rounded-xl" />}>
              <Plus className="w-5 h-5 mr-2" /> New Project
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px] bg-card border-border text-foreground shadow-2xl rounded-[2rem]">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                  <FolderKanban className="w-6 h-6" /> Initialize Project
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Create a structured workflow for a client engagement.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleCreateProject} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Client / Organization *</Label>
                  <select 
                    required
                    value={projectForm.client_id}
                    onChange={(e) => setProjectForm({...projectForm, client_id: e.target.value})}
                    className="w-full h-11 px-4 bg-background border border-border rounded-xl text-foreground focus:ring-2 focus:ring-indigo-500 focus:outline-none appearance-none font-medium text-sm"
                  >
                    <option value="">Select Organization</option>
                    {clients.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Project Name *</Label>
                  <Input 
                    required
                    placeholder="e.g. Annual Fire Safety Audit 2026"
                    value={projectForm.name}
                    onChange={(e) => setProjectForm({...projectForm, name: e.target.value})}
                    className="h-11 bg-background border-border text-foreground font-medium rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Contract Value (₹)</Label>
                  <Input 
                    type="number"
                    placeholder="e.g. 150000"
                    value={projectForm.contract_value}
                    onChange={(e) => setProjectForm({...projectForm, contract_value: e.target.value})}
                    className="h-11 bg-background border-border text-foreground font-medium rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Detailed Scope / Description</Label>
                  <textarea 
                    placeholder="Outline the project goals and requirements..."
                    value={projectForm.description}
                    onChange={(e) => setProjectForm({...projectForm, description: e.target.value})}
                    className="w-full p-4 bg-background border border-border rounded-xl text-foreground focus:ring-2 focus:ring-indigo-500 focus:outline-none min-h-[90px] resize-none font-medium text-sm"
                  />
                </div>

                <DialogFooter className="pt-2">
                  <Button variant="ghost" type="button" onClick={() => setOpenProjectDialog(false)}>Cancel</Button>
                  <Button type="submit" disabled={submitting} className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 font-bold rounded-xl border-0">
                    {submitting ? 'Creating...' : 'Launch Project'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Statistics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Active Projects", value: projects.length, icon: FolderKanban, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10" },
          { label: "Pending Tasks", value: projects.reduce((acc: number, p) => acc + (p.tasks?.filter(t => t.status !== 'DONE').length || 0), 0), icon: ListTodo, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10" },
          { label: "Active Field Staff", value: users.length, icon: UserIcon, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/10" },
          { label: "Completed Projects", value: projects.filter(p => p.stage === 'PROJECT_CLOSED' || p.status === 'COMPLETED').length, icon: ShieldCheck, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" }
        ].map((stat, i) => (
          <div key={i} className="bg-card/40 border border-border rounded-2xl p-4 lg:p-5 flex items-center justify-between group hover:border-primary/20 transition-all shadow-sm backdrop-blur-md gap-2">
            <div className="space-y-1 min-w-0 flex-1">
              <p className="text-[10px] lg:text-xs font-bold text-muted-foreground uppercase tracking-widest truncate">{stat.label}</p>
              <p className="text-2xl lg:text-3xl font-black text-foreground group-hover:text-primary transition-colors truncate">{stat.value}</p>
            </div>
            <div className={`shrink-0 w-10 h-10 lg:w-12 lg:h-12 rounded-xl ${stat.bg} flex items-center justify-center ${stat.color} group-hover:scale-110 transition-transform shadow-lg shadow-black/5`}>
              <stat.icon className="w-5 h-5 lg:w-6 lg:h-6" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Projects Section */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
          <h3 className="text-xl font-bold flex items-center gap-2 text-foreground">
            <FolderKanban className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Enterprise Operations Pipeline
          </h3>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-muted/50 border border-border rounded-xl py-2 pl-9 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50 w-full md:w-72 transition-all text-foreground" 
              placeholder="Search projects by name or organization..." 
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center text-muted-foreground bg-accent/5 border border-dashed border-border rounded-3xl">
              <Clock className="w-10 h-10 animate-spin mb-4 opacity-20" />
              <p className="font-medium animate-pulse uppercase tracking-widest text-[10px]">Synchronizing Operations Pipeline...</p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-muted-foreground bg-accent/5 border border-dashed border-border rounded-3xl space-y-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center border border-border">
                <FolderKanban className="w-8 h-8 opacity-20" />
              </div>
              <p className="font-medium">No operational projects found. Convert an approved quotation or create a new project.</p>
            </div>
          ) : (
            filteredProjects.map((proj) => {
              const currentStageIdx = getStageIndex(proj.stage);

              return (
                <div key={proj.id} className="bg-card/40 border border-border rounded-3xl overflow-hidden hover:border-indigo-500/30 transition-all group backdrop-blur-md shadow-sm">
                  <div className="p-6 space-y-6">
                    {/* Top Row: Info & Main Actions */}
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                      <div className="space-y-3 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-tighter bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500/20">
                            {PIPELINE_STAGES[currentStageIdx]?.label || proj.stage || "PROJECT_CREATED"}
                          </span>
                          {proj.quotation && (
                            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-tighter bg-purple-500/10 text-purple-600 dark:text-purple-400 ring-1 ring-purple-500/20">
                              Quote: {proj.quotation.quote_number}
                            </span>
                          )}
                          <span className="text-muted-foreground text-[10px] font-mono tracking-widest uppercase">PRJ-{proj.id.split('-')[0]}</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <h4 className="text-2xl font-black text-foreground group-hover:text-indigo-500 transition-colors">{proj.client?.name || proj.name}</h4>
                          <button onClick={() => toggleProject(proj.id)} className="p-2 hover:bg-accent/10 rounded-xl text-muted-foreground transition-colors border border-transparent hover:border-border">
                            {expandedProjects[proj.id] ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </button>
                        </div>

                        <p className="text-muted-foreground text-sm max-w-2xl leading-relaxed font-medium">{proj.description || `Operations project for ${proj.client?.name || 'Client'}.`}</p>
                        
                        {/* Meta Tags */}
                        <div className="flex flex-wrap items-center gap-6 pt-1">
                          <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold uppercase tracking-wider">
                            <Briefcase className="w-4 h-4 text-blue-500" /> {proj.client?.name || 'Internal Hub'}
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold uppercase tracking-wider">
                            <DollarSign className="w-4 h-4 text-emerald-500" /> Contract: ₹{Number(proj.contract_value || proj.quotation?.total_amount || 0).toLocaleString()}
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold uppercase tracking-wider">
                            <ListTodo className="w-4 h-4 text-amber-500" /> {proj.tasks?.length || 0} Tasks Assigned
                          </div>
                        </div>
                      </div>

                      {/* Quick Action Button Group */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Open Vault Link (pre-filtered for client & project) */}
                        <Button
                          variant="outline"
                          onClick={() => router.push(`/dashboard/documents?client_name=${encodeURIComponent(proj.client?.name || '')}&client_id=${proj.client_id || proj.client?.id || ''}&project_id=${proj.id}`)}
                          className="bg-accent/10 hover:bg-accent/20 text-foreground border-border font-bold h-10 px-4 text-xs rounded-xl transition-all"
                        >
                          <FolderOpen className="w-4 h-4 mr-2 text-blue-500" /> Vault Folder
                        </Button>



                        {/* Stage Dropdown Override */}
                        <DropdownMenu>
                          <DropdownMenuTrigger render={<Button variant="ghost" className="h-10 w-10 p-0 rounded-xl border border-border" />}>
                            <MoreVertical className="w-4 h-4 text-muted-foreground" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-card border border-border text-foreground min-w-[200px] shadow-2xl rounded-2xl p-2 z-[9999]">
                            <div className="text-[10px] font-black uppercase text-muted-foreground px-3 py-1">Set Pipeline Stage</div>
                            {PIPELINE_STAGES.map((s) => (
                              <DropdownMenuItem
                                key={s.key}
                                onClick={() => handleUpdateStage(proj.id, s.key)}
                                className={cn(
                                  "cursor-pointer flex items-center gap-2 py-2 px-3 rounded-xl text-xs font-bold",
                                  proj.stage === s.key ? "bg-indigo-500/10 text-indigo-500" : "hover:bg-accent/10"
                                )}
                              >
                                <s.icon className={`w-3.5 h-3.5 ${s.color}`} /> {s.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>


                  </div>

                  {/* Expanded Tasks & Details View */}
                  {expandedProjects[proj.id] && (
                    <div className="px-6 pb-6 pt-4 border-t border-border bg-muted/20 animate-in slide-in-from-top-2 duration-300">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Assigned Operational Tasks</h5>
                          <Button 
                            size="sm" 
                            onClick={() => { setSelectedProject(proj.id); setOpenTaskDialog(true); }}
                            className="bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-500 font-bold border border-indigo-500/30 rounded-xl text-xs h-8"
                          >
                            <Plus className="w-3.5 h-3.5 mr-1" /> Add Task
                          </Button>
                        </div>
                        
                        {(proj.tasks?.length || 0) === 0 ? (
                          <div className="py-6 text-center text-muted-foreground text-xs italic font-medium">
                            No tasks registered for this project. Click "+ Add Task" to assign field work.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-2">
                            {proj.tasks?.map((task: any) => (
                              <div key={task.id} className="flex items-center justify-between p-3.5 bg-background border border-border rounded-2xl hover:border-primary/20 transition-all shadow-sm">
                                <div className="flex items-center gap-3">
                                  <div className={cn("w-1.5 h-9 rounded-full shadow-sm", 
                                    task.priority === 'CRITICAL' ? 'bg-rose-500' : 
                                    task.priority === 'HIGH' ? 'bg-orange-500' : 
                                    task.priority === 'MEDIUM' ? 'bg-blue-500' : 'bg-muted-foreground'
                                  )} />
                                  <div>
                                    <p className="text-sm font-bold text-foreground">{task.title}</p>
                                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-bold uppercase">
                                      <span className="flex items-center gap-1"><UserIcon className="w-3 h-3 text-indigo-500" /> {task.assignee?.name || 'Unassigned'}</span>
                                      <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-indigo-500" /> {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No Deadline'}</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3">
                                  <span className={cn("px-2 py-0.5 rounded text-[10px] font-black uppercase ring-1 shadow-sm", 
                                    task.status === 'DONE' ? 'bg-emerald-500/10 text-emerald-500 ring-emerald-500/20' : 'bg-muted text-muted-foreground ring-border'
                                  )}>
                                    {task.status}
                                  </span>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => handleToggleTaskStatus(task.id, task.status)}
                                    className="h-8 w-8 rounded-xl"
                                  >
                                    <CheckCircle2 className={cn("w-4 h-4", task.status === 'DONE' ? "text-emerald-500" : "text-muted-foreground")} />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Task Creation Modal */}
      <Dialog open={openTaskDialog} onOpenChange={setOpenTaskDialog}>
        <DialogContent className="sm:max-w-[550px] bg-card border-border text-foreground shadow-2xl rounded-[2rem]">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-orange-600" />
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-amber-600 dark:text-amber-400">New Task Assignment</DialogTitle>
            <DialogDescription className="text-muted-foreground">Assign a specific operation to a field engineer.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTask} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Task Title *</Label>
              <Input required value={taskForm.title} onChange={(e) => setTaskForm({...taskForm, title: e.target.value})} className="bg-background border-border text-foreground rounded-xl" placeholder="e.g. On-site sensor calibration" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Assignee *</Label>
                <select required value={taskForm.assigned_to} onChange={(e) => setTaskForm({...taskForm, assigned_to: e.target.value})} className="w-full h-10 px-3 bg-background border border-border rounded-xl text-foreground text-sm font-medium">
                  <option value="">Select Engineer</option>
                  {users.map((u: any) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.employee_id || 'Staff'})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <select value={taskForm.priority} onChange={(e) => setTaskForm({...taskForm, priority: e.target.value})} className="w-full h-10 px-3 bg-background border border-border rounded-xl text-foreground text-sm font-medium">
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input type="date" value={taskForm.due_date} onChange={(e) => setTaskForm({...taskForm, due_date: e.target.value})} className="bg-background border-border text-foreground rounded-xl" />
            </div>
            <DialogFooter className="pt-2">
              <Button type="submit" disabled={submitting} className="bg-amber-600 hover:bg-amber-500 text-white w-full font-bold border-0 rounded-xl">
                {submitting ? 'Assigning...' : 'Confirm Assignment'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Project Overview & Activity History Modal */}
      <Dialog open={openOverviewDialog} onOpenChange={setOpenOverviewDialog}>
        <DialogContent className="sm:max-w-[700px] bg-card border-border text-foreground shadow-2xl rounded-[2.5rem] max-h-[85vh] overflow-y-auto p-6 relative">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500" />
          {selectedDashboard && (
            <div className="space-y-6">
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                    {selectedDashboard.project.stage || "PROJECT_CREATED"}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground">PRJ-{selectedDashboard.project.id.split('-')[0]}</span>
                </div>
                <DialogTitle className="text-2xl font-black text-foreground pt-1">
                  {selectedDashboard.project.name}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground font-medium">
                  {selectedDashboard.project.client?.name || "Client"} • Contract: ₹{Number(selectedDashboard.financialSummary.contractValue).toLocaleString()}
                </DialogDescription>
              </DialogHeader>

              {/* Progress Summary Cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-muted/40 border border-border rounded-2xl text-center space-y-1">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Progress</p>
                  <p className="text-2xl font-black text-indigo-500">{selectedDashboard.progressPercent}%</p>
                </div>
                <div className="p-4 bg-muted/40 border border-border rounded-2xl text-center space-y-1">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Tasks</p>
                  <p className="text-2xl font-black text-amber-500">{selectedDashboard.taskSummary.completed}/{selectedDashboard.taskSummary.total}</p>
                </div>
                <div className="p-4 bg-muted/40 border border-border rounded-2xl text-center space-y-1">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Certificates</p>
                  <p className="text-2xl font-black text-emerald-500">{selectedDashboard.documentSummary.certificates}</p>
                </div>
              </div>

              {/* Activity Timeline Audit Log */}
              <div className="space-y-3 pt-2">
                <h4 className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <History className="w-4 h-4 text-indigo-500" /> Project Timeline & Activity History
                </h4>
                
                {(!selectedDashboard.recentActivities || selectedDashboard.recentActivities.length === 0) ? (
                  <p className="text-xs text-muted-foreground italic py-4">No logged activity recorded for this project yet.</p>
                ) : (
                  <div className="space-y-3 pl-4 border-l-2 border-indigo-500/30">
                    {selectedDashboard.recentActivities.map((act: any) => (
                      <div key={act.id} className="relative space-y-0.5">
                        <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-500 border-2 border-background" />
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-foreground">{act.action}</span>
                          <span className="text-[10px] text-muted-foreground">{new Date(act.performed_at).toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{act.remarks}</p>
                        <p className="text-[10px] font-mono text-indigo-400">By: {act.performed_by || 'System'}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <DialogFooter className="pt-4 border-t border-border">
                <Button 
                  onClick={() => router.push(`/dashboard/documents?project_id=${selectedDashboard.project.id}`)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl w-full"
                >
                  <FolderOpen className="w-4 h-4 mr-2" /> Open Project Digital Vault
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}


