"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Download, RefreshCw, X, AlertTriangle, FileDigit, Calendar, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface ExistingCertificateData {
  id: string;
  certificate_no: string;
  issue_date?: string;
  expiry_date?: string;
  status?: string;
  pdf_url?: string;
}

interface CertificateAlreadyGeneratedModalProps {
  isOpen: boolean;
  onClose: () => void;
  certificateData: ExistingCertificateData | null;
  equipmentDescription?: string;
  onDownloadExisting: () => void;
  onGenerateNewVersion: (reason: string) => void;
  isAdmin?: boolean;
}

export function CertificateAlreadyGeneratedModal({
  isOpen,
  onClose,
  certificateData,
  equipmentDescription,
  onDownloadExisting,
  onGenerateNewVersion,
  isAdmin = true, // Default to true or check role
}: CertificateAlreadyGeneratedModalProps) {
  const [showReasonInput, setShowReasonInput] = useState(false);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !certificateData) return null;

  const handleRegenerate = () => {
    if (!isAdmin) {
      toast.error("Admin permission required to generate a new certificate version.");
      return;
    }
    if (!showReasonInput) {
      setShowReasonInput(true);
      return;
    }
    if (!reason.trim()) {
      toast.error("Please enter a reason for generating a new version.");
      return;
    }
    setIsSubmitting(true);
    try {
      onGenerateNewVersion(reason.trim());
      setShowReasonInput(false);
      setReason("");
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { setShowReasonInput(false); onClose(); } }}>
      <DialogContent className="max-w-lg rounded-3xl p-6 bg-card border border-border shadow-2xl space-y-5">
        <DialogHeader className="space-y-3 text-left">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-extrabold text-foreground tracking-tight">
                Certificate Already Generated
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                An active safety certificate has already been issued for this equipment.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Existing Certificate Information Card */}
        <div className="bg-muted/40 border border-border rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <FileDigit className="w-3.5 h-3.5 text-blue-500" />
              Existing Record
            </span>
            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              {certificateData.status || 'ACTIVE'}
            </span>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-extrabold text-foreground">
              {equipmentDescription || "Equipment Safety Inspection"}
            </p>
            <p className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
              Cert No: {certificateData.certificate_no}
            </p>
          </div>

          {certificateData.issue_date && (
            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1 border-t border-border/50">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                Issue: {new Date(certificateData.issue_date).toLocaleDateString()}
              </span>
              {certificateData.expiry_date && (
                <span>
                  Expiry: {new Date(certificateData.expiry_date).toLocaleDateString()}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Reason Input for Re-generation */}
        {showReasonInput && (
          <div className="space-y-2 pt-1">
            <label className="text-xs font-bold text-foreground block">
              Reason for Generating New Version <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Equipment recalibrated, updated engineer observation notes..."
              className="w-full text-xs p-3 rounded-xl bg-background border border-border focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[70px]"
            />
            <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
              ⚠️ Generating a new version will archive the current certificate version. Admin authority required.
            </p>
          </div>
        )}

        {/* Action Choice Buttons */}
        <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={() => { setShowReasonInput(false); setReason(""); onClose(); }}
            className="rounded-xl h-11 border-border font-bold text-xs order-3 sm:order-1"
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleRegenerate}
            disabled={isSubmitting}
            className="rounded-xl h-11 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 font-bold text-xs flex items-center justify-center gap-2 order-2"
          >
            <RefreshCw className="w-4 h-4" />
            {showReasonInput ? "Confirm & Issue New Version" : "Generate a New Version"}
          </Button>

          <Button
            type="button"
            onClick={() => {
              onDownloadExisting();
              onClose();
            }}
            className="rounded-xl h-11 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 order-1 sm:order-3"
          >
            <Download className="w-4 h-4" />
            Download Existing Certificate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
