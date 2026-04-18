import React, { useState, useCallback, useRef, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useNetworkStore from '../../store/networkStore';
import { useSocket } from '../../hooks/useSocket';

// ── Web Audio SOS morse code + alarm ─────────────────────────────────────────
function playSOSSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const tone = (freq, start, dur, type = 'sine', gain = 0.28) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.type = type;
      osc.frequency.value = freq;
      gainNode.gain.setValueAtTime(0, start);
      gainNode.gain.linearRampToValueAtTime(gain, start + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, start + dur);
      osc.start(start);
      osc.stop(start + dur + 0.05);
    };
    const dot = 0.1, dsh = 0.28, sp = 0.06, lsp = 0.2;
    let t = ctx.currentTime + 0.05;
    for (let i = 0; i < 3; i++) { tone(900, t, dot); t += dot + sp; }
    t += lsp;
    for (let i = 0; i < 3; i++) { tone(680, t, dsh, 'sawtooth', 0.22); t += dsh + sp; }
    t += lsp;
    for (let i = 0; i < 3; i++) { tone(900, t, dot); t += dot + sp; }
    t += 0.2;
    for (let i = 0; i < 5; i++) { tone(800 + i * 80, t + i * 0.1, 0.18, 'square', 0.15); }
    t += 0.8;
    tone(1200, t, 0.15, 'square', 0.2);
    tone(1200, t + 0.22, 0.15, 'square', 0.2);
  } catch (e) { /* AudioContext not available — silently skip */ }
}

const DigitCounter = memo(function DigitCounter({ value, color }) {
  return (
    <motion.div
      key={value}
      initial={{ y: -20, opacity: 0, scale: 1.3 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      style={{
        fontFamily: 'Orbitron', fontSize: 28, color, fontWeight: 900,
        willChange: 'transform, opacity',
      }}
    >
      {value}
    </motion.div>
  );
});

// ── Broadcast ping rings — pure CSS, no JS animation loop ────────────────────
function BroadcastRings() {
  return (
    <>
      {[0, 1, 2, 3, 4].map(i => (
        <div key={i} className="sos-ring" style={{
          position: 'absolute',
          borderRadius: '50%',
          border: `${i === 0 ? 2 : 1}px solid rgba(255,0,64,${0.65 - i * 0.1})`,
          inset: -14 - i * 17,
          pointerEvents: 'none',
          willChange: 'transform, opacity',
          animationDelay: `${i * 0.28}s`,
        }} />
      ))}
    </>
  );
}

const SOSButton = memo(function SOSButton() {
  // ── Only 3 state values — phase transitions only, NOT per-frame ───────────
  const [phase, setPhase]           = useState('idle');
  const [reachCount, setReachCount] = useState(0);
  const phaseRef = useRef('idle');   // Sync ref for rAF callbacks

  // ── DOM refs for direct manipulation (zero re-renders during charge) ──────
  const chargeSvgRef  = useRef(null);  // The charge progress SVG circle
  const buttonRef     = useRef(null);  // The main button element
  const statusTextRef = useRef(null);  // "⚡ CHARGING 47%" text
  const rafRef        = useRef(null);
  const progressRef   = useRef(0);
  const circumference = 2 * Math.PI * 68;

  const nodes             = useNetworkStore(s => s.nodes);
  const sosRoutes         = useNetworkStore(s => s.sosRoutes);
  const setSosOverlayActive = useNetworkStore(s => s.setSosOverlayActive);
  const { triggerSOS }    = useSocket();

  const sourceNode = nodes.find(n => n.role === 'gateway' && n.status === 'active')
    || nodes.find(n => n.status === 'active');

  // ── rAF-based charge animation — zero React re-renders during charging ────
  const startCharge = useCallback(() => {
    if (phaseRef.current !== 'idle' || !sourceNode) return;

    phaseRef.current = 'charging';
    setPhase('charging');
    progressRef.current = 0;

    const animate = () => {
      if (phaseRef.current !== 'charging') return;

      progressRef.current = Math.min(100, progressRef.current + 2.0);
      const p = progressRef.current;
      const isHot = p > 70;
      const color = isHot ? '#ff4500' : '#ffb300';

      // ── Direct DOM updates — NO React re-renders ──────────────────────
      if (chargeSvgRef.current) {
        const offset = circumference * (1 - p / 100);
        chargeSvgRef.current.style.strokeDashoffset = offset;
        chargeSvgRef.current.style.stroke = color;
        chargeSvgRef.current.style.filter = `drop-shadow(0 0 ${5 + p * 0.08}px ${color})`;
      }
      if (buttonRef.current) {
        const glow1 = 18 + p * 0.28;
        const glow2 = 35 + p * 0.45;
        buttonRef.current.style.boxShadow = `0 0 ${glow1}px rgba(255,179,0,0.5), 0 0 ${glow2}px rgba(255,0,64,0.2)`;
      }
      if (statusTextRef.current) {
        statusTextRef.current.textContent = `⚡ CHARGING ${Math.round(p)}%`;
      }

      if (p < 100) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      // ── Charge complete → broadcast ───────────────────────────────────
      phaseRef.current = 'broadcasting';
      setPhase('broadcasting');

      // Reset button glow to SOS red
      if (buttonRef.current) {
        buttonRef.current.style.boxShadow = '0 0 60px rgba(255,0,64,0.75), 0 0 120px rgba(255,0,64,0.3)';
      }

      playSOSSound();
      setSosOverlayActive(true);
      setTimeout(() => setSosOverlayActive(false), 4500);
      triggerSOS(sourceNode.id);

      // Progressive node counter (infrequent setState — OK)
      let n = 0;
      const totalTarget = sosRoutes.length || Math.max(nodes.length - 2, 4);
      const countInterval = setInterval(() => {
        n++;
        setReachCount(n);
        if (n >= totalTarget) {
          clearInterval(countInterval);
          phaseRef.current = 'complete';
          setPhase('complete');
          setTimeout(() => {
            phaseRef.current = 'idle';
            setPhase('idle');
            setReachCount(0);
            progressRef.current = 0;
          }, 4000);
        }
      }, 100);
    };

    rafRef.current = requestAnimationFrame(animate);
  }, [sourceNode, triggerSOS, sosRoutes, nodes, setSosOverlayActive, circumference]);

  const handleCancel = useCallback(() => {
    if (phaseRef.current !== 'charging') return;
    cancelAnimationFrame(rafRef.current);
    phaseRef.current = 'idle';
    setPhase('idle');
    progressRef.current = 0;
    if (buttonRef.current) buttonRef.current.style.boxShadow = '';
  }, []);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const isCharging     = phase === 'charging';
  const isBroadcasting = phase === 'broadcasting';
  const isComplete     = phase === 'complete';
  const isIdle         = phase === 'idle';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>

      {/* Status label — ref-driven during charge, React-driven otherwise */}
      <div style={{
        fontFamily: 'JetBrains Mono', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase',
        color: isComplete ? '#00ff88' : isBroadcasting ? '#ff0040' : isCharging ? '#ffb300' : 'rgba(255,0,64,0.45)',
        transition: 'color 0.3s',
        willChange: 'opacity',
        animation: (isBroadcasting || isComplete) ? 'blink 0.65s ease-in-out infinite' : 'none',
      }}>
        {/* During charging, textContent is updated via DOM ref — keeps this span as placeholder */}
        <span ref={el => { if (el && isCharging) { statusTextRef.current = el; } }}>
          {isIdle ? '— SOS READY —' : isBroadcasting ? '📡 BROADCASTING...' : isComplete ? `✅ ${reachCount} NODES REACHED` : '⚡ CHARGING 0%'}
        </span>
      </div>

      {/* Button container */}
      <div style={{ position: 'relative', width: 130, height: 130 }}>

        {/* Outer ambient halo — CSS only, no JS */}
        {(isBroadcasting || isComplete) && (
          <div className="sos-halo-outer" style={{
            position: 'absolute', inset: -40, borderRadius: '50%',
            border: '1px solid rgba(255,0,64,0.25)',
            pointerEvents: 'none',
            willChange: 'transform, opacity',
          }} />
        )}

        {/* Broadcast rings — pure CSS animations, no motion.div */}
        {(isBroadcasting || isComplete) && <BroadcastRings />}

        {/* Charge progress ring — DOM-ref controlled, not React state */}
        {isCharging && (
          <svg
            style={{ position: 'absolute', inset: -10, pointerEvents: 'none', willChange: 'transform' }}
            width={150} height={150}
          >
            <circle cx={75} cy={75} r={68} fill="none" stroke="rgba(255,179,0,0.08)" strokeWidth={5} />
            <circle
              ref={chargeSvgRef}
              cx={75} cy={75} r={68}
              fill="none"
              stroke="#ffb300"
              strokeWidth={5}
              strokeLinecap="round"
              strokeDasharray={`${circumference}`}
              strokeDashoffset={`${circumference}`}
              transform="rotate(-90, 75, 75)"
            />
          </svg>
        )}

        {/* Cancel hint */}
        {isCharging && (
          <div onClick={handleCancel} style={{
            position: 'absolute', bottom: -30, left: '50%', transform: 'translateX(-50%)',
            fontFamily: 'JetBrains Mono', fontSize: 8, color: 'rgba(255,179,0,0.5)',
            cursor: 'pointer', whiteSpace: 'nowrap',
          }}>
            Click to cancel
          </div>
        )}

        {/* The SOS button — ref-driven glow, framer only for discrete state changes */}
        <button
          ref={buttonRef}
          onClick={isCharging ? handleCancel : startCharge}
          disabled={(isBroadcasting || isComplete) || !sourceNode}
          style={{
            width: '100%', height: '100%', borderRadius: '50%',
            border: `${isBroadcasting ? 3 : 2}px solid ${isBroadcasting || isComplete ? '#ff0040' : isCharging ? '#ffb300' : 'rgba(255,0,64,0.6)'}`,
            background: isBroadcasting
              ? 'radial-gradient(circle, rgba(255,0,64,0.35), rgba(180,0,40,0.1))'
              : 'radial-gradient(circle, rgba(255,0,64,0.1), rgba(255,0,64,0.02))',
            cursor: (isBroadcasting || isComplete || !sourceNode) ? 'not-allowed' : 'pointer',
            fontFamily: 'Orbitron', fontWeight: 900, fontSize: 20,
            letterSpacing: '0.08em',
            color: isIdle ? 'rgba(255,0,64,0.9)' : '#fff',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 4,
            transition: 'border-color 0.25s, color 0.25s, background 0.3s',
            boxShadow: '0 0 20px rgba(255,0,64,0.25), 0 0 50px rgba(255,0,64,0.08)',
            willChange: 'transform',
            animation: isBroadcasting ? 'sos-btn-pulse 0.6s ease-in-out infinite' : 'none',
          }}
        >
          <span style={{
            fontSize: 28,
            display: 'inline-block',
            animation: isBroadcasting ? 'sos-icon-shake 0.4s ease-in-out infinite' : 'none',
            willChange: 'transform',
          }}>🆘</span>
          <span>SOS</span>
          {isIdle && <span style={{ fontSize: 7, opacity: 0.4, letterSpacing: '0.2em' }}>CLICK</span>}
        </button>
      </div>

      {/* Source node */}
      <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'rgba(127,168,201,0.4)', textAlign: 'center' }}>
        {sourceNode
          ? <>FROM: <span style={{ color: '#00f5ff' }}>{sourceNode.name}</span></>
          : <span style={{ color: 'rgba(255,0,64,0.4)' }}>NO ACTIVE NODE</span>}
      </div>

      {/* Broadcast stats */}
      <AnimatePresence>
        {phase !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, scaleY: 0, originY: 0 }}
            animate={{ opacity: 1, scaleY: 1 }}
            exit={{ opacity: 0, scaleY: 0 }}
            transition={{ duration: 0.25 }}
            style={{
              width: '100%',
              background: isComplete ? 'rgba(0,255,136,0.06)' : 'rgba(255,0,64,0.06)',
              border: `1px solid ${isComplete ? 'rgba(0,255,136,0.25)' : 'rgba(255,0,64,0.22)'}`,
              borderRadius: 8, padding: '8px 14px', textAlign: 'center',
              transition: 'background 0.4s, border-color 0.4s',
              willChange: 'transform, opacity',
            }}
          >
            <div style={{ fontFamily: 'Orbitron', fontSize: 9,
              color: isComplete ? 'rgba(0,255,136,0.6)' : 'rgba(255,0,64,0.55)', marginBottom: 4 }}>
              {isComplete ? 'BROADCAST COMPLETE' : 'BROADCAST REACH'}
            </div>
            <DigitCounter value={reachCount} color={isComplete ? '#00ff88' : '#ff0040'} />
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 8,
              color: isComplete ? 'rgba(0,255,136,0.5)' : 'rgba(255,0,64,0.45)' }}>
              NODES REACHED
            </div>

            {/* Propagation bar — CSS width transition, no JS animation */}
            {isBroadcasting && !isComplete && (
              <div style={{ marginTop: 8, height: 2, background: 'rgba(255,0,64,0.1)', borderRadius: 1, overflow: 'hidden' }}>
                <div className="sos-propagation-bar" style={{
                  height: '100%', background: '#ff0040', borderRadius: 1,
                  width: '0%', willChange: 'width',
                  animationDuration: `${Math.max(nodes.length * 0.12, 1)}s`,
                }} />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default SOSButton;
