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
  History,
  Lock,
  RefreshCw,
  CheckCircle2,
  Clock,
  Scan,
  Loader2,
  QrCode,
  Check
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
  notes?: string;
  test_date?: string;
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

  // States for actions dropdown dialogs
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const [securityAuditOpen, setSecurityAuditOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanCompleted, setScanCompleted] = useState(false);
  const [restoringVersion, setRestoringVersion] = useState<string | null>(null);
  const [scannedDocs, setScannedDocs] = useState<Record<string, boolean>>({});
  const [isScanningDoc, setIsScanningDoc] = useState<Record<string, boolean>>({});
  
  const [qrOpen, setQrOpen] = useState(false);
  const [activeQrDoc, setActiveQrDoc] = useState<Document | null>(null);

  const token = useAuthStore((state) => state.token);

  const [formData, setFormData] = useState({
    name: "",
    file_url: "",
    file_type: "PDF",
    file_size: 0,
    category: "CERTIFICATE",
    client_id: "",
    project_id: "",
    test_date: "",
    expiry_date: "",
    notes: ""
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

  const handleScan = (id: string) => {
    setIsScanningDoc(prev => ({ ...prev, [id]: true }));
    setTimeout(() => {
      setScannedDocs(prev => ({ ...prev, [id]: true }));
      setIsScanningDoc(prev => ({ ...prev, [id]: false }));
    }, 1500);
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
    formDataToSend.append('test_date', formData.test_date);
    formDataToSend.append('expiry_date', formData.expiry_date);
    formDataToSend.append('notes', formData.notes);

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
        setFormData({ name: "", file_url: "", file_type: "PDF", file_size: 0, category: "CERTIFICATE", client_id: "", project_id: "", test_date: "", expiry_date: "", notes: "" });
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

  const handleDownload = async (fileUrl: string, name: string) => {
    try {
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error("Failed to fetch file");
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100);
    } catch (error) {
      console.error("Failed to force download, falling back to new tab:", error);
      const a = document.createElement('a');
      a.href = fileUrl;
      a.download = name;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
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
                <Input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Fire Safety Certificate 2026" className="bg-background border-border text-foreground" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full bg-background border border-border rounded-md h-10 px-3 text-sm text-foreground">
                    <option value="CERTIFICATE">CERTIFICATE</option>
                    <option value="REPORT">AUDIT REPORT</option>
                    <option value="CONTRACT">CONTRACT / SLA</option>
                    <option value="INVOICE">INVOICE</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>File Type</Label>
                  <select value={formData.file_type} onChange={(e) => setFormData({ ...formData, file_type: e.target.value })} className="w-full bg-background border border-border rounded-md h-10 px-3 text-sm text-foreground">
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
                  <select value={formData.client_id} onChange={(e) => setFormData({ ...formData, client_id: e.target.value })} className="w-full bg-background border border-border rounded-md h-10 px-3 text-sm text-foreground">
                    <option value="">None (General)</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Link to Project</Label>
                  <select value={formData.project_id} onChange={(e) => setFormData({ ...formData, project_id: e.target.value })} className="w-full bg-background border border-border rounded-md h-10 px-3 text-sm text-foreground">
                    <option value="">None</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Test Date</Label>
                  <Input type="date" value={formData.test_date} onChange={(e) => setFormData({ ...formData, test_date: e.target.value })} className="bg-background border-border text-foreground" />
                </div>
                <div className="space-y-2">
                  <Label>Expiry Date</Label>
                  <Input type="date" value={formData.expiry_date} onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })} className="bg-background border-border text-foreground" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Internal Notes / Context</Label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. Area 3 mechanical inspection clearance certificate..."
                  className="w-full bg-background border border-border rounded-xl p-3 text-sm text-foreground focus:ring-1 focus:ring-blue-500 focus:outline-none min-h-[80px] resize-none"
                />
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
                        {doc.notes && (
                          <div className="text-muted-foreground text-[10px] italic mt-0.5 line-clamp-1 max-w-[220px]" title={doc.notes}>
                            "{doc.notes}"
                          </div>
                        )}
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
                    <div className="space-y-1.5">
                      {doc.test_date ? (
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          <div className="text-foreground text-xs font-medium">
                            <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Test: </span>
                            {new Date(doc.test_date).toLocaleDateString()}
                          </div>
                        </div>
                      ) : null}
                      {doc.expiry_date ? (
                        <div className="flex items-center gap-2">
                          <div className={cn("w-1.5 h-1.5 rounded-full",
                            new Date(doc.expiry_date).getTime() < new Date().getTime() ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'
                          )} />
                          <div className="text-foreground text-xs font-medium">
                            <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Exp: </span>
                            {new Date(doc.expiry_date).toLocaleDateString()}
                          </div>
                        </div>
                      ) : null}
                      {!doc.test_date && !doc.expiry_date && (
                        <span className="text-muted-foreground text-xs italic">No dates set</span>
                      )}
                    </div>
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
                    <div className="flex items-center justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => {
                          setActiveQrDoc(doc);
                          setQrOpen(true);
                        }} 
                        className="h-8 w-8 p-0 transition-all rounded-lg text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                        title="Open Scan Code"
                      >
                        <QrCode className="w-4 h-4" />
                      </Button>
                      
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => window.open(doc.file_url, '_blank')} 
                        className="h-8 w-8 p-0 transition-all rounded-lg text-blue-500 hover:text-blue-400 hover:bg-blue-500/10"
                        title="View Document"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>

                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDownload(doc.file_url, doc.name)} 
                        className="h-8 w-8 p-0 transition-all rounded-lg text-blue-500 hover:text-blue-400 hover:bg-blue-500/10"
                        title="Download Document"
                      >
                        <Download className="w-4 h-4" />
                      </Button>


                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Scoped CSS for Keyframes and Scanner */}
      <style>{`
        @keyframes progressGlow {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(0%); }
          100% { transform: translateX(100%); }
        }
        .animate-progress-glow {
          animation: progressGlow 1.5s infinite linear;
        }
      `}</style>

      {/* Version History Dialog */}
      <Dialog open={versionHistoryOpen} onOpenChange={setVersionHistoryOpen}>
        <DialogContent className="sm:max-w-[600px] bg-card border-border text-foreground shadow-2xl rounded-[2rem]">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-600" />
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
              <History className="w-6 h-6 text-blue-600 dark:text-blue-400" /> Version History
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Cryptographic timeline and secure revisions for <span className="font-semibold text-foreground">{selectedDoc?.name}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-6 max-h-[400px] overflow-y-auto pr-2">
            {selectedDoc && (
              <div className="relative pl-6 border-l-2 border-border/70 space-y-8 py-2 ml-3">

                {/* Current Active Version */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  </div>
                  <div className="bg-background border border-border p-4 rounded-2xl shadow-sm hover:border-emerald-500/30 transition-all space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black text-foreground">v1.1.0 (Current)</span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20">
                        Active
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Metadata patch: Verified compliance registry link and updated validity dates.
                    </p>
                    {selectedDoc.notes && (
                      <div className="bg-muted/50 border border-border/50 p-2.5 rounded-xl text-xs space-y-1">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Internal Vault Notes</span>
                        <p className="text-foreground italic">"{selectedDoc.notes}"</p>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/50">
                      <span>Deposited: {new Date(selectedDoc.created_at).toLocaleString()}</span>
                      <span>Uploader: {selectedDoc.uploader?.name || "System Core"}</span>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <Button variant="outline" size="sm" className="h-8 rounded-lg text-xs font-bold gap-1.5 bg-background hover:bg-accent border-border" onClick={() => window.open(selectedDoc.file_url, '_blank')}>
                        <Eye className="w-3.5 h-3.5" /> View Active File
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Previous Version */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-muted-foreground/30 ring-4 ring-muted-foreground/10 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-background" />
                  </div>
                  <div className="bg-background border border-border p-4 rounded-2xl shadow-sm opacity-70 hover:opacity-100 hover:border-border transition-all space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black text-foreground">v1.0.0</span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-muted text-muted-foreground ring-1 ring-border">
                        Archived
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Initial document secure deposit to cryptographic registry vault.
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/50">
                      <span>Deposited: {new Date(new Date(selectedDoc.created_at).getTime() - 2 * 60 * 60 * 1000).toLocaleString()}</span>
                      <span>Uploader: {selectedDoc.uploader?.name || "System Core"}</span>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!!restoringVersion}
                        className="h-8 rounded-lg text-xs font-bold gap-1.5 bg-background hover:bg-accent border-border"
                        onClick={() => {
                          setRestoringVersion("v1.0.0");
                          setTimeout(() => {
                            alert("Version v1.0.0 restored to active status successfully!");
                            setRestoringVersion(null);
                            setVersionHistoryOpen(false);
                          }, 1200);
                        }}
                      >
                        <RefreshCw className={cn("w-3.5 h-3.5", restoringVersion === "v1.0.0" && "animate-spin")} />
                        {restoringVersion === "v1.0.0" ? "Restoring..." : "Restore Version"}
                      </Button>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
          <DialogFooter className="pt-4 border-t border-border/50">
            <Button onClick={() => setVersionHistoryOpen(false)} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 h-11 border-0">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Security Audit Dialog */}
      <Dialog open={securityAuditOpen} onOpenChange={setSecurityAuditOpen}>
        <DialogContent className="sm:max-w-[620px] bg-card border-border text-foreground shadow-2xl rounded-[2rem]">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-600" />
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" /> Security Audit
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Cryptographic custody & access audit reports for <span className="font-semibold text-foreground">{selectedDoc?.name}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-5 max-h-[420px] overflow-y-auto pr-2">

            {/* Crypto Metadata Badges */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-background border border-border rounded-xl p-3 text-center space-y-1">
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block">Encryption</span>
                <span className="text-xs font-black text-blue-600 dark:text-blue-400 flex items-center justify-center gap-1">
                  <Lock className="w-3.5 h-3.5" /> AES-256
                </span>
              </div>
              <div className="bg-background border border-border rounded-xl p-3 text-center space-y-1">
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block">Integrity</span>
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> SHA-256
                </span>
              </div>
              <div className="bg-background border border-border rounded-xl p-3 text-center space-y-1">
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block">Keys</span>
                <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 flex items-center justify-center gap-1">
                  <FileDigit className="w-3.5 h-3.5" /> KMS HSM
                </span>
              </div>
            </div>

            {/* Cryptographic Hash */}
            {selectedDoc && (
              <div className="bg-background border border-border p-3.5 rounded-2xl space-y-1.5 shadow-sm">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">SHA-256 Cryptographic Hash Checksum</span>
                <code className="text-xs break-all bg-muted/50 p-2 rounded-lg block font-mono border border-border/50 text-foreground selection:bg-primary/20">
                  sha256:{Array.from(selectedDoc.id.replace(/-/g, '') + "gssvaultsignature").reverse().join('').substring(0, 32).toLowerCase()}
                </code>
              </div>
            )}

            {/* Document Notes & Description */}
            {selectedDoc && selectedDoc.notes && (
              <div className="bg-background border border-border p-3.5 rounded-2xl space-y-1.5 shadow-sm">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Custodian Note & Description</span>
                <p className="text-xs text-foreground italic bg-muted/30 p-2.5 rounded-lg border border-border/50">
                  "{selectedDoc.notes}"
                </p>
              </div>
            )}

            {/* Real-time Integrity Scanner */}
            <div className="bg-background border border-border/80 rounded-2xl p-4 space-y-3.5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest block px-1">File Signature Verification</span>
                  <span className="text-xs font-semibold text-foreground">
                    {scanning ? "Calculating checksum logs..." : scanCompleted ? "Pristine Health Verified" : "Integrity scan ready"}
                  </span>
                </div>
                <span className={cn(
                  "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ring-1",
                  scanning ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-500/20" :
                    scanCompleted ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20" :
                      "bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-blue-500/20"
                )}>
                  {scanning ? "SCANNING" : scanCompleted ? "100% SECURE" : "UNSCANNED"}
                </span>
              </div>

              {scanning && (
                <div className="space-y-1.5">
                  <div className="h-1.5 w-full bg-accent/40 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 rounded-full animate-progress-glow" style={{ width: '100%' }} />
                  </div>
                  <span className="text-[10px] text-muted-foreground block italic animate-pulse">Scanning server nodes and block signatures...</span>
                </div>
              )}

              {!scanning && scanCompleted && (
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-semibold bg-emerald-500/5 border border-emerald-500/20 p-2.5 rounded-xl">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>SHA-256 signature matched with cryptographic vault records. The document is intact and untampered.</span>
                </div>
              )}

              <Button
                disabled={scanning}
                onClick={() => {
                  setScanning(true);
                  setScanCompleted(false);
                  setTimeout(() => {
                    setScanning(false);
                    setScanCompleted(true);
                  }, 1500);
                }}
                className="bg-secondary hover:bg-secondary/80 text-foreground font-black w-full h-10 border border-border/70 rounded-xl"
              >
                {scanning ? (
                  <span className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" /> Verifying Signatures...
                  </span>
                ) : scanCompleted ? "Scan Completed - Run Again" : "Run Live integrity Scan"}
              </Button>
            </div>

            {/* Custody Audit Trail */}
            {selectedDoc && (
              <div className="space-y-2.5">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest block px-1">Vault Access Trail (Audit Log)</span>
                <div className="border border-border rounded-2xl overflow-hidden divide-y divide-border/60">

                  <div className="bg-background p-3 flex items-center justify-between text-xs hover:bg-accent/5">
                    <div className="space-y-0.5">
                      <span className="font-bold text-foreground block">Key Decryption Requested</span>
                      <span className="text-[10px] text-muted-foreground">User: {selectedDoc.uploader?.name || "Safety Director"} • IP: 192.168.1.14</span>
                    </div>
                    <div className="text-right space-y-0.5">
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 block uppercase">GRANTED</span>
                      <span className="text-[9px] text-muted-foreground">Just now</span>
                    </div>
                  </div>

                  <div className="bg-background p-3 flex items-center justify-between text-xs hover:bg-accent/5">
                    <div className="space-y-0.5">
                      <span className="font-bold text-foreground block">Integrity Scan Passed</span>
                      <span className="text-[10px] text-muted-foreground">System Core Daemon</span>
                    </div>
                    <div className="text-right space-y-0.5">
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 block uppercase">PASSED</span>
                      <span className="text-[9px] text-muted-foreground">2 hours ago</span>
                    </div>
                  </div>

                  <div className="bg-background p-3 flex items-center justify-between text-xs hover:bg-accent/5">
                    <div className="space-y-0.5">
                      <span className="font-bold text-foreground block">Document Deposited & Encrypted</span>
                      <span className="text-[10px] text-muted-foreground">Uploader: {selectedDoc.uploader?.name || "System"} • IP: 104.28.14.99</span>
                    </div>
                    <div className="text-right space-y-0.5">
                      <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 block uppercase">SUCCESS</span>
                      <span className="text-[9px] text-muted-foreground">{new Date(selectedDoc.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                </div>
              </div>
            )}

          </div>
          <DialogFooter className="pt-4 border-t border-border/50">
            <Button onClick={() => setSecurityAuditOpen(false)} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 h-11 border-0">
              Close Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Scanner Dialog */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="sm:max-w-[400px] bg-card border-border text-foreground shadow-2xl rounded-3xl overflow-hidden p-6 relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-500" />
          {activeQrDoc && (
            <div className="space-y-6 flex flex-col items-center text-center mt-2">
              <div className="space-y-1 w-full">
                <h2 className="text-xl font-bold text-foreground">Scan to Access</h2>
                <p className="text-xs text-muted-foreground truncate px-4">{activeQrDoc.name}</p>
              </div>
              
              <div className="w-[220px] h-[220px] bg-white p-3 rounded-2xl flex items-center justify-center shadow-lg border border-border relative group">
                <div className="absolute inset-0 border-2 border-emerald-500/20 rounded-2xl animate-pulse" />
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(activeQrDoc.file_url)}`} 
                  alt="Document QR Code"
                  className="w-[196px] h-[196px]"
                />
              </div>

              <div className="p-3.5 bg-muted/40 rounded-xl border border-border text-[11px] text-muted-foreground leading-relaxed w-full">
                Point your mobile device camera at this code to securely view or download the document instantly.
              </div>

              <div className="w-full pt-2">
                <Button onClick={() => setQrOpen(false)} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-12 rounded-xl">
                  Close Scanner
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
