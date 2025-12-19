"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useSupabaseUser } from "./useSupabaseUser";

export type NotificationRow = {
  id: string;
  user_id: string;
  order_id: string | null;
  role: "customer" | "owner";
  event: string | null;
  title: string | null;
  message: string;
  created_at: string;
  is_read: boolean;
};

type RoleFilter = "customer" | "owner" | "any";

export function useNotifications(role: RoleFilter = "any") {
  const { user, loading: authLoading } = useSupabaseUser();

  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  // Initial fetch
  useEffect(() => {
    const fetchNotifications = async () => {
      if (authLoading) return;

      if (!user) {
        setNotifications([]);
        setUnreadCount(0);
        setLoading(false);
        return;
      }

      setLoading(true);

      let query = supabase
        .from("user_notifications")
        .select(
          "id,user_id,order_id,role,event,title,message,created_at,is_read"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (role !== "any") {
        query = query.eq("role", role);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error loading notifications:", error);
        setNotifications([]);
        setUnreadCount(0);
        setLoading(false);
        return;
      }

      const rows = (data || []) as NotificationRow[];
      setNotifications(rows);
      setUnreadCount(rows.filter((n) => !n.is_read).length);
      setLoading(false);
    };

    void fetchNotifications();
  }, [authLoading, user, role]);

  // Realtime subscription for new notifications
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newRow = payload.new as NotificationRow;

          // Optional role filter
          if (role !== "any" && newRow.role !== role) return;

          setNotifications((prev) => [newRow, ...prev]);
          setUnreadCount((prev) => prev + (newRow.is_read ? 0 : 1));
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, role]);

  const markAllRead = async () => {
    if (!user) return;

    const { error } = await supabase
      .from("user_notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (error) {
      console.error("Error marking notifications read:", error);
      return;
    }

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  return { notifications, unreadCount, loading, markAllRead };
}
