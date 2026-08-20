"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth";
import { API_BASE_URL } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Mail,
  Server,
  FileCode,
  Brush,
  BellRing,
  History,
  Send,
  Layers,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  Trash2,
  Edit,
  Save,
  RefreshCw,
  Eye,
  SlidersHorizontal,
  Lock,
  BarChart3,
  RotateCcw,
  Activity,
  AlertTriangle,
  MessageSquare,
  Download,
  Search,
} from "lucide-react";

export default function EmailManagementPage() {
  const token = useAuthStore((state) => state.token);
  const [activeTab, setActiveTab] = useState<
    "smtp" | "templates" | "branding" | "rules" | "logs" | "test" | "queue" | "analytics" | "whatsapp-logs" | "whatsapp-templates"
  >("smtp");

  const [loading, setLoading] = useState(true);

  // 1. SMTP Config State
  const [smtpConfig, setSmtpConfig] = useState({
    host: "",
    port: 587,
    username: "",
    password_encrypted: "",
    sender_name: "",
    sender_email: "",
    reply_to_email: "",
    encryption_type: "TLS",
    is_active: true,
  });

  // 2. Email Templates State
  const [templates, setTemplates] = useState<any[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);

  // Preview Modal State
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // 3. Email Branding State
  const [branding, setBranding] = useState({
    company_name: "",
    company_logo_url: "",
    address: "",
    website: "",
    phone: "",
    footer_text: "",
    social_links: "",
  });

  // 4. Notification Rules State
  const [rules, setRules] = useState<any[]>([]);

  // 5. Email Logs State
  const [logs, setLogs] = useState<any[]>([]);
  const [logFilter, setLogFilter] = useState("ALL");

  // 6. Test Email State
  const [testRecipient, setTestRecipient] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [verifyingSmtp, setVerifyingSmtp] = useState(false);

  // 7. Queue Metrics State
  const [queueStats, setQueueStats] = useState({
    active_jobs: 0,
    waiting_jobs: 2,
    failed_jobs: 1,
    completed_today: 48,
    queue_status: "RUNNING",
    uptime_seconds: 86400,
  });

  const [analyticsStats, setAnalyticsStats] = useState<any>({
    total_sent: 0,
    total_failed: 0,
    total_pending: 0,
    today_emails: 0,
    delivery_rate: "100.0%",
    most_used_templates: [],
    most_active_modules: [],
  });

  const [queueItems, setQueueItems] = useState<any[]>([]);
  const [queueFilterStatus, setQueueFilterStatus] = useState<string>("ALL");
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [retryingAll, setRetryingAll] = useState(false);

  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditModalOpen, setAuditModalOpen] = useState(false);

  // WhatsApp Logs States
  const [whatsappLogs, setWhatsappLogs] = useState<any[]>([]);
  const [waSearch, setWaSearch] = useState("");
  const [waStatusFilter, setWaStatusFilter] = useState("ALL");
  const [waPage, setWaPage] = useState(1);
  const [waTotalPages, setWaTotalPages] = useState(1);
  const [retryingWaId, setRetryingWaId] = useState<string | null>(null);
  const [selectedWaLog, setSelectedWaLog] = useState<any | null>(null);
  const [waLogDetailOpen, setWaLogDetailOpen] = useState(false);

  // WhatsApp Analytics States
  const [waAnalytics, setWaAnalytics] = useState<any>({
    total_sent: 0,
    total_failed: 0,
    total_pending: 0,
    today_whatsapp: 0,
    delivery_rate: "100.0%",
    read_rate: "0.0%",
    quota_stats: {
      quota_limit: 250,
      quota_used: 0,
      percentage: "0.0",
      status: "NORMAL",
    },
    daily_metrics: [],
    template_breakdown: [],
  });

  // WhatsApp Templates States
  const [waTemplates, setWaTemplates] = useState<any[]>([]);
  const [editingWaTemplate, setEditingWaTemplate] = useState<any | null>(null);

  const handleSaveWaTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editingWaTemplate) return;
    const isNew = editingWaTemplate.id.startsWith("new-");
    const method = isNew ? "POST" : "PATCH";
    const url = isNew
      ? `${API_BASE_URL}/whatsapp-templates`
      : `${API_BASE_URL}/whatsapp-templates/${editingWaTemplate.id}`;

    try {
      JSON.parse(editingWaTemplate.variables_map);
    } catch {
      toast.error("Variables mapping must be a valid JSON object string.");
      return;
    }

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editingWaTemplate.name,
          code: editingWaTemplate.code,
          template_name: editingWaTemplate.template_name,
          variables_map: editingWaTemplate.variables_map,
          is_active: editingWaTemplate.is_active,
        }),
      });

      if (res.ok) {
        toast.success(isNew ? "WhatsApp template created!" : "WhatsApp template updated!");
        setEditingWaTemplate(null);
        fetchAllData();
      } else {
        const errorData = await res.json();
        toast.error(errorData.message || "Failed to save template.");
      }
    } catch {
      toast.error("Network error saving WhatsApp template.");
    }
  };

  const handleDeleteWaTemplate = async (tplId: string) => {
    if (!token || !confirm("Are you sure you want to delete this WhatsApp template?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/whatsapp-templates/${tplId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success("WhatsApp template deleted!");
        fetchAllData();
      } else {
        toast.error("Failed to delete template.");
      }
    } catch {
      toast.error("Network error deleting template.");
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [token, queueFilterStatus]);

  const fetchWhatsAppLogs = async () => {
    if (!token) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/whatsapp-logs?status=${waStatusFilter}&search=${waSearch}&page=${waPage}&limit=15`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setWhatsappLogs(data.items || []);
        setWaTotalPages(data.totalPages || 1);
      }
    } catch (e) {
      console.error("Error fetching WhatsApp logs:", e);
    }
  };

  useEffect(() => {
    fetchWhatsAppLogs();
  }, [token, waStatusFilter, waSearch, waPage]);

  const handleRetryWaLog = async (logId: string) => {
    if (!token) return;
    setRetryingWaId(logId);
    try {
      const res = await fetch(`${API_BASE_URL}/whatsapp-logs/${logId}/retry`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || "Message re-queued successfully!");
        fetchWhatsAppLogs();
      } else {
        toast.error(data.message || "Failed to retry message.");
      }
    } catch {
      toast.error("Network error retrying message.");
    } finally {
      setRetryingWaId(null);
    }
  };

  const handleExportWaLogsCSV = () => {
    if (whatsappLogs.length === 0) {
      toast.error("No log data to export");
      return;
    }
    const headers = ["ID", "Recipient", "Status", "Template", "Provider", "Environment", "Created At", "Failure Reason"];
    const rows = whatsappLogs.map(log => [
      log.id,
      log.recipient,
      log.status,
      log.template_code,
      log.provider,
      log.environment,
      new Date(log.created_at).toLocaleString(),
      log.failure_reason || ""
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `whatsapp_logs_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV export triggered successfully!");
  };

  const fetchAllData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [smtpRes, tplRes, brandRes, ruleRes, logRes, queueRes, queueItemsRes, analyticsRes, auditRes, waAnalyticsRes, waTemplatesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/email-management/smtp`, { headers }),
        fetch(`${API_BASE_URL}/email-management/templates`, { headers }),
        fetch(`${API_BASE_URL}/email-management/branding`, { headers }),
        fetch(`${API_BASE_URL}/email-management/rules`, { headers }),
        fetch(`${API_BASE_URL}/email-management/logs`, { headers }),
        fetch(`${API_BASE_URL}/email-management/queue`, { headers }),
        fetch(`${API_BASE_URL}/email-management/queue/items?status=${queueFilterStatus}`, { headers }),
        fetch(`${API_BASE_URL}/email-management/analytics/stats`, { headers }),
        fetch(`${API_BASE_URL}/email-management/rules/audit-logs`, { headers }),
        fetch(`${API_BASE_URL}/whatsapp-logs/analytics/stats`, { headers }),
        fetch(`${API_BASE_URL}/whatsapp-templates`, { headers }),
      ]);
 
      if (smtpRes.ok) setSmtpConfig(await smtpRes.json());
      if (tplRes.ok) setTemplates(await tplRes.json());
      if (brandRes.ok) setBranding(await brandRes.json());
      if (ruleRes.ok) setRules(await ruleRes.json());
      if (logRes.ok) setLogs(await logRes.json());
      if (queueRes.ok) setQueueStats(await queueRes.json());
      if (waTemplatesRes && waTemplatesRes.ok) setWaTemplates(await waTemplatesRes.json());
      if (queueItemsRes.ok) {
        const qData = await queueItemsRes.json();
        setQueueItems(qData.items || []);
      }
      if (analyticsRes.ok) setAnalyticsStats(await analyticsRes.json());
      if (auditRes.ok) setAuditLogs(await auditRes.json());
      if (waAnalyticsRes.ok) setWaAnalytics(await waAnalyticsRes.json());
    } catch (err) {
      console.error("Error fetching email management data:", err);
    } finally {
      setLoading(false);
    }
  };

  // --- HANDLERS ---
  const handlePreviewTemplate = async (tpl: any) => {
    setPreviewLoading(true);
    setPreviewModalOpen(true);
    try {
      const res = await fetch(`${API_BASE_URL}/email-management/templates/preview`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: tpl.code, id: tpl.id }),
      });

      if (res.ok) {
        setPreviewData(await res.json());
      } else {
        toast.error("Failed to generate template preview");
      }
    } catch {
      toast.error("Error connecting to template preview engine");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleVerifySmtp = async () => {
    setVerifyingSmtp(true);
    try {
      const res = await fetch(`${API_BASE_URL}/email-management/smtp/verify`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || "SMTP connection verified successfully!");
      } else {
        toast.error(data.message || "SMTP connection test failed.");
      }
    } catch (err: any) {
      toast.error(err?.message || "SMTP is not configured. Please configure SMTP settings.");
    } finally {
      setVerifyingSmtp(false);
    }
  };

  const handleSaveSmtp = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/email-management/smtp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(smtpConfig),
      });
      if (res.ok) {
        toast.success("SMTP Configuration saved successfully!");
      } else {
        toast.error("Failed to save SMTP Configuration");
      }
    } catch {
      toast.error("Connection error saving SMTP configuration");
    }
  };

  const handleSaveBranding = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/email-management/branding`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(branding),
      });
      if (res.ok) {
        toast.success("Email Branding saved successfully!");
      } else {
        toast.error("Failed to save branding");
      }
    } catch {
      toast.error("Connection error saving branding");
    }
  };

  const handleSaveTemplate = async () => {
    if (!editingTemplate) return;
    try {
      const isNew = !editingTemplate.id || editingTemplate.id.startsWith("new-");
      const url = isNew
        ? `${API_BASE_URL}/email-management/templates`
        : `${API_BASE_URL}/email-management/templates/${editingTemplate.id}`;
      const method = isNew ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editingTemplate),
      });

      if (res.ok) {
        toast.success(isNew ? "Email Template created!" : "Email Template updated!");
        setEditingTemplate(null);
        fetchAllData();
      } else {
        toast.error("Failed to save template");
      }
    } catch {
      toast.error("Connection error saving template");
    }
  };

  const handleToggleRule = async (ruleId: string, currentVal: boolean, channel: 'email' | 'whatsapp') => {
    // Optimistic UI state update
    setRules((prevRules) =>
      prevRules.map((r) => {
        if (r.id === ruleId || r.event_name === ruleId) {
          if (channel === 'email') {
            return { ...r, is_email_enabled: !currentVal };
          } else {
            let adv: Record<string, any> = {};
            if (r.advanced_config) {
              try {
                adv = JSON.parse(r.advanced_config);
              } catch {}
            }
            adv.whatsapp_enabled = !currentVal;
            return { ...r, advanced_config: JSON.stringify(adv) };
          }
        }
        return r;
      })
    );

    try {
      const payload: Record<string, any> = {};
      if (channel === 'email') {
        payload.is_email_enabled = !currentVal;
      } else {
        payload.is_whatsapp_enabled = !currentVal;
      }

      const res = await fetch(`${API_BASE_URL}/email-management/rules/${ruleId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(`${channel === 'email' ? 'Email' : 'WhatsApp'} channel ${!currentVal ? "enabled" : "disabled"}`);
        fetchAllData();
      } else {
        toast.error("Failed to update notification rule");
        fetchAllData(); // Revert on failure
      }
    } catch {
      toast.error("Error updating notification rule");
      fetchAllData();
    }
  };

  const handleEnableAllRules = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/email-management/rules/enable-all`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success("All email notification rules ENABLED");
        fetchAllData();
      }
    } catch {
      toast.error("Error enabling all notification rules");
    }
  };

  const handleDisableAllRules = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/email-management/rules/disable-all`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success("All email notification rules DISABLED");
        fetchAllData();
      }
    } catch {
      toast.error("Error disabling all notification rules");
    }
  };

  const handleRestoreDefaultRules = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/email-management/rules/restore-defaults`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success("Default email notification rules RESTORED");
        fetchAllData();
      }
    } catch {
      toast.error("Error restoring default notification rules");
    }
  };

  const handleSendTestEmail = async () => {
    if (!testRecipient) {
      toast.error("Please enter a recipient email address");
      return;
    }
    setSendingTest(true);
    try {
      const res = await fetch(`${API_BASE_URL}/email-management/test-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ recipient: testRecipient }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(data.message || "Test email dispatched successfully!");
        fetchAllData();
      } else {
        toast.error(data.message || "SMTP is not configured. Please configure SMTP settings.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Error triggering test email");
    } finally {
      setSendingTest(false);
    }
  };

  const handleRetrySingle = async (id: string) => {
    if (!token) return;
    setRetryingId(id);
    try {
      const res = await fetch(`${API_BASE_URL}/email-management/queue/${id}/retry`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Email re-queued for sending!");
        fetchAllData();
      } else {
        toast.error(data.message || "Failed to retry email.");
      }
    } catch {
      toast.error("Network error retrying email.");
    } finally {
      setRetryingId(null);
    }
  };

  const handleRetryAll = async () => {
    if (!token) return;
    setRetryingAll(true);
    try {
      const res = await fetch(`${API_BASE_URL}/email-management/queue/retry-all`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "All failed emails re-queued!");
        fetchAllData();
      } else {
        toast.error(data.message || "Failed to retry emails.");
      }
    } catch {
      toast.error("Network error retrying emails.");
    } finally {
      setRetryingAll(false);
    }
  };

  const tabs = [
    { id: "smtp", label: "SMTP Config", icon: Server },
    { id: "templates", label: "Email Templates", icon: FileCode },
    { id: "branding", label: "Email Branding", icon: Brush },
    { id: "rules", label: "Notification Rules", icon: BellRing },
    { id: "logs", label: "Email Logs", icon: History },
    { id: "whatsapp-logs", label: "WhatsApp Logs", icon: MessageSquare },
    { id: "whatsapp-templates", label: "WhatsApp Templates", icon: SlidersHorizontal },
    { id: "test", label: "Test Email", icon: Send },
    { id: "queue", label: "Email Queue", icon: Layers },
    { id: "analytics", label: "Analytics & Health", icon: BarChart3 },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-foreground">
                Email Management
              </h1>
              <p className="text-muted-foreground text-sm font-medium">
                Centralized SMTP infrastructure, email templates, branding & delivery monitoring
              </p>
            </div>
          </div>
        </div>

        <Button
          onClick={fetchAllData}
          variant="outline"
          className="rounded-xl font-bold bg-card border-border hover:bg-accent"
        >
          <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
          Sync Data
        </Button>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-border scrollbar-hide">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap btn-tactile",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: SMTP CONFIGURATION */}
      {activeTab === "smtp" && (
        <div className="bg-card border border-border rounded-3xl p-8 shadow-xs space-y-6">
          {!loading && (!smtpConfig.host || !smtpConfig.username || !smtpConfig.is_active) && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 text-amber-600 dark:text-amber-400 text-sm font-bold">
              <Lock className="w-5 h-5 shrink-0" />
              <span>SMTP is not configured. Please configure SMTP settings.</span>
            </div>
          )}

          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <h3 className="text-xl font-bold text-foreground">SMTP Server Credentials</h3>
              <p className="text-muted-foreground text-xs font-medium">
                Configure your outbound mail gateway parameters for system email dispatches.
              </p>
            </div>
            {loading ? (
              <span className="px-3 py-1 rounded-full text-xs font-bold text-muted-foreground bg-accent animate-pulse">
                Loading...
              </span>
            ) : (
              <span
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border",
                  smtpConfig.host && smtpConfig.username && smtpConfig.is_active
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                )}
              >
                {smtpConfig.host && smtpConfig.username && smtpConfig.is_active
                  ? "Active Transport"
                  : "Unconfigured"}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase">SMTP Host</label>
              <Input
                value={smtpConfig.host}
                onChange={(e) => setSmtpConfig({ ...smtpConfig, host: e.target.value })}
                placeholder="smtp.gmail.com or mail.domain.com"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase">SMTP Port</label>
              <Input
                type="number"
                value={smtpConfig.port}
                onChange={(e) => setSmtpConfig({ ...smtpConfig, port: Number(e.target.value) })}
                placeholder="587 or 465"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase">SMTP Username</label>
              <Input
                value={smtpConfig.username}
                onChange={(e) => setSmtpConfig({ ...smtpConfig, username: e.target.value })}
                placeholder="notifications@globalsafety.com"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase">
                SMTP Password (Encrypted)
              </label>
              <Input
                type="password"
                value={smtpConfig.password_encrypted}
                onChange={(e) => setSmtpConfig({ ...smtpConfig, password_encrypted: e.target.value })}
                placeholder="••••••••••••••••"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase">Sender Name</label>
              <Input
                value={smtpConfig.sender_name}
                onChange={(e) => setSmtpConfig({ ...smtpConfig, sender_name: e.target.value })}
                placeholder="Global Safety Solution ERP"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase">Sender Email</label>
              <Input
                value={smtpConfig.sender_email}
                onChange={(e) => setSmtpConfig({ ...smtpConfig, sender_email: e.target.value })}
                placeholder="noreply@globalsafety.com"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase">Reply-To Email</label>
              <Input
                value={smtpConfig.reply_to_email || ""}
                onChange={(e) => setSmtpConfig({ ...smtpConfig, reply_to_email: e.target.value })}
                placeholder="support@globalsafety.com"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase">Encryption Type</label>
              <select
                value={smtpConfig.encryption_type}
                onChange={(e) => setSmtpConfig({ ...smtpConfig, encryption_type: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm font-medium text-foreground outline-none"
              >
                <option value="TLS">STARTTLS / TLS (Port 587)</option>
                <option value="SSL">SSL / TLS (Port 465)</option>
                <option value="NONE">None (Port 25)</option>
              </select>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={handleVerifySmtp}
              disabled={verifyingSmtp}
              className="font-bold rounded-xl px-4 bg-card border-border"
            >
              <Server className={cn("w-4 h-4 mr-2", verifyingSmtp && "animate-spin")} />
              {verifyingSmtp ? "Verifying..." : "Test Connection"}
            </Button>

            <Button onClick={handleSaveSmtp} className="font-bold rounded-xl px-6">
              <Save className="w-4 h-4 mr-2" /> Save SMTP Configuration
            </Button>
          </div>
        </div>
      )}

      {/* TAB 2: EMAIL TEMPLATES */}
      {activeTab === "templates" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-foreground">Email Template Directory</h3>
            <Button
              onClick={() =>
                setEditingTemplate({
                  id: `new-${Date.now()}`,
                  name: "New Custom Template",
                  code: "CUSTOM_EVENT",
                  subject: "Template Subject Placeholder",
                  body_html: "<p>Write rich text email body here...</p>",
                  variables: JSON.stringify(["{client_name}", "{company_name}"]),
                  is_active: true,
                })
              }
              className="font-bold rounded-xl"
            >
              <Plus className="w-4 h-4 mr-2" /> Create Template
            </Button>
          </div>

          {editingTemplate ? (
            <div className="bg-card border border-border rounded-3xl p-8 space-y-6 shadow-xs">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <h4 className="text-lg font-bold">Edit Email Template</h4>
                <Button variant="ghost" onClick={() => setEditingTemplate(null)}>
                  Cancel
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase">
                    Template Name
                  </label>
                  <Input
                    value={editingTemplate.name}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Template Code</label>
                  <Input
                    value={editingTemplate.code}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, code: e.target.value })}
                  />
                </div>
                <div className="col-span-full space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase">
                    Subject Line
                  </label>
                  <Input
                    value={editingTemplate.subject}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                  />
                </div>
                <div className="col-span-full space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-muted-foreground uppercase">
                      HTML / Rich Text Body
                    </label>
                    <span className="text-[11px] text-muted-foreground font-medium">
                      Click variable tag to insert into template body
                    </span>
                  </div>

                  {/* Variable Placeholders Quick-Bar */}
                  <div className="flex flex-wrap gap-1.5 p-3 bg-muted/40 rounded-xl border border-border">
                    {[
                      "{{client_name}}",
                      "{{quotation_number}}",
                      "{{invoice_number}}",
                      "{{certificate_number}}",
                      "{{engineer_name}}",
                      "{{amount}}",
                      "{{expiry_date}}",
                      "{{company_name}}",
                    ].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() =>
                          setEditingTemplate({
                            ...editingTemplate,
                            body_html: (editingTemplate.body_html || "") + ` ${tag} `,
                          })
                        }
                        className="px-2 py-1 bg-card hover:bg-accent border border-border rounded-lg text-xs font-mono font-bold text-foreground transition-all active:scale-95"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>

                  <textarea
                    rows={8}
                    value={editingTemplate.body_html}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, body_html: e.target.value })}
                    className="w-full p-4 rounded-xl border border-border bg-background text-sm font-mono text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button
                  variant="outline"
                  onClick={() => handlePreviewTemplate(editingTemplate)}
                  className="font-bold rounded-xl bg-card border-border"
                >
                  <Eye className="w-4 h-4 mr-2" /> Live Preview
                </Button>
                <Button onClick={handleSaveTemplate} className="font-bold rounded-xl px-6">
                  <Save className="w-4 h-4 mr-2" /> Save Template
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="bg-card border border-border rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-4 hover:border-primary/40 transition-all card-lift"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                        {tpl.code}
                      </span>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[9px] font-black uppercase",
                          tpl.is_active
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {tpl.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <h4 className="text-lg font-bold text-foreground">{tpl.name}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2 font-medium">
                      Subject: {tpl.subject}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-border flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePreviewTemplate(tpl)}
                      className="rounded-xl font-bold bg-card border-border"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" /> Preview
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingTemplate(tpl)}
                      className="rounded-xl font-bold"
                    >
                      <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TEMPLATE LIVE PREVIEW MODAL */}
      {previewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-border flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-500/10 text-blue-500 rounded-xl">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    {previewData?.template_name || "Email Template Live Preview"}
                  </h3>
                  <p className="text-xs text-muted-foreground font-mono">
                    Code: {previewData?.template_code || "PREVIEW"}
                  </p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPreviewModalOpen(false)}
                className="rounded-full w-8 h-8 p-0"
              >
                <XCircle className="w-5 h-5 text-muted-foreground hover:text-foreground" />
              </Button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="p-4 bg-muted/40 rounded-2xl border border-border space-y-1 text-sm">
                <p className="text-xs font-bold text-muted-foreground uppercase">Subject Line:</p>
                <p className="font-bold text-foreground text-base">
                  {previewData?.subject || "Subject Preview..."}
                </p>
              </div>

              <div className="border border-border rounded-2xl overflow-hidden bg-white min-h-[400px]">
                {previewLoading ? (
                  <div className="h-[400px] flex items-center justify-center text-muted-foreground text-sm font-medium">
                    <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                    Compiling live template & layout...
                  </div>
                ) : (
                  <iframe
                    title="Template Live Preview"
                    srcDoc={previewData?.html || "<p>No preview data</p>"}
                    className="w-full h-[500px] border-0"
                  />
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border flex justify-end">
              <Button
                onClick={() => setPreviewModalOpen(false)}
                className="font-bold rounded-xl px-6"
              >
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: EMAIL BRANDING */}
      {activeTab === "branding" && (
        <div className="bg-card border border-border rounded-3xl p-8 shadow-xs space-y-6">
          <div className="border-b border-border pb-4">
            <h3 className="text-xl font-bold text-foreground">Global Email Footer & Branding</h3>
            <p className="text-muted-foreground text-xs font-medium">
              Set default company details, header logo, and social media signatures injected into outgoing emails.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase">Company Name</label>
              <Input
                value={branding.company_name}
                onChange={(e) => setBranding({ ...branding, company_name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase">Company Logo URL</label>
              <Input
                value={branding.company_logo_url || ""}
                onChange={(e) => setBranding({ ...branding, company_logo_url: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase">Website URL</label>
              <Input
                value={branding.website || ""}
                onChange={(e) => setBranding({ ...branding, website: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase">Phone Number</label>
              <Input
                value={branding.phone || ""}
                onChange={(e) => setBranding({ ...branding, phone: e.target.value })}
              />
            </div>

            <div className="col-span-full space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase">Office Address</label>
              <Input
                value={branding.address || ""}
                onChange={(e) => setBranding({ ...branding, address: e.target.value })}
              />
            </div>

            <div className="col-span-full space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase">Footer Legal Text</label>
              <textarea
                rows={3}
                value={branding.footer_text || ""}
                onChange={(e) => setBranding({ ...branding, footer_text: e.target.value })}
                className="w-full p-4 rounded-xl border border-border bg-background text-sm text-foreground outline-none"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <Button onClick={handleSaveBranding} className="font-bold rounded-xl px-6">
              <Save className="w-4 h-4 mr-2" /> Save Branding
            </Button>
          </div>
        </div>
      )}

      {/* TAB 4: NOTIFICATION RULES */}
      {activeTab === "rules" && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-3xl p-8 shadow-xs space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border pb-4">
              <div>
                <h3 className="text-xl font-bold text-foreground">Centralized Notification Rules Engine</h3>
                <p className="text-muted-foreground text-xs font-medium">
                  Enable or disable automatic email dispatches for individual ERP workflows. Business processes run uninterrupted even if email triggers are turned off.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full lg:w-auto">
                <Button
                  onClick={handleEnableAllRules}
                  variant="outline"
                  size="sm"
                  className="font-bold text-xs rounded-xl hover:bg-emerald-500/10 hover:text-emerald-500 w-full sm:w-auto justify-center"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 shrink-0" />
                  Enable All
                </Button>
                <Button
                  onClick={handleDisableAllRules}
                  variant="outline"
                  size="sm"
                  className="font-bold text-xs rounded-xl hover:bg-rose-500/10 hover:text-rose-500 w-full sm:w-auto justify-center"
                >
                  <XCircle className="w-3.5 h-3.5 mr-1 shrink-0" />
                  Disable All
                </Button>
                <Button
                  onClick={handleRestoreDefaultRules}
                  variant="outline"
                  size="sm"
                  className="font-bold text-xs rounded-xl w-full sm:w-auto justify-center"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1 shrink-0" />
                  Restore Defaults
                </Button>
                <Button
                  onClick={() => setAuditModalOpen(true)}
                  className="font-bold text-xs rounded-xl bg-primary text-primary-foreground w-full sm:w-auto justify-center"
                >
                  <History className="w-3.5 h-3.5 mr-1 shrink-0" />
                  Audit Trail ({auditLogs.length})
                </Button>
              </div>
            </div>

            {/* Grouped Rules List */}
            <div className="space-y-6">
              {["SALES", "OPERATIONS", "COMPLIANCE", "FINANCE", "CLIENTS"].map((moduleName) => {
                const moduleRules = rules.filter(
                  (r) => r.module.toUpperCase() === moduleName || (moduleName === "CLIENTS" && r.module.toUpperCase() === "CLIENT")
                );

                if (moduleRules.length === 0) return null;

                return (
                  <div key={moduleName} className="space-y-3">
                    <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1">
                      {moduleName} MODULE NOTIFICATIONS
                    </h4>

                    <div className="space-y-3">
                      {moduleRules.map((rule) => (
                        <div
                          key={rule.id}
                          className="p-4 rounded-2xl bg-muted/40 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 hover:border-border/80 transition-colors"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-foreground">{rule.event_name}</span>
                              <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-primary/10 text-primary shrink-0">
                                {rule.module}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                              {rule.description || "Automated system trigger"}
                            </p>
                          </div>

                          {(() => {
                            let isWAEnabled = false;
                            if (rule.advanced_config) {
                              try {
                                const config = JSON.parse(rule.advanced_config);
                                isWAEnabled = config.whatsapp_enabled === true;
                              } catch {}
                            }
                            return (
                              <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-6 shrink-0 bg-background/40 p-2.5 rounded-2xl border border-border/60 w-full sm:w-auto mt-1 sm:mt-0">
                                {/* EMAIL TOGGLE */}
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Email</span>
                                  <span
                                    className={cn(
                                      "text-[10px] font-black uppercase tracking-wider w-7 text-right",
                                      rule.is_email_enabled ? "text-indigo-500" : "text-muted-foreground"
                                    )}
                                  >
                                    {rule.is_email_enabled ? "ON" : "OFF"}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleRule(rule.id, rule.is_email_enabled, 'email')}
                                    className={cn(
                                      "w-10 h-5 rounded-full transition-colors relative flex items-center px-0.5 btn-tactile shrink-0",
                                      rule.is_email_enabled ? "bg-indigo-600" : "bg-muted-foreground/30"
                                    )}
                                  >
                                    <div
                                      className={cn(
                                        "w-4 h-4 rounded-full bg-white transition-transform shadow-sm",
                                        rule.is_email_enabled ? "translate-x-5" : "translate-x-0"
                                      )}
                                    />
                                  </button>
                                </div>

                                {/* WHATSAPP TOGGLE */}
                                <div className="flex items-center gap-2 border-l border-border/60 pl-3 sm:pl-4">
                                  <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">WhatsApp</span>
                                  <span
                                    className={cn(
                                      "text-[10px] font-black uppercase tracking-wider w-7 text-right",
                                      isWAEnabled ? "text-emerald-500" : "text-muted-foreground"
                                    )}
                                  >
                                    {isWAEnabled ? "ON" : "OFF"}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleRule(rule.id, isWAEnabled, 'whatsapp')}
                                    className={cn(
                                      "w-10 h-5 rounded-full transition-colors relative flex items-center px-0.5 btn-tactile shrink-0",
                                      isWAEnabled ? "bg-emerald-600" : "bg-muted-foreground/30"
                                    )}
                                  >
                                    <div
                                      className={cn(
                                        "w-4 h-4 rounded-full bg-white transition-transform shadow-sm",
                                        isWAEnabled ? "translate-x-5" : "translate-x-0"
                                      )}
                                    />
                                  </button>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* AUDIT TRAIL MODAL */}
      <Dialog open={auditModalOpen} onOpenChange={setAuditModalOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto rounded-3xl bg-card border-border p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
              <History className="w-5 h-5 text-primary" /> Notification Rule Audit Log
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Historical record of administrative changes to email automation rules with user, timestamp, and IP tracking.
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/60 text-muted-foreground text-xs uppercase font-black tracking-wider">
                <tr>
                  <th className="p-3 rounded-l-xl">User / Role</th>
                  <th className="p-3">Event Name</th>
                  <th className="p-3">Change</th>
                  <th className="p-3">IP Address</th>
                  <th className="p-3 rounded-r-xl">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-muted-foreground font-medium">
                      No configuration audit logs recorded yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-accent/40 transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-foreground text-xs">{log.user_name || "Admin"}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{log.role || "SUPER_ADMIN"}</div>
                      </td>
                      <td className="p-3 font-mono text-xs text-foreground font-bold">{log.event_name}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-muted text-muted-foreground mr-1">
                          {log.old_value ? "ON" : "OFF"}
                        </span>
                        ➔
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold ml-1",
                            log.new_value ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                          )}
                        >
                          {log.new_value ? "ON" : "OFF"}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-xs text-muted-foreground">{log.ip_address || "127.0.0.1"}</td>
                      <td className="p-3 text-xs text-muted-foreground font-mono">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <DialogFooter className="mt-4">
            <Button onClick={() => setAuditModalOpen(false)} className="font-bold rounded-xl px-6">
              Close Audit Trail
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* TAB 5: EMAIL LOGS */}
      {activeTab === "logs" && (
        <div className="bg-card border border-border rounded-3xl p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
            <div>
              <h3 className="text-xl font-bold text-foreground">Email Delivery Audit Log</h3>
              <p className="text-muted-foreground text-xs font-medium">
                Complete history of system email dispatches and error traces.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/60 text-muted-foreground text-xs uppercase font-black tracking-wider">
                <tr>
                  <th className="p-4 rounded-l-xl">Recipient</th>
                  <th className="p-4">Subject</th>
                  <th className="p-4">Module</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Sent Date</th>
                  <th className="p-4 rounded-r-xl">Error Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-accent/50 transition-colors">
                    <td className="p-4 font-bold text-foreground">{log.recipient}</td>
                    <td className="p-4 font-medium text-foreground">{log.subject}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-blue-500/10 text-blue-600 dark:text-blue-400">
                        {log.module}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={cn(
                          "px-2.5 py-1 rounded-full text-[10px] font-black uppercase inline-flex items-center gap-1",
                          log.status === "SENT" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                          log.status === "QUEUED" && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                          log.status === "FAILED" && "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                        )}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-muted-foreground font-mono">
                      {log.sent_date ? new Date(log.sent_date).toLocaleString() : "Pending"}
                    </td>
                    <td className="p-4 text-xs text-rose-500 font-mono">
                      {log.error_message || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5.5: WHATSAPP LOGS */}
      {activeTab === "whatsapp-logs" && (
        <div className="bg-card border border-border rounded-3xl p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
            <div>
              <h3 className="text-xl font-bold text-foreground">WhatsApp Delivery Audit Log</h3>
              <p className="text-muted-foreground text-xs font-medium">
                Complete history of system WhatsApp notifications, delivery status traces, and failures.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Button 
                onClick={handleExportWaLogsCSV}
                variant="outline"
                size="sm"
                className="h-10 px-4 font-bold text-xs rounded-xl border border-border"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" /> Export CSV
              </Button>
              <Button 
                onClick={fetchWhatsAppLogs}
                variant="outline"
                size="sm"
                className="h-10 px-4 font-bold text-xs rounded-xl border border-border"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-muted/30 p-4 rounded-2xl border border-border/60">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                value={waSearch}
                onChange={(e) => {
                  setWaSearch(e.target.value);
                  setWaPage(1);
                }}
                placeholder="Search phone or template..."
                className="h-10 pl-9 bg-background border-border text-xs"
              />
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest shrink-0">Status</span>
              <select
                value={waStatusFilter}
                onChange={(e) => {
                  setWaStatusFilter(e.target.value);
                  setWaPage(1);
                }}
                className="bg-background border border-border rounded-xl h-10 px-3 text-xs focus:outline-none text-foreground font-medium w-full sm:w-36"
              >
                <option value="ALL">All States</option>
                <option value="PENDING">Pending</option>
                <option value="SENT">Sent</option>
                <option value="DELIVERED">Delivered</option>
                <option value="READ">Read</option>
                <option value="FAILED">Failed</option>
                <option value="SKIPPED">Skipped</option>
              </select>
            </div>
          </div>

          {/* Logs Table */}
          <div className="overflow-x-auto border border-border rounded-2xl">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/60 text-muted-foreground text-xs uppercase font-black tracking-wider border-b border-border">
                <tr>
                  <th className="p-4 rounded-l-xl">Recipient</th>
                  <th className="p-4">Notification Type</th>
                  <th className="p-4">Provider</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Sent Time</th>
                  <th className="p-4 rounded-r-xl text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {whatsappLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground font-medium">
                      No WhatsApp delivery logs match the filter criteria.
                    </td>
                  </tr>
                ) : (
                  whatsappLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-accent/40 transition-colors">
                      <td className="p-4 font-bold text-foreground">
                        <div>{log.recipient}</div>
                        <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                          {log.environment} Mode
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-foreground text-xs">{log.notification_type}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{log.template_code}</div>
                      </td>
                      <td className="p-4 font-medium text-foreground text-xs">{log.provider}</td>
                      <td className="p-4">
                        <span
                          className={cn(
                            "px-2.5 py-1 rounded-full text-[9px] font-black uppercase inline-flex items-center gap-1",
                            (log.status === "SENT" || log.status === "DELIVERED" || log.status === "READ") && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                            log.status === "PENDING" && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                            log.status === "FAILED" && "bg-rose-500/10 text-rose-600 dark:text-rose-400",
                            log.status === "SKIPPED" && "bg-muted text-muted-foreground"
                          )}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-muted-foreground font-mono">
                        {log.sent_at ? new Date(log.sent_at).toLocaleString() : "Not Sent"}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            onClick={() => {
                              setSelectedWaLog(log);
                              setWaLogDetailOpen(true);
                            }}
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 rounded-lg hover:bg-accent"
                          >
                            <Eye className="w-4 h-4 text-muted-foreground" />
                          </Button>
                          {log.status === "FAILED" && (
                            <Button
                              disabled={retryingWaId === log.id}
                              onClick={() => handleRetryWaLog(log.id)}
                              variant="outline"
                              size="sm"
                              className="h-8 px-2.5 font-bold text-[10px] rounded-lg border border-border"
                            >
                              {retryingWaId === log.id ? "Queuing..." : "Retry"}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {waTotalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border pt-4">
              <span className="text-xs text-muted-foreground font-semibold">
                Page {waPage} of {waTotalPages}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  disabled={waPage <= 1}
                  onClick={() => setWaPage(prev => Math.max(1, prev - 1))}
                  variant="outline"
                  size="sm"
                  className="font-bold text-xs rounded-xl"
                >
                  Previous
                </Button>
                <Button
                  disabled={waPage >= waTotalPages}
                  onClick={() => setWaPage(prev => Math.min(waTotalPages, prev + 1))}
                  variant="outline"
                  size="sm"
                  className="font-bold text-xs rounded-xl"
                >
                  Next
                </Button>
              </div>
            </div>
          )}

          {/* Log Detail Modal */}
          <Dialog open={waLogDetailOpen} onOpenChange={setWaLogDetailOpen}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl bg-card border-border p-6 shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-emerald-600" /> WhatsApp Message Metadata Details
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Complete inspect logs for WhatsApp dispatch parameters, provider payloads, and response receipts.
                </DialogDescription>
              </DialogHeader>

              {selectedWaLog && (
                <div className="space-y-4 my-4">
                  <div className="grid grid-cols-2 gap-4 bg-muted/20 p-4 rounded-2xl border border-border/60">
                    <div>
                      <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest block">Recipient Phone</span>
                      <span className="text-xs font-bold text-foreground">{selectedWaLog.recipient}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest block">Message ID</span>
                      <span className="text-xs font-mono text-foreground font-bold">{selectedWaLog.message_id || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest block">Provider Driver</span>
                      <span className="text-xs font-bold text-foreground">{selectedWaLog.provider} ({selectedWaLog.environment})</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest block">Status Code</span>
                      <span className="text-xs font-bold text-foreground uppercase">{selectedWaLog.status}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest block">Created Timestamp</span>
                      <span className="text-xs text-foreground font-mono">{new Date(selectedWaLog.created_at).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest block">Retry Statistics</span>
                      <span className="text-xs text-foreground font-medium">{selectedWaLog.retry_count} / {selectedWaLog.max_retries} Retries</span>
                    </div>
                  </div>

                  {selectedWaLog.failure_reason && (
                    <div className="p-4 rounded-2xl border border-rose-500/20 bg-rose-500/5 space-y-1">
                      <span className="text-[10px] font-black uppercase text-rose-600 dark:text-rose-400 tracking-widest block">Failure Exception Trace</span>
                      <p className="text-xs font-mono text-rose-500 font-semibold">{selectedWaLog.failure_reason}</p>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest block">Request Parameter Context Payload</span>
                    <pre className="p-4 bg-muted/60 border border-border/80 rounded-2xl text-[10px] font-mono text-foreground max-h-36 overflow-y-auto">
                      {(() => {
                        try {
                          return JSON.stringify(JSON.parse(selectedWaLog.request_payload), null, 2);
                        } catch {
                          return selectedWaLog.request_payload || "No request data recorded";
                        }
                      })()}
                    </pre>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest block">Provider API Response Receipt</span>
                    <pre className="p-4 bg-muted/60 border border-border/80 rounded-2xl text-[10px] font-mono text-foreground max-h-36 overflow-y-auto">
                      {(() => {
                        try {
                          return JSON.stringify(JSON.parse(selectedWaLog.provider_response), null, 2);
                        } catch {
                          return selectedWaLog.provider_response || "No response data returned";
                        }
                      })()}
                    </pre>
                  </div>
                </div>
              )}

              <DialogFooter className="mt-4">
                <Button onClick={() => setWaLogDetailOpen(false)} className="font-bold rounded-xl px-6">
                  Close Inspect Details
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* TAB: WHATSAPP TEMPLATES */}
      {activeTab === "whatsapp-templates" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold text-foreground">WhatsApp Template Registry</h3>
              <p className="text-muted-foreground text-xs mt-1">
                Configure provider templates and map GSS trigger variables dynamically.
              </p>
            </div>
            <Button
              onClick={() =>
                setEditingWaTemplate({
                  id: `new-${Date.now()}`,
                  name: "New WhatsApp Mapping",
                  code: "CUSTOM_TRIGGER",
                  template_name: "custom_template_name",
                  variables_map: JSON.stringify({
                    company_name: "company_name",
                    certificate_name: "certificate_name",
                    certificate_number: "certificate_number",
                    expiry_date: "expiry_date",
                    days_remaining: "days_remaining"
                  }, null, 2),
                  is_active: true,
                })
              }
              className="font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              <Plus className="w-4 h-4 mr-2" /> Add Mapping
            </Button>
          </div>

          {editingWaTemplate ? (
            <form onSubmit={handleSaveWaTemplate} className="bg-card border border-border rounded-3xl p-8 space-y-6 shadow-md">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <h4 className="text-lg font-bold flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-emerald-500" />
                  {editingWaTemplate.id.startsWith("new-") ? "Create" : "Modify"} WhatsApp Template Mapping
                </h4>
                <Button type="button" variant="ghost" className="rounded-lg" onClick={() => setEditingWaTemplate(null)}>
                  Cancel
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase">Mapping Label Name</label>
                  <Input
                    value={editingWaTemplate.name}
                    onChange={(e) => setEditingWaTemplate({ ...editingWaTemplate, name: e.target.value })}
                    required
                    className="bg-background rounded-xl h-11"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase">GSS Trigger Code</label>
                  <Input
                    value={editingWaTemplate.code}
                    onChange={(e) => setEditingWaTemplate({ ...editingWaTemplate, code: e.target.value })}
                    required
                    className="bg-background rounded-xl h-11"
                    placeholder="e.g. WELCOME_MESSAGE"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase">Provider Template Name</label>
                  <Input
                    value={editingWaTemplate.template_name}
                    onChange={(e) => setEditingWaTemplate({ ...editingWaTemplate, template_name: e.target.value })}
                    required
                    className="bg-background rounded-xl h-11"
                    placeholder="e.g. certificate_expiry_notification"
                  />
                </div>
                <div className="space-y-2 flex items-center pt-8">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editingWaTemplate.is_active}
                      onChange={(e) => setEditingWaTemplate({ ...editingWaTemplate, is_active: e.target.checked })}
                      className="rounded border-border text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                    />
                    <span className="text-sm font-bold text-foreground">Mapping Active</span>
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase">Variables Mapping JSON</label>
                  <span className="text-[10px] text-muted-foreground bg-accent/20 px-2 py-0.5 rounded-md font-mono">
                    Format: &quot;ProviderParam&quot;: &quot;GSSVariable&quot;
                  </span>
                </div>
                <textarea
                  className="w-full bg-background border border-border rounded-2xl p-4 text-xs font-mono min-h-[160px] focus:ring-2 focus:ring-emerald-500 text-foreground"
                  value={editingWaTemplate.variables_map}
                  onChange={(e) => setEditingWaTemplate({ ...editingWaTemplate, variables_map: e.target.value })}
                  placeholder='{\n  "company_name": "company_name",\n  "certificate_name": "certificate_name"\n}'
                  required
                />
                <p className="text-[10px] text-muted-foreground/80 mt-1">
                  <strong>Available GSS trigger properties:</strong> company_name, certificate_name, certificate_number, expiry_date, days_remaining, contact_name, contact_phone
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl h-11 px-6 shadow-md"
                >
                  Save Configuration
                </Button>
              </div>
            </form>
          ) : waTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground bg-card rounded-3xl border border-dashed border-border shadow-inner">
              <MessageSquare className="w-16 h-16 mb-4 opacity-15" />
              <p className="font-bold uppercase tracking-widest text-xs">No WhatsApp Template Mappings Configured</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {waTemplates.map((tpl) => {
                let parsedVars: Record<string, string> = {};
                try {
                  parsedVars = JSON.parse(tpl.variables_map);
                } catch {}

                return (
                  <div
                    key={tpl.id}
                    className="bg-card border border-border rounded-3xl p-6 space-y-4 hover:border-emerald-500/20 transition-all shadow-sm flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h4 className="font-bold text-foreground text-base">{tpl.name}</h4>
                          <code className="text-[10px] text-muted-foreground bg-muted/40 px-2 py-0.5 rounded font-mono font-bold block mt-1 w-max">
                            Trigger Code: {tpl.code}
                          </code>
                        </div>
                        <span
                          className={cn(
                            "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider",
                            tpl.is_active
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                          )}
                        >
                          {tpl.is_active ? "Active" : "Disabled"}
                        </span>
                      </div>

                      <div className="space-y-1 bg-accent/20 p-3 rounded-2xl border border-border/40 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Provider Template:</span>
                          <span className="font-bold text-foreground font-mono">{tpl.template_name}</span>
                        </div>
                        <div className="pt-2 mt-2 border-t border-border/40 space-y-1">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Parameter Mappings:</span>
                          <div className="grid grid-cols-1 gap-1 max-h-[80px] overflow-y-auto pr-1">
                            {Object.entries(parsedVars).map(([pkey, skey]) => (
                              <div key={pkey} className="flex justify-between font-mono text-[10px] text-muted-foreground">
                                <span>{pkey}</span>
                                <span className="text-foreground">➔ {skey}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end pt-3 border-t border-border/40">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingWaTemplate(tpl)}
                        className="rounded-lg h-9 font-bold bg-background text-foreground hover:bg-accent border-border"
                      >
                        <Edit className="w-3.5 h-3.5 mr-1 text-emerald-500" /> Configure
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteWaTemplate(tpl.id)}
                        className="rounded-lg h-9 font-bold bg-background text-rose-600 hover:bg-rose-500/10 border-border"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      {activeTab === "test" && (
        <div className="bg-card border border-border rounded-3xl p-8 shadow-xs space-y-6 max-w-2xl">
          <div className="border-b border-border pb-4">
            <h3 className="text-xl font-bold text-foreground">Trigger Infrastructure Test Email</h3>
            <p className="text-muted-foreground text-xs font-medium">
              Simulate an outbound email dispatch to verify database logging and system event pipelines.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase">
                Recipient Email Address
              </label>
              <Input
                type="email"
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
                placeholder="client@example.com"
              />
            </div>

            <Button
              onClick={handleSendTestEmail}
              disabled={sendingTest}
              className="font-bold rounded-xl px-6"
            >
              <Send className={cn("w-4 h-4 mr-2", sendingTest && "animate-spin")} />
              {sendingTest ? "Logging Test Email..." : "Log Test Email Record"}
            </Button>
          </div>
        </div>
      )}

      {/* TAB 7: EMAIL QUEUE */}
      {activeTab === "queue" && (
        <div className="space-y-6">
          {/* Queue Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-6 rounded-2xl bg-card border border-border shadow-xs flex items-center space-x-4">
              <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase">Pending / Queued</p>
                <h3 className="text-2xl font-black text-foreground">{queueStats.waiting_jobs}</h3>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-border shadow-xs flex items-center space-x-4">
              <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase">Sent Today</p>
                <h3 className="text-2xl font-black text-foreground">{queueStats.completed_today}</h3>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-border shadow-xs flex items-center space-x-4">
              <div className="p-3 bg-rose-500/10 rounded-xl text-rose-500">
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase">Failed Jobs</p>
                <h3 className="text-2xl font-black text-rose-500">{queueStats.failed_jobs}</h3>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-border shadow-xs flex items-center space-x-4">
              <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase">Sending Active</p>
                <h3 className="text-2xl font-black text-blue-500">{queueStats.active_jobs}</h3>
              </div>
            </div>
          </div>

          {/* Queue Actions & Filter Bar */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
              <div>
                <h4 className="text-lg font-bold text-foreground">Live Outbound Queue Items</h4>
                <p className="text-xs text-muted-foreground">
                  Asynchronous email dispatch queue with status tracking and manual retry capability.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-muted p-1 rounded-xl">
                  {["ALL", "PENDING", "SENDING", "SENT", "FAILED"].map((st) => (
                    <button
                      key={st}
                      onClick={() => setQueueFilterStatus(st)}
                      className={cn(
                        "px-3 py-1 rounded-lg text-xs font-bold transition-all",
                        queueFilterStatus === st
                          ? "bg-card text-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                {queueStats.failed_jobs > 0 && (
                  <Button
                    onClick={handleRetryAll}
                    disabled={retryingAll}
                    className="font-bold text-xs rounded-xl bg-rose-500 hover:bg-rose-600 text-white"
                  >
                    <RotateCcw className={cn("w-3.5 h-3.5 mr-1.5", retryingAll && "animate-spin")} />
                    {retryingAll ? "Retrying..." : "Retry All Failed"}
                  </Button>
                )}
              </div>
            </div>

            {/* Queue Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/60 text-muted-foreground text-xs uppercase font-black tracking-wider">
                  <tr>
                    <th className="p-4 rounded-l-xl">Recipient</th>
                    <th className="p-4">Subject / Template</th>
                    <th className="p-4">Module</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Retries</th>
                    <th className="p-4">Queued At</th>
                    <th className="p-4 rounded-r-xl text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {queueItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground font-medium">
                        No email queue items found for status filter <strong className="text-foreground">{queueFilterStatus}</strong>.
                      </td>
                    </tr>
                  ) : (
                    queueItems.map((item) => (
                      <tr key={item.id} className="hover:bg-accent/50 transition-colors">
                        <td className="p-4 font-bold text-foreground">{item.recipient}</td>
                        <td className="p-4 font-medium text-foreground">
                          <div>{item.subject}</div>
                          {item.template_code && (
                            <span className="text-[10px] text-muted-foreground font-mono">Code: {item.template_code}</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            {item.module}
                          </span>
                        </td>
                        <td className="p-4">
                          <span
                            className={cn(
                              "px-2.5 py-1 rounded-full text-[10px] font-black uppercase inline-flex items-center gap-1",
                              item.status === "SENT" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                              item.status === "PENDING" && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                              item.status === "SENDING" && "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                              item.status === "FAILED" && "bg-rose-500/10 text-rose-600 dark:text-rose-400",
                              item.status === "SCHEDULED" && "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                            )}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="p-4 text-xs font-mono text-muted-foreground">
                          {item.retry_count || 0} / {item.max_retries || 3}
                        </td>
                        <td className="p-4 text-xs text-muted-foreground font-mono">
                          {new Date(item.created_at).toLocaleString()}
                        </td>
                        <td className="p-4 text-right">
                          {item.status === "FAILED" && (
                            <Button
                              onClick={() => handleRetrySingle(item.id)}
                              disabled={retryingId === item.id}
                              variant="outline"
                              size="sm"
                              className="font-bold text-xs rounded-xl hover:bg-emerald-500/10 hover:text-emerald-500"
                            >
                              <RotateCcw className={cn("w-3.5 h-3.5 mr-1", retryingId === item.id && "animate-spin")} />
                              Retry
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: ANALYTICS & HEALTH */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-2">
              <p className="text-xs font-bold text-muted-foreground uppercase">Total Outbound Sent</p>
              <div className="flex items-center justify-between">
                <h3 className="text-3xl font-black text-foreground">{analyticsStats.total_sent}</h3>
                <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-2">
              <p className="text-xs font-bold text-muted-foreground uppercase">Failed Dispatches</p>
              <div className="flex items-center justify-between">
                <h3 className="text-3xl font-black text-rose-500">{analyticsStats.total_failed}</h3>
                <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-500">
                  <AlertTriangle className="w-6 h-6" />
                </div>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-2">
              <p className="text-xs font-bold text-muted-foreground uppercase">Emails Logged Today</p>
              <div className="flex items-center justify-between">
                <h3 className="text-3xl font-black text-foreground">{analyticsStats.today_emails}</h3>
                <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500">
                  <Send className="w-6 h-6" />
                </div>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-2">
              <p className="text-xs font-bold text-muted-foreground uppercase">Delivery Success Rate</p>
              <div className="flex items-center justify-between">
                <h3 className="text-3xl font-black text-emerald-500">{analyticsStats.delivery_rate}</h3>
                <div className="p-3 bg-teal-500/10 rounded-2xl text-teal-500">
                  <Activity className="w-6 h-6" />
                </div>
              </div>
            </div>
          </div>

          {/* Breakdown Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Most Used Templates */}
            <div className="bg-card border border-border rounded-3xl p-6 shadow-xs space-y-4">
              <h4 className="text-lg font-bold text-foreground flex items-center gap-2">
                <FileCode className="w-5 h-5 text-primary" /> Most Used Templates
              </h4>
              <div className="space-y-3">
                {analyticsStats.most_used_templates.length === 0 ? (
                  <p className="text-xs text-muted-foreground font-medium">No template usage data recorded yet.</p>
                ) : (
                  analyticsStats.most_used_templates.map((tpl: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-accent/40 border border-border">
                      <span className="text-sm font-bold text-foreground">{tpl.name}</span>
                      <span className="px-3 py-1 rounded-full text-xs font-black bg-primary/10 text-primary">{tpl.count} sends</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Active Modules Distribution */}
            <div className="bg-card border border-border rounded-3xl p-6 shadow-xs space-y-4">
              <h4 className="text-lg font-bold text-foreground flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-500" /> Active Modules Distribution
              </h4>
              <div className="space-y-3">
                {analyticsStats.most_active_modules.length === 0 ? (
                  <p className="text-xs text-muted-foreground font-medium">No module dispatch data recorded yet.</p>
                ) : (
                  analyticsStats.most_active_modules.map((mod: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-accent/40 border border-border">
                      <span className="text-sm font-bold text-foreground uppercase tracking-wider">{mod.module}</span>
                      <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/10 text-emerald-500">{mod.count} emails</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* WhatsApp Quota Monitor & Analytics */}
          <div className="border-t border-border pt-8 space-y-6">
            <div>
              <h3 className="text-xl font-bold text-foreground">WhatsApp Channels Quota Monitor</h3>
              <p className="text-muted-foreground text-xs font-medium">
                Daily limits, warnings, and analytics for Zavu and Meta WhatsApp cloud API gateways.
              </p>
            </div>

            {/* Quota Progress Alert Panel */}
            <div className={cn(
              "p-6 rounded-3xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm",
              waAnalytics.quota_stats.status === "EXCEEDED" && "bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-200",
              (waAnalytics.quota_stats.status === "WARNING_90" || waAnalytics.quota_stats.status === "WARNING_80") && "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-200",
              waAnalytics.quota_stats.status === "NORMAL" && "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200"
            )}>
              <div className="space-y-1 w-full max-w-lg">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
                  <span>Daily Sandbox Limit Capacity</span>
                  <span>{waAnalytics.quota_stats.quota_used} / {waAnalytics.quota_stats.quota_limit} Sends</span>
                </div>
                <div className="w-full h-3 bg-muted rounded-full overflow-hidden border border-border/40">
                  <div 
                    className={cn(
                      "h-full transition-all duration-500 rounded-full",
                      waAnalytics.quota_stats.status === "EXCEEDED" && "bg-rose-600",
                      (waAnalytics.quota_stats.status === "WARNING_90" || waAnalytics.quota_stats.status === "WARNING_80") && "bg-amber-600",
                      waAnalytics.quota_stats.status === "NORMAL" && "bg-emerald-600"
                    )}
                    style={{ width: `${Math.min(100, Number(waAnalytics.quota_stats.percentage))}%` }}
                  />
                </div>
                <p className="text-[10px] opacity-80 font-medium">
                  {waAnalytics.quota_stats.status === "EXCEEDED" && "CRITICAL: WhatsApp daily sandbox quota is fully exhausted. System alerts will log errors until reset."}
                  {waAnalytics.quota_stats.status === "WARNING_90" && "WARNING: WhatsApp quota is near limit (90% capacity). Plan sandbox allocation limits."}
                  {waAnalytics.quota_stats.status === "WARNING_80" && "NOTICE: WhatsApp daily quota usage is at 80%. Approaching provider threshold."}
                  {waAnalytics.quota_stats.status === "NORMAL" && "SUCCESS: System status is normal. Quota usage is within safe parameters."}
                </p>
              </div>

              <div className="shrink-0 font-black text-2xl tracking-tight">
                {waAnalytics.quota_stats.percentage}% Used
              </div>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase">WhatsApp Sent</p>
                <h3 className="text-3xl font-black text-foreground">{waAnalytics.total_sent}</h3>
              </div>

              <div className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase">WhatsApp Failed</p>
                <h3 className="text-3xl font-black text-rose-500">{waAnalytics.total_failed}</h3>
              </div>

              <div className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase">Delivery Rate</p>
                <h3 className="text-3xl font-black text-emerald-500">{waAnalytics.delivery_rate}</h3>
              </div>

              <div className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase">Read Receipt Rate</p>
                <h3 className="text-3xl font-black text-indigo-500">{waAnalytics.read_rate}</h3>
              </div>
            </div>

            {/* Daily stats log */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-card border border-border rounded-3xl p-6 shadow-xs space-y-4">
                <h4 className="text-sm font-bold text-foreground uppercase tracking-widest flex items-center gap-2">
                  <FileCode className="w-5 h-5 text-primary" /> Active WhatsApp Templates
                </h4>
                <div className="space-y-3">
                  {waAnalytics.template_breakdown.length === 0 ? (
                    <p className="text-xs text-muted-foreground font-medium">No templates dispatched in the last 7 days.</p>
                  ) : (
                    waAnalytics.template_breakdown.map((tpl: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-accent/40 border border-border">
                        <span className="text-xs font-bold text-foreground font-mono">{tpl.name}</span>
                        <span className="px-3 py-1 rounded-full text-xs font-black bg-primary/10 text-primary">{tpl.count} dispatches</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-card border border-border rounded-3xl p-6 shadow-xs space-y-4">
                <h4 className="text-sm font-bold text-foreground uppercase tracking-widest flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-emerald-500" /> Last 7 Days Timeline Activity
                </h4>
                <div className="space-y-3">
                  {waAnalytics.daily_metrics.length === 0 ? (
                    <p className="text-xs text-muted-foreground font-medium">No activity log found.</p>
                  ) : (
                    waAnalytics.daily_metrics.map((day: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-accent/40 border border-border">
                        <span className="text-xs font-bold text-foreground">{day.date}</span>
                        <div className="flex gap-3 text-[10px] font-black uppercase">
                          <span className="text-emerald-500">{day.sent} Sent</span>
                          <span className="text-indigo-500">{day.read} Read</span>
                          <span className="text-rose-500">{day.failed} Fail</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
