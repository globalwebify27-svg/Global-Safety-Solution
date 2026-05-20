"use client";

import { useEffect, useState, useRef } from "react";
import { useAuthStore } from "@/store/auth";
import { API_BASE_URL } from "@/lib/config";
import { 
  ClipboardCheck, 
  Plus, 
  Search, 
  MapPin, 
  Calendar, 
  User, 
  MoreVertical, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ChevronRight,
  Camera,
  Check,
  X,
  Download,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface InspectionItem {
  id: string;
  description: string;
  status: 'PENDING' | 'PASS' | 'FAIL' | 'NA';
  notes?: string;
  expenditure?: number | string;
}

interface Inspection {
  id: string;
  client: { name: string };
  engineer?: { name: string };
  engineer_id?: string;
  scheduled_date: string;
  status: string;
  items: InspectionItem[];
  lat?: number;
  lng?: number;
  remarks?: string;
  client_id?: string;
  project_id?: string;
}

export default function InspectionsPage() {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [engineers, setEngineers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openSchedule, setOpenSchedule] = useState(false);
  const [openVisit, setOpenVisit] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);
  
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadedPhotoUrls, setUploadedPhotoUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseRemarksPhotos = (remarks?: string | null): string[] => {
    if (!remarks) return [];
    if (remarks.startsWith("Verification Photos: ")) {
      try {
        const parsed = JSON.parse(remarks.replace("Verification Photos: ", ""));
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        return remarks.replace("Verification Photos: ", "").split(",").filter(Boolean);
      }
    } else if (remarks.startsWith("Verification Photo: ")) {
      return [remarks.replace("Verification Photo: ", "")];
    }
    return [];
  };
  
  const [scheduleForm, setScheduleForm] = useState({
    client_id: "",
    engineer_id: "",
    scheduled_date: new Date().toISOString().split('T')[0],
    items: [{ description: "General Safety Check" }]
  });

  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [iRes, cRes, eRes] = await Promise.all([
        fetch(`${API_BASE_URL}/inspections`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/clients`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/users`, { headers: { Authorization: `Bearer ${token}` } }) // Changed from /employees to /users as per schema
      ]);
      const [iData, cData, eData] = await Promise.all([iRes.json(), cRes.json(), eRes.json()]);
      
      if (Array.isArray(iData)) setInspections(iData);
      if (Array.isArray(cData)) setClients(cData);
      if (Array.isArray(eData)) {
        let filtered = eData.filter((u: any) => 
          u.is_active && 
          (
            u.designation?.toLowerCase().includes('engineer') || 
            u.designation?.toLowerCase().includes('dev') ||
            u.designation?.toLowerCase().includes('technician') ||
            u.department?.toLowerCase().includes('operations') ||
            u.name?.toLowerCase().includes('admin')
          )
        );
        if (filtered.length === 0) {
          filtered = eData.filter((u: any) => u.is_active);
        }
        setEngineers(filtered);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchSingleInspection = async (inspectionId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/inspections/${inspectionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedInspection(data);
        setInspections(prev => prev.map(i => i.id === inspectionId ? data : i));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/inspections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(scheduleForm)
      });
      if (res.ok) {
        const createdInspection = await res.json();
        setOpenSchedule(false);
        toast.success("Inspection scheduled successfully! Opening site visit checklist...");
        
        setSelectedInspection(createdInspection);
        setUploadedPhotoUrls([]);
        setOpenVisit(true);

        fetchData();
      }
    } catch (e) {
      toast.error("Failed to schedule inspection");
    }
  };

  const handleUpdateItem = async (itemId: string, status: string, notes?: string, expenditure?: number | string) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/inspections/item/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, notes, expenditure: expenditure ? Number(expenditure) : 0 })
      });
      if (res.ok) {
        if (selectedInspection) {
          const updatedItems = (selectedInspection.items || []).map(item => 
            item.id === itemId ? { ...item, status: status as any, notes, expenditure } : item
          );
          setSelectedInspection({ ...selectedInspection, items: updatedItems });
          await fetchSingleInspection(selectedInspection.id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedInspection || !token) return;

    setUploadingPhoto(true);
    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('name', `Site Visit Verification - ${selectedInspection.client?.name || 'Inspection'} - Photo ${i + 1}`);
        formData.append('category', 'OTHER');
        if (selectedInspection.client_id) {
          formData.append('client_id', selectedInspection.client_id);
        }
        if (selectedInspection.project_id) {
          formData.append('project_id', selectedInspection.project_id);
        }

        const res = await fetch(`${API_BASE_URL}/documents`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: formData
        });

        if (res.ok) {
          const data = await res.json();
          uploadedUrls.push(data.file_url);
        }
      }

      if (uploadedUrls.length > 0) {
        setUploadedPhotoUrls(prev => [...prev, ...uploadedUrls]);
        toast.success(`Successfully uploaded ${uploadedUrls.length} photo(s)!`);
      } else {
        toast.error("Failed to upload photo(s).");
      }
    } catch (err: any) {
      toast.error("Error uploading file(s).");
      console.error(err);
    } finally {
      setUploadingPhoto(false);
      e.target.value = "";
    }
  };

  const handleCompleteVisit = async () => {
    if (!selectedInspection || !token) return;

    // Block sign-off if any checklist item is still PENDING
    const pendingItems = (selectedInspection.items || []).filter(item => item.status === 'PENDING');
    if (pendingItems.length > 0) {
      toast.error(
        `${pendingItems.length} checklist item${pendingItems.length > 1 ? 's are' : ' is'} still pending. Mark every item ✔ or ✘ before signing off.`,
        { duration: 4000 }
      );
      return;
    }
    
    const submit = async (latitude?: number, longitude?: number) => {
      try {
        const hasFailItems = (selectedInspection.items || []).some(item => item.status === 'FAIL');
        const finalStatus = hasFailItems ? 'REJECTED' : 'COMPLETED';

        const res = await fetch(`${API_BASE_URL}/inspections/${selectedInspection.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ 
            status: finalStatus, 
            completed_date: new Date().toISOString(),
            lat: latitude,
            lng: longitude,
            remarks: uploadedPhotoUrls.length > 0 ? "Verification Photos: " + JSON.stringify(uploadedPhotoUrls) : undefined
          })
        });
        if (res.ok) {
          setOpenVisit(false);
          if (finalStatus === 'REJECTED') {
            toast.warning("Visit submitted and marked as REJECTED due to failed items");
          } else {
            toast.success("Visit marked as completed with site verification");
          }
          fetchData();
        } else {
          const err = await res.json();
          toast.error(err.message || "Failed to complete visit");
        }
      } catch (e) {
        toast.error("Failed to complete visit due to network error");
      }
    };

    if (navigator.geolocation) {
      let resolved = false;
      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          console.log("GPS timeout, submitting without coordinates...");
          submit();
        }
      }, 1500); // Wait at most 1.5 seconds for GPS

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            submit(pos.coords.latitude, pos.coords.longitude);
          }
        },
        (err) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            console.warn("GPS capture failed:", err);
            submit();
          }
        },
        { timeout: 1200, enableHighAccuracy: false }
      );
    } else {
      submit();
    }
  };

  const handleDownloadCertificate = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/inspections/${id}/certificate`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `safety-certificate-${id.substring(0, 8)}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (e) {
      toast.error("Failed to download certificate");
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
            Site Inspections
          </h1>
          <p className="text-muted-foreground font-medium">Manage field safety audits, engineer visits, and checklists.</p>
        </div>

        <Dialog open={openSchedule} onOpenChange={setOpenSchedule}>
          <DialogTrigger render={
            <Button className="rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-xl shadow-blue-500/20 px-8 h-12 transition-all active:scale-95">
              <Plus className="w-5 h-5 mr-2" /> Schedule Visit
            </Button>
          } />
          <DialogContent className="sm:max-w-[600px] bg-card border-border rounded-[2.5rem]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Schedule Safety Audit</DialogTitle>
              <DialogDescription>Assign an engineer and set the inspection scope.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSchedule} className="space-y-6 mt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Target Client</Label>
                  <select 
                    required
                    value={scheduleForm.client_id}
                    onChange={(e) => setScheduleForm({...scheduleForm, client_id: e.target.value})}
                    className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm"
                  >
                    <option value="">Select client...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Assign Engineer</Label>
                  <select 
                    required
                    value={scheduleForm.engineer_id}
                    onChange={(e) => setScheduleForm({...scheduleForm, engineer_id: e.target.value})}
                    className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm"
                  >
                    <option value="">Select engineer...</option>
                    {engineers.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Scheduled Date</Label>
                  <Input 
                    type="date"
                    value={scheduleForm.scheduled_date}
                    onChange={(e) => setScheduleForm({...scheduleForm, scheduled_date: e.target.value})}
                    className="h-11 bg-background border-border"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold h-12 rounded-xl shadow-lg shadow-blue-500/20">
                  Confirm Schedule
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Inspection Stats */}
        <div className="bg-card/40 border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600">
              <Clock className="w-5 h-5" />
            </div>
            <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Scheduled</span>
          </div>
          <p className="text-3xl font-black text-foreground">{inspections.filter(i => i.status === 'SCHEDULED').length}</p>
        </div>
        <div className="bg-card/40 border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
              <MapPin className="w-5 h-5" />
            </div>
            <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">In Progress</span>
          </div>
          <p className="text-3xl font-black text-foreground">{inspections.filter(i => i.status === 'IN_PROGRESS').length}</p>
        </div>
        <div className="bg-card/40 border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Completed / Rejected</span>
          </div>
          <p className="text-3xl font-black text-foreground">
            {inspections.filter(i => i.status === 'COMPLETED').length} / {inspections.filter(i => i.status === 'REJECTED').length}
          </p>
        </div>
      </div>

      <div className="bg-card/40 border border-border rounded-[2.5rem] overflow-hidden shadow-xl">
        <div className="p-8 border-b border-border flex items-center justify-between bg-muted/20">
          <h3 className="text-xl font-bold flex items-center gap-3">
            <ClipboardCheck className="w-6 h-6 text-blue-600" /> Recent Audits
          </h3>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <input className="bg-background border border-border rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none w-64" placeholder="Search audits..." />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-muted/30">
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Client & Location</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Engineer</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Schedule</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Expenditure</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={5} className="px-8 py-12 text-center text-muted-foreground animate-pulse">Syncing field data...</td></tr>
              ) : inspections.length === 0 ? (
                <tr><td colSpan={5} className="px-8 py-12 text-center text-muted-foreground">No site inspections found.</td></tr>
              ) : (
                inspections.map((i) => (
                  <tr key={i.id} className="hover:bg-blue-500/5 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-foreground group-hover:text-blue-600 transition-colors">{i.client?.name}</span>
                        <span className="text-[10px] text-muted-foreground uppercase mt-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> Site Verified: {i.lat || i.status === 'COMPLETED' || i.status === 'REJECTED' ? "Yes" : "Pending"}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{i.engineer?.name || "Unassigned"}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        {new Date(i.scheduled_date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ring-1", 
                        i.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-600 ring-emerald-500/20' :
                        i.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-600 ring-rose-500/20' :
                        i.status === 'SCHEDULED' ? 'bg-blue-500/10 text-blue-600 ring-blue-500/20' :
                        'bg-amber-500/10 text-amber-600 ring-amber-500/20'
                      )}>
                        {i.status}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-sm font-bold text-foreground inline-flex items-center gap-1">
                        ₹{(i.items || []).reduce((acc, curr) => acc + (Number(curr.expenditure) || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {i.status === 'COMPLETED' ? (
                          <>
                            <Button 
                              variant="ghost" 
                              className="h-9 px-3 rounded-xl text-xs font-bold text-muted-foreground hover:bg-muted/10 flex items-center gap-1"
                              onClick={() => {
                                setSelectedInspection(i);
                                setUploadedPhotoUrls(parseRemarksPhotos(i.remarks));
                                setOpenVisit(true);
                              }}
                            >
                              Review Checklist
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-9 w-9 rounded-xl text-emerald-600 hover:bg-emerald-500/10"
                              onClick={() => handleDownloadCertificate(i.id)}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </>
                        ) : (
                          <Button 
                            variant="ghost" 
                            className="h-9 px-4 rounded-xl text-xs font-bold text-blue-600 hover:bg-blue-500/10"
                            onClick={() => {
                              setSelectedInspection(i);
                              setUploadedPhotoUrls(parseRemarksPhotos(i.remarks));
                              setOpenVisit(true);
                            }}
                          >
                            {i.status === 'REJECTED' ? 'Update Checklist' : 'Start Visit'} <ChevronRight className="w-4 h-4 ml-1" />
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
      </div>

      {/* Field Visit Dialog */}
      <Dialog open={openVisit} onOpenChange={setOpenVisit}>
        <DialogContent className="sm:max-w-[700px] bg-card border-border rounded-[2.5rem] max-h-[90vh] overflow-y-auto">
          {selectedInspection && (
            <div className="space-y-6">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black flex items-center gap-3">
                  <ClipboardCheck className="w-6 h-6 text-blue-600" /> Inspection Checklist
                </DialogTitle>
                <DialogDescription>
                  Site Visit for <span className="font-bold text-foreground">{selectedInspection.client?.name}</span>
                </DialogDescription>
              </DialogHeader>

              {/* Sleek inline Audit Management & Settings Bar */}
              <div className="p-5 bg-blue-500/5 border border-blue-500/10 rounded-2xl space-y-4 shadow-inner">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest">Audit settings & assignment</h4>
                  <span className={cn("px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tight ring-1",
                    selectedInspection.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-600 ring-emerald-500/20' :
                    selectedInspection.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-600 ring-rose-500/20' :
                    selectedInspection.status === 'SCHEDULED' ? 'bg-blue-500/10 text-blue-600 ring-blue-500/20' :
                    'bg-amber-500/10 text-amber-600 ring-amber-500/20'
                  )}>
                    CURRENT STATE: {selectedInspection.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Assign Engineer</label>
                    <select
                      value={selectedInspection.engineer_id || ""}
                      onChange={async (e) => {
                        const newEngineerId = e.target.value;
                        if (!token) return;
                        try {
                          const res = await fetch(`${API_BASE_URL}/inspections/${selectedInspection.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                            body: JSON.stringify({ engineer_id: newEngineerId || null })
                          });
                          if (res.ok) {
                            toast.success("Engineer reassigned successfully!");
                            await fetchSingleInspection(selectedInspection.id);
                          }
                        } catch (err) {
                          toast.error("Failed to reassign engineer");
                        }
                      }}
                      className="w-full h-10 px-3 bg-background border border-border rounded-xl text-xs font-semibold focus:outline-none"
                    >
                      <option value="">Unassigned</option>
                      {engineers.map(eng => (
                        <option key={eng.id} value={eng.id}>{eng.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Schedule Date</label>
                    <input
                      type="date"
                      value={selectedInspection.scheduled_date ? selectedInspection.scheduled_date.split('T')[0] : ""}
                      onChange={async (e) => {
                        const newDate = e.target.value;
                        if (!token) return;
                        try {
                          const res = await fetch(`${API_BASE_URL}/inspections/${selectedInspection.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                            body: JSON.stringify({ scheduled_date: newDate })
                          });
                          if (res.ok) {
                            toast.success("Inspection rescheduled successfully!");
                            await fetchSingleInspection(selectedInspection.id);
                          }
                        } catch (err) {
                          toast.error("Failed to reschedule inspection");
                        }
                      }}
                      className="w-full h-10 px-3 bg-background border border-border rounded-xl text-xs font-semibold focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Override Status</label>
                    <select
                      value={selectedInspection.status}
                      onChange={async (e) => {
                        const newStatus = e.target.value;
                        if (!token) return;
                        try {
                          const res = await fetch(`${API_BASE_URL}/inspections/${selectedInspection.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                            body: JSON.stringify({ status: newStatus })
                          });
                          if (res.ok) {
                            toast.success(`Status updated to ${newStatus}!`);
                            await fetchSingleInspection(selectedInspection.id);
                          } else {
                            const err = await res.json();
                            toast.error(err.message || "Failed to update status");
                          }
                        } catch (err) {
                          toast.error("Failed to update status");
                        }
                      }}
                      className="w-full h-10 px-3 bg-background border border-border rounded-xl text-xs font-bold text-foreground focus:outline-none"
                    >
                      <option value="SCHEDULED">SCHEDULED</option>
                      <option value="IN_PROGRESS">IN_PROGRESS</option>
                      <option value="COMPLETED">COMPLETED</option>
                      <option value="REJECTED">REJECTED</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {(selectedInspection?.items || []).map((item) => (
                  <div key={item.id} className="p-5 bg-muted/20 border border-border rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground">{item.description}</span>
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant={item.status === 'PASS' ? 'default' : 'outline'} 
                          className={cn("h-8 rounded-lg", item.status === 'PASS' && "bg-emerald-600 hover:bg-emerald-500")}
                          onClick={() => handleUpdateItem(item.id, 'PASS', item.notes, item.expenditure)}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant={item.status === 'FAIL' ? 'destructive' : 'outline'} 
                          className="h-8 rounded-lg"
                          onClick={() => handleUpdateItem(item.id, 'FAIL', item.notes, item.expenditure)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Input 
                        placeholder="Add observations..." 
                        className="bg-background h-10 text-sm flex-1"
                        value={item.notes || ""}
                        onChange={(e) => handleUpdateItem(item.id, item.status, e.target.value, item.expenditure)}
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Exp (₹)</span>
                        <Input
                          type="number"
                          placeholder="0.00"
                          className="bg-background h-10 text-sm w-28"
                          value={item.expenditure || ""}
                          onChange={(e) => handleUpdateItem(item.id, item.status, item.notes, e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-500/10 rounded-xl">
                      <Camera className="w-6 h-6 text-blue-600 animate-pulse" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">Site Verification Photos</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                        Upload multiple verification photos for this visit
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end md:self-auto">
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handlePhotoUpload} 
                      accept="image/*" 
                      className="hidden" 
                      multiple
                    />
                    
                    {uploadingPhoto ? (
                      <Button disabled variant="outline" className="rounded-xl h-10 border-blue-500/20 text-blue-600 flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Uploading...
                      </Button>
                    ) : selectedInspection.status !== 'COMPLETED' ? (
                      <Button 
                        type="button"
                        variant="outline" 
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-xl h-10 border-blue-500/20 text-blue-600 hover:bg-blue-500/10 font-bold transition-all"
                      >
                        {uploadedPhotoUrls.length > 0 ? "Add More Photos" : "Upload Photos"}
                      </Button>
                    ) : null}
                  </div>
                </div>

                {uploadedPhotoUrls.length > 0 && (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 p-4 bg-muted/20 border border-border/50 rounded-2xl">
                    {uploadedPhotoUrls.map((url, index) => (
                      <div key={index} className="relative aspect-square rounded-xl overflow-hidden border border-border group shadow-sm bg-background">
                        <img 
                          src={url} 
                          alt={`Verification preview ${index + 1}`} 
                          className="w-full h-full object-cover transition-all duration-300 group-hover:scale-110 cursor-pointer" 
                          onClick={() => window.open(url, '_blank')}
                        />
                        {selectedInspection.status !== 'COMPLETED' && (
                          <button
                            type="button"
                            onClick={() => setUploadedPhotoUrls(prev => prev.filter((_, idx) => idx !== index))}
                            className="absolute top-1.5 right-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow duration-200 cursor-pointer"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <DialogFooter className="pt-4 border-t border-border">
                <Button variant="ghost" onClick={() => setOpenVisit(false)}>Discard</Button>
                {(() => {
                  const pendingCount = (selectedInspection.items || []).filter(it => it.status === 'PENDING').length;
                  const isAlreadyDone = selectedInspection.status === 'COMPLETED';
                  const isBlocked = pendingCount > 0;
                  return (
                    <Button
                      disabled={isAlreadyDone || isBlocked}
                      onClick={handleCompleteVisit}
                      className={cn(
                        "text-white font-bold h-12 px-10 rounded-xl shadow-lg transition-all",
                        isAlreadyDone
                          ? "bg-muted text-muted-foreground cursor-not-allowed"
                          : isBlocked
                            ? "bg-amber-500/80 shadow-amber-500/20 cursor-not-allowed opacity-80"
                            : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20"
                      )}
                    >
                      {isAlreadyDone
                        ? "Already Completed"
                        : isBlocked
                          ? `${pendingCount} Item${pendingCount > 1 ? "s" : ""} Pending — Mark All First`
                          : selectedInspection.status === "REJECTED"
                            ? "Re-Submit Audit Sign Off"
                            : "Complete Audit & Sign Off"}
                    </Button>
                  );
                })()}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
