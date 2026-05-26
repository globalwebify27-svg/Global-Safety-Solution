"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuthStore } from "@/store/auth";
import { API_BASE_URL } from "@/lib/config";
import { LogOut, Home, Users, FolderKanban, ShieldCheck, Settings, BadgeCheck, UserCircle, Target, FileSpreadsheet, Package, Monitor, FolderLock, Menu, X, Banknote, ClipboardCheck } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationCenter } from "@/components/notification-center";

const navigation = [
  { name: "Overview",          href: "/dashboard",             icon: Home,            module: "DASHBOARD" },
  { name: "Quotation Hub",     href: "/dashboard/quotations",  icon: FileSpreadsheet, module: "SALES" },
  { name: "Sales Pipeline",    href: "/dashboard/leads",       icon: Target,          module: "SALES" },
  { name: "Client Management", href: "/dashboard/clients",     icon: Users,           module: "CLIENTS" },
  { name: "Finance & Invoices",href: "/dashboard/finance",     icon: Banknote,        module: "FINANCE" },
  { name: "Staff Directory",   href: "/dashboard/employees",   icon: UserCircle,      module: "HR" },
  { name: "Payroll Hub",       href: "/dashboard/payroll",     icon: Banknote,        module: "HR" },
  { name: "Attendance Hub",    href: "/dashboard/attendance",  icon: BadgeCheck,      module: "ALL" }, // Everyone needs Attendance
  { name: "Site Inspections",  href: "/dashboard/inspections", icon: ClipboardCheck,  module: "OPERATIONS" },
  { name: "Operations",        href: "/dashboard/operations",  icon: FolderKanban,    module: "OPERATIONS" },
  { name: "Compliance",        href: "/dashboard/compliance",  icon: ShieldCheck,     module: "COMPLIANCE" },
  { name: "Digital Vault",     href: "/dashboard/documents",   icon: FolderLock,      module: "ALL" }, // Everyone needs Vault
  { name: "Inventory Ledger",  href: "/dashboard/inventory",   icon: Package,         module: "OPERATIONS" },
  { name: "Asset Registry",    href: "/dashboard/assets",      icon: Monitor,         module: "OPERATIONS" },
  { name: "Settings",          href: "/dashboard/settings",    icon: Settings,        module: "SYSTEM" },
  { name: "Field Task Board",  href: "/dashboard/field-tasks", icon: ClipboardCheck,  module: "FIELD_TASKS" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [orgName, setOrgName] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { logout, token, user } = useAuthStore();

  const allowedModulesForRole: Record<string, string[]> = {
    'SUPER_ADMIN': ["DASHBOARD", "SALES", "CLIENTS", "FINANCE", "HR", "OPERATIONS", "COMPLIANCE", "SYSTEM"],
    'HR_MANAGER': ["DASHBOARD", "HR"],
    'FIELD_ENGINEER': ["DASHBOARD", "FIELD_TASKS", "OPERATIONS", "COMPLIANCE"],
    'SALES_EXECUTIVE': ["DASHBOARD", "SALES", "CLIENTS"],
    'CLIENT': ["DASHBOARD", "CLIENTS"]
  };

  const filteredNavigation = useMemo(() => {
    if (!user) return [];
    
    const roleName = user?.roles?.[0]?.role?.name || "STAFF";
    
    // Legacy fallback just in case
    const isLegacyAdmin = user?.email === "admin@globalsafety.com";
    const effectiveRole = isLegacyAdmin ? "SUPER_ADMIN" : roleName;

    const allowed = allowedModulesForRole[effectiveRole] || [];

    return navigation.filter(item => {
      // 1. Modules everyone needs
      if (item.module === "ALL") return true;

      // 2. Super Admin Access
      if (effectiveRole === "SUPER_ADMIN") {
        if (item.module === "FIELD_TASKS") return false; // Hide field tasks from admin view
        return true; 
      }

      // 3. Check role mapping
      return allowed.includes(item.module);
    });
  }, [user]);


  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  // Redirect to login if token is missing (only after store hydration is complete)
  useEffect(() => {
    if (hydrated && !token) {
      router.push("/login");
    }
  }, [hydrated, token, router]);

  useEffect(() => {
    if (hydrated && token) {
      fetch(`${API_BASE_URL}/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(r => {
        if (r.status === 401) {
          logout();
          router.push("/login");
          return null;
        }
        return r.json();
      })
      .then(data => {
        if (data && data.company_name) setOrgName(data.company_name);
      })
      .catch(e => console.error(e));
    }
  }, [hydrated, token, logout, router]);

  // Close mobile menu when navigating
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  if (!hydrated) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>;
  }

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
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                {user?.roles?.[0]?.role?.name?.replace(/_/g, ' ') || user?.designation || "STAFF"}
              </span>
              <span className="text-xs font-bold text-foreground/80">{orgName || "Global Webify"}</span>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 cursor-pointer shadow-xl shadow-blue-500/20 border border-border flex items-center justify-center text-white font-bold">
              {user?.name?.charAt(0) || "U"}
            </div>
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
