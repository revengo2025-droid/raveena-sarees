"use server";

import { createAdminClient } from "@/lib/supabase";
import { INITIAL_PRODUCTS } from "@/lib/mockData";

export async function getDashboardStatsAction() {
  try {
    const adminClient = createAdminClient();

    const [ordersRes, productsRes, profilesRes] = await Promise.all([
      adminClient.from("orders").select("id, total_amount, order_status, payment_status, created_at"),
      adminClient.from("products").select("id, stock, is_active"),
      adminClient.from("profiles").select("id, role"),
    ]);

    const orders = ordersRes.data || [];
    const products = productsRes.data || [];
    const profiles = profilesRes.data || [];

    const totalRevenue = orders
      .filter((o) => o.payment_status === "paid")
      .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

    const pendingOrdersCount = orders.filter((o) => o.order_status === "pending" || o.order_status === "confirmed").length;
    const totalOrdersCount = orders.length;
    const totalProductsCount = products.length > 0 ? products.length : INITIAL_PRODUCTS.length;
    const totalCustomersCount = profiles.length;

    return {
      success: true,
      data: {
        totalRevenue,
        totalOrdersCount,
        pendingOrdersCount,
        totalProductsCount,
        totalCustomersCount,
        recentOrders: orders.slice(0, 5),
      },
    };
  } catch (err: any) {
    return {
      success: true,
      data: {
        totalRevenue: 0,
        totalOrdersCount: 0,
        pendingOrdersCount: 0,
        totalProductsCount: INITIAL_PRODUCTS.length,
        totalCustomersCount: 0,
        recentOrders: [],
      },
    };
  }
}

export async function getCustomersAction() {
  try {
    const adminClient = createAdminClient();
    const { data: profiles, error } = await adminClient
      .from("profiles")
      .select(`
        id,
        email,
        full_name,
        phone,
        role,
        created_at
      `)
      .order("created_at", { ascending: false });

    if (error || !profiles) {
      return {
        success: true,
        data: [],
      };
    }

    return { success: true, data: profiles };
  } catch (err: any) {
    return { success: false, error: err.message, data: [] };
  }
}
