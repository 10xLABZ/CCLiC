/**
 * ConsumableActionModal
 * Three modes:
 *   mode="confirm"  — "Buy X for $Y?" with Cancel / Confirm buttons
 *   mode="success"  — "Purchased! X added to inventory" with confetti + Close
 *   mode="result"   — "Used X! Your Y is now Z/100" with Close
 *
 * Props:
 *   open, onClose, mode,
 *   item, currency, price,          (confirm + success)
 *   newValue, resourceLabel,         (result)
 *   resourceIcon, remaining          (result)
 */
import React, { useEffect, useRef } from "react";

// Tiny canvas-confetti wrapper (uses canvas-confetti npm package if available, else CSS fallback)
function ConfettiBurst({ active }) {
  const fired = useRef(false);

  useEffect(() => {
    if (!active || fired.current) return;
    fired.current = true;

    // Simple CSS-only confetti particles as fallback
    const container = document.getElementById('cam-confetti-root');
    if (!container) return;

    const colors = ['#facc15','#34d399','#60a5fa','#f472b6','#a78bfa','#fb923c'];
    const count = 48;
    const particles = [];

    for (let i = 0; i < count; i++) {
      const el = document.createElement('div');
      const color = colors[i % colors.length];
      const left = 10 + Math.random() * 80;
      const size = 6 + Math.random() * 8;
      const duration = 900 + Math.random() * 700;
      const delay = Math.random() * 300;
      el.style.cssText = `
        position:absolute;
        left:${left}%;
        top:50%;
        width:${size}px;
        height:${size}px;
        background:${color};
        border-radius:${Math.random() > 0.5 ? '50%' : '2px'};
        pointer-events:none;
        animation:camConfetti ${duration}ms ease-out ${delay}ms forwards;
        transform-origin:center center;
        opacity:1;
        z-index:300;
      `;
      container.appendChild(el);
      particles.push(el);
    }

    const cleanup = setTimeout(() => {
      particles.forEach(p => p.remove());
      fired.current = false;
    }, 2000);

    return () => {
      clearTimeout(cleanup);
      particles.forEach(p => p.remove());
    };
  }, [active]);

  return null;
}

export default function ConsumableActionModal({
  open, onClose, mode,
  item, currency, price,
  newValue, resourceLabel, resourceIcon, remaining
}) {
  if (!open) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <>
      <style>{`
        @keyframes camConfetti {
          0%   { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; }
          60%  { opacity: 1; }
          100% { transform: translateY(-${120 + Math.random() * 80}px) rotate(${360 + Math.random() * 360}deg) scale(0.3); opacity: 0; }
        }
        @keyframes camSlideUp {
          from { transform: translateY(24px) scale(0.95); opacity: 0; }
          to   { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes camGoldPulse {
          0%, 100% { text-shadow: 0 0 8px #facc15, 0 0 20px #facc15; }
          50%       { text-shadow: 0 0 20px #facc15, 0 0 50px #fde68a; }
        }
      `}</style>

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm"
        onClick={handleBackdropClick}
      >
        {/* Confetti anchor */}
        <div id="cam-confetti-root" className="absolute inset-0 overflow-hidden pointer-events-none" />

        {/* Card */}
        <div
          className="relative bg-[#0d1320] border border-slate-600 rounded-2xl shadow-2xl w-[300px] px-5 py-5 text-white text-center"
          style={{ animation: 'camSlideUp 0.25s ease-out forwards' }}
          onClick={e => e.stopPropagation()}
        >

          {/* ── CONFIRM MODE ── */}
          {mode === "confirm" && item && (
            <>
              <div className="text-3xl mb-2">{item.icon || "📦"}</div>
              <div className="text-sm font-bold text-slate-100 mb-1">{item.name}</div>
              <div className="text-xs text-slate-400 mb-4">
                Buy for{" "}
                <span className="text-white font-semibold">
                  {currency === "cryd"
                    ? `${price} CRYD 💎`
                    : `$${typeof price === 'number' ? price.toLocaleString() : price} 💵`}
                </span>
                ?
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="flex-1 py-2 rounded-lg text-xs font-bold bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => onClose("confirm")}
                  className="flex-1 py-2 rounded-lg text-xs font-bold bg-green-600 hover:bg-green-500 text-white transition-colors"
                >
                  ✅ Confirm Buy
                </button>
              </div>
            </>
          )}

          {/* ── SUCCESS MODE (purchase complete + confetti) ── */}
          {mode === "success" && item && (
            <>
              <ConfettiBurst active={true} />
              <div className="text-4xl mb-2" style={{ animation: 'camGoldPulse 1.4s ease-in-out infinite' }}>🎉</div>
              <div className="text-base font-black text-yellow-400 mb-1" style={{ animation: 'camGoldPulse 1.4s ease-in-out infinite' }}>
                Purchased!
              </div>
              <div className="text-xs text-slate-200 font-semibold mb-1">{item.name}</div>
              <div className="text-xs text-slate-400 mb-1">added to your inventory</div>
              {price !== undefined && (
                <div className="text-[11px] text-slate-500 mb-3">
                  Paid:{" "}
                  <span className="text-white font-semibold">
                    {currency === "cryd"
                      ? `${price} CRYD 💎`
                      : `$${typeof price === 'number' ? price.toLocaleString() : price} 💵`}
                  </span>
                </div>
              )}
              <button
                onClick={onClose}
                className="w-full py-2 rounded-lg text-xs font-bold bg-yellow-600 hover:bg-yellow-500 text-white transition-colors"
              >
                Nice! Close
              </button>
            </>
          )}

          {/* ── RESULT MODE (used item) ── */}
          {mode === "result" && (
            <>
              <div className="text-3xl mb-2">✅</div>
              <div className="text-sm font-bold text-emerald-400 mb-1">Boost Applied!</div>
              <div className="text-xs text-slate-300 mb-1">
                Used <span className="text-white font-semibold">{item?.name}</span>
              </div>
              {newValue !== undefined && (
                <div className="text-xs text-slate-400 mb-1">
                  {resourceIcon} {resourceLabel}:{" "}
                  <span className="text-emerald-300 font-bold">{newValue}/100</span>
                </div>
              )}
              {remaining !== undefined && (
                <div className="text-[10px] text-slate-500 mb-3">
                  {remaining > 0 ? `${remaining} of this boost remaining` : "Last one used"}
                </div>
              )}
              <button
                onClick={onClose}
                className="w-full py-2 rounded-lg text-xs font-bold bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
              >
                Close
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}