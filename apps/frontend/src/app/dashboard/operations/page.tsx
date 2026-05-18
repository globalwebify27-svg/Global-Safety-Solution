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
  Trash2
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  assignee?: { name: string };
}

interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  client?: { name: string };
  tasks?: Task[];
}

interface Client {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
}

export default function OperationsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [openProjectDialog, setOpenProjectDialog] = useState(false);
  const [openTaskDialog, setOpenTaskDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
  
  const token = useAuthStore((state) => state.token);

  const [projectForm, setProjectForm] = useState({
    client_id: "",
    name: "",
    description: "",
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

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [projRes, clientRes, userRes] = await Promise.all([
        fetch(`${API_BASE_URL}/projects`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/clients`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/users`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      const projData = await projRes.json();
      const clientData = await clientRes.json();
      const userData = await userRes.json();

      if (Array.isArray(projData)) setProjects(projData);
      if (Array.isArray(clientData)) setClients(clientData);
      if (Array.isArray(userData)) setUsers(userData);
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
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(projectForm)
      });

      if (res.ok) {
        setOpenProjectDialog(false);
        setProjectForm({ client_id: "", name: "", description: "", status: "ONGOING" });
        fetchData();
      }
    } catch (err) {
      console.error(err);
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
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...taskForm,
          project_id: selectedProject,
          due_date: taskForm.due_date ? new Date(taskForm.due_date).toISOString() : null
        })
      });

      if (res.ok) {
        setOpenTaskDialog(false);
        setTaskForm({ title: "", description: "", assigned_to: "", priority: "MEDIUM", due_date: "", status: "TODO" });
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleProject = (id: string) => {
    setExpandedProjects(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCompleteProject = async (projId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/projects/${projId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: 'COMPLETED' })
      });
      if (res.ok) {
        toast.success("Project marked as completed!");
        fetchData();
      } else {
        toast.error("Failed to update project status.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error updating project.");
    }
  };

  const handleDeleteProject = async (projId: string) => {
    if (!token) return;
    if (!confirm("Are you sure you want to delete this project and all its tasks?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/projects/${projId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success("Project deleted successfully.");
        fetchData();
      } else {
        toast.error("Failed to delete project.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error deleting project.");
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
      } else {
        toast.error("Failed to update task status.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error updating task.");
    }
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600">
            Operations Center
          </h1>
          <p className="text-muted-foreground font-medium">Manage project lifecycles and engineer task assignments.</p>
        </div>

        <div className="flex items-center gap-3">
          <Dialog open={openProjectDialog} onOpenChange={setOpenProjectDialog}>
            <DialogTrigger className="inline-flex items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 px-6 h-10 font-bold transition-all hover:scale-105 active:scale-95 border-0">
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

              <form onSubmit={handleCreateProject} className="space-y-5 mt-4">
                <div className="space-y-2">
                  <Label className="text-foreground">Client / Organization *</Label>
                  <select 
                    required
                    value={projectForm.client_id}
                    onChange={(e) => setProjectForm({...projectForm, client_id: e.target.value})}
                    className="w-full h-11 px-4 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-indigo-500 focus:outline-none appearance-none font-medium"
                  >
                    <option value="">Select Organization</option>
                    {clients.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground">Project Name *</Label>
                  <Input 
                    required
                    placeholder="e.g. Annual Fire Safety Audit 2026"
                    value={projectForm.name}
                    onChange={(e) => setProjectForm({...projectForm, name: e.target.value})}
                    className="h-11 bg-background border-border text-foreground focus:ring-indigo-500 font-medium"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground">Detailed Scope / Description</Label>
                  <textarea 
                    placeholder="Outline the project goals and requirements..."
                    value={projectForm.description}
                    onChange={(e) => setProjectForm({...projectForm, description: e.target.value})}
                    className="w-full p-4 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-indigo-500 focus:outline-none min-h-[100px] resize-none font-medium"
                  />
                </div>

                <DialogFooter className="pt-4">
                  <Button variant="ghost" type="button" onClick={() => setOpenProjectDialog(false)} className="text-muted-foreground hover:text-foreground border-0">
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={submitting} 
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-10 font-bold shadow-xl shadow-indigo-500/10 border-0"
                  >
                    {submitting ? 'Creating...' : 'Launch Project'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Statistics / Quick Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: "Active Projects", value: projects.length, icon: FolderKanban, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10" },
          { label: "Pending Tasks", value: projects.reduce((acc: number, p) => acc + (p.tasks?.filter(t => t.status !== 'DONE').length || 0), 0), icon: ListTodo, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10" },
          { label: "Active Staff", value: users.length, icon: UserIcon, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/10" },
          { label: "System Health", value: "99%", icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" }
        ].map((stat, i) => (
          <div key={i} className="bg-card/40 border border-border rounded-2xl p-5 flex items-center justify-between group hover:border-primary/20 transition-all shadow-sm backdrop-blur-md">
            <div className="space-y-1">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</p>
              <p className="text-3xl font-black text-foreground group-hover:text-primary transition-colors">{stat.value}</p>
            </div>
            <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center ${stat.color} group-hover:scale-110 transition-transform shadow-lg shadow-black/5`}>
              <stat.icon className="w-6 h-6" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 gap-8">
        {/* Projects List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xl font-bold flex items-center gap-2 text-foreground">
              <FolderKanban className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Enterprise Project Registry
            </h3>
            <div className="flex items-center gap-2">
              <div className="relative hidden md:block">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                <input className="bg-muted/50 border border-border rounded-full py-2 pl-9 pr-4 text-xs focus:outline-none focus:border-indigo-500/50 w-64 transition-all text-foreground" placeholder="Filter projects by name or client..." />
              </div>
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-full bg-accent/10 border-0">
                <Filter className="w-4 h-4 text-muted-foreground" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {loading ? (
              <div className="h-64 flex flex-col items-center justify-center text-muted-foreground bg-accent/5 border border-dashed border-border rounded-3xl">
                <Clock className="w-10 h-10 animate-spin mb-4 opacity-20" />
                <p className="font-medium animate-pulse uppercase tracking-widest text-[10px]">Synchronizing Project Hub...</p>
              </div>
            ) : projects.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-muted-foreground bg-accent/5 border border-dashed border-border rounded-3xl space-y-4">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center border border-border">
                  <FolderKanban className="w-8 h-8 opacity-20" />
                </div>
                <p className="font-medium">No operational projects found. Initialize a new engagement to begin.</p>
              </div>
            ) : (
              projects.map((proj: any) => (
                <div key={proj.id} className="bg-card/40 border border-border rounded-3xl overflow-hidden hover:border-primary/20 transition-all group backdrop-blur-md shadow-sm">
                  <div className="p-6">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center gap-3">
                          <span className={cn("px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-tighter ring-1 shadow-sm", 
                            proj.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20' : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 ring-indigo-500/20'
                          )}>
                            {proj.status}
                          </span>
                          <span className="text-muted-foreground text-[10px] font-mono tracking-widest uppercase">PRJ-{proj.id.split('-')[0]}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <h4 className="text-2xl font-black text-foreground group-hover:text-primary transition-colors">{proj.name}</h4>
                          <button onClick={() => toggleProject(proj.id)} className="p-2 hover:bg-accent/10 rounded-xl text-muted-foreground transition-colors border border-transparent hover:border-border">
                            {expandedProjects[proj.id] ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </button>
                        </div>
                        <p className="text-muted-foreground text-sm max-w-2xl leading-relaxed font-medium">{proj.description || 'Enterprise-grade safety project with undefined scope.'}</p>
                        
                        <div className="flex flex-wrap items-center gap-6 pt-2">
                          <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold uppercase tracking-wider">
                            <Briefcase className="w-4 h-4 text-blue-600 dark:text-blue-400" /> {proj.client?.name || 'Internal Hub'}
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold uppercase tracking-wider">
                            <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" /> Start: {new Date(proj.created_at).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold uppercase tracking-wider">
                            <ListTodo className="w-4 h-4 text-amber-600 dark:text-amber-400" /> {proj.tasks?.length || 0} Tasks Assigned
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <Dialog open={openTaskDialog && selectedProject === proj.id} onOpenChange={(val) => {
                          setOpenTaskDialog(val);
                          if (val) setSelectedProject(proj.id);
                        }}>
                          <DialogTrigger className="inline-flex items-center justify-center rounded-xl bg-accent/10 hover:bg-accent/20 text-foreground border border-border font-bold shadow-sm h-10 px-5 text-sm transition-all active:scale-95">
                            <Plus className="w-4 h-4 mr-2 text-primary" /> Add Task
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[550px] bg-card border-border text-foreground shadow-2xl rounded-[2rem]">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-orange-600" />
                            <DialogHeader>
                              <DialogTitle className="text-xl font-bold text-amber-600 dark:text-amber-400">New Task Assignment</DialogTitle>
                              <DialogDescription className="text-muted-foreground">Assign a specific operation to an engineer.</DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleCreateTask} className="space-y-4 mt-4">
                              <div className="space-y-2">
                                <Label>Task Title *</Label>
                                <Input required value={taskForm.title} onChange={(e) => setTaskForm({...taskForm, title: e.target.value})} className="bg-background border-border text-foreground" placeholder="e.g. On-site sensor calibration" />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label>Assignee *</Label>
                                  <select required value={taskForm.assigned_to} onChange={(e) => setTaskForm({...taskForm, assigned_to: e.target.value})} className="w-full h-10 px-3 bg-background border border-border rounded-md text-foreground text-sm font-medium">
                                    <option value="">Select Engineer</option>
                                    {users.map((u: any) => (
                                      <option key={u.id} value={u.id}>{u.name}</option>
                                    ))}
                                  </select>
                                </div>
                                <div className="space-y-2">
                                  <Label>Priority</Label>
                                  <select value={taskForm.priority} onChange={(e) => setTaskForm({...taskForm, priority: e.target.value})} className="w-full h-10 px-3 bg-background border border-border rounded-md text-foreground text-sm font-medium">
                                    <option value="LOW">LOW</option>
                                    <option value="MEDIUM">MEDIUM</option>
                                    <option value="HIGH">HIGH</option>
                                    <option value="CRITICAL">CRITICAL</option>
                                  </select>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label>Due Date</Label>
                                <Input type="date" value={taskForm.due_date} onChange={(e) => setTaskForm({...taskForm, due_date: e.target.value})} className="bg-background border-border text-foreground" />
                              </div>
                              <DialogFooter className="pt-4">
                                <Button type="submit" disabled={submitting} className="bg-amber-600 hover:bg-amber-500 text-white w-full font-bold border-0">
                                  {submitting ? 'Assigning...' : 'Confirm Assignment'}
                                </Button>
                              </DialogFooter>
                            </form>
                          </DialogContent>
                        </Dialog>
                        <DropdownMenu>
                          <DropdownMenuTrigger className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/10 rounded-xl border-0 h-10 w-10 p-0 focus:outline-none cursor-pointer">
                            <MoreVertical className="w-5 h-5" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-card border border-border text-foreground min-w-[160px] shadow-2xl rounded-2xl p-2 z-[9999] transform-gpu isolate">
                            {proj.status !== 'COMPLETED' && (
                              <DropdownMenuItem 
                                onClick={() => handleCompleteProject(proj.id)} 
                                className="hover:bg-accent/10 cursor-pointer flex items-center gap-3 py-2.5 px-3 rounded-xl font-bold text-xs"
                              >
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Complete Project
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              onClick={() => handleDeleteProject(proj.id)} 
                              className="hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 cursor-pointer flex items-center gap-3 py-2.5 px-3 rounded-xl font-bold text-xs mt-1 border-t border-border/50 pt-2"
                            >
                              <Trash2 className="w-4 h-4 text-rose-500" /> Delete Project
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>

                  {/* Tasks Dropdown */}
                  {expandedProjects[proj.id] && (
                    <div className="px-6 pb-6 pt-4 border-t border-border bg-muted/20 animate-in slide-in-from-top-2 duration-300">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between mb-4">
                          <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Operation Workflow</h5>
                          <div className="h-px bg-border flex-1 mx-4" />
                        </div>
                        
                        {(proj.tasks?.length || 0) === 0 ? (
                          <div className="py-8 text-center text-muted-foreground text-xs italic font-medium">
                            No tasks registered for this project scope.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-2">
                            {proj.tasks.map((task: any) => (
                              <div key={task.id} className="flex items-center justify-between p-4 bg-background border border-border rounded-2xl hover:border-primary/20 transition-all shadow-sm group/task">
                                <div className="flex items-center gap-4">
                                  <div className={cn("w-1.5 h-10 rounded-full shadow-sm", 
                                    task.priority === 'CRITICAL' ? 'bg-rose-500' : 
                                    task.priority === 'HIGH' ? 'bg-orange-500' : 
                                    task.priority === 'MEDIUM' ? 'bg-blue-500' : 'bg-muted-foreground'
                                  )} />
                                  <div className="space-y-1">
                                    <p className="text-sm font-bold text-foreground">{task.title}</p>
                                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-black uppercase tracking-wider">
                                      <span className="flex items-center gap-1.5"><UserIcon className="w-3 h-3 text-primary" /> {task.assignee?.name || 'Unassigned'}</span>
                                      <span className="flex items-center gap-1.5"><Clock className="w-3 h-3 text-primary" /> {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No Deadline'}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4">
                                  <span className={cn("px-2.5 py-1 rounded text-[10px] font-black uppercase shadow-sm ring-1", 
                                    task.status === 'DONE' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20' : 
                                    task.status === 'IN_PROGRESS' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-blue-500/20' : 'bg-muted text-muted-foreground ring-border'
                                  )}>
                                    {task.status}
                                  </span>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => handleToggleTaskStatus(task.id, task.status)}
                                    className={cn("h-9 w-9 rounded-xl transition-all active:scale-90 border-0", 
                                      task.status === 'DONE' ? 'text-emerald-500 hover:text-muted-foreground' : 'text-muted-foreground hover:text-emerald-500'
                                    )}
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
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
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

