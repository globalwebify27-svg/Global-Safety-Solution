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
} from "lucide-react";

export default function EmailManagementPage() {
  const token = useAuthStore((state) => state.token);
  const [activeTab, setActiveTab] = useState<
    "smtp" | "templates" | "branding" | "rules" | "logs" | "test" | "queue" | "analytics"
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

  useEffect(() => {
    fetchAllData();
  }, [token, queueFilterStatus]);

  const fetchAllData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [smtpRes, tplRes, brandRes, ruleRes, logRes, queueRes, queueItemsRes, analyticsRes, auditRes] = await Promise.all([
        fetch(`${API_BASE_URL}/email-management/smtp`, { headers }),
        fetch(`${API_BASE_URL}/email-management/templates`, { headers }),
        fetch(`${API_BASE_URL}/email-management/branding`, { headers }),
        fetch(`${API_BASE_URL}/email-management/rules`, { headers }),
        fetch(`${API_BASE_URL}/email-management/logs`, { headers }),
        fetch(`${API_BASE_URL}/email-management/queue`, { headers }),
        fetch(`${API_BASE_URL}/email-management/queue/items?status=${queueFilterStatus}`, { headers }),
        fetch(`${API_BASE_URL}/email-management/analytics/stats`, { headers }),
        fetch(`${API_BASE_URL}/email-management/rules/audit-logs`, { headers }),
      ]);

      if (smtpRes.ok) setSmtpConfig(await smtpRes.json());
      if (tplRes.ok) setTemplates(await tplRes.json());
      if (brandRes.ok) setBranding(await brandRes.json());
      if (ruleRes.ok) setRules(await ruleRes.json());
      if (logRes.ok) setLogs(await logRes.json());
      if (queueRes.ok) setQueueStats(await queueRes.json());
      if (queueItemsRes.ok) {
        const qData = await queueItemsRes.json();
        setQueueItems(qData.items || []);
      }
      if (analyticsRes.ok) setAnalyticsStats(await analyticsRes.json());
      if (auditRes.ok) setAuditLogs(await auditRes.json());
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

  const handleToggleRule = async (ruleId: string, currentVal: boolean) => {
    // Optimistic UI state update
    setRules((prevRules) =>
      prevRules.map((r) =>
        r.id === ruleId || r.event_name === ruleId
          ? { ...r, is_email_enabled: !currentVal }
          : r
      )
    );

    try {
      const res = await fetch(`${API_BASE_URL}/email-management/rules/${ruleId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_email_enabled: !currentVal }),
      });

      if (res.ok) {
        toast.success(`Notification rule ${!currentVal ? "enabled" : "disabled"}`);
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
              <div>
                <h3 className="text-xl font-bold text-foreground">Centralized Notification Rules Engine</h3>
                <p className="text-muted-foreground text-xs font-medium">
                  Enable or disable automatic email dispatches for individual ERP workflows. Business processes run uninterrupted even if email triggers are turned off.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={handleEnableAllRules}
                  variant="outline"
                  size="sm"
                  className="font-bold text-xs rounded-xl hover:bg-emerald-500/10 hover:text-emerald-500"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Enable All
                </Button>
                <Button
                  onClick={handleDisableAllRules}
                  variant="outline"
                  size="sm"
                  className="font-bold text-xs rounded-xl hover:bg-rose-500/10 hover:text-rose-500"
                >
                  <XCircle className="w-3.5 h-3.5 mr-1" />
                  Disable All
                </Button>
                <Button
                  onClick={handleRestoreDefaultRules}
                  variant="outline"
                  size="sm"
                  className="font-bold text-xs rounded-xl"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  Restore Defaults
                </Button>
                <Button
                  onClick={() => setAuditModalOpen(true)}
                  className="font-bold text-xs rounded-xl bg-primary text-primary-foreground"
                >
                  <History className="w-3.5 h-3.5 mr-1" />
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
                          className="p-4 rounded-2xl bg-muted/40 border border-border flex items-center justify-between gap-4 hover:border-border/80 transition-colors"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-foreground">{rule.event_name}</span>
                              <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-primary/10 text-primary">
                                {rule.module}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground font-medium">
                              {rule.description || "Automated system trigger"}
                            </p>
                          </div>

                          <div className="flex items-center gap-3">
                            <span
                              className={cn(
                                "text-xs font-bold uppercase tracking-wider",
                                rule.is_email_enabled ? "text-emerald-500" : "text-muted-foreground"
                              )}
                            >
                              {rule.is_email_enabled ? "ON" : "OFF"}
                            </span>
                            <button
                              onClick={() => handleToggleRule(rule.id, rule.is_email_enabled)}
                              className={cn(
                                "w-12 h-6 rounded-full transition-colors relative flex items-center px-0.5 btn-tactile",
                                rule.is_email_enabled ? "bg-emerald-500" : "bg-muted-foreground/30"
                              )}
                            >
                              <div
                                className={cn(
                                  "w-5 h-5 rounded-full bg-white transition-transform shadow-md",
                                  rule.is_email_enabled ? "translate-x-6" : "translate-x-0"
                                )}
                              />
                            </button>
                          </div>
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

      {/* TAB 6: TEST EMAIL */}
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
        </div>
      )}
    </div>
  );
}
