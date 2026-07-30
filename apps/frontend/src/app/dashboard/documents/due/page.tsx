"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth";
import { API_BASE_URL } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Search,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  FileText,
  Clock,
  Download,
  Filter,
  Eye,
} from "lucide-react";

interface Document {
  id: string;
  name: string;
  expiry_date: string;
  status: "ACTIVE" | "DUE_SOON" | "EXPIRED";
  days_remaining: number;
  client: { id: string; name: string } | null;
  project: { id: string; name: string } | null;
  file_url: string;
  file_type: string;
  category: string;
  created_at: string;
}

interface Stats {
  total: number;
  active: number;
  due_soon: number;
  expired: number;
}

export default function DueCertificatesPage() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    active: 0,
    due_soon: 0,
    expired: 0,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "DUE_SOON" | "EXPIRED">("ALL");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const [docsRes, statsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/documents/due`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/documents/due/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (docsRes.ok) {
        const data = await docsRes.json();
        setDocuments(data);
      }
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error fetching due certificates:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDocuments = documents
    .filter((doc) => {
      if (statusFilter !== "ALL" && doc.status !== statusFilter) return false;
      if (searchQuery && !doc.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.expiry_date).getTime();
      const dateB = new Date(b.expiry_date).getTime();
      return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
    });

  const getStatusBadge = (status: string, daysRemaining: number) => {
    switch (status) {
      case "EXPIRED":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-500 border border-rose-500/20">
            EXPIRED
          </span>
        );
      case "DUE_SOON":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
            DUE SOON
          </span>
        );
      case "ACTIVE":
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            ACTIVE
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <p className="text-muted-foreground animate-pulse">Loading certificate data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard/documents")}
            className="hover:bg-primary/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Certificate Expiry Monitor
            </h1>
            <p className="text-muted-foreground">Track and manage upcoming certificate renewals</p>
          </div>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-6 rounded-xl border border-border bg-card shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-blue-500/10 rounded-lg">
            <FileText className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Certificates</p>
            <h3 className="text-2xl font-bold">{stats.total}</h3>
          </div>
        </div>
        <div className="p-6 rounded-xl border border-border bg-card shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-emerald-500/10 rounded-lg">
            <ShieldCheck className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Active</p>
            <h3 className="text-2xl font-bold">{stats.active}</h3>
          </div>
        </div>
        <div className="p-6 rounded-xl border border-border bg-card shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-amber-500/10 rounded-lg">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Due Soon</p>
            <h3 className="text-2xl font-bold">{stats.due_soon}</h3>
          </div>
        </div>
        <div className="p-6 rounded-xl border border-border bg-card shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-rose-500/10 rounded-lg">
            <XCircle className="w-6 h-6 text-rose-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Expired</p>
            <h3 className="text-2xl font-bold">{stats.expired}</h3>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card p-4 rounded-lg border border-border shadow-xs">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search certificates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background/50"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select
              className="bg-background/50 border rounded-md text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-primary/50"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="ALL">All Status</option>
              <option value="DUE_SOON">Due Soon</option>
              <option value="EXPIRED">Expired</option>
            </select>
          </div>
          <Button
            variant="outline"
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            className="bg-background/50"
          >
            <Clock className="w-4 h-4 mr-2" />
            Sort: {sortOrder === "asc" ? "Earliest First" : "Latest First"}
          </Button>
        </div>
      </div>

      {/* Certificates Table */}
      <div className="rounded-xl border bg-card/50 backdrop-blur overflow-hidden">
        {filteredDocuments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                <tr>
                  <th className="px-6 py-4 font-medium">Certificate Name</th>
                  <th className="px-6 py-4 font-medium">Client / Project</th>
                  <th className="px-6 py-4 font-medium">Expiry Date</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredDocuments.map((doc) => (
                  <tr
                    key={doc.id}
                    className="hover:bg-muted/50 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span>{doc.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">
                          {doc.client?.name || "-"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {doc.project?.name || "-"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {new Intl.DateTimeFormat("en-US", {
                            month: "short",
                            day: "2-digit",
                            year: "numeric"
                          }).format(new Date(doc.expiry_date))}
                        </span>
                        <span
                          className={cn(
                            "text-xs font-medium",
                            doc.days_remaining < 0
                              ? "text-rose-500"
                              : doc.days_remaining <= 30
                              ? "text-amber-500"
                              : "text-emerald-500"
                          )}
                        >
                          {doc.days_remaining < 0
                            ? `Expired ${Math.abs(doc.days_remaining)} days ago`
                            : `${doc.days_remaining} days left`}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(doc.status, doc.days_remaining)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:text-primary"
                          onClick={() => window.open(doc.file_url, "_blank")}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:text-primary"
                          onClick={() => {
                            const link = document.createElement("a");
                            link.href = doc.file_url;
                            link.download = doc.name;
                            link.click();
                          }}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 bg-muted rounded-full mb-4">
              <ShieldCheck className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground">No certificates found</h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-1">
              There are no certificates matching your current filters.
            </p>
            {(searchQuery || statusFilter !== "ALL") && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("ALL");
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
