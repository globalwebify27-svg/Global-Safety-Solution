"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import { API_BASE_URL } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Plus, User, Mail, Phone, FileText, Building2, MapPin, Briefcase } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  gst_number?: string;
  pan_number?: string;
  industry?: string;
  city?: string;
  is_active: boolean;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const token = useAuthStore((state) => state.token);

  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    phone: '', 
    gst_number: '', 
    pan_number: '', 
    industry: '', 
    city: '',
    assigned_staff_id: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchClients();
  }, [token]);

  const fetchClients = () => {
    if (!token) {
        // If it mounts but token isn't hydrated yet, we wait.
        // However, if we're indefinitely stuck natively:
        setTimeout(() => setLoading(false), 2000); // Failsafe
        return;
    }
    setLoading(true);
    fetch(`${API_BASE_URL}/clients`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(r => r.json())
    .then(data => {
      if (Array.isArray(data)) {
        setClients(data);
      } else {
        console.error("Failed to load clients data:", data);
        setClients([]);
      }
      setLoading(false);
    })
    .catch((e) => {
      console.error(e);
      setLoading(false);
    });

    fetch(`${API_BASE_URL}/users`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(r => r.json())
    .then(data => {
      if (Array.isArray(data)) setStaff(data);
    })
    .catch(console.error);
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/clients`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          ...formData,
          assigned_staff_id: formData.assigned_staff_id || undefined,
          is_active: true
        })
      });
      if (res.ok) {
        setOpen(false);
        setFormData({ name: '', email: '', phone: '', gst_number: '', pan_number: '', industry: '', city: '', assigned_staff_id: '' });
        fetchClients(); 
      } else {
        alert("Failed to create client");
      }
    } catch(err) {
      alert("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-muted-foreground">
          Clients Directory
        </h1>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 h-10 px-6 py-2 rounded-md font-semibold inline-flex items-center justify-center text-sm transition-colors" />}>
            <Plus className="w-4 h-4 mr-2" /> Add Client
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] bg-card border-border text-foreground shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-teal-500">
                Onboard Enterprise Client
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Enter the comprehensive KYC and compliance data for the new organization.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateClient} className="mt-4">
              <div className="grid grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="org_name" className="text-foreground/80">Organization Name *</Label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                      <Input id="org_name" name="org_name" autoComplete="off" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="pl-9 bg-background border-border text-foreground focus:ring-primary placeholder:text-muted-foreground/50" placeholder="Acme Global Inc." required />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="assigned_staff" className="text-foreground/80">Assign Staff / Account Manager</Label>
                    <div className="relative">
                      <Briefcase className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                      <select 
                        id="assigned_staff"
                        value={formData.assigned_staff_id}
                        onChange={(e) => setFormData({...formData, assigned_staff_id: e.target.value})}
                        className="w-full pl-9 h-10 bg-background border border-border rounded-md text-foreground focus:ring-2 focus:ring-primary focus:outline-none appearance-none"
                      >
                        <option value="">Select Staff Member (Optional)</option>
                        {staff.map((s: any) => (
                          <option key={s.id} value={s.id}>{s.name} ({s.designation || 'Staff'})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-foreground/80">Official Email</Label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                      <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="pl-9 bg-background border-border text-foreground placeholder:text-muted-foreground/50" placeholder="contact@acme.com" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-foreground/80">Contact Number</Label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                      <Input id="phone" type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="pl-9 bg-background border-border text-foreground placeholder:text-muted-foreground/50" placeholder="+91 98765 43210" />
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="gst" className="text-foreground/80">GST Number</Label>
                    <div className="relative">
                      <FileText className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                      <Input id="gst" value={formData.gst_number} onChange={(e) => setFormData({...formData, gst_number: e.target.value})} className="pl-9 bg-background border-border text-foreground uppercase placeholder:text-muted-foreground/50" placeholder="22AAAAA0000A1Z5" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pan" className="text-foreground/80">PAN Number</Label>
                    <div className="relative">
                      <FileText className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                      <Input id="pan" value={formData.pan_number} onChange={(e) => setFormData({...formData, pan_number: e.target.value})} className="pl-9 bg-background border-border text-foreground uppercase placeholder:text-muted-foreground/50" placeholder="ABCDE1234F" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="industry" className="text-foreground/80">Industry</Label>
                      <div className="relative">
                        <Building2 className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                        <Input id="industry" value={formData.industry} onChange={(e) => setFormData({...formData, industry: e.target.value})} className="pl-9 bg-background border-border text-foreground placeholder:text-muted-foreground/50" placeholder="Manufacturing" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city" className="text-foreground/80">Base City</Label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                        <Input id="city" value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} className="pl-9 bg-background border-border text-foreground placeholder:text-muted-foreground/50" placeholder="Mumbai" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="mt-8 border-t border-border pt-6">
                <Button variant="ghost" type="button" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground hover:bg-accent/10 mr-2">
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white min-w-[120px] shadow-lg shadow-blue-500/20 font-semibold border-0">
                  {submitting ? 'Saving...' : 'Finalize & Secure Data'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Directory Table */}
      <div className="bg-card/50 backdrop-blur-md rounded-xl border border-border overflow-hidden shadow-sm">
        <table className="w-full text-left font-medium">
          <thead className="bg-muted text-muted-foreground text-sm">
            <tr>
              <th className="px-6 py-4 border-b border-border">Client Enterprise</th>
              <th className="px-6 py-4 border-b border-border">Contact Info</th>
              <th className="px-6 py-4 border-b border-border">Compliance ID (GST)</th>
              <th className="px-6 py-4 border-b border-border">Status</th>
              <th className="px-6 py-4 border-b border-border text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-sm">
            {loading ? (
               <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">Loading clients...</td></tr>
            ) : clients.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">No enterprise clients found in the registry.</td></tr>
            ) : (
              clients.map((c) => (
                <tr key={c.id} className="hover:bg-accent/5 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="text-foreground font-semibold">{c.name}</div>
                    <div className="text-muted-foreground text-xs mt-1">{c.industry || 'General Industry'} • {c.city || 'No Location'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-foreground/80">{c.email || 'No email provided'}</div>
                    <div className="text-muted-foreground text-xs mt-1">{c.phone || 'No phone provided'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-muted-foreground uppercase tracking-widest text-xs font-mono">{c.gst_number || '--'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20 shadow-lg shadow-emerald-500/10">
                      {c.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/dashboard/clients/${c.id}`}
                      className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-primary hover:text-primary/80 hover:bg-primary/10 transition-all"
                    >
                      View Details
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>

  );
}
