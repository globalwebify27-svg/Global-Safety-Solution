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
  MessageSquare
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ProfileForm } from "./ProfileForm";
import Link from "next/link";

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
    provider: "Zavu",
    apiKey: "",
    environment: "sandbox",
    phoneId: "",
    accountId: "",
    defaultTemplate: "certificate_due_reminder",
  });

  useEffect(() => {
    let ignore = false;
    
    async function init() {
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
            provider: data.whatsapp_provider || "Zavu",
            apiKey: data.whatsapp_api_key || "",
            environment: data.whatsapp_environment || "sandbox",
            phoneId: data.whatsapp_phone_number_id || "",
            accountId: data.whatsapp_business_account_id || "",
            defaultTemplate: data.whatsapp_default_template || "certificate_due_reminder",
          });
        }
      } catch (err) {
        console.error("Fetch settings error:", err);
      }
    }

    init();
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
      const res = await fetch(`${API_BASE_URL}/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          whatsapp_enabled: whatsappForm.enabled ? "true" : "false",
          whatsapp_provider: whatsappForm.provider,
          whatsapp_api_key: whatsappForm.apiKey,
          whatsapp_environment: whatsappForm.environment,
          whatsapp_phone_number_id: whatsappForm.phoneId,
          whatsapp_business_account_id: whatsappForm.accountId,
          whatsapp_default_template: whatsappForm.defaultTemplate,
        })
      });

      if (res.ok) {
        toast.success("WhatsApp Configuration saved successfully!");
      } else {
        toast.error("Failed to save WhatsApp configuration.");
      }
    } catch {
      toast.error("Network error occurred.");
    } finally {
      setLoading(false);
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
            <form onSubmit={handleUpdateWhatsApp} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-1">
                <h3 className="text-lg font-bold flex items-center gap-2 text-foreground uppercase tracking-tight">
                  <MessageSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> WhatsApp Notification Gateway
                </h3>
                <p className="text-sm text-muted-foreground font-medium">Configure API credentials and settings for Zavu WhatsApp integration.</p>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-accent/5 border border-border hover:bg-accent/10 transition-all shadow-sm">
                  <div>
                    <div className="text-sm font-bold text-foreground">Enable WhatsApp Notifications</div>
                    <div className="text-[10px] text-muted-foreground font-medium tracking-wide">Send automated certificate renewal alerts to clients via WhatsApp</div>
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
                    <Label className="text-muted-foreground font-bold">API Provider</Label>
                    <select 
                      disabled
                      value={whatsappForm.provider}
                      className="w-full bg-background border border-border rounded-xl h-11 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground font-medium opacity-60 cursor-not-allowed"
                    >
                      <option value="Zavu">Zavu WhatsApp Business API</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-muted-foreground font-bold">Environment</Label>
                    <select 
                      value={whatsappForm.environment} 
                      onChange={(e) => setWhatsappForm({...whatsappForm, environment: e.target.value})}
                      className="w-full bg-background border border-border rounded-xl h-11 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground font-medium"
                    >
                      <option value="sandbox">Sandbox</option>
                      <option value="live">Live / Production</option>
                    </select>
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <Label className="text-muted-foreground font-bold">API Authorization Token (Key)</Label>
                    <Input 
                      type="password"
                      value={whatsappForm.apiKey} 
                      onChange={(e) => setWhatsappForm({...whatsappForm, apiKey: e.target.value})} 
                      placeholder="zavu_live_..."
                      className="bg-background border-border h-11 text-foreground" 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-muted-foreground font-bold">Phone Number ID (Optional)</Label>
                    <Input 
                      value={whatsappForm.phoneId} 
                      onChange={(e) => setWhatsappForm({...whatsappForm, phoneId: e.target.value})} 
                      placeholder="e.g. 10928374829374"
                      className="bg-background border-border h-11 text-foreground" 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-muted-foreground font-bold">Business Account ID (Optional)</Label>
                    <Input 
                      value={whatsappForm.accountId} 
                      onChange={(e) => setWhatsappForm({...whatsappForm, accountId: e.target.value})} 
                      placeholder="e.g. 8374829374829"
                      className="bg-background border-border h-11 text-foreground" 
                    />
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <Label className="text-muted-foreground font-bold">Approved Default Message Template ID</Label>
                    <Input 
                      value={whatsappForm.defaultTemplate} 
                      onChange={(e) => setWhatsappForm({...whatsappForm, defaultTemplate: e.target.value})} 
                      placeholder="certificate_due_reminder"
                      className="bg-background border-border h-11 text-foreground" 
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <Button disabled={loading} type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 font-bold h-11 rounded-xl border-0 shadow-lg shadow-emerald-500/20">
                  {loading ? "Saving Settings..." : "Save Configuration"} <Save className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
