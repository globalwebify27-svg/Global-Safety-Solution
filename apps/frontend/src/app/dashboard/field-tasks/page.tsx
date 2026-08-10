"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth";
import { API_BASE_URL } from "@/lib/config";
import { 
  ClipboardCheck, 
  MapPin, 
  Calendar, 
  ChevronRight,
  Camera,
  Check,
  X,
  AlertCircle,
  Clock,
  CheckCircle2,
  ArrowLeft,
  Upload,
  Download,
  Loader2,
  Eye,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRef } from "react";

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

interface IsolatedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: string;
  onChange: (value: string) => void;
}

const IsolatedInput = ({ value, onChange, ...props }: IsolatedInputProps) => {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleBlur = () => {
    if (localValue !== value) {
      onChange(localValue);
    }
  };

  return (
    <Input
      {...props}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          handleBlur();
        }
      }}
    />
  );
};

interface IsolatedTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'> {
  value: string;
  onChange: (value: string) => void;
}

const IsolatedTextarea = ({ value, onChange, ...props }: IsolatedTextareaProps) => {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleBlur = () => {
    if (localValue !== value) {
      onChange(localValue);
    }
  };

  return (
    <textarea
      {...props}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
    />
  );
};



interface Task {
  id: string;
  status: string;
  scheduled_date: string;
  client: { name: string; city?: string };
  client_id?: string;
  project_id?: string;
  work_order?: {
    work_order_no: string;
    service_product?: {
      name: string;
      checklist: any[];
    }
  };
  items: any[];
  certificates?: any[];
  remarks?: string | null;
  pdf_url?: string | null;
  expenditure?: number | string;
  assigned_staff_id?: string | null;
  expenditures?: any[];
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

export default function FieldTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [view, setView] = useState<'list' | 'details'>('list');
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<Record<string, string>>({});
  const [templateFieldValues, setTemplateFieldValues] = useState<Record<string, Record<string, string>>>({});
  const [itemValidityPeriods, setItemValidityPeriods] = useState<Record<string, string>>({});
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [uploadingItems, setUploadingItems] = useState<Record<string, boolean>>({});

  const getAbsoluteFileUrl = (url: string | null | undefined) => {
    if (!url) return "";
    
    let cleanPath = url.trim();
    
    // Remove wrapping quotes/brackets
    cleanPath = cleanPath.replace(/[\[\]"']/g, '').trim();

    // Check if it already starts with http:// or https://
    if (cleanPath.startsWith("http://") || cleanPath.startsWith("https://")) {
      try {
        const parsedUrl = new URL(cleanPath);
        cleanPath = parsedUrl.pathname + parsedUrl.search;
      } catch (e) {
        // Fallback
      }
    } else {
      // If it contains domain/public/uploads/xxx, find the public/uploads segment
      const idx = cleanPath.indexOf("public/uploads");
      if (idx !== -1) {
        cleanPath = "/" + cleanPath.substring(idx);
      }
    }
    
    if (!cleanPath.startsWith("/")) {
      cleanPath = "/" + cleanPath;
    }
    
    const baseUrl = API_BASE_URL.endsWith("/") ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
    const origin = baseUrl.replace(/\/api$/, "");
    return `${origin}${cleanPath}`;
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
    expiry.setDate(expiry.getDate() - 1);
    
    const expiryDateStr = expiry.toISOString();
    setItemValidityPeriods(prev => ({ ...prev, [itemId]: validity }));
    
    handleUpdateItem(
      itemId,
      item.status,
      item.notes,
      undefined,
      item.scope,
      item.recommendations,
      item.cert_ref_no,
      testDateStr,
      expiryDateStr
    );
  };

  const getDefaultFieldValue = (fieldKey: string) => {
    const key = fieldKey.toLowerCase();
    if (key.includes("occupier") || key.includes("client_name") || key.includes("factory_name")) {
      return (selectedTask?.client as any)?.name || "";
    }
    if (key.includes("address") || key.includes("factory_address")) {
      return (selectedTask?.client as any)?.address || (selectedTask?.client as any)?.city || "";
    }
    if (key.includes("competency") || key.includes("license")) {
      return globalSettings.default_license_no || "";
    }
    return "";
  };
  
  // Certificate drafting states
  const [draftCertType, setDraftCertType] = useState("FIRE_SAFETY");
  const [draftCertValidity, setDraftCertValidity] = useState("1y");
  const [draftCertExpiry, setDraftCertExpiry] = useState("");
  const [draftCertScope, setDraftCertScope] = useState("");
  const [draftCertNotes, setDraftCertNotes] = useState("");
  const [adminFeedback, setAdminFeedback] = useState("");

  // Factories Act 28/29 fields
  const [eqptOccupierName, setEqptOccupierName] = useState("");
  const [eqptFactoryAddress, setEqptFactoryAddress] = useState("");
  const [eqptName, setEqptName] = useState("CHAIN PULLEY BLOCK");
  const [eqptSwl, setEqptSwl] = useState("2 Ton");
  const [eqptLift, setEqptLift] = useState("4 Mtr");
  const [eqptSerialNo, setEqptSerialNo] = useState("RRL/CPB/04");
  const [eqptMfg, setEqptMfg] = useState("11/2023");
  const [eqptChainDia, setEqptChainDia] = useState("6 mm");
  const [eqptHchainDia, setEqptHchainDia] = useState("3 mm");
  const [eqptMfdBy, setEqptMfdBy] = useState("N.A");
  const [eqptLocation, setEqptLocation] = useState("Inside the Plant");

  // Form 34 Stability fields
  const [stabFactoryName, setStabFactoryName] = useState("");
  const [stabLocation, setStabLocation] = useState("MUZAFFARPUR");
  const [stabPostalAddress, setStabPostalAddress] = useState("");
  const [stabOccupierName, setStabOccupierName] = useState("");
  const [stabMfgProcess, setStabMfgProcess] = useState("SNACKS & NAMKEENS");
  const [stabWorkerLayoutRef, setStabWorkerLayoutRef] = useState("As per approved layout (Attached Report)");
  const [stabPlanLetterNo, setStabPlanLetterNo] = useState("153/P");
  const [stabPlanLetterDate, setStabPlanLetterDate] = useState("09.12.2014");

  // Form 8 Pressure Vessel fields
  const [pvOccupierName, setPvOccupierName] = useState("");
  const [pvFactoryAddress, setPvFactoryAddress] = useState("");
  const [pvVesselDesc, setPvVesselDesc] = useState("AIR RECEIVER (VERTICAL)");
  const [pvVesselCapNo, setPvVesselCapNo] = useState("CAP- 550 Ltr, Sr/Id No.- 7806, Loc- Compressor Room- 2");
  const [pvManufacturer, setPvManufacturer] = useState("TALLERES VALSI");
  const [pvProcess, setPvProcess] = useState("For Plant Process.");
  const [pvMfgYear, setPvMfgYear] = useState("25/09/2024");
  const [pvFirstUseDate, setPvFirstUseDate] = useState("2025");
  const [pvWallThickness, setPvWallThickness] = useState("Shell- 16.5mm, 16.6mm, 16.7mm T.Disc-15.2mm, 15.4mm, 15.3mm B.Disc-15.3mm, 15.2mm, 15.1mm");
  const [pvSafePressure, setPvSafePressure] = useState("45 BAR");
  const [pvVesselHistory, setPvVesselHistory] = useState("As reported, the vessels has been working in order since inspection");
  const [pvHydTestByMfg, setPvHydTestByMfg] = useState("Hydraulic Test done by the manufacturer on N.A");
  const [pvExposedWeather, setPvExposedWeather] = useState("Under Shed");
  const [pvExamDetails, setPvExamDetails] = useState("Thorough Physical examination & Ultrasonic test done.");
  const [pvHydTestPressure, setPvHydTestPressure] = useState("N.A");
  const [pvInaccessibleParts, setPvInaccessibleParts] = useState("Internal Surface");
  const [pvVesselCondition, setPvVesselCondition] = useState("External: Good, Internal: Inaccessible.");
  const [pvFittingsProvided, setPvFittingsProvided] = useState("Pressure gauge, Safety Valve & Drain Valve.");
  const [pvFittingsMaintained, setPvFittingsMaintained] = useState("Yes.");
  const [pvRepairsRequired, setPvRepairsRequired] = useState("No major defect affecting the safe working has been observed at the time of examination.");
  const [pvCalculatedSafePressure, setPvCalculatedSafePressure] = useState("45 BAR");
  const [pvRepairsSafePressure, setPvRepairsSafePressure] = useState("N.A");
  const [pvOtherObservations, setPvOtherObservations] = useState("Satisfactory.");

  // Form 8 Pressure/Thermal Safety Valve fields
  const [svOccupierName, setSvOccupierName] = useState("");
  const [svFactoryAddress, setSvFactoryAddress] = useState("");
  const [svValveDesc, setSvValveDesc] = useState("PRESSURE SAFETY VALVE");
  const [svValveCapNo, setSvValveCapNo] = useState("CAP- 14182.0 kg/hr, Id/Sr No.- 201807175, Loc- MLP Shed");
  const [svManufacturer, setSvManufacturer] = useState("Anderson Greenwood Crosby Sanmar Limited.");
  const [svProcess, setSvProcess] = useState("For Plant Process");
  const [svMfgYear, setSvMfgYear] = useState("N.A");
  const [svCommissionDate, setSvCommissionDate] = useState("N.A");
  const [svSetPressure, setSvSetPressure] = useState("58.52 kg/cm²");
  const [svValveHistory, setSvValveHistory] = useState("As reported, the TSV has been working in order since inspection");
  const [svLastHydTest, setSvLastHydTest] = useState("On 11.10.2025 @ 58.52 kg/cm²");
  const [svExposedWeather, setSvExposedWeather] = useState("Under Shed");
  const [svInaccessibleParts, setSvInaccessibleParts] = useState("Internal");
  const [svExamDetails, setSvExamDetails] = useState("Through Physical examination & Hydro test done.");
  const [svFittingsMaintained, setSvFittingsMaintained] = useState("Yes.");
  const [svRepairsRequired, setSvRepairsRequired] = useState("No major defect affecting the set pressure has been observed at the time of examination.");
  const [svRepairsSetPressure, setSvRepairsSetPressure] = useState("N.A");
  const [svOtherObservations, setSvOtherObservations] = useState("Satisfactory.");

  // Shared competency & details
  const [certCompetencyNo, setCertCompetencyNo] = useState("663, dated 11.11.2025, valid upto 10.11.2026");
  const [certCompetentPerson, setCertCompetentPerson] = useState("Aqueel Ahmad");
  const [globalSettings, setGlobalSettings] = useState<Record<string, string>>({});

  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  const parseRemarksData = (remarks?: string | null): any => {
    if (!remarks) return {};
    if (remarks.startsWith("{")) {
      try {
        return JSON.parse(remarks);
      } catch (e) {
        return {};
      }
    }
    return {};
  };

  useEffect(() => {
    if (selectedTask) {
      const oneYearLater = new Date();
      oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
      const defaultExp = oneYearLater.toISOString().split("T")[0];
      setDraftCertExpiry(defaultExp);

      // Pre-fill initial defaults using client values
      const clientName = selectedTask.client.name || "";
      const clientCity = selectedTask.client.city || "";
      setEqptOccupierName(clientName);
      setEqptFactoryAddress(clientCity);
      setStabFactoryName(clientName);
      setStabOccupierName(clientName);
      setStabPostalAddress(clientCity);
      
      setPvOccupierName(clientName);
      setPvFactoryAddress(clientCity);

      setSvOccupierName(clientName);
      setSvFactoryAddress(clientCity);

      if (user?.name) {
        setCertCompetentPerson(user.name);
      }

      const remarksData = parseRemarksData(selectedTask.remarks);
      setAdminFeedback(remarksData.admin_feedback || "");
      setDraftCertType(remarksData.draft_cert_type || "");
      
      if (remarksData.draft_cert_data) {
        try {
          const parsed = typeof remarksData.draft_cert_data === 'string'
            ? JSON.parse(remarksData.draft_cert_data)
            : remarksData.draft_cert_data;
          
          setDraftCertValidity(parsed.validity_period || "1y");
          setDraftCertExpiry(parsed.expiry_date || defaultExp);
          setDraftCertNotes(parsed.remarks || parsed.recommendations || "");
          setDraftCertScope(parsed.scope || "");

          if (parsed.field_values) {
            setTemplateFieldValues(prev => ({
              ...prev,
              "draft": parsed.field_values
            }));
          }

          // Restore Factories Act 28/29 inputs
          if (parsed.eqpt_occupier_name) setEqptOccupierName(parsed.eqpt_occupier_name);
          if (parsed.eqpt_factory_address) setEqptFactoryAddress(parsed.eqpt_factory_address);
          if (parsed.eqpt_name) setEqptName(parsed.eqpt_name);
          if (parsed.eqpt_swl) setEqptSwl(parsed.eqpt_swl);
          if (parsed.eqpt_lift) setEqptLift(parsed.eqpt_lift);
          if (parsed.eqpt_serial_no) setEqptSerialNo(parsed.eqpt_serial_no);
          if (parsed.eqpt_mfg) setEqptMfg(parsed.eqpt_mfg);
          if (parsed.eqpt_chain_dia) setEqptChainDia(parsed.eqpt_chain_dia);
          if (parsed.eqpt_hchain_dia) setEqptHchainDia(parsed.eqpt_hchain_dia);
          if (parsed.eqpt_mfd_by) setEqptMfdBy(parsed.eqpt_mfd_by);
          if (parsed.eqpt_location) setEqptLocation(parsed.eqpt_location);

          // Restore Form 34 Stability inputs
          if (parsed.stab_factory_name) setStabFactoryName(parsed.stab_factory_name);
          if (parsed.stab_location) setStabLocation(parsed.stab_location);
          if (parsed.stab_postal_address) setStabPostalAddress(parsed.stab_postal_address);
          if (parsed.stab_occupier_name) setStabOccupierName(parsed.stab_occupier_name);
          if (parsed.stab_mfg_process) setStabMfgProcess(parsed.stab_mfg_process);
          if (parsed.stab_worker_layout_ref) setStabWorkerLayoutRef(parsed.stab_worker_layout_ref);
          if (parsed.stab_plan_letter_no) setStabPlanLetterNo(parsed.stab_plan_letter_no);
          if (parsed.stab_plan_letter_date) setStabPlanLetterDate(parsed.stab_plan_letter_date);

          // Restore Form 8 Pressure Vessel inputs
          if (parsed.pv_occupier_name) setPvOccupierName(parsed.pv_occupier_name);
          if (parsed.pv_factory_address) setPvFactoryAddress(parsed.pv_factory_address);
          if (parsed.pv_vessel_desc) setPvVesselDesc(parsed.pv_vessel_desc);
          if (parsed.pv_vessel_cap_no) setPvVesselCapNo(parsed.pv_vessel_cap_no);
          if (parsed.pv_manufacturer) setPvManufacturer(parsed.pv_manufacturer);
          if (parsed.pv_process) setPvProcess(parsed.pv_process);
          if (parsed.pv_mfg_year) setPvMfgYear(parsed.pv_mfg_year);
          if (parsed.pv_first_use_date) setPvFirstUseDate(parsed.pv_first_use_date);
          if (parsed.pv_wall_thickness) setPvWallThickness(parsed.pv_wall_thickness);
          if (parsed.pv_safe_pressure) setPvSafePressure(parsed.pv_safe_pressure);
          if (parsed.pv_vessel_history) setPvVesselHistory(parsed.pv_vessel_history);
          if (parsed.pv_hyd_test_by_mfg) setPvHydTestByMfg(parsed.pv_hyd_test_by_mfg);
          if (parsed.pv_exposed_weather) setPvExposedWeather(parsed.pv_exposed_weather);
          if (parsed.pv_exam_details) setPvExamDetails(parsed.pv_exam_details);
          if (parsed.pv_hyd_test_pressure) setPvHydTestPressure(parsed.pv_hyd_test_pressure);
          if (parsed.pv_inaccessible_parts) setPvInaccessibleParts(parsed.pv_inaccessible_parts);
          if (parsed.pv_vessel_condition) setPvVesselCondition(parsed.pv_vessel_condition);
          if (parsed.pv_fittings_provided) setPvFittingsProvided(parsed.pv_fittings_provided);
          if (parsed.pv_fittings_maintained) setPvFittingsMaintained(parsed.pv_fittings_maintained);
          if (parsed.pv_repairs_required) setPvRepairsRequired(parsed.pv_repairs_required);
          if (parsed.pv_calculated_safe_pressure) setPvCalculatedSafePressure(parsed.pv_calculated_safe_pressure);
          if (parsed.pv_repairs_safe_pressure) setPvRepairsSafePressure(parsed.pv_repairs_safe_pressure);
          if (parsed.pv_other_observations) setPvOtherObservations(parsed.pv_other_observations);

          // Restore Form 8 Pressure/Thermal Safety Valve inputs
          if (parsed.sv_occupier_name) setSvOccupierName(parsed.sv_occupier_name);
          if (parsed.sv_factory_address) setSvFactoryAddress(parsed.sv_factory_address);
          if (parsed.sv_valve_desc) setSvValveDesc(parsed.sv_valve_desc);
          if (parsed.sv_valve_cap_no) setSvValveCapNo(parsed.sv_valve_cap_no);
          if (parsed.sv_manufacturer) setSvManufacturer(parsed.sv_manufacturer);
          if (parsed.sv_process) setSvProcess(parsed.sv_process);
          if (parsed.sv_mfg_year) setSvMfgYear(parsed.sv_mfg_year);
          if (parsed.sv_commission_date) setSvCommissionDate(parsed.sv_commission_date);
          if (parsed.sv_set_pressure) setSvSetPressure(parsed.sv_set_pressure);
          if (parsed.sv_valve_history) setSvValveHistory(parsed.sv_valve_history);
          if (parsed.sv_last_hyd_test) setSvLastHydTest(parsed.sv_last_hyd_test);
          if (parsed.sv_exposed_weather) setSvExposedWeather(parsed.sv_exposed_weather);
          if (parsed.sv_inaccessible_parts) setSvInaccessibleParts(parsed.sv_inaccessible_parts);
          if (parsed.sv_exam_details) setSvExamDetails(parsed.sv_exam_details);
          if (parsed.sv_fittings_maintained) setSvFittingsMaintained(parsed.sv_fittings_maintained);
          if (parsed.sv_repairs_required) setSvRepairsRequired(parsed.sv_repairs_required);
          if (parsed.sv_repairs_set_pressure) setSvRepairsSetPressure(parsed.sv_repairs_set_pressure);
          if (parsed.sv_other_observations) setSvOtherObservations(parsed.sv_other_observations);

          // Restore shared competency
          if (parsed.competency_no) setCertCompetencyNo(parsed.competency_no);
          if (parsed.competent_person) setCertCompetentPerson(parsed.competent_person);

        } catch (e) {
          console.error("Error parsing draft cert data", e);
        }
      } else {
        setDraftCertValidity("1y");
        setDraftCertNotes("");
        setDraftCertScope(selectedTask.work_order?.service_product?.name || "");
      }
      // Populate selected template IDs and field values for items
      const tempIds: Record<string, string> = {};
      const fieldVals: Record<string, Record<string, string>> = {};
      (selectedTask.items || []).forEach((item: any) => {
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
  }, [selectedTask?.id]);

  useEffect(() => {
    fetchTasks();
  }, [token]);

  const fetchTasks = async () => {
    if (!token || !user) return;
    setLoading(true);
    try {
      const [tRes, tempRes, sRes] = await Promise.all([
        fetch(`${API_BASE_URL}/inspections/engineer/${user.id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/certificate-templates`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/settings`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      const [tData, tempData, sData] = await Promise.all([tRes.json(), tempRes.json(), sRes.json()]);
      if (sData) {
        setGlobalSettings(sData);
        if (sData.default_license_no) {
          setCertCompetencyNo(sData.default_license_no);
        }
      }
      if (Array.isArray(tData)) {
        setTasks(tData);
      }
      if (Array.isArray(tempData)) {
        setTemplates(tempData);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to sync tasks");
    } finally {
      setLoading(false);
    }
  };

  const refreshSelectedTask = async (taskId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/inspections/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedTask(data);
        setTasks(prev => prev.map(t => t.id === taskId ? data : t));
      }
    } catch (e) {}
  };

  const handleGenerateAllCertificates = async () => {
    if (!token || !selectedTask || !selectedTask.items) return;

    const existingCertList = selectedTask.certificates || [];
    
    // Filter items that do NOT have a certificate generated yet
    const ungeneratedItems = selectedTask.items.filter((item: any) => {
      const alreadyGenerated = existingCertList.some(
        (c: any) => c.inspection_item_id === item.id || (item.cert_ref_no && c.certificate_no === item.cert_ref_no)
      );
      return !alreadyGenerated;
    });

    if (ungeneratedItems.length === 0) {
      toast.info("All equipment certificates have already been generated and saved to Compliance & Digital Vault!");
      return;
    }

    const loadingToast = toast.loading(`Generating certificates for ${ungeneratedItems.length} equipment section(s)...`);
    let successCount = 0;
    let failCount = 0;

    for (const item of ungeneratedItems) {
      try {
        const templateId = selectedTemplateIds[item.id] || (templates.length > 0 ? templates[0].id : null);
        const certRefNo = item.cert_ref_no || `GSS/${item.id.substring(0, 4).toUpperCase()}/${new Date().getFullYear()}`;

        let tempFields: any[] = [];
        if (templateId) {
          const activeTemp = templates.find((t: any) => t.id === templateId);
          if (activeTemp?.fields) {
            try { tempFields = JSON.parse(activeTemp.fields); } catch (e) {}
          }
        }

        const fieldVals = { ...(templateFieldValues[item.id] || {}) };
        for (const f of tempFields) {
          if (!fieldVals[f.key]) {
            fieldVals[f.key] = getDefaultFieldValue(f.key) || f.default || "";
          }
        }

        const metadata = {
          template_id: templateId,
          field_values: fieldVals
        };

        const res = await fetch(`${API_BASE_URL}/certificates`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            inspection_id: selectedTask.id,
            inspection_item_id: item.id,
            certificate_no: certRefNo,
            issue_date: item.cert_test_date || new Date().toISOString(),
            validity_period: itemValidityPeriods[item.id] || calculateInitialValidity(item.cert_test_date, item.cert_expiry_date),
            metadata
          })
        });

        if (res.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (err) {
        failCount++;
      }
    }

    toast.dismiss(loadingToast);
    await refreshSelectedTask(selectedTask.id);

    const alreadyCount = selectedTask.items.length - ungeneratedItems.length;
    if (successCount > 0) {
      toast.success(
        `Successfully generated ${successCount} new certificate(s) and saved to Compliance & Digital Vault!` +
        (alreadyCount > 0 ? ` (${alreadyCount} equipment section(s) were already generated)` : "")
      );
    } else if (failCount > 0) {
      toast.error("Failed to generate some certificates. Please check template details.");
    }
  };

  const updateExpenditures = async (expendituresList: any[]) => {
    if (!selectedTask || !token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/inspections/${selectedTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ expenditures: expendituresList })
      });
      if (res.ok) {
        toast.success("Expenditures updated successfully!");
        await refreshSelectedTask(selectedTask.id);
      } else {
        const err = await res.json();
        toast.error(err.message || "Failed to update expenditures");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to update expenditures");
    }
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

  const handleUpdateItem = async (
    itemId: string,
    status: string,
    notes?: string,
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
        if (selectedTask) {
          const updatedItems = selectedTask.items.map(item => {
            if (item.id === itemId) {
              const updatedItem = { ...item, status: status as any };
              if (notes !== undefined) updatedItem.notes = notes;
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
          setSelectedTask({ ...selectedTask, items: updatedItems });
        }
      }
    } catch (e) {
      toast.error("Failed to update item");
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
        if (selectedTask) {
          const refRes = await fetch(`${API_BASE_URL}/inspections/${selectedTask.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (refRes.ok) {
            const updatedData = await refRes.json();
            setSelectedTask(updatedData);
          }
        }
      }
    } catch (err) {
      toast.error("Failed to remove observation section");
    }
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
    if (files.length === 0 || !token || !selectedTask) return;
    
    // Convert FileList to a static Array immediately to avoid losing files on input reset
    const filesArray = Array.from(files);
    
    // Set item uploading state to true to show loading and prevent double submission
    setUploadingItems(prev => ({ ...prev, [itemId]: true }));

    try {
      const uploadedUrls: string[] = [];
      let skippedCount = 0;

      for (let i = 0; i < filesArray.length; i++) {
        const file = filesArray[i];
        
        // 1. Size check: Max 10MB per file
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
          toast.error(`File "${file.name}" exceeds maximum allowed limit of 10MB.`);
          skippedCount++;
          continue;
        }

        // 2. Format check: Only images
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (!['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
          toast.error(`File "${file.name}" has an invalid format. Only image files (JPG, PNG, GIF, WEBP) are allowed.`);
          skippedCount++;
          continue;
        }

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
        formData.append('name', `Item Photo - ${selectedTask.client?.name || 'Inspection'} - Item ${itemId}`);
        formData.append('category', 'OTHER');
        if (selectedTask.client_id) {
          formData.append('client_id', selectedTask.client_id);
        }
        
        const res = await fetch(`${API_BASE_URL}/documents`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        });
        if (res.ok) {
          const data = await res.json();
          uploadedUrls.push(data.file_url);
        } else {
          toast.error(`Failed to upload image "${file.name}".`);
          skippedCount++;
        }
      }

      if (uploadedUrls.length > 0) {
        const currentItem = selectedTask.items.find(it => it.id === itemId);
        const existingUrls = currentItem?.photo_url ? parseItemPhotos(currentItem.photo_url) : [];
        const newUrls = [...existingUrls, ...uploadedUrls];
        await handleUpdateItem(itemId, currentItem?.status || 'PENDING', currentItem?.notes || '', JSON.stringify(newUrls));
        
        if (skippedCount > 0) {
          toast.success(`Uploaded ${uploadedUrls.length} photo(s). ${skippedCount} file(s) failed or skipped.`);
        } else {
          toast.success("All photos uploaded successfully!");
        }
      } else if (skippedCount > 0) {
        toast.error("No valid photos were uploaded.");
      }
    } catch (err) {
      toast.error("Failed to upload photo");
    } finally {
      setUploadingItems(prev => ({ ...prev, [itemId]: false }));
    }
  };

  const handleCompleteAudit = async () => {
    if (!token || !selectedTask) return;
    
    setLoading(true);
    try {
      // Get location
      let lat = null;
      let lng = null;
      
      try {
        const pos: any = await new Promise((res, rej) => {
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 });
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch (err) {
        console.warn("Location access denied or timeout");
      }

      // Package draft certificate details cleanly inside the remarks text column as a JSON string
      const draftData = {
        validity_period: draftCertValidity,
        expiry_date: draftCertExpiry,
        scope: draftCertScope,
        remarks: draftCertNotes,
        field_values: templateFieldValues["draft"] || {},
        
        // Factories Act 28/29 fields
        eqpt_occupier_name: eqptOccupierName,
        eqpt_factory_address: eqptFactoryAddress,
        eqpt_name: eqptName,
        eqpt_swl: eqptSwl,
        eqpt_lift: eqptLift,
        eqpt_serial_no: eqptSerialNo,
        eqpt_mfg: eqptMfg,
        eqpt_chain_dia: eqptChainDia,
        eqpt_hchain_dia: eqptHchainDia,
        eqpt_mfd_by: eqptMfdBy,
        eqpt_location: eqptLocation,

        // Form 34 Stability fields
        stab_factory_name: stabFactoryName,
        stab_location: stabLocation,
        stab_postal_address: stabPostalAddress,
        stab_occupier_name: stabOccupierName,
        stab_mfg_process: stabMfgProcess,
        stab_worker_layout_ref: stabWorkerLayoutRef,
        stab_plan_letter_no: stabPlanLetterNo,
        stab_plan_letter_date: stabPlanLetterDate,

        // Form 8 Pressure Vessel fields
        pv_occupier_name: pvOccupierName,
        pv_factory_address: pvFactoryAddress,
        pv_vessel_desc: pvVesselDesc,
        pv_vessel_cap_no: pvVesselCapNo,
        pv_manufacturer: pvManufacturer,
        pv_process: pvProcess,
        pv_mfg_year: pvMfgYear,
        pv_first_use_date: pvFirstUseDate,
        pv_wall_thickness: pvWallThickness,
        pv_safe_pressure: pvSafePressure,
        pv_vessel_history: pvVesselHistory,
        pv_hyd_test_by_mfg: pvHydTestByMfg,
        pv_exposed_weather: pvExposedWeather,
        pv_exam_details: pvExamDetails,
        pv_hyd_test_pressure: pvHydTestPressure,
        pv_inaccessible_parts: pvInaccessibleParts,
        pv_vessel_condition: pvVesselCondition,
        pv_fittings_provided: pvFittingsProvided,
        pv_fittings_maintained: pvFittingsMaintained,
        pv_repairs_required: pvRepairsRequired,
        pv_calculated_safe_pressure: pvCalculatedSafePressure,
        pv_repairs_safe_pressure: pvRepairsSafePressure,
        pv_other_observations: pvOtherObservations,

        // Form 8 Pressure/Thermal Safety Valve fields
        sv_occupier_name: svOccupierName,
        sv_factory_address: svFactoryAddress,
        sv_valve_desc: svValveDesc,
        sv_valve_cap_no: svValveCapNo,
        sv_manufacturer: svManufacturer,
        sv_process: svProcess,
        sv_mfg_year: svMfgYear,
        sv_commission_date: svCommissionDate,
        sv_set_pressure: svSetPressure,
        sv_valve_history: svValveHistory,
        sv_last_hyd_test: svLastHydTest,
        sv_exposed_weather: svExposedWeather,
        sv_inaccessible_parts: svInaccessibleParts,
        sv_exam_details: svExamDetails,
        sv_fittings_maintained: svFittingsMaintained,
        sv_repairs_required: svRepairsRequired,
        sv_repairs_set_pressure: svRepairsSetPressure,
        sv_other_observations: svOtherObservations,

        // Shared competency
        competency_no: certCompetencyNo,
        competent_person: certCompetentPerson
      };

      const remarksJson = {
        draft_cert_type: draftCertType,
        draft_cert_data: draftData,
        admin_feedback: "" // Clear feedback on submission
      };

      const res = await fetch(`${API_BASE_URL}/inspections/${selectedTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ 
          status: 'IN_PROGRESS', 
          completed_date: new Date().toISOString(),
          remarks: JSON.stringify(remarksJson),
          lat,
          lng
        })
      });

      if (res.ok) {
        toast.success("Inspection submitted for Office Review successfully!");
        setView('list');
        fetchTasks();
      }
    } catch (e) {
      toast.error("Failed to submit inspection request");
    } finally {
      setLoading(false);
    }
  };

  if (view === 'details' && selectedTask) {
    return (
      <div className="flex flex-col h-[calc(100vh-120px)] md:h-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-start md:items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" className="rounded-full mt-1 md:mt-0 hover:bg-accent/10 transition-colors shrink-0" onClick={() => setView('list')}>
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div className="space-y-0.5 min-w-0">
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-foreground leading-tight break-words">
              {selectedTask.client.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-muted-foreground">
                Inspection Details
              </h2>
              {selectedTask.work_order?.work_order_no && (
                <>
                  <span className="text-xs text-muted-foreground/40">•</span>
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20">
                    WO: {selectedTask.work_order.work_order_no}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto pb-20">
          {/* Rejection Alert Box */}
          {selectedTask.status === 'REJECTED' && adminFeedback && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-5 flex items-start gap-4 animate-bounce">
              <AlertCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-bold text-rose-900 dark:text-rose-400">Corrective Action Required</h4>
                <p className="text-sm text-rose-800/80 dark:text-rose-300">{adminFeedback}</p>
              </div>
            </div>
          )}

          <div className="bg-card border border-border rounded-3xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Work Order</span>
              <span className="text-sm font-bold text-blue-600">{selectedTask.work_order?.work_order_no || "N/A"}</span>
            </div>
            <h2 className="text-xl font-bold">{selectedTask.work_order?.service_product?.name || "Safety Audit"}</h2>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {selectedTask.client.city || "On-site"}</span>
              <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {new Date(selectedTask.scheduled_date).toLocaleDateString()}</span>
            </div>
          </div>

          {selectedTask.pdf_url && (
            <div className="bg-card border border-border rounded-3xl p-6 flex items-center justify-between shadow-sm">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">Attached Inspection PDF</span>
                <span className="text-sm text-foreground/80 font-semibold">Reference document for visit</span>
              </div>
              <Button
                type="button"
                onClick={() => setPreviewPdfUrl(getAbsoluteFileUrl(selectedTask.pdf_url))}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600/10 text-blue-600 border border-blue-600/20 rounded-xl text-xs font-bold hover:bg-blue-600 hover:text-white transition-all active:scale-95"
              >
                <Eye className="w-4 h-4" /> Preview PDF
              </Button>
            </div>
          )}

          <div className="bg-card border border-border rounded-3xl p-6 space-y-4 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Total Expenditure (₹)</label>
                <input
                  type="text"
                  readOnly
                  value={
                    selectedTask.expenditures && selectedTask.expenditures.length > 0
                      ? (selectedTask.expenditures || []).reduce((acc: number, curr: any) => acc + Number(curr.amount), 0).toFixed(2)
                      : Number(selectedTask.expenditure || 0).toFixed(2)
                  }
                  className="w-full h-10 px-3 bg-muted border border-border rounded-xl text-xs font-semibold focus:outline-none cursor-not-allowed text-muted-foreground"
                />
              </div>
            </div>

            {/* Itemized Expenditures List & Adder */}
            <div className="pt-4 border-t border-border/50 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Itemized Expenditures Breakdown</h4>
                <span className="text-[10px] text-muted-foreground font-bold">Total Entries: {(selectedTask.expenditures || []).length}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Expenditures List */}
                <div className="md:col-span-2 space-y-2 max-h-[140px] overflow-y-auto pr-1">
                  {(selectedTask.expenditures || []).map((exp: any, idx: number) => (
                    <div key={exp.id || idx} className="flex items-center justify-between p-2.5 bg-background border border-border/85 rounded-xl text-xs shadow-sm hover:border-border transition-all">
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
                            const updatedExp = (selectedTask.expenditures || []).filter((_: any, i: number) => i !== idx).map((e: any) => ({
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
                  {(selectedTask.expenditures || []).length === 0 && (
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
                      className="w-full h-8 px-2.5 bg-background border border-border rounded-lg text-xs font-semibold focus:outline-none text-foreground"
                    />
                    <input
                      type="text"
                      id="new_exp_note"
                      placeholder="Note (e.g. Stay, Travel)"
                      className="w-full h-8 px-2.5 bg-background border border-border rounded-lg text-xs font-semibold focus:outline-none text-foreground"
                    />
                    <input
                      type="number"
                      id="new_exp_amount"
                      placeholder="Amount (₹)"
                      className="w-full h-8 px-2.5 bg-background border border-border rounded-lg text-xs font-semibold focus:outline-none text-foreground"
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
                        ...(selectedTask.expenditures || []).map((e: any) => ({
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
          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground px-2">Checklist Items</h3>
            {(selectedTask?.items || []).map((item, index) => (
              <div key={item.id} className="p-5 bg-card border border-border rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-foreground">Equipment {index + 1}</span>
                    {(() => {
                      const certs = selectedTask?.certificates || [];
                      const isGenerated = certs.some((c: any) => {
                        if (!c) return false;
                        if (c.inspection_item_id && c.inspection_item_id === item.id) return true;
                        if (item.cert_ref_no && c.certificate_no) {
                          const cleanRef = item.cert_ref_no.trim().toLowerCase();
                          const cleanCertNo = c.certificate_no.trim().toLowerCase();
                          if (cleanRef && cleanCertNo && (cleanRef === cleanCertNo || cleanCertNo.includes(cleanRef) || cleanRef.includes(cleanCertNo))) {
                            return true;
                          }
                        }
                        return false;
                      });

                      return isGenerated ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1 shadow-sm">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Certificate Issued & Saved in Vault
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20">
                          Pending Generation
                        </span>
                      );
                    })()}
                  </div>
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
                            handleUpdateItem(item.id, item.status, item.notes, undefined, item.scope, item.recommendations, item.cert_ref_no, item.cert_test_date, item.cert_expiry_date, item.cert_competency_no, newTempId);
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
                          onBlur={(e) => handleUpdateItem(item.id, item.status, item.notes, undefined, item.scope, item.recommendations, e.target.value)}
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-muted-foreground uppercase">License / Competency No.</Label>
                        <Input 
                          placeholder="e.g. 663, valid upto 10.11.2026" 
                          className="bg-background h-9 text-xs"
                          defaultValue={item.cert_competency_no || globalSettings.default_license_no || certCompetencyNo || ""}
                          onBlur={(e) => handleUpdateItem(item.id, item.status, item.notes, undefined, item.scope, item.recommendations, item.cert_ref_no, undefined, undefined, e.target.value)}
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
                                    handleUpdateItem(item.id, item.status, item.notes, undefined, item.scope, item.recommendations, item.cert_ref_no, item.cert_test_date, item.cert_expiry_date, item.cert_competency_no, selectedTemplateIds[item.id], JSON.stringify(updatedVals));
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
                          handleUpdateItem(item.id, item.status, item.notes, undefined, e.target.value, item.recommendations);
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
                              src={getAbsoluteFileUrl(url)} 
                              alt={`Item photo ${index + 1}`} 
                              className="w-full h-full object-cover transition-all duration-300 group-hover:scale-110 cursor-pointer" 
                              onClick={() => openImageInNewTab(getAbsoluteFileUrl(url))}
                            />
                            <button
                              type="button"
                              onClick={async () => {
                                const remaining = parseItemPhotos(item.photo_url).filter((_, idx) => idx !== index);
                                await handleUpdateItem(item.id, item.status, item.notes, remaining.length > 0 ? JSON.stringify(remaining) : "");
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
                      <input 
                        type="file" 
                        id={`item-camera-${item.id}`}
                        onChange={(e) => {
                          if (e.target.files) {
                            handleItemPhotoUpload(item.id, e.target.files);
                            e.target.value = "";
                          }
                        }}
                        accept="image/*" 
                        capture="environment"
                        className="hidden" 
                      />
                      <Button 
                        type="button"
                        variant="outline" 
                        size="sm"
                        disabled={uploadingItems[item.id]}
                        onClick={() => document.getElementById(`item-camera-${item.id}`)?.click()}
                        className="rounded-xl h-9 border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/10 font-bold text-xs disabled:opacity-50"
                      >
                        {uploadingItems[item.id] ? (
                          <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Working...</>
                        ) : (
                          <><Camera className="w-3.5 h-3.5 mr-1" /> Take Photo</>
                        )}
                      </Button>
                      <Button 
                        type="button"
                        variant="outline" 
                        size="sm"
                        disabled={uploadingItems[item.id]}
                        onClick={() => document.getElementById(`item-file-${item.id}`)?.click()}
                        className="rounded-xl h-9 border-blue-500/20 text-blue-600 hover:bg-blue-500/10 font-bold text-xs disabled:opacity-50"
                      >
                        {uploadingItems[item.id] ? (
                          <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Uploading...</>
                        ) : (
                          <><Upload className="w-3.5 h-3.5 mr-1" /> Upload Photo</>
                        )}
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
                                inspection_id: selectedTask.id,
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
                            toast.success("Certificate generated and saved to Compliance & Digital Vault!");
                            await refreshSelectedTask(selectedTask.id);
                          } catch (err: any) {
                            toast.dismiss(loadingToast);
                            toast.error(err.message || "Failed to generate certificate");
                          }
                        }}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-bold h-9 text-xs rounded-xl flex items-center justify-center gap-2 px-4 shadow-sm"
                      >
                        Generate Certificate
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Manual Button to Add Observation & Combined preview */}
            <div className="flex gap-4 items-center pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  if (!token || !selectedTask) return;
                  try {
                    const res = await fetch(`${API_BASE_URL}/inspections/item`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                      body: JSON.stringify({
                        inspection_id: selectedTask.id,
                        description: "General Safety Check",
                        status: 'PENDING',
                        notes: ''
                      })
                    });
                    if (res.ok) {
                      toast.success("New observation section added!");
                      await refreshSelectedTask(selectedTask.id);
                    }
                  } catch (err) {
                    toast.error("Failed to add observation section");
                  }
                }}
                className="flex-1 rounded-2xl h-11 border-dashed border-blue-500/30 text-blue-600 hover:bg-blue-500/5 font-bold transition-all"
              >
                + Issue new certificate
              </Button>

              {(selectedTask?.items || []).length > 0 && (
                <Button
                  type="button"
                  onClick={handleGenerateAllCertificates}
                  className="flex-1 rounded-2xl h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" /> Generate All Certificates
                </Button>
              )}
            </div>
          </div>


          {/* Certificate Generation & Details Form */}
          {(() => {
            const roleName = user?.roles?.[0]?.role?.name || (() => {
              const designation = (user?.designation || "").toUpperCase();
              if (designation.includes("HR")) return "HR_MANAGER";
              if (designation.includes("FIELD") || designation.includes("ENGINEER")) return "FIELD_ENGINEER";
              if (designation.includes("SALES")) return "SALES_EXECUTIVE";
              if (designation.includes("CLIENT")) return "CLIENT";
              return "STAFF";
            })();

            if (roleName === "CLIENT") return null;

            {/* Prepare Draft Certificate section has been removed as clients only want item-specific certificates. */}

          })()}
        </div>

        <div className="fixed bottom-6 left-6 right-6 lg:static lg:mt-8">
          {selectedTask.status === 'COMPLETED' ? (
            <Button 
              onClick={async () => {
                if (!token) return;
                try {
                  toast.loading("Generating safety certificate PDF...");
                  const response = await fetch(`${API_BASE_URL}/inspections/${selectedTask.id}/certificate`, {
                    headers: { Authorization: `Bearer ${token}` }
                  });
                  if (response.ok) {
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `safety-certificate-${selectedTask.id.substring(0, 8)}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    toast.dismiss();
                    toast.success("Certificate downloaded successfully!");
                  } else {
                    toast.dismiss();
                    toast.error("Failed to generate certificate PDF");
                  }
                } catch (e) {
                  toast.dismiss();
                  toast.error("Download failed");
                }
              }}
              className="w-full h-14 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-lg rounded-2xl shadow-2xl shadow-emerald-500/30 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-6 h-6" /> Download Safety Certificate PDF
            </Button>
          ) : selectedTask.status === 'PENDING_REVIEW' ? (
            <Button 
              disabled
              className="w-full h-14 bg-amber-500/20 border border-amber-500/30 text-amber-600 font-black text-lg rounded-2xl cursor-not-allowed"
            >
              ⏳ Pending Office Review
            </Button>
          ) : (
            <Button 
              onClick={handleCompleteAudit}
              disabled={loading}
              className="w-full h-14 bg-blue-600 hover:bg-blue-500 text-white font-black text-lg rounded-2xl shadow-2xl shadow-blue-500/30 transition-all active:scale-95"
            >
              {loading ? "Submitting..." : "Submit Safety Certificate Request"}
            </Button>
          )}
        </div>

        {previewPdfUrl && (
          <Dialog open={!!previewPdfUrl} onOpenChange={(open) => !open && setPreviewPdfUrl(null)}>
            <DialogContent 
              style={{ maxWidth: "96vw", width: "96vw", height: "95vh" }}
              className="p-0 bg-slate-900 border-slate-800 flex flex-col overflow-hidden rounded-2xl shadow-2xl"
            >
              <DialogHeader className="p-5 border-b border-slate-800 flex flex-row items-center justify-between shrink-0 bg-slate-950/80 backdrop-blur">
                <div>
                  <DialogTitle className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Eye className="w-5 h-5 text-blue-500" /> Secure Document Viewer
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-400 font-medium">
                    Authorised Personnel Only. Saving, printing, and downloading have been disabled.
                  </DialogDescription>
                </div>
              </DialogHeader>
              <div className="flex-1 min-h-0 bg-slate-950 overflow-hidden relative">
                <PdfPreviewer url={previewPdfUrl} />
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="space-y-1">
        <h1 className="text-4xl font-black tracking-tight text-foreground">
          Field Tasks
        </h1>
        <p className="text-muted-foreground font-medium flex items-center gap-2">
          <Clock className="w-4 h-4" /> {tasks.filter(t => t.status !== 'COMPLETED').length} Active Assignments
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="h-64 bg-card/50 border border-border rounded-3xl animate-pulse" />
          ))
        ) : tasks.length === 0 ? (
          <div className="col-span-full py-20 text-center space-y-4">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto">
              <ClipboardCheck className="w-10 h-10 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground font-bold">No tasks assigned to you yet.</p>
          </div>
        ) : (
          tasks.map((task) => (
            <div 
              key={task.id} 
              onClick={() => {
                setSelectedTask(task);
                setView('details');
              }}
              className="group bg-card hover:bg-muted/20 border border-border rounded-[2rem] p-6 transition-all duration-300 cursor-pointer shadow-sm hover:shadow-xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 flex gap-2">
                {task.assigned_staff_id === user?.id && (
                  <div className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter bg-purple-500/10 text-purple-600 ring-1 ring-purple-500/20 shadow-sm">
                    Data Entry Assist
                  </div>
                )}
                <div className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ring-1", 
                  task.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-600 ring-emerald-500/20' :
                  task.status === 'PENDING_REVIEW' ? 'bg-amber-500/10 text-amber-600 ring-amber-500/20' :
                  task.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-600 ring-rose-500/20' :
                  'bg-blue-500/10 text-blue-600 ring-blue-500/20'
                )}>
                  {task.status.replace('_', ' ')}
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Client</p>
                  <h3 className="text-xl font-bold group-hover:text-blue-600 transition-colors">{task.client.name}</h3>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Scope</p>
                  <p className="font-semibold text-foreground/80">{task.work_order?.service_product?.name || "Safety Inspection"}</p>
                </div>

                <div className="pt-4 border-t border-border flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5" /> {task.client.city || "Site"}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5" /> {new Date(task.scheduled_date).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
                    <ChevronRight className="w-6 h-6" />
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-6 flex items-start gap-4">
        <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-bold text-amber-900">Safety Protocol Reminder</h4>
          <p className="text-sm text-amber-800/80">Always ensure all personal protective equipment (PPE) is worn before starting an on-site audit. Your GPS location is verified for each submission.</p>
        </div>
      </div>

      {previewPdfUrl && (
        <Dialog open={!!previewPdfUrl} onOpenChange={(open) => !open && setPreviewPdfUrl(null)}>
          <DialogContent 
            style={{ maxWidth: "96vw", width: "96vw", height: "95vh" }}
            className="p-0 bg-slate-900 border-slate-800 flex flex-col overflow-hidden rounded-2xl shadow-2xl"
          >
            <DialogHeader className="p-5 border-b border-slate-800 flex flex-row items-center justify-between shrink-0 bg-slate-950/80 backdrop-blur">
              <div>
                <DialogTitle className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Eye className="w-5 h-5 text-blue-500" /> Secure Document Viewer
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400 font-medium">
                  Authorised Personnel Only. Saving, printing, and downloading have been disabled.
                </DialogDescription>
              </div>
            </DialogHeader>
            <div className="flex-1 min-h-0 bg-slate-950 overflow-hidden relative">
              <PdfPreviewer url={previewPdfUrl} />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
