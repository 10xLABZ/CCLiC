import React, { useMemo, useState } from "react";
import { Swords } from "lucide-react";

export default function EnemyMapMarkers({ bots, onView, playerStamina }) {
  const [flashId, setFlashId] = useState(null);

  const markers = useMemo(() => {
    const positions = [];
    const minDistance = 8;
    
    // Mayor's Office is at 50%, 44% — keep markers away from it
    const MO_X = 50, MO_Y = 44, MO_CLEAR = 14;
    return bots.map((bot) => {
      let x, y, attempts = 0;
      do {
        x = 15 + Math.random() * 70;
        y = 15 + Math.random() * 70;
        attempts++;
      } while (
        attempts < 80 &&
        (positions.some(pos => Math.hypot(pos.x - x, pos.y - y) < minDistance) ||
         Math.hypot(MO_X - x, MO_Y - y) < MO_CLEAR)
      );
      positions.push({ x, y });
      return { bot, x, y, id: bot.id };
    });
  }, [bots]);

  const handleMarkerClick = (marker) => {
    setFlashId(marker.id);
    setTimeout(() => setFlashId(null), 600);
    onView(marker.bot);
  };

  return (
    <>
      <style>{`
        @keyframes tradeWarPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.9); }
          50% { box-shadow: 0 0 0 12px rgba(239,68,68,0); }
        }
        @keyframes tradeWarFlash {
          0% { box-shadow: 0 0 0 0 rgba(239,68,68,1); }
          50% { box-shadow: 0 0 0 18px rgba(239,68,68,0.4); }
          100% { box-shadow: 0 0 0 30px rgba(239,68,68,0); }
        }
      `}</style>
      {markers.map((marker) => (
        <button
          key={marker.id}
          onClick={() => handleMarkerClick(marker)}
          className="absolute hover:scale-110 transition-transform"
          style={{ left: `${marker.x}%`, top: `${marker.y}%`, transform: 'translate(-50%, -100%)', zIndex: 5 }}
        >
          <div className="relative flex flex-col items-center">
            {/* Icon bubble */}
            <div
              className="w-11 h-11 rounded-full overflow-hidden border-2 border-white shadow-lg"
              style={{
                animation: flashId === marker.id ? 'tradeWarFlash 0.6s ease-out' : 'tradeWarPulse 2s ease-in-out infinite'
              }}
            >
              <img src="https://media.base44.com/images/public/699169456a354d6cb7082777/56e0c9331_mapicon-tradewars1.png" alt="Trade Wars" className="w-full h-full object-cover" />
            </div>
            {/* V-shape pointer */}
            <div style={{
              width: 0, height: 0,
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderTop: '10px solid #ef4444',
              marginTop: '-1px'
            }} />
            {/* Tip glow dot */}
            <div style={{
              width: '6px', height: '6px',
              borderRadius: '50%',
              background: '#ef4444',
              marginTop: '-3px',
              boxShadow: '0 0 6px 3px rgba(239,68,68,0.8)',
              animation: 'tradeWarPulse 1.4s ease-in-out infinite'
            }} />
          </div>
        </button>
      ))}
    </>
  );
}