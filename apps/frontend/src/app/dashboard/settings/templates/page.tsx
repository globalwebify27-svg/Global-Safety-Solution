"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth";
import { API_BASE_URL } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  FileText, 
  Plus, 
  Trash2, 
  Save, 
  ArrowLeft, 
  Copy, 
  Eye,
  ClipboardList
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface TemplateField {
  label: string;
  key: string;
  default: string;
}

interface CertificateTemplate {
  id?: string;
  name: string;
  description: string | null;
  html_content: string;
  fields: string; // JSON string representing TemplateField[]
}

export default function CertificateTemplatesPage() {
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<CertificateTemplate | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [fields, setFields] = useState<TemplateField[]>([]);
  const [loading, setLoading] = useState(false);

  const { token } = useAuthStore();

  useEffect(() => {
    fetchTemplates();
  }, [token]);

  const fetchTemplates = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/certificate-templates`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Failed to load templates");
      const data = await res.json();
      setTemplates(data);
    } catch (e) {
      console.error(e);
      toast.error("Error loading certificate templates");
    }
  };

  const handleAddField = () => {
    setFields([...fields, { label: "", key: "", default: "" }]);
  };

  const handleRemoveField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleFieldChange = (index: number, key: keyof TemplateField, value: string) => {
    const updated = [...fields];
    updated[index] = { ...updated[index], [key]: value };
    setFields(updated);
  };

  const handleEdit = (template: CertificateTemplate) => {
    setSelectedTemplate(template);
    setName(template.name);
    setDescription(template.description || "");
    setHtmlContent(template.html_content);
    try {
      setFields(JSON.parse(template.fields));
    } catch (e) {
      setFields([]);
    }
    setIsEditing(true);
  };

  const handleNew = () => {
    setSelectedTemplate(null);
    setName("");
    setDescription("");
    setHtmlContent(
      "I / We certify that on {{cert_test_date}} the safety checklist section described above was thoroughly examined and found satisfactory, subject to notes and recommendations."
    );
    setFields([
      { label: "Distinctive Marks / Eqpt Name", key: "eqpt_name", default: "CHAIN PULLEY BLOCK" },
      { label: "Working Load Limit (S.W.L)", key: "eqpt_swl", default: "2 Ton" },
      { label: "Lifting Height", key: "eqpt_lift", default: "4 Mtr" },
    ]);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Template name is required");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name,
        description,
        html_content: htmlContent,
        fields: JSON.stringify(fields),
      };

      const url = selectedTemplate?.id
        ? `${API_BASE_URL}/certificate-templates/${selectedTemplate.id}`
        : `${API_BASE_URL}/certificate-templates`;
      
      const method = selectedTemplate?.id ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save template");

      toast.success(selectedTemplate?.id ? "Template updated successfully!" : "Template created successfully!");
      setIsEditing(false);
      fetchTemplates();
    } catch (e) {
      console.error(e);
      toast.error("Failed to save certificate template");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      const res = await fetch(`${API_BASE_URL}/certificate-templates/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Template deleted successfully");
      fetchTemplates();
    } catch (e) {
      console.error(e);
      toast.error("Error deleting template");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-100">
      <div className="flex items-center justify-between border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
            <FileText className="w-8 h-8 text-blue-500" /> Certificate Templates
          </h1>
          <p className="text-slate-400 mt-1">Configure dynamic certificate layouts and custom form fields for safety sections.</p>
        </div>
        {!isEditing && (
          <Button onClick={handleNew} className="bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-2">
            <Plus className="w-5 h-5" /> Add New Template
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Template Form */}
          <div className="lg:col-span-2 space-y-6 bg-slate-900/60 backdrop-blur-md border border-slate-800 p-6 rounded-2xl">
            <div className="flex items-center gap-2 mb-4">
              <Button variant="ghost" size="icon" onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h2 className="text-xl font-bold text-white">{selectedTemplate?.id ? "Edit Template" : "New Certificate Template"}</h2>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="template-name">Template Name</Label>
                <Input
                  id="template-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Chain Pulley Block Test Certificate"
                  className="bg-slate-950 border-slate-800 text-white focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <Label htmlFor="template-desc">Description</Label>
                <Input
                  id="template-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description for field staff"
                  className="bg-slate-950 border-slate-800 text-white focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <Label htmlFor="template-content">Certifying Statement / Text</Label>
                <textarea
                  id="template-content"
                  rows={5}
                  value={htmlContent}
                  onChange={(e) => setHtmlContent(e.target.value)}
                  placeholder="Enter the main certificate wording. Supports placeholders like {{cert_test_date}}, {{client_name}}, and custom inputs below."
                  className="w-full rounded-md bg-slate-950 border border-slate-800 text-white p-3 focus:border-blue-500 focus:ring-blue-500 text-sm focus:outline-none"
                />
              </div>

              {/* Custom Fields Editor */}
              <div className="pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-md font-bold text-white flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-blue-400" /> Custom Certificate Fields
                  </h3>
                  <Button variant="outline" size="sm" onClick={handleAddField} className="border-slate-850 hover:bg-slate-800 text-xs font-bold text-slate-300">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Field
                  </Button>
                </div>

                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-slate-950 border border-slate-850 rounded-xl relative">
                      <div>
                        <Label className="text-xs text-slate-400">Field Label (UI Display)</Label>
                        <Input
                          value={field.label}
                          onChange={(e) => handleFieldChange(index, "label", e.target.value)}
                          placeholder="e.g. Distinguishing Marks"
                          className="bg-slate-900 border-slate-800 text-white text-xs mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-400">Placeholder Key (Use in Statement)</Label>
                        <Input
                          value={field.key}
                          onChange={(e) => handleFieldChange(index, "key", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                          placeholder="e.g. eqpt_marks (resolves to {{eqpt_marks}})"
                          className="bg-slate-900 border-slate-800 text-white text-xs mt-1"
                        />
                      </div>
                      <div className="flex items-end justify-between gap-2">
                        <div className="w-full">
                          <Label className="text-xs text-slate-400">Default Value</Label>
                          <Input
                            value={field.default}
                            onChange={(e) => handleFieldChange(index, "default", e.target.value)}
                            placeholder="e.g. N.A"
                            className="bg-slate-900 border-slate-800 text-white text-xs mt-1"
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveField(index)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-950/30 p-2 mt-5"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {fields.length === 0 && (
                    <p className="text-xs text-slate-500 text-center py-4">No custom fields defined. Simple checklist data will be printed on the certificate.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 border-t border-slate-800 pt-5">
              <Button variant="outline" onClick={() => setIsEditing(false)} className="border-slate-800 text-slate-400 hover:text-white">
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-2">
                <Save className="w-4 h-4" /> {loading ? "Saving..." : "Save Template"}
              </Button>
            </div>
          </div>

          {/* Placeholders side bar guide */}
          <div className="space-y-6">
            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 p-6 rounded-2xl">
              <h3 className="font-bold text-white text-lg mb-3">Placeholder Keys Guide</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                You can copy and paste these placeholder tags anywhere in your Certifying Statement to dynamically inject data from the client records and checklist sections:
              </p>

              <div className="space-y-3">
                <div>
                  <h4 className="text-xs font-black text-blue-400 uppercase tracking-widest">Global Fields (4 Default)</h4>
                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-center justify-between bg-slate-950 p-2 rounded-md border border-slate-850">
                      <span className="text-xs text-slate-300">{"{{cert_ref_no}}"}</span>
                      <span className="text-[10px] text-slate-500">Ref / Report Number</span>
                    </div>
                    <div className="flex items-center justify-between bg-slate-950 p-2 rounded-md border border-slate-850">
                      <span className="text-xs text-slate-300">{"{{cert_test_date}}"}</span>
                      <span className="text-[10px] text-slate-500">Test Date</span>
                    </div>
                    <div className="flex items-center justify-between bg-slate-950 p-2 rounded-md border border-slate-850">
                      <span className="text-xs text-slate-300">{"{{cert_expiry_date}}"}</span>
                      <span className="text-[10px] text-slate-500">Validity Expiry Date</span>
                    </div>
                    <div className="flex items-center justify-between bg-slate-950 p-2 rounded-md border border-slate-850">
                      <span className="text-xs text-slate-300">{"{{cert_competency_no}}"}</span>
                      <span className="text-[10px] text-slate-500">Competency No.</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <h4 className="text-xs font-black text-blue-400 uppercase tracking-widest">Client & Factory Fields</h4>
                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-center justify-between bg-slate-950 p-2 rounded-md border border-slate-850">
                      <span className="text-xs text-slate-300">{"{{client_name}}"}</span>
                      <span className="text-[10px] text-slate-500">Occupier / Client Name</span>
                    </div>
                    <div className="flex items-center justify-between bg-slate-950 p-2 rounded-md border border-slate-850">
                      <span className="text-xs text-slate-300">{"{{client_city}}"}</span>
                      <span className="text-[10px] text-slate-500">Factory City</span>
                    </div>
                    <div className="flex items-center justify-between bg-slate-950 p-2 rounded-md border border-slate-850">
                      <span className="text-xs text-slate-300">{"{{client_address}}"}</span>
                      <span className="text-[10px] text-slate-500">Full Postal Address</span>
                    </div>
                  </div>
                </div>

                {fields.length > 0 && (
                  <div className="pt-2">
                    <h4 className="text-xs font-black text-blue-400 uppercase tracking-widest">Custom Template Keys</h4>
                    <div className="mt-2 space-y-1.5">
                      {fields.map((field, i) => (
                        <div key={i} className="flex items-center justify-between bg-slate-950 p-2 rounded-md border border-slate-850">
                          <span className="text-xs text-slate-300">{"{{"}{field.key || "key"}{"}}"}</span>
                          <span className="text-[10px] text-slate-500">{field.label || "Custom Field"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Templates List */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => {
            let fieldCount = 0;
            try {
              fieldCount = JSON.parse(template.fields).length;
            } catch(e){}

            return (
              <div key={template.id} className="bg-slate-900/40 border border-slate-850 rounded-2xl p-5 hover:border-slate-800 transition duration-300 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-lg text-white mb-1">{template.name}</h3>
                  <p className="text-xs text-slate-400 mb-4 line-clamp-2">{template.description || "No description provided."}</p>
                  
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 text-xs font-mono text-slate-400 line-clamp-3 mb-4">
                    {template.html_content}
                  </div>

                  <div className="flex items-center gap-2 mb-4">
                    <span className="bg-blue-950/40 text-blue-400 text-[10px] font-bold px-2.5 py-1 rounded-md border border-blue-900/30">
                      {fieldCount} Custom Inputs
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-850 pt-4 mt-2">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(template)} className="text-slate-300 hover:text-white text-xs">
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(template.id!)} className="text-red-400 hover:text-red-300 text-xs">
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}

          {templates.length === 0 && (
            <div className="col-span-full border border-dashed border-slate-800 rounded-3xl p-10 text-center text-slate-500">
              <FileText className="w-12 h-12 mx-auto text-slate-600 mb-2" />
              <p className="font-semibold">No certificate templates created yet.</p>
              <p className="text-xs text-slate-600 mt-1">Create your first template to allow section-wise certificate generation.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
