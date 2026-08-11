"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth";
import { API_BASE_URL } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  User, 
  Lock, 
  Building2, 
  Bell, 
  ShieldCheck, 
  Save, 
  KeyRound, 
  Globe,
  ArrowRight,
  FileText,
  MessageSquare,
  SlidersHorizontal
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ProfileForm } from "./ProfileForm";
import Link from "next/link";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface ProfileUpdateData {
  name: string;
  email: string;
  phone: string;
  designation: string;
  department: string;
}

import { toast } from "sonner";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(false);
  const [notifs, setNotifs] = useState({
    compliance: true,
    tasks: true,
    security: false,
    performance: true
  });
  
  const { user, token, setAuth } = useAuthStore();

  const [securityForm, setSecurityForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const [orgForm, setOrgForm] = useState({
    companyName: "",
    gstNumber: "",
    address: "",
    website: "",
    defaultLicenseNo: ""
  });

  const [whatsappForm, setWhatsappForm] = useState({
    enabled: false,
    activeProvider: "Zavu",
    
    // Zavu config
    zavuApiKey: "",
    zavuEnvironment: "sandbox",
    zavuPhoneId: "",
    zavuAccountId: "",
    zavuDefaultTemplate: "certificate_due_reminder",

    // Meta config
    metaAccessToken: "",
    metaPhoneId: "",
    metaAccountId: "",
    metaVerifyToken: "",
    metaAppSecret: "",

    // Twilio config
    twilioAccountSid: "",
    twilioAuthToken: "",
    twilioSenderNumber: "",
  });

  const [testingConnection, setTestingConnection] = useState(false);
  const [testModalOpen, setTestModalOpen] = useState(false);

  // Sandbox Diagnostic States
  const [testingSandbox, setTestingSandbox] = useState(false);
  const [sandboxLogs, setSandboxLogs] = useState<string[]>([]);
  const [sandboxLogsModalOpen, setSandboxLogsModalOpen] = useState(false);
  const [testPhoneNumber, setTestPhoneNumber] = useState("");
  const [testTemplateName, setTestTemplateName] = useState("");
  const [sendingTest, setSendingTest] = useState(false);

  // Settings Audit Trail States
  const [settingsAuditLogs, setSettingsAuditLogs] = useState<any[]>([]);

  const fetchSettings = async (ignore = false) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!ignore && data) {
        setOrgForm({
          companyName: data.company_name || "",
          gstNumber: data.gst_number || "",
          address: data.address || "",
          website: data.website || "",
          defaultLicenseNo: data.default_license_no || ""
        });
        setWhatsappForm({
          enabled: data.whatsapp_enabled === "true",
          activeProvider: data.whatsapp_active_provider || "Zavu",
          
          zavuApiKey: data.whatsapp_zavu_api_key || "",
          zavuEnvironment: data.whatsapp_zavu_environment || "sandbox",
          zavuPhoneId: data.whatsapp_zavu_phone_number_id || "",
          zavuAccountId: data.whatsapp_zavu_business_account_id || "",
          zavuDefaultTemplate: data.whatsapp_zavu_default_template || "certificate_due_reminder",

          metaAccessToken: data.whatsapp_meta_access_token || "",
          metaPhoneId: data.whatsapp_meta_phone_number_id || "",
          metaAccountId: data.whatsapp_meta_business_account_id || "",
          metaVerifyToken: data.whatsapp_meta_verify_token || "",
          metaAppSecret: data.whatsapp_meta_app_secret || "",

          twilioAccountSid: data.whatsapp_twilio_account_sid || "",
          twilioAuthToken: data.whatsapp_twilio_auth_token || "",
          twilioSenderNumber: data.whatsapp_twilio_sender_number || "",
        });
      }
    } catch (err) {
      console.error("Fetch settings error:", err);
    }
  };

  useEffect(() => {
    let ignore = false;
    fetchSettings(ignore);
    fetchSettingsAuditLogs();
    return () => { ignore = true; };
  }, [token]);

  const handleUpdateProfile = async (formData: ProfileUpdateData) => {
    if (!token || !user) return;
    if (!user.id) {
      toast.error("User session is incomplete. Please sign out and sign in again.");
      return;
    }
    setLoading(true);

    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { email: _, ...cleanForm } = formData;
      const res = await fetch(`${API_BASE_URL}/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(cleanForm)
      });

      if (res.ok) {
        const updatedUser = await res.json();
        setAuth(token, updatedUser);
        toast.success("Profile updated successfully!");
      } else {
        toast.error("Failed to update profile.");
      }
    } catch {
      toast.error("Network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          company_name: orgForm.companyName,
          gst_number: orgForm.gstNumber,
          address: orgForm.address,
          website: orgForm.website,
          default_license_no: orgForm.defaultLicenseNo
        })
      });

      if (res.ok) {
        toast.success("Organization settings saved!");
      } else {
        toast.error("Failed to save organization settings.");
      }
    } catch {
      toast.error("Network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setLoading(true);

    try {
      const payload: any = {
        whatsapp_enabled: whatsappForm.enabled ? "true" : "false",
        whatsapp_active_provider: whatsappForm.activeProvider,
        
        whatsapp_zavu_environment: whatsappForm.zavuEnvironment,
        whatsapp_zavu_phone_number_id: whatsappForm.zavuPhoneId,
        whatsapp_zavu_business_account_id: whatsappForm.zavuAccountId,
        whatsapp_zavu_default_template: whatsappForm.zavuDefaultTemplate,

        whatsapp_meta_access_token: whatsappForm.metaAccessToken,
        whatsapp_meta_phone_number_id: whatsappForm.metaPhoneId,
        whatsapp_meta_business_account_id: whatsappForm.metaAccountId,
        whatsapp_meta_verify_token: whatsappForm.metaVerifyToken,
        whatsapp_meta_app_secret: whatsappForm.metaAppSecret,

        whatsapp_twilio_account_sid: whatsappForm.twilioAccountSid,
        whatsapp_twilio_auth_token: whatsappForm.twilioAuthToken,
        whatsapp_twilio_sender_number: whatsappForm.twilioSenderNumber,
      };

      // Zavu API Key is managed securely on Hostinger environment variables (ZAVU_SANDBOX_API_KEY/ZAVU_LIVE_API_KEY) and not persisted from frontend.

      const res = await fetch(`${API_BASE_URL}/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success("WhatsApp Configuration saved successfully!");
        fetchSettingsAuditLogs();
        fetchSettings();
      } else {
        toast.error("Failed to save WhatsApp configuration.");
      }
    } catch {
      toast.error("Network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!token) return;
    setTestingConnection(true);

    let apiKey = "";
    if (whatsappForm.activeProvider === "Zavu") apiKey = whatsappForm.zavuApiKey;
    else if (whatsappForm.activeProvider === "Meta") apiKey = whatsappForm.metaAccessToken;
    else if (whatsappForm.activeProvider === "Twilio") apiKey = whatsappForm.twilioAuthToken;

    try {
      const res = await fetch(`${API_BASE_URL}/notifications/whatsapp/test-connection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          provider: whatsappForm.activeProvider,
          apiKey
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || "Connection validated successfully!");
      } else {
        toast.error(data.message || "Failed to validate connection.");
      }
    } catch {
      toast.error("Network error occurred during connection test.");
    } finally {
      setTestingConnection(false);
    }
  };

  const handleTestSandboxConnection = async () => {
    if (!token) return;
    setTestingSandbox(true);
    setSandboxLogs([]);
    setSandboxLogsModalOpen(true);

    let apiKey = "";
    if (whatsappForm.activeProvider === "Zavu") apiKey = whatsappForm.zavuApiKey;
    else if (whatsappForm.activeProvider === "Meta") apiKey = whatsappForm.metaAccessToken;
    else if (whatsappForm.activeProvider === "Twilio") apiKey = whatsappForm.twilioAuthToken;

    try {
      const res = await fetch(`${API_BASE_URL}/notifications/whatsapp/test-sandbox`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          provider: whatsappForm.activeProvider,
          apiKey
        })
      });

      const data = await res.json();
      if (data.logs) {
        setSandboxLogs(data.logs);
      }
      if (res.ok && data.success) {
        toast.success("Sandbox connection verification succeeded!");
      } else {
        toast.error(data.message || "Sandbox connection verification failed.");
      }
    } catch {
      toast.error("Network error occurred during sandbox test.");
    } finally {
      setTestingSandbox(false);
    }
  };

  const fetchSettingsAuditLogs = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/settings/audit-logs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setSettingsAuditLogs(await res.json());
      }
    } catch (e) {
      console.error("Fetch settings audit logs error:", e);
    }
  };

  const handleSendTestMessageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!testPhoneNumber) {
      toast.error("Please provide a target phone number.");
      return;
    }
    setSendingTest(true);

    let apiKey = "";
    let environment = "sandbox";
    let template = testTemplateName;

    if (whatsappForm.activeProvider === "Zavu") {
      apiKey = whatsappForm.zavuApiKey;
      environment = whatsappForm.zavuEnvironment;
      if (!template) template = whatsappForm.zavuDefaultTemplate;
    } else if (whatsappForm.activeProvider === "Meta") {
      apiKey = whatsappForm.metaAccessToken;
      if (!template) template = "certificate_due_reminder";
    } else if (whatsappForm.activeProvider === "Twilio") {
      apiKey = whatsappForm.twilioAuthToken;
      if (!template) template = "certificate_due_reminder";
    }

    try {
      const res = await fetch(`${API_BASE_URL}/notifications/whatsapp/send-test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          provider: whatsappForm.activeProvider,
          apiKey,
          environment,
          to: testPhoneNumber,
          template
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Test message dispatched successfully!");
        setTestModalOpen(false);
        setTestPhoneNumber("");
        setTestTemplateName("");
      } else {
        toast.error(data.message || "Failed to dispatch test message.");
      }
    } catch {
      toast.error("Network error occurred.");
    } finally {
      setSendingTest(false);
    }
  };

  const isSuperAdmin = user?.email === "admin@globalsafety.com" || user?.email === "amrvbloggers@gmail.com" || user?.role === "SUPER_ADMIN";

  useEffect(() => {
    if ((activeTab === "roles" || activeTab === "whatsapp") && !isSuperAdmin) {
      setActiveTab("profile");
    }
  }, [activeTab, isSuperAdmin]);

  const tabs = [
    { id: "profile", label: "My Profile", icon: User },
    { id: "security", label: "Security", icon: Lock },
    { id: "organization", label: "Organization", icon: Building2 },
    { id: "notifications", label: "Notifications", icon: Bell },
    ...(isSuperAdmin ? [
      { id: "roles", label: "Roles & Permissions", icon: ShieldCheck },
      { id: "templates", label: "Certificate Templates", icon: FileText },
      { id: "whatsapp", label: "WhatsApp Configuration", icon: MessageSquare }
    ] : []),
  ];

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (securityForm.newPassword !== securityForm.confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: securityForm.currentPassword,
          newPassword: securityForm.newPassword
        })
      });

      if (res.ok) {
        toast.success("Password updated successfully!");
        setSecurityForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        const data = await res.json();
        toast.error(data.message || "Failed to update password.");
      }
    } catch {
      toast.error("Network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground to-muted-foreground">
            System Settings
          </h1>
          <p className="text-muted-foreground font-medium">Manage your personal identity and global platform configurations.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Navigation Sidebar */}
        <div className="w-full md:w-64 shrink-0 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all border-0",
                activeTab === tab.id 
                  ? "bg-primary/10 text-primary shadow-sm shadow-primary/5 ring-1 ring-primary/20" 
                  : "text-muted-foreground hover:bg-accent/10 hover:text-foreground"
              )}
            >
              <tab.icon className={cn("w-5 h-5", activeTab === tab.id ? "text-primary" : "text-muted-foreground/60")} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-card/40 border border-border rounded-3xl p-4 sm:p-8 shadow-sm relative overflow-hidden backdrop-blur-md">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] rounded-full -z-10" />
          
          {activeTab === "profile" && user && (
            <ProfileForm 
              key={user.id}
              initialData={{
                name: user.name,
                email: user.email,
                phone: user.phone || "",
                designation: user.designation || "",
                department: user.department || ""
              }}
              onSubmit={handleUpdateProfile}
              loading={loading}
            />
          )}

          {activeTab === "security" && (
            <form onSubmit={handleUpdatePassword} className="space-y-8">
              <div className="space-y-1">
                <h3 className="text-lg font-bold flex items-center gap-2 text-foreground">
                  <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Security Credentials
                </h3>
                <p className="text-sm text-muted-foreground font-medium">Ensure your account is protected with a high-entropy password.</p>
              </div>

              <div className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Current Authorization Key</Label>
                  <Input 
                    type="password" 
                    placeholder="••••••••••••" 
                    value={securityForm.currentPassword}
                    onChange={(e) => setSecurityForm({...securityForm, currentPassword: e.target.value})}
                    className="bg-background border-border h-11 text-foreground" 
                    required
                  />
                </div>
                <div className="space-y-2 pt-4">
                  <Label className="text-muted-foreground">New Password</Label>
                  <Input 
                    type="password" 
                    placeholder="Enter new password" 
                    value={securityForm.newPassword}
                    onChange={(e) => setSecurityForm({...securityForm, newPassword: e.target.value})}
                    className="bg-background border-border h-11 text-foreground" 
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Confirm New Password</Label>
                  <Input 
                    type="password" 
                    placeholder="Repeat new password" 
                    value={securityForm.confirmPassword}
                    onChange={(e) => setSecurityForm({...securityForm, confirmPassword: e.target.value})}
                    className="bg-background border-border h-11 text-foreground" 
                    required
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-start">
                <Button disabled={loading} type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-8 font-bold h-11 rounded-xl border-0 shadow-lg shadow-blue-500/20">
                  {loading ? "Rotating Keys..." : "Rotate Credentials"} <KeyRound className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </form>
          )}

          {activeTab === "organization" && (
            <form onSubmit={handleUpdateOrg} className="space-y-8">
              <div className="space-y-1">
                <h3 className="text-lg font-bold flex items-center gap-2 text-foreground">
                  <Building2 className="w-5 h-5 text-teal-600 dark:text-teal-400" /> Corporate Branding
                </h3>
                <p className="text-sm text-muted-foreground font-medium">Configure global metadata for reports, invoices, and audit logs.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Corporate Name</Label>
                  <Input value={orgForm.companyName || ""} onChange={(e) => setOrgForm({...orgForm, companyName: e.target.value})} className="bg-background border-border h-11 text-foreground" />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">GST Identification (GSTIN)</Label>
                  <Input value={orgForm.gstNumber || ""} onChange={(e) => setOrgForm({...orgForm, gstNumber: e.target.value})} placeholder="07AAAAA0000A1Z5" className="bg-background border-border h-11 text-foreground" />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label className="text-muted-foreground">Registered Corporate Address</Label>
                  <textarea value={orgForm.address || ""} onChange={(e) => setOrgForm({...orgForm, address: e.target.value})} className="w-full bg-background border border-border rounded-xl p-4 text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground font-medium" />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Corporate Website</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input value={orgForm.website || ""} onChange={(e) => setOrgForm({...orgForm, website: e.target.value})} className="bg-background border-border h-11 pl-10 text-foreground" placeholder="www.globalsafety.com" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Default License / Competency No.</Label>
                  <Input value={orgForm.defaultLicenseNo || ""} onChange={(e) => setOrgForm({...orgForm, defaultLicenseNo: e.target.value})} placeholder="e.g. 663, dated 11.11.2025, valid upto 10.11.2026" className="bg-background border-border h-11 text-foreground" />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <Button disabled={loading} type="submit" className="bg-teal-600 hover:bg-teal-500 text-white px-8 font-bold h-11 rounded-xl border-0 shadow-lg shadow-teal-500/20">
                  {loading ? "Synchronizing..." : "Save Org Settings"} <Save className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </form>
          )}

          {activeTab === "notifications" && (
            <div className="space-y-8">
              <div className="space-y-1">
                <h3 className="text-lg font-bold flex items-center gap-2 text-foreground">
                  <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400" /> Alert Preferences
                </h3>
                <p className="text-sm text-muted-foreground font-medium">Customize how and when you receive system-wide safety notifications.</p>
              </div>

              <div className="space-y-4">
                {[
                  { id: "compliance", label: "Compliance Expiry Alerts", desc: "Receive alerts 30 days before any safety certificate expires.", checked: notifs.compliance },
                  { id: "tasks", label: "New Task Assignment", desc: "Get notified when a new operational project is assigned to you.", checked: notifs.tasks },
                  { id: "security", label: "Security Login Alerts", desc: "Notification for every successful login from a new IP address.", checked: notifs.security },
                  { id: "performance", label: "Monthly Performance Report", desc: "A summarized PDF of all safety audits and inventory movements.", checked: notifs.performance },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-accent/5 border border-border hover:bg-accent/10 transition-all shadow-sm">
                    <div>
                      <div className="text-sm font-bold text-foreground">{item.label}</div>
                      <div className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">{item.desc}</div>
                    </div>
                    <div 
                      onClick={() => setNotifs(prev => ({ ...prev, [item.id]: !prev[item.id as keyof typeof prev] }))}
                      className={cn(
                        "w-12 h-6 rounded-full p-1 cursor-pointer transition-colors shadow-inner flex items-center", 
                        item.checked ? "bg-primary justify-end" : "bg-muted justify-start"
                      )}
                    >
                      <div className="w-4 h-4 rounded-full bg-white transition-all shadow-md" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "roles" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-1">
                <h3 className="text-lg font-bold flex items-center gap-2 text-foreground uppercase tracking-tight">
                  <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Access Control Infrastructure
                </h3>
                <p className="text-sm text-muted-foreground font-medium">Manage security profiles and granular permission matrices across all ERP modules.</p>
              </div>

              <div className="p-10 rounded-[2.5rem] bg-gradient-to-br from-indigo-500/10 via-accent/5 to-primary/10 border border-border flex flex-col items-center text-center space-y-6">
                <div className="w-20 h-20 rounded-[2rem] bg-card border border-border flex items-center justify-center shadow-2xl shadow-indigo-500/20">
                  <KeyRound className="w-10 h-10 text-indigo-500" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-2xl font-black text-foreground tracking-tighter uppercase">Permission Management Hub</h4>
                  <p className="text-sm text-muted-foreground font-medium max-w-sm mx-auto">
                    Access the professional RBAC (Role-Based Access Control) engine to configure module-level permissions for HR, Sales, Finance, and Operations.
                  </p>
                </div>
                <Link href="/dashboard/settings/roles">
                  <Button className="bg-indigo-600 hover:bg-indigo-500 text-white px-10 font-bold h-12 rounded-2xl shadow-xl shadow-indigo-500/20 group">
                    Enter Security Vault <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-6 rounded-3xl bg-accent/5 border border-border space-y-2">
                  <p className="text-xs font-black text-foreground uppercase tracking-widest">Active Roles</p>
                  <p className="text-2xl font-black text-primary">5 Units</p>
                  <p className="text-[10px] text-muted-foreground font-medium">Standardized organizational security profiles.</p>
                </div>
                <div className="p-6 rounded-3xl bg-accent/5 border border-border space-y-2">
                  <p className="text-xs font-black text-foreground uppercase tracking-widest">Master Keys</p>
                  <p className="text-2xl font-black text-primary">22 Keys</p>
                  <p className="text-[10px] text-muted-foreground font-medium">Granular module-level control permissions.</p>
                </div>
              </div>
            </div>
          )}
          {activeTab === "templates" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-1">
                <h3 className="text-lg font-bold flex items-center gap-2 text-foreground uppercase tracking-tight">
                  <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Certificate Template Engine
                </h3>
                <p className="text-sm text-muted-foreground font-medium">Create and customize layout templates for safety check certificates.</p>
              </div>

              <div className="p-10 rounded-[2.5rem] bg-gradient-to-br from-blue-500/10 via-accent/5 to-primary/10 border border-border flex flex-col items-center text-center space-y-6">
                <div className="w-20 h-20 rounded-[2rem] bg-card border border-border flex items-center justify-center shadow-2xl shadow-blue-500/20">
                  <FileText className="w-10 h-10 text-blue-500" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-2xl font-black text-foreground tracking-tighter uppercase">Dynamic Templates Builder</h4>
                  <p className="text-sm text-muted-foreground font-medium max-w-sm mx-auto">
                    Access the interactive form builder to customize certificate headers, dynamic parameters, and PDF layouts for each safety checklist section.
                  </p>
                </div>
                <Link href="/dashboard/settings/templates">
                  <Button className="bg-blue-600 hover:bg-blue-500 text-white px-10 font-bold h-12 rounded-2xl shadow-xl shadow-blue-500/20 group">
                    Configure Templates <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              </div>
            </div>
          )}
          {activeTab === "whatsapp" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <form onSubmit={handleUpdateWhatsApp} className="space-y-8">
                {/* Dummy inputs to intercept browser/password manager autofill */}
                <input type="text" style={{ display: 'none' }} autoComplete="username" tabIndex={-1} />
                <input type="password" style={{ display: 'none' }} autoComplete="current-password" tabIndex={-1} />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-6">
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold flex items-center gap-2 text-foreground uppercase tracking-tight">
                      <MessageSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> WhatsApp Notification Gateway
                    </h3>
                    <p className="text-sm text-muted-foreground font-medium">Configure credentials and routing parameters for GSS WhatsApp integrations.</p>
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      Active: {whatsappForm.activeProvider}
                    </span>
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full",
                      whatsappForm.enabled ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"
                    )}>
                      {whatsappForm.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-accent/5 border border-border hover:bg-accent/10 transition-all shadow-sm">
                    <div>
                      <div className="text-sm font-bold text-foreground">Enable WhatsApp Notifications</div>
                      <div className="text-[10px] text-muted-foreground font-medium tracking-wide">Route automated expiring certificate reminder alerts to clients via WhatsApp</div>
                    </div>
                    <div 
                      onClick={() => setWhatsappForm(prev => ({ ...prev, enabled: !prev.enabled }))}
                      className={cn(
                        "w-12 h-6 rounded-full p-1 cursor-pointer transition-colors shadow-inner flex items-center", 
                        whatsappForm.enabled ? "bg-emerald-600 justify-end" : "bg-muted justify-start"
                      )}
                    >
                      <div className="w-4 h-4 rounded-full bg-white transition-all shadow-md" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-muted-foreground font-bold">Active API Provider</Label>
                      <select 
                        value={whatsappForm.activeProvider}
                        onChange={(e) => setWhatsappForm({...whatsappForm, activeProvider: e.target.value})}
                        className="w-full bg-background border border-border rounded-xl h-11 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground font-medium"
                      >
                        <option value="Zavu">Zavu WhatsApp Business API</option>
                        <option value="Meta">Meta Cloud API (Coming Soon)</option>
                        <option value="Twilio">Twilio WhatsApp (Coming Soon)</option>
                      </select>
                    </div>

                    {whatsappForm.activeProvider === "Zavu" && (
                      <>
                        <div className="space-y-2">
                          <Label className="text-muted-foreground font-bold">Environment</Label>
                          <select 
                            value={whatsappForm.zavuEnvironment} 
                            onChange={(e) => setWhatsappForm({...whatsappForm, zavuEnvironment: e.target.value})}
                            className="w-full bg-background border border-border rounded-xl h-11 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground font-medium"
                          >
                            <option value="sandbox">Sandbox</option>
                            <option value="live">Live / Production</option>
                          </select>
                        </div>

                        <div className="md:col-span-2 space-y-2">
                          <Label className="text-muted-foreground font-bold">Zavu Authorization Token</Label>
                          <div className={cn(
                            "flex-1 bg-background border border-border rounded-xl h-11 px-4 flex items-center justify-between font-medium select-none text-sm shadow-sm",
                            whatsappForm.zavuApiKey.includes('Managed')
                              ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 border-emerald-500/10"
                              : "text-rose-600 dark:text-rose-400 bg-rose-500/5 border-rose-500/10"
                          )}>
                            <span>● {whatsappForm.zavuApiKey}</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-muted-foreground font-bold">Phone Number ID (Optional)</Label>
                          <Input 
                            value={whatsappForm.zavuPhoneId} 
                            onChange={(e) => setWhatsappForm({...whatsappForm, zavuPhoneId: e.target.value})} 
                            placeholder="e.g. 10928374829374"
                            className="bg-background border-border h-11 text-foreground" 
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-muted-foreground font-bold">Business Account ID (Optional)</Label>
                          <Input 
                            value={whatsappForm.zavuAccountId} 
                            onChange={(e) => setWhatsappForm({...whatsappForm, zavuAccountId: e.target.value})} 
                            placeholder="e.g. 8374829374829"
                            className="bg-background border-border h-11 text-foreground" 
                          />
                        </div>

                        <div className="md:col-span-2 space-y-2">
                          <Label className="text-muted-foreground font-bold">Default Message Template ID</Label>
                          <Input 
                            value={whatsappForm.zavuDefaultTemplate} 
                            onChange={(e) => setWhatsappForm({...whatsappForm, zavuDefaultTemplate: e.target.value})} 
                            placeholder="certificate_due_reminder"
                            className="bg-background border-border h-11 text-foreground" 
                          />
                        </div>
                      </>
                    )}

                    {whatsappForm.activeProvider === "Meta" && (
                      <>
                        <div className="md:col-span-2 space-y-2">
                          <Label className="text-muted-foreground font-bold">Meta Access Token</Label>
                          <Input 
                            type="password"
                            value={whatsappForm.metaAccessToken} 
                            onChange={(e) => setWhatsappForm({...whatsappForm, metaAccessToken: e.target.value})} 
                            placeholder="EAA..."
                            className="bg-background border-border h-11 text-foreground" 
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-muted-foreground font-bold">Phone Number ID</Label>
                          <Input 
                            value={whatsappForm.metaPhoneId} 
                            onChange={(e) => setWhatsappForm({...whatsappForm, metaPhoneId: e.target.value})} 
                            placeholder="e.g. 1029384756"
                            className="bg-background border-border h-11 text-foreground" 
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-muted-foreground font-bold">Business Account ID</Label>
                          <Input 
                            value={whatsappForm.metaAccountId} 
                            onChange={(e) => setWhatsappForm({...whatsappForm, metaAccountId: e.target.value})} 
                            placeholder="e.g. 987654321"
                            className="bg-background border-border h-11 text-foreground" 
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-muted-foreground font-bold">Verify Token (for Webhook Validation)</Label>
                          <Input 
                            value={whatsappForm.metaVerifyToken} 
                            onChange={(e) => setWhatsappForm({...whatsappForm, metaVerifyToken: e.target.value})} 
                            placeholder="Verify token"
                            className="bg-background border-border h-11 text-foreground" 
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-muted-foreground font-bold">App Secret</Label>
                          <Input 
                            type="password"
                            value={whatsappForm.metaAppSecret} 
                            onChange={(e) => setWhatsappForm({...whatsappForm, metaAppSecret: e.target.value})} 
                            placeholder="App secret"
                            className="bg-background border-border h-11 text-foreground" 
                          />
                        </div>
                      </>
                    )}

                    {whatsappForm.activeProvider === "Twilio" && (
                      <>
                        <div className="space-y-2">
                          <Label className="text-muted-foreground font-bold">Twilio Account SID</Label>
                          <Input 
                            value={whatsappForm.twilioAccountSid} 
                            onChange={(e) => setWhatsappForm({...whatsappForm, twilioAccountSid: e.target.value})} 
                            placeholder="AC..."
                            className="bg-background border-border h-11 text-foreground" 
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-muted-foreground font-bold">Twilio Auth Token</Label>
                          <Input 
                            type="password"
                            value={whatsappForm.twilioAuthToken} 
                            onChange={(e) => setWhatsappForm({...whatsappForm, twilioAuthToken: e.target.value})} 
                            placeholder="Twilio Token"
                            className="bg-background border-border h-11 text-foreground" 
                          />
                        </div>

                        <div className="md:col-span-2 space-y-2">
                          <Label className="text-muted-foreground font-bold">WhatsApp Sender Number</Label>
                          <Input 
                            value={whatsappForm.twilioSenderNumber} 
                            onChange={(e) => setWhatsappForm({...whatsappForm, twilioSenderNumber: e.target.value})} 
                            placeholder="whatsapp:+14155552671"
                            className="bg-background border-border h-11 text-foreground" 
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="pt-6 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Button 
                      type="button"
                      disabled={loading || testingConnection}
                      onClick={handleTestConnection}
                      variant="outline"
                      className="h-11 px-5 text-foreground font-bold rounded-xl border border-border bg-card hover:bg-accent/10"
                    >
                      {testingConnection ? "Pinging..." : "Test Connection"}
                    </Button>
                    <Button 
                      type="button"
                      disabled={loading || testingSandbox}
                      onClick={handleTestSandboxConnection}
                      variant="outline"
                      className="h-11 px-5 text-emerald-600 dark:text-emerald-400 font-bold rounded-xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10"
                    >
                      {testingSandbox ? "Checking..." : "Verify Sandbox"}
                    </Button>
                    <Button 
                      type="button"
                      disabled={loading}
                      onClick={() => setTestModalOpen(true)}
                      variant="outline"
                      className="h-11 px-5 text-foreground font-bold rounded-xl border border-border bg-card hover:bg-accent/10"
                    >
                      Send Test Message
                    </Button>
                  </div>
                  <Button disabled={loading} type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 font-bold h-11 rounded-xl border-0 shadow-lg shadow-emerald-500/20 w-full sm:w-auto">
                    {loading ? "Saving Settings..." : "Save Configuration"} <Save className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </form>

              {/* Settings Configuration Change History Log */}
              <div className="bg-card border border-border rounded-3xl p-6 shadow-xs space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-foreground uppercase tracking-widest flex items-center gap-2">
                    <SlidersHorizontal className="w-5 h-5 text-emerald-600" /> Settings Modification History
                  </h4>
                  <p className="text-xs text-muted-foreground font-medium">Audit logs tracking configuration adjustment events, operator IDs, and payload changes.</p>
                </div>

                <div className="border border-border/80 rounded-2xl overflow-hidden bg-muted/20">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-accent/40 border-b border-border/80 text-muted-foreground uppercase font-black tracking-wider text-[10px]">
                          <th className="p-4">Timestamp</th>
                          <th className="p-4">Action</th>
                          <th className="p-4">Operator</th>
                          <th className="p-4">Adjustment Changes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {settingsAuditLogs.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-8 text-center text-muted-foreground font-medium">
                              No settings adjustment events logged.
                            </td>
                          </tr>
                        ) : (
                          settingsAuditLogs.map((logItem, idx) => {
                            let oldDataObj: Record<string, string> = {};
                            let newDataObj: Record<string, string> = {};
                            try {
                              oldDataObj = JSON.parse(logItem.old_data || "{}");
                              newDataObj = JSON.parse(logItem.new_data || "{}");
                            } catch {}

                            // Extract modified keys
                            const changedKeys = Object.keys(newDataObj).filter(k => oldDataObj[k] !== newDataObj[k]);

                            return (
                              <tr key={idx} className="hover:bg-accent/20 transition-all">
                                <td className="p-4 font-medium text-foreground whitespace-nowrap">
                                  {new Date(logItem.created_at).toLocaleString('en-IN')}
                                </td>
                                <td className="p-4">
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600">
                                    {logItem.action}
                                  </span>
                                </td>
                                <td className="p-4 font-mono font-medium text-muted-foreground">
                                  {logItem.user_id || "SYSTEM"}
                                </td>
                                <td className="p-4 space-y-1 w-full max-w-sm">
                                  {changedKeys.length === 0 ? (
                                    <span className="text-muted-foreground italic font-medium text-[11px]">No values changed</span>
                                  ) : (
                                    changedKeys.map((keyStr, kidx) => {
                                      const oldVal = oldDataObj[keyStr] || "N/A";
                                      const newVal = newDataObj[keyStr] || "N/A";
                                      const isSecret = keyStr.includes("key") || keyStr.includes("token") || keyStr.includes("secret") || keyStr.includes("auth");
                                      return (
                                        <div key={kidx} className="bg-accent/30 p-2 rounded-xl border border-border/40 font-mono text-[10px] space-y-0.5">
                                          <div className="font-bold text-foreground">{keyStr}</div>
                                          <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                                            <span className="line-through">{isSecret ? "••••••••••••" : oldVal}</span>
                                            <span>➔</span>
                                            <span className="text-emerald-600 font-bold">{isSecret ? "••••••••••••" : newVal}</span>
                                          </div>
                                        </div>
                                      );
                                    })
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Test Message Modal */}
              <Dialog open={testModalOpen} onOpenChange={setTestModalOpen}>
                <DialogContent className="max-w-md bg-card border border-border rounded-3xl p-6">
                  <form onSubmit={handleSendTestMessageSubmit}>
                    <DialogHeader className="space-y-1">
                      <DialogTitle className="text-lg font-bold text-foreground">Send Test WhatsApp</DialogTitle>
                      <DialogDescription className="text-xs text-muted-foreground">
                        Dispatches a mock certificate due warning message to the whitelist phone number using your active credentials.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 my-6">
                      <div className="space-y-1.5">
                        <Label className="text-muted-foreground font-bold">Recipient Phone Number</Label>
                        <Input 
                          required
                          value={testPhoneNumber}
                          onChange={(e) => setTestPhoneNumber(e.target.value)}
                          placeholder="e.g. +919999999999"
                          className="bg-background border-border h-11 text-foreground"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-muted-foreground font-bold">Template ID (Optional, defaults to setting)</Label>
                        <Input 
                          value={testTemplateName}
                          onChange={(e) => setTestTemplateName(e.target.value)}
                          placeholder="e.g. certificate_due_reminder"
                          className="bg-background border-border h-11 text-foreground"
                        />
                      </div>
                    </div>

                    <DialogFooter className="gap-2">
                      <Button 
                        type="button" 
                        variant="ghost" 
                        onClick={() => setTestModalOpen(false)}
                        className="h-11 rounded-xl font-bold border-0"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={sendingTest}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-11 px-6 rounded-xl border-0"
                      >
                        {sendingTest ? "Sending..." : "Dispatch Message"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>

              {/* Sandbox Diagnostics Log Modal */}
              <Dialog open={sandboxLogsModalOpen} onOpenChange={setSandboxLogsModalOpen}>
                <DialogContent className="max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                      <SlidersHorizontal className="w-5 h-5 text-emerald-600" /> Sandbox Connection Logs
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                      Diagnostics verification logs for the developer sandbox connection.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="my-4 space-y-2.5 max-h-60 overflow-y-auto bg-muted/40 p-4 border border-border/60 rounded-2xl">
                    {sandboxLogs.length === 0 ? (
                      <div className="flex items-center justify-center h-20 text-xs text-muted-foreground font-medium">
                        Initializing diagnostics connection...
                      </div>
                    ) : (
                      sandboxLogs.map((logStr, idx) => (
                        <div key={idx} className={cn(
                          "text-xs font-mono font-medium leading-relaxed",
                          logStr.startsWith("CRITICAL ERROR") && "text-rose-500 font-bold",
                          logStr.startsWith("[4/4]") && "text-emerald-500 font-bold",
                          !logStr.startsWith("CRITICAL ERROR") && !logStr.startsWith("[4/4]") && "text-foreground"
                        )}>
                          {logStr}
                        </div>
                      ))
                    )}
                  </div>

                  <DialogFooter className="mt-4">
                    <Button onClick={() => setSandboxLogsModalOpen(false)} className="font-bold rounded-xl px-6">
                      Close Logs
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
