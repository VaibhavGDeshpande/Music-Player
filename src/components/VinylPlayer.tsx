"use client";

import { useEffect, useRef, useState } from "react";

interface VinylPlayerProps {
  isPlaying: boolean;
  albumArt: string;
  trackTitle: string;
  artist: string;
  progress?: number; // 0 to 1
  onToggle: () => void;
  onSeek?: (progress: number) => void;
  variant?: "wood" | "minimal";
}

export default function VinylPlayer({
  isPlaying,
  albumArt,
  trackTitle,
  artist,
  progress = 0,
  onToggle,
  onSeek,
  variant = "wood",
}: VinylPlayerProps) {
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragAngle, setDragAngle] = useState<number | null>(null);
  const [dragProgress, setDragProgress] = useState<number | null>(null);
  const [isOnPlate, setIsOnPlate] = useState(false);
  
  // Track if the arm is currently parked off the record
  const [isParked, setIsParked] = useState(!isPlaying && progress === 0);
  const [isResetting, setIsResetting] = useState(false);

  const requestRef = useRef<number | null>(null);
  const previousTimeRef = useRef<number | null>(null);
  const pivotRef = useRef<SVGCircleElement | null>(null);
  const previousTrackRef = useRef<string>(trackTitle);

  // If the user presses play externally, unpark the arm automatically
  // (unless we are in the middle of a physical reset animation)
  useEffect(() => {
    if (isPlaying && isParked && !isResetting) {
      setIsParked(false);
    }
  }, [isPlaying, isParked, isResetting]);

  // When a new song starts, physically reset the needle to the dock first!
  useEffect(() => {
    if (previousTrackRef.current !== trackTitle) {
      previousTrackRef.current = trackTitle;
      
      setIsParked(true);
      setIsResetting(true);
      
      // Wait for the arm to swing back to the rest position before dropping it on the new track
      const timer = setTimeout(() => {
        setIsResetting(false);
      }, 800);
      
      return () => clearTimeout(timer);
    }
  }, [trackTitle]);

  // Smooth rotation
  useEffect(() => {
    const animate = (time: number) => {
      if (previousTimeRef.current !== null) {
        const deltaTime = time - previousTimeRef.current;
        // Spin speed: 33.3 RPM -> approx 0.2deg per ms
        if (isPlaying) {
          setRotation((prev) => (prev + deltaTime * 0.2) % 360);
        }
      }
      previousTimeRef.current = time;
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying]);

  // Handle Drag / Pointer events
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return; // Only respond to primary click
    e.preventDefault();
    setIsDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    updateDragPosition(e.clientX, e.clientY, true); // True to seek immediately on click
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    updateDragPosition(e.clientX, e.clientY, true); // True to seek continuously while dragging
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    
    if (isOnPlate && dragProgress !== null) {
      setIsParked(false);
      if (!isPlaying) {
        onToggle(); // Drop needle on plate -> play!
      }
    } else {
      // Off the plate (resting position)
      setIsParked(true);
      if (isPlaying) {
        onToggle(); // Park needle -> pause!
      }
    }
    setDragAngle(null);
    setDragProgress(null);
    setIsOnPlate(false);
  };

  const updateDragPosition = (clientX: number, clientY: number, triggeringSeek: boolean = false) => {
    if (!pivotRef.current) return;
    
    const pivotRect = pivotRef.current.getBoundingClientRect();
    const pivotX = pivotRect.left + pivotRect.width / 2;
    const pivotY = pivotRect.top + pivotRect.height / 2;
    
    const dx = clientX - pivotX;
    const dy = clientY - pivotY;
    
    // Calculate world angle in degrees relative to pivot center
    // (Right = 0, Down = 90, Left = 180)
    let worldAngle = Math.atan2(dy, dx) * (180 / Math.PI);
    if (worldAngle < 0) worldAngle += 360;
    
    let clampedAngle = 0;
    let progressVal = 0;
    let onPlateVal = false;
    
    if (variant === "wood") {
      // Wood params: Rest=75, Start=93.5, End=119.4
      clampedAngle = Math.max(65, Math.min(130, worldAngle));
      progressVal = (clampedAngle - 93.5) / (119.4 - 93.5);
      onPlateVal = clampedAngle >= 84;
    } else {
      // Minimal params: Rest=95, Start=105.8, End=145.1
      clampedAngle = Math.max(90, Math.min(150, worldAngle));
      progressVal = (clampedAngle - 105.8) / (145.1 - 105.8);
      onPlateVal = clampedAngle >= 99;
    }
    
    const finalProgress = Math.max(0, Math.min(1, progressVal));
    setDragAngle(clampedAngle);
    setDragProgress(finalProgress);
    setIsOnPlate(onPlateVal);

    if (triggeringSeek && onPlateVal && onSeek) {
      onSeek(finalProgress); // Real-time scrubbing
    }
  };

  // Determine active world angle based on parked state and progress
  let activeAngle = 90;
  if (variant === "wood") {
    activeAngle = isParked ? 75 : 93.5 + progress * (119.4 - 93.5);
  } else {
    activeAngle = isParked ? 95 : 105.8 + progress * (145.1 - 105.8);
  }
  
  const targetWorldAngle = isDragging && dragAngle !== null ? dragAngle : activeAngle;
  
  // Since the SVG draws the arm pointing straight down (90deg),
  // the CSS rotation needed is targetWorldAngle - 90.
  const tonearmRotation = targetWorldAngle - 90;

  if (variant === "minimal") {
    return (
      <div className="relative w-full aspect-square max-w-[500px] mx-auto overflow-visible select-none flex-shrink-0">
        
        {/* VINYL DISC (No base platter, just the record) */}
        <div
          onClick={onToggle}
          className="absolute rounded-full bg-[#0a0a0b] shadow-[0_30px_60px_rgba(0,0,0,0.8),0_0_20px_rgba(0,0,0,0.5)] cursor-pointer group/vinyl overflow-hidden active:scale-[0.995] transition-transform duration-100"
          style={{ width: '110%', height: '110%', left: '-15%', top: '-5%' }}
        >
          {/* Vinyl Grooves */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="95" fill="none" stroke="#222" strokeWidth="0.5" />
            <circle cx="100" cy="100" r="90" fill="none" stroke="#2a2a2a" strokeWidth="0.3" />
            <circle cx="100" cy="100" r="85" fill="none" stroke="#222" strokeWidth="0.5" />
            <circle cx="100" cy="100" r="80" fill="none" stroke="#2a2a2a" strokeWidth="0.3" />
            <circle cx="100" cy="100" r="75" fill="none" stroke="#222" strokeWidth="0.5" />
            <circle cx="100" cy="100" r="70" fill="none" stroke="#2a2a2a" strokeWidth="0.3" />
            <circle cx="100" cy="100" r="65" fill="none" stroke="#222" strokeWidth="0.5" />
            <circle cx="100" cy="100" r="60" fill="none" stroke="#2a2a2a" strokeWidth="0.3" />
            <circle cx="100" cy="100" r="55" fill="none" stroke="#222" strokeWidth="0.5" />
            <circle cx="100" cy="100" r="48" fill="none" stroke="#111" strokeWidth="1.5" />
          </svg>

          {/* Vinyl Sheen/Reflection Overlay */}
          <div className="absolute inset-0 pointer-events-none mix-blend-screen opacity-[0.12] bg-[conic-gradient(from_0deg,transparent_0deg,rgba(255,255,255,0.4)_30deg,transparent_60deg,transparent_180deg,rgba(255,255,255,0.4)_210deg,transparent_240deg)]" />

          {/* Center Label (Sticker) and Album Art */}
          <div
            className="absolute inset-0 w-full h-full flex items-center justify-center motion-safe:transition-transform duration-100"
            style={{ transform: `rotate(${rotation}deg)` }}
          >
            {/* 36% of 110% = 39.6% radius. That's R=19.8, which perfectly matches R=20 in our math! */}
            <div className="w-[36%] aspect-square rounded-full border-4 border-[#0a0a0b] flex items-center justify-center overflow-hidden relative shadow-inner">
              <img
                src={albumArt || "/placeholder.svg"}
                alt=""
                className="w-full h-full object-cover rounded-full"
                draggable={false}
              />
              {/* Spindle hole */}
              <div className="absolute w-2 h-2 rounded-full bg-black shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] border border-[#222]" />
            </div>
          </div>
        </div>

        {/* FIXED TONEARM BASE PADS */}
        <div className="absolute inset-0 pointer-events-none z-10">
          <svg className="w-full h-full" viewBox="0 0 100 100">
             <circle cx="94" cy="10" r="10" fill="#ffffff" fillOpacity="0.04" stroke="#ffffff" strokeOpacity="0.1" strokeWidth="0.5" />
             <circle cx="88" cy="22" r="11" fill="#ffffff" fillOpacity="0.04" stroke="#ffffff" strokeOpacity="0.1" strokeWidth="0.5" />
          </svg>
        </div>

        {/* MINIMAL DARK TONEARM ASSEMBLY */}
        <div className="absolute inset-0 pointer-events-none z-20">
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className={`w-full h-full pointer-events-auto cursor-grab active:cursor-grabbing transition-transform duration-800 motion-reduce:transition-none ${
              isDragging ? "transition-none duration-0" : ""
            }`}
            style={{
              transformOrigin: "88% 22%",
              transform: `rotate(${tonearmRotation}deg)`,
              transitionTimingFunction: (isPlaying && !isParked) && !isDragging
                ? "cubic-bezier(0.34, 1.56, 0.64, 1)"
                : "cubic-bezier(0.25, 1, 0.5, 1)",
            }}
          >
            <svg
              className="w-full h-full drop-shadow-[0_20px_25px_rgba(0,0,0,0.7)]"
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Dark Hinge Base (Rotates with arm) */}
              <rect x="84" y="16" width="8" height="12" rx="1.5" fill="#1e1e1f" stroke="#333" strokeWidth="0.5" />
              <rect x="80" y="18" width="16" height="8" rx="1" fill="#2c2c2e" stroke="#444" strokeWidth="0.5" />

              {/* Pivot dot */}
              <circle ref={pivotRef} cx="88" cy="22" r="2" fill="#555" />

              {/* Dark Arm Shaft (Length 70 -> y=92) */}
              <path
                d="M 88 22 L 88 92"
                stroke="#2a2a2c"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              {/* Crisp central metallic highlight */}
              <path
                d="M 88 22 L 88 92"
                stroke="#555"
                strokeWidth="0.8"
                opacity="0.9"
              />

              {/* Dark Headshell Assembly */}
              <path d="M 84.5 82 L 91.5 82 L 92 92 L 84 92 Z" fill="#151515" stroke="#333" strokeWidth="0.4" strokeLinejoin="round" />
              <rect x="85.5" y="83" width="5" height="4" rx="1" fill="#1e1e1f" />
              
              {/* Angular stylus tip block */}
              <path d="M 86 92 L 90 92 L 89.5 95 L 86.5 95 Z" fill="#2a2a2c" stroke="#444" strokeWidth="0.2" />
              
              {/* Stylus needle */}
              <path d="M 88 95 L 87.5 97.5 L 88.5 97.5 Z" fill="#777" />
            </svg>
          </div>
        </div>
      </div>
    );
  }

  // Classic Wood variant (default)
  return (
    <div className="relative w-full max-w-[340px] aspect-square rounded-2xl p-4 bg-gradient-to-br from-[#402213] via-[#2d180d] to-[#1a0e07] shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_2px_4px_rgba(255,255,255,0.1),inset_0_-2px_4px_rgba(0,0,0,0.5)] border border-[#522d1a] overflow-hidden select-none group/turntable flex flex-col justify-between flex-shrink-0">
      {/* Wood grain effect lines */}
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,rgba(255,255,255,0.1)_2px,rgba(255,255,255,0.1)_4px)]" />
      <div className="absolute inset-0 opacity-5 pointer-events-none bg-[repeating-linear-gradient(-45deg,transparent,transparent_4px,rgba(0,0,0,0.5)_4px,rgba(0,0,0,0.5)_8px)]" />

      {/* Top Details */}
      <div className="flex justify-between items-center z-10 w-full px-1">
        <div className="bg-gradient-to-r from-[#d4af37] via-[#f3e5ab] to-[#aa7c11] px-2.5 py-0.5 rounded shadow-[0_1px_3px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.3)] border border-[#996515] flex items-center justify-center">
          <span className="text-[9px] font-serif font-black tracking-widest text-[#241505] uppercase">
            Hi-Fi Turntable
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-wider">
            {isPlaying ? "ON AIR" : "STBY"}
          </span>
          <div className="relative w-3.5 h-3.5 rounded-full bg-neutral-900 border border-neutral-700 flex items-center justify-center shadow-inner">
            <div className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${isPlaying ? "bg-amber-500 shadow-[0_0_8px_#f59e0b,0_0_12px_#f59e0b] animate-pulse" : "bg-amber-950 opacity-40"}`} />
          </div>
        </div>
      </div>

      {/* Main Platter and Vinyl Layout */}
      <div className="relative flex-1 flex items-center justify-center my-2">
        {/* Platter ambient reflection */}
        <div
          className={`absolute rounded-full transition-all duration-1000 blur-2xl pointer-events-none ${isPlaying ? "bg-amber-500/15 scale-105" : "bg-transparent scale-95"}`}
          style={{ width: '82%', height: '82%', left: '9%', top: '9%' }}
        />

        {/* Heavy Platter Base */}
        <div 
          className="absolute rounded-full bg-gradient-to-br from-[#1c1c1c] via-[#0f0f0f] to-[#050505] shadow-[0_8px_20px_rgba(0,0,0,0.6),inset_0_2px_4px_rgba(255,255,255,0.05),inset_0_-2px_6px_rgba(0,0,0,0.8)] border-4 border-[#2d2d2d] flex items-center justify-center pointer-events-none"
          style={{ width: '80%', height: '80%', left: '10%', top: '10%' }}
        >
          <div className="absolute inset-0.5 rounded-full border border-neutral-700/30" />
          <div className="absolute w-[94%] h-[94%] rounded-full border border-neutral-800/40" />
          <div className="absolute w-[88%] h-[88%] rounded-full border border-neutral-800/20" />
        </div>

        {/* VINYL DISC */}
        <div
          onClick={onToggle}
          className="absolute rounded-full bg-[#0d0d0d] shadow-[0_10px_25px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.1)] border border-black cursor-pointer group/vinyl active:scale-[0.99] transition-transform overflow-hidden"
          style={{ width: '76%', height: '76%', left: '12%', top: '12%' }}
        >
          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="95" fill="none" stroke="#222" strokeWidth="0.5" />
            <circle cx="100" cy="100" r="85" fill="none" stroke="#222" strokeWidth="0.5" />
            <circle cx="100" cy="100" r="75" fill="none" stroke="#222" strokeWidth="0.5" />
            <circle cx="100" cy="100" r="65" fill="none" stroke="#222" strokeWidth="0.5" />
            <circle cx="100" cy="100" r="55" fill="none" stroke="#222" strokeWidth="0.5" />
            <circle cx="100" cy="100" r="44" fill="none" stroke="#111" strokeWidth="2" />
          </svg>
          <div className="absolute inset-0 pointer-events-none mix-blend-screen opacity-[0.14] bg-[conic-gradient(from_0deg,transparent_0deg,rgba(255,255,255,0.4)_30deg,transparent_60deg,transparent_180deg,rgba(255,255,255,0.4)_210deg,transparent_240deg)]" />
          <div className="absolute inset-0 w-full h-full flex items-center justify-center motion-safe:transition-transform duration-100" style={{ transform: `rotate(${rotation}deg)` }}>
            <div className="w-[38%] aspect-square rounded-full bg-neutral-900 border-4 border-[#121212] shadow-md flex items-center justify-center overflow-hidden relative">
              <img src={albumArt || "/placeholder.svg"} alt="" className="w-full h-full object-cover rounded-full" draggable={false} />
              <div className="absolute w-3 h-3 rounded-full bg-neutral-950 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)] border border-neutral-700/50 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-neutral-800" />
              </div>
            </div>
          </div>
        </div>

        {/* WOOD TONEARM ASSEMBLY */}
        <div className="absolute inset-0 pointer-events-none z-20">
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className={`w-full h-full pointer-events-auto cursor-grab active:cursor-grabbing transition-transform duration-800 motion-reduce:transition-none ${
              isDragging ? "transition-none duration-0" : ""
            }`}
            style={{
              transformOrigin: "85% 15%",
              transform: `rotate(${tonearmRotation}deg)`,
              transitionTimingFunction: (isPlaying && !isParked) && !isDragging
                ? "cubic-bezier(0.34, 1.56, 0.64, 1)"
                : "cubic-bezier(0.25, 1, 0.5, 1)",
            }}
          >
            <svg
              className="w-full h-full drop-shadow-[0_8px_10px_rgba(0,0,0,0.6)]"
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="brass" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#aa7c11" />
                  <stop offset="30%" stopColor="#d4af37" />
                  <stop offset="50%" stopColor="#f3e5ab" />
                  <stop offset="70%" stopColor="#d4af37" />
                  <stop offset="100%" stopColor="#8a640f" />
                </linearGradient>
                <linearGradient id="silver" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#444" />
                  <stop offset="50%" stopColor="#888" />
                  <stop offset="100%" stopColor="#222" />
                </linearGradient>
              </defs>

              {/* Shaft (Length 52 -> y=67) */}
              <path d="M 85 15 L 85 67" stroke="url(#brass)" strokeWidth="1.2" strokeLinecap="round" />
              <path d="M 85 15 L 85 67" stroke="#fff" strokeWidth="0.4" opacity="0.3" />

              {/* Headshell */}
              <rect x="83.5" y="65" width="3" height="4" fill="#181818" stroke="#2a2a2a" strokeWidth="0.2" />
              <path d="M 85 69 L 84 72 L 86 72 Z" fill="#1c1c1e" />

              {/* Pivot */}
              <circle ref={pivotRef} cx="85" cy="15" r="5" fill="url(#brass)" stroke="#68470a" strokeWidth="0.3" />
              <circle cx="85" cy="15" r="3.5" fill="#151515" />
              <circle cx="85" cy="15" r="1.5" fill="url(#silver)" />
            </svg>
          </div>
        </div>
      </div>

      {/* Bottom Display */}
      <div className="z-10 bg-neutral-950/80 backdrop-blur-sm px-3 py-2 rounded-xl border border-[#ffffff,0.03] shadow-inner flex items-center justify-between gap-3 w-full mt-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-serif font-semibold text-neutral-100 truncate tracking-wide leading-tight">
            {trackTitle || "No Track Playing"}
          </p>
          <p className="text-[10px] font-sans font-medium text-neutral-400 truncate leading-none mt-1">
            {artist || "Unknown Artist"}
          </p>
        </div>

        <div className="bg-[#0f0a05] px-2.5 py-1.5 rounded-md border border-[#301b0f] flex flex-col items-end flex-shrink-0 min-w-[54px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.9)]">
          <span className="text-[7px] font-mono text-amber-500/40 uppercase tracking-widest leading-none">Speed</span>
          <span className="text-xs font-mono font-bold text-amber-500 tracking-wider mt-0.5 tabular-nums">
            {isPlaying ? "33.3" : "00.0"} <span className="text-[8px] text-amber-500/70 font-normal">RPM</span>
          </span>
        </div>
      </div>
    </div>
  );
}
