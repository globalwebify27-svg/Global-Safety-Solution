"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth";
import { API_BASE_URL } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  Mail, 
  Phone, 
  Building2, 
  Briefcase, 
  Calendar,
  MoreVertical,
  CheckCircle2,
  XCircle,
  BadgeCheck,
  IdCard,
  CreditCard,
  MapPin,
  AlertCircle,
  TrendingUp,
  Clock,
  ExternalLink,
  History,
  Award,
  Pencil
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface Employee {
  id: string;
  name: string;
  email: string;
  phone?: string;
  designation?: string;
  department?: string;
  employee_id?: string;
  is_active: boolean;
  base_salary?: any;
  leave_balance: number;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [profileTab, setProfileTab] = useState<"overview" | "history">("overview");
  const [openPromoteDialog, setOpenPromoteDialog] = useState(false);
  const [promoteForm, setPromoteForm] = useState({
    amount: "",
    designation: "",
    effective_date: new Date().toISOString().split('T')[0],
    reason: "Annual Appraisal"
  });
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [openOnboard, setOpenOnboard] = useState(false);
  const [openProfile, setOpenProfile] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  
  const token = useAuthStore((state) => state.token);

  const [onboardForm, setOnboardForm] = useState({
    name: "",
    email: "",
    designation: "",
    department: "",
    phone: "",
    password_hash: "",
    base_salary: "",
    pan_number: "",
    aadhar_number: "",
    address: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    join_date: new Date().toISOString().split('T')[0]
  });

  const [editForm, setEditForm] = useState({
    designation: "",
    department: "",
    employee_id: "",
    phone: "",
    base_salary: "",
    pan_number: "",
    aadhar_number: "",
    address: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
  });

  useEffect(() => {
    fetchEmployees();
  }, [token]);

  const fetchEmployees = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) setEmployees(data);
    } catch (e) {
      console.error("Employee fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async (userId: string) => {
    try {
      const [userRes, hrRes] = await Promise.all([
        fetch(`${API_BASE_URL}/users/${userId}/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/hr/employee/${userId}/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      const userData = await userRes.json();
      const hrData = await hrRes.json();
      
      setProfileData({ ...userData, ...hrData });
      setProfileTab("overview");
      setOpenProfile(true);
    } catch (e) {
      console.error("Profile fetch error:", e);
    }
  };

  const handlePromote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileData || !token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/hr/employee/${profileData.id}/promote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: Number(promoteForm.amount),
          designation: promoteForm.designation,
          effective_date: promoteForm.effective_date,
          reason: promoteForm.reason
        })
      });

      if (res.ok) {
        setOpenPromoteDialog(false);
        fetchProfile(profileData.id);
        fetchEmployees();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleOnboardStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);

    try {
      const res = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(onboardForm)
      });

      if (res.ok) {
        setOpenOnboard(false);
        setOnboardForm({
          name: "", email: "", designation: "", department: "", phone: "", password_hash: "",
          base_salary: "", pan_number: "", aadhar_number: "", address: "",
          emergency_contact_name: "", emergency_contact_phone: "",
          join_date: new Date().toISOString().split('T')[0]
        });
        fetchEmployees();
      } else {
        const err = await res.json();
        alert(err.message || "Failed to onboard staff");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedEmployee) return;
    setSubmitting(true);

    try {
      const res = await fetch(`${API_BASE_URL}/users/${selectedEmployee.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
      });

      if (res.ok) {
        setOpenEditDialog(false);
        fetchEmployees();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (emp: any) => {
    setSelectedEmployee(emp);
    setEditForm({
      designation: emp.designation || "",
      department: emp.department || "",
      employee_id: emp.employee_id || "",
      phone: emp.phone || "",
      base_salary: emp.base_salary?.toString() || "",
      pan_number: emp.pan_number || "",
      aadhar_number: emp.aadhar_number || "",
      address: emp.address || "",
      emergency_contact_name: emp.emergency_contact_name || "",
      emergency_contact_phone: emp.emergency_contact_phone || "",
    });
    setOpenEditDialog(true);
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 via-teal-500 to-blue-600">
            Professional Workforce
          </h1>
          <p className="text-muted-foreground font-medium italic">Advanced HR, Payroll, and Performance Directory.</p>
        </div>

        <div className="flex items-center gap-3">
          <Dialog open={openOnboard} onOpenChange={setOpenOnboard}>
            <DialogTrigger className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-xl shadow-emerald-500/20 px-6 h-12 transition-all active:scale-95 border-0 rounded-2xl flex items-center justify-center outline-none">
                <UserPlus className="w-5 h-5 mr-2" /> Onboard New Staff
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] bg-card border-border text-foreground max-h-[90vh] overflow-y-auto scrollbar-hide rounded-3xl p-8">
              <DialogHeader>
                <DialogTitle className="text-3xl font-black flex items-center gap-3">
                  <BadgeCheck className="w-8 h-8 text-emerald-600" /> Professional Onboarding
                </DialogTitle>
                <DialogDescription className="text-muted-foreground font-medium">
                  ID will be auto-generated as <span className="text-emerald-500 font-bold font-mono">GSS/EMP/{new Date().getFullYear()}/XXX</span>
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleOnboardStaff} className="space-y-6 mt-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest opacity-70">Full Name *</Label>
                    <Input value={onboardForm.name} onChange={(e) => setOnboardForm({...onboardForm, name: e.target.value})} required className="h-12 bg-background/50 border-border rounded-xl focus:ring-emerald-500" placeholder="e.g. Rahul Sharma" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest opacity-70">Email Address *</Label>
                    <Input type="email" value={onboardForm.email} onChange={(e) => setOnboardForm({...onboardForm, email: e.target.value})} required className="h-12 bg-background/50 border-border rounded-xl focus:ring-emerald-500" placeholder="rahul@globalsafety.com" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest opacity-70">Designation</Label>
                    <Input value={onboardForm.designation} onChange={(e) => setOnboardForm({...onboardForm, designation: e.target.value})} className="h-12 bg-background/50 border-border rounded-xl focus:ring-emerald-500" placeholder="e.g. Safety Inspector" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest opacity-70">Department</Label>
                    <Input value={onboardForm.department} onChange={(e) => setOnboardForm({...onboardForm, department: e.target.value})} className="h-12 bg-background/50 border-border rounded-xl focus:ring-emerald-500" placeholder="e.g. Operations" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest opacity-70">Monthly Base Salary (₹) *</Label>
                    <Input type="number" required value={onboardForm.base_salary} onChange={(e) => setOnboardForm({...onboardForm, base_salary: e.target.value})} className="h-12 bg-background/50 border-border rounded-xl focus:ring-emerald-500 font-mono" placeholder="45000" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest opacity-70">Contact Number</Label>
                    <Input value={onboardForm.phone} onChange={(e) => setOnboardForm({...onboardForm, phone: e.target.value})} className="h-12 bg-background/50 border-border rounded-xl focus:ring-emerald-500" placeholder="+91 98765 43210" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest opacity-70">PAN Number</Label>
                    <Input value={onboardForm.pan_number} onChange={(e) => setOnboardForm({...onboardForm, pan_number: e.target.value})} className="h-12 bg-background/50 border-border rounded-xl focus:ring-emerald-500 uppercase" placeholder="ABCDE1234F" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest opacity-70">Aadhar Number</Label>
                    <Input value={onboardForm.aadhar_number} onChange={(e) => setOnboardForm({...onboardForm, aadhar_number: e.target.value})} className="h-12 bg-background/50 border-border rounded-xl focus:ring-emerald-500" placeholder="1234 5678 9012" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest opacity-70">Permanent Address</Label>
                  <textarea value={onboardForm.address} onChange={(e) => setOnboardForm({...onboardForm, address: e.target.value})} className="w-full bg-background/50 border border-border rounded-xl p-4 text-sm min-h-[100px] focus:ring-emerald-500" placeholder="Full residential address..." />
                </div>

                <div className="grid grid-cols-2 gap-6 border-t border-border/50 pt-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest opacity-70">Emergency Contact</Label>
                    <Input value={onboardForm.emergency_contact_name} onChange={(e) => setOnboardForm({...onboardForm, emergency_contact_name: e.target.value})} className="h-12 bg-background/50 border-border rounded-xl focus:ring-emerald-500" placeholder="Name" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest opacity-70">Emergency Phone</Label>
                    <Input value={onboardForm.emergency_contact_phone} onChange={(e) => setOnboardForm({...onboardForm, emergency_contact_phone: e.target.value})} className="h-12 bg-background/50 border-border rounded-xl focus:ring-emerald-500" placeholder="Phone" />
                  </div>
                </div>

                <div className="space-y-2 border-t border-border/50 pt-6">
                  <Label className="text-xs font-bold uppercase tracking-widest opacity-70">Initial Password *</Label>
                  <Input type="password" required value={onboardForm.password_hash} onChange={(e) => setOnboardForm({...onboardForm, password_hash: e.target.value})} className="h-12 bg-background/50 border-border rounded-xl focus:ring-emerald-500" />
                </div>

                <DialogFooter className="pt-6">
                  <Button type="submit" disabled={submitting} className="w-full h-14 bg-emerald-600 hover:bg-emerald-500 text-lg font-black rounded-2xl shadow-xl shadow-emerald-500/20">
                    {submitting ? "Processing Enrolment..." : "Complete Staff Enrolment"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Grid of Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: "Active Professionals", value: employees.length, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
          { label: "Payroll Commitment", value: `₹${(employees.reduce((acc, e) => acc + Number(e.base_salary || 0), 0) / 1000).toFixed(1)}K`, icon: CreditCard, color: "text-purple-500", bg: "bg-purple-500/10" },
          { label: "Field Readiness", value: employees.filter(e => e.designation?.toLowerCase().includes('engineer')).length, icon: Briefcase, color: "text-amber-500", bg: "bg-amber-500/10" },
          { label: "Leave Requests", value: "0", icon: Clock, color: "text-rose-500", bg: "bg-rose-500/10" }
        ].map((stat, i) => (
          <div key={i} className="bg-card/40 border border-border rounded-3xl p-6 flex items-center justify-between group hover:border-emerald-500/30 transition-all shadow-sm backdrop-blur-md">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">{stat.label}</p>
              <p className="text-3xl font-black text-foreground">{stat.value}</p>
            </div>
            <div className={`w-14 h-14 rounded-2xl ${stat.bg} flex items-center justify-center ${stat.color} group-hover:scale-110 transition-transform border border-border/50 shadow-inner`}>
              <stat.icon className="w-7 h-7" />
            </div>
          </div>
        ))}
      </div>

      {/* Employee Registry Table */}
      <div className="bg-card/30 border border-border rounded-[2.5rem] overflow-hidden shadow-2xl backdrop-blur-2xl">
        <div className="p-8 border-b border-border/50 flex flex-col md:flex-row md:items-center justify-between gap-6">
           <div className="relative flex-1 max-w-md">
             <Search className="w-5 h-5 absolute left-4 top-3.5 text-muted-foreground/50" />
             <input className="w-full bg-background/50 border border-border rounded-2xl py-3.5 pl-12 pr-6 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all" placeholder="Search by name, ID, or designation..." />
           </div>
           <div className="flex items-center gap-3">
             <Button variant="ghost" className="rounded-xl h-12 px-6 font-bold text-muted-foreground hover:bg-accent/10">
               <Filter className="w-5 h-5 mr-2" /> Filters
             </Button>
           </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-muted/30">
                <th className="px-8 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Professional</th>
                <th className="px-8 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Payroll & ID</th>
                <th className="px-8 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Contact</th>
                <th className="px-8 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                 <tr>
                    <td colSpan={5} className="px-8 py-32 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                        <span className="text-xs font-black uppercase tracking-[0.3em] animate-pulse">Syncing Personnel Data...</span>
                      </div>
                    </td>
                 </tr>
              ) : employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-emerald-500/5 transition-colors group cursor-default">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 flex items-center justify-center border border-emerald-500/20 group-hover:scale-105 transition-transform shadow-inner">
                        <Users className="w-7 h-7 text-emerald-600" />
                      </div>
                      <div>
                        <div className="text-lg font-black text-foreground group-hover:text-emerald-500 transition-colors">{emp.name}</div>
                        <div className="flex items-center gap-2 mt-1">
                           <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{emp.designation || 'Specialist'}</span>
                           <span className="w-1 h-1 rounded-full bg-border" />
                           <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{emp.department || 'Operations'}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="font-mono text-xs font-bold text-foreground/80">{emp.employee_id}</div>
                    <div className="text-[10px] font-black text-emerald-600 mt-1 uppercase tracking-widest">₹ {Number(emp.base_salary || 0).toLocaleString()} / MONTH</div>
                  </td>
                  <td className="px-8 py-6 space-y-1.5">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground/70">
                      <Mail className="w-3.5 h-3.5 text-emerald-500" /> {emp.email}
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                      <Phone className="w-3.5 h-3.5" /> {emp.phone || '--'}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border",
                      emp.is_active ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                    )}>
                      {emp.is_active ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                      {emp.is_active ? "Active" : "On Hold"}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger className="h-12 w-12 rounded-2xl hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-500 transition-all flex items-center justify-center outline-none">
                        <MoreVertical className="w-6 h-6" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 bg-card border-border rounded-2xl shadow-2xl p-2 z-50">
                        <DropdownMenuItem onClick={() => fetchProfile(emp.id)} className="flex items-center gap-3 p-3 rounded-xl cursor-pointer focus:bg-emerald-500/10 focus:text-emerald-500 font-bold text-sm">
                          <IdCard className="w-4 h-4" /> View Full Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEdit(emp)} className="flex items-center gap-3 p-3 rounded-xl cursor-pointer focus:bg-blue-500/10 focus:text-blue-500 text-blue-600 dark:text-blue-400 font-bold text-sm">
                          <Pencil className="w-4 h-4" /> Edit Employee
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Professional Profile Dialog */}
      <Dialog open={openProfile} onOpenChange={setOpenProfile}>
        <DialogContent className="sm:max-w-[850px] bg-card border border-border text-foreground rounded-[2.5rem] p-0 overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] dark:shadow-2xl">
          {profileData && (
            <div className="flex flex-col max-h-[90vh] md:max-h-[85vh]">
              {/* Header Cover Banner */}
              <div className="h-36 bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 relative shrink-0" />

              {/* Profile Header Block with Avatar and Name */}
              <div className="px-10 pb-6 pt-4 flex flex-col md:flex-row md:items-end justify-between gap-6 bg-card shrink-0 relative border-b border-border/40">
                 <div className="flex flex-col md:flex-row items-center md:items-end gap-6 text-center md:text-left">
                    <div className="w-28 h-28 rounded-3xl bg-card border-4 border-card shadow-2xl flex items-center justify-center -mt-16 relative z-10 shrink-0 select-none">
                       <Users className="w-12 h-12 text-emerald-600" />
                    </div>
                    <div className="mb-1">
                       <h2 className="text-3xl font-black tracking-tight text-foreground">{profileData.name}</h2>
                       <p className="text-muted-foreground font-extrabold uppercase tracking-widest text-[10px] mt-1.5 flex items-center justify-center md:justify-start gap-2">
                         <span className="text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-md">{profileData.designation || 'Specialist'}</span>
                         <span className="text-muted-foreground/30">•</span>
                         <span>{profileData.department || 'Operations'}</span>
                       </p>
                    </div>
                 </div>
                 <div className="flex justify-center shrink-0 pb-1">
                     <Button 
                       onClick={() => {
                         setPromoteForm({
                           amount: profileData.base_salary?.toString() || "",
                           designation: profileData.designation || "",
                           effective_date: new Date().toISOString().split('T')[0],
                           reason: "Career Progression"
                         });
                         setOpenPromoteDialog(true);
                       }}
                       className="bg-emerald-600 hover:bg-emerald-500 text-white border-0 shadow-lg shadow-emerald-500/20 rounded-xl font-black text-[10px] uppercase tracking-widest px-6 h-11 transition-all active:scale-95 flex items-center gap-2"
                     >
                       <Award className="w-4 h-4" /> Promote / Hike
                     </Button>
                 </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex px-10 border-b border-border bg-muted/20 shrink-0">
                 <button 
                   onClick={() => setProfileTab("overview")}
                   className={cn("px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 -mb-px flex items-center gap-2", 
                     profileTab === 'overview' ? "border-emerald-500 text-emerald-600" : "border-transparent text-muted-foreground hover:text-foreground"
                   )}
                 >
                   <IdCard className="w-4 h-4" /> Profile Overview
                 </button>
                 <button 
                   onClick={() => setProfileTab("history")}
                   className={cn("px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 -mb-px flex items-center gap-2", 
                     profileTab === 'history' ? "border-emerald-500 text-emerald-600" : "border-transparent text-muted-foreground hover:text-foreground"
                   )}
                 >
                   <History className="w-4 h-4" /> Career History
                 </button>
              </div>

              {/* Scrollable Content Container */}
              <div className="flex-1 p-10 overflow-y-auto scrollbar-hide bg-background/30">
                {profileTab === 'overview' ? (
                  <div className="space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       <div className="bg-card border border-border/80 p-6 rounded-[1.5rem] shadow-sm hover:border-emerald-500/20 transition-all flex flex-col justify-between h-28">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Employee ID</p>
                          <p className="text-xl font-mono font-black text-foreground">{profileData.employee_id || 'N/A'}</p>
                       </div>
                       <div className="bg-card border border-border/80 p-6 rounded-[1.5rem] shadow-sm hover:border-emerald-500/20 transition-all flex flex-col justify-between h-28">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Joining Date</p>
                          <p className="text-xl font-black text-foreground">
                            {profileData.join_date ? new Date(profileData.join_date).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                          </p>
                       </div>
                       <div className="bg-emerald-500/5 border border-emerald-500/20 p-6 rounded-[1.5rem] shadow-sm hover:bg-emerald-500/10 transition-all flex flex-col justify-between h-28">
                          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Current Salary</p>
                          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                            ₹{profileData.base_salary ? Number(profileData.base_salary).toLocaleString() : '0'}
                          </p>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      {/* Left: Identity & Info */}
                      <div className="space-y-6">
                        <h3 className="text-lg font-black flex items-center gap-2.5 text-foreground">
                          <BadgeCheck className="w-5 h-5 text-emerald-500" /> Identity & Compliance
                        </h3>
                        <div className="space-y-4 bg-card border border-border p-6 rounded-[1.8rem] shadow-sm">
                          <div className="flex justify-between border-b border-border/50 pb-3.5 items-center">
                             <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">PAN Number</span>
                             <span className="text-xs font-mono font-black uppercase text-foreground">{profileData.pan_number || 'PENDING'}</span>
                          </div>
                          <div className="flex justify-between border-b border-border/50 pb-3.5 items-center">
                             <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Aadhar Number</span>
                             <span className="text-xs font-mono font-black text-foreground">{profileData.aadhar_number || 'PENDING'}</span>
                          </div>
                          <div className="flex justify-between items-center">
                             <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Appointment Date</span>
                             <span className="text-xs font-black text-foreground">
                               {profileData.join_date ? new Date(profileData.join_date).toLocaleDateString([], { day: '2-digit', month: 'long', year: 'numeric' }) : 'N/A'}
                             </span>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                           <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-rose-500" /> Registered Address</h4>
                           <p className="text-xs font-bold text-foreground/80 bg-card border border-border p-5 rounded-[1.5rem] leading-relaxed italic shadow-inner">
                             {profileData.address || 'Address details not updated in registry.'}
                           </p>
                        </div>
                      </div>

                      {/* Right: Performance & Logs */}
                      <div className="space-y-6">
                        <h3 className="text-lg font-black flex items-center gap-2.5 text-foreground">
                          <TrendingUp className="w-5 h-5 text-blue-500" /> Performance & Analytics
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="bg-blue-500/5 border border-blue-500/20 p-6 rounded-[1.5rem] text-center shadow-sm">
                              <p className="text-3xl font-black text-blue-600">{profileData.stats?.attendance_rate || 0}%</p>
                              <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mt-1.5">Attendance Rate</p>
                           </div>
                           <div className="bg-amber-500/5 border border-amber-500/20 p-6 rounded-[1.5rem] text-center shadow-sm">
                              <p className="text-3xl font-black text-amber-600">{profileData.stats?.present_days || 0}</p>
                              <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mt-1.5">Days Present</p>
                           </div>
                        </div>

                        <div className="space-y-4">
                           <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center justify-between">
                             Recent Attendance Logs
                             <Clock className="w-4 h-4 text-emerald-500" />
                           </p>
                           <div className="space-y-2">
                             {profileData.attendance && profileData.attendance.length > 0 ? profileData.attendance.slice(0, 3).map((a: any, i: number) => (
                               <div key={i} className="flex items-center justify-between p-3.5 rounded-[1rem] bg-card border border-border/80 hover:border-emerald-500/20 transition-colors shadow-sm">
                                 <div className="flex items-center gap-3">
                                   <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                   <span className="text-xs font-bold text-foreground/80">
                                     {new Date(a.date).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })}
                                   </span>
                                 </div>
                                 <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-md">{a.status}</span>
                               </div>
                             )) : (
                               <p className="text-xs text-muted-foreground italic bg-card border border-border p-4 rounded-xl text-center">No recent attendance logs found.</p>
                             )}
                           </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="flex items-center justify-between">
                       <h3 className="text-xl font-black flex items-center gap-2.5 text-foreground">
                         <History className="w-6 h-6 text-emerald-600" /> Career Journey
                       </h3>
                       <div className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Growth Timeline</div>
                    </div>

                    <div className="relative border-l-2 border-dashed border-border ml-4 space-y-10 py-4">
                       {profileData.salary_history && profileData.salary_history.length > 0 ? profileData.salary_history.map((h: any, i: number) => (
                          <div key={i} className="relative pl-10 group">
                             <div className="absolute -left-[11px] top-0 w-5 h-5 rounded-full bg-emerald-500 border-4 border-card group-hover:scale-125 transition-transform" />
                             <div className="bg-card border border-border rounded-[1.8rem] p-6 shadow-sm hover:shadow-md hover:border-emerald-500/20 transition-all">
                                <div className="flex items-center justify-between mb-4">
                                   <span className="text-sm font-black text-foreground">{h.designation}</span>
                                   <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-500/10 px-3 py-1.5 rounded-full">
                                     {new Date(h.effective_date).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })}
                                   </span>
                                </div>
                                <div className="flex items-end justify-between">
                                   <div>
                                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Monthly Salary</p>
                                      <p className="text-2xl font-black text-foreground">₹{Number(h.amount).toLocaleString()}</p>
                                   </div>
                                   <div className="text-right">
                                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Increment Trigger</p>
                                      <p className="text-xs font-black text-emerald-600 italic">{h.reason}</p>
                                   </div>
                                </div>
                             </div>
                          </div>
                       )) : (
                          <div className="pl-10">
                            <p className="text-sm text-muted-foreground italic bg-card border border-dashed border-border/80 p-8 rounded-[1.8rem]">
                              Initial appointment records for this employee are pending documentation in the digital vault.
                            </p>
                          </div>
                       )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Promotion / Hike Dialog */}
      <Dialog open={openPromoteDialog} onOpenChange={setOpenPromoteDialog}>
        <DialogContent className="sm:max-w-[500px] bg-card border-border text-foreground rounded-[2.5rem] shadow-2xl p-8">
           <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
           <DialogHeader>
             <DialogTitle className="text-2xl font-black flex items-center gap-3">
               <Award className="w-6 h-6 text-emerald-600" /> Career Advancement
             </DialogTitle>
             <DialogDescription className="font-medium">
               Official record update for <span className="font-black text-foreground">{profileData?.name}</span>
             </DialogDescription>
           </DialogHeader>

           <form onSubmit={handlePromote} className="space-y-6 mt-6">
              <div className="space-y-4 bg-accent/5 p-6 rounded-3xl border border-border/50">
                 <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">New Designation *</Label>
                    <Input 
                      required
                      value={promoteForm.designation}
                      onChange={(e) => setPromoteForm({...promoteForm, designation: e.target.value})}
                      placeholder="e.g. Senior Safety Engineer"
                      className="h-12 bg-background border-border rounded-xl font-bold"
                    />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">New Base Salary *</Label>
                       <div className="relative">
                          <span className="absolute left-3 top-3.5 text-muted-foreground font-bold">₹</span>
                          <Input 
                            required
                            type="number"
                            value={promoteForm.amount}
                            onChange={(e) => setPromoteForm({...promoteForm, amount: e.target.value})}
                            className="h-12 bg-background border-border rounded-xl pl-8 font-black"
                          />
                       </div>
                    </div>
                    <div className="space-y-2">
                       <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Effective Date *</Label>
                       <Input 
                         required
                         type="date"
                         value={promoteForm.effective_date}
                         onChange={(e) => setPromoteForm({...promoteForm, effective_date: e.target.value})}
                         className="h-12 bg-background border-border rounded-xl font-bold"
                       />
                    </div>
                 </div>
                 <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Reason for Change</Label>
                    <select 
                      value={promoteForm.reason}
                      onChange={(e) => setPromoteForm({...promoteForm, reason: e.target.value})}
                      className="w-full h-12 px-4 bg-background border border-border rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none appearance-none"
                    >
                       <option value="Annual Appraisal">Annual Appraisal</option>
                       <option value="Promotion">Promotion</option>
                       <option value="Market Adjustment">Market Adjustment</option>
                       <option value="Joining Correction">Joining Correction</option>
                    </select>
                 </div>
              </div>

              <DialogFooter>
                 <Button type="button" variant="ghost" onClick={() => setOpenPromoteDialog(false)} className="rounded-xl font-bold">Cancel</Button>
                 <Button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest px-8 shadow-lg shadow-emerald-500/20">
                    Authorize Change
                 </Button>
              </DialogFooter>
           </form>
        </DialogContent>
      </Dialog>

      {/* Edit Profile Dialog */}
      <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
        <DialogContent className="sm:max-w-[600px] bg-card border-border text-foreground rounded-3xl shadow-2xl p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black flex items-center gap-2">
              <ExternalLink className="w-6 h-6 text-blue-600" /> Modify Staff Registry
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleUpdateEmployee} className="space-y-6 mt-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest opacity-70">Designation</Label>
                <Input value={editForm.designation} onChange={(e) => setEditForm({...editForm, designation: e.target.value})} className="h-12 bg-background border-border rounded-xl focus:ring-blue-500" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest opacity-70">Department</Label>
                <Input value={editForm.department} onChange={(e) => setEditForm({...editForm, department: e.target.value})} className="h-12 bg-background border-border rounded-xl focus:ring-blue-500" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest opacity-70">Monthly Base Salary</Label>
                <Input type="number" value={editForm.base_salary} onChange={(e) => setEditForm({...editForm, base_salary: e.target.value})} className="h-12 bg-background border-border rounded-xl focus:ring-blue-500 font-mono" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest opacity-70">Contact Number</Label>
                <Input value={editForm.phone} onChange={(e) => setEditForm({...editForm, phone: e.target.value})} className="h-12 bg-background border-border rounded-xl focus:ring-blue-500" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 border-t border-border/50 pt-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest opacity-70">Emergency Contact</Label>
                <Input value={editForm.emergency_contact_name} onChange={(e) => setEditForm({...editForm, emergency_contact_name: e.target.value})} className="h-12 bg-background border-border rounded-xl focus:ring-blue-500" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest opacity-70">Emergency Phone</Label>
                <Input value={editForm.emergency_contact_phone} onChange={(e) => setEditForm({...editForm, emergency_contact_phone: e.target.value})} className="h-12 bg-background border-border rounded-xl focus:ring-blue-500" />
              </div>
            </div>

            <DialogFooter className="pt-6 border-t border-border/50">
              <Button type="submit" disabled={submitting} className="w-full h-14 bg-blue-600 hover:bg-blue-500 text-lg font-black rounded-2xl">
                {submitting ? "Updating Registry..." : "Synchronize Records"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
