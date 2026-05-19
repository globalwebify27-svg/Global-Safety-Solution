"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth";
import { API_BASE_URL } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { 
  Clock, 
  MapPin, 
  CheckCircle2, 
  Calendar, 
  Timer, 
  ArrowRightLeft,
  User,
  History,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Attendance {
  id: string;
  user_id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: string;
  location_in: string | null;
  location_out: string | null;
}

function GeoAddress({ coords }: { coords: string | null }) {
  const [address, setAddress] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!coords || coords === "Remote / Field") {
      setAddress("");
      return;
    }
    const parts = coords.split(",");
    if (parts.length !== 2) {
      setAddress(coords);
      return;
    }
    
    const cached = sessionStorage.getItem(`geo_${coords}`);
    if (cached) {
      setAddress(cached);
      return;
    }

    const fetchAddress = async () => {
      setLoading(true);
      const lat = parts[0].trim();
      const lon = parts[1].trim();
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`, {
          headers: {
            'User-Agent': 'GlobalSafetySolution/1.0'
          }
        });
        const data = await res.json();
        if (data && data.address) {
          const addr = data.address;
          const place = addr.suburb || addr.neighbourhood || addr.city || addr.town || addr.village || addr.road || addr.county || "Detected Area";
          const state = addr.state || "";
          const finalName = state ? `${place}, ${state}` : place;
          sessionStorage.setItem(`geo_${coords}`, finalName);
          setAddress(finalName);
        } else {
          setAddress(coords);
        }
      } catch (e) {
        setAddress(coords);
      } finally {
        setLoading(false);
      }
    };

    fetchAddress();
  }, [coords]);

  if (!coords) return <span>--</span>;
  if (coords === "Remote / Field") return <span>Remote / Field</span>;
  
  if (loading) return <span className="text-muted-foreground italic text-xs animate-pulse">Resolving address...</span>;
  if (!address) return <span className="tabular-nums font-mono text-[10px]">{coords}</span>;

  return (
    <span title={`Coordinates: ${coords}`} className="inline-flex flex-col items-start leading-snug">
      <span className="font-bold text-xs">{address}</span>
      <span className="text-[9px] font-semibold text-muted-foreground/80 tabular-nums">({coords})</span>
    </span>
  );
}

export default function AttendancePage() {
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [allAttendance, setAllAttendance] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"personal" | "admin">("personal");
  const [adminSearch, setAdminSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [mounted, setMounted] = useState(false);
  
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    setMounted(true);
    fetchMyAttendance();
    if (user?.role === 'SUPER_ADMIN') {
      fetchAllAttendance();
    }
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [token, user]);

  const fetchMyAttendance = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/attendance/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) setAttendance(data);
    } catch (e) {
      console.error("Attendance fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllAttendance = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/attendance/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) setAllAttendance(data);
    } catch (e) {
      console.error("All attendance fetch error:", e);
    }
  };

  const getTodayCheckedInCount = () => {
    const today = new Date().toDateString();
    return allAttendance.filter(a => new Date(a.date).toDateString() === today).length;
  };

  const getActiveDutyCount = () => {
    const today = new Date().toDateString();
    return allAttendance.filter(a => new Date(a.date).toDateString() === today && !a.check_out).length;
  };

  const handleDownloadAllReport = () => {
    if (allAttendance.length === 0) {
      alert("No attendance records found to export.");
      return;
    }
    
    const headers = ["Employee", "Email", "Date", "Check In", "Check Out", "Duration", "Status", "GPS In", "GPS Out"];
    const csvRows = allAttendance.map(record => {
      const date = new Date(record.date);
      const duration = record.check_in && record.check_out ? 
        `${Math.floor((new Date(record.check_out).getTime() - new Date(record.check_in).getTime()) / (1000 * 60 * 60))}h ${Math.floor(((new Date(record.check_out).getTime() - new Date(record.check_in).getTime()) % (1000 * 60 * 60)) / (1000 * 60))}m` 
        : record.check_in ? "On Duty" : "0h 0m";
        
      return [
        `"${record.user?.name || "N/A"}"`,
        `"${record.user?.email || "N/A"}"`,
        date.toLocaleDateString(),
        record.check_in ? new Date(record.check_in).toLocaleTimeString([], { hour12: true }) : "--",
        record.check_out ? new Date(record.check_out).toLocaleTimeString([], { hour12: true }) : "--",
        duration,
        record.status,
        `"${record.location_in || "N/A"}"`,
        `"${record.location_out || "N/A"}"`
      ].join(",");
    });

    const csvContent = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `GSS_Workforce_Attendance_Report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCheckIn = async () => {
    if (!token) return;
    setSubmitting(true);
    
    // Attempt to get geolocation with timeout to prevent hanging
    let location = "Remote / Field";
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) => {
        const timeout = setTimeout(() => rej(new Error("Timeout")), 5000);
        navigator.geolocation.getCurrentPosition(
          (p) => { clearTimeout(timeout); res(p); },
          (e) => { clearTimeout(timeout); rej(e); },
          { timeout: 5000 }
        );
      });
      location = `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`;
    } catch (e) {
      console.warn("Geolocation failed or timed out, using default.", e);
    }

    try {
      const res = await fetch(`${API_BASE_URL}/attendance/check-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ location })
      });
      if (res.ok) {
        fetchMyAttendance();
        if (user?.role === 'SUPER_ADMIN') fetchAllAttendance();
      } else {
        const err = await res.json();
        alert(err.message || "Check-in failed");
      }
    } catch (e) {
      alert("Network error: Could not reach backend");
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadReport = () => {
    if (attendance.length === 0) {
      alert("No attendance records found to export.");
      return;
    }
    
    // Prepare CSV Content
    const headers = ["Date", "Day", "Check In", "Check Out", "Duration", "Status", "Location In"];
    const csvRows = attendance.map(record => {
      const date = new Date(record.date);
      const duration = record.check_in && record.check_out ? 
        `${Math.floor((new Date(record.check_out).getTime() - new Date(record.check_in).getTime()) / (1000 * 60 * 60))}h ${Math.floor(((new Date(record.check_out).getTime() - new Date(record.check_in).getTime()) % (1000 * 60 * 60)) / (1000 * 60))}m` 
        : record.check_in ? "Ongoing" : "0h 0m";
        
      return [
        date.toLocaleDateString(),
        date.toLocaleDateString([], { weekday: 'long' }),
        record.check_in ? new Date(record.check_in).toLocaleTimeString([], { hour12: true }) : "--",
        record.check_out ? new Date(record.check_out).toLocaleTimeString([], { hour12: true }) : "--",
        duration,
        record.status,
        `"${record.location_in || "N/A"}"`
      ].join(",");
    });

    const csvContent = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `GSS_Attendance_Report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCheckOut = async () => {
    if (!token) return;
    setSubmitting(true);

    let location = "Remote / Field";
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) => {
        const timeout = setTimeout(() => rej(new Error("Timeout")), 5000);
        navigator.geolocation.getCurrentPosition(
          (p) => { clearTimeout(timeout); res(p); },
          (e) => { clearTimeout(timeout); rej(e); },
          { timeout: 5000 }
        );
      });
      location = `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`;
    } catch (e) {
      console.warn("Geolocation failed or timed out.");
    }

    try {
      const res = await fetch(`${API_BASE_URL}/attendance/check-out`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ location })
      });
      if (res.ok) {
        fetchMyAttendance();
        if (user?.role === 'SUPER_ADMIN') fetchAllAttendance();
      } else {
        const err = await res.json();
        alert(err.message || "Check-out failed");
      }
    } catch (e) {
      alert("Network error: Could not reach backend");
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const todayRecord = attendance.find(a => {
    const d = new Date(a.date);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() &&
           d.getMonth() === now.getMonth() &&
           d.getDate() === now.getDate();
  });

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600">
            Attendance Hub
          </h1>
          <p className="text-muted-foreground font-medium">Real-time workforce tracking and operational logging.</p>
        </div>

        <div className="bg-card/50 px-6 py-3 rounded-2xl border border-border flex items-center gap-4 shadow-sm backdrop-blur-md">
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Current Server Time</p>
            <p className="text-xl font-black text-foreground tabular-nums">
              {mounted ? currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "--:--:--"}
            </p>
          </div>
          <div className="w-px h-10 bg-border" />
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{mounted ? currentTime.toLocaleDateString([], { weekday: 'long' }) : "---"}</p>
            <p className="text-foreground/80 font-bold">{mounted ? currentTime.toLocaleDateString([], { day: 'numeric', month: 'short' }) : "---"}</p>
          </div>
        </div>
      </div>

      {user?.role === 'SUPER_ADMIN' && (
        <div className="flex bg-muted/50 p-1.5 rounded-2xl border border-border/80 w-fit gap-1.5 shadow-inner">
          <button
            type="button"
            onClick={() => setActiveTab("personal")}
            className={cn(
              "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer",
              activeTab === "personal" 
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/10" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            My Console
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("admin")}
            className={cn(
              "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer",
              activeTab === "admin" 
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/10" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            Workforce Monitor
          </button>
        </div>
      )}

      {activeTab === "personal" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Check-in/out Card */}
          <div className="lg:col-span-1">
            <div className="bg-card border border-border rounded-3xl p-8 relative overflow-hidden group shadow-sm">
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <Timer className="w-32 h-32 text-foreground" />
              </div>
              
              <div className="space-y-8 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-lg shadow-blue-500/5">
                    <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground leading-tight">Identity Verified</h3>
                    <p className="text-muted-foreground text-xs font-medium uppercase tracking-widest">Active Session • {user?.name}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Duty Status</span>
                    <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-tighter ring-1", 
                      todayRecord ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20" : "bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-rose-500/20"
                    )}>
                      {todayRecord ? (todayRecord.check_out ? "OFF DUTY" : "ON DUTY") : "YET TO COMMENCE"}
                    </span>
                  </div>
                  
                  {!todayRecord ? (
                    <Button 
                      onClick={handleCheckIn}
                      disabled={submitting}
                      className="w-full h-16 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-lg shadow-xl shadow-blue-500/20 rounded-2xl border-0 transition-all hover:scale-[1.02] active:scale-95"
                    >
                      {submitting ? "Synchronizing GPS..." : "Commence Duty"}
                    </Button>
                  ) : !todayRecord.check_out ? (
                    <Button 
                      onClick={handleCheckOut}
                      disabled={submitting}
                      className="w-full h-16 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-black text-lg shadow-xl shadow-rose-500/20 rounded-2xl border-0 transition-all hover:scale-[1.02] active:scale-95"
                    >
                      {submitting ? "Capturing Location..." : "Conclude Duty"}
                    </Button>
                  ) : (
                    <div className="h-16 flex items-center justify-center bg-muted/50 rounded-2xl border border-dashed border-border text-muted-foreground font-bold italic text-sm">
                      Duty cycles completed for today.
                    </div>
                  )}
                </div>

                <div className="pt-6 border-t border-border grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Check In</p>
                    <p className="text-foreground font-bold">{mounted && todayRecord?.check_in ? new Date(todayRecord.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Check Out</p>
                    <p className="text-foreground font-bold">{mounted && todayRecord?.check_out ? new Date(todayRecord.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-muted-foreground text-xs bg-muted/30 p-3 rounded-xl border border-border">
                  <MapPin className="w-4 h-4 text-rose-500/50" />
                  <span>Geo-Tag: <span className="text-foreground/80 font-medium"><GeoAddress coords={todayRecord?.location_in || null} /></span></span>
                </div>
              </div>
            </div>
          </div>

          {/* Attendance History */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-xl font-bold flex items-center gap-2 text-foreground">
                <History className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Operational Logs
              </h3>
              <div className="flex items-center gap-2">
                <Button 
                  onClick={handleDownloadReport}
                  variant="outline" 
                  size="sm" 
                  className="bg-card text-muted-foreground hover:text-foreground rounded-full px-4 text-xs font-bold uppercase tracking-widest border-border"
                >
                  Download Report
                </Button>
              </div>
            </div>

            <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm backdrop-blur-md">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-muted border-b border-border">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Date & Cycle</th>
                      <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Duty Range</th>
                      <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Duration</th>
                      <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                          <div className="flex flex-col items-center gap-3">
                            <Clock className="w-6 h-6 animate-spin opacity-20" />
                            <p className="text-[10px] font-black uppercase tracking-widest animate-pulse">Syncing Cloud Ledger...</p>
                          </div>
                        </td>
                      </tr>
                    ) : attendance.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground text-sm italic font-medium">
                          No operational logs found in the ledger.
                        </td>
                      </tr>
                    ) : attendance.map((record) => (
                      <tr key={record.id} className="hover:bg-accent/5 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="text-foreground font-bold">{new Date(record.date).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                          <div className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mt-0.5">{new Date(record.date).toLocaleDateString([], { weekday: 'long' })}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span className="text-foreground/80 font-medium tabular-nums">{record.check_in ? new Date(record.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--"}</span>
                            <ArrowRightLeft className="w-3 h-3 text-muted-foreground" />
                            <span className="text-foreground/80 font-medium tabular-nums">{record.check_out ? new Date(record.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--"}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-muted-foreground text-sm font-bold tabular-nums">
                            {record.check_in && record.check_out ? 
                              `${Math.floor((new Date(record.check_out).getTime() - new Date(record.check_in).getTime()) / (1000 * 60 * 60))}h ${Math.floor(((new Date(record.check_out).getTime() - new Date(record.check_in).getTime()) % (1000 * 60 * 60)) / (1000 * 60))}m` 
                              : record.check_in ? "Ongoing cycle..." : "0h 0m"}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className={cn("w-2 h-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.2)]", 
                              record.status === 'PRESENT' ? "bg-emerald-500 shadow-emerald-500/50" : "bg-rose-500 shadow-rose-500/50"
                            )} />
                            <span className="text-foreground/80 font-bold text-xs">{record.status}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Super Admin Workforce logs view */
        <div className="space-y-6 animate-fade-in-down">
          {/* Admin Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Active Workforce On Duty Today</p>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-3xl font-black text-foreground">{getActiveDutyCount()}</span>
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mt-1">Currently Checked In & Active</p>
            </div>
            
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Total Logs Captured Today</p>
              <p className="text-3xl font-black text-foreground mt-2">{getTodayCheckedInCount()}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mt-1">Combined check-in cycles</p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Operational Coverage</p>
              <p className="text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-2">100%</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mt-1">GPS Tagging Active</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <span className="absolute left-3.5 top-3.5 text-muted-foreground">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Search employee name or email..."
                value={adminSearch}
                onChange={(e) => setAdminSearch(e.target.value)}
                className="w-full bg-card border border-border rounded-xl py-3 pl-10 pr-4 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <Button
              onClick={handleDownloadAllReport}
              className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold px-6 shadow-lg shadow-indigo-500/20"
            >
              Export All logs (.CSV)
            </Button>
          </div>

          {/* Admin Table container */}
          <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[900px]">
                <thead className="bg-muted border-b border-border">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Employee details</th>
                    <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Date & Day</th>
                    <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Duty Range</th>
                    <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">GPS tag (IN)</th>
                    <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">GPS tag (OUT)</th>
                    <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Working Hours</th>
                    <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {allAttendance.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground italic font-medium text-xs">
                        No workforce logs populated in cloud database.
                      </td>
                    </tr>
                  ) : (
                    allAttendance
                      .filter(record => 
                        record.user?.name?.toLowerCase().includes(adminSearch.toLowerCase()) ||
                        record.user?.email?.toLowerCase().includes(adminSearch.toLowerCase())
                      )
                      .map((record) => {
                        const hasCoordsIn = record.location_in && record.location_in.includes(",");
                        const hasCoordsOut = record.location_out && record.location_out.includes(",");
                        const durationStr = record.check_in && record.check_out ? 
                          `${Math.floor((new Date(record.check_out).getTime() - new Date(record.check_in).getTime()) / (1000 * 60 * 60))}h ${Math.floor(((new Date(record.check_out).getTime() - new Date(record.check_in).getTime()) % (1000 * 60 * 60)) / (1000 * 60))}m`
                          : record.check_in ? "On Duty (Live)" : "0h 0m";

                        return (
                          <tr key={record.id} className="hover:bg-indigo-500/5 transition-colors group">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 text-indigo-600 font-bold text-xs">
                                  {record.user?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || "EE"}
                                </div>
                                <div>
                                  <div className="text-foreground font-black text-xs leading-none">{record.user?.name}</div>
                                  <div className="text-[10px] font-semibold text-muted-foreground mt-1 leading-none">{record.user?.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-foreground font-bold text-xs">{new Date(record.date).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                              <div className="text-muted-foreground text-[10px] font-semibold tracking-wider mt-0.5">{new Date(record.date).toLocaleDateString([], { weekday: 'long' })}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2.5 text-xs font-semibold tabular-nums text-foreground/80">
                                <span>{record.check_in ? new Date(record.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--"}</span>
                                <ArrowRightLeft className="w-3 h-3 text-muted-foreground" />
                                <span>{record.check_out ? new Date(record.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--"}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {record.location_in ? (
                                hasCoordsIn ? (
                                  <a 
                                    href={`https://www.google.com/maps/search/?api=1&query=${record.location_in}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 hover:text-indigo-500 cursor-pointer bg-indigo-500/5 px-2.5 py-1 rounded-lg border border-indigo-500/10"
                                  >
                                    <MapPin className="w-3 h-3 text-indigo-500 animate-pulse" />
                                    <GeoAddress coords={record.location_in} />
                                  </a>
                                ) : (
                                  <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-1 rounded-md">{record.location_in}</span>
                                )
                              ) : (
                                <span className="text-xs text-muted-foreground font-medium">--</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {record.location_out ? (
                                hasCoordsOut ? (
                                  <a 
                                    href={`https://www.google.com/maps/search/?api=1&query=${record.location_out}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 hover:text-indigo-500 cursor-pointer bg-indigo-500/5 px-2.5 py-1 rounded-lg border border-indigo-500/10"
                                  >
                                    <MapPin className="w-3 h-3 text-indigo-500 animate-pulse" />
                                    <GeoAddress coords={record.location_out} />
                                  </a>
                                ) : (
                                  <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-1 rounded-md">{record.location_out}</span>
                                )
                              ) : (
                                <span className="text-xs text-muted-foreground font-medium">--</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span className={cn(
                                "text-xs font-black tabular-nums",
                                record.check_in && !record.check_out ? "text-emerald-500" : "text-foreground"
                              )}>
                                {durationStr}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={cn("px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ring-1", 
                                record.check_in && !record.check_out ? 'bg-emerald-500/10 text-emerald-600 ring-emerald-500/20' : 'bg-muted text-muted-foreground ring-border'
                              )}>
                                {record.check_in && !record.check_out ? "ACTIVE NOW" : "COMPLETED"}
                              </span>
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
      )}
    </div>
  );
}
