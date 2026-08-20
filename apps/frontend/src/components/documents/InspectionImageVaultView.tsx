"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/config";
import {
  Building2,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  Download,
  Eye,
  FolderOpen,
  HardDrive,
  ImageIcon,
  Layers,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface PhotoItem {
  id: string;
  url: string;
  name: string;
  uploaded_at?: string;
}

interface EquipmentNode {
  item_id: string;
  description: string;
  status: string;
  notes?: string;
  cert_ref_no?: string | null;
  cert_test_date?: string | null;
  cert_expiry_date?: string | null;
  photos: PhotoItem[];
  total_photos: number;
}

interface InspectionNode {
  inspection_id: string;
  scheduled_date: string;
  completed_date?: string | null;
  status: string;
  title: string;
  work_order_no?: string | null;
  equipments: EquipmentNode[];
  total_equipments: number;
  total_photos: number;
}

interface ClientImageNode {
  client_id: string;
  client_name: string;
  industry?: string;
  city?: string;
  inspections: InspectionNode[];
  total_inspections: number;
  total_equipments: number;
  total_photos: number;
}

interface ImageVaultStats {
  total_clients: number;
  total_inspections: number;
  total_equipments: number;
  total_photos: number;
}

interface InspectionImageVaultViewProps {
  token: string | null;
}

export function InspectionImageVaultView({ token }: InspectionImageVaultViewProps) {
  const [hierarchy, setHierarchy] = useState<ClientImageNode[]>([]);
  const [stats, setStats] = useState<ImageVaultStats>({
    total_clients: 0,
    total_inspections: 0,
    total_equipments: 0,
    total_photos: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Expansion states
  const [expandedClients, setExpandedClients] = useState<Record<string, boolean>>({});
  const [expandedInspections, setExpandedInspections] = useState<Record<string, boolean>>({});

  // Lightbox Modal
  const [previewPhoto, setPreviewPhoto] = useState<{
    url: string;
    title: string;
    equipment: string;
    client: string;
    date?: string;
  } | null>(null);

  const fetchImageTree = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/documents/image-vault-tree?_t=${Date.now()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setHierarchy(data.hierarchy || []);
        if (data.stats) setStats(data.stats);

        // Auto-expand first client & first inspection
        if (data.hierarchy && data.hierarchy.length > 0) {
          const firstClient = data.hierarchy[0];
          setExpandedClients({ [firstClient.client_id]: true });
          if (firstClient.inspections && firstClient.inspections.length > 0) {
            setExpandedInspections({ [`${firstClient.client_id}_${firstClient.inspections[0].inspection_id}`]: true });
          }
        }
      } else {
        toast.error("Failed to load inspection image repository");
      }
    } catch (err) {
      console.error("Error loading image tree:", err);
      toast.error("Failed to load inspection image vault");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchImageTree();
  }, [token]);

  const toggleClientExpand = (clientId: string) => {
    setExpandedClients((prev) => ({ ...prev, [clientId]: !prev[clientId] }));
  };

  const toggleInspectionExpand = (key: string) => {
    setExpandedInspections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const expandAll = () => {
    const cMap: Record<string, boolean> = {};
    const iMap: Record<string, boolean> = {};
    hierarchy.forEach((c) => {
      cMap[c.client_id] = true;
      c.inspections.forEach((ins) => {
        iMap[`${c.client_id}_${ins.inspection_id}`] = true;
      });
    });
    setExpandedClients(cMap);
    setExpandedInspections(iMap);
  };

  const collapseAll = () => {
    setExpandedClients({});
    setExpandedInspections({});
  };

  // Filter tree by search query
  const q = searchQuery.toLowerCase().trim();
  const filteredHierarchy = hierarchy
    .map((clientNode) => {
      const matchingInspections = clientNode.inspections
        .map((inspectionNode) => {
          const matchingEquipments = inspectionNode.equipments.filter((eq) => {
            if (!q) return true;
            return (
              eq.description.toLowerCase().includes(q) ||
              (eq.cert_ref_no && eq.cert_ref_no.toLowerCase().includes(q)) ||
              (eq.notes && eq.notes.toLowerCase().includes(q))
            );
          });

          const isInspectionMatch =
            !q ||
            inspectionNode.title.toLowerCase().includes(q) ||
            (inspectionNode.work_order_no && inspectionNode.work_order_no.toLowerCase().includes(q)) ||
            matchingEquipments.length > 0;

          if (isInspectionMatch) {
            return {
              ...inspectionNode,
              equipments: matchingEquipments.length > 0 ? matchingEquipments : inspectionNode.equipments,
            };
          }
          return null;
        })
        .filter(Boolean) as InspectionNode[];

      const isClientMatch =
        !q ||
        clientNode.client_name.toLowerCase().includes(q) ||
        (clientNode.city && clientNode.city.toLowerCase().includes(q)) ||
        matchingInspections.length > 0;

      if (isClientMatch) {
        return {
          ...clientNode,
          inspections: matchingInspections.length > 0 ? matchingInspections : clientNode.inspections,
        };
      }
      return null;
    })
    .filter(Boolean) as ClientImageNode[];

  return (
    <div className="space-y-6">
      {/* Top Banner & Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card/50 border border-border p-4 rounded-2xl flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Client Sites</p>
            <p className="text-xl font-black text-foreground">{stats.total_clients}</p>
          </div>
        </div>

        <div className="bg-card/50 border border-border p-4 rounded-2xl flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CalendarClock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Inspections</p>
            <p className="text-xl font-black text-foreground">{stats.total_inspections}</p>
          </div>
        </div>

        <div className="bg-card/50 border border-border p-4 rounded-2xl flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Equipments</p>
            <p className="text-xl font-black text-foreground">{stats.total_equipments}</p>
          </div>
        </div>

        <div className="bg-card/50 border border-border p-4 rounded-2xl flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
            <ImageIcon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Photos</p>
            <p className="text-xl font-black text-foreground">{stats.total_photos}</p>
          </div>
        </div>
      </div>

      {/* Control Toolbar */}
      <div className="p-4 bg-muted/30 border border-border rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search site, equipment, cert ref no..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-background border border-border focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end flex-wrap sm:flex-nowrap">
          <Button variant="outline" size="sm" onClick={expandAll} className="rounded-xl text-xs font-bold h-9 flex-1 sm:flex-initial">
            Expand All
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll} className="rounded-xl text-xs font-bold h-9 flex-1 sm:flex-initial">
            Collapse All
          </Button>
          <Button variant="outline" size="sm" onClick={fetchImageTree} className="rounded-xl text-xs font-bold h-9 gap-1.5 flex-1 sm:flex-initial">
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Decorative Tree Body */}
      {loading ? (
        <div className="p-12 text-center space-y-3 bg-card/30 border border-border rounded-3xl">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
          <p className="text-xs font-bold text-muted-foreground">Loading Inspection Image Vault Hierarchy...</p>
        </div>
      ) : filteredHierarchy.length === 0 ? (
        <div className="p-12 text-center space-y-3 bg-card/30 border border-border rounded-3xl">
          <ImageIcon className="w-10 h-10 text-muted-foreground mx-auto opacity-50" />
          <h3 className="text-base font-bold text-foreground">No Inspection Photos Found</h3>
          <p className="text-xs text-muted-foreground">
            {searchQuery ? `No matching photos for "${searchQuery}"` : "No equipment photos have been uploaded yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredHierarchy.map((clientNode) => {
            const isClientExpanded = expandedClients[clientNode.client_id] ?? false;

            return (
              <div
                key={clientNode.client_id}
                className="border border-border rounded-2xl bg-card/40 overflow-hidden shadow-sm transition-all"
              >
                {/* Level 1: Client Site Header */}
                <div
                  onClick={() => toggleClientExpand(clientNode.client_id)}
                  className="p-5 bg-muted/40 hover:bg-accent/20 cursor-pointer flex items-center justify-between transition-colors select-none"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold shrink-0">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <h2 className="text-base sm:text-lg font-black tracking-tight text-foreground">
                          {clientNode.client_name}
                        </h2>
                        <span className="px-3 py-1 rounded-full text-[11px] font-extrabold tracking-wide bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                          {clientNode.total_inspections} {clientNode.total_inspections === 1 ? "Inspection" : "Inspections"} • {clientNode.total_equipments} Equipments • {clientNode.total_photos} Photos
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        📍 Site Location: {clientNode.city || clientNode.industry || "Main Plant Site"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-muted-foreground">
                    {isClientExpanded ? <ChevronDown className="w-5 h-5 text-blue-500" /> : <ChevronRight className="w-5 h-5" />}
                  </div>
                </div>

                {/* Level 2: Inspection Sessions */}
                {isClientExpanded && (
                  <div className="p-5 space-y-4 border-t border-border bg-background/50">
                    {clientNode.inspections.map((inspectionNode) => {
                      const insKey = `${clientNode.client_id}_${inspectionNode.inspection_id}`;
                      const isInsExpanded = expandedInspections[insKey] ?? false;

                      return (
                        <div
                          key={inspectionNode.inspection_id}
                          className="border border-border/80 rounded-xl bg-card/60 overflow-hidden shadow-sm"
                        >
                          {/* Inspection Header */}
                          <div
                            onClick={() => toggleInspectionExpand(insKey)}
                            className="p-4 bg-muted/20 hover:bg-accent/10 cursor-pointer flex items-center justify-between transition-colors select-none"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0">
                                <CalendarClock className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="text-sm font-bold text-foreground">
                                    {inspectionNode.title}
                                  </h3>
                                  <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                    Date: {new Date(inspectionNode.scheduled_date).toLocaleDateString()}
                                  </span>
                                  {inspectionNode.work_order_no && (
                                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                                      {inspectionNode.work_order_no}
                                    </span>
                                  )}
                                  <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest bg-muted px-2 py-0.5 rounded-md border border-border">
                                    {inspectionNode.total_equipments} Equipment Folders • {inspectionNode.total_photos} Photos
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 text-muted-foreground">
                              {isInsExpanded ? <ChevronDown className="w-4 h-4 text-emerald-500" /> : <ChevronRight className="w-4 h-4" />}
                            </div>
                          </div>

                          {/* Level 3: Equipment Image Collections */}
                          {isInsExpanded && (
                            <div className="p-4 space-y-4 border-t border-border/60 bg-background">
                              {inspectionNode.equipments.map((eqNode) => (
                                <div
                                  key={eqNode.item_id}
                                  className="border border-border/60 rounded-xl p-4 bg-muted/10 space-y-3"
                                >
                                  {/* Equipment Header */}
                                  <div className="flex items-center justify-between flex-wrap gap-2">
                                    <div className="flex items-center gap-2.5">
                                      <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold shrink-0">
                                        <HardDrive className="w-3.5 h-3.5" />
                                      </div>
                                      <div>
                                        <h4 className="text-xs font-black text-foreground">
                                          Equipment: {eqNode.description}
                                        </h4>
                                        {eqNode.cert_ref_no && (
                                          <p className="text-[10px] font-mono text-muted-foreground">
                                            Ref / Cert No: {eqNode.cert_ref_no}
                                          </p>
                                        )}
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <span
                                        className={cn(
                                          "text-[10px] font-extrabold px-2 py-0.5 rounded-full border",
                                          eqNode.status === "PASSED" || eqNode.status === "COMPLETED"
                                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                            : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                        )}
                                      >
                                        {eqNode.status}
                                      </span>
                                      <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20 flex items-center gap-1">
                                        <ImageIcon className="w-3 h-3" />
                                        {eqNode.total_photos} Photos
                                      </span>
                                    </div>
                                  </div>

                                  {/* Level 4: Photo Thumbnails Grid */}
                                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-2">
                                    {eqNode.photos.map((photo) => (
                                      <div
                                        key={photo.id}
                                        onClick={() =>
                                          setPreviewPhoto({
                                            url: photo.url,
                                            title: photo.name,
                                            equipment: eqNode.description,
                                            client: clientNode.client_name,
                                            date: photo.uploaded_at ? new Date(photo.uploaded_at).toLocaleDateString() : undefined,
                                          })
                                        }
                                        className="group relative aspect-square rounded-xl overflow-hidden border border-border/80 bg-background cursor-pointer hover:border-blue-500 transition-all shadow-xs hover:shadow-md"
                                      >
                                        <img
                                          src={photo.url}
                                          alt={photo.name}
                                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                          <div className="w-8 h-8 rounded-full bg-white/90 text-black flex items-center justify-center shadow-lg">
                                            <Eye className="w-4 h-4" />
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox Preview Modal */}
      {previewPhoto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl space-y-0">
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40">
              <div>
                <h3 className="text-sm font-extrabold text-foreground">{previewPhoto.equipment}</h3>
                <p className="text-xs text-muted-foreground">{previewPhoto.client} {previewPhoto.date ? `• ${previewPhoto.date}` : ""}</p>
              </div>
              <button
                onClick={() => setPreviewPhoto(null)}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 bg-black/90 flex items-center justify-center min-h-[300px] max-h-[70vh]">
              <img
                src={previewPhoto.url}
                alt={previewPhoto.title}
                className="max-h-[65vh] max-w-full object-contain rounded-xl"
              />
            </div>

            <div className="p-4 border-t border-border bg-muted/30 flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground">{previewPhoto.title}</span>
              <a
                href={previewPhoto.url}
                target="_blank"
                rel="noreferrer"
                download
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-blue-600/20"
              >
                <Download className="w-3.5 h-3.5" />
                Download Original Photo
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
