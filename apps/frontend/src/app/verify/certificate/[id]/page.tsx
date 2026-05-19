"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { API_BASE_URL } from "@/lib/config";
import { ShieldCheck, AlertTriangle, Calendar, FileText, Building2, CheckCircle2, ShieldAlert, Clock } from "lucide-react";

interface Certificate {
  id: string;
  certificate_number: string;
  issue_date: string;
  expiry_date: string;
  validity_period: string;
  remarks?: string;
  inspection?: {
    client?: {
      name: string;
    };
    work_order?: {
      work_order_no: string;
    };
  };
}

export default function PublicVerifyPage() {
  const { id } = useParams();
  const [cert, setCert] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanTime, setScanTime] = useState<string>("");

  useEffect(() => {
    // Set verification scan time on mount
    const now = new Date();
    setScanTime(now.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    }));

    // Start ticking clock
    const interval = setInterval(() => {
      const live = new Date();
      setScanTime(live.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
      }));
    }, 1000);

    fetchCertificate();

    return () => clearInterval(interval);
  }, [id]);

  const fetchCertificate = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/public/certificates/${id}`);
      if (!res.ok) {
        throw new Error("Certificate not found or invalid lookup link.");
      }
      const data = await res.json();
      setCert(data);
    } catch (e: any) {
      setError(e.message || "Failed to connect to the Global Safety registry.");
    } finally {
      setLoading(false);
    }
  };

  const isExpired = cert ? new Date(cert.expiry_date) < new Date() : false;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Decorative gradients */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-emerald-500/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-blue-500/10 rounded-full blur-[120px]" />

      <div className="w-full max-w-lg z-10 space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <h2 className="text-sm font-black tracking-widest text-emerald-500 uppercase">
            Official Registry System
          </h2>
          <h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
            Global Safety Solution
          </h1>
        </div>

        {/* Status Card Container */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
              <p className="text-slate-400 font-semibold animate-pulse text-sm">Querying secure registry...</p>
            </div>
          ) : error ? (
            <div className="py-10 text-center space-y-6">
              <div className="w-20 h-20 bg-rose-500/15 rounded-[2rem] border border-rose-500/30 flex items-center justify-center mx-auto animate-bounce">
                <ShieldAlert className="w-10 h-10 text-rose-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-rose-500">Verification Failure</h3>
                <p className="text-slate-400 text-sm max-w-sm mx-auto leading-relaxed">
                  This safety certificate could not be verified. It may be invalid, modified, or revoked from our database.
                </p>
              </div>
              <div className="bg-rose-500/5 border border-rose-500/10 p-3 rounded-2xl text-xs text-rose-400 font-mono">
                Error Code: GSS-INVALID-REGISTRY-KEY
              </div>
            </div>
          ) : cert ? (
            <div className="space-y-8">
              {/* Dynamic Status Indicator */}
              <div className="text-center space-y-4">
                <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto relative ${
                  isExpired 
                    ? "bg-amber-500/10 border border-amber-500/20" 
                    : "bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_50px_rgba(16,185,129,0.15)]"
                }`}>
                  {isExpired ? (
                    <AlertTriangle className="w-12 h-12 text-amber-500 animate-pulse" />
                  ) : (
                    <>
                      <div className="absolute inset-0 rounded-[2rem] bg-emerald-500/20 animate-ping opacity-30" />
                      <ShieldCheck className="w-12 h-12 text-emerald-400 relative z-10" />
                    </>
                  )}
                </div>

                <div className="space-y-1">
                  <h3 className={`text-2xl font-black uppercase tracking-wide ${
                    isExpired ? "text-amber-500" : "text-emerald-400"
                  }`}>
                    {isExpired ? "EXPIRED LICENSE" : "VERIFIED COMPLIANT"}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono tracking-wider">
                    Cert ID: {cert.certificate_number}
                  </p>
                </div>
              </div>

              {/* Certificate Details */}
              <div className="border-t border-slate-800/80 pt-6 space-y-4">
                {/* Client Name */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-800/50 flex items-center justify-center border border-slate-700/50">
                    <Building2 className="w-5 h-5 text-slate-400" />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-black tracking-widest text-slate-500">Certified Organization</div>
                    <div className="text-base font-extrabold text-white mt-0.5">
                      {cert.inspection?.client?.name || "Premium Enterprise Client"}
                    </div>
                  </div>
                </div>

                {/* Validity Period */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-800/50 flex items-center justify-center border border-slate-700/50">
                    <Calendar className="w-5 h-5 text-slate-400" />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-black tracking-widest text-slate-500">Validity Period</div>
                    <div className="text-base font-extrabold text-white mt-0.5 flex items-center gap-2">
                      <span>{new Date(cert.issue_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      <span className="text-slate-500">➔</span>
                      <span className={isExpired ? "text-amber-400" : "text-emerald-400"}>
                        {new Date(cert.expiry_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                      <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded-full text-slate-400 font-semibold border border-slate-700/50">
                        {cert.validity_period === "1y" ? "1 Year" : cert.validity_period === "3y" ? "3 Years" : "One-Time"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Associated Audit/Work Order */}
                {cert.inspection?.work_order && (
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-800/50 flex items-center justify-center border border-slate-700/50">
                      <FileText className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-black tracking-widest text-slate-500">Audit Job Reference</div>
                      <div className="text-sm font-mono text-slate-300 mt-0.5">
                        {cert.inspection.work_order.work_order_no}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Dynamic Scan Clock */}
              <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800/80 flex items-center gap-3">
                <Clock className="w-5 h-5 text-emerald-500 animate-pulse shrink-0" />
                <div className="space-y-0.5">
                  <div className="text-[9px] uppercase font-black tracking-wider text-slate-500">Verification Timestamp</div>
                  <div className="text-xs font-mono font-bold text-slate-300 tabular-nums">
                    {scanTime}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer Brand Info */}
        <p className="text-center text-[10px] text-slate-500 leading-relaxed max-w-xs mx-auto">
          This registry validation page was securely requested from the server.
          © {new Date().getFullYear()} Global Safety Solution. All rights reserved.
        </p>
      </div>
    </div>
  );
}
