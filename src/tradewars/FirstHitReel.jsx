import React, { useState, useEffect, useRef } from "react";

/**
 * Slot-machine style "First Hit" reel.
 * Scrolls player/bot images rapidly L→R, slows, and stops on the winner.
 * Props:
 *   playerName, playerImage  – player info
 *   botName, botImage        – opponent info
 *   winner: 'player' | 'bot' – predetermined result
 *   onComplete()             – called when animation finishes
 */
export default function FirstHitReel({ playerName, playerImage, botName, botImage, winner, onComplete }) {
  const SLOT_W = 80; // px per card
  const GAP = 12;
  const CARD_STEP = SLOT_W + GAP;

  // Build a long repeating strip: alternating player / bot tiles
  const buildStrip = () => {
    const tiles = [];
    for (let i = 0; i < 30; i++) {
      tiles.push(i % 2 === 0 ? 'player' : 'bot');
    }
    return tiles;
  };

  const [tiles] = useState(buildStrip);
  const [offset, setOffset] = useState(0);
  const [phase, setPhase] = useState('spinning'); // 'spinning' | 'slowing' | 'done'
  const [finalOffset, setFinalOffset] = useState(null);
  const animRef = useRef(null);
  const startTimeRef = useRef(null);

  // We need the center card to be the winner.
  // The "window" shows 5 cards; center = index 2 in view.
  // Total strip width; we want a specific tile centered.
  // Container width = 5 * CARD_STEP - GAP
  const containerW = 5 * CARD_STEP - GAP;
  const centerOffset = Math.floor(containerW / 2) - Math.floor(SLOT_W / 2); // px from left where center card starts

  // Find a tile near the end of the strip that matches the winner
  const winnerTileIndex = (() => {
    // Pick a tile index ~22-26 that is the winner type
    for (let i = 25; i >= 20; i--) {
      if (tiles[i] === winner) return i;
    }
    return winner === 'player' ? 24 : 25;
  })();

  // The offset so tile[winnerTileIndex] is centered in the window
  const targetOffset = winnerTileIndex * CARD_STEP - centerOffset;

  // Spin duration
  const SPIN_DURATION = 1600; // ms fast spinning
  const SLOW_DURATION = 800;  // ms decelerating

  useEffect(() => {
    startTimeRef.current = performance.now();

    const animate = (now) => {
      const elapsed = now - startTimeRef.current;

      if (elapsed < SPIN_DURATION) {
        // Fast spin: linearly advance offset, looping
        const speed = 18; // px per frame-equivalent (60fps → ~300px/s)
        setOffset(prev => (prev + speed) % (tiles.length * CARD_STEP));
        animRef.current = requestAnimationFrame(animate);
      } else if (elapsed < SPIN_DURATION + SLOW_DURATION) {
        // Easing into target
        const t = (elapsed - SPIN_DURATION) / SLOW_DURATION;
        const ease = 1 - Math.pow(1 - t, 3); // cubic ease-out
        const start = (tiles.length / 2) * CARD_STEP; // approximate mid-spin offset
        const interpolated = start + (targetOffset - start) * ease;
        setOffset(interpolated);
        animRef.current = requestAnimationFrame(animate);
      } else {
        // Done
        setOffset(targetOffset);
        setPhase('done');
      }
    };

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  useEffect(() => {
    if (phase === 'done') {
      const t = setTimeout(() => onComplete(), 1200);
      return () => clearTimeout(t);
    }
  }, [phase]);

  const winnerName = winner === 'player' ? playerName : botName;

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.92)' }}
    >
      {/* Title */}
      <div
        className="text-3xl font-black tracking-widest mb-5 uppercase"
        style={{
          color: '#facc15',
          textShadow: '0 0 20px rgba(250,204,21,0.8), 0 2px 4px rgba(0,0,0,0.8)',
          letterSpacing: '0.2em'
        }}
      >
        FIRST HIT
      </div>

      {/* Reel window */}
      <div
        style={{
          width: containerW,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Center highlight frame */}
        <div
          style={{
            position: 'absolute',
            left: centerOffset - 4,
            top: -4,
            width: SLOT_W + 8,
            height: SLOT_W + 8 + 24, // card + name label
            border: '4px solid #facc15',
            borderRadius: 10,
            boxShadow: phase === 'done'
              ? '0 0 24px 6px rgba(250,204,21,0.7)'
              : '0 0 12px 2px rgba(250,204,21,0.4)',
            zIndex: 10,
            pointerEvents: 'none',
            transition: 'box-shadow 0.4s ease'
          }}
        />

        {/* Scrolling strip */}
        <div
          style={{
            display: 'flex',
            gap: GAP,
            transform: `translateX(${-offset}px)`,
            willChange: 'transform',
          }}
        >
          {tiles.map((type, i) => {
            const img = type === 'player' ? playerImage : botImage;
            const name = type === 'player' ? playerName : botName;
            const isPlayerType = type === 'player';
            return (
              <div
                key={i}
                style={{
                  width: SLOT_W,
                  flexShrink: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <div
                  style={{
                    width: SLOT_W,
                    height: SLOT_W,
                    borderRadius: 8,
                    border: `2px solid ${isPlayerType ? '#10b981' : '#ef4444'}`,
                    background: '#0a0f1a',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {img ? (
                    <img src={img} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: 32 }}>🧑‍💼</span>
                  )}
                </div>
                <div
                  style={{
                    fontSize: 9,
                    color: isPlayerType ? '#10b981' : '#ef4444',
                    fontWeight: 700,
                    maxWidth: SLOT_W,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    textAlign: 'center'
                  }}
                >
                  {name}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Winner announcement */}
      <div
        style={{
          marginTop: 24,
          minHeight: 36,
          transition: 'opacity 0.4s ease',
          opacity: phase === 'done' ? 1 : 0,
          textAlign: 'center'
        }}
      >
        <div
          className="text-xl font-black uppercase tracking-wide"
          style={{
            color: winner === 'player' ? '#10b981' : '#ef4444',
            textShadow: winner === 'player'
              ? '0 0 16px rgba(16,185,129,0.8)'
              : '0 0 16px rgba(239,68,68,0.8)'
          }}
        >
          {winnerName} gets First Hit!
        </div>
      </div>
    </div>
  );
}