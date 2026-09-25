import React, { useState, useMemo, useEffect } from "react";

const TZ_OPTIONS = [
  { label: 'ET', tz: 'America/New_York' },
  { label: 'CT', tz: 'America/Chicago' },
  { label: 'MT', tz: 'America/Denver' },
  { label: 'PT', tz: 'America/Los_Angeles' },
  { label: 'UTC', tz: 'UTC' },
];

/**
 * FvFServerResetBar — displays the weekly server reset time (Monday 00:00 ET)
 * as a static formatted time in the user's chosen timezone. Timezone preference
 * is saved to localStorage and persists across sessions.
 */
export default function FvFServerResetBar() {
  const [tz, setTz] = useState(() => localStorage.getItem('fvf_timezone') || 'America/New_York');
  const [showOptions, setShowOptions] = useState(false);

  useEffect(() => {
    localStorage.setItem('fvf_timezone', tz);
  }, [tz]);

  const resetLabel = useMemo(() => {
    // Server resets every Monday at 00:00 ET (America/New_York).
    // Find the next Monday at midnight ET and format it in the
    // user's selected timezone (display only).
    const now = new Date();

    // Get today's date in ET (YYYY-MM-DD via en-CA locale)
    const etTodayStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York',
    }).format(now);

    // Parse ET date to find day of week
    const [y, m, d] = etTodayStr.split('-').map(Number);
    const etDayOfWeek = new Date(Date.UTC(y, m - 1, d)).getUTCDay();

    // Days until next Monday (1=Monday). If today is Monday,
    // reset already passed (midnight), so next is 7 days away.
    let daysUntilMonday = (1 - etDayOfWeek + 7) % 7;
    if (daysUntilMonday === 0) daysUntilMonday = 7;

    // Next Monday's date string
    const nextMonday = new Date(Date.UTC(y, m - 1, d + daysUntilMonday));
    const nextMondayStr = nextMonday.toISOString().split('T')[0];

    // Determine ET UTC offset for that date (EDT=-4, EST=-5)
    // by formatting UTC midnight in ET and checking the hour
    const utcMidnight = new Date(nextMondayStr + 'T00:00:00Z');
    const etHourStr = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      hour: 'numeric',
      hour12: false,
    }).format(utcMidnight);
    const etHour = parseInt(etHourStr);
    const offset = etHour >= 20 ? 4 : 5; // 20=8PM EDT, 19=7PM EST

    // Reset time: next Monday at 00:00 ET = next Monday at 0offset:00 UTC
    const resetTime = new Date(nextMondayStr + `T0${offset}:00:00Z`);

    return resetTime.toLocaleString('en-US', {
      timeZone: tz,
      weekday: 'short',
      hour: 'numeric',
      minute: '2-digit',
    });
  }, [tz]);

  const currentLabel = TZ_OPTIONS.find(o => o.tz === tz)?.label || 'ET';

  return (
    <div className="relative flex items-center gap-2 bg-slate-900/60 border border-slate-800 rounded-lg px-2.5 py-1.5">
      <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
        <span>🔄</span>
        <span>Server Reset:</span>
        <span className="text-slate-200 font-semibold">{resetLabel}</span>
      </div>
      <button
        onClick={() => setShowOptions(!showOptions)}
        className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 px-1.5 py-0.5 rounded border border-slate-700 shrink-0"
      >
        {currentLabel} ▾
      </button>
      {showOptions && (
        <div className="absolute mt-7 right-2 bg-slate-800 border border-slate-700 rounded-lg overflow-hidden z-50 shadow-xl">
          {TZ_OPTIONS.map(opt => (
            <button
              key={opt.tz}
              onClick={() => { setTz(opt.tz); setShowOptions(false); }}
              className={`block w-full text-left px-3 py-1.5 text-[10px] hover:bg-slate-700 transition-colors ${tz === opt.tz ? 'text-cyan-400 font-bold' : 'text-slate-300'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}