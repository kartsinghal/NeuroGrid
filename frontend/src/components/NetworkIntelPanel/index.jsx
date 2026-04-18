import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useNetworkStore from '../../store/networkStore';

// ── Typewriter effect for AI explanation ─────────────────────────────────────
function TypewriterText({ text, speed = 18 }) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone]           = useState(false);
  useEffect(() => {
    setDisplayed('');
    setDone(false);
    if (!text) return;
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) { clearInterval(timer); setDone(true); }
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);

  return (
    <span>
      {displayed}
      {!done && <span className="typewriter-cursor" />}
    </span>
  );
}

// ── Live ticking counter ──────────────────────────────────────────────────────
function LiveCounter({ value, suffix = '', decimals = 0, color = '#00f5ff' }) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    const from = prevRef.current;
    const to   = value;
    if (from === to) return;

    const steps = 16;
    const diff  = to - from;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      const eased    = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + diff * eased);
      if (step >= steps) {
        clearInterval(timer);
        setDisplay(to);
        prevRef.current = to;
      }
    }, 15);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <motion.span
      key={Math.round(value)}
      initial={{ opacity: 0.6 }}
      animate={{ opacity: 1 }}
      style={{ color, fontFamily: 'Orbitron', fontWeight: 700 }}
    >
      {typeof display === 'number' ? display.toFixed(decimals) : display}{suffix}
    </motion.span>
  );
}

// ── Score factor bar ─────────────────────────────────────────────────────────
function ScoreBar({ label, value, color, icon, weight }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 11 }}>{icon}</span>
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'rgba(127,168,201,0.6)', letterSpacing: '0.08em' }}>
            {label}
          </span>
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: 8, color: 'rgba(127,168,201,0.3)' }}>
            ×{weight}
          </span>
        </div>
        <LiveCounter value={pct} decimals={0} suffix="%" color={color} />
      </div>
      <div style={{ height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
        <motion.div
          key={pct}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          style={{
            height: '100%', background: color, borderRadius: 2,
            boxShadow: `0 0 8px ${color}70`,
          }}
        />
      </div>
    </div>
  );
}

// ── Route path flow visualization ───────────────────────────────────────────
function RoutePathViz({ path, nodes, isSOS }) {
  if (!path || path.length < 2) return null;
  const color = isSOS ? '#ff0040' : null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap', margin: '10px 0' }}>
      {path.map((nodeId, i) => {
        const node = nodes.find(n => n.id === nodeId);
        const isFirst = i === 0, isLast = i === path.length - 1;
        const nodeColor = color || (isFirst ? '#00f5ff' : isLast ? '#bf00ff' : '#00ff88');
        return (
          <React.Fragment key={nodeId}>
            <motion.div
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.08 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                border: `2px solid ${nodeColor}`,
                background: `${nodeColor}15`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 0 10px ${nodeColor}50`,
                fontSize: 10,
              }}>
                {isFirst ? '▶' : isLast ? '◉' : '◈'}
              </div>
              <span style={{
                fontFamily: 'JetBrains Mono', fontSize: 8, color: nodeColor,
                maxWidth: 50, textAlign: 'center', overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {node?.name || nodeId.slice(0, 6)}
              </span>
            </motion.div>

            {i < path.length - 1 && (
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: i * 0.08 + 0.04, duration: 0.3 }}
                style={{
                  width: 18, height: 1.5, margin: '0 2px', marginBottom: 16,
                  background: isSOS
                    ? 'linear-gradient(90deg, #ff004444, #ff8c0044)'
                    : 'linear-gradient(90deg, #00f5ff44, #00ff8844)',
                  transformOrigin: 'left',
                  position: 'relative',
                }}
              >
                {/* Animated dot traversal */}
                <motion.div
                  animate={{ left: ['-10%', '110%'] }}
                  transition={{ duration: isSOS ? 0.5 : 0.8, repeat: Infinity, repeatDelay: isSOS ? 0.8 : 1.5, delay: i * 0.2 }}
                  style={{
                    position: 'absolute', top: -2, width: 5, height: 5,
                    borderRadius: '50%', background: isSOS ? '#ff0040' : '#00ff88',
                    boxShadow: isSOS ? '0 0 6px #ff0040' : '0 0 6px #00ff88',
                  }}
                />
              </motion.div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── AI Decision Tooltip Banner ────────────────────────────────────────────────
function RouteTooltipBanner({ data }) {
  if (!data) return null;
  const { explanation, hops, score, avgLatency, avgReliability, factors } = data;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      style={{
        padding: '8px 10px',
        background: 'rgba(0,255,136,0.05)',
        border: '1px solid rgba(0,255,136,0.2)',
        borderRadius: 7,
        marginBottom: 8,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Animated left accent bar */}
      <motion.div
        animate={{ height: ['0%', '100%'] }}
        transition={{ duration: 0.4 }}
        style={{
          position: 'absolute', left: 0, top: 0, width: 2,
          background: 'linear-gradient(to bottom, #00ff88, #00f5ff)',
          borderRadius: '2px 0 0 2px',
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
        <div style={{
          width: 14, height: 14,
          border: '1px solid rgba(0,255,136,0.5)',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,255,136,0.1)',
        }}>
          <div className="radar-ping" style={{ position: 'absolute', width: 14, height: 14, borderRadius: '50%', border: '1px solid rgba(0,255,136,0.5)' }} />
          <span style={{ fontSize: 7 }}>🧠</span>
        </div>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: 8, color: 'rgba(0,255,136,0.6)', letterSpacing: '0.1em' }}>
          AI ROUTING DECISION
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <span style={{ fontFamily: 'Orbitron', fontSize: 10, color: '#00f5ff' }}>{hops}h</span>
          <span style={{ fontFamily: 'Orbitron', fontSize: 10, color: '#00ff88' }}>{avgLatency}ms</span>
          <span style={{ fontFamily: 'Orbitron', fontSize: 10, color: '#bf00ff' }}>{(avgReliability * 100).toFixed(0)}%</span>
        </div>
      </div>

      <div style={{ fontFamily: 'Inter', fontSize: 10, color: 'rgba(226,245,255,0.75)', lineHeight: 1.5, marginTop: 5, marginLeft: 8 }}>
        <TypewriterText text={explanation} speed={14} />
      </div>

      {factors && factors.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 5, marginLeft: 8 }}>
          {factors.map((f, i) => (
            <span key={i} style={{
              fontFamily: 'JetBrains Mono', fontSize: 8, color: '#00ff88',
              background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.2)',
              padding: '1px 6px', borderRadius: 3,
            }}>
              ✓ {f}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ── Main Network Intelligence Panel ─────────────────────────────────────────
export default function NetworkIntelPanel() {
  const activeRoute      = useNetworkStore(s => s.activeRoute);
  const nodes            = useNetworkStore(s => s.nodes);
  const routeHistory     = useNetworkStore(s => s.routeHistory);
  const sosActive        = useNetworkStore(s => s.sosActive);
  const isConnected      = useNetworkStore(s => s.isConnected);
  const showRouteTooltip = useNetworkStore(s => s.showRouteTooltip);
  const routeTooltipData = useNetworkStore(s => s.routeTooltipData);
  const currentHopStep   = useNetworkStore(s => s.currentHopStep);

  const [activeTab, setActiveTab] = useState('route'); // route | history
  const [flashKey, setFlashKey]   = useState(0);

  // Flash on route update
  useEffect(() => {
    if (activeRoute) setFlashKey(k => k + 1);
  }, [activeRoute]);

  // Compute per-node stats for nodes on the active route
  const routeNodes  = activeRoute?.path?.map(id => nodes.find(n => n.id === id)).filter(Boolean) || [];
  const avgLatency  = routeNodes.length ? Math.round(routeNodes.reduce((s, n) => s + (n.latency || 30), 0) / routeNodes.length) : 0;
  const avgSignal   = routeNodes.length ? routeNodes.reduce((s, n) => s + (n.signalStrength || 0.8), 0) / routeNodes.length : 0;
  const avgBattery  = routeNodes.length ? routeNodes.reduce((s, n) => s + (n.battery || 80), 0) / routeNodes.length : 0;
  const avgRel      = routeNodes.length ? routeNodes.reduce((s, n) => s + (n.reliability || 0.9), 0) / routeNodes.length : 0;

  const latencyScore = avgLatency < 20 ? 95 : avgLatency < 40 ? 75 : avgLatency < 70 ? 50 : 25;

  return (
    <div style={{
      background: 'rgba(2,11,24,0.95)',
      border: `1px solid ${sosActive ? 'rgba(255,0,64,0.3)' : 'rgba(0,245,255,0.1)'}`,
      borderRadius: 10,
      overflow: 'hidden',
      transition: 'border-color 0.4s',
    }}>
      {/* Header */}
      <div style={{
        padding: '9px 12px',
        borderBottom: `1px solid ${sosActive ? 'rgba(255,0,64,0.15)' : 'rgba(0,245,255,0.08)'}`,
        display: 'flex', alignItems: 'center', gap: 8,
        background: sosActive ? 'rgba(255,0,64,0.04)' : 'transparent',
        transition: 'all 0.4s',
      }}>
        {/* AI thinking indicator */}
        <div style={{ position: 'relative', width: 16, height: 16, flexShrink: 0 }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%',
            border: `1px solid ${sosActive ? '#ff0040' : '#00f5ff'}`, background: sosActive ? 'rgba(255,0,64,0.1)' : 'rgba(0,245,255,0.1)' }} />
          <div className={currentHopStep ? 'ai-thinking' : 'radar-ping'} style={{ position: 'absolute', inset: 0, borderRadius: '50%',
            border: `1px solid ${sosActive ? '#ff0040' : '#00f5ff'}` }} />
        </div>
        <span style={{
          fontFamily: 'Orbitron', fontSize: 9,
          color: sosActive ? '#ff0040' : '#00f5ff',
          letterSpacing: '0.15em', flex: 1,
          transition: 'color 0.3s',
        }}>
          {sosActive ? '🚨 SOS ROUTING ACTIVE' : currentHopStep ? '⚡ ROUTING...' : 'AI NETWORK INTEL'}
        </span>
        <div style={{ width: 5, height: 5, borderRadius: '50%',
          background: isConnected ? '#00ff88' : '#ff0040',
          boxShadow: `0 0 6px ${isConnected ? '#00ff88' : '#ff0040'}`,
          animation: isConnected ? 'none' : undefined }} />
      </div>

      {/* Live hop step mini-bar */}
      <AnimatePresence>
        {currentHopStep && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{
              overflow: 'hidden',
              borderBottom: `1px solid ${currentHopStep.isSOS ? 'rgba(255,0,64,0.2)' : 'rgba(0,245,255,0.1)'}`,
            }}
          >
            <div style={{
              padding: '5px 12px',
              background: currentHopStep.isSOS ? 'rgba(255,0,64,0.06)' : 'rgba(0,245,255,0.04)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <motion.div
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 0.4, repeat: Infinity }}
                style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: currentHopStep.color,
                  boxShadow: `0 0 8px ${currentHopStep.color}`,
                }}
              />
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: currentHopStep.color }}>
                HOP {currentHopStep.hopIndex + 1}/{currentHopStep.totalHops}
              </span>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: 8, color: 'rgba(127,168,201,0.5)' }}>
                {nodes.find(n => n.id === currentHopStep.fromId)?.name || '?'}
                {' → '}
                {nodes.find(n => n.id === currentHopStep.toId)?.name || '?'}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(0,245,255,0.06)' }}>
        {[{ key: 'route', label: 'CURRENT ROUTE' }, { key: 'history', label: `HISTORY (${routeHistory.length})` }].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
            flex: 1, padding: '7px 0',
            background: activeTab === t.key ? 'rgba(0,245,255,0.05)' : 'transparent',
            border: 'none', borderBottom: `2px solid ${activeTab === t.key ? (sosActive ? '#ff0040' : '#00f5ff') : 'transparent'}`,
            color: activeTab === t.key ? (sosActive ? '#ff0040' : '#00f5ff') : 'rgba(226,245,255,0.3)',
            fontFamily: 'JetBrains Mono', fontSize: 8, letterSpacing: '0.1em', cursor: 'pointer',
            transition: 'all 0.15s',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'route' ? (
          <motion.div key={`route-${flashKey}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className={activeRoute ? 'intel-updated' : ''}
            style={{ padding: '10px 12px' }}>

            {activeRoute ? (
              <>
                {/* AI Decision Tooltip Banner */}
                <AnimatePresence>
                  {showRouteTooltip && routeTooltipData && (
                    <RouteTooltipBanner data={routeTooltipData} />
                  )}
                </AnimatePresence>

                {/* Route path visualization */}
                <RoutePathViz path={activeRoute.path} nodes={nodes} isSOS={sosActive} />

                <div style={{ height: 1, background: 'rgba(0,245,255,0.06)', margin: '8px 0' }} />

                {/* Live Score Breakdown */}
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: 8, color: 'rgba(0,245,255,0.4)',
                  letterSpacing: '0.12em', marginBottom: 8 }}>
                  SCORE BREAKDOWN
                </div>
                <ScoreBar label="LATENCY"  value={latencyScore}   color="#00f5ff" icon="⚡" weight="0.30" />
                <ScoreBar label="SIGNAL"   value={avgSignal * 100} color="#00ff88"  icon="📶" weight="0.30" />
                <ScoreBar label="RELIAB."  value={avgRel * 100}    color="#bf00ff"  icon="🔒" weight="0.20" />
                <ScoreBar label="BATTERY"  value={avgBattery}      color="#ff6b00"  icon="🔋" weight="0.20" />

                <div style={{ height: 1, background: 'rgba(0,245,255,0.06)', margin: '8px 0' }} />

                {/* Live route metadata */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  <LiveMetaPill label="HOPS"   value={activeRoute.hops} color="#00f5ff" />
                  <LiveMetaPill label="SCORE"  value={activeRoute.score?.toFixed(3)} color="#00ff88" rawValue />
                  <LiveMetaPill label="LAT"    value={avgLatency} color="#ff6b00" suffix="ms" />
                </div>
              </>
            ) : (
              <div style={{ padding: '16px 0', textAlign: 'center' }}>
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                  style={{
                    width: 36, height: 36, borderRadius: '50%',
                    border: '1px solid rgba(0,245,255,0.15)', margin: '0 auto 10px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(0,245,255,0.03)',
                    borderTop: '1px solid rgba(0,245,255,0.5)',
                  }}
                >
                  <span style={{ fontSize: 14 }}>🧠</span>
                </motion.div>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'rgba(127,168,201,0.35)',
                  letterSpacing: '0.08em' }}>
                  Awaiting routing event...
                </div>
                <div style={{ fontFamily: 'Inter', fontSize: 10, color: 'rgba(127,168,201,0.25)', marginTop: 4 }}>
                  Send a message to activate AI routing
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ padding: '8px 0', maxHeight: 300, overflowY: 'auto' }} className="log-scroll">

            {routeHistory.length === 0 ? (
              <div style={{ padding: '16px 12px', textAlign: 'center', fontFamily: 'JetBrains Mono',
                fontSize: 9, color: 'rgba(127,168,201,0.3)' }}>
                No routes yet
              </div>
            ) : routeHistory.map((r, i) => {
              const srcNode = nodes.find(n => n.id === r.path?.[0]);
              const dstNode = nodes.find(n => n.id === r.path?.[r.path.length - 1]);
              return (
                <motion.div
                  key={i}
                  initial={i === 0 ? { opacity: 0, x: -8 } : { opacity: 1, x: 0 }}
                  animate={{ opacity: 1, x: 0 }}
                  style={{
                    padding: '7px 12px',
                    borderBottom: '1px solid rgba(0,245,255,0.05)',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,245,255,0.03)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: '#00f5ff' }}>
                      {srcNode?.name || '?'} → {dstNode?.name || '?'}
                    </span>
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: 8, color: 'rgba(127,168,201,0.3)' }}>
                      {r.timestamp ? new Date(r.timestamp).toLocaleTimeString() : ''}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: 8, color: 'rgba(0,255,136,0.6)' }}>
                      {r.hops} hops
                    </span>
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: 8, color: 'rgba(127,168,201,0.4)' }}>
                      score: {r.score?.toFixed(3)}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LiveMetaPill({ label, value, color, suffix = '', rawValue = false }) {
  return (
    <div style={{
      flex: 1, padding: '4px 6px', borderRadius: 5,
      background: `${color}08`, border: `1px solid ${color}20`,
      textAlign: 'center',
    }}>
      <div style={{ fontFamily: 'JetBrains Mono', fontSize: 7, color: 'rgba(127,168,201,0.4)', marginBottom: 2 }}>{label}</div>
      {rawValue ? (
        <div style={{ fontFamily: 'Orbitron', fontSize: 11, color, fontWeight: 700 }}>{value}</div>
      ) : (
        <div style={{ fontFamily: 'Orbitron', fontSize: 11, color, fontWeight: 700 }}>
          <LiveCounter value={typeof value === 'number' ? value : parseFloat(value) || 0} decimals={0} suffix={suffix} color={color} />
        </div>
      )}
    </div>
  );
}
