import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export default function HolidayPopup() {
  const [holiday, setHoliday] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const shown = sessionStorage.getItem("holidayPopupShown");
    if (shown) {
      setLoading(false);
      return;
    }

    base44.entities.HolidayEvent.filter({ is_advertised: true })
      .then((events) => {
        if (!events || events.length === 0) return;
        const now = new Date();
        // Show popup starting 7 days before start_date through end_date
        const active = events.find((e) => {
          const start = new Date(e.start_date);
          const adStart = new Date(start.getTime() - 7 * 24 * 60 * 60 * 1000);
          const end = new Date(e.end_date + "T23:59:59");
          return now >= adStart && now <= end;
        });
        if (active) {
          setHoliday(active);
          sessionStorage.setItem("holidayPopupShown", "true");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || !holiday) return null;

  const handleClose = () => setHoliday(null);
  const handleGo = () => {
    navigate("/ShopPage?tab=holiday");
    setHoliday(null);
  };

  const now = new Date();
  const startDate = new Date(holiday.start_date);
  const isLive = now >= startDate;

  return (
    <div className="fixed inset-0 z-[95] bg-black/85 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="relative max-w-sm w-full" style={{ filter: "drop-shadow(0 0 20px rgba(0,0,0,0.8))" }}>
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute -top-3 -right-3 z-10 w-9 h-9 rounded-full bg-slate-800 border-2 border-white/30 flex items-center justify-center text-white hover:bg-slate-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Poster image */}
        {holiday.poster_image_url ? (
          <div className="rounded-2xl overflow-hidden border-2" style={{ borderColor: holiday.theme_color }}>
            <img src={holiday.poster_image_url} alt={holiday.display_name} className="w-full block" />
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden border-2 p-8 text-center" style={{ borderColor: holiday.theme_color, backgroundColor: "#0a0a0a" }}>
            <div className="text-4xl mb-3">🎉</div>
            <h2 className="text-xl font-bold text-white mb-1">{holiday.display_name}</h2>
            {holiday.tagline && <p className="text-sm text-slate-400 mb-2">{holiday.tagline}</p>}
            <p className="text-xs text-slate-500">
              {holiday.start_date} — {holiday.end_date}
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 mt-3">
          {isLive ? (
            <Button
              onClick={handleGo}
              className="flex-1 font-black text-base h-11"
              style={{ backgroundColor: holiday.theme_color }}
            >
              GO TO SALE →
            </Button>
          ) : (
            <Button disabled className="flex-1 font-bold text-base h-11 bg-slate-700 text-slate-400">
              COMING SOON
            </Button>
          )}
          <Button onClick={handleClose} variant="outline" className="flex-1 border-slate-600 text-slate-300 font-bold h-11">
            CLOSE
          </Button>
        </div>
      </div>
    </div>
  );
}