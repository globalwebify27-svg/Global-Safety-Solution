"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth";
import { API_BASE_URL } from "@/lib/config";
import { Bell, Check, Info, AlertTriangle, CheckCircle2, XCircle, Clock } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR';
  is_read: boolean;
  created_at: string;
  link?: string;
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const token = useAuthStore((state) => state.token);

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.is_read).length);
      }
    } catch (e) {
      // Silently handle polling errors to avoid console spam, or use a concise warning
      console.warn("[NotificationCenter] Polling failed:", (e as any).message || 'Connection refused');
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll for notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [token]);

  const markAsRead = async (id: string) => {
    try {
      await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch(`${API_BASE_URL}/notifications/read-all`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'SUCCESS': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'WARNING': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'ERROR': return <XCircle className="w-4 h-4 text-rose-500" />;
      default: return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="relative h-10 w-10 rounded-xl hover:bg-accent/10 transition-all border border-border bg-card/30 backdrop-blur-md flex items-center justify-center outline-none">
        <Bell className="h-5 w-5 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-lg ring-2 ring-background animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 sm:w-96 bg-card/95 border-border backdrop-blur-xl shadow-2xl rounded-2xl p-2 z-[9999] transform-gpu isolate">
        <div className="flex items-center justify-between px-4 py-3">
          <DropdownMenuLabel className="p-0 text-base font-black tracking-tight">System Alerts</DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead} className="h-7 text-[10px] font-bold uppercase tracking-widest text-blue-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg">
              Mark all as read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator className="bg-border/50" />
        <div className="max-h-[400px] overflow-y-auto scrollbar-hide py-1">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground space-y-3">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <Bell className="w-6 h-6 opacity-20" />
              </div>
              <p className="text-sm font-medium italic">No recent alerts.</p>
            </div>
          ) : (
            notifications.map((n) => (
              <DropdownMenuItem 
                key={n.id} 
                onClick={() => !n.is_read && markAsRead(n.id)}
                className={cn(
                  "flex items-start gap-4 p-4 rounded-xl cursor-pointer transition-colors focus:bg-accent/10 mb-1 last:mb-0",
                  !n.is_read ? "bg-primary/5" : "opacity-70"
                )}
              >
                <div className={cn(
                  "mt-1 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm",
                  n.type === 'SUCCESS' ? "bg-emerald-500/10" : 
                  n.type === 'WARNING' ? "bg-amber-500/10" : 
                  n.type === 'ERROR' ? "bg-rose-500/10" : "bg-blue-500/10"
                )}>
                  {getIcon(n.type)}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-foreground leading-none">{n.title}</p>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {n.message}
                  </p>
                  {!n.is_read && (
                    <div className="flex items-center gap-2 pt-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">New Alert</span>
                    </div>
                  )}
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>
        <DropdownMenuSeparator className="bg-border/50" />
        <div className="p-2">
           <Button variant="ghost" className="w-full h-10 rounded-xl text-xs font-bold text-muted-foreground hover:bg-accent/10">
             View Full Activity Log
           </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
