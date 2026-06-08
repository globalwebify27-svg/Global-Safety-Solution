"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Save, User } from "lucide-react";

interface ProfileData {
  name: string;
  email: string;
  phone: string;
  designation: string;
  department: string;
}

interface ProfileFormProps {
  initialData: ProfileData;
  onSubmit: (data: ProfileData) => void;
  loading: boolean;
}

export function ProfileForm({ initialData, onSubmit, loading }: ProfileFormProps) {
  const [formData, setFormData] = useState<ProfileData>(initialData);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="flex items-center gap-4 sm:gap-6">
        <div className="relative group shrink-0">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-blue-600 to-teal-400 flex items-center justify-center shadow-2xl overflow-hidden">
            {formData.name ? (
              <span className="text-2xl sm:text-3xl font-black text-white">{formData.name[0]}</span>
            ) : (
              <User className="w-8 h-8 sm:w-10 sm:h-10 text-white/50" />
            )}
          </div>
          <input 
            type="file" 
            id="avatar-upload" 
            className="hidden" 
            accept="image/*" 
            onChange={() => console.log("Avatar upload triggered")} 
          />
          <label 
            htmlFor="avatar-upload" 
            className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center text-foreground hover:bg-accent transition-colors shadow-lg cursor-pointer"
          >
            <Camera className="w-4 h-4" />
          </label>
        </div>
        <div className="min-w-0">
          <h3 className="text-lg sm:text-xl font-bold text-foreground truncate">{formData.name}</h3>
          <p className="text-muted-foreground text-xs sm:text-sm font-medium break-all">{formData.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label className="text-muted-foreground">Full Display Name</Label>
          <Input 
            value={formData.name} 
            onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
            className="bg-background border-border h-11 text-foreground" 
          />
        </div>
        <div className="space-y-2">
          <Label className="text-muted-foreground">Professional Phone</Label>
          <Input 
            value={formData.phone} 
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })} 
            className="bg-background border-border h-11 text-foreground" 
          />
        </div>
        <div className="space-y-2">
          <Label className="text-muted-foreground">Designation</Label>
          <Input 
            value={formData.designation} 
            onChange={(e) => setFormData({ ...formData, designation: e.target.value })} 
            className="bg-background border-border h-11 text-foreground" 
          />
        </div>
        <div className="space-y-2">
          <Label className="text-muted-foreground">Department</Label>
          <Input 
            value={formData.department} 
            onChange={(e) => setFormData({ ...formData, department: e.target.value })} 
            className="bg-background border-border h-11 text-foreground" 
          />
        </div>
      </div>

      <div className="pt-4 flex justify-end">
        <button 
          disabled={loading} 
          type="submit" 
          className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 font-bold h-11 rounded-xl flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 border-0 shadow-lg shadow-primary/20"
        >
          {loading ? "Saving Changes..." : "Update Profile"} <Save className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
}
