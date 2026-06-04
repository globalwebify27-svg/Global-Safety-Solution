import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  employee_id?: string;
  designation?: string;
  department?: string;
  role?: string;
  roles?: any[];
}

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => {
        let roleName = user?.roles?.[0]?.role?.name;
        if (!roleName) {
          const designation = (user?.designation || "").toUpperCase();
          if (designation.includes("HR")) roleName = "HR_MANAGER";
          else if (designation.includes("FIELD") || designation.includes("ENGINEER")) roleName = "FIELD_ENGINEER";
          else if (designation.includes("SALES")) roleName = "SALES_EXECUTIVE";
          else if (designation.includes("CLIENT")) roleName = "CLIENT";
          else roleName = "STAFF";
        }
        const isLegacyAdmin = user?.email === "admin@globalsafety.com";
        const effectiveRole = isLegacyAdmin ? "SUPER_ADMIN" : roleName;

        set({ token, user: { ...user, role: effectiveRole } });
      },
      logout: () => set({ token: null, user: null }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
