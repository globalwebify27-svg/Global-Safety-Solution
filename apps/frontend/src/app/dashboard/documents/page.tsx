"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth";
import { API_BASE_URL } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
  Check,
  ChevronRight,
  ChevronDown,
  Building2,
  Layers,
  Sparkles,
  LayoutGrid,
  ListFilter,
  X,
  UploadCloud,
  Upload,
  Image as ImageIcon,
  Mail,
  Pencil
} from "lucide-react";
import { InspectionImageVaultView } from "@/components/documents/InspectionImageVaultView";
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

interface VaultCertificateItem {
  id: string;
  certificate_id?: string;
  name: string;
  certificate_number: string;
  certificate_type: string;
  client_id: string;
  client_name: string;
  project_id: string;
  project_name: string;
  issue_date: string;
  expiry_date: string | null;
  due_date: string | null;
  status: "ACTIVE" | "DUE_SOON" | "EXPIRED" | string;
  file_url: string;
  file_type: string;
  file_size: number;
  created_at: string;
  updated_at?: string;
  delivery_receipt_url?: string | null;
  delivery_receipt_name?: string | null;
  delivery_receipt_type?: string | null;
  delivery_receipt_size?: number | null;
  delivery_receipt_uploaded_at?: string | null;
  delivery_receipt_uploaded_by?: string | null;
  receipt_uploader_name?: string | null;
}

interface VaultProjectNode {
  project_id: string;
  project_name: string;
  description?: string;
  status?: string;
  certificates: VaultCertificateItem[];
}

interface VaultClientNode {
  client_id: string;
  client_name: string;
  industry?: string;
  city?: string;
  projects: VaultProjectNode[];
  total_certificates: number;
}

export default function DocumentVaultPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [hierarchy, setHierarchy] = useState<VaultClientNode[]>([]);
  const [vaultStats, setVaultStats] = useState({
    total_certificates: 0,
    active: 0,
    due_soon: 0,
    expired: 0
  });

  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [viewMode, setViewMode] = useState<"HIERARCHY" | "REGISTRY" | "IMAGES">("HIERARCHY");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Expanded nodes state
  const [expandedClients, setExpandedClients] = useState<Record<string, boolean>>({});
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});

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

  // Certificate Detail Preview Modal State
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedPreviewCert, setSelectedPreviewCert] = useState<VaultCertificateItem | null>(null);

  // Edit Certificate & Audit Trail states
  const [editCertOpen, setEditCertOpen] = useState(false);
  const [editingCertDoc, setEditingCertDoc] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    certificate_number: "",
    cert_competency_no: "",
    issue_date: "",
    expiry_date: "",
    validity_period: "1 Year",
    notes: "",
    reason: ""
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const [auditHistoryOpen, setAuditHistoryOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(false);

  // Delivery Receipt Upload / Delete State
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [deletingReceipt, setDeletingReceipt] = useState(false);

  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const roleName = user?.roles?.[0]?.role?.name || "";
  const designation = (user?.designation || "").toUpperCase();
  const isClient = roleName === "CLIENT" || designation.includes("CLIENT");

  const handleDeliveryReceiptUpload = async (file: File) => {
    if (!selectedPreviewCert || !token) return;
    
    // Client-side validation
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      alert("File size exceeds maximum allowed limit of 10MB.");
      return;
    }

    const ext = (file.name || '').split('.').pop()?.toLowerCase();
    if (!['jpg', 'jpeg', 'png', 'pdf'].includes(ext || '')) {
      alert("Invalid file format. Only JPG, PNG, and PDF files are allowed for delivery receipts.");
      return;
    }

    setUploadingReceipt(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API_BASE_URL}/documents/${selectedPreviewCert.id}/delivery-receipt`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      if (res.ok) {
        const updatedDoc = await res.json();
        setSelectedPreviewCert((prev) => prev ? {
          ...prev,
          delivery_receipt_url: updatedDoc.delivery_receipt_url,
          delivery_receipt_name: updatedDoc.delivery_receipt_name,
          delivery_receipt_type: updatedDoc.delivery_receipt_type,
          delivery_receipt_size: updatedDoc.delivery_receipt_size,
          delivery_receipt_uploaded_at: updatedDoc.delivery_receipt_uploaded_at,
          delivery_receipt_uploaded_by: updatedDoc.delivery_receipt_uploaded_by,
          receipt_uploader_name: updatedDoc.receipt_uploader?.name || user?.name || 'Staff'
        } : null);

        if (typeof fetchData === 'function') fetchData();
      } else {
        const errorData = await res.json();
        alert(errorData.message || "Failed to upload delivery receipt.");
      }
    } catch (e: any) {
      alert(`Network error: ${e?.message || 'Upload failed'}`);
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleDeliveryReceiptDelete = async () => {
    if (!selectedPreviewCert || !token) return;
    if (!confirm("Are you sure you want to delete this physical delivery receipt proof?")) return;

    setDeletingReceipt(true);
    try {
      const res = await fetch(`${API_BASE_URL}/documents/${selectedPreviewCert.id}/delivery-receipt`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.ok) {
        setSelectedPreviewCert((prev) => prev ? {
          ...prev,
          delivery_receipt_url: null,
          delivery_receipt_name: null,
          delivery_receipt_type: null,
          delivery_receipt_size: null,
          delivery_receipt_uploaded_at: null,
          delivery_receipt_uploaded_by: null,
          receipt_uploader_name: null
        } : null);

        if (typeof fetchData === 'function') fetchData();
      } else {
        const errorData = await res.json();
        alert(errorData.message || "Failed to delete delivery receipt.");
      }
    } catch (e: any) {
      alert(`Network error: ${e?.message || 'Delete failed'}`);
    } finally {
      setDeletingReceipt(false);
    }
  };

  const handleOpenEditCert = (certItem: any) => {
    setEditingCertDoc(certItem);
    setEditForm({
      name: certItem.name || "",
      certificate_number: certItem.certificate_number || certItem.certificate_no || "",
      cert_competency_no: certItem.cert_competency_no || "",
      issue_date: certItem.issue_date || (certItem.test_date ? certItem.test_date.split('T')[0] : (certItem.created_at ? certItem.created_at.split('T')[0] : "")),
      expiry_date: certItem.expiry_date || "",
      validity_period: certItem.validity_period || "1 Year",
      notes: certItem.notes || "",
      reason: ""
    });
    setEditCertOpen(true);
  };

  const handleSaveEditCert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCertDoc || !token) return;
    try {
      setSavingEdit(true);
      const res = await fetch(`${API_BASE_URL}/documents/${editingCertDoc.id}/edit-certificate`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(data.message || "Certificate updated successfully!");
        setEditCertOpen(false);
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.message || "Failed to update certificate");
      }
    } catch (err) {
      toast.error("Failed to update certificate");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleOpenAuditHistory = async (docId: string) => {
    if (!token) return;
    try {
      setLoadingAuditLogs(true);
      setAuditHistoryOpen(true);
      const res = await fetch(`${API_BASE_URL}/documents/${docId}/audit-history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      } else {
        toast.error("Failed to fetch audit history");
      }
    } catch (err) {
      toast.error("Failed to fetch audit history");
    } finally {
      setLoadingAuditLogs(false);
    }
  };

  const [emailingCertId, setEmailingCertId] = useState<string | null>(null);

  const handleEmailCertificate = async (docId: string) => {
    if (!token) return;
    setEmailingCertId(docId);
    try {
      const res = await fetch(`${API_BASE_URL}/documents/${docId}/deliver-email`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Certificate emailed to client successfully!");
      } else {
        toast.error(data.message || "Failed to email certificate.");
      }
    } catch {
      toast.error("Network error emailing certificate.");
    } finally {
      setEmailingCertId(null);
    }
  };

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
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const cName = params.get('client_name');
      const cId = params.get('client_id');
      const pId = params.get('project_id');
      const q = params.get('search');
      if (cName) {
        setSearchQuery(cName);
      } else if (q) {
        setSearchQuery(q);
      } else if (cId) {
        setSearchQuery(cId);
      } else if (pId) {
        setSearchQuery(pId);
      }
    }
  }, [token, categoryFilter]);

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const catParam = categoryFilter !== "ALL" ? `?category=${categoryFilter}` : "";
      const timestamp = Date.now();
      const [docRes, clientRes, projectRes, hierarchyRes] = await Promise.all([
        fetch(`${API_BASE_URL}/documents${catParam}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/clients?_t=${timestamp}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/projects?_t=${timestamp}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/documents/hierarchy?_t=${timestamp}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      const docData = await docRes.json();
      const clientData = await clientRes.json();
      const projectData = await projectRes.json();
      const hierarchyData = await hierarchyRes.json();

      if (Array.isArray(docData)) setDocuments(docData);
      if (Array.isArray(clientData)) setClients(clientData);
      if (Array.isArray(projectData)) setProjects(projectData);

      if (hierarchyData && hierarchyData.hierarchy) {
        setHierarchy(hierarchyData.hierarchy);
        if (hierarchyData.stats) {
          setVaultStats(hierarchyData.stats);
        }
        // Expand all clients by default
        const clientExp: Record<string, boolean> = {};
        const projExp: Record<string, boolean> = {};
        hierarchyData.hierarchy.forEach((c: VaultClientNode) => {
          clientExp[c.client_id] = true;
          c.projects.forEach((p: VaultProjectNode) => {
            projExp[`${c.client_id}_${p.project_id}`] = true;
          });
        });
        setExpandedClients(clientExp);
        setExpandedProjects(projExp);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleClientExpand = (clientId: string) => {
    setExpandedClients(prev => ({ ...prev, [clientId]: !prev[clientId] }));
  };

  const toggleProjectExpand = (key: string) => {
    setExpandedProjects(prev => ({ ...prev, [key]: !prev[key] }));
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

  const resolveFileUrl = (url: string) => {
    if (!url) return "";
    if (url.startsWith("data:") || url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }
    const cleanUrl = url.startsWith("/api") ? url.substring(4) : url;
    return `${API_BASE_URL}${cleanUrl}`;
  };

  const handleView = async (fileUrl: string) => {
    try {
      const resolvedUrl = resolveFileUrl(fileUrl);
      if (resolvedUrl.startsWith('data:')) {
        const response = await fetch(resolvedUrl);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
        return;
      }

      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(resolvedUrl, { headers });
      if (!response.ok) throw new Error("Failed to fetch file");
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
    } catch (error) {
      console.error("Failed to view document:", error);
      window.open(fileUrl, '_blank');
    }
  };

  const handleDownload = async (fileUrl: string, name: string) => {
    try {
      const resolvedUrl = resolveFileUrl(fileUrl);
      if (resolvedUrl.startsWith('data:')) {
        const response = await fetch(resolvedUrl);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = name.endsWith('.pdf') ? name : `${name}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100);
        return;
      }

      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(resolvedUrl, { headers });
      if (!response.ok) throw new Error("Failed to fetch file");
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = name.endsWith('.pdf') ? name : `${name}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100);
    } catch (error) {
      console.error("Failed to force download, falling back to new tab:", error);
      const resolvedUrl = resolveFileUrl(fileUrl);
      const a = document.createElement('a');
      a.href = resolvedUrl;
      a.download = name;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '100 KB';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Active
          </span>
        );
      case "DUE_SOON":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-sm">
            <Clock className="w-3.5 h-3.5 text-amber-500" /> Due Soon
          </span>
        );
      case "EXPIRED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 shadow-sm">
            <AlertCircle className="w-3.5 h-3.5 text-rose-500" /> Expired
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-500" /> Active
          </span>
        );
    }
  };

  // Filter hierarchy tree based on search query
  const filteredHierarchy = hierarchy.map(clientNode => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return clientNode;

    const matchesClient = 
      clientNode.client_name.toLowerCase().includes(q) || 
      clientNode.client_id.toLowerCase().includes(q);

    const filteredProjects = clientNode.projects.map(proj => {
      const matchesProj = 
        proj.project_name.toLowerCase().includes(q) || 
        proj.project_id.toLowerCase().includes(q);

      const filteredCerts = proj.certificates.filter(cert =>
        cert.name.toLowerCase().includes(q) ||
        cert.certificate_number.toLowerCase().includes(q) ||
        cert.certificate_type.toLowerCase().includes(q)
      );
      if (matchesProj || filteredCerts.length > 0) {
        return { ...proj, certificates: matchesProj ? proj.certificates : filteredCerts };
      }
      return null;
    }).filter(Boolean) as VaultProjectNode[];

    if (matchesClient || filteredProjects.length > 0) {
      return { ...clientNode, projects: filteredProjects };
    }
    return null;
  }).filter(Boolean) as VaultClientNode[];

  return (
    <div className="space-y-8 pb-10">
      {/* Top Header & Navigation */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-2 border-b border-border/50">
        <div className="space-y-1.5 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="text-[10px] font-black uppercase tracking-widest">Enterprise Compliance Vault</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 leading-tight">
            Compliance & Digital Vault
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground font-medium leading-relaxed">
            Centralized institutional compliance registry, expiry monitoring, and encrypted document vault.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Switcher */}
          <div className="bg-muted p-1 rounded-xl border border-border flex items-center shadow-inner">
            <button
              onClick={() => setViewMode("HIERARCHY")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all",
                viewMode === "HIERARCHY"
                  ? "bg-background text-foreground shadow-md font-extrabold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Structured Hierarchy
            </button>
            <button
              onClick={() => setViewMode("REGISTRY")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all",
                viewMode === "REGISTRY"
                  ? "bg-background text-foreground shadow-md font-extrabold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LayoutGrid className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              All Vault Files
            </button>
            <button
              onClick={() => setViewMode("IMAGES")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all",
                viewMode === "IMAGES"
                  ? "bg-background text-foreground shadow-md font-extrabold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ImageIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              Inspection Image Vault
            </button>
          </div>

          <Button 
            onClick={() => router.push('/dashboard/documents/due')} 
            className="bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-xl shadow-amber-500/20 px-6 h-11 transition-all active:scale-95 border-0 rounded-xl"
          >
            <CalendarClock className="w-4 h-4 mr-2" /> Expiry Monitor
          </Button>

          {!isClient && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger render={<Button className="bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-xl shadow-blue-500/20 px-6 h-11 transition-all active:scale-95 border-0 rounded-xl" />}>
                <FilePlus className="w-4 h-4 mr-2" /> Deposit Document
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] bg-card border-border text-foreground shadow-2xl rounded-[2rem] max-h-[80vh] overflow-y-auto p-6 relative">
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
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: "Total Vault Certificates", value: vaultStats.total_certificates || documents.filter(d => d.category === 'CERTIFICATE').length, icon: FolderOpen, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10", clickable: false },
          { label: "Active Certificates", value: vaultStats.active || documents.filter(d => d.category === 'CERTIFICATE' && (!d.expiry_date || new Date(d.expiry_date).getTime() > new Date().getTime())).length, icon: ShieldCheck, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", clickable: false },
          { label: "Due Soon (Within 30d)", value: vaultStats.due_soon || documents.filter(d => d.expiry_date && new Date(d.expiry_date).getTime() - new Date().getTime() > 0 && new Date(d.expiry_date).getTime() - new Date().getTime() < 30 * 24 * 60 * 60 * 1000).length, icon: Clock, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10", clickable: true },
          { label: "Expired Certificates", value: vaultStats.expired || documents.filter(d => d.expiry_date && new Date(d.expiry_date).getTime() < new Date().getTime()).length, icon: AlertCircle, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/10", clickable: true }
        ].map((stat, i) => (
          <div 
            key={i} 
            onClick={() => stat.clickable && router.push('/dashboard/documents/due')}
            className={cn(
              "bg-card/40 border border-border rounded-2xl p-5 flex items-center justify-between shadow-sm backdrop-blur-md hover:border-primary/20 transition-all group",
              stat.clickable && "cursor-pointer hover:bg-accent/10 active:scale-95"
            )}
          >
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

      {/* Main Vault Content */}
      <div className="bg-card/40 border border-border rounded-3xl overflow-hidden shadow-sm backdrop-blur-md space-y-0">
        
        {/* Search & Filter Header Toolbar */}
        <div className="p-6 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/30">
          <div className="flex items-center gap-3 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
            {viewMode === "REGISTRY" && ["ALL", "CERTIFICATE", "REPORT", "CONTRACT", "INVOICE"].map((cat) => (
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
            {viewMode === "HIERARCHY" && (
              <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                <Building2 className="w-4 h-4 text-blue-500" />
                <span>Client & Project Vault Hierarchy</span>
              </div>
            )}
            {viewMode === "IMAGES" && (
              <div className="flex items-center gap-2 text-xs font-bold text-purple-600 dark:text-purple-400">
                <ImageIcon className="w-4 h-4" />
                <span>Inspection Image Repository & Equipment Photo Tree</span>
              </div>
            )}
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-background border border-border rounded-xl py-3 pl-11 pr-6 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-full md:w-80 transition-all text-foreground font-medium"
              placeholder="Search Client, Project, or Certificate No..."
            />
          </div>
        </div>

        {/* HIERARCHY VIEW (Client -> Project -> Certificates) */}
        {viewMode === "HIERARCHY" && (
          <div className="p-6 space-y-6">
            {loading ? (
              <div className="py-16 text-center text-muted-foreground italic font-medium animate-pulse flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <span>Unlocking Digital Vault Hierarchy...</span>
              </div>
            ) : filteredHierarchy.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground italic text-sm flex flex-col items-center justify-center gap-3">
                <FolderOpen className="w-12 h-12 text-muted-foreground/40" />
                <span>No certificates or client records found in the Digital Vault.</span>
              </div>
            ) : (
              filteredHierarchy.map((clientNode) => {
                const isClientExpanded = expandedClients[clientNode.client_id] ?? true;
                return (
                  <div
                    key={clientNode.client_id}
                    className="border border-border rounded-2xl bg-background/60 overflow-hidden shadow-sm transition-all"
                  >
                    {/* Client Header Bar */}
                    <div
                      onClick={() => toggleClientExpand(clientNode.client_id)}
                      className="p-5 bg-muted/40 hover:bg-accent/20 cursor-pointer flex items-center justify-between transition-colors select-none"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-3">
                            <h2 className="text-lg font-black tracking-tight text-foreground">{clientNode.client_name}</h2>
                            <span className="px-3 py-1 rounded-full text-[11px] font-extrabold tracking-wide bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                              {(clientNode as any).total_projects || clientNode.projects.length} {(clientNode as any).total_projects === 1 ? 'Project' : 'Projects'} • {clientNode.total_certificates} {clientNode.total_certificates === 1 ? 'Certificate' : 'Certificates'}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                            <span>📍 Location: {clientNode.city || clientNode.industry || 'Headquarters'}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-muted-foreground">
                        {isClientExpanded ? <ChevronDown className="w-5 h-5 text-blue-500" /> : <ChevronRight className="w-5 h-5" />}
                      </div>
                    </div>

                    {/* Client Body (Projects List) */}
                    {isClientExpanded && (
                      <div className="p-5 space-y-5 border-t border-border bg-background">
                        {clientNode.projects.length === 0 ? (
                          <div className="text-xs text-muted-foreground italic py-3 px-4">
                            No project folders available under this client.
                          </div>
                        ) : (
                          clientNode.projects.map((projectNode) => {
                            const projKey = `${clientNode.client_id}_${projectNode.project_id}`;
                            const isProjExpanded = expandedProjects[projKey] ?? true;

                            return (
                              <div
                                key={projectNode.project_id}
                                className="border border-border/70 rounded-xl bg-card/50 overflow-hidden shadow-sm"
                              >
                                {/* Project Folder Header */}
                                <div
                                  onClick={() => toggleProjectExpand(projKey)}
                                  className={cn(
                                    "p-4 cursor-pointer flex items-center justify-between transition-colors select-none",
                                    (projectNode as any).is_general || projectNode.project_id === 'general'
                                      ? "bg-amber-500/5 hover:bg-amber-500/10 border-b border-amber-500/20"
                                      : "bg-muted/20 hover:bg-accent/10"
                                  )}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={cn(
                                      "w-9 h-9 rounded-xl flex items-center justify-center font-bold border",
                                      (projectNode as any).is_general || projectNode.project_id === 'general'
                                        ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                                        : "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                    )}>
                                      {(projectNode as any).is_general || projectNode.project_id === 'general' ? (
                                        <FolderOpen className="w-4 h-4" />
                                      ) : (
                                        <Briefcase className="w-4 h-4" />
                                      )}
                                    </div>
                                    <div>
                                      <div className="flex flex-wrap items-center gap-2">
                                        {((projectNode as any).is_general || projectNode.project_id === 'general') ? (
                                          <h3 className="text-sm font-black text-amber-600 dark:text-amber-400">
                                            General / Direct Client Certificates
                                          </h3>
                                        ) : (
                                          <>
                                            <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                                              Project ID: {projectNode.project_id.length > 20 ? `GSS-PROJ-${projectNode.project_id.substring(0, 8).toUpperCase()}` : projectNode.project_id}
                                            </span>
                                            <h3 className="text-sm font-bold text-foreground">{projectNode.project_name}</h3>
                                          </>
                                        )}
                                        <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest bg-muted px-2 py-0.5 rounded-md border border-border">
                                          {projectNode.certificates.length} {projectNode.certificates.length === 1 ? 'Certificate' : 'Certificates'}
                                        </span>
                                        {projectNode.status && (projectNode as any).project_id !== 'general' && (
                                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                            {projectNode.status}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[11px] text-muted-foreground mt-0.5">
                                        {(projectNode as any).is_general || projectNode.project_id === 'general'
                                          ? 'Certificates stored directly under client without specific project assignment'
                                          : (projectNode.description || 'Institutional safety inspection project')}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    {isProjExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                  </div>
                                </div>

                                {/* Certificates Table inside Project Node */}
                                {isProjExpanded && (
                                  <div className="border-t border-border/60 overflow-x-auto">
                                    {projectNode.certificates.length === 0 ? (
                                      <div className="text-xs text-muted-foreground italic p-4 text-center">
                                        No certificates currently placed in this project folder.
                                      </div>
                                    ) : (
                                      <table className="w-full text-left text-xs">
                                        <thead className="bg-muted/50 border-b border-border/60 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                          <tr>
                                            <th className="px-5 py-3">Certificate Info</th>
                                            <th className="px-4 py-3">Client & Project</th>
                                            <th className="px-4 py-3">Validity Dates</th>
                                            <th className="px-4 py-3">Status</th>
                                            <th className="px-5 py-3 text-right">Actions</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/40">
                                          {projectNode.certificates.map((cert) => (
                                            <tr key={cert.id} className="hover:bg-accent/5 transition-colors group">
                                              <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                                                    <FileDigit className="w-4 h-4" />
                                                  </div>
                                                  <div>
                                                    <span className="font-bold text-foreground block max-w-[240px] truncate">{cert.name}</span>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                      <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                                                        {cert.certificate_number}
                                                      </span>
                                                      <span className="text-[10px] font-medium text-muted-foreground">
                                                        {cert.certificate_type}
                                                      </span>
                                                    </div>
                                                  </div>
                                                </div>
                                              </td>
                                              <td className="px-4 py-4">
                                                <div className="space-y-0.5">
                                                  <div className="font-bold text-foreground text-xs">{cert.client_name}</div>
                                                  <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                                                    {cert.project_name}
                                                  </div>
                                                </div>
                                              </td>
                                              <td className="px-4 py-4">
                                                <div className="space-y-1 text-[11px]">
                                                  <div><span className="text-muted-foreground">Issued:</span> <span className="font-semibold text-foreground">{cert.issue_date}</span></div>
                                                  <div><span className="text-muted-foreground">Expires:</span> <span className="font-semibold text-foreground">{cert.expiry_date || 'N/A'}</span></div>
                                                </div>
                                              </td>
                                              <td className="px-4 py-4">
                                                {renderStatusBadge(cert.status)}
                                              </td>
                                              <td className="px-5 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                  {!isClient && (
                                                    <Button
                                                      size="sm"
                                                      variant="outline"
                                                      onClick={() => handleOpenEditCert(cert)}
                                                      className="h-8 px-2.5 text-xs font-bold border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                                                      title="Edit Certificate Details"
                                                    >
                                                      <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                                                    </Button>
                                                  )}

                                                  <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                      setSelectedPreviewCert(cert);
                                                      setPreviewOpen(true);
                                                    }}
                                                    className="h-8 px-3 text-xs font-bold border-border/80 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all"
                                                  >
                                                    <Eye className="w-3.5 h-3.5 mr-1" /> View
                                                  </Button>

                                                  <Button
                                                    size="sm"
                                                    onClick={() => handleDownload(cert.file_url, cert.name)}
                                                    className="h-8 px-3 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm border-0 transition-all"
                                                  >
                                                    <Download className="w-3.5 h-3.5 mr-1" /> Download
                                                  </Button>

                                                  {!isClient && (
                                                    <Button
                                                      size="sm"
                                                      variant="outline"
                                                      disabled={emailingCertId === cert.id}
                                                      onClick={() => handleEmailCertificate(cert.id)}
                                                      className="h-8 px-3 text-xs font-bold border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
                                                    >
                                                      {emailingCertId === cert.id ? (
                                                        <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                                                      ) : (
                                                        <Mail className="w-3.5 h-3.5 mr-1" />
                                                      )}
                                                      Email Cert
                                                    </Button>
                                                  )}

                                                  <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleOpenAuditHistory(cert.id)}
                                                    className="h-8 px-2 text-xs font-bold text-muted-foreground hover:text-foreground"
                                                    title="View Audit Trail"
                                                  >
                                                    <History className="w-3.5 h-3.5 mr-1" /> History
                                                  </Button>
                                                </div>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* IMAGES VIEW (Inspection Image Vault) */}
        {viewMode === "IMAGES" && (
          <div className="p-6">
            <InspectionImageVaultView token={token || ""} />
          </div>
        )}

        {/* REGISTRY / FLAT VIEW TABLE */}
        {viewMode === "REGISTRY" && (
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
                ) : documents.filter(d => {
                  const q = searchQuery.toLowerCase().trim();
                  if (!q) return true;
                  return d.name.toLowerCase().includes(q) ||
                    (d.client?.name || "").toLowerCase().includes(q) ||
                    (d.project?.name || "").toLowerCase().includes(q);
                }).map((doc) => {
                  // Compute dynamic status
                  let status = "ACTIVE";
                  if (doc.expiry_date) {
                    const exp = new Date(doc.expiry_date).getTime();
                    const now = new Date().getTime();
                    if (exp < now) status = "EXPIRED";
                    else if (exp - now <= 30 * 24 * 60 * 60 * 1000) status = "DUE_SOON";
                  }

                  return (
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
                            {doc.project?.name || "General Storage"}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="space-y-1 text-xs">
                          <div><span className="text-muted-foreground">Test:</span> <span className="font-semibold">{doc.test_date ? new Date(doc.test_date).toLocaleDateString() : 'N/A'}</span></div>
                          <div><span className="text-muted-foreground">Expiry:</span> <span className="font-semibold">{doc.expiry_date ? new Date(doc.expiry_date).toLocaleDateString() : 'N/A'}</span></div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        {renderStatusBadge(status)}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleView(doc.file_url)} className="h-8 px-3 text-xs font-bold border-border/80">
                            <Eye className="w-3.5 h-3.5 mr-1" /> View
                          </Button>
                          <Button size="sm" onClick={() => handleDownload(doc.file_url, doc.name)} className="h-8 px-3 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white border-0">
                            <Download className="w-3.5 h-3.5 mr-1" /> Download
                          </Button>
                          {!isClient && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={emailingCertId === doc.id}
                              onClick={() => handleEmailCertificate(doc.id)}
                              className="h-8 px-3 text-xs font-bold border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
                            >
                              {emailingCertId === doc.id ? (
                                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                              ) : (
                                <Mail className="w-3.5 h-3.5 mr-1" />
                              )}
                              Email Cert
                            </Button>
                          )}
                          {!isClient && (
                            <Button size="sm" variant="ghost" onClick={() => handleDelete(doc.id)} className="h-8 w-8 p-0 text-rose-500 hover:bg-rose-500/10">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Certificate Details Preview Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-[650px] bg-card border-border text-foreground shadow-2xl rounded-3xl p-6 relative max-h-[80vh] overflow-y-auto">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-500" />
          
          {selectedPreviewCert && (
            <div className="space-y-6 mt-2">
              <div className="flex items-start justify-between border-b border-border pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-foreground">{selectedPreviewCert.name}</h2>
                    {renderStatusBadge(selectedPreviewCert.status)}
                  </div>
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                    {selectedPreviewCert.certificate_number} • {selectedPreviewCert.certificate_type}
                  </p>
                </div>
              </div>

              {/* Information Grid */}
              <div className="grid grid-cols-2 gap-4 bg-muted/40 p-4 rounded-2xl border border-border/70 text-xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Client Owner</span>
                  <span className="font-bold text-foreground text-sm">{selectedPreviewCert.client_name}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Project Name</span>
                  <span className="font-bold text-foreground text-sm">{selectedPreviewCert.project_name}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Issue Date</span>
                  <span className="font-bold text-foreground">{selectedPreviewCert.issue_date}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Expiry Date</span>
                  <span className="font-bold text-foreground">{selectedPreviewCert.expiry_date || 'Permanent / No Expiry'}</span>
                </div>
                {selectedPreviewCert.due_date && (
                  <div className="space-y-1 col-span-2 border-t border-border/50 pt-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Renewal Due Date</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">{selectedPreviewCert.due_date}</span>
                  </div>
                )}
                {selectedPreviewCert.updated_at && (
                  <div className="space-y-1 col-span-2 border-t border-border/50 pt-2 flex items-center justify-between text-[11px]">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Last Updated Date</span>
                    <span className="font-medium text-muted-foreground">{new Date(selectedPreviewCert.updated_at).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                )}
              </div>

              {/* Delivery Receipt Section */}
              <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm space-y-4 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                      <FileCheck2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">Delivery Receipt</h3>
                      <p className="text-[10px] text-muted-foreground font-medium">Physical proof of client delivery</p>
                    </div>
                  </div>

                  {selectedPreviewCert.delivery_receipt_url ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      ✓ RECEIPT VERIFIED
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground border border-border">
                      NO RECEIPT ATTACHED
                    </span>
                  )}
                </div>

                {selectedPreviewCert.delivery_receipt_url ? (
                  /* Existing Receipt View */
                  <div className="p-4 rounded-xl bg-muted/30 border border-border/60 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-lg bg-background border border-border shrink-0">
                          {selectedPreviewCert.delivery_receipt_type === 'IMAGE' ? (
                            <ImageIcon className="w-5 h-5 text-purple-500" />
                          ) : (
                            <FileText className="w-5 h-5 text-red-500" />
                          )}
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-foreground line-clamp-1">
                            {selectedPreviewCert.delivery_receipt_name || 'Delivery Receipt'}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <span>Uploaded by: <strong className="text-foreground">{selectedPreviewCert.receipt_uploader_name || 'Staff'}</strong></span>
                            <span>•</span>
                            <span>{selectedPreviewCert.delivery_receipt_uploaded_at ? new Date(selectedPreviewCert.delivery_receipt_uploaded_at).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Receipt Action Buttons */}
                    <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-border/40">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleView(selectedPreviewCert.delivery_receipt_url!)}
                        className="h-8 px-3 text-xs font-bold text-blue-600 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" /> View Receipt
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDownload(selectedPreviewCert.delivery_receipt_url!, selectedPreviewCert.delivery_receipt_name || 'Delivery-Receipt')}
                        className="h-8 px-3 text-xs font-bold text-emerald-600 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg"
                      >
                        <Download className="w-3.5 h-3.5 mr-1" /> Download
                      </Button>

                      {!isClient && (
                        <>
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              accept=".jpg,.jpeg,.png,.pdf"
                              disabled={uploadingReceipt}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleDeliveryReceiptUpload(f);
                              }}
                              className="hidden"
                            />
                            <span className="inline-flex items-center justify-center h-8 px-3 text-xs font-bold text-amber-600 hover:text-amber-500 hover:bg-amber-500/10 rounded-lg transition-colors">
                              <RefreshCw className={cn("w-3.5 h-3.5 mr-1", uploadingReceipt && "animate-spin")} />
                              {uploadingReceipt ? "Replacing..." : "Replace"}
                            </span>
                          </label>

                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={deletingReceipt}
                            onClick={handleDeliveryReceiptDelete}
                            className="h-8 px-3 text-xs font-bold text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Upload Receipt Button / Dropzone */
                  <div>
                    {!isClient ? (
                      <label className="block cursor-pointer group">
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png,.pdf"
                          disabled={uploadingReceipt}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleDeliveryReceiptUpload(f);
                          }}
                          className="hidden"
                        />
                        <div className="p-4 rounded-xl border-2 border-dashed border-border group-hover:border-amber-500/50 bg-muted/20 group-hover:bg-amber-500/5 transition-all flex flex-col items-center justify-center space-y-2">
                          <UploadCloud className="w-6 h-6 text-muted-foreground group-hover:text-amber-500 transition-colors" />
                          <div className="text-center">
                            <p className="text-xs font-bold text-foreground">
                              {uploadingReceipt ? "Uploading Delivery Receipt..." : "Upload Physical Delivery Receipt"}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-medium">Supported Formats: JPG, PNG, PDF (Max 10MB)</p>
                          </div>
                        </div>
                      </label>
                    ) : (
                      <p className="text-xs text-muted-foreground italic text-center py-2">No physical delivery receipt uploaded yet.</p>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setPreviewOpen(false)}
                  className="px-5 h-11 text-xs font-bold rounded-xl"
                >
                  Close
                </Button>

                <Button
                  onClick={() => handleView(selectedPreviewCert.file_url)}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 h-11 text-xs rounded-xl border-0"
                >
                  <Eye className="w-4 h-4 mr-2" /> View Certificate
                </Button>

                <Button
                  onClick={() => handleDownload(selectedPreviewCert.file_url, selectedPreviewCert.name)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 h-11 text-xs rounded-xl border-0"
                >
                  <Download className="w-4 h-4 mr-2" /> Download PDF
                </Button>

                {!isClient && (
                  <Button
                    disabled={emailingCertId === selectedPreviewCert.id}
                    onClick={() => handleEmailCertificate(selectedPreviewCert.id)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 h-11 text-xs rounded-xl border-0"
                  >
                    {emailingCertId === selectedPreviewCert.id ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Mail className="w-4 h-4 mr-2" />
                    )}
                    Email Certificate
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Certificate Modal */}
      <Dialog open={editCertOpen} onOpenChange={setEditCertOpen}>
        <DialogContent className="sm:max-w-[600px] bg-card border-border text-foreground shadow-2xl rounded-3xl p-6 relative max-h-[85vh] overflow-y-auto">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500" />
          
          <DialogHeader>
            <DialogTitle className="text-xl font-black flex items-center gap-2">
              <Pencil className="w-5 h-5 text-amber-500" /> Edit Certificate Information
            </DialogTitle>
            <DialogDescription className="text-xs">
              Update certificate details. Changes will automatically synchronize across all ERP views, PDF exports, and client portal.
            </DialogDescription>
          </DialogHeader>

          {editingCertDoc && (
            <form onSubmit={handleSaveEditCert} className="space-y-4 mt-2">
              {/* Read Only Badges */}
              <div className="p-3 bg-muted/40 border border-border/80 rounded-2xl grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Client Name (Locked)</span>
                  <p className="font-bold text-foreground truncate">{editingCertDoc.client_name || editingCertDoc.client?.name || "N/A"}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Project (Locked)</span>
                  <p className="font-bold text-foreground truncate">{editingCertDoc.project_name || editingCertDoc.project?.name || "General / Direct Client"}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Inspection Name / Scope</Label>
                  <Input
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="h-10 text-xs bg-background border-border"
                    placeholder="e.g. Forklift Inspection Certificate"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold">Certificate Ref No</Label>
                  <Input
                    value={editForm.certificate_number}
                    onChange={(e) => setEditForm({ ...editForm, certificate_number: e.target.value })}
                    className="h-10 text-xs bg-background border-border font-mono font-bold text-blue-600 dark:text-blue-400"
                    placeholder="e.g. GSS-CERT-2026-001"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold">Issue / Test Date</Label>
                  <Input
                    type="date"
                    value={editForm.issue_date}
                    onChange={(e) => setEditForm({ ...editForm, issue_date: e.target.value })}
                    className="h-10 text-xs bg-background border-border"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold">Validity Period</Label>
                  <select
                    value={editForm.validity_period}
                    onChange={(e) => setEditForm({ ...editForm, validity_period: e.target.value })}
                    className="w-full h-10 px-3 bg-background border border-border rounded-xl text-xs font-semibold"
                  >
                    <option value="1 Year">1 Year</option>
                    <option value="2 Years">2 Years</option>
                    <option value="3 Years">3 Years</option>
                    <option value="6 Months">6 Months</option>
                  </select>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <Label className="text-xs font-bold">Expiry Date</Label>
                  <Input
                    type="date"
                    value={editForm.expiry_date}
                    onChange={(e) => setEditForm({ ...editForm, expiry_date: e.target.value })}
                    className="h-10 text-xs bg-background border-border font-bold text-rose-600 dark:text-rose-400"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <Label className="text-xs font-bold">Certificate Remarks / Notes</Label>
                  <Input
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    className="h-10 text-xs bg-background border-border"
                    placeholder="Optional remarks or inspector observations"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <Label className="text-xs font-bold">Reason for Edit (Required for Audit Log)</Label>
                  <Input
                    required
                    value={editForm.reason}
                    onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
                    className="h-10 text-xs bg-background border-border"
                    placeholder="e.g. Corrected typo in serial number / Updated validity date per client request"
                  />
                </div>
              </div>

              <DialogFooter className="pt-3 border-t border-border flex items-center justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEditCertOpen(false)}
                  className="h-9 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={savingEdit}
                  className="h-9 px-5 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white"
                >
                  {savingEdit ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
                  Save & Synchronize ERP
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Audit Log History Modal */}
      <Dialog open={auditHistoryOpen} onOpenChange={setAuditHistoryOpen}>
        <DialogContent className="sm:max-w-[650px] bg-card border-border text-foreground shadow-2xl rounded-3xl p-6 relative max-h-[85vh] overflow-y-auto">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600" />
          
          <DialogHeader>
            <DialogTitle className="text-xl font-black flex items-center gap-2">
              <History className="w-5 h-5 text-blue-600" /> Certificate Audit Trail
            </DialogTitle>
            <DialogDescription className="text-xs">
              Complete chronological audit history of all edits made to this certificate.
            </DialogDescription>
          </DialogHeader>

          {loadingAuditLogs ? (
            <div className="p-8 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" /> Loading audit history...
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground bg-muted/20 border border-dashed border-border rounded-2xl">
              No edit history found for this certificate. It is in its original state.
            </div>
          ) : (
            <div className="space-y-3 mt-2">
              {auditLogs.map((log) => {
                let changedFieldsList: string[] = [];
                let oldVals: any = {};
                let newVals: any = {};
                try {
                  changedFieldsList = JSON.parse(log.changed_fields || "[]");
                  oldVals = JSON.parse(log.previous_values || "{}");
                  newVals = JSON.parse(log.new_values || "{}");
                } catch (e) {}

                return (
                  <div key={log.id} className="p-4 bg-muted/30 border border-border/80 rounded-2xl space-y-2 text-xs">
                    <div className="flex items-center justify-between border-b border-border/50 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground text-sm">{log.edited_by_name}</span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-500/10 text-blue-600 border border-blue-500/20">
                          {log.user_role}
                        </span>
                      </div>
                      <span className="text-[11px] text-muted-foreground font-semibold">
                        {new Date(log.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                    </div>

                    {log.reason && (
                      <p className="text-xs font-semibold text-foreground/80 italic bg-background/60 p-2 rounded-xl border border-border/40">
                        "{log.reason}"
                      </p>
                    )}

                    <div className="space-y-1 pt-1">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">Changed Fields:</span>
                      <div className="space-y-1">
                        {changedFieldsList.map((f) => (
                          <div key={f} className="flex items-center justify-between bg-background p-2 rounded-lg border border-border/60 text-[11px]">
                            <span className="font-bold capitalize text-blue-600 dark:text-blue-400">{f.replace('_', ' ')}:</span>
                            <div className="flex items-center gap-2">
                              <span className="line-through text-rose-500">{String(oldVals[f] || 'Empty')}</span>
                              <span>➔</span>
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">{String(newVals[f] || 'Empty')}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
