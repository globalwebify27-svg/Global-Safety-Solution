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
  Loader2,
  Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const openImageInNewTab = (url: string) => {
  if (url.startsWith('data:')) {
    const newWindow = window.open();
    if (newWindow) {
      newWindow.document.write(`<img src="${url}" style="max-width: 100%; max-height: 100vh; display: block; margin: auto; padding: 20px;" />`);
      newWindow.document.title = "View Image";
      newWindow.document.close();
    }
  } else {
    window.open(url, '_blank');
  }
};

interface InspectionItem {
  id: string;
  description: string;
  status: 'PENDING' | 'PASS' | 'FAIL' | 'NA';
  notes?: string;
  scope?: string;
  recommendations?: string;
  expenditure?: number | string;
  photo_url?: string;
  cert_ref_no?: string;
  cert_test_date?: string;
  cert_expiry_date?: string;
  cert_competency_no?: string;
  cert_template_id?: string;
  cert_template_fields?: string;
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
  admin_feedback?: string;
  draft_cert_type?: string;
  draft_cert_data?: any;
  expenditure?: number | string;
  pdf_url?: string;
  expenditures?: any[];
  certificates?: any[];
}

function PdfPreviewer({ url }: { url: string }) {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState(0);
  const [libLoaded, setLibLoaded] = useState(false);
  const canvasRefs = useRef<Record<number, HTMLCanvasElement | null>>({});

  useEffect(() => {
    if ((window as any).pdfjsLib) {
      setLibLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.async = true;
    script.onload = () => {
      (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      setLibLoaded(true);
    };
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    if (!libLoaded || !url) return;

    const pdfjsLib = (window as any).pdfjsLib;
    const loadingTask = pdfjsLib.getDocument(url);
    loadingTask.promise.then(
      (pdf: any) => {
        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
      },
      (reason: any) => {
        console.error("Error loading PDF: ", reason);
      }
    );
  }, [libLoaded, url]);

  useEffect(() => {
    if (!pdfDoc || numPages === 0) return;

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const renderPage = (num: number) => {
        pdfDoc.getPage(num).then((page: any) => {
          const canvas = canvasRefs.current[num];
          if (!canvas) return;

          const context = canvas.getContext("2d");
          if (!context) return;

          const viewport = page.getViewport({ scale: 2.2 });
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          const renderContext = {
            canvasContext: context,
            viewport: viewport,
          };
          page.render(renderContext);
        });
      };
      renderPage(pageNum);
    }
  }, [pdfDoc, numPages]);

  if (!libLoaded) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] w-full gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-xs font-bold text-muted-foreground uppercase">Loading viewer...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-y-auto p-4 flex flex-col items-center gap-6 bg-slate-900/50">
      {Array.from({ length: numPages }, (_, idx) => idx + 1).map((pageNum) => (
        <div key={pageNum} className="bg-white p-4 shadow-xl rounded-xl border border-slate-200/50 relative w-full max-w-[1000px]">
          <canvas
            ref={(el) => { canvasRefs.current[pageNum] = el; }}
            className="w-full h-auto rounded-lg shadow-sm bg-white"
          />
          <span className="absolute bottom-6 right-6 bg-slate-900/80 text-white text-[10px] px-2.5 py-1 rounded-full font-bold uppercase select-none shadow">
            Page {pageNum} of {numPages}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function InspectionsPage() {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [engineers, setEngineers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openSchedule, setOpenSchedule] = useState(false);
  const [openVisit, setOpenVisit] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);

  // Certificate Preparation & Review States
  const [draftCertType, setDraftCertType] = useState("FIRE_SAFETY");
  const [draftCertValidity, setDraftCertValidity] = useState("1y");
  const [draftCertExpiry, setDraftCertExpiry] = useState("");
  const [draftCertNotes, setDraftCertNotes] = useState("");
  const [draftCertScope, setDraftCertScope] = useState("");
  const [feedbackInput, setFeedbackInput] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<Record<string, string>>({});
  const [templateFieldValues, setTemplateFieldValues] = useState<Record<string, Record<string, string>>>({});
  
  const getDefaultFieldValue = (fieldKey: string) => {
    const key = fieldKey.toLowerCase();
    if (key.includes("occupier") || key.includes("client_name") || key.includes("factory_name")) {
      return (selectedInspection?.client as any)?.name || "";
    }
    if (key.includes("address") || key.includes("factory_address")) {
      return (selectedInspection?.client as any)?.address || (selectedInspection?.client as any)?.city || "";
    }
    return "";
  };
  
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadedPhotoUrls, setUploadedPhotoUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseRemarksData = (remarks?: string | null): {
    admin_feedback?: string;
    draft_cert_type?: string;
    draft_cert_data?: any;
    verification_photos?: string[];
  } => {
    if (!remarks) return {};
    if (remarks.startsWith('{') && remarks.endsWith('}')) {
      try {
        return JSON.parse(remarks);
      } catch (e) {
        return {};
      }
    }
    if (remarks.startsWith("Verification Photos: ")) {
      try {
        const parsed = JSON.parse(remarks.replace("Verification Photos: ", ""));
        if (Array.isArray(parsed)) return { verification_photos: parsed };
      } catch (e) {
        const urls = remarks.replace("Verification Photos: ", "").split(",").filter(Boolean);
        return { verification_photos: urls };
      }
    } else if (remarks.startsWith("Verification Photo: ")) {
      return { verification_photos: [remarks.replace("Verification Photo: ", "")] };
    }
    return {};
  };

  const parseRemarksPhotos = (remarks?: string | null): string[] => {
    return parseRemarksData(remarks).verification_photos || [];
  };

  const parseItemPhotos = (photoUrl?: string | null): string[] => {
    if (!photoUrl) return [];
    
    // Trim spaces and quotes
    let clean = photoUrl.trim();
    if (clean.startsWith('data:')) {
      return [clean];
    }
    if ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
      clean = clean.substring(1, clean.length - 1).trim();
    }
    if (clean.startsWith('data:')) {
      return [clean];
    }
    if (clean.startsWith('\\"') && clean.endsWith('\\"')) {
      clean = clean.substring(2, clean.length - 2).trim();
    }
    if (clean.startsWith('data:')) {
      return [clean];
    }

    if (clean.startsWith('[') && clean.endsWith(']')) {
      try {
        const parsed = JSON.parse(clean);
        if (Array.isArray(parsed)) {
          return parsed.map(url => typeof url === 'string' ? url.replace(/[\[\]"']/g, '').trim() : url);
        }
      } catch (e) {
        // Fallback
      }
    }
    
    return clean.split(',')
      .map(url => url.trim().replace(/[\[\]"']/g, '').trim())
      .filter(Boolean);
  };

  const getValidityLabel = (val?: string) => {
    if (!val) return '1 Year';
    if (val === '1y' || val === '1 year') return '1 Year';
    if (val === '2y' || val === '2 year') return '2 Years';
    if (val === '3y' || val === '3 year') return '3 Years';
    if (val === '1/2y' || val === '1/2 year') return '1/2 Year';
    if (val === 'One-Time' || val === '1 time' || val === '1-time') return '1 Time';
    return val;
  };
  
  const [scheduleForm, setScheduleForm] = useState({
    client_id: "",
    engineer_id: "",
    scheduled_date: new Date().toISOString().split('T')[0],
    items: [{ description: "General Safety Check" }]
  });
  const [schedulePdf, setSchedulePdf] = useState<File | null>(null);
  const [itemValidityPeriods, setItemValidityPeriods] = useState<Record<string, string>>({});

  const { token, user } = useAuthStore();
  const roleName = user?.roles?.[0]?.role?.name || "";
  const designation = (user?.designation || "").toUpperCase();
  const isClient = roleName === "CLIENT" || designation.includes("CLIENT");
  
  const isOfficeUser = user?.role === 'ADMIN' || 
    user?.designation?.toLowerCase().includes('admin') || 
    user?.designation?.toLowerCase().includes('executive') ||
    user?.designation?.toLowerCase().includes('staff') ||
    user?.email?.toLowerCase().includes('admin') ||
    roleName === 'ADMIN' ||
    designation.includes('ADMIN') ||
    designation.includes('STAFF') ||
    designation.includes('EXECUTIVE');

  useEffect(() => {
    if (selectedInspection) {
      const oneYearLater = new Date();
      oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
      const defaultExp = oneYearLater.toISOString().split("T")[0];
      setDraftCertExpiry(defaultExp);
      
      const remarksData = parseRemarksData(selectedInspection.remarks);
      selectedInspection.admin_feedback = remarksData.admin_feedback;
      selectedInspection.draft_cert_type = remarksData.draft_cert_type;
      selectedInspection.draft_cert_data = remarksData.draft_cert_data;
      
      if (selectedInspection.draft_cert_type) {
        setDraftCertType(selectedInspection.draft_cert_type);
      } else {
        setDraftCertType("FIRE_SAFETY");
      }
      
      if (selectedInspection.draft_cert_data) {
        try {
          const parsed = typeof selectedInspection.draft_cert_data === 'string'
            ? JSON.parse(selectedInspection.draft_cert_data)
            : selectedInspection.draft_cert_data;
          setDraftCertValidity(parsed.validity_period || "1y");
          setDraftCertExpiry(parsed.expiry_date || defaultExp);
          setDraftCertNotes(parsed.remarks || parsed.recommendations || "");
          setDraftCertScope(parsed.scope || "");
        } catch (e) {
          console.error("Error parsing draft cert data", e);
        }
      } else {
        setDraftCertValidity("1y");
        setDraftCertNotes("");
        setDraftCertScope("");
      }
      // Populate selected template IDs and field values for items
      const tempIds: Record<string, string> = {};
      const fieldVals: Record<string, Record<string, string>> = {};
      (selectedInspection.items || []).forEach((item: any) => {
        if (item.cert_template_id) {
          tempIds[item.id] = item.cert_template_id;
        }
        if (item.cert_template_fields) {
          try {
            fieldVals[item.id] = typeof item.cert_template_fields === 'string'
              ? JSON.parse(item.cert_template_fields)
              : item.cert_template_fields;
          } catch (e) {
            console.error("Error parsing cert_template_fields", e);
          }
        }
      });
      setSelectedTemplateIds(tempIds);
      setTemplateFieldValues(fieldVals);
    }
  }, [selectedInspection?.id]);

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [iRes, cRes, eRes, tempRes] = await Promise.all([
        fetch(`${API_BASE_URL}/inspections`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/clients`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/users`, { headers: { Authorization: `Bearer ${token}` } }), // Changed from /employees to /users as per schema
        fetch(`${API_BASE_URL}/certificate-templates`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const [iData, cData, eData, tempData] = await Promise.all([iRes.json(), cRes.json(), eRes.json(), tempRes.json()]);
      
      if (Array.isArray(iData)) setInspections(iData);
      if (Array.isArray(cData)) setClients(cData);
      if (Array.isArray(tempData)) setTemplates(tempData);
      if (Array.isArray(eData)) {
        setEngineers(eData.filter((u: any) => 
          u.is_active && 
          !u.roles?.some((ur: any) => ur.role?.name === 'CLIENT' || ur.role?.name === 'CLIENTS')
        ));
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

  const updateExpenditures = async (expendituresList: any[]) => {
    if (!selectedInspection || !token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/inspections/${selectedInspection.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ expenditures: expendituresList })
      });
      if (res.ok) {
        toast.success("Expenditures updated successfully!");
        await fetchSingleInspection(selectedInspection.id);
      } else {
        const err = await res.json();
        toast.error(err.message || "Failed to update expenditures");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to update expenditures");
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      let uploadedPdfUrl = "";
      if (schedulePdf) {
        const formData = new FormData();
        formData.append('file', schedulePdf);
        formData.append('name', `Inspection PDF - ${scheduleForm.client_id}`);
        formData.append('category', 'OTHER');
        if (scheduleForm.client_id) {
          formData.append('client_id', scheduleForm.client_id);
        }

        const uploadRes = await fetch(`${API_BASE_URL}/documents`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          uploadedPdfUrl = uploadData.file_url;
        } else {
          toast.error("Failed to upload PDF report");
          return;
        }
      }

      const payload: any = {
        client_id: scheduleForm.client_id,
        engineer_id: scheduleForm.engineer_id,
        scheduled_date: scheduleForm.scheduled_date,
        items: [{ description: "General Safety Check" }]
      };

      if (uploadedPdfUrl) {
        payload.pdf_url = uploadedPdfUrl;
      }

      const res = await fetch(`${API_BASE_URL}/inspections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const createdInspection = await res.json();
        setOpenSchedule(false);
        setSchedulePdf(null);
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

  const handleUpdateItem = async (
    itemId: string,
    status: string,
    notes?: string,
    expenditure?: number | string,
    photo_url?: string,
    scope?: string,
    recommendations?: string,
    cert_ref_no?: string,
    cert_test_date?: string,
    cert_expiry_date?: string,
    cert_competency_no?: string,
    cert_template_id?: string,
    cert_template_fields?: string
  ) => {
    if (!token) return;
    try {
      const body: any = { status };
      if (notes !== undefined) body.notes = notes;
      if (expenditure !== undefined) body.expenditure = expenditure ? Number(expenditure) : 0;
      if (photo_url !== undefined) body.photo_url = photo_url;
      if (scope !== undefined) body.scope = scope;
      if (recommendations !== undefined) body.recommendations = recommendations;
      if (cert_ref_no !== undefined) body.cert_ref_no = cert_ref_no;
      if (cert_test_date !== undefined) body.cert_test_date = cert_test_date;
      if (cert_expiry_date !== undefined) body.cert_expiry_date = cert_expiry_date;
      if (cert_competency_no !== undefined) body.cert_competency_no = cert_competency_no;
      if (cert_template_id !== undefined) body.cert_template_id = cert_template_id;
      if (cert_template_fields !== undefined) body.cert_template_fields = cert_template_fields;

      const res = await fetch(`${API_BASE_URL}/inspections/item/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        if (selectedInspection) {
          const updatedItems = (selectedInspection.items || []).map(item => {
            if (item.id === itemId) {
              const updatedItem = { ...item, status: status as any };
              if (notes !== undefined) updatedItem.notes = notes;
              if (expenditure !== undefined) updatedItem.expenditure = expenditure;
              if (photo_url !== undefined) updatedItem.photo_url = photo_url;
              if (scope !== undefined) updatedItem.scope = scope;
              if (recommendations !== undefined) updatedItem.recommendations = recommendations;
              if (cert_ref_no !== undefined) updatedItem.cert_ref_no = cert_ref_no;
              if (cert_test_date !== undefined) updatedItem.cert_test_date = cert_test_date;
              if (cert_expiry_date !== undefined) updatedItem.cert_expiry_date = cert_expiry_date;
              if (cert_competency_no !== undefined) updatedItem.cert_competency_no = cert_competency_no;
              if (cert_template_id !== undefined) updatedItem.cert_template_id = cert_template_id;
              if (cert_template_fields !== undefined) updatedItem.cert_template_fields = cert_template_fields;
              return updatedItem;
            }
            return item;
          });
          setSelectedInspection({ ...selectedInspection, items: updatedItems });
          await fetchSingleInspection(selectedInspection.id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/inspections/item/${itemId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success("Observation section removed!");
        if (selectedInspection) {
          await fetchSingleInspection(selectedInspection.id);
        }
      }
    } catch (err) {
      toast.error("Failed to remove observation section");
    }
  };

  const calculateInitialValidity = (testDateStr?: string | null, expiryDateStr?: string | null) => {
    if (!testDateStr || !expiryDateStr) return "1y";
    const testDate = new Date(testDateStr);
    const expiryDate = new Date(expiryDateStr);
    const diffTime = Math.abs(expiryDate.getTime() - testDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays >= 1000) return "3y";
    if (diffDays >= 700) return "2y";
    if (diffDays >= 340) return "1y";
    if (diffDays >= 160) return "1/2y";
    return "1y";
  };

  const handleValidityChange = (itemId: string, item: any, validity: string) => {
    const today = new Date();
    const testDateStr = today.toISOString();
    const expiry = new Date(today);
    
    if (validity === "1y") {
      expiry.setFullYear(expiry.getFullYear() + 1);
    } else if (validity === "2y") {
      expiry.setFullYear(expiry.getFullYear() + 2);
    } else if (validity === "3y") {
      expiry.setFullYear(expiry.getFullYear() + 3);
    } else if (validity === "1/2y") {
      expiry.setMonth(expiry.getMonth() + 6);
    }
    
    const expiryDateStr = expiry.toISOString();
    setItemValidityPeriods(prev => ({ ...prev, [itemId]: validity }));
    
    handleUpdateItem(
      itemId,
      item.status,
      item.notes,
      undefined,
      undefined,
      item.scope,
      item.recommendations,
      item.cert_ref_no,
      testDateStr,
      expiryDateStr
    );
  };

  const compressImage = (file: File, maxWidth = 1024, maxHeight = 1024, quality = 0.7): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Canvas to Blob conversion failed'));
              }
            },
            'image/jpeg',
            quality
          );
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleItemPhotoUpload = async (itemId: string, files: FileList) => {
    if (files.length === 0 || !token) return;
    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        let compressedFile: File | Blob = file;
        try {
          // Compress the image down to under 150KB
          const blob = await compressImage(file);
          compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", { type: 'image/jpeg' });
        } catch (err) {
          console.error("Compression failed, using original file", err);
        }

        const formData = new FormData();
        formData.append('file', compressedFile);
        formData.append('name', `Item Photo - ${selectedInspection?.client?.name || 'Inspection'} - Item ${itemId}`);
        formData.append('category', 'OTHER');
        if (selectedInspection?.client_id) {
          formData.append('client_id', selectedInspection.client_id);
        }
        const res = await fetch(`${API_BASE_URL}/documents`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        });
        if (res.ok) {
          const data = await res.json();
          uploadedUrls.push(data.file_url);
        }
      }
      if (uploadedUrls.length > 0) {
        const currentItem = selectedInspection?.items?.find(it => it.id === itemId);
        const existingUrls = currentItem?.photo_url ? parseItemPhotos(currentItem.photo_url) : [];
        const newUrls = [...existingUrls, ...uploadedUrls];
        await handleUpdateItem(itemId, currentItem?.status || 'PENDING', currentItem?.notes || '', undefined, JSON.stringify(newUrls));
        toast.success("Photo uploaded successfully!");
      }
    } catch (err) {
      toast.error("Failed to upload photo");
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

  const handleSubmitForReview = async () => {
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
    
    setSubmittingReview(true);
    const submit = async (latitude?: number, longitude?: number) => {
      try {
        const hasFailItems = (selectedInspection.items || []).some(item => item.status === 'FAIL');
        const finalStatus = hasFailItems ? 'REJECTED' : 'PENDING_REVIEW';

        const res = await fetch(`${API_BASE_URL}/inspections/${selectedInspection.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ 
            status: finalStatus, 
            completed_date: finalStatus === 'REJECTED' ? new Date().toISOString() : undefined,
            lat: latitude,
            lng: longitude,
            remarks: uploadedPhotoUrls.length > 0 ? "Verification Photos: " + JSON.stringify(uploadedPhotoUrls) : undefined,
            draft_cert_type: finalStatus === 'PENDING_REVIEW' ? draftCertType : undefined,
            draft_cert_data: finalStatus === 'PENDING_REVIEW' ? {
              validity_period: draftCertValidity,
              expiry_date: draftCertExpiry,
              remarks: draftCertNotes,
              scope: draftCertScope
            } : undefined
          })
        });
        if (res.ok) {
          setOpenVisit(false);
          if (finalStatus === 'REJECTED') {
            toast.warning("Visit submitted and marked as REJECTED due to failed items");
          } else {
            toast.success("Visit submitted and pending Office Staff review");
          }
          fetchData();
        } else {
          const err = await res.json();
          toast.error(err.message || "Failed to complete visit");
        }
      } catch (e) {
        toast.error("Failed to complete visit due to network error");
      } finally {
        setSubmittingReview(false);
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

  const handleApproveInspection = async (inspectionId: string) => {
    if (!token) return;
    setSubmittingReview(true);
    try {
      const res = await fetch(`${API_BASE_URL}/inspections/${inspectionId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success("Inspection Approved! Official Certificate issued successfully.");
        setOpenVisit(false);
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.message || "Failed to approve inspection");
      }
    } catch (e) {
      toast.error("Failed to approve inspection");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleRejectInspection = async (inspectionId: string) => {
    if (!token || !feedbackInput.trim()) {
      toast.error("Please enter feedback for rejection");
      return;
    }
    setSubmittingReview(true);
    try {
      const res = await fetch(`${API_BASE_URL}/inspections/${inspectionId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ feedback: feedbackInput })
      });
      if (res.ok) {
        toast.warning("Inspection Rejected. Safety Officer will be notified.");
        setFeedbackInput("");
        setOpenVisit(false);
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.message || "Failed to reject inspection");
      }
    } catch (e) {
      toast.error("Failed to reject inspection");
    } finally {
      setSubmittingReview(false);
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

  const isAuthorized = user?.email === "admin@globalsafety.com" ||
    user?.name?.toLowerCase().includes("admin") ||
    user?.role === "ADMIN" || 
    isClient ||
    ((user?.designation && (
      user.designation.toLowerCase().includes("admin") || 
      user.designation.toLowerCase().includes("executive") ||
      user.designation.toLowerCase().includes("staff") ||
      user.designation.toLowerCase().includes("manager") ||
      user.designation.toLowerCase().includes("director")
    )) &&
    !(
      user?.designation?.toLowerCase().includes("engineer") ||
      user?.designation?.toLowerCase().includes("technician") ||
      user?.designation?.toLowerCase().includes("tecnician") ||
      user?.designation?.toLowerCase().includes("field")
    ));

  if (user && !isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center">
        <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-600">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black tracking-tight text-foreground">Access Denied</h2>
        <p className="text-muted-foreground max-w-md font-medium">
          The Site Inspections management panel is restricted to Office Staff and Administrators. Please use the Field Task Board to manage your active site inspections.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
            Site Inspections
          </h1>
        </div>
        {!isClient && (
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
                      {engineers.map(e => <option key={e.id} value={e.id}>{e.name} ({e.employee_id || e.designation || 'Field Engineer'})</option>)}
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
                  <div className="space-y-2">
                    <Label>Inspection PDF (Optional)</Label>
                    <Input 
                      type="file" 
                      accept="application/pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setSchedulePdf(file);
                      }}
                      className="h-11 bg-background border-border pt-2"
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
        )}
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
            <input 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-background border border-border rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none w-64" 
              placeholder="Search audits..." 
            />
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
              ) : (() => {
                const filteredInspections = inspections.filter(i => {
                  const clientName = i.client?.name?.toLowerCase() || "";
                  const engineerName = i.engineer?.name?.toLowerCase() || "";
                  const status = i.status?.toLowerCase() || "";
                  const term = searchTerm.toLowerCase();
                  return clientName.includes(term) || engineerName.includes(term) || status.includes(term);
                });
                if (filteredInspections.length === 0) {
                  return <tr><td colSpan={5} className="px-8 py-12 text-center text-muted-foreground">No matching inspections found.</td></tr>;
                }
                return filteredInspections.map((i) => (
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
                        ₹{(Number(i.expenditure) > 0 ? Number(i.expenditure) : (i.items || []).reduce((acc, curr) => acc + (Number(curr.expenditure) || 0), 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isClient ? (
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
                              View Details
                            </Button>
                            {i.status === 'COMPLETED' && (
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-9 w-9 rounded-xl text-emerald-600 hover:bg-emerald-500/10"
                                onClick={() => handleDownloadCertificate(i.id)}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            )}
                          </>
                        ) : i.status === 'COMPLETED' ? (
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
                ));
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {/* Field Visit Dialog */}
      <Dialog open={openVisit} onOpenChange={setOpenVisit}>
        <DialogContent className="sm:max-w-[700px] bg-card border-border rounded-[2.5rem] max-h-[90vh] overflow-y-auto">
          {selectedInspection && (
            isClient ? (
              <div className="space-y-6">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black flex items-center gap-3">
                    <ClipboardCheck className="w-6 h-6 text-blue-600" /> Site Audit Details
                  </DialogTitle>
                  <DialogDescription>
                    Inspection status and checklist for <span className="font-bold text-foreground">{selectedInspection.client?.name}</span>
                  </DialogDescription>
                </DialogHeader>

                {/* Audit Basic Info */}
                <div className="p-5 bg-muted/20 border border-border rounded-2xl grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Scheduled Date</span>
                    <p className="font-bold mt-0.5">{new Date(selectedInspection.scheduled_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Audit Status</span>
                    <p className="mt-0.5">
                      <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tight ring-1",
                        selectedInspection.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-600 ring-emerald-500/20' :
                        selectedInspection.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-600 ring-rose-500/20' :
                        selectedInspection.status === 'PENDING_REVIEW' ? 'bg-amber-500/10 text-amber-600 ring-amber-500/20' :
                        selectedInspection.status === 'SCHEDULED' ? 'bg-blue-500/10 text-blue-600 ring-blue-500/20' :
                        'bg-slate-500/10 text-slate-600 ring-slate-500/20'
                      )}>
                        {selectedInspection.status}
                      </span>
                    </p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Assigned Field Engineer</span>
                    <p className="font-bold mt-0.5">{selectedInspection.engineer?.name || "Unassigned"}</p>
                  </div>
                  {selectedInspection.pdf_url && (
                    <div className="col-span-2">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">Inspection PDF</span>
                      <p className="mt-1">
                        <a 
                          href={selectedInspection.pdf_url} 
                          download={`inspection-${selectedInspection.id}.pdf`}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600/10 text-blue-600 border border-blue-600/20 rounded-lg text-xs font-bold hover:bg-blue-600 hover:text-white transition-all"
                        >
                          <Download className="w-3.5 h-3.5" /> Download Attached PDF
                        </a>
                      </p>
                    </div>
                  )}
                </div>

                {/* Checklist Results */}
                <div className="space-y-3">
                  <h4 className="font-black text-xs uppercase tracking-widest text-muted-foreground">Audit Checklist</h4>
                  <div className="max-h-60 overflow-y-auto space-y-2 border border-border/50 rounded-xl p-3 bg-muted/10">
                    {(selectedInspection.items || []).map((item) => (
                      <div key={item.id} className="flex flex-col gap-2 p-3 bg-background rounded-lg border border-border/50">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-foreground">{item.description}</span>
                          <span className={cn("px-2 py-0.5 rounded text-[10px] font-black uppercase ring-1",
                            item.status === 'PASS' ? 'bg-emerald-500/10 text-emerald-600 ring-emerald-500/20' :
                            item.status === 'FAIL' ? 'bg-rose-500/10 text-rose-600 ring-rose-500/20' : 
                            item.status === 'NA' ? 'bg-slate-500/10 text-slate-600 ring-slate-500/20' :
                            'bg-amber-500/10 text-amber-600 ring-amber-500/20'
                          )}>
                            {item.status}
                          </span>
                        </div>
                        {item.notes && (
                          <p className="text-[11px] text-muted-foreground italic bg-muted/50 p-2 rounded border border-border/10 whitespace-pre-line">
                            <span className="font-semibold text-foreground/75 block mb-1">Observations:</span>{item.notes}
                          </p>
                        )}
                        {item.scope && (
                          <p className="text-[11px] text-muted-foreground italic bg-muted/50 p-2 rounded border border-border/10 whitespace-pre-line">
                            <span className="font-semibold text-foreground/75 block mb-1">Scope:</span>{item.scope}
                          </p>
                        )}
                        {item.recommendations && (
                          <p className="text-[11px] text-muted-foreground italic bg-muted/50 p-2 rounded border border-border/10 whitespace-pre-line">
                            <span className="font-semibold text-foreground/75 block mb-1">Remarks & Recommendations:</span>{item.recommendations}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Photos */}
                {uploadedPhotoUrls.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-black text-xs uppercase tracking-widest text-muted-foreground">Site Photos</h4>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 p-4 bg-muted/20 border border-border/50 rounded-2xl">
                      {uploadedPhotoUrls.map((url, index) => (
                        <div key={index} className="relative aspect-square rounded-xl overflow-hidden border border-border group shadow-sm bg-background">
                          <img 
                            src={url} 
                            alt={`Verification preview ${index + 1}`} 
                            className="w-full h-full object-cover transition-all duration-300 group-hover:scale-110 cursor-pointer" 
                            onClick={() => openImageInNewTab(url)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <DialogFooter className="pt-4 border-t border-border">
                  <Button variant="ghost" onClick={() => setOpenVisit(false)}>Close</Button>
                  {selectedInspection.status === 'COMPLETED' && (
                    <Button 
                      onClick={() => handleDownloadCertificate(selectedInspection.id)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl"
                    >
                      <Download className="w-4 h-4 mr-2" /> Download Certificate
                    </Button>
                  )}
                </DialogFooter>
              </div>
            ) : (
              <div className="space-y-6">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black flex items-center gap-3">
                    <ClipboardCheck className="w-6 h-6 text-blue-600" /> {selectedInspection.status === 'PENDING_REVIEW' || selectedInspection.status === 'IN_PROGRESS' ? 'Office Review & Issuance' : 'Inspection Checklist'}
                  </DialogTitle>
                  <DialogDescription>
                    Site Visit for <span className="font-bold text-foreground">{selectedInspection.client?.name}</span>
                  </DialogDescription>
                </DialogHeader>
  
                {/* Rejection Banner */}
                {selectedInspection.status === 'REJECTED' && selectedInspection.admin_feedback && (
                  <div className="p-4 bg-rose-500/10 border border-rose-500/25 rounded-2xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="text-sm font-bold text-rose-800">Changes Requested by Office Staff</h5>
                      <p className="text-xs text-rose-600 mt-1">{selectedInspection.admin_feedback}</p>
                    </div>
                  </div>
                )}
  
                {/* Sleek inline Audit Management & Settings Bar */}
                {!isClient && (
                  <div className="p-5 bg-blue-500/5 border border-blue-500/10 rounded-2xl space-y-4 shadow-inner">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest">Audit settings & assignment</h4>
                      <span className={cn("px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tight ring-1",
                        selectedInspection.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-600 ring-emerald-500/20' :
                        selectedInspection.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-600 ring-rose-500/20' :
                        selectedInspection.status === 'PENDING_REVIEW' ? 'bg-amber-500/10 text-amber-600 ring-amber-500/20' :
                        selectedInspection.status === 'SCHEDULED' ? 'bg-blue-500/10 text-blue-600 ring-blue-500/20' :
                        'bg-slate-500/10 text-slate-600 ring-slate-500/20'
                      )}>
                        CURRENT STATE: {selectedInspection.status}
                      </span>
                    </div>
    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                            <option key={eng.id} value={eng.id}>{eng.name} ({eng.employee_id || eng.designation || 'Field Engineer'})</option>
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
                          <option value="PENDING_REVIEW">PENDING_REVIEW</option>
                          <option value="COMPLETED">COMPLETED</option>
                          <option value="REJECTED">REJECTED</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Total Expenditure (₹)</label>
                        <input
                          type="text"
                          readOnly
                          value={
                            selectedInspection.expenditures && selectedInspection.expenditures.length > 0
                              ? (selectedInspection.expenditures || []).reduce((acc: number, curr: any) => acc + Number(curr.amount), 0).toFixed(2)
                              : Number(selectedInspection.expenditure || 0).toFixed(2)
                          }
                          className="w-full h-10 px-3 bg-muted border border-border rounded-xl text-xs font-semibold focus:outline-none cursor-not-allowed text-muted-foreground"
                        />
                      </div>
                    </div>

                    {/* Itemized Expenditures List & Adder */}
                    <div className="pt-4 border-t border-border/50 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Itemized Expenditures Breakdown</h4>
                        <span className="text-[10px] text-muted-foreground font-bold">Total Entries: {(selectedInspection.expenditures || []).length}</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* Expenditures List */}
                        <div className="md:col-span-2 space-y-2 max-h-[140px] overflow-y-auto pr-1">
                          {(selectedInspection.expenditures || []).map((exp: any, idx: number) => (
                            <div key={exp.id || idx} className="flex items-center justify-between p-2.5 bg-background border border-border/80 rounded-xl text-xs shadow-sm hover:border-border/100 transition-all">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-muted-foreground shrink-0">{exp.date ? exp.date.split('T')[0] : ""}</span>
                                <span className="text-muted-foreground shrink-0 font-bold">•</span>
                                <span className="font-medium text-foreground truncate max-w-[150px] md:max-w-[200px]" title={exp.note}>{exp.note}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="font-bold text-foreground">₹{Number(exp.amount).toFixed(2)}</span>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const updatedExp = (selectedInspection.expenditures || []).filter((_: any, i: number) => i !== idx).map((e: any) => ({
                                      date: e.date,
                                      amount: Number(e.amount),
                                      note: e.note
                                    }));
                                    await updateExpenditures(updatedExp);
                                  }}
                                  className="text-rose-500 hover:text-rose-700 font-bold px-1.5 py-0.5 rounded hover:bg-rose-500/5 transition-all text-xs"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          ))}
                          {(selectedInspection.expenditures || []).length === 0 && (
                            <p className="text-xs text-muted-foreground italic p-2 bg-background border border-dashed border-border rounded-xl text-center">No expenditure entries logged yet.</p>
                          )}
                        </div>

                        {/* Add Form */}
                        <div className="p-3.5 bg-background border border-border/80 rounded-2xl space-y-2.5 flex flex-col justify-between">
                          <div className="space-y-2">
                            <input
                              type="date"
                              id="new_exp_date"
                              defaultValue={new Date().toISOString().split('T')[0]}
                              className="w-full h-8 px-2.5 bg-background border border-border rounded-lg text-xs font-semibold focus:outline-none"
                            />
                            <input
                              type="text"
                              id="new_exp_note"
                              placeholder="Note (e.g. Stay, Travel)"
                              className="w-full h-8 px-2.5 bg-background border border-border rounded-lg text-xs font-semibold focus:outline-none"
                            />
                            <input
                              type="number"
                              id="new_exp_amount"
                              placeholder="Amount (₹)"
                              className="w-full h-8 px-2.5 bg-background border border-border rounded-lg text-xs font-semibold focus:outline-none"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={async () => {
                              const dateEl = document.getElementById('new_exp_date') as HTMLInputElement;
                              const noteEl = document.getElementById('new_exp_note') as HTMLInputElement;
                              const amountEl = document.getElementById('new_exp_amount') as HTMLInputElement;

                              if (!dateEl?.value || !noteEl?.value || !amountEl?.value) {
                                toast.error("Please enter date, note, and amount");
                                return;
                              }

                              const newItem = {
                                date: dateEl.value,
                                note: noteEl.value,
                                amount: Number(amountEl.value)
                              };

                              const updatedExp = [
                                ...(selectedInspection.expenditures || []).map((e: any) => ({
                                  date: e.date,
                                  amount: Number(e.amount),
                                  note: e.note
                                })),
                                newItem
                              ];

                              await updateExpenditures(updatedExp);

                              noteEl.value = "";
                              amountEl.value = "";
                            }}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-1.5 rounded-lg shadow-md transition-all shrink-0"
                          >
                            + Add Entry
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedInspection.pdf_url && (
                  <div className="p-4 bg-muted/20 border border-border rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase block">Attached Inspection PDF</span>
                      <span className="text-xs text-foreground/80 font-medium">Provided at scheduling</span>
                    </div>
                    <Button 
                      type="button"
                      onClick={() => setPreviewPdfUrl(selectedInspection.pdf_url || null)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600/10 text-blue-600 border border-blue-600/20 rounded-xl text-xs font-bold hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-95 h-9"
                    >
                      <Eye className="w-4 h-4" /> Preview PDF
                    </Button>
                  </div>
                )}
  
                {selectedInspection.status === 'PENDING_REVIEW' || selectedInspection.status === 'IN_PROGRESS' ? (
                  <div className="space-y-6">
                    {/* Checklist Summary */}
                    <div className="space-y-3">
                      <h4 className="font-black text-xs uppercase tracking-widest text-muted-foreground">Checklist Results</h4>
                      <div className="max-h-48 overflow-y-auto space-y-2 border border-border/50 rounded-xl p-3 bg-muted/10">
                        {(selectedInspection.items || []).map((item) => (
                          <div key={item.id} className="text-xs p-2.5 bg-background rounded-lg border border-border/50 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-foreground">{item.description}</span>
                              <span className={cn("px-2 py-0.5 rounded text-[10px] font-black uppercase",
                                item.status === 'PASS' ? 'bg-emerald-500/10 text-emerald-600' :
                                item.status === 'FAIL' ? 'bg-rose-500/10 text-rose-600' : 'bg-muted text-muted-foreground'
                              )}>
                                {item.status}
                              </span>
                            </div>
                            {item.notes && (
                              <p className="text-[11px] text-muted-foreground italic whitespace-pre-line">
                                <span className="font-semibold text-foreground/75 block mb-1">Observations:</span>{item.notes}
                              </p>
                            )}
                            {item.scope && (
                              <p className="text-[11px] text-muted-foreground italic whitespace-pre-line">
                                <span className="font-semibold text-foreground/75 block mb-1">Scope:</span>{item.scope}
                              </p>
                            )}
                            {item.recommendations && (
                              <p className="text-[11px] text-muted-foreground italic whitespace-pre-line">
                                <span className="font-semibold text-foreground/75 block mb-1">Remarks & Recommendations:</span>{item.recommendations}
                              </p>
                            )}
                            {item.photo_url && parseItemPhotos(item.photo_url).length > 0 && (
                              <div className="flex gap-2 flex-wrap pt-1">
                                {parseItemPhotos(item.photo_url).map((url, idx) => (
                                  <img 
                                    key={idx}
                                    src={url}
                                    alt="Evidence"
                                    className="w-10 h-10 object-cover rounded-lg border border-border cursor-pointer hover:opacity-85 transition-opacity"
                                    onClick={() => openImageInNewTab(url)}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
  
                    {/* Verification Photos Preview */}
                    {uploadedPhotoUrls.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-black text-xs uppercase tracking-widest text-muted-foreground">Site Photos</h4>
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 p-4 bg-muted/20 border border-border/50 rounded-2xl">
                          {uploadedPhotoUrls.map((url, index) => (
                            <div key={index} className="relative aspect-square rounded-xl overflow-hidden border border-border group shadow-sm bg-background">
                              <img 
                                src={url} 
                                alt={`Verification preview ${index + 1}`} 
                                className="w-full h-full object-cover transition-all duration-300 group-hover:scale-110 cursor-pointer" 
                                onClick={() => openImageInNewTab(url)}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
  
                    {/* Office Review Controls */}
                    {(() => {
                      const isOfficeUser = user?.role === 'ADMIN' || 
                        user?.designation?.toLowerCase().includes('admin') || 
                        user?.designation?.toLowerCase().includes('executive') ||
                        user?.designation?.toLowerCase().includes('staff') ||
                        user?.email?.toLowerCase().includes('admin');
                      
                      if (isOfficeUser) {
                        return (
                          <div className="p-6 bg-amber-500/5 border border-amber-500/10 rounded-2xl space-y-4 shadow-sm">
                            <h4 className="font-black text-amber-600 uppercase text-xs tracking-wider">Office Review Actions</h4>
                            <div className="space-y-2">
                              <Label className="text-xs font-semibold">Rejection Feedback (Required only if requesting changes)</Label>
                              <Input
                                placeholder="e.g., Please re-check the sprinkler systems on the 3rd floor..."
                                value={feedbackInput}
                                onChange={(e) => setFeedbackInput(e.target.value)}
                                className="bg-background text-sm h-11"
                              />
                            </div>
                            <div className="flex gap-3 pt-2">
                              <Button 
                                onClick={() => handleRejectInspection(selectedInspection.id)}
                                disabled={submittingReview || !feedbackInput.trim()}
                                className="flex-1 rounded-xl font-bold bg-rose-600 hover:bg-rose-500 text-white h-11 transition-all"
                              >
                                Reject & Request Changes
                              </Button>
                              <Button 
                                onClick={() => handleApproveInspection(selectedInspection.id)}
                                disabled={submittingReview}
                                className="flex-1 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white h-11 transition-all"
                              >
                                Approve & Issue Certificate
                              </Button>
                            </div>
                          </div>
                        );
                      } else {
                        return (
                          <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl text-center">
                            <p className="text-xs font-bold text-amber-700">
                              ⏳ Under Review: This draft certificate is currently awaiting office review and formal approval.
                            </p>
                          </div>
                        );
                      }
                    })()
                    }
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      {(selectedInspection?.items || []).map((item, index) => (
                        <div key={item.id} className="p-5 bg-muted/20 border border-border rounded-2xl space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-foreground">Observation {index + 1}</span>
                            <div className="flex items-center gap-2">
                              <Button 
                                size="sm" 
                                variant={item.status === 'PASS' ? 'default' : 'outline'} 
                                className={cn("h-8 rounded-lg", item.status === 'PASS' && "bg-emerald-600 hover:bg-emerald-500")}
                                onClick={() => handleUpdateItem(item.id, 'PASS', item.notes)}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8 rounded-lg hover:bg-rose-500/10 hover:text-rose-600 hover:border-rose-500/20"
                                onClick={() => handleDeleteItem(item.id)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex flex-col gap-3">
                            {/* Certificate configuration for this safety checklist section */}
                            <div className="pt-2 space-y-4">
                              <h4 className="text-xs font-black text-blue-600 uppercase tracking-wider">Section Certificate Details</h4>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                  <Label className="text-[10px] font-bold text-muted-foreground uppercase">Select Certificate Template</Label>
                                  <select
                                    value={selectedTemplateIds[item.id] || ""}
                                    onChange={(e) => {
                                      const newTempId = e.target.value;
                                      setSelectedTemplateIds({ ...selectedTemplateIds, [item.id]: newTempId });
                                      handleUpdateItem(item.id, item.status, item.notes, undefined, undefined, item.scope, item.recommendations, item.cert_ref_no, item.cert_test_date, item.cert_expiry_date, item.cert_competency_no, newTempId);
                                    }}
                                    className="w-full h-9 px-3 bg-background border border-border rounded-xl text-xs focus:outline-none text-foreground"
                                  >
                                    <option value="">Select a template...</option>
                                    {templates.map(t => (
                                      <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                  </select>
                                </div>

                                <div className="space-y-1">
                                  <Label className="text-[10px] font-bold text-muted-foreground uppercase">Validity Period</Label>
                                  <select 
                                    value={itemValidityPeriods[item.id] || calculateInitialValidity(item.cert_test_date, item.cert_expiry_date)}
                                    onChange={(e) => handleValidityChange(item.id, item, e.target.value)}
                                    className="w-full h-9 px-3 bg-background border border-border rounded-xl text-xs focus:outline-none text-foreground"
                                  >
                                    <option value="1y">1 Year</option>
                                    <option value="2y">2 Years</option>
                                    <option value="3y">3 Years</option>
                                    <option value="1/2y">6 Months</option>
                                  </select>
                                </div>

                                <div className="space-y-1">
                                  <Label className="text-[10px] font-bold text-muted-foreground uppercase">Certificate Reference No.</Label>
                                  <Input 
                                    placeholder="e.g. GSS/TEST/CPB/01/2026" 
                                    className="bg-background h-9 text-xs"
                                    defaultValue={item.cert_ref_no || ""}
                                    onBlur={(e) => handleUpdateItem(item.id, item.status, item.notes, undefined, undefined, item.scope, item.recommendations, e.target.value)}
                                  />
                                </div>

                                <div className="space-y-1">
                                  <Label className="text-[10px] font-bold text-muted-foreground uppercase">License / Competency No.</Label>
                                  <Input 
                                    placeholder="e.g. 663, valid upto 10.11.2026" 
                                    className="bg-background h-9 text-xs"
                                    defaultValue={item.cert_competency_no || ""}
                                    onBlur={(e) => handleUpdateItem(item.id, item.status, item.notes, undefined, undefined, item.scope, item.recommendations, item.cert_ref_no, undefined, undefined, e.target.value)}
                                  />
                                </div>

                              </div>

                              {/* Custom Fields based on selected template */}
                              {(() => {
                                const tempId = selectedTemplateIds[item.id];
                                const activeTemp = templates.find(t => t.id === tempId);
                                if (!activeTemp) return null;
                                
                                let tempFields: any[] = [];
                                try {
                                  tempFields = JSON.parse(activeTemp.fields);
                                } catch(e){}

                                if (tempFields.length === 0) return null;

                                return (
                                  <div className="space-y-3 pt-3 border-t border-blue-500/10">
                                    <h5 className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Template Fields</h5>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      {tempFields.map((field: any, idx: number) => (
                                        <div key={idx} className="space-y-1">
                                          <Label className="text-[10px] text-slate-400">{field.label}</Label>
                                          <textarea
                                            placeholder={field.default || "Enter value..."}
                                            className="w-full bg-background border border-border rounded-xl p-2.5 text-xs text-foreground focus:outline-none min-h-[80px] resize-y"
                                            value={templateFieldValues[item.id]?.[field.key] ?? (getDefaultFieldValue(field.key) || field.default || "")}
                                            onChange={(e) => {
                                              const currentVals = templateFieldValues[item.id] || {};
                                              setTemplateFieldValues({
                                                ...templateFieldValues,
                                                [item.id]: {
                                                  ...currentVals,
                                                  [field.key]: e.target.value
                                                }
                                              });
                                            }}
                                            onBlur={(e) => {
                                              const currentVals = templateFieldValues[item.id] || {};
                                              const updatedVals = {
                                                ...currentVals,
                                                [field.key]: e.target.value
                                              };
                                              handleUpdateItem(item.id, item.status, item.notes, undefined, undefined, item.scope, item.recommendations, item.cert_ref_no, item.cert_test_date, item.cert_expiry_date, item.cert_competency_no, selectedTemplateIds[item.id], JSON.stringify(updatedVals));
                                            }}
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>

                            {/* Inspections Name Input (Below Certificate Details) */}
                            <div className="space-y-1 pt-3 border-t border-border/40">
                              <Label className="text-[10px] font-bold text-muted-foreground uppercase">Inspections Name</Label>
                              <Input 
                                placeholder="Inspections Name..." 
                                className="bg-background h-10 text-sm flex-1"
                                defaultValue={item.scope || ""}
                                onBlur={(e) => {
                                  if (e.target.value !== (item.scope || "")) {
                                    handleUpdateItem(item.id, item.status, item.notes, undefined, undefined, e.target.value, item.recommendations);
                                  }
                                }}
                              />
                            </div>
                            
                            {/* Per-item Photo Upload & Preview */}
                            <div className="space-y-2 pt-2">
                              {item.photo_url && parseItemPhotos(item.photo_url).length > 0 && (
                                <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 p-3 bg-muted/30 border border-border/50 rounded-xl">
                                  {parseItemPhotos(item.photo_url).map((url, index) => (
                                    <div key={index} className="relative aspect-square rounded-xl overflow-hidden border border-border group shadow-sm bg-background">
                                      <img 
                                        src={url} 
                                        alt={`Item photo ${index + 1}`} 
                                        className="w-full h-full object-cover transition-all duration-300 group-hover:scale-110 cursor-pointer" 
                                        onClick={() => openImageInNewTab(url)}
                                      />
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          const remaining = parseItemPhotos(item.photo_url).filter((_, idx) => idx !== index);
                                          await handleUpdateItem(item.id, item.status, item.notes, undefined, remaining.length > 0 ? JSON.stringify(remaining) : "");
                                        }}
                                        className="absolute top-1.5 right-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow duration-200 cursor-pointer"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              <div className="flex items-center gap-2 flex-wrap">
                                <input 
                                  type="file" 
                                  id={`item-file-${item.id}`}
                                  onChange={(e) => {
                                    if (e.target.files) {
                                      handleItemPhotoUpload(item.id, e.target.files);
                                      e.target.value = "";
                                    }
                                  }}
                                  accept="image/*" 
                                  className="hidden" 
                                  multiple
                                />
                                <Button 
                                  type="button"
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => document.getElementById(`item-file-${item.id}`)?.click()}
                                  className="rounded-xl h-9 border-blue-500/20 text-blue-600 hover:bg-blue-500/10 font-bold text-xs"
                                >
                                  <Camera className="w-3.5 h-3.5 mr-1" /> Upload Item Photo
                                </Button>

                                <Button
                                  type="button"
                                  onClick={async () => {
                                    const templateId = selectedTemplateIds[item.id];
                                    if (!templateId) {
                                      toast.error("Please select a template first");
                                      return;
                                    }
                                    if (!item.cert_ref_no) {
                                      toast.error("Certificate Reference Number is required");
                                      return;
                                    }
                                    
                                    const activeTemp = templates.find(t => t.id === templateId);
                                    let tempFields: any[] = [];
                                    try {
                                      tempFields = JSON.parse(activeTemp.fields);
                                    } catch(e){}

                                    const fieldVals = { ...templateFieldValues[item.id] };
                                    for (const f of tempFields) {
                                      if (!fieldVals[f.key]) {
                                        fieldVals[f.key] = getDefaultFieldValue(f.key) || f.default || "";
                                      }
                                    }

                                    const metadata = {
                                      template_id: templateId,
                                      field_values: fieldVals
                                    };
                                    
                                    const loadingToast = toast.loading("Generating certificate...");
                                    try {
                                      // 1. Create the certificate
                                      const res = await fetch(`${API_BASE_URL}/certificates`, {
                                        method: "POST",
                                        headers: {
                                          "Content-Type": "application/json",
                                          Authorization: `Bearer ${token}`
                                        },
                                        body: JSON.stringify({
                                          inspection_id: selectedInspection.id,
                                          inspection_item_id: item.id,
                                          certificate_no: item.cert_ref_no,
                                          issue_date: item.cert_test_date || new Date().toISOString(),
                                          validity_period: itemValidityPeriods[item.id] || calculateInitialValidity(item.cert_test_date, item.cert_expiry_date),
                                          metadata
                                        })
                                      });

                                      if (!res.ok) {
                                        const error = await res.json();
                                        throw new Error(error.message || "Failed to issue certificate");
                                      }

                                      const cert = await res.json();
                                      toast.dismiss(loadingToast);
                                      toast.success("Certificate issued successfully! Opening preview...");

                                      // 2. Download the certificate PDF
                                      const pdfRes = await fetch(`${API_BASE_URL}/certificates/${cert.id}/pdf`, {
                                        headers: { Authorization: `Bearer ${token}` }
                                      });

                                      if (pdfRes.ok) {
                                        const blob = await pdfRes.blob();
                                        const url = URL.createObjectURL(blob);
                                        setPreviewPdfUrl(url);
                                      }
                                    } catch (err: any) {
                                      toast.dismiss(loadingToast);
                                      toast.error(err.message || "Failed to generate certificate");
                                    }
                                  }}
                                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold h-9 text-xs rounded-xl flex items-center justify-center gap-2 px-4 shadow-sm"
                                >
                                  Generate & Preview Certificate
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {/* Manual Button to Add Observation */}
                      <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={async () => {
                            if (!token || !selectedInspection) return;
                            try {
                              const res = await fetch(`${API_BASE_URL}/inspections/item`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                body: JSON.stringify({
                                  inspection_id: selectedInspection.id,
                                  description: "General Safety Check",
                                  status: 'PENDING',
                                  notes: ''
                                })
                              });
                              if (res.ok) {
                                toast.success("New observation section added!");
                                await fetchSingleInspection(selectedInspection.id);
                              }
                            } catch (err) {
                              toast.error("Failed to add observation section");
                            }
                          }}
                          className="flex-1 rounded-2xl h-11 border-dashed border-blue-500/30 text-blue-600 hover:bg-blue-500/5 font-bold transition-all"
                        >
                          + Issue new certificate
                        </Button>

                        {(selectedInspection?.items || []).some(item => item.cert_template_id && item.cert_ref_no) && (
                          <Button
                            type="button"
                            onClick={async () => {
                              if (!token) return;
                              const loadingToast = toast.loading("Generating combined PDF...");
                              try {
                                const res = await fetch(`${API_BASE_URL}/inspections/${selectedInspection.id}/certificates/download-all`, {
                                  headers: { Authorization: `Bearer ${token}` }
                                });
                                if (res.ok) {
                                  const blob = await res.blob();
                                  const url = URL.createObjectURL(blob);
                                  setPreviewPdfUrl(url);
                                  toast.dismiss(loadingToast);
                                  toast.success("Combined PDF ready!");
                                } else {
                                  toast.dismiss(loadingToast);
                                  toast.error("Failed to generate combined PDF");
                                }
                              } catch (e) {
                                toast.dismiss(loadingToast);
                                toast.error("Failed to generate combined PDF");
                              }
                            }}
                            className="flex-1 rounded-2xl h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-md flex items-center justify-center gap-2"
                          >
                            Preview All Certificates (PDF)
                          </Button>
                        )}
                      </div>
                    </div>
    
                    {/* Removed main site verification photos section as per requirements */}
    
                    {/* Safety Officer Certificate Preparation section has been removed as clients only want item-specific certificates. */}


                    {/* Direct Office Review Actions for Administrators */}
                    {isOfficeUser && selectedInspection.status === 'IN_PROGRESS' && (
                      <div className="p-6 bg-amber-500/5 border border-amber-500/10 rounded-2xl space-y-4 shadow-sm mt-6">
                        <h4 className="font-black text-amber-600 uppercase text-xs tracking-wider">Office Review Actions</h4>
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold">Rejection Feedback (Required only if requesting changes)</Label>
                          <Input
                            placeholder="e.g., Please re-check the sprinkler systems on the 3rd floor..."
                            value={feedbackInput}
                            onChange={(e) => setFeedbackInput(e.target.value)}
                            className="bg-background text-sm h-11"
                          />
                        </div>
                        <div className="flex gap-3 pt-2">
                          <Button 
                            onClick={() => handleRejectInspection(selectedInspection.id)}
                            disabled={submittingReview || !feedbackInput.trim()}
                            className="flex-1 rounded-xl font-bold bg-rose-600 hover:bg-rose-500 text-white h-11 transition-all"
                          >
                            Reject & Request Changes
                          </Button>
                          <Button 
                            onClick={() => handleApproveInspection(selectedInspection.id)}
                            disabled={submittingReview}
                            className="flex-1 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white h-11 transition-all"
                          >
                            Approve & Issue Certificate
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
  
                <DialogFooter className="pt-4 border-t border-border">
                  <Button variant="ghost" onClick={() => setOpenVisit(false)}>Discard</Button>
                  {selectedInspection.status !== 'PENDING_REVIEW' && (() => {
                    const pendingCount = (selectedInspection.items || []).filter(it => it.status === 'PENDING').length;
                    const isAlreadyDone = selectedInspection.status === 'COMPLETED';
                    const isBlocked = pendingCount > 0;
                    return (
                      <Button
                        disabled={isAlreadyDone || isBlocked || submittingReview}
                        onClick={handleSubmitForReview}
                        className={cn(
                          "text-white font-bold h-12 px-10 rounded-xl shadow-lg transition-all",
                          isAlreadyDone
                            ? "bg-muted text-muted-foreground cursor-not-allowed"
                            : isBlocked
                              ? "bg-amber-500/80 shadow-amber-500/20 cursor-not-allowed opacity-80"
                              : "bg-blue-600 hover:bg-blue-500 shadow-blue-500/20"
                        )}
                      >
                        {submittingReview ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : isAlreadyDone ? (
                          "Already Completed"
                        ) : isBlocked ? (
                          `${pendingCount} Item${pendingCount > 1 ? "s" : ""} Pending — Mark All First`
                        ) : selectedInspection.status === "REJECTED" ? (
                          "Re-Submit Certificate Request"
                        ) : (
                          "Submit Certificate Request"
                        )}
                      </Button>
                    );
                  })()}
                </DialogFooter>
              </div>
            )
          )}
        </DialogContent>
      </Dialog>

      {previewPdfUrl && (
        <Dialog open={!!previewPdfUrl} onOpenChange={(open) => { if (!open) setPreviewPdfUrl(null); }}>
          <DialogContent 
            style={{ maxWidth: "96vw", width: "96vw", height: "95vh" }}
            className="flex flex-col p-6 bg-background border border-border rounded-2xl shadow-2xl"
          >
            <DialogHeader className="flex flex-col gap-1 pb-2 border-b border-border/50">
              <DialogTitle className="text-sm font-bold text-foreground">PDF Certificate Preview</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">Preview only mode (downloading restricted)</DialogDescription>
            </DialogHeader>
            <div className="flex-1 w-full overflow-hidden bg-muted/10 rounded-xl relative min-h-[500px]">
              <PdfPreviewer url={previewPdfUrl} />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
