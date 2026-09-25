import React from "react";
import { useNavigate } from "react-router-dom";
import { Crown } from "lucide-react";

export default function ShopVIPCard({ playerData }) {
  const navigate = useNavigate();
  const isVIP = playerData?.vipActiveUntil && playerData.vipActiveUntil > Date.now();

  return (
    <div className="bg-gradient-to-b from-yellow-950/40 to-slate-900 border border-yellow-700/40 rounded-lg p-2 text-center">
      <Crown className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
      <div className="text-[9px] font-bold text-yellow-400 tracking-wide">VIP MEMBERSHIP</div>
      <div className="text-[8px] text-slate-400 mt-0.5 leading-tight">
        <div className="text-emerald-400">+10% RESPECT</div>
        <div className="text-green-400">+10% CASH</div>
        <div className="text-blue-400">1 DAILY CRATE</div>
      </div>
      <button
        onClick={() => navigate("/ShopPage?tab=vip")}
        className={`mt-1.5 w-full text-[9px] font-bold py-1 rounded ${
          isVIP ? "bg-emerald-600 text-white" : "bg-yellow-500 text-black"
        }`}
      >
        {isVIP ? "ACTIVE" : "ACTIVATE"}
      </button>
      <div className="text-[7px] text-slate-500 mt-0.5">30 DAYS</div>
    </div>
  );
}