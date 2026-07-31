"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Shield, KeyRound, CheckCircle2, Lock, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { API_BASE_URL } from "@/lib/config";

function SetupPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientId = searchParams.get("id");
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSetupPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/clients/setup-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, password }),
      });

      if (res.ok) {
        setSuccess(true);
        toast.success("Client portal password set successfully!");
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.message || "Failed to setup password.");
      }
    } catch {
      toast.error("Failed to connect to backend server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-foreground flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-3xl p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 mb-2">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-foreground">Global Safety Solution</h1>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Client Portal Password Activation
          </p>
        </div>

        {success ? (
          <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-4">
            <div className="flex justify-center text-emerald-500">
              <CheckCircle2 className="w-12 h-12 animate-bounce" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Portal Account Activated!</h3>
            <p className="text-xs text-muted-foreground">
              Your password has been saved. You can now log into your Client Portal to access your safety certificates and invoices.
            </p>
            <Button
              onClick={() => router.push("/login")}
              className="w-full font-bold rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white py-3"
            >
              Go to Client Portal Login <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSetupPassword} className="space-y-4">
            {clientId && (
              <div className="p-3 rounded-xl bg-accent/40 border border-border text-center text-xs font-mono text-muted-foreground">
                Client ID: <strong className="text-foreground">{clientId}</strong>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase">
                Create New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase">
                Confirm New Password
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full font-bold rounded-xl bg-primary text-primary-foreground py-3"
            >
              {loading ? "Activating Portal Account..." : "Set Password & Activate Portal"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function SetupPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading...</div>}>
      <SetupPasswordForm />
    </Suspense>
  );
}
