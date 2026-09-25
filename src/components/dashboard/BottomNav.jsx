import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User, TrendingUp, MapPin, ShoppingBag, Shield } from "lucide-react";

const NAV_ITEMS = [
  { label: "Profile", icon: User, page: "ProfilePage" },
  { label: "Trade", icon: TrendingUp, page: "TradingPage" },
  { label: "MAP", icon: MapPin, page: "MapsPage", center: true },
  { label: "Shop", icon: ShoppingBag, page: "ShopPage" },
  { label: "Alliance", icon: Shield, page: "AlliancePage" },
];

export default function BottomNav() {
  const location = useLocation();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#0a0f1a] border-t border-emerald-900/30 z-50" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-end justify-around px-2 py-2 max-w-2xl mx-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.includes(item.page);
          
          if (item.center) {
            return (
              <Link
                key={item.label}
                to={createPageUrl(item.page)}
                className="relative -mb-4"
              >
                <div className={`flex flex-col items-center gap-1 px-4 py-3 rounded-2xl transition-all
                  ${isActive 
                    ? "bg-emerald-500/20 text-emerald-400 shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-500/40" 
                    : "bg-[#0a0f1a] text-emerald-500/60 hover:text-emerald-400 shadow-lg ring-1 ring-emerald-900/40"
                  }`}
                >
                  <Icon className="w-7 h-7" />
                  <span className="text-[9px] font-medium uppercase tracking-wider">{item.label}</span>
                </div>
              </Link>
            );
          }
          
          return (
            <Link
              key={item.label}
              to={createPageUrl(item.page)}
              className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-lg transition-all flex-1 ${
                isActive
                  ? "bg-slate-800/60 text-slate-300"
                  : "text-slate-600 hover:text-slate-400 hover:bg-slate-900/50"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[9px] font-medium uppercase tracking-wider">{item.label}</span>
            </Link>
          );
        })}

      </div>
    </div>
  );
}