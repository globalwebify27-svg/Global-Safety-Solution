"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth";
import { API_BASE_URL } from "@/lib/config";
import { Shield, ShieldAlert, ShieldCheck, ArrowRight, Settings2, Plus, Info, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Role {
  id: string;
  name: string;
  description: string;
  _count: {
    users: number;
  };
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newRole, setNewRole] = useState({ name: "", description: "" });
  const { user, token } = useAuthStore();

  const fetchRoles = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE_URL}/rbac/roles`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!r.ok) throw new Error("Failed to fetch roles");
      const data = await r.json();
      setRoles(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("Roles Fetch Error:", err.message);
      toast.error("Security Sync Failed", { description: "Could not retrieve organizational roles." });
    } finally {
      setLoading(false);
    }
  };

  const isSuperAdmin = user?.email === "admin@globalsafety.com" || user?.email === "amrvbloggers@gmail.com" || user?.role === "SUPER_ADMIN";

  useEffect(() => {
    if (user && !isSuperAdmin) {
      window.location.href = "/dashboard";
    }
  }, [user, isSuperAdmin]);

  useEffect(() => {
    fetchRoles();
  }, [token]);

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRole.name) return toast.error("Validation Error", { description: "Role name is required." });
    
    setIsSubmitting(true);
    try {
      const r = await fetch(`${API_BASE_URL}/rbac/roles`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(newRole)
      });

      if (!r.ok) throw new Error("Failed to create role");
      
      toast.success("Identity Policy Created", { description: `The role '${newRole.name}' is now active.` });
      setIsModalOpen(false);
      setNewRole({ name: "", description: "" });
      fetchRoles();
    } catch (err: any) {
      toast.error("Provisioning Failed", { description: "The security system rejected this role configuration." });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
      <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      <p className="text-muted-foreground font-bold animate-pulse text-xs uppercase tracking-widest">Loading Security Profiles...</p>
    </div>
  );

  return (
    <div className="space-y-10 pb-12 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tighter text-foreground">
            Identity <span className="text-primary">& Access</span>
          </h1>
          <p className="text-muted-foreground font-medium max-w-md">Manage organizational roles, security permissions, and access levels.</p>
        </div>
        <Button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-12 px-6 shadow-xl shadow-primary/20"
        >
          <Plus className="w-4 h-4 mr-2" /> Create New Role
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles.map((role) => (
          <div key={role.id} className="group p-8 rounded-[2.5rem] bg-card/40 border border-border hover:border-primary/20 transition-all hover:translate-y-[-4px] relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 blur-[80px] opacity-10 bg-primary/40 group-hover:opacity-20 transition-opacity" />
             
             <div className="relative z-10 space-y-6">
                <div className="flex items-center justify-between">
                  <div className={cn("p-3 rounded-2xl bg-primary/10 text-primary")}>
                    <Shield className="w-6 h-6" />
                  </div>
                  <div className="px-3 py-1 rounded-full bg-accent/50 border border-border text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    {role._count.users} Users
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-black text-foreground tracking-tight uppercase">{role.name.replace('_', ' ')}</h3>
                  <p className="text-sm text-muted-foreground font-medium line-clamp-2">{role.description || "System defined security role for organizational access control."}</p>
                </div>

                <div className="pt-4 flex items-center justify-between border-t border-border/50">
                  <div className="flex items-center gap-2 text-primary">
                    <ShieldCheck className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Active Policy</span>
                  </div>
                  <Link href={`/dashboard/settings/roles/${role.id}`}>
                    <Button variant="ghost" size="sm" className="font-bold text-xs uppercase tracking-widest hover:bg-primary/10 hover:text-primary">
                      Manage Permissions <ArrowRight className="w-3 h-3 ml-2" />
                    </Button>
                  </Link>
                </div>
             </div>
          </div>
        ))}

        <div 
          onClick={() => setIsModalOpen(true)}
          className="p-8 rounded-[2.5rem] border-2 border-dashed border-border flex flex-col items-center justify-center text-center space-y-4 hover:border-primary/40 transition-colors group cursor-pointer"
        >
          <div className="p-4 rounded-full bg-accent/30 text-muted-foreground group-hover:text-primary transition-colors">
            <Settings2 className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <p className="font-black text-foreground tracking-tighter uppercase">Add Custom Role</p>
            <p className="text-xs text-muted-foreground font-medium max-w-[180px]">Define unique access rules for specific departments.</p>
          </div>
        </div>
      </div>

      <div className="p-6 rounded-3xl bg-indigo-500/5 border border-indigo-500/10 flex items-start gap-4">
        <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500 shrink-0">
          <Info className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-bold text-foreground tracking-tight uppercase">Security Notice</p>
          <p className="text-xs text-muted-foreground leading-relaxed font-medium">Changes to role permissions are applied immediately. Ensure you verify the impacts on user workflows before committing security updates. The SUPER_ADMIN role cannot be modified.</p>
        </div>
      </div>
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl bg-card">
           <div className="p-8 space-y-8">
              <DialogHeader>
                <div className="flex items-center gap-4 mb-2">
                  <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                    <Plus className="w-6 h-6" />
                  </div>
                  <div>
                    <DialogTitle className="text-2xl font-black tracking-tight uppercase">New Security Profile</DialogTitle>
                    <DialogDescription className="font-medium text-muted-foreground">Define a new organizational role and access policy.</DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <form onSubmit={handleCreateRole} className="space-y-6">
                 <div className="space-y-2">
                   <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Identity Designation</Label>
                   <Input 
                      id="name"
                      placeholder="e.g. OPERATION_ADMIN"
                      value={newRole.name}
                      onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                      className="h-14 rounded-2xl bg-accent/30 border-none focus-visible:ring-2 focus-visible:ring-primary/20 text-lg font-bold"
                   />
                 </div>

                 <div className="space-y-2">
                   <Label htmlFor="description" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Access Scope Description</Label>
                   <Input 
                      id="description"
                      placeholder="Describe the level of authority..."
                      value={newRole.description}
                      onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                      className="h-14 rounded-2xl bg-accent/30 border-none focus-visible:ring-2 focus-visible:ring-primary/20 font-medium"
                   />
                 </div>

                 <div className="pt-4 flex gap-3">
                   <Button 
                      type="button"
                      variant="ghost" 
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 h-12 rounded-2xl font-bold uppercase tracking-widest text-xs"
                    >
                      Cancel
                   </Button>
                   <Button 
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 h-12 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20"
                    >
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Establish Role"}
                   </Button>
                 </div>
              </form>
           </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
