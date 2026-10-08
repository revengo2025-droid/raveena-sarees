"use client";

import React, { useState } from "react";
import { Users, Search, Mail, Phone, MapPin, Sparkles } from "lucide-react";
import { useApp } from "@/lib/store";
import { formatINR } from "@/lib/utils";

export default function AdminCustomersPage() {
  const { orders } = useApp();
  const [search, setSearch] = useState("");

  // Aggregate distinct customers dynamically from real orders
  const customers = React.useMemo(() => {
    const custMap: Record<string, {
      id: string;
      name: string;
      email: string;
      phone: string;
      city: string;
      state: string;
      tier: string;
      ordersCount: number;
      totalSpend: number;
      joined: string;
    }> = {};

    orders.forEach((o) => {
      const key = o.customerEmail || o.customerPhone || o.customerName;
      if (!custMap[key]) {
        custMap[key] = {
          id: `cust-${Object.keys(custMap).length + 1}`,
          name: o.customerName || "Patron",
          email: o.customerEmail || "—",
          phone: o.customerPhone || "—",
          city: o.shippingAddress?.city || "—",
          state: o.shippingAddress?.state || "—",
          tier: o.totalAmount > 50000 ? "Bridal Collector" : o.totalAmount > 20000 ? "Silk Connoisseur" : "Privilege Member",
          ordersCount: 0,
          totalSpend: 0,
          joined: new Date(o.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" }),
        };
      }
      custMap[key].ordersCount += 1;
      custMap[key].totalSpend += o.totalAmount;
    });

    return Object.values(custMap);
  }, [orders]);

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.city.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
  );

  return (
    <div className="space-y-6 font-sans">
      <div className="border-b border-adm-line pb-6">
        <h1 className="text-2xl sm:text-3xl font-serif text-adm-strong font-normal">
          Royal Patron Directory
        </h1>
        <p className="text-xs text-adm-muted mt-1">
          Review VIP client profiles, bridal purchase histories, and lifetime patron values.
        </p>
      </div>

      <div className="bg-adm-surface p-4 rounded-2xl border border-adm-line flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-adm-muted absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search patron by name, email, phone, or city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-adm-raised border border-adm-line2 rounded-xl py-2 pl-10 pr-3 text-xs text-adm-strong focus:outline-none focus:border-adm-gold"
          />
        </div>
        <span className="text-xs text-adm-goldsoft font-semibold">
          {filtered.length} Registered Patrons
        </span>
      </div>

      <div className="bg-adm-surface border border-adm-line rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[10px] uppercase font-bold text-adm-muted bg-adm-raised border-b border-adm-line">
              <tr>
                <th className="py-3 px-4">Patron Name</th>
                <th className="py-3 px-4">Contact Details</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Patron Tier</th>
                <th className="py-3 px-4">Total Orders</th>
                <th className="py-3 px-4">Lifetime Spend</th>
                <th className="py-3 px-4">Member Since</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-adm-line">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-adm-surface transition-colors">
                  <td className="py-3.5 px-4 font-bold text-adm-strong text-sm">{c.name}</td>
                  <td className="py-3.5 px-4">
                    <p className="text-adm-text">{c.email}</p>
                    <p className="text-[10px] text-adm-faint">{c.phone}</p>
                  </td>
                  <td className="py-3.5 px-4 text-adm-text">
                    {c.city}, {c.state}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold bg-adm-gold/15 text-adm-goldsoft border border-adm-gold/30">
                      {c.tier}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-adm-strong">{c.ordersCount}</td>
                  <td className="py-3.5 px-4 font-bold text-adm-goldsoft">
                    {formatINR(c.totalSpend)}
                  </td>
                  <td className="py-3.5 px-4 text-adm-muted">{c.joined}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
