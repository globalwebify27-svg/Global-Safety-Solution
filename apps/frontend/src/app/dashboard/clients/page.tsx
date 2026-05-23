"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import { API_BASE_URL } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Plus, User, Mail, Phone, FileText, Building2, MapPin, Briefcase, Search } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Task {
  id: string;
  title: string;
  status: string;
}

interface WorkOrder {
  id: string;
  work_order_no: string;
  status: string;
}

interface Project {
  id: string;
  name: string;
  status: string;
  tasks?: Task[];
  work_orders?: WorkOrder[];
}

interface Inspection {
  id: string;
  status: string;
}

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
  assigned_staff?: {
    id: string;
    name: string;
    email: string;
    designation?: string;
  };
  projects?: Project[];
  inspections?: Inspection[];
}

function getClientWorkStats(client: Client) {
  let done = 0;
  let pending = 0;

  // 1. Projects
  if (client.projects) {
    client.projects.forEach((p) => {
      if (p.status === 'COMPLETED') {
        done++;
      } else {
        pending++;
      }

      // 2. Tasks
      if (p.tasks) {
        p.tasks.forEach((t) => {
          if (t.status === 'DONE') {
            done++;
          } else {
            pending++;
          }
        });
      }

      // 3. Work Orders
      if (p.work_orders) {
        p.work_orders.forEach((w) => {
          if (w.status === 'COMPLETED') {
            done++;
          } else {
            pending++;
          }
        });
      }
    });
  }

  // 4. Inspections
  if (client.inspections) {
    client.inspections.forEach((i) => {
      if (i.status === 'COMPLETED') {
        done++;
      } else {
        pending++;
      }
    });
  }

  const total = done + pending;
  const percentage = total > 0 ? Math.round((done / total) * 100) : 0;

  return { done, pending, total, percentage };
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const token = useAuthStore((state) => state.token);

  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    phone: '', 
    gst_number: '', 
    pan_number: '', 
    industry: '', 
    city: '',
    state: '',
    billing_address: '',
    assigned_staff_id: '',
    contacts: [{ name: '', designation: '', email: '', phone: '' }]
  });
  const [activeTab, setActiveTab] = useState("basic");
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

    fetch(`${API_BASE_URL}/leads`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(r => r.json())
    .then(data => {
      if (Array.isArray(data)) setLeads(data);
    })
    .catch(console.error);
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    try {
      const cleanFormData = {
        name: formData.name.trim(),
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        gst_number: formData.gst_number.trim() || undefined,
        pan_number: formData.pan_number.trim() || undefined,
        industry: formData.industry.trim() || undefined,
        city: formData.city.trim() || undefined,
        state: formData.state.trim() || undefined,
        billing_address: formData.billing_address.trim() || undefined,
        assigned_staff_id: formData.assigned_staff_id || undefined,
        is_active: true,
        contacts: formData.contacts
          .map(c => ({
            name: c.name.trim() || undefined,
            designation: c.designation.trim() || undefined,
            email: c.email.trim() || undefined,
            phone: c.phone.trim() || undefined,
          }))
          .filter(c => c.name || c.email || c.phone)
      };

      const res = await fetch(`${API_BASE_URL}/clients`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(cleanFormData)
      });
      if (res.ok) {
        setOpen(false);
        setFormData({ name: '', email: '', phone: '', gst_number: '', pan_number: '', industry: '', city: '', state: '', billing_address: '', assigned_staff_id: '', contacts: [{ name: '', designation: '', email: '', phone: '' }] });
        setActiveTab("basic");
        fetchClients();
      } else {
        const errData = await res.json().catch(() => ({}));
        const errMsg = errData.message 
          ? (Array.isArray(errData.message) ? errData.message.join(", ") : errData.message)
          : "Failed to create client";
        alert(`Failed to create client: ${errMsg}`);
      }
    } catch(err) {
      alert("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredClients = clients.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    
    // Check main client details
    if (c.name.toLowerCase().includes(q)) return true;
    if (c.email?.toLowerCase().includes(q)) return true;
    if (c.gst_number?.toLowerCase().includes(q)) return true;
    if (c.industry?.toLowerCase().includes(q)) return true;
    if (c.city?.toLowerCase().includes(q)) return true;
    
    // Check assigned officer
    if (c.assigned_staff?.name.toLowerCase().includes(q)) return true;

    // Check nested projects and work orders
    if (c.projects) {
      for (const p of c.projects) {
        if (p.name.toLowerCase().includes(q)) return true;
        if (p.work_orders) {
          for (const w of p.work_orders) {
            if (w.work_order_no.toLowerCase().includes(q)) return true;
          }
        }
      }
    }

    return false;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-muted-foreground">
          Clients Directory
        </h1>
        
        <div className="flex items-center gap-4">
          <div className="relative w-64 md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <Input 
              placeholder="Search by client, officer, order ID..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-card border-border shadow-sm focus:ring-primary"
            />
          </div>
          
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
              {/* Tab Navigation */}
              <div className="flex space-x-1 rounded-xl bg-muted p-1 mb-6">
                <button
                  type="button"
                  onClick={() => setActiveTab('basic')}
                  className={`w-full rounded-lg py-2.5 text-sm font-medium leading-5 ${activeTab === 'basic' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:bg-white/[0.12] hover:text-foreground'}`}
                >
                  Basic Info
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('address')}
                  className={`w-full rounded-lg py-2.5 text-sm font-medium leading-5 ${activeTab === 'address' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:bg-white/[0.12] hover:text-foreground'}`}
                >
                  Address
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('contacts')}
                  className={`w-full rounded-lg py-2.5 text-sm font-medium leading-5 ${activeTab === 'contacts' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:bg-white/[0.12] hover:text-foreground'}`}
                >
                  Contacts
                </button>
              </div>

              {/* Basic Tab */}
              {activeTab === 'basic' && (
                <div className="grid grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="org_name" className="text-foreground/80">Organization Name *</Label>
                      <div className="relative">
                        <Building2 className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                        <input 
                          id="org_name" 
                          name="org_name" 
                          list="leads-list"
                          autoComplete="off" 
                          value={formData.name} 
                          onChange={(e) => {
                            const val = e.target.value;
                            const matchedLead = leads.find(l => l.company_name === val);
                            if (matchedLead) {
                              setFormData({
                                ...formData,
                                name: val,
                                email: matchedLead.email || formData.email,
                                phone: matchedLead.phone || formData.phone,
                                industry: matchedLead.source || formData.industry,
                              });
                            } else {
                              setFormData({...formData, name: val});
                            }
                          }} 
                          className="w-full pl-9 h-10 bg-background border border-border rounded-md text-foreground focus:ring-2 focus:ring-primary focus:outline-none placeholder:text-muted-foreground/50" 
                          placeholder="Acme Global Inc." 
                          required 
                        />
                        <datalist id="leads-list">
                          {leads.map((l) => (
                            <option key={l.id} value={l.company_name}>
                              {l.contact_person ? `${l.company_name} (${l.contact_person})` : l.company_name}
                            </option>
                          ))}
                        </datalist>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="assigned_staff" className="text-foreground/80">Assigned Safety Officer</Label>
                      <div className="relative">
                        <Briefcase className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                        <select 
                          id="assigned_staff"
                          value={formData.assigned_staff_id}
                          onChange={(e) => setFormData({...formData, assigned_staff_id: e.target.value})}
                          className="w-full pl-9 h-10 bg-background border border-border rounded-md text-foreground focus:ring-2 focus:ring-primary focus:outline-none appearance-none"
                        >
                          <option value="">Select Safety Officer (Optional)</option>
                          {staff.map((s: any) => (
                            <option key={s.id} value={s.id}>{s.name} ({s.designation || 'Safety Officer'})</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="industry" className="text-foreground/80">Industry</Label>
                      <div className="relative">
                        <Building2 className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                        <Input id="industry" value={formData.industry} onChange={(e) => setFormData({...formData, industry: e.target.value})} className="pl-9 bg-background border-border text-foreground placeholder:text-muted-foreground/50" placeholder="Manufacturing" />
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-foreground/80">Primary Org Email</Label>
                      <div className="relative">
                        <Mail className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                        <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="pl-9 bg-background border-border text-foreground placeholder:text-muted-foreground/50" placeholder="contact@acme.com" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-foreground/80">Primary Org Phone</Label>
                      <div className="relative">
                        <Phone className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                        <Input id="phone" type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="pl-9 bg-background border-border text-foreground placeholder:text-muted-foreground/50" placeholder="+91 98765 43210" />
                      </div>
                    </div>

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
                  </div>
                </div>
              )}

              {/* Address Tab */}
              {activeTab === 'address' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="billing_address" className="text-foreground/80">Organization Address</Label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                      <Input id="billing_address" value={formData.billing_address} onChange={(e) => setFormData({...formData, billing_address: e.target.value})} className="pl-9 bg-background border-border text-foreground placeholder:text-muted-foreground/50" placeholder="123 Corporate Park, Main Street" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city" className="text-foreground/80">City</Label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                        <Input id="city" value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} className="pl-9 bg-background border-border text-foreground placeholder:text-muted-foreground/50" placeholder="Mumbai" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state" className="text-foreground/80">State / District</Label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                        <Input id="state" value={formData.state} onChange={(e) => setFormData({...formData, state: e.target.value})} className="pl-9 bg-background border-border text-foreground placeholder:text-muted-foreground/50" placeholder="Maharashtra" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Contacts Tab */}
              {activeTab === 'contacts' && (
                <div className="space-y-6">
                  {formData.contacts.map((contact, index) => (
                    <div key={index} className="p-4 rounded-xl border border-border bg-accent/5 relative space-y-4">
                      {index > 0 && (
                        <button 
                          type="button" 
                          onClick={() => {
                            const newContacts = [...formData.contacts];
                            newContacts.splice(index, 1);
                            setFormData({...formData, contacts: newContacts});
                          }}
                          className="absolute top-4 right-4 text-muted-foreground hover:text-red-500 text-sm font-medium"
                        >
                          Remove
                        </button>
                      )}
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-foreground/80">Contact Person Name</Label>
                          <div className="relative">
                            <User className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                            <Input 
                              value={contact.name} 
                              onChange={(e) => {
                                const newContacts = [...formData.contacts];
                                newContacts[index].name = e.target.value;
                                setFormData({...formData, contacts: newContacts});
                              }} 
                              className="pl-9 bg-background border-border text-foreground" placeholder="John Doe" 
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-foreground/80">Designation</Label>
                          <div className="relative">
                            <Briefcase className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                            <Input 
                              value={contact.designation} 
                              onChange={(e) => {
                                const newContacts = [...formData.contacts];
                                newContacts[index].designation = e.target.value;
                                setFormData({...formData, contacts: newContacts});
                              }} 
                              className="pl-9 bg-background border-border text-foreground" placeholder="Manager" 
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-foreground/80">Email</Label>
                          <div className="relative">
                            <Mail className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                            <Input 
                              type="email"
                              value={contact.email} 
                              onChange={(e) => {
                                const newContacts = [...formData.contacts];
                                newContacts[index].email = e.target.value;
                                setFormData({...formData, contacts: newContacts});
                              }} 
                              className="pl-9 bg-background border-border text-foreground" placeholder="john@acme.com" 
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-foreground/80">Phone</Label>
                          <div className="relative">
                            <Phone className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                            <Input 
                              type="tel"
                              value={contact.phone} 
                              onChange={(e) => {
                                const newContacts = [...formData.contacts];
                                newContacts[index].phone = e.target.value;
                                setFormData({...formData, contacts: newContacts});
                              }} 
                              className="pl-9 bg-background border-border text-foreground" placeholder="+91..." 
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setFormData({
                        ...formData,
                        contacts: [...formData.contacts, { name: '', designation: '', email: '', phone: '' }]
                      });
                    }}
                    className="w-full border-dashed border-2 text-primary hover:text-primary hover:bg-primary/5"
                  >
                    <Plus className="w-4 h-4 mr-2" /> Add Another Contact Person
                  </Button>
                </div>
              )}

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
      </div>

      {/* Directory Table */}
      <div className="bg-card/50 backdrop-blur-md rounded-xl border border-border overflow-hidden shadow-sm">
        <table className="w-full text-left font-medium">
          <thead className="bg-muted text-muted-foreground text-sm">
            <tr>
              <th className="px-6 py-4 border-b border-border">Client Enterprise</th>
              <th className="px-6 py-4 border-b border-border">Assigned Officer</th>
              <th className="px-6 py-4 border-b border-border">Contact Info</th>
              <th className="px-6 py-4 border-b border-border">Compliance ID (GST)</th>
              <th className="px-6 py-4 border-b border-border">Work Progress</th>
              <th className="px-6 py-4 border-b border-border">Status</th>
              <th className="px-6 py-4 border-b border-border text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-sm">
            {loading ? (
               <tr><td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">Loading clients...</td></tr>
            ) : filteredClients.length === 0 ? (
               <tr><td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">No enterprise clients found in the registry.</td></tr>
            ) : (
               filteredClients.map((c) => (
                <tr key={c.id} className="hover:bg-accent/5 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="text-foreground font-semibold">{c.name}</div>
                    <div className="text-muted-foreground text-xs mt-1">{c.industry || 'General Industry'} • {c.city || 'No Location'}</div>
                  </td>
                  <td className="px-6 py-4">
                    {c.assigned_staff ? (
                      <div>
                        <div className="text-foreground font-semibold">{c.assigned_staff.name}</div>
                        <div className="text-muted-foreground text-xs mt-1">{c.assigned_staff.designation || 'Safety Officer'}</div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground/60 italic">Unassigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-foreground/80">{c.email || 'No email provided'}</div>
                    <div className="text-muted-foreground text-xs mt-1">{c.phone || 'No phone provided'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-muted-foreground uppercase tracking-widest text-xs font-mono">{c.gst_number || '--'}</div>
                  </td>
                  <td className="px-6 py-4 min-w-[200px]">
                    {(() => {
                      const { done, pending, total, percentage } = getClientWorkStats(c);
                      if (total === 0) {
                        return (
                          <div className="text-muted-foreground/60 text-xs italic flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30"></span>
                            No Active Work
                          </div>
                        );
                      }
                      return (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-bold text-foreground">
                            <span>{percentage}% Complete</span>
                            <span className="text-muted-foreground font-mono">{done}/{total} Done</span>
                          </div>
                          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500" 
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <div className="text-[10px] text-muted-foreground/80 font-medium">
                            {done} completed • {pending} pending
                          </div>
                        </div>
                      );
                    })()}
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
