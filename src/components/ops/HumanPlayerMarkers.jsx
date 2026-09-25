import React, { useMemo, useState } from "react";

export default function HumanPlayerMarkers({ humanPlayers, onView }) {
  const [flashId, setFlashId] = useState(null);

  const markers = useMemo(() => {
    const positions = [];
    const minDistance = 10;

    const MO_X = 50, MO_Y = 44, MO_CLEAR = 14;
    return humanPlayers.map((player) => {
      let x, y, attempts = 0;
      do {
        x = 10 + Math.random() * 75;
        y = 10 + Math.random() * 75;
        attempts++;
      } while (
        attempts < 80 &&
        (positions.some(pos => Math.hypot(pos.x - x, pos.y - y) < minDistance) ||
         Math.hypot(MO_X - x, MO_Y - y) < MO_CLEAR)
      );
      positions.push({ x, y });
      return { player, x, y };
    });
  }, [humanPlayers.map(p => p.id).join(',')]);

  const handleClick = (marker) => {
    setFlashId(marker.player.id);
    setTimeout(() => setFlashId(null), 600);
    onView(marker.player);
  };

  return (
    <>
      <style>{`
        @keyframes humanPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.9); }
          50% { box-shadow: 0 0 0 12px rgba(239,68,68,0); }
        }
        @keyframes humanFlash {
          0% { box-shadow: 0 0 0 0 rgba(239,68,68,1); }
          50% { box-shadow: 0 0 0 18px rgba(239,68,68,0.4); }
          100% { box-shadow: 0 0 0 30px rgba(239,68,68,0); }
        }
      `}</style>
      {markers.map((marker) => (
        <button
          key={marker.player.id}
          onClick={() => handleClick(marker)}
          className="absolute hover:scale-110 transition-transform"
          style={{ left: `${marker.x}%`, top: `${marker.y}%`, transform: 'translate(-50%, -100%)', zIndex: 5 }}
        >
          <div className="relative flex flex-col items-center">
            <div
              className="w-11 h-11 rounded-full overflow-hidden border-2 border-white shadow-lg"
              style={{
                animation: flashId === marker.player.id ? 'humanFlash 0.6s ease-out' : 'humanPulse 2s ease-in-out infinite'
              }}
            >
              <img
                src="https://media.base44.com/images/public/699169456a354d6cb7082777/56e0c9331_mapicon-tradewars1.png"
                alt="Human Player"
                className="w-full h-full object-cover"
              />
            </div>
            <div style={{
              width: 0, height: 0,
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderTop: '10px solid #ef4444',
              marginTop: '-1px'
            }} />
            <div style={{
              width: '6px', height: '6px',
              borderRadius: '50%',
              background: '#ef4444',
              marginTop: '-3px',
              boxShadow: '0 0 6px 3px rgba(239,68,68,0.8)',
              animation: 'humanPulse 1.4s ease-in-out infinite'
            }} />
          </div>
        </button>
      ))}
    </>
  );
}