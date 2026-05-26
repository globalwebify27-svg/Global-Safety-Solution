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
  ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Task {
  id: string;
  status: string;
  scheduled_date: string;
  client: { name: string; city?: string };
  work_order?: {
    work_order_no: string;
    service_product?: {
      name: string;
      checklist: any[];
    }
  };
  items: any[];
  remarks?: string | null;
}

export default function FieldTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [view, setView] = useState<'list' | 'details'>('list');
  
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
      setDraftCertType(remarksData.draft_cert_type || "FIRE_SAFETY");
      
      if (remarksData.draft_cert_data) {
        try {
          const parsed = typeof remarksData.draft_cert_data === 'string'
            ? JSON.parse(remarksData.draft_cert_data)
            : remarksData.draft_cert_data;
          
          setDraftCertValidity(parsed.validity_period || "1y");
          setDraftCertExpiry(parsed.expiry_date || defaultExp);
          setDraftCertNotes(parsed.remarks || parsed.recommendations || "");
          setDraftCertScope(parsed.scope || "");

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
    }
  }, [selectedTask?.id]);

  useEffect(() => {
    fetchTasks();
  }, [token]);

  const fetchTasks = async () => {
    if (!token || !user) return;
    setLoading(true);
    try {
      // Backend has findByEngineer endpoint
      const res = await fetch(`${API_BASE_URL}/inspections/engineer/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setTasks(data);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to sync tasks");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateItem = async (itemId: string, status: string, notes?: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/inspections/item/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, notes })
      });
      if (res.ok) {
        if (selectedTask) {
          const updatedItems = selectedTask.items.map(item => 
            item.id === itemId ? { ...item, status, notes } : item
          );
          setSelectedTask({ ...selectedTask, items: updatedItems });
        }
      }
    } catch (e) {
      toast.error("Failed to update item");
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
          status: 'PENDING_REVIEW', 
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
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setView('list')}>
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div>
            <h1 className="text-2xl font-black text-foreground">Inspection Details</h1>
            <p className="text-sm text-muted-foreground">{selectedTask.client.name}</p>
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

          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground px-2">Checklist Items</h3>
            {selectedTask.items.map((item, idx) => (
              <div key={item.id} className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <span className="font-bold leading-tight">{idx + 1}. {item.description}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button 
                      size="sm" 
                      variant={item.status === 'PASS' ? 'default' : 'outline'} 
                      className={cn("w-10 h-10 rounded-xl", item.status === 'PASS' && "bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-500/20")}
                      onClick={() => handleUpdateItem(item.id, 'PASS')}
                    >
                      <Check className="w-5 h-5" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant={item.status === 'FAIL' ? 'destructive' : 'outline'} 
                      className={cn("w-10 h-10 rounded-xl", item.status === 'FAIL' && "shadow-lg shadow-destructive/20")}
                      onClick={() => handleUpdateItem(item.id, 'FAIL')}
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
                <Input 
                  placeholder="Observations / Notes..." 
                  className="bg-muted/30 border-none rounded-xl h-12"
                  value={item.notes || ""}
                  onChange={(e) => handleUpdateItem(item.id, item.status, e.target.value)}
                />
              </div>
            ))}
          </div>

          <div className="bg-blue-600/5 border border-blue-600/10 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-600">
              <Camera className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold italic">Capture Site Evidence</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-tight">Geo-tagged photos required for certification</p>
            </div>
            <Button variant="outline" className="rounded-xl border-blue-600/20 text-blue-600 font-bold">
              Snap
            </Button>
          </div>

          {/* Certificate Generation & Details Form */}
          {selectedTask.status !== 'COMPLETED' && selectedTask.status !== 'PENDING_REVIEW' && (
            <div className="bg-card border border-border rounded-3xl p-6 space-y-6 shadow-sm">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-blue-600" /> Prepare Draft Certificate
                </h3>
                <p className="text-xs text-muted-foreground">Select a certificate template and fill out safety observations for office review.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 col-span-full">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Certificate Template</label>
                  <select 
                    value={draftCertType}
                    onChange={(e) => {
                      setDraftCertType(e.target.value);
                      if (e.target.value === 'FORM_34_STABILITY') {
                        setDraftCertValidity("3y");
                        const threeYearsLater = new Date();
                        threeYearsLater.setFullYear(threeYearsLater.getFullYear() + 3);
                        setDraftCertExpiry(threeYearsLater.toISOString().split("T")[0]);
                      } else {
                        setDraftCertValidity("1y");
                        const oneYearLater = new Date();
                        oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
                        setDraftCertExpiry(oneYearLater.toISOString().split("T")[0]);
                      }
                    }}
                    className="w-full h-11 px-4 bg-muted/30 border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="FIRE_SAFETY">🔥 Fire Safety Compliance Certificate</option>
                    <option value="ELECTRICAL_SAFETY">⚡ Electrical Safety Audit Certificate</option>
                    <option value="STRUCTURAL_SAFETY">🏗️ Construction & Structural Safety Certificate</option>
                    <option value="FACTORIES_ACT_28_29">⛓️ Factories Act Sec 28/29: Lifting Tackle / Chain Pulley Block</option>
                    <option value="FORM_34_STABILITY">🏢 Factories Act Form 34: Certificate of Stability</option>
                    <option value="FORM_8_PRESSURE_VESSEL">💨 Factories Act Form 8: Pressure Vessel Exam Report</option>
                    <option value="FORM_8_SAFETY_VALVE">🌡️ Factories Act Form 8: Pressure/Thermal Safety Valve Report</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Validity Period</label>
                  <select 
                    value={draftCertValidity}
                    onChange={(e) => {
                      setDraftCertValidity(e.target.value);
                      const oneYearLater = new Date();
                      if (e.target.value === '3y') {
                        oneYearLater.setFullYear(oneYearLater.getFullYear() + 3);
                      } else {
                        oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
                      }
                      setDraftCertExpiry(oneYearLater.toISOString().split("T")[0]);
                    }}
                    className="w-full h-11 px-4 bg-muted/30 border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="1y">1 Year (Standard)</option>
                    <option value="3y">3 Years (Stability Standard)</option>
                    <option value="One-Time">One-Time Certificate</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Expiry Date</label>
                  <Input 
                    type="date"
                    value={draftCertExpiry}
                    onChange={(e) => setDraftCertExpiry(e.target.value)}
                    className="h-11 bg-muted/30 border-border rounded-xl"
                  />
                </div>
              </div>

              {/* DYNAMIC FORM FIELDS: FACTORIES ACT SECTION 28/29 */}
              {draftCertType === 'FACTORIES_ACT_28_29' && (
                <div className="space-y-4 border-t border-border pt-4 animate-in fade-in slide-in-from-top-4 duration-300">
                  <h4 className="text-sm font-black text-blue-600 uppercase tracking-widest">Factories Act Sec 28/29 Equipment Specifications</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 col-span-full">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Name of the Occupier of the Factory</label>
                      <Input value={eqptOccupierName} onChange={(e) => setEqptOccupierName(e.target.value)} className="h-11 bg-muted/30 border-border rounded-xl" />
                    </div>
                    <div className="space-y-2 col-span-full">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Address of the Factory</label>
                      <textarea value={eqptFactoryAddress} onChange={(e) => setEqptFactoryAddress(e.target.value)} className="w-full p-3 bg-muted/30 border border-border rounded-xl text-sm min-h-[60px]" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Equipment Name / Description</label>
                      <Input value={eqptName} onChange={(e) => setEqptName(e.target.value)} className="h-11 bg-muted/30 border-border rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Safe Working Load (Cap/S.W.L)</label>
                      <Input value={eqptSwl} onChange={(e) => setEqptSwl(e.target.value)} className="h-11 bg-muted/30 border-border rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Lift Capacity (Meters)</label>
                      <Input value={eqptLift} onChange={(e) => setEqptLift(e.target.value)} className="h-11 bg-muted/30 border-border rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Serial / Distinguishing ID No</label>
                      <Input value={eqptSerialNo} onChange={(e) => setEqptSerialNo(e.target.value)} className="h-11 bg-muted/30 border-border rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Mfg Month/Year (e.g. 11/2023)</label>
                      <Input value={eqptMfg} onChange={(e) => setEqptMfg(e.target.value)} className="h-11 bg-muted/30 border-border rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Load Chain Diameter (dia)</label>
                      <Input value={eqptChainDia} onChange={(e) => setEqptChainDia(e.target.value)} className="h-11 bg-muted/30 border-border rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Hand Chain Diameter (dia)</label>
                      <Input value={eqptHchainDia} onChange={(e) => setEqptHchainDia(e.target.value)} className="h-11 bg-muted/30 border-border rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Manufactured By</label>
                      <Input value={eqptMfdBy} onChange={(e) => setEqptMfdBy(e.target.value)} className="h-11 bg-muted/30 border-border rounded-xl" />
                    </div>
                    <div className="space-y-2 col-span-full">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Equipment Location Inside Factory</label>
                      <Input value={eqptLocation} onChange={(e) => setEqptLocation(e.target.value)} className="h-11 bg-muted/30 border-border rounded-xl" />
                    </div>
                  </div>
                </div>
              )}

              {/* DYNAMIC FORM FIELDS: FORM 34 STABILITY CERTIFICATE */}
              {draftCertType === 'FORM_34_STABILITY' && (
                <div className="space-y-4 border-t border-border pt-4 animate-in fade-in slide-in-from-top-4 duration-300">
                  <h4 className="text-sm font-black text-blue-600 uppercase tracking-widest">Form 34 Certificate of Stability Specifications</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 col-span-full">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Name of the Factory</label>
                      <Input value={stabFactoryName} onChange={(e) => setStabFactoryName(e.target.value)} className="h-11 bg-muted/30 border-border rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Village, Town and District situated</label>
                      <Input value={stabLocation} onChange={(e) => setStabLocation(e.target.value)} className="h-11 bg-muted/30 border-border rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Name of the Occupier</label>
                      <Input value={stabOccupierName} onChange={(e) => setStabOccupierName(e.target.value)} className="h-11 bg-muted/30 border-border rounded-xl" />
                    </div>
                    <div className="space-y-2 col-span-full">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Full Postal Address of Factory</label>
                      <textarea value={stabPostalAddress} onChange={(e) => setStabPostalAddress(e.target.value)} className="w-full p-3 bg-muted/30 border border-border rounded-xl text-sm min-h-[60px]" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Nature of manufacturing process</label>
                      <Input value={stabMfgProcess} onChange={(e) => setStabMfgProcess(e.target.value)} className="h-11 bg-muted/30 border-border rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase">No of Floors / Worker Layout Ref</label>
                      <Input value={stabWorkerLayoutRef} onChange={(e) => setStabWorkerLayoutRef(e.target.value)} className="h-11 bg-muted/30 border-border rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Chief Inspector Plan Approval Letter No</label>
                      <Input value={stabPlanLetterNo} onChange={(e) => setStabPlanLetterNo(e.target.value)} className="h-11 bg-muted/30 border-border rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Chief Inspector Plan Date</label>
                      <Input value={stabPlanLetterDate} onChange={(e) => setStabPlanLetterDate(e.target.value)} className="h-11 bg-muted/30 border-border rounded-xl" />
                    </div>
                  </div>
                </div>
              )}

              {/* DYNAMIC FORM FIELDS: FORM 8 PRESSURE VESSEL */}
              {draftCertType === 'FORM_8_PRESSURE_VESSEL' && (
                <div className="space-y-4 border-t border-border pt-4 animate-in fade-in slide-in-from-top-4 duration-300">
                  <h4 className="text-sm font-black text-blue-600 uppercase tracking-widest">Form 8 Pressure Vessel Exam Specifications</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 col-span-full">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Name of Occupier of Factory</label>
                      <Input value={pvOccupierName} onChange={(e) => setPvOccupierName(e.target.value)} className="h-11 bg-muted/30 border-border rounded-xl" />
                    </div>
                    <div className="space-y-2 col-span-full">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Location and Address of Factory</label>
                      <textarea value={pvFactoryAddress} onChange={(e) => setPvFactoryAddress(e.target.value)} className="w-full p-3 bg-muted/30 border border-border rounded-xl text-sm min-h-[60px]" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Pressure Vessel Description / Distinct Name</label>
                      <Input value={pvVesselDesc} onChange={(e) => setPvVesselDesc(e.target.value)} className="h-11 bg-muted/30 border-border rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Capacity, Serial & Room Location Specs</label>
                      <Input value={pvVesselCapNo} onChange={(e) => setPvVesselCapNo(e.target.value)} className="h-11 bg-muted/30 border-border rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Name and Address of Manufacturer</label>
                      <Input value={pvManufacturer} onChange={(e) => setPvManufacturer(e.target.value)} className="h-11 bg-muted/30 border-border rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Nature of process in which it is used</label>
                      <Input value={pvProcess} onChange={(e) => setPvProcess(e.target.value)} className="h-11 bg-muted/30 border-border rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Year of Manufacture</label>
                      <Input value={pvMfgYear} onChange={(e) => setPvMfgYear(e.target.value)} className="h-11 bg-muted/30 border-border rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Date first taken into use in factory</label>
                      <Input value={pvFirstUseDate} onChange={(e) => setPvFirstUseDate(e.target.value)} className="h-11 bg-muted/30 border-border rounded-xl" />
                    </div>
                    <div className="space-y-2 col-span-full">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Thickness of walls (Shell, T.Disc, B.Disc)</label>
                      <textarea value={pvWallThickness} onChange={(e) => setPvWallThickness(e.target.value)} className="w-full p-3 bg-muted/30 border border-border rounded-xl text-xs min-h-[60px]" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Safe working pressure recommended (mfg)</label>
                      <Input value={pvSafePressure} onChange={(e) => setPvSafePressure(e.target.value)} className="h-11 bg-muted/30 border-border rounded-xl" />
                    </div>
                    <div className="space-y-2 col-span-full">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Vessel History (order since inspection)</label>
                      <Input value={pvVesselHistory} onChange={(e) => setPvVesselHistory(e.target.value)} className="h-11 bg-muted/30 border-border rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Hydraulic Test conducted by Manufacturer</label>
                      <Input value={pvHydTestByMfg} onChange={(e) => setPvHydTestByMfg(e.target.value)} className="h-11 bg-muted/30 border-border rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Is vessel open or exposed to weather?</label>
                      <Input value={pvExposedWeather} onChange={(e) => setPvExposedWeather(e.target.value)} className="h-11 bg-muted/30 border-border rounded-xl" />
                    </div>
                    <div className="space-y-2 col-span-full">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Details of exam & tests conducted (Ultrasonic)</label>
                      <Input value={pvExamDetails} onChange={(e) => setPvExamDetails(e.target.value)} className="h-11 bg-muted/30 border-border rounded-xl" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 col-span-full">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase">Hydraulic test pressure applied</label>
                        <Input value={pvHydTestPressure} onChange={(e) => setPvHydTestPressure(e.target.value)} className="h-11 bg-muted/30 border-border rounded-xl" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase">What parts, if any, were inaccessible?</label>
                        <Input value={pvInaccessibleParts} onChange={(e) => setPvInaccessibleParts(e.target.value)} className="h-11 bg-muted/30 border-border rounded-xl" />
                      </div>
                    </div>
                    <div className="space-y-2 col-span-full">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Vessel Condition (External & Internal)</label>
                      <Input value={pvVesselCondition} onChange={(e) => setPvVesselCondition(e.target.value)} className="h-11 bg-muted/30 border-border rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Are fittings provided in rules?</label>
                      <Input value={pvFittingsProvided} onChange={(e) => setPvFittingsProvided(e.target.value)} className="h-11 bg-muted/30 border-border rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Are fittings properly maintained?</label>
                      <Input value={pvFittingsMaintained} onChange={(e) => setPvFittingsMaintained(e.target.value)} className="h-11 bg-muted/30 border-border rounded-xl" />
                    </div>
                    <div className="space-y-2 col-span-full">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Repairs, if any required, & execute period</label>
                      <textarea value={pvRepairsRequired} onChange={(e) => setPvRepairsRequired(e.target.value)} className="w-full p-3 bg-muted/30 border border-border rounded-xl text-xs min-h-[60px]" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Safe working pressure calculated (thickness)</label>
                      <Input value={pvCalculatedSafePressure} onChange={(e) => setPvCalculatedSafePressure(e.target.value)} className="h-11 bg-muted/30 border-border rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Where repairs affecting pressure are required</label>
                      <Input value={pvRepairsSafePressure} onChange={(e) => setPvRepairsSafePressure(e.target.value)} className="h-11 bg-muted/30 border-border rounded-xl" />
                    </div>
                    <div className="space-y-2 col-span-full">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Other Observations</label>
                      <Input value={pvOtherObservations} onChange={(e) => setPvOtherObservations(e.target.value)} className="h-11 bg-muted/30 border-border rounded-xl" />
                    </div>
                  </div>
                </div>
              )}

              {/* DYNAMIC FORM FIELDS: FORM 8 SAFETY VALVE */}
              {draftCertType === 'FORM_8_SAFETY_VALVE' && (
                <div className="space-y-4 border-t border-border pt-4 animate-in fade-in slide-in-from-top-4 duration-300">
                  <h4 className="text-sm font-black text-blue-600 uppercase tracking-widest">Form 8 Pressure/Thermal Safety Valve Specifications</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 col-span-full">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Name of occupier (or Factory)</label>
                      <Input value={svOccupierName} onChange={(e) => setSvOccupierName(e.target.value)} className="h-11 bg-muted/30 border-border rounded-xl" />
                    </div>
                    <div className="space-y-2 col-span-full">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Situation and Address of Factory</label>
                      <textarea value={svFactoryAddress} onChange={(e) => setSvFactoryAddress(e.target.value)} className="w-full p-3 bg-muted/30 border border-border rounded-xl text-sm min-h-[60px]" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Thermal/Pressure Safety Valve Description</label>
                      <Input value={svValveDesc} onChange={(e) => setSvValveDesc(e.target.value)} className="h-11 bg-muted/30 border-border rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Capacity, Serial & Loc Specs</label>
                      <Input value={svValveCapNo} onChange={(e) => setSvValveCapNo(e.target.value)} className="h-11 bg-muted/30 border-border rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Name and Address of Manufacturer</label>
                      <Input value={svManufacturer} onChange={(e) => setSvManufacturer(e.target.value)} className="h-11 bg-muted/30 border-border rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Nature of process in which it is used</label>
                      <Input value={svProcess} onChange={(e) => setSvProcess(e.target.value)} className="h-11 bg-muted/30 border-border rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Year of Manufacture</label>
                      <Input value={svMfgYear} onChange={(e) => setSvMfgYear(e.target.value)} className="h-11 bg-muted/30 border-border rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Date of commissioning in service</label>
                      <Input value={svCommissionDate} onChange={(e) => setSvCommissionDate(e.target.value)} className="h-11 bg-muted/30 border-border rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Set pressure recommended by Manufacturer</label>
                      <Input value={svSetPressure} onChange={(e) => setSvSetPressure(e.target.value)} className="h-11 bg-muted/30 border-border rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Valve History (working in order since...)</label>
                      <Input value={svValveHistory} onChange={(e) => setSvValveHistory(e.target.value)} className="h-11 bg-muted/30 border-border rounded-xl" />
                    </div>
                    <div className="space-y-2 col-span-full">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Date of last Hyd. test & pressure applied</label>
                      <Input value={svLastHydTest} onChange={(e) => setSvLastHydTest(e.target.value)} className="h-11 bg-muted/30 border-border rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Is TSV exposed to weather or damp?</label>
                      <Input value={svExposedWeather} onChange={(e) => setSvExposedWeather(e.target.value)} className="h-11 bg-muted/30 border-border rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase">What parts, if any, were inaccessible?</label>
                      <Input value={svInaccessibleParts} onChange={(e) => setSvInaccessibleParts(e.target.value)} className="h-11 bg-muted/30 border-border rounded-xl" />
                    </div>
                    <div className="space-y-2 col-span-full">
                      <label className="text-xs font-bold text-muted-foreground uppercase">What examination and were made? (Hydro test)</label>
                      <Input value={svExamDetails} onChange={(e) => setSvExamDetails(e.target.value)} className="h-11 bg-muted/30 border-border rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Are fittings properly maintained?</label>
                      <Input value={svFittingsMaintained} onChange={(e) => setSvFittingsMaintained(e.target.value)} className="h-11 bg-muted/30 border-border rounded-xl" />
                    </div>
                    <div className="space-y-2 col-span-full">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Repairs, if any required, & execute period</label>
                      <textarea value={svRepairsRequired} onChange={(e) => setSvRepairsRequired(e.target.value)} className="w-full p-3 bg-muted/30 border border-border rounded-xl text-sm min-h-[60px]" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Where repairs affecting set pressure are required</label>
                      <Input value={svRepairsSetPressure} onChange={(e) => setSvRepairsSetPressure(e.target.value)} className="h-11 bg-muted/30 border-border rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Other Observations</label>
                      <Input value={svOtherObservations} onChange={(e) => setSvOtherObservations(e.target.value)} className="h-11 bg-muted/30 border-border rounded-xl" />
                    </div>
                  </div>
                </div>
              )}

              {/* SHARED COMPETENCY INFORMATION */}
              {(draftCertType === 'FACTORIES_ACT_28_29' || draftCertType === 'FORM_34_STABILITY' || draftCertType === 'FORM_8_PRESSURE_VESSEL' || draftCertType === 'FORM_8_SAFETY_VALVE') && (
                <div className="space-y-4 border-t border-border pt-4 animate-in fade-in slide-in-from-top-4 duration-300">
                  <h4 className="text-sm font-black text-blue-600 uppercase tracking-widest">Competent Person & Govt License Verification</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Competency Certificate & Govt Memo No</label>
                      <Input value={certCompetencyNo} onChange={(e) => setCertCompetencyNo(e.target.value)} className="h-11 bg-muted/30 border-border rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Name of Competent Person</label>
                      <Input value={certCompetentPerson} onChange={(e) => setCertCompetentPerson(e.target.value)} className="h-11 bg-muted/30 border-border rounded-xl" />
                    </div>
                  </div>
                </div>
              )}

              {/* STANDARD FIELDS (For Fire, Elec, Struct, or General notes) */}
              {(draftCertType === 'FIRE_SAFETY' || draftCertType === 'ELECTRICAL_SAFETY' || draftCertType === 'STRUCTURAL_SAFETY') && (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Scope of Inspection</label>
                    <textarea
                      placeholder="Describe the scope of safety inspection conducted..."
                      value={draftCertScope}
                      onChange={(e) => setDraftCertScope(e.target.value)}
                      className="w-full p-4 bg-muted/30 border border-border rounded-xl text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Observations & Recommendations</label>
                    <textarea
                      placeholder="Enter field observations, recommendations, and corrective actions..."
                      value={draftCertNotes}
                      onChange={(e) => setDraftCertNotes(e.target.value)}
                      className="w-full p-4 bg-muted/30 border border-border rounded-xl text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </>
              )}
            </div>
          )}
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
              <div className="absolute top-0 right-0 p-4">
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
    </div>
  );
}
