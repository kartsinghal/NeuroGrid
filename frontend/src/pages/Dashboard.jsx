import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import NetworkGraph from '../components/NetworkGraph';
import StatusBar from '../components/StatusBar';
import SOSButton from '../components/SOSButton';
import SimControls from '../components/SimControls';
import MessageLog from '../components/MessageLog';
import NetworkIntelPanel from '../components/NetworkIntelPanel';
import useNetworkStore from '../store/networkStore';
import { useSocket } from '../hooks/useSocket';

// ── SOS Overlay — full-screen dramatic red pulse with vignette ───────────────
function SOSOverlay() {
  const sosOverlayActive = useNetworkStore(s => s.sosOverlayActive);
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (sosOverlayActive) setKey(k => k + 1);
  }, [sosOverlayActive]);

  return (
    <AnimatePresence>
      {sosOverlayActive && (
        <>
          {/* Central red radial burst */}
          <motion.div
            key={`burst-${key}`}
            className="sos-overlay-active"
            style={{
              position: 'fixed', inset: 0, zIndex: 9997, pointerEvents: 'none',
              background: 'radial-gradient(ellipse at center, rgba(255,0,64,0.55) 0%, rgba(255,0,64,0.2) 40%, rgba(255,0,64,0) 75%)',
            }}
          />
          {/* Corner vignettes */}
          <motion.div
            key={`vignette-${key}`}
            className="sos-vignette"
            style={{
              position: 'fixed', inset: 0, zIndex: 9996, pointerEvents: 'none',
              background: 'radial-gradient(ellipse at 0% 0%, rgba(255,0,64,0.4) 0%, transparent 50%), radial-gradient(ellipse at 100% 0%, rgba(255,0,64,0.35) 0%, transparent 45%), radial-gradient(ellipse at 0% 100%, rgba(255,0,64,0.35) 0%, transparent 45%), radial-gradient(ellipse at 100% 100%, rgba(255,0,64,0.4) 0%, transparent 50%)',
            }}
          />
          {/* Top red scan line sweep */}
          <motion.div
            key={`scan-${key}`}
            initial={{ y: '-100%', opacity: 0.8 }}
            animate={{ y: '100vh', opacity: 0 }}
            transition={{ duration: 1.5, ease: 'easeIn' }}
            style={{
              position: 'fixed', left: 0, right: 0, top: 0, zIndex: 9998, pointerEvents: 'none',
              height: 3, background: 'rgba(255,0,64,0.9)',
              boxShadow: '0 0 30px rgba(255,0,64,0.9), 0 0 60px rgba(255,0,64,0.4)',
            }}
          />
        </>
      )}
    </AnimatePresence>
  );
}

// ── Live Hop-Step Indicator Overlay ──────────────────────────────────────────
function HopStepIndicator() {
  const currentHopStep = useNetworkStore(s => s.currentHopStep);
  const nodes = useNetworkStore(s => s.nodes);

  if (!currentHopStep) return null;

  const { fromId, toId, hopIndex, totalHops, isSOS, color } = currentHopStep;
  const fromNode = nodes.find(n => n.id === fromId);
  const toNode   = nodes.find(n => n.id === toId);

  if (!fromNode || !toNode) return null;

  return (
    <motion.div
      key={`${fromId}-${toId}-${hopIndex}`}
      initial={{ opacity: 0, y: -10, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.9 }}
      style={{
        position: 'absolute',
        top: 56,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
      }}
    >
      {/* Hop progress badges */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        background: isSOS ? 'rgba(255,0,64,0.12)' : 'rgba(0,245,255,0.08)',
        border: `1px solid ${isSOS ? 'rgba(255,0,64,0.5)' : 'rgba(0,245,255,0.3)'}`,
        borderRadius: 20,
        padding: '5px 14px',
        backdropFilter: 'blur(16px)',
        boxShadow: isSOS
          ? '0 0 20px rgba(255,0,64,0.3)'
          : '0 0 20px rgba(0,245,255,0.2)',
      }}>
        {/* Hop dots */}
        {Array.from({ length: totalHops }).map((_, i) => (
          <div key={i} style={{
            width: i === hopIndex ? 10 : 6,
            height: i === hopIndex ? 10 : 6,
            borderRadius: '50%',
            background: i <= hopIndex ? color : 'rgba(255,255,255,0.1)',
            boxShadow: i === hopIndex ? `0 0 10px ${color}, 0 0 20px ${color}80` : 'none',
            transition: 'all 0.3s ease',
            className: i === hopIndex ? (isSOS ? 'hop-step-active-sos' : 'hop-step-active') : '',
          }} className={i === hopIndex ? (isSOS ? 'hop-step-active-sos' : 'hop-step-active') : ''} />
        ))}

        <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.15)', margin: '0 4px' }} />

        {/* Node names */}
        <span style={{
          fontFamily: 'JetBrains Mono', fontSize: 10, color,
          letterSpacing: '0.05em',
        }}>
          {fromNode.name}
        </span>
        <motion.span
          animate={{ x: isSOS ? [-2, 2, -2] : [0] }}
          transition={{ duration: 0.3, repeat: Infinity }}
          style={{ color: isSOS ? '#ff0040' : '#00ff88', fontSize: 12 }}
        >
          {isSOS ? '🚨' : '→'}
        </motion.span>
        <span style={{
          fontFamily: 'JetBrains Mono', fontSize: 10, color,
          letterSpacing: '0.05em',
        }}>
          {toNode.name}
        </span>

        <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.15)', margin: '0 4px' }} />

        <span style={{
          fontFamily: 'Orbitron', fontSize: 9,
          color: isSOS ? '#ff0040' : '#00f5ff', letterSpacing: '0.1em',
        }}>
          HOP {hopIndex + 1}/{totalHops}
        </span>
      </div>
    </motion.div>
  );
}

// ── Activity ticker — small log items at bottom of graph ─────────────────────
function ActivityTicker() {
  const logs = useNetworkStore(s => s.logs);
  const recent = logs.slice(0, 4);

  return (
    <div style={{
      position: 'absolute', bottom: 14, right: 14, zIndex: 10, pointerEvents: 'none',
      display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end',
    }}>
      <AnimatePresence>
        {recent.map((log, i) => (
          <motion.div key={log.id || i}
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            animate={{ opacity: 1 - i * 0.25, x: 0, scale: 1 - i * 0.025 }}
            exit={{ opacity: 0, x: 20 }}
            style={{
              background: 'rgba(2,11,24,0.92)',
              border: `1px solid ${
                log.level === 'error' || log.level === 'sos'
                  ? 'rgba(255,0,64,0.3)'
                  : log.level === 'success'
                  ? 'rgba(0,255,136,0.22)'
                  : 'rgba(0,245,255,0.12)'
              }`,
              borderRadius: 6, padding: '4px 10px',
              maxWidth: 290,
              backdropFilter: 'blur(12px)',
              boxShadow: log.level === 'sos'
                ? '0 0 12px rgba(255,0,64,0.2)'
                : log.level === 'success'
                ? '0 0 8px rgba(0,255,136,0.1)'
                : 'none',
            }}
          >
            <span style={{
              fontFamily: 'Inter', fontSize: 10,
              color: log.level === 'error' || log.level === 'sos'
                ? '#ff6b6b'
                : log.level === 'success' ? '#00cc6a' : 'rgba(226,245,255,0.65)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              display: 'block', maxWidth: 270,
            }}>
              {log.message}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ── Send message panel ────────────────────────────────────────────────────────
function SendMessagePanel() {
  const nodes = useNetworkStore(s => s.nodes);
  const [source, setSource] = useState('');
  const [target, setTarget] = useState('');
  const [content, setContent] = useState('');
  const [sent, setSent] = useState(false);
  const { sendMessage } = useSocket();

  const activeNodes = nodes.filter(n => n.status !== 'offline');

  const handleSend = () => {
    if (!source || !target || !content) return;
    sendMessage(source, target, content, 'normal');
    setSent(true);
    setContent('');
    setTimeout(() => setSent(false), 2200);
  };

  const selectSty = {
    width: '100%', padding: '6px 9px',
    background: 'rgba(0,245,255,0.03)', border: '1px solid rgba(0,245,255,0.12)',
    borderRadius: 5, color: '#e2f5ff', fontFamily: 'JetBrains Mono',
    fontSize: 10, outline: 'none', cursor: 'pointer',
    transition: 'border-color 0.2s',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontFamily: 'Orbitron', fontSize: 8, color: 'rgba(0,245,255,0.4)', letterSpacing: '0.15em' }}>
        SEND MESSAGE
      </div>
      <select value={source} onChange={e => setSource(e.target.value)} style={selectSty}>
        <option value="">FROM node...</option>
        {activeNodes.map(n => <option key={n.id} value={n.id} style={{ background: '#020b18' }}>{n.name}</option>)}
      </select>
      <select value={target} onChange={e => setTarget(e.target.value)} style={selectSty}>
        <option value="">TO node...</option>
        {activeNodes.filter(n => n.id !== source).map(n => <option key={n.id} value={n.id} style={{ background: '#020b18' }}>{n.name}</option>)}
      </select>
      <input type="text" placeholder="Message content..." value={content}
        onChange={e => setContent(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleSend()}
        style={{ ...selectSty, fontFamily: 'Inter', fontSize: 10 }}
      />
      <motion.button onClick={handleSend}
        disabled={!source || !target || !content}
        whileHover={source && target && content ? { scale: 1.01 } : undefined}
        whileTap={{ scale: 0.97 }}
        style={{
          padding: '7px', borderRadius: 5,
          background: sent
            ? 'rgba(0,255,136,0.15)'
            : (source && target && content ? 'rgba(0,245,255,0.1)' : 'rgba(255,255,255,0.02)'),
          border: `1px solid ${sent
            ? 'rgba(0,255,136,0.4)'
            : (source && target && content ? 'rgba(0,245,255,0.3)' : 'rgba(255,255,255,0.05)')}`,
          color: sent
            ? '#00ff88'
            : (source && target && content ? '#00f5ff' : 'rgba(255,255,255,0.15)'),
          fontFamily: 'Orbitron', fontSize: 9, letterSpacing: '0.08em',
          cursor: (source && target && content) ? 'pointer' : 'not-allowed',
          transition: 'all 0.2s',
          boxShadow: sent ? '0 0 15px rgba(0,255,136,0.25)' : 'none',
        }}
      >
        {sent ? '✓ DISPATCHED' : '▶ ROUTE MESSAGE'}
      </motion.button>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate  = useNavigate();
  const [rightTab, setRightTab] = useState('sim'); // sim | log
  const sosActive = useNetworkStore(s => s.sosActive);
  const sosOverlayActive = useNetworkStore(s => s.sosOverlayActive);
  const [shakeKey, setShakeKey] = useState(0);

  // Trigger screen shake when SOS overlay activates
  useEffect(() => {
    if (sosOverlayActive) {
      setShakeKey(k => k + 1);
    }
  }, [sosOverlayActive]);

  return (
    <motion.div
      key={`shake-${shakeKey}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={sosOverlayActive ? 'sos-screen-shake' : ''}
      style={{
        display: 'flex', flexDirection: 'column', height: '100vh',
        background: sosActive ? '#05010e' : '#020b18',
        overflow: 'hidden', fontFamily: 'Inter, sans-serif',
        transition: 'background 0.6s ease',
        position: 'relative',
      }}
    >
      {/* Full-screen SOS flash overlay */}
      <SOSOverlay />

      {/* Top Status Bar */}
      <StatusBar />

      {/* Main 3-column layout */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── LEFT SIDEBAR ────────────────────────────────────────────────── */}
        <div style={{
          width: 232, flexShrink: 0,
          background: sosActive ? 'rgba(10,2,6,0.97)' : 'rgba(2,11,24,0.97)',
          borderRight: `1px solid ${sosActive ? 'rgba(255,0,64,0.15)' : 'rgba(0,245,255,0.08)'}`,
          display: 'flex', flexDirection: 'column',
          padding: '10px 10px', gap: 10,
          overflowY: 'auto',
          transition: 'background 0.5s, border-color 0.5s',
        }} className={`log-scroll ${sosActive ? 'sos-border-pulse' : ''}`}>

          {/* Nav */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {[
              { label: '🏠 Landing', path: '/' },
              { label: '📡 Dashboard', path: '/dashboard', active: true },
              { label: '⚙ Simulation', path: '/simulation' },
              { label: '🗺 Architecture', path: '/architecture' },
            ].map(item => (
              <button key={item.path} onClick={() => navigate(item.path)} style={{
                width: '100%', padding: '7px 10px', textAlign: 'left',
                background: item.active ? 'rgba(0,245,255,0.07)' : 'transparent',
                border: `1px solid ${item.active ? 'rgba(0,245,255,0.18)' : 'transparent'}`,
                borderRadius: 5, color: item.active ? '#00f5ff' : 'rgba(226,245,255,0.45)',
                fontFamily: 'Inter', fontSize: 12, cursor: 'pointer', transition: 'all 0.15s',
              }}
                onMouseEnter={e => { if (!item.active) { e.target.style.background = 'rgba(0,245,255,0.03)'; e.target.style.color = '#e2f5ff'; }}}
                onMouseLeave={e => { if (!item.active) { e.target.style.background = 'transparent'; e.target.style.color = 'rgba(226,245,255,0.45)'; }}}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div style={{ height: 1, background: `rgba(${sosActive ? '255,0,64' : '0,245,255'},0.07)`, transition: 'background 0.5s' }} />

          {/* 🧠 Network Intel Panel */}
          <NetworkIntelPanel />

          <div style={{ height: 1, background: `rgba(${sosActive ? '255,0,64' : '0,245,255'},0.07)`, transition: 'background 0.5s' }} />

          {/* Send Message */}
          <SendMessagePanel />

          {/* Push SOS to bottom */}
          <div style={{ flex: 1, minHeight: 16 }} />

          {/* SOS Button */}
          <SOSButton />
        </div>

        {/* ── CENTER: D3 Network Graph ─────────────────────────────────────── */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <NetworkGraph />
          <ActivityTicker />

          {/* Hop step indicator */}
          <AnimatePresence>
            <HopStepIndicator />
          </AnimatePresence>
        </div>

        {/* ── RIGHT PANEL ─────────────────────────────────────────────────── */}
        <div style={{
          width: 256, flexShrink: 0,
          background: sosActive ? 'rgba(10,2,6,0.97)' : 'rgba(2,11,24,0.97)',
          borderLeft: `1px solid rgba(${sosActive ? '255,0,64' : '0,245,255'},0.08)`,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          transition: 'background 0.5s, border-color 0.4s',
        }} className={sosActive ? 'sos-border-pulse' : ''}>
          {/* Tab switcher */}
          <div style={{ display: 'flex', borderBottom: `1px solid rgba(${sosActive ? '255,0,64' : '0,245,255'},0.08)` }}>
            {[{ key: 'sim', label: '⚙ Controls' }, { key: 'log', label: '📋 Log' }].map(tab => (
              <button key={tab.key} onClick={() => setRightTab(tab.key)} style={{
                flex: 1, padding: '9px 0',
                background: rightTab === tab.key
                  ? (sosActive ? 'rgba(255,0,64,0.05)' : 'rgba(0,245,255,0.05)')
                  : 'transparent',
                border: 'none',
                borderBottom: `2px solid ${rightTab === tab.key ? (sosActive ? '#ff0040' : '#00f5ff') : 'transparent'}`,
                color: rightTab === tab.key
                  ? (sosActive ? '#ff0040' : '#00f5ff')
                  : 'rgba(226,245,255,0.35)',
                fontFamily: 'JetBrains Mono', fontSize: 9, cursor: 'pointer',
                letterSpacing: '0.1em', transition: 'all 0.15s',
              }}>
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflow: 'hidden' }}>
            <AnimatePresence mode="wait">
              {rightTab === 'sim' ? (
                <motion.div key="sim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ height: '100%' }}>
                  <SimControls />
                </motion.div>
              ) : (
                <motion.div key="log" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ height: '100%' }}>
                  <MessageLog />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
