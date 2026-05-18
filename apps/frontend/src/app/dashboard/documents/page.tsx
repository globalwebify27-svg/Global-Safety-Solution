"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth";
import { API_BASE_URL } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  FilePlus, 
  ShieldCheck, 
  CalendarClock, 
  HardDrive, 
  Download, 
  Eye, 
  Trash2,
  Search,
  Filter,
  MoreVertical,
  AlertCircle,
  FileDigit,
  FileCheck2,
  FolderOpen,
  Briefcase,
  History
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

interface Document {
  id: string;
  name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  category: string;
  expiry_date?: string;
  client?: { name: string };
  project?: { name: string };
  uploader?: { name: string };
  created_at: string;
}

interface Client { id: string; name: string; }
interface Project { id: string; name: string; }

export default function DocumentVaultPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const token = useAuthStore((state) => state.token);

  const [formData, setFormData] = useState({
    name: "",
    file_url: "",
    file_type: "PDF",
    file_size: 0,
    category: "CERTIFICATE",
    client_id: "",
    project_id: "",
    expiry_date: ""
  });

  useEffect(() => {
    fetchData();
  }, [token, categoryFilter]);

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const catParam = categoryFilter !== "ALL" ? `?category=${categoryFilter}` : "";
      const [docRes, clientRes, projectRes] = await Promise.all([
        fetch(`${API_BASE_URL}/documents${catParam}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/clients`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/projects`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      const docData = await docRes.json();
      const clientData = await clientRes.json();
      const projectData = await projectRes.json();

      if (Array.isArray(docData)) setDocuments(docData);
      if (Array.isArray(clientData)) setClients(clientData);
      if (Array.isArray(projectData)) setProjects(projectData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedFile) {
      alert("Please select a file to upload.");
      return;
    }
    setSubmitting(true);

    const formDataToSend = new FormData();
    formDataToSend.append('file', selectedFile);
    formDataToSend.append('name', formData.name);
    formDataToSend.append('category', formData.category);
    formDataToSend.append('file_type', formData.file_type);
    formDataToSend.append('client_id', formData.client_id);
    formDataToSend.append('project_id', formData.project_id);
    formDataToSend.append('expiry_date', formData.expiry_date);

    try {
      const res = await fetch(`${API_BASE_URL}/documents`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formDataToSend
      });
      if (res.ok) {
        setOpen(false);
        setFormData({ name: "", file_url: "", file_type: "PDF", file_size: 0, category: "CERTIFICATE", client_id: "", project_id: "", expiry_date: "" });
        setSelectedFile(null);
        fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to permanently revoke this document from the vault?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/documents/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownload = (fileUrl: string, name: string) => {
    const a = window.document.createElement('a');
    a.href = fileUrl;
    a.download = name;
    a.target = '_blank';
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-600">
            Digital Vault
          </h1>
          <p className="text-muted-foreground font-medium">Enterprise-grade storage for safety certificates, audit reports, and contracts.</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button className="bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-xl shadow-blue-500/20 px-8 h-12 transition-all active:scale-95 border-0" />}>
              <FilePlus className="w-5 h-5 mr-2" /> Deposit Document
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] bg-card border-border text-foreground shadow-2xl rounded-[2rem]">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-600" />
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Secure Document Deposit</DialogTitle>
              <DialogDescription className="text-muted-foreground">Register a new document in the centralized safety registry.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpload} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Document Name / Title *</Label>
                <Input required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="e.g. Fire Safety Certificate 2026" className="bg-background border-border text-foreground" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full bg-background border border-border rounded-md h-10 px-3 text-sm text-foreground">
                    <option value="CERTIFICATE">CERTIFICATE</option>
                    <option value="REPORT">AUDIT REPORT</option>
                    <option value="CONTRACT">CONTRACT / SLA</option>
                    <option value="INVOICE">INVOICE</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>File Type</Label>
                  <select value={formData.file_type} onChange={(e) => setFormData({...formData, file_type: e.target.value})} className="w-full bg-background border border-border rounded-md h-10 px-3 text-sm text-foreground">
                    <option value="PDF">PDF Document</option>
                    <option value="IMAGE">Image / JPEG</option>
                    <option value="DOC">Word Document</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Upload Document File *</Label>
                <div className="relative group cursor-pointer">
                  <input 
                    type="file" 
                    required
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  />
                  <div className="w-full h-24 bg-background border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center group-hover:border-blue-500/50 transition-all">
                    <FilePlus className="w-6 h-6 text-muted-foreground mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      {selectedFile ? selectedFile.name : "Select or Drop File"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Link to Client</Label>
                  <select value={formData.client_id} onChange={(e) => setFormData({...formData, client_id: e.target.value})} className="w-full bg-background border border-border rounded-md h-10 px-3 text-sm text-foreground">
                    <option value="">None (General)</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Link to Project</Label>
                  <select value={formData.project_id} onChange={(e) => setFormData({...formData, project_id: e.target.value})} className="w-full bg-background border border-border rounded-md h-10 px-3 text-sm text-foreground">
                    <option value="">None</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Expiry Date (If applicable)</Label>
                <Input type="date" value={formData.expiry_date} onChange={(e) => setFormData({...formData, expiry_date: e.target.value})} className="bg-background border-border text-foreground" />
              </div>
              <DialogFooter className="pt-4">
                <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-500 text-white font-bold w-full h-12 border-0">
                  {submitting ? "Encrypting & Storing..." : "Commit to Vault"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: "Total Files", value: documents.length, icon: FolderOpen, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10" },
          { label: "Certificates", value: documents.filter(d => d.category === 'CERTIFICATE').length, icon: ShieldCheck, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Expiring Soon", value: documents.filter(d => d.expiry_date && new Date(d.expiry_date).getTime() - new Date().getTime() < 30 * 24 * 60 * 60 * 1000).length, icon: CalendarClock, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10" },
          { label: "Vault Usage", value: formatSize(documents.reduce((acc, d) => acc + d.file_size, 0)), icon: HardDrive, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-500/10" }
        ].map((stat, i) => (
          <div key={i} className="bg-card/40 border border-border rounded-2xl p-5 flex items-center justify-between shadow-sm backdrop-blur-md hover:border-primary/20 transition-all group">
            <div className="space-y-1">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</p>
              <p className="text-3xl font-black text-foreground group-hover:text-primary transition-colors">{stat.value}</p>
            </div>
            <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center ${stat.color} shadow-lg shadow-black/5`}>
              <stat.icon className="w-6 h-6" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="bg-card/40 border border-border rounded-3xl overflow-hidden shadow-sm backdrop-blur-md">
        <div className="p-6 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/30">
          <div className="flex items-center gap-3 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
            {["ALL", "CERTIFICATE", "REPORT", "CONTRACT", "INVOICE"].map((cat) => (
              <button 
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={cn("px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border shadow-sm", 
                  categoryFilter === cat 
                    ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20" 
                    : "bg-background border-border text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input className="bg-background border border-border rounded-xl py-3 pl-11 pr-6 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-full md:w-72 transition-all text-foreground font-medium" placeholder="Search the vault..." />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Document Meta</th>
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Ownership</th>
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Validity</th>
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest text-right">Vault Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground italic font-medium animate-pulse">Unlocking Digital Vault...</td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground italic text-sm">The vault is currently empty.</td>
                </tr>
              ) : documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-accent/5 transition-colors group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center border border-border group-hover:border-blue-500/30 transition-all shadow-sm">
                        {doc.file_type === 'PDF' ? <FileDigit className="w-5 h-5 text-rose-600 dark:text-rose-400" /> : <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
                      </div>
                      <div>
                        <div className="text-foreground font-bold max-w-[200px] truncate">{doc.name}</div>
                        <div className="text-muted-foreground text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                          {formatSize(doc.file_size)} • {doc.file_type}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-foreground font-bold text-xs">
                        <Briefcase className="w-3 h-3 text-muted-foreground" /> {doc.client?.name || "Global Safety Core"}
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
                        {doc.project?.name || "Administrative Storage"}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    {doc.expiry_date ? (
                      <div className="flex items-center gap-2">
                        <div className={cn("w-1.5 h-1.5 rounded-full", 
                          new Date(doc.expiry_date).getTime() < new Date().getTime() ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'
                        )} />
                        <div className="text-foreground text-xs font-medium">
                          {new Date(doc.expiry_date).toLocaleDateString()}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs italic">Indefinite</span>
                    )}
                  </td>
                  <td className="px-6 py-5">
                    <span className={cn("px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-tighter ring-1 shadow-sm", 
                      doc.category === 'CERTIFICATE' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20' : 
                      doc.category === 'REPORT' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-blue-500/20' : 'bg-muted text-muted-foreground ring-border'
                    )}>
                      {doc.category}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 hover:bg-accent/10 rounded-xl" onClick={() => window.open(doc.file_url, '_blank')}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-accent/10 rounded-xl" onClick={() => handleDownload(doc.file_url, doc.name)}>
                        <Download className="w-4 h-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/10 rounded-xl border-0 h-9 w-9 p-0 focus:outline-none cursor-pointer">
                          <MoreVertical className="w-4 h-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-card border border-border text-foreground min-w-[200px] shadow-2xl rounded-2xl p-2 z-[9999] transform-gpu isolate">
                          <DropdownMenuItem className="hover:bg-accent/10 cursor-pointer flex items-center gap-3 py-3 rounded-xl font-bold text-sm">
                            <History className="w-4 h-4 text-muted-foreground" /> Version History
                          </DropdownMenuItem>
                          <DropdownMenuItem className="hover:bg-accent/10 cursor-pointer flex items-center gap-3 py-3 rounded-xl font-bold text-sm">
                            <ShieldCheck className="w-4 h-4 text-muted-foreground" /> Security Audit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(doc.id)} className="hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 cursor-pointer flex items-center gap-3 py-3 rounded-xl font-bold text-sm mt-1 border-t border-border/50 pt-2">
                            <Trash2 className="w-4 h-4" /> Revoke Access
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
    </div>
  );
}
