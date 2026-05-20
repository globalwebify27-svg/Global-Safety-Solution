"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth";
import { API_BASE_URL } from "@/lib/config";
import { LogOut, Home, Users, FolderKanban, ShieldCheck, Settings, BadgeCheck, UserCircle, Target, FileSpreadsheet, Package, Monitor, FolderLock, Menu, X, Banknote, ClipboardCheck } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationCenter } from "@/components/notification-center";

const navigation = [
  { name: "Overview", href: "/dashboard", icon: Home },
  { name: "Client Management", href: "/dashboard/clients", icon: Users },
  { name: "Quotation Hub", href: "/dashboard/quotations", icon: FileSpreadsheet },
  { name: "Sales Pipeline", href: "/dashboard/leads", icon: Target },
  { name: "Finance & Invoices", href: "/dashboard/finance", icon: Banknote },
  { name: "Staff Directory", href: "/dashboard/employees", icon: UserCircle },
  { name: "Payroll Hub", href: "/dashboard/payroll", icon: Banknote },
  { name: "Attendance Hub", href: "/dashboard/attendance", icon: BadgeCheck },
  { name: "Site Inspections", href: "/dashboard/inspections", icon: ClipboardCheck },
  { name: "Operations", href: "/dashboard/operations", icon: FolderKanban },
  { name: "Compliance", href: "/dashboard/compliance", icon: ShieldCheck },
  { name: "Digital Vault", href: "/dashboard/documents", icon: FolderLock },
  { name: "Inventory Ledger", href: "/dashboard/inventory", icon: Package },
  { name: "Asset Registry", href: "/dashboard/assets", icon: Monitor },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
  { name: "Field Task Board", href: "/dashboard/field-tasks", icon: ClipboardCheck, roles: ["Engineer", "Field Worker", "Admin"] },
];


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [orgName, setOrgName] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { logout, token, user } = useAuthStore();

  const filteredNavigation = navigation.filter(item => {
    if (!item.roles) return true; // Show to everyone if no roles defined
    const userDesignation = user?.designation || "";
    const userRole = user?.role || "";
    return item.roles.some(role => 
      userDesignation.toLowerCase().includes(role.toLowerCase()) || 
      userRole.toLowerCase().includes(role.toLowerCase()) ||
      userRole === "ADMIN"
    );
  });

  useEffect(() => {
    if (token) {
      fetch(`${API_BASE_URL}/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(r => r.json())
      .then(data => {
        if (data.company_name) setOrgName(data.company_name);
      })
      .catch(e => console.error(e));
    }
  }, [token]);

  // Close mobile menu when navigating
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-background text-foreground flex overflow-hidden">
      {/* Desktop Sidebar (Hidden on Mobile) */}
      <aside className="hidden lg:flex w-64 border-r border-border bg-card/50 flex-col backdrop-blur-xl shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-border gap-3">
          <img src="/logo.png" alt="Logo" className="w-8 h-8 rounded-lg" />
          <span className="font-bold text-lg tracking-tight truncate">{orgName}</span>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto scrollbar-hide">
          {filteredNavigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  isActive 
                    ? "bg-primary/10 text-primary ring-1 ring-primary/20" 
                    : "text-muted-foreground hover:bg-accent/5 hover:text-foreground"
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? "text-primary" : ""}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <button 
            onClick={() => {
              logout();
              window.location.href = "/login";
            }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-sm font-bold text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar (Drawer) */}
      <aside className={`fixed inset-y-0 left-0 w-72 bg-card border-r border-border z-[60] lg:hidden transform transition-transform duration-300 ease-out flex flex-col ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-border">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Logo" className="w-8 h-8 rounded-lg" />
            <span className="font-bold text-lg tracking-tight truncate">{orgName}</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="text-muted-foreground hover:text-foreground p-1">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {filteredNavigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl text-base font-bold transition-all ${
                  isActive 
                    ? "bg-primary/10 text-primary ring-1 ring-primary/20 shadow-lg shadow-primary/5" 
                    : "text-muted-foreground"
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? "text-primary" : ""}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-border">
          <button 
            onClick={() => { logout(); window.location.href = "/login"; }}
            className="flex items-center gap-3 px-4 py-3.5 rounded-2xl w-full text-base font-bold text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="h-16 border-b border-border bg-card/30 flex items-center justify-between lg:justify-end px-4 lg:px-8 backdrop-blur-xl shrink-0 relative z-50">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="lg:hidden p-2 text-muted-foreground hover:text-foreground hover:bg-accent/5 rounded-xl transition-all"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-4">
            <NotificationCenter />
            <ThemeToggle />
            <div className="hidden md:flex flex-col items-end mr-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Super Admin</span>
              <span className="text-xs font-bold text-foreground/80">Global Webify</span>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 cursor-pointer shadow-xl shadow-blue-500/20 border border-border" />
          </div>
        </header>
        
        <div className="flex-1 overflow-y-auto p-4 lg:p-10 relative scroll-smooth">
          <div className="absolute top-0 right-0 w-[60%] h-[60%] bg-blue-600/5 blur-[140px] rounded-full pointer-events-none -z-10" />
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
