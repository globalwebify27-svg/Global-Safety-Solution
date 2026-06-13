"use client";

import { useEffect, useState, use } from "react";
import { useAuthStore } from "@/store/auth";
import { API_BASE_URL } from "@/lib/config";
import { Shield, Check, X, Save, ArrowLeft, Lock, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Permission {
  id: string;
  name: string;
  description: string;
  module: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
}

export default function RoleDetail({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const roleId = resolvedParams.id;
  const [role, setRole] = useState<Role | null>(null);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [activePermissionIds, setActivePermissionIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { token, user } = useAuthStore();
  const isSuperAdmin = user?.email === "admin@globalsafety.com" || user?.email === "amrvbloggers@gmail.com" || user?.role === "SUPER_ADMIN";

  useEffect(() => {
    if (user && !isSuperAdmin) {
      window.location.href = "/dashboard";
    }
  }, [user, isSuperAdmin]);

  useEffect(() => {
    if (!token) return;

    const fetchData = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        
        const fetchWithLogging = async (url: string) => {
          try {
            const res = await fetch(url, { headers });
            if (!res.ok) throw new Error(`HTTP ${res.status} at ${url}`);
            return await res.json();
          } catch (e: any) {
            console.error(`Fetch failed for ${url}:`, e.message);
            throw e;
          }
        };

        const [rolesData, permsData, rolePermsData] = await Promise.all([
          fetchWithLogging(`${API_BASE_URL}/rbac/roles`),
          fetchWithLogging(`${API_BASE_URL}/rbac/permissions`),
          fetchWithLogging(`${API_BASE_URL}/rbac/roles/${roleId}/permissions`),
        ]);

        const roles = Array.isArray(rolesData) ? rolesData : [];
        const permissions = Array.isArray(permsData) ? permsData : [];
        const activeIds = Array.isArray(rolePermsData) ? rolePermsData : [];

        setRole(roles.find((r: Role) => r.id === roleId) || null);
        setAllPermissions(permissions);
        setActivePermissionIds(activeIds);
        setLoading(false);
      } catch (err) {
        console.error("Fetch Data Error:", err);
        setLoading(false);
      }
    };

    fetchData();
  }, [token, roleId]);

  const handleToggle = (id: string) => {
    if (role?.name === 'SUPER_ADMIN') return;
    setActivePermissionIds(prev => 
      prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (!token || !role) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/rbac/roles/${roleId}/permissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ permissionIds: activePermissionIds })
      });

      if (res.ok) {
        toast.success("Security policy updated successfully");
      } else {
        toast.error("Failed to update security policy");
      }
    } catch (err) {
      toast.error("Network error updating policy");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
      <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      <p className="text-muted-foreground font-bold animate-pulse text-xs uppercase tracking-widest">Decoding Permission Matrix...</p>
    </div>
  );

  // Group permissions by module
  const modules = Array.from(new Set(allPermissions.map(p => p.module)));

  return (
    <div className="space-y-10 pb-12 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <Link href="/dashboard/settings/roles">
            <Button variant="outline" size="icon" className="rounded-2xl border-border bg-card/50 hover:bg-accent">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-black tracking-tighter text-foreground uppercase">{role?.name.replace('_', ' ')}</h1>
              {role?.name === 'SUPER_ADMIN' && <Lock className="w-5 h-5 text-amber-500" />}
            </div>
            <p className="text-muted-foreground font-medium uppercase tracking-widest text-[10px]">Permission Assignment Matrix</p>
          </div>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={saving || role?.name === 'SUPER_ADMIN'}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-12 px-8 shadow-xl shadow-primary/20 min-w-[160px]"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Commit Changes
        </Button>
      </div>

      <div className="space-y-8">
        {modules.map(moduleName => (
          <div key={moduleName} className="p-8 rounded-[2.5rem] bg-card/40 border border-border backdrop-blur-md space-y-6">
            <div className="flex items-center justify-between border-b border-border/50 pb-4">
              <h3 className="text-lg font-black tracking-tight text-primary uppercase">{moduleName} Module</h3>
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-accent/30 px-3 py-1 rounded-full">
                {allPermissions.filter(p => p.module === moduleName).length} Keys
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allPermissions.filter(p => p.module === moduleName).map(permission => {
                const isActive = activePermissionIds.includes(permission.id);
                return (
                  <button
                    key={permission.id}
                    onClick={() => handleToggle(permission.id)}
                    className={cn(
                      "flex items-start gap-4 p-5 rounded-3xl border transition-all text-left",
                      isActive 
                        ? "bg-primary/10 border-primary/30 shadow-lg shadow-primary/5" 
                        : "bg-accent/10 border-border hover:border-muted-foreground/30",
                      role?.name === 'SUPER_ADMIN' && "cursor-not-allowed opacity-80"
                    )}
                  >
                    <div className={cn(
                      "w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                      isActive ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" : "bg-muted-foreground/20 text-muted-foreground"
                    )}>
                      {isActive ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                    </div>
                    <div className="space-y-1">
                      <p className={cn("text-xs font-black uppercase tracking-tighter", isActive ? "text-primary" : "text-foreground/80")}>
                        {permission.name.replace(/_/g, ' ')}
                      </p>
                      <p className="text-[10px] leading-relaxed text-muted-foreground font-medium">{permission.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="p-6 rounded-3xl bg-amber-500/5 border border-amber-500/10 flex items-start gap-4">
        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 shrink-0">
          <Info className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-bold text-foreground tracking-tight uppercase">Access Control Policy</p>
          <p className="text-xs text-muted-foreground leading-relaxed font-medium">The SUPER_ADMIN role has immutable access to all system functions for security continuity. For other roles, permissions can be added or revoked dynamically without a system restart.</p>
        </div>
      </div>
    </div>
  );
}
