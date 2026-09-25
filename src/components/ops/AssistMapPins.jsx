import React, { useState, useMemo, useEffect } from "react";


export default function AssistMapPins({ assists, onAssistClick }) {
  const [flashId, setFlashId] = useState(null);

  const handleClick = (assist) => {
    setFlashId(assist.id);
    setTimeout(() => setFlashId(null), 600);
    onAssistClick(assist);
  };

  const pins = useMemo(() => {
    const positions = [];
    const minDistance = 10;
    
    return assists.map((assist) => {
      let x, y, attempts = 0;
      
      do {
        x = 15 + Math.random() * 70;
        y = 15 + Math.random() * 70;
        attempts++;
      } while (
        attempts < 50 &&
        positions.some(pos => Math.hypot(pos.x - x, pos.y - y) < minDistance)
      );
      
      positions.push({ x, y });
      
      return {
        assist,
        x,
        y,
        id: assist.id
      };
    });
  }, [assists]);

  return (
    <>
      <style>{`
        @keyframes assistPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(96,165,250,0.9); }
          50% { box-shadow: 0 0 0 12px rgba(96,165,250,0); }
        }
        @keyframes assistFlash {
          0% { box-shadow: 0 0 0 0 rgba(96,165,250,1); }
          50% { box-shadow: 0 0 0 18px rgba(96,165,250,0.4); }
          100% { box-shadow: 0 0 0 30px rgba(96,165,250,0); }
        }
      `}</style>
      {pins.map((pin) => {
        const AssistTimer = () => {
          const [timeLeft, setTimeLeft] = useState(0);
          useEffect(() => {
            const updateTimer = () => {
              const remaining = Math.max(0, Math.floor((pin.assist.expiresAt - Date.now()) / 1000));
              setTimeLeft(remaining);
            };
            updateTimer();
            const interval = setInterval(updateTimer, 1000);
            return () => clearInterval(interval);
          }, []);
          return (
            <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-900/90 px-1.5 py-0.5 rounded text-[9px] text-amber-400 whitespace-nowrap" style={{ zIndex: 10 }}>
              ⏱ {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </div>
          );
        };

        return (
          <button
            key={pin.id}
            onClick={() => handleClick(pin.assist)}
            className="absolute hover:scale-110 transition-transform"
            style={{ left: `${pin.x}%`, top: `${pin.y}%`, transform: 'translate(-50%, -100%)' }}
          >
            <div className="relative flex flex-col items-center">
              {/* Icon bubble */}
              <div
                className="w-10 h-10 rounded-full border-2 border-white shadow-lg overflow-hidden"
                style={{
                  animation: flashId === pin.assist.id ? 'assistFlash 0.6s ease-out' : 'assistPulse 2s ease-in-out infinite'
                }}
              >
                <img
                  src="https://media.base44.com/images/public/699169456a354d6cb7082777/9e375fe4f_b7f85242-d893-409c-ab55-f7bc704445f1-2.png"
                  alt="Assist"
                  className="w-full h-full object-cover"
                />
              </div>
              {/* V-shape pointer */}
              <div style={{
                width: 0, height: 0,
                borderLeft: '8px solid transparent',
                borderRight: '8px solid transparent',
                borderTop: '10px solid #3b82f6',
                marginTop: '-1px'
              }} />
              {/* Tip glow dot */}
              <div style={{
                width: '6px', height: '6px',
                borderRadius: '50%',
                background: '#3b82f6',
                marginTop: '-3px',
                boxShadow: '0 0 6px 3px rgba(96,165,250,0.8)',
                animation: 'assistPulse 1.4s ease-in-out infinite'
              }} />
              <AssistTimer />
            </div>
          </button>
        );
      })}
    </>
  );
}