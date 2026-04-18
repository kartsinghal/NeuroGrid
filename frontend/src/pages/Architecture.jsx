import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import StatusBar from '../components/StatusBar';

function DiagramBox({ title, subtitle, color, icon, children, x, y, w, h }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        position: 'absolute', left: x, top: y, width: w,
        background: 'rgba(4,20,45,0.9)',
        border: `1px solid ${color}30`,
        borderRadius: 12, padding: 16,
        backdropFilter: 'blur(16px)',
        boxShadow: `0 0 20px ${color}10`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <div>
          <div style={{ fontFamily: 'Orbitron', fontSize: 11, color, fontWeight: 700 }}>{title}</div>
          {subtitle && <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'rgba(127,168,201,0.5)' }}>{subtitle}</div>}
        </div>
      </div>
      <div style={{ fontFamily: 'Inter', fontSize: 11, color: 'rgba(226,245,255,0.65)', lineHeight: 1.6 }}>
        {children}
      </div>
    </motion.div>
  );
}

function Arrow({ x1, y1, x2, y2, color = 'rgba(0,245,255,0.25)', label }) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  const ux = dx / len, uy = dy / len;
  const arrowSize = 8;
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2 - ux * arrowSize} y2={y2 - uy * arrowSize}
        stroke={color} strokeWidth={1.5} strokeDasharray="4 3" />
      <polygon
        points={`0,-${arrowSize / 2} ${arrowSize},0 0,${arrowSize / 2}`}
        fill={color}
        transform={`translate(${x2},${y2}) rotate(${Math.atan2(dy, dx) * 180 / Math.PI})`}
      />
      {label && (
        <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 6}
          fill={color} fontSize={9} textAnchor="middle" fontFamily="JetBrains Mono">
          {label}
        </text>
      )}
    </g>
  );
}

export default function Architecture() {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#020b18', overflow: 'hidden' }}
    >
      <StatusBar />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <div style={{
          width: 200, flexShrink: 0, padding: 12,
          borderRight: '1px solid rgba(0,245,255,0.08)',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <div style={{ fontFamily: 'Orbitron', fontSize: 11, color: '#00f5ff', letterSpacing: '0.1em', marginBottom: 8 }}>
            🗺 ARCHITECTURE
          </div>
          {[
            { label: '🏠 Home', path: '/' },
            { label: '📡 Dashboard', path: '/dashboard' },
            { label: '⚙ Simulation', path: '/simulation' },
            { label: '🗺 Architecture', path: '/architecture', active: true },
          ].map(item => (
            <button key={item.path} onClick={() => navigate(item.path)} style={{
              width: '100%', padding: '8px 12px', textAlign: 'left',
              background: item.active ? 'rgba(0,245,255,0.08)' : 'transparent',
              border: `1px solid ${item.active ? 'rgba(0,245,255,0.2)' : 'transparent'}`,
              borderRadius: 6, color: item.active ? '#00f5ff' : 'rgba(226,245,255,0.5)',
              fontFamily: 'Inter', fontSize: 12, cursor: 'pointer',
            }}>{item.label}</button>
          ))}
        </div>

        {/* Main content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '40px 48px' }}>
          <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            {/* Title */}
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 48 }}>
              <h1 style={{ fontFamily: 'Orbitron', fontSize: 28, fontWeight: 900, color: '#e2f5ff', marginBottom: 12 }}>
                System <span style={{ color: '#00f5ff' }}>Architecture</span>
              </h1>
              <p style={{ fontFamily: 'Inter', fontSize: 14, color: 'rgba(127,168,201,0.7)', lineHeight: 1.7, maxWidth: 700 }}>
                NeuroGrid AI is a layered real-time system. The backend AI engine computes optimal routes using Dijkstra's algorithm, propagates events via WebSocket, and drives a D3.js force-directed visualization on the frontend.
              </p>
            </motion.div>

            {/* Architecture Diagram (SVG based) */}
            <div style={{ position: 'relative', height: 520, marginBottom: 60 }}>
              {/* SVG arrows */}
              <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                {/* Client → Socket.IO */}
                <Arrow x1={160} y1={80} x2={380} y2={80} color="rgba(0,245,255,0.3)" label="WebSocket" />
                {/* Socket.IO → NodeManager */}
                <Arrow x1={520} y1={110} x2={520} y2={200} color="rgba(0,245,255,0.3)" label="" />
                {/* Socket.IO → RoutingEngine */}
                <Arrow x1={560} y1={100} x2={720} y2={200} color="rgba(0,255,136,0.3)" label="route req" />
                {/* Socket.IO → SimEngine */}
                <Arrow x1={480} y1={100} x2={320} y2={200} color="rgba(191,0,255,0.3)" label="events" />
                {/* NodeManager → MongoDB */}
                <Arrow x1={520} y1={290} x2={520} y2={390} color="rgba(0,245,255,0.2)" label="sync" />
                {/* RoutingEngine → NodeManager */}
                <Arrow x1={680} y1={240} x2={580} y2={240} color="rgba(0,255,136,0.25)" label="graph data" />
              </svg>

              {/* Frontend Box */}
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
                style={{
                  position: 'absolute', left: 0, top: 40, width: 170,
                  background: 'rgba(0,245,255,0.05)', border: '1px solid rgba(0,245,255,0.2)',
                  borderRadius: 12, padding: 16,
                }}>
                <div style={{ fontFamily: 'Orbitron', fontSize: 10, color: '#00f5ff', marginBottom: 8 }}>🖥 FRONTEND</div>
                {['React + Vite', 'D3.js Graph', 'Framer Motion', 'Zustand Store', 'Socket.IO Client'].map(t => (
                  <div key={t} style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'rgba(226,245,255,0.5)', marginBottom: 4 }}>• {t}</div>
                ))}
              </motion.div>

              {/* Socket.IO Server Box */}
              <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                style={{
                  position: 'absolute', left: 380, top: 30, width: 200,
                  background: 'rgba(191,0,255,0.05)', border: '1px solid rgba(191,0,255,0.2)',
                  borderRadius: 12, padding: 16,
                }}>
                <div style={{ fontFamily: 'Orbitron', fontSize: 10, color: '#bf00ff', marginBottom: 8 }}>⚡ EVENT SYSTEM</div>
                {['Socket.IO Server', 'Event Emitter', 'Message Queue', 'SOS Broadcast', 'State Sync'].map(t => (
                  <div key={t} style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'rgba(226,245,255,0.5)', marginBottom: 4 }}>• {t}</div>
                ))}
              </motion.div>

              {/* Node Manager */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                style={{
                  position: 'absolute', left: 380, top: 200, width: 180,
                  background: 'rgba(0,245,255,0.05)', border: '1px solid rgba(0,245,255,0.2)',
                  borderRadius: 12, padding: 16,
                }}>
                <div style={{ fontFamily: 'Orbitron', fontSize: 10, color: '#00f5ff', marginBottom: 8 }}>⬡ NODE MANAGER</div>
                {['10 Seed Nodes', 'CRUD Operations', 'Battery Tracking', 'Status Updates', 'Topology Map'].map(t => (
                  <div key={t} style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'rgba(226,245,255,0.5)', marginBottom: 4 }}>• {t}</div>
                ))}
              </motion.div>

              {/* Routing Engine */}
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }}
                style={{
                  position: 'absolute', left: 620, top: 200, width: 200,
                  background: 'rgba(0,255,136,0.05)', border: '1px solid rgba(0,255,136,0.2)',
                  borderRadius: 12, padding: 16,
                }}>
                <div style={{ fontFamily: 'Orbitron', fontSize: 10, color: '#00ff88', marginBottom: 8 }}>🧠 AI ROUTING ENGINE</div>
                {["Dijkstra's Algorithm", 'Composite Edge Weights', 'Latency × 0.30', 'Signal × 0.30', 'Reliability × 0.20', 'Battery × 0.20', 'AI Explanation'].map(t => (
                  <div key={t} style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'rgba(226,245,255,0.5)', marginBottom: 4 }}>• {t}</div>
                ))}
              </motion.div>

              {/* Sim Engine */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                style={{
                  position: 'absolute', left: 140, top: 200, width: 180,
                  background: 'rgba(255,107,0,0.05)', border: '1px solid rgba(255,107,0,0.2)',
                  borderRadius: 12, padding: 16,
                }}>
                <div style={{ fontFamily: 'Orbitron', fontSize: 10, color: '#ff6b00', marginBottom: 8 }}>⚙ SIM ENGINE</div>
                {['Battery Drain', 'Signal Fluctuation', 'Node Failure', 'Self-Healing', 'Storm Events'].map(t => (
                  <div key={t} style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'rgba(226,245,255,0.5)', marginBottom: 4 }}>• {t}</div>
                ))}
              </motion.div>

              {/* MongoDB */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
                style={{
                  position: 'absolute', left: 380, top: 390, width: 180,
                  background: 'rgba(0,128,0,0.05)', border: '1px solid rgba(0,200,0,0.2)',
                  borderRadius: 12, padding: 16,
                }}>
                <div style={{ fontFamily: 'Orbitron', fontSize: 10, color: '#00cc44', marginBottom: 8 }}>🗄 DATABASE</div>
                {['MongoDB Atlas', 'Local MongoDB', 'In-Memory Fallback', 'Nodes Schema', 'Messages Log'].map(t => (
                  <div key={t} style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'rgba(226,245,255,0.5)', marginBottom: 4 }}>• {t}</div>
                ))}
              </motion.div>
            </div>

            {/* Routing Algorithm Details */}
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
              style={{ marginBottom: 40 }}>
              <h2 style={{ fontFamily: 'Orbitron', fontSize: 20, color: '#00ff88', marginBottom: 20 }}>
                🧠 AI Routing Algorithm
              </h2>
              <div style={{
                background: 'rgba(0,255,136,0.04)', border: '1px solid rgba(0,255,136,0.15)',
                borderRadius: 12, padding: 24,
              }}>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: 13, color: '#00ff88', marginBottom: 12 }}>
                  ▶ Dijkstra's Shortest Path (Composite Weighted Graph)
                </div>
                <pre style={{
                  fontFamily: 'JetBrains Mono', fontSize: 12,
                  color: 'rgba(226,245,255,0.8)', lineHeight: 1.8,
                  background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: 16,
                  overflow: 'auto',
                }}>
{`edge_weight = (
  normalize(latency)    × 0.30  // Latency factor
  (1 - signal_strength) × 0.30  // Signal cost  
  (1 - avg_reliability) × 0.20  // Reliability factor
  (1 - avg_battery/100) × 0.20  // Battery factor
)

// Dijkstra finds path with minimum total edge_weight
// Then generates human-readable explanation:
// "AI Router: Alpha Base → Eta Sector → Delta Field
//  Selected for low-latency corridor and strong signal chain.
//  Path score: 0.284 | Hops: 2 | Est. latency: 58ms"`}
                </pre>
                <div style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {[
                    { factor: 'Latency', weight: '30%', color: '#00f5ff' },
                    { factor: 'Signal', weight: '30%', color: '#00ff88' },
                    { factor: 'Reliability', weight: '20%', color: '#bf00ff' },
                    { factor: 'Battery', weight: '20%', color: '#ff6b00' },
                  ].map(f => (
                    <div key={f.factor} style={{
                      padding: '8px 16px',
                      background: `${f.color}10`,
                      border: `1px solid ${f.color}25`,
                      borderRadius: 8,
                      fontFamily: 'JetBrains Mono', fontSize: 11,
                      color: f.color,
                    }}>
                      {f.factor}: <strong>{f.weight}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Tech Stack */}
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
              <h2 style={{ fontFamily: 'Orbitron', fontSize: 20, color: '#00f5ff', marginBottom: 20 }}>
                ⚡ Technology Stack
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { layer: 'Frontend', items: ['React 18 + Vite 5', 'D3.js v7 (Force Graph)', 'Framer Motion (Animations)', 'Tailwind CSS v4', 'Zustand (State)', 'Socket.IO Client'], color: '#00f5ff' },
                  { layer: 'Backend', items: ['Node.js + Express 4', 'Socket.IO Server', 'Dijkstra Routing Engine', 'Simulation Engine', 'Node Manager', 'Express-async-errors'], color: '#bf00ff' },
                  { layer: 'Database', items: ['MongoDB Atlas (Primary)', 'Local MongoDB (Fallback)', 'In-Memory Store (Default)', 'Mongoose ODM', 'Auto-connect cascade'], color: '#00cc44' },
                  { layer: 'AI System', items: ['Composite Weight Formula', 'Graph-based Dijkstra', 'Natural Language Explanations', 'Network Health Scoring', 'SOS Fan-out Routing', 'Self-Healing Detection'], color: '#00ff88' },
                ].map(({ layer, items, color }) => (
                  <div key={layer} style={{
                    background: `${color}05`, border: `1px solid ${color}18`,
                    borderRadius: 12, padding: '16px 20px',
                  }}>
                    <div style={{ fontFamily: 'Orbitron', fontSize: 12, color, marginBottom: 12 }}>{layer}</div>
                    {items.map(item => (
                      <div key={item} style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: 'rgba(226,245,255,0.6)', marginBottom: 6 }}>
                        › {item}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
