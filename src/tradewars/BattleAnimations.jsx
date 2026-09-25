import React, { useState, useEffect, useRef } from "react";

// Image URLs
const GUNSHOT_IMG = "https://media.base44.com/images/public/699169456a354d6cb7082777/1491530eb_gunshot.png";
const CUT_SLICE1_IMG = "https://media.base44.com/images/public/699169456a354d6cb7082777/d8091d210_cut-slice.png";
const ARROW_HIT_IMG = "https://media.base44.com/images/public/699169456a354d6cb7082777/bfd71cc79_arrowhit.png";
const CUT_SLICE2_IMG = "https://media.base44.com/images/public/699169456a354d6cb7082777/0855f1cac_cut-slice2.png";
const SHOTGUN_IMG = "https://media.base44.com/images/public/699169456a354d6cb7082777/a67c4c0e3_shotgun.png";
const FLASH_HIT_IMG = "https://media.base44.com/images/public/699169456a354d6cb7082777/c83df1c9d_flashhit.png";
const KAMIKAZE_DRONE_IMG = "https://media.base44.com/images/public/699169456a354d6cb7082777/105c31c06_kamikazedroneaction.png";
const FREEZESHOT1_IMG = "https://media.base44.com/images/public/699169456a354d6cb7082777/48349d474_freezeshot1.png";
const FREEZESHOT2_IMG = "https://media.base44.com/images/public/699169456a354d6cb7082777/f32bca151_freezeshot2.png";
const FREEZESHOT3_IMG = "https://media.base44.com/images/public/699169456a354d6cb7082777/270f1c49c_freezeshot3.png";
const FLAMEBLAST_FRAMES = [
  "https://media.base44.com/images/public/699169456a354d6cb7082777/30f6dfd03_flameblast0.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/9e03a7461_flameblast0a.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/00626f0df_flameblast1.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/323454903_flameblast1a.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/b876697c8_flameblast2.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/394272583_flameblast2a.png",
];
const NUKE_BOMB_IMG = "https://media.base44.com/images/public/699169456a354d6cb7082777/94366640f_nukebomb1.png";
const NUKE_BG_IMGS = Array.from({ length: 15 }, (_, i) =>
  `https://media.base44.com/images/public/699169456a354d6cb7082777/${[
    'de0c5d841_nukehitbg1.png','438f6a833_nukehitbg2.png','34085ff2f_nukehitbg3.png',
    '6d651f769_nukehitbg4.png','0a4b91698_nukehitbg5.png','552ef2c15_nukehitbg6.png',
    'cbc169f3f_nukehitbg7.png','feaf32ae7_nukehitbg8.png','76dbfea56_nukehitbg9.png',
    '020e42a15_nukehitbg10.png','548c70cce_nukehitbg11.png','156be5670_nukehitbg12.png',
    '4b6b6b895_nukehitbg13.png','46f579496_nukehitbg14.png','21dec6d17_nukehitbg15.png'
  ][i]}`
);

// Beam of Death frames: laser1, laser2, laser1a, laser2a — loop
const LASER_FRAMES = [
  "https://media.base44.com/images/public/699169456a354d6cb7082777/074667318_laser1.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/4363bc0c9_laser2.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/9f73b7ba8_laser1a.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/af5e9fd3a_laser2a.png",
];

// Poison Gas frames: flashhit then poisongas1-8
const POISON_GAS_FRAMES = [
  "https://media.base44.com/images/public/699169456a354d6cb7082777/f5d7371a4_poisongas1.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/d12cd67ab_poisongas2.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/e36d0894c_poisongas3.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/7f983fef8_poisongas4.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/cce1056d6_poisongas5.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/1fe135920_poisongas6.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/2137e560d_poisongas7.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/cc1ebc4fd_poisongas8.png",
];

// EMP frames: emp1-9
const EMP_FRAMES = [
  "https://media.base44.com/images/public/699169456a354d6cb7082777/f26c5cea5_emp1.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/8a9a27c6c_emp2.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/e031a7901_emp3.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/b25354e37_emp4.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/02f971b21_emp5.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/dd2c39694_emp6.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/b15099400_emp7.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/c4670a087_emp8.png",
  "https://media.base44.com/images/public/699169456a354d6cb7082777/f0137c50a_emp9.png",
];

// Determine attack type from all equipped weapons
export function getAttackType(loadout, allWeapons) {
  const weaponIds = [loadout?.weapon1, loadout?.weapon2, loadout?.weapon3, loadout?.weapon4].filter(Boolean);
  const weapons = weaponIds.map(id => allWeapons.find(w => w.id === id)).filter(Boolean);

  // Beam of Death (highest priority special)
  if (weapons.some(w => w.name?.toLowerCase().includes('beam of death'))) return 'beam_of_death';

  // EMP Device
  if (weapons.some(w => w.name?.toLowerCase().includes('emp device'))) return 'emp';

  // Poison Gas Grenade
  if (weapons.some(w => w.name?.toLowerCase().includes('poison gas'))) return 'poison_gas';

  // Killer Ray Gun
  if (weapons.some(w => w.name?.toLowerCase().includes('killer ray gun'))) return 'killer_ray_gun';

  // Nuke
  if (weapons.some(w => w.name?.toLowerCase().includes('nuke'))) return 'nuke';

  // Cryo Cannon
  if (weapons.some(w => w.id === 'F_CRYO_CANNON' || w.name?.toLowerCase().includes('cryo cannon'))) return 'cryo_cannon';

  // Napalm-X
  if (weapons.some(w => w.id === 'F_NAPALM_X' || w.name?.toLowerCase().includes('napalm'))) return 'napalm_x';

  // Kamikaze Drone (check before killer drone)
  if (weapons.some(w => w.id === 'F_KAMIKAZE_DRONE' || w.name?.toLowerCase().includes('kamikaze drone'))) return 'kamikaze_drone';

  // Killer drone
  if (weapons.some(w => w.name?.toLowerCase().includes('killer drone'))) return 'drone';

  // Shotgun
  const shotgunNames = ['shotgun', 'shotty'];
  if (weapons.some(w => shotgunNames.some(n => w.name?.toLowerCase().includes(n)))) return 'shotgun';

  // Crossbow
  if (weapons.some(w => w.name?.toLowerCase().includes('crossbow'))) return 'arrow';

  // Slice/cut weapons
  const sliceNames = ['knife', 'broken', 'glass', 'shank', 'blade', 'sword', 'unknown prototype', 'machete', 'slash', 'cleaver'];
  if (weapons.some(w => sliceNames.some(n => w.name?.toLowerCase().includes(n)))) return 'slice';

  // Blunt / flash weapons
  const bluntNames = ['flashbang', 'taser', 'explosive', 'bat', 'club', 'wrench', 'plank', 'mug', 'stapler', 'crowbar', 'brass', 'knuckle', 'punch', 'fist'];
  if (weapons.some(w => bluntNames.some(n => w.name?.toLowerCase().includes(n)))) return 'flash';

  // Firearms (guns)
  const gunNames = ['pistol', 'revolver', 'rifle', 'gun', 'sniper', 'carbine', 'smg', 'lmg', 'glocker', 'golden eagle', 'eagle', 'flanker', 'prototype', 'beam', 'ray', 'grenade', 'gas', 'drone'];
  if (weapons.some(w => gunNames.some(n => w.name?.toLowerCase().includes(n)))) return 'gun';

  // Check isFirearm flag
  if (weapons.some(w => w.isFirearm)) return 'gun';

  return 'flash';
}

function randomPos(maxX = 70, maxY = 70) {
  return { x: Math.floor(Math.random() * maxX), y: Math.floor(Math.random() * maxY) };
}

// --- Beam of Death Animation ---
function BeamOfDeathOverlay({ onDone }) {
  const [phase, setPhase] = useState('white_flash'); // white_flash -> laser_loop -> red_fade -> white_end -> done
  const [laserFrame, setLaserFrame] = useState(0);
  const [redOpacity, setRedOpacity] = useState(0);

  useEffect(() => {
    // Phase 1: white flash for 200ms
    const t1 = setTimeout(() => {
      setPhase('laser_loop');
    }, 200);
    return () => clearTimeout(t1);
  }, []);

  // Laser loop: cycle frames every 120ms for ~2.4s (20 frames = 5 loops of 4)
  useEffect(() => {
    if (phase !== 'laser_loop') return;
    let frame = 0;
    let count = 0;
    const interval = setInterval(() => {
      frame = (frame + 1) % 4;
      setLaserFrame(frame);
      count++;
      if (count >= 20) {
        clearInterval(interval);
        setPhase('red_fade');
      }
    }, 120);
    return () => clearInterval(interval);
  }, [phase]);

  // Red fade
  useEffect(() => {
    if (phase !== 'red_fade') return;
    setRedOpacity(0);
    let op = 0;
    const interval = setInterval(() => {
      op += 0.1;
      setRedOpacity(op);
      if (op >= 0.7) {
        clearInterval(interval);
        setPhase('white_end');
      }
    }, 50);
    return () => clearInterval(interval);
  }, [phase]);

  // White end flash then done
  useEffect(() => {
    if (phase !== 'white_end') return;
    const t = setTimeout(() => {
      setPhase('done');
      onDone && onDone();
    }, 300);
    return () => clearTimeout(t);
  }, [phase]);

  if (phase === 'done') return null;

  return (
    <>
      {phase === 'white_flash' && (
        <div className="absolute inset-0 z-30 bg-white pointer-events-none" style={{ opacity: 0.95 }} />
      )}
      {phase === 'laser_loop' && (
        <img
          src={LASER_FRAMES[laserFrame]}
          alt="laser"
          className="absolute inset-0 w-full h-full object-cover z-25 pointer-events-none"
          style={{ opacity: 0.95 }}
        />
      )}
      {phase === 'red_fade' && (
        <>
          <img
            src={LASER_FRAMES[laserFrame]}
            alt="laser"
            className="absolute inset-0 w-full h-full object-cover z-25 pointer-events-none"
          />
          <div className="absolute inset-0 z-28 pointer-events-none" style={{ background: `rgba(200,0,0,${redOpacity})` }} />
        </>
      )}
      {phase === 'white_end' && (
        <div className="absolute inset-0 z-30 bg-white pointer-events-none" style={{ opacity: 0.9 }} />
      )}
    </>
  );
}

// --- Poison Gas Animation ---
function PoisonGasOverlay({ onDone }) {
  const [phase, setPhase] = useState('flash'); // flash -> frames -> green_fade -> done
  const [frame, setFrame] = useState(0);
  const [greenOpacity, setGreenOpacity] = useState(0);

  useEffect(() => {
    // flash for 200ms
    const t1 = setTimeout(() => setPhase('frames'), 200);
    return () => clearTimeout(t1);
  }, []);

  useEffect(() => {
    if (phase !== 'frames') return;
    let f = 0;
    const interval = setInterval(() => {
      f++;
      setFrame(f);
      if (f >= POISON_GAS_FRAMES.length - 1) {
        clearInterval(interval);
        setPhase('green_fade');
      }
    }, 180);
    return () => clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'green_fade') return;
    let op = 0;
    const interval = setInterval(() => {
      op += 0.1;
      setGreenOpacity(op);
      if (op >= 0.75) {
        clearInterval(interval);
        setPhase('done');
        onDone && onDone();
      }
    }, 50);
    return () => clearInterval(interval);
  }, [phase]);

  if (phase === 'done') return null;

  return (
    <>
      {phase === 'flash' && (
        <img src={FLASH_HIT_IMG} alt="flash" className="absolute inset-0 w-full h-full object-cover z-30 pointer-events-none" style={{ opacity: 0.9 }} />
      )}
      {(phase === 'frames' || phase === 'green_fade') && (
        <img
          src={POISON_GAS_FRAMES[frame]}
          alt="poison gas"
          className="absolute inset-0 w-full h-full object-cover z-25 pointer-events-none"
          style={{ opacity: 0.92 }}
        />
      )}
      {phase === 'green_fade' && (
        <div className="absolute inset-0 z-28 pointer-events-none" style={{ background: `rgba(0,180,0,${greenOpacity})` }} />
      )}
    </>
  );
}

// --- EMP Animation ---
function EmpOverlay({ onDone }) {
  const [phase, setPhase] = useState('flash'); // flash -> frames -> done
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('frames'), 200);
    return () => clearTimeout(t1);
  }, []);

  useEffect(() => {
    if (phase !== 'frames') return;
    let f = 0;
    const interval = setInterval(() => {
      f++;
      setFrame(f);
      if (f >= EMP_FRAMES.length - 1) {
        clearInterval(interval);
        setPhase('done');
        onDone && onDone();
      }
    }, 160);
    return () => clearInterval(interval);
  }, [phase]);

  if (phase === 'done') return null;

  return (
    <>
      {phase === 'flash' && (
        <img src={FLASH_HIT_IMG} alt="flash" className="absolute inset-0 w-full h-full object-cover z-30 pointer-events-none" style={{ opacity: 0.9 }} />
      )}
      {phase === 'frames' && (
        <img
          src={EMP_FRAMES[frame]}
          alt="emp"
          className="absolute inset-0 w-full h-full object-cover z-25 pointer-events-none"
          style={{ opacity: 0.93 }}
        />
      )}
    </>
  );
}

// --- Cryo Cannon Animation ---
// Sequence: fs1, fs2, fs3, fs2, fs1, fs2, fs3 — blue fade starts after first fs3 (idx 3)
function CryoCannonOverlay({ onDone }) {
  const CRYO_SEQUENCE = [
    FREEZESHOT1_IMG, FREEZESHOT2_IMG, FREEZESHOT3_IMG,
    FREEZESHOT2_IMG, FREEZESHOT1_IMG, FREEZESHOT2_IMG, FREEZESHOT3_IMG
  ];
  const [frameIdx, setFrameIdx] = useState(0);
  const [blueOpacity, setBlueOpacity] = useState(0);
  const [done, setDone] = useState(false);
  const fadeRef = useRef(null);

  useEffect(() => {
    let idx = 0;
    const tick = setInterval(() => {
      idx++;
      if (idx >= CRYO_SEQUENCE.length) {
        clearInterval(tick);
        if (fadeRef.current) clearInterval(fadeRef.current);
        setDone(true);
        onDone && onDone();
        return;
      }
      setFrameIdx(idx);
      // Start blue fade when we transition from first fs3 → fs2 (idx === 3)
      if (idx === 3 && !fadeRef.current) {
        let op = 0;
        fadeRef.current = setInterval(() => {
          op += 0.035;
          setBlueOpacity(Math.min(op, 0.55));
          if (op >= 0.55) { clearInterval(fadeRef.current); fadeRef.current = null; }
        }, 50);
      }
    }, 300);
    return () => {
      clearInterval(tick);
      if (fadeRef.current) clearInterval(fadeRef.current);
    };
  }, []);

  if (done) return null;
  return (
    <>
      <img
        src={CRYO_SEQUENCE[frameIdx]}
        alt="cryo shot"
        className="absolute inset-0 w-full h-full object-cover z-25 pointer-events-none"
        style={{ opacity: 0.93 }}
      />
      {blueOpacity > 0 && (
        <div
          className="absolute inset-0 z-28 pointer-events-none"
          style={{ background: `rgba(0, 110, 255, ${blueOpacity})` }}
        />
      )}
    </>
  );
}

// --- Napalm-X Animation (frames 0,0a,1,1a,2,2a — red fade starts at 1a) ---
function NapalmXOverlay({ onDone }) {
  const [frameIdx, setFrameIdx] = useState(0);
  const [redOpacity, setRedOpacity] = useState(0);
  const [done, setDone] = useState(false);
  const fadeRef = useRef(null);

  useEffect(() => {
    let idx = 0;
    const tick = setInterval(() => {
      idx++;
      if (idx >= FLAMEBLAST_FRAMES.length) {
        clearInterval(tick);
        if (fadeRef.current) clearInterval(fadeRef.current);
        setDone(true);
        onDone && onDone();
        return;
      }
      setFrameIdx(idx);
      // Start red fade when hitting frame index 3 (1a)
      if (idx === 3 && !fadeRef.current) {
        let op = 0;
        fadeRef.current = setInterval(() => {
          op += 0.04;
          setRedOpacity(Math.min(op, 0.60));
          if (op >= 0.60) { clearInterval(fadeRef.current); fadeRef.current = null; }
        }, 45);
      }
    }, 300);
    return () => {
      clearInterval(tick);
      if (fadeRef.current) clearInterval(fadeRef.current);
    };
  }, []);

  if (done) return null;
  return (
    <>
      <img
        src={FLAMEBLAST_FRAMES[frameIdx]}
        alt="napalm blast"
        className="absolute inset-0 w-full h-full object-cover z-25 pointer-events-none"
        style={{ opacity: 0.94 }}
      />
      {redOpacity > 0 && (
        <div
          className="absolute inset-0 z-28 pointer-events-none"
          style={{ background: `rgba(220, 30, 0, ${redOpacity})` }}
        />
      )}
    </>
  );
}

// --- Kamikaze Drone Animation (2 drops, each ends in flashhit + shake) ---
function KamikazeDroneOverlay({ onDone, onShake }) {
  const [phase, setPhase] = useState('drop1'); // drop1 -> flash1 -> drop2 -> flash2 -> done
  const [droneY, setDroneY] = useState(-80);
  const [showFlash, setShowFlash] = useState(false);
  const animRef = useRef(null);

  const startDrop = (onLand) => {
    let y = -80;
    setDroneY(y);
    const interval = setInterval(() => {
      y += 14;
      setDroneY(y);
      // Drop to bottom (~70% of container) instead of 25%
      if (y >= 140) {
        clearInterval(interval);
        onLand();
      }
    }, 45);
    animRef.current = interval;
  };

  useEffect(() => {
    // Drop 1
    startDrop(() => {
      setShowFlash(true);
      onShake && onShake();
      setTimeout(() => {
        setShowFlash(false);
        setPhase('drop2');
      }, 500);
    });
    return () => clearInterval(animRef.current);
  }, []);

  useEffect(() => {
    if (phase !== 'drop2') return;
    startDrop(() => {
      setShowFlash(true);
      onShake && onShake();
      setTimeout(() => {
        setShowFlash(false);
        setPhase('done');
        onDone && onDone();
      }, 500);
    });
  }, [phase]);

  if (phase === 'done') return null;

  return (
    <>
      {!showFlash && (phase === 'drop1' || phase === 'drop2') && (
        <img
          src={KAMIKAZE_DRONE_IMG}
          alt="kamikaze drone"
          className="absolute z-30 pointer-events-none"
          style={{
            width: 70,
            left: '50%',
            transform: 'translateX(-50%)',
            top: droneY,
            filter: 'drop-shadow(0 0 8px rgba(255,80,0,0.8))',
          }}
        />
      )}
      {showFlash && (
        <img
          src={FLASH_HIT_IMG}
          alt="explosion"
          className="absolute inset-0 w-full h-full object-cover z-30 pointer-events-none"
          style={{ opacity: 0.95 }}
        />
      )}
    </>
  );
}

// --- Killer Ray Gun Animation (20 gunshots spread over 3s) ---
function KillerRayGunOverlay({ onDone }) {
  const [shots, setShots] = useState([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const timeouts = [];
    for (let i = 0; i < 20; i++) {
      const t = setTimeout(() => {
        const pos = { x: Math.floor(Math.random() * 75), y: Math.floor(Math.random() * 75), id: Date.now() + i };
        setShots(prev => [...prev, pos]);
        // Remove each shot after 600ms
        setTimeout(() => setShots(prev => prev.filter(s => s.id !== pos.id)), 600);
      }, (i / 19) * 2800);
      timeouts.push(t);
    }
    // End after 3s
    const endT = setTimeout(() => {
      setDone(true);
      onDone && onDone();
    }, 3200);
    timeouts.push(endT);
    return () => timeouts.forEach(clearTimeout);
  }, []);

  if (done) return null;

  return (
    <>
      {shots.map((shot) => (
        <img
          key={shot.id}
          src={GUNSHOT_IMG}
          alt="shot"
          className="absolute z-25 pointer-events-none"
          style={{
            left: `${shot.x}%`,
            top: `${shot.y}%`,
            width: '55%',
            opacity: 0.9,
            transform: `rotate(${Math.random() * 60 - 30}deg)`,
          }}
        />
      ))}
    </>
  );
}

// Overlay images shown on the defender's avatar box
export function HitOverlay({ attackType, active, onDone, onShake }) {
  const [nukePhase, setNukePhase] = useState('idle');
  const [nukeBgFrame, setNukeBgFrame] = useState(0);
  const [nukeForward, setNukeForward] = useState(true);
  const [nukeBombY, setNukeBombY] = useState(-60);
  const [showWhiteFlash, setShowWhiteFlash] = useState(false);
  const [splats, setSplats] = useState([]);
  const phaseRef = useRef(nukePhase);
  phaseRef.current = nukePhase;

  // Special overlay keys — reset on each activation
  const [specialKey, setSpecialKey] = useState(0);

  useEffect(() => {
    if (!active) {
      setNukePhase('idle');
      setNukeBombY(-60);
      setShowWhiteFlash(false);
      setSplats([]);
      return;
    }

    // Special full-overlay attacks — use keyed child components
    if (attackType === 'beam_of_death' || attackType === 'poison_gas' || attackType === 'emp' || attackType === 'killer_ray_gun' || attackType === 'kamikaze_drone' || attackType === 'cryo_cannon' || attackType === 'napalm_x') {
      setSpecialKey(k => k + 1);
      return;
    }

    if (attackType === 'nuke') {
      setShowWhiteFlash(true);
      let flashes = 0;
      const flashInterval = setInterval(() => {
        flashes++;
        setShowWhiteFlash(f => !f);
        if (flashes >= 6) {
          clearInterval(flashInterval);
          setShowWhiteFlash(false);
          setNukePhase('bomb');
          setNukeBombY(-60);
        }
      }, 160);
      return;
    }

    // Non-nuke: generate splat positions
    let positions = [];
    if (attackType === 'shotgun') {
      positions = [{ x: 20, y: 35 }];
    } else if (attackType === 'slice') {
      positions = [randomPos(), randomPos()];
    } else {
      positions = [randomPos(), randomPos(), randomPos()];
    }
    setSplats(positions);
    const t = setTimeout(() => { setSplats([]); onDone && onDone(); }, 1800);
    return () => clearTimeout(t);
  }, [active, attackType]);

  // Nuke bomb drop animation
  useEffect(() => {
    if (nukePhase !== 'bomb') return;
    const interval = setInterval(() => {
      setNukeBombY(y => {
        const next = y + 12;
        if (next >= 160) {
          clearInterval(interval);
          setShowWhiteFlash(true);
          setTimeout(() => {
            setShowWhiteFlash(false);
            setNukePhase('mushroom');
            setNukeBgFrame(0);
            setNukeForward(true);
          }, 300);
          return 160;
        }
        return next;
      });
    }, 40);
    return () => clearInterval(interval);
  }, [nukePhase]);

  // Nuke mushroom animation
  useEffect(() => {
    if (nukePhase !== 'mushroom') return;
    const interval = setInterval(() => {
      setNukeBgFrame(f => {
        if (nukeForward) {
          if (f >= 14) { setNukeForward(false); return 14; }
          return f + 1;
        } else {
          if (f <= 7) {
            clearInterval(interval);
            setNukePhase('done');
            onDone && onDone();
            return 7;
          }
          return f - 1;
        }
      });
    }, 120);
    return () => clearInterval(interval);
  }, [nukePhase, nukeForward]);

  if (!active) return null;

  // Special full-cover animations
  if (attackType === 'beam_of_death') {
    return <BeamOfDeathOverlay key={specialKey} onDone={onDone} />;
  }
  if (attackType === 'poison_gas') {
    return <PoisonGasOverlay key={specialKey} onDone={onDone} />;
  }
  if (attackType === 'emp') {
    return <EmpOverlay key={specialKey} onDone={onDone} />;
  }
  if (attackType === 'killer_ray_gun') {
    return <KillerRayGunOverlay key={specialKey} onDone={onDone} />;
  }
  if (attackType === 'kamikaze_drone') {
    return <KamikazeDroneOverlay key={specialKey} onDone={onDone} onShake={onShake} />;
  }
  if (attackType === 'cryo_cannon') {
    return <CryoCannonOverlay key={specialKey} onDone={onDone} />;
  }
  if (attackType === 'napalm_x') {
    return <NapalmXOverlay key={specialKey} onDone={onDone} />;
  }

  const imgSrc = attackType === 'slice' ? CUT_SLICE1_IMG :
                 attackType === 'arrow' ? ARROW_HIT_IMG :
                 attackType === 'shotgun' ? SHOTGUN_IMG :
                 attackType === 'gun' ? GUNSHOT_IMG :
                 FLASH_HIT_IMG;

  if (attackType === 'nuke') {
    return (
      <>
        {showWhiteFlash && (
          <div className="absolute inset-0 z-30 bg-white opacity-90 pointer-events-none" />
        )}
        {nukePhase === 'bomb' && (
          <img
            src={NUKE_BOMB_IMG}
            alt="nuke"
            className="absolute z-30 pointer-events-none"
            style={{ width: 50, left: '50%', transform: 'translateX(-50%)', top: nukeBombY, transition: 'none' }}
          />
        )}
        {nukePhase === 'mushroom' && (
          <img
            src={NUKE_BG_IMGS[nukeBgFrame]}
            alt="nuke cloud"
            className="absolute inset-0 w-full h-full object-cover z-10 pointer-events-none opacity-90"
          />
        )}
      </>
    );
  }

  return (
    <>
      {splats.map((pos, i) => (
        <img
          key={i}
          src={attackType === 'slice' ? (i % 2 === 0 ? CUT_SLICE1_IMG : CUT_SLICE2_IMG) : imgSrc}
          alt="hit"
          className="absolute z-20 pointer-events-none"
          style={{
            left: `${pos.x}%`,
            top: `${pos.y}%`,
            width: attackType === 'shotgun' ? '80%' : attackType === 'slice' ? '70%' : '55%',
            opacity: 0.92,
            transform: `rotate(${Math.random() * 60 - 30}deg)`,
          }}
        />
      ))}
    </>
  );
}

// HP floater: "-54 HP" rises up then fades
export function HpFloater({ damage, triggerKey }) {
  const [visible, setVisible] = useState(false);
  const [gone, setGone] = useState(false);
  const prevKey = useRef(null);

  useEffect(() => {
    if (triggerKey === null || triggerKey === undefined || triggerKey === prevKey.current || !damage) return;
    prevKey.current = triggerKey;
    setVisible(true);
    setGone(false);
    const t1 = setTimeout(() => setGone(true), 900);
    const t2 = setTimeout(() => setVisible(false), 1300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [triggerKey, damage]);

  if (!visible) return null;
  return (
    <div
      className="absolute z-40 pointer-events-none font-black text-red-400 text-base select-none"
      style={{
        left: '50%', top: '40%',
        transform: `translateX(-50%) translateY(${gone ? '-40px' : '0px'})`,
        opacity: gone ? 0 : 1,
        transition: 'transform 0.9s ease-out, opacity 0.4s ease-in 0.9s',
        textShadow: '0 0 8px rgba(255,0,0,0.8)',
      }}
    >
      -{Math.round(damage)} HP
    </div>
  );
}

// CSS for shake animation — inject once
export const SHAKE_STYLE = `
  @keyframes avatarShake {
    0%,100%{transform:translate(0,0) rotate(0deg);}
    10%{transform:translate(-6px,3px) rotate(-2deg);}
    20%{transform:translate(6px,-3px) rotate(2deg);}
    30%{transform:translate(-5px,5px) rotate(-1deg);}
    40%{transform:translate(5px,-2px) rotate(1.5deg);}
    50%{transform:translate(-4px,4px) rotate(-2deg);}
    60%{transform:translate(4px,-4px) rotate(1deg);}
    70%{transform:translate(-3px,2px) rotate(-1deg);}
    80%{transform:translate(3px,-3px) rotate(0.5deg);}
    90%{transform:translate(-2px,2px) rotate(-0.5deg);}
  }
  @keyframes avatarShakeHard {
    0%,100%{transform:translate(0,0) rotate(0deg);}
    5%{transform:translate(-10px,5px) rotate(-3deg);}
    10%{transform:translate(10px,-6px) rotate(3deg);}
    15%{transform:translate(-9px,8px) rotate(-2deg);}
    20%{transform:translate(9px,-5px) rotate(2.5deg);}
    25%{transform:translate(-8px,7px) rotate(-3deg);}
    30%{transform:translate(8px,-7px) rotate(2deg);}
    35%{transform:translate(-7px,5px) rotate(-2deg);}
    40%{transform:translate(7px,-6px) rotate(1.5deg);}
    45%{transform:translate(-6px,4px) rotate(-1.5deg);}
    50%{transform:translate(6px,-5px) rotate(1deg);}
    55%{transform:translate(-5px,5px) rotate(-1deg);}
    60%{transform:translate(5px,-4px) rotate(1deg);}
    65%{transform:translate(-4px,3px) rotate(-0.5deg);}
    70%{transform:translate(4px,-3px) rotate(0.5deg);}
    80%{transform:translate(-3px,2px) rotate(-0.5deg);}
    90%{transform:translate(2px,-2px) rotate(0.3deg);}
  }
  .shake-normal { animation: avatarShake 0.5s ease-in-out; }
  .shake-hard { animation: avatarShakeHard 3.5s ease-in-out; }
`;