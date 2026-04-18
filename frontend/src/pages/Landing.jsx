import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';

// ── Animated Mesh Background ──────────────────────────────────────────────────
function MeshBackground() {
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let W = canvas.offsetWidth, H = canvas.offsetHeight;
    canvas.width = W; canvas.height = H;

    const NUM_NODES = 60;
    const MAX_DIST = 180;
    const nodes = Array.from({ length: NUM_NODES }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 2.5 + 1,
      pulse: Math.random() * Math.PI * 2,
    }));

    let t = 0;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      t += 0.01;

      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy;
        n.pulse += 0.02;
        if (n.x < 0 || n.x > W) n.vx *= -1;
        if (n.y < 0 || n.y > H) n.vy *= -1;
      });

      // Draw edges
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
          const dist = Math.hypot(dx, dy);
          if (dist < MAX_DIST) {
            const alpha = (1 - dist / MAX_DIST) * 0.18;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(0,245,255,${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw nodes
      nodes.forEach(n => {
        const glow = Math.sin(n.pulse) * 0.3 + 0.7;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,245,255,${glow * 0.6})`;
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#00f5ff';
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      animRef.current = requestAnimationFrame(draw);
    };

    draw();

    const resize = () => {
      W = canvas.offsetWidth; H = canvas.offsetHeight;
      canvas.width = W; canvas.height = H;
    };
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas ref={canvasRef} style={{
      position: 'absolute', inset: 0, width: '100%', height: '100%',
      pointerEvents: 'none',
    }} />
  );
}

// ── Feature Card ─────────────────────────────────────────────────────────────
function FeatureCard({ icon, title, desc, color, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay }}
      whileHover={{ y: -4, boxShadow: `0 0 30px ${color}20` }}
      style={{
        background: 'rgba(4,20,45,0.85)',
        border: `1px solid ${color}20`,
        borderRadius: 16, padding: '28px 24px',
        backdropFilter: 'blur(20px)',
        flex: 1,
        transition: 'box-shadow 0.3s',
      }}
    >
      <div style={{
        width: 52, height: 52, borderRadius: 12,
        background: `${color}15`,
        border: `1px solid ${color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 24, marginBottom: 16,
        boxShadow: `0 0 16px ${color}20`,
      }}>
        {icon}
      </div>
      <h3 style={{
        fontFamily: 'Orbitron', fontSize: 14, fontWeight: 700,
        color, marginBottom: 10, letterSpacing: '0.05em',
      }}>{title}</h3>
      <p style={{
        fontFamily: 'Inter', fontSize: 13, color: 'rgba(127,168,201,0.8)',
        lineHeight: 1.7,
      }}>{desc}</p>
    </motion.div>
  );
}

// ── Stat Item ─────────────────────────────────────────────────────────────────
function StatItem({ value, label, color }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      style={{ textAlign: 'center' }}
    >
      <div style={{
        fontFamily: 'Orbitron', fontSize: 42, fontWeight: 900, color,
        textShadow: `0 0 20px ${color}60`,
        lineHeight: 1,
      }}>{value}</div>
      <div style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: 'rgba(127,168,201,0.6)', letterSpacing: '0.15em', marginTop: 8 }}>
        {label}
      </div>
    </motion.div>
  );
}

// ── Main Landing Page ─────────────────────────────────────────────────────────
export default function Landing() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      background: '#020b18',
      overflowX: 'hidden',
      fontFamily: 'Inter, sans-serif',
    }}>
      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '80px 40px' }}>
        <MeshBackground />

        {/* Grid overlay */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'linear-gradient(rgba(0,245,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(0,245,255,0.025) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />

        {/* Top nav */}
        <nav style={{
          position: 'fixed', top: 0, left: 0, right: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 48px',
          background: 'rgba(2,11,24,0.8)', backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(0,245,255,0.08)',
          zIndex: 100,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 22 }}>🧠</span>
            <span style={{ fontFamily: 'Orbitron', fontSize: 16, fontWeight: 700, color: '#00f5ff', letterSpacing: '0.1em' }}>
              NEUROGRID AI
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {['Dashboard', 'Simulation', 'Architecture'].map(page => (
              <button key={page} onClick={() => navigate(`/${page.toLowerCase()}`)}
                style={{
                  padding: '8px 18px', background: 'transparent',
                  border: '1px solid rgba(0,245,255,0.15)', borderRadius: 6,
                  color: 'rgba(226,245,255,0.7)', fontFamily: 'Inter', fontSize: 13, cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.target.style.borderColor = 'rgba(0,245,255,0.4)'; e.target.style.color = '#00f5ff'; }}
                onMouseLeave={e => { e.target.style.borderColor = 'rgba(0,245,255,0.15)'; e.target.style.color = 'rgba(226,245,255,0.7)'; }}
              >
                {page}
              </button>
            ))}
          </div>
        </nav>

        {/* Hero Content */}
        <div style={{ position: 'relative', textAlign: 'center', maxWidth: 900, zIndex: 1, paddingTop: 60 }}>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '6px 18px', borderRadius: 9999,
              background: 'rgba(255,0,64,0.08)',
              border: '1px solid rgba(255,0,64,0.2)',
              marginBottom: 32,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff0040', boxShadow: '0 0 8px #ff0040', display: 'inline-block' }} />
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: '#ff6b6b', letterSpacing: '0.1em' }}>
              CRISIS COMMUNICATION NETWORK — ACTIVE
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            style={{
              fontFamily: 'Orbitron',
              fontSize: 'clamp(36px, 7vw, 80px)',
              fontWeight: 900,
              lineHeight: 1.1,
              marginBottom: 28,
              color: '#fff',
            }}
          >
            <span style={{ color: '#00f5ff', textShadow: '0 0 30px rgba(0,245,255,0.5)' }}>Neuro</span>
            <span style={{ color: '#fff' }}>Grid</span>
            <span style={{ color: '#00ff88', textShadow: '0 0 30px rgba(0,255,136,0.4)' }}> AI</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            style={{
              fontSize: 18, color: 'rgba(127,168,201,0.9)',
              lineHeight: 1.8, marginBottom: 48, maxWidth: 680, margin: '0 auto 48px',
            }}
          >
            Decentralized AI-powered mesh communication for disaster response.
            Self-healing networks, intelligent routing, real-time visualization.
            When infrastructure fails, NeuroGrid adapts.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35 }}
            style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}
          >
            <motion.button
              onClick={() => navigate('/dashboard')}
              whileHover={{ scale: 1.04, boxShadow: '0 0 40px rgba(0,245,255,0.5)' }}
              whileTap={{ scale: 0.97 }}
              style={{
                padding: '16px 40px',
                background: 'linear-gradient(135deg, rgba(0,245,255,0.2), rgba(0,245,255,0.05))',
                border: '2px solid #00f5ff',
                borderRadius: 10, color: '#00f5ff',
                fontFamily: 'Orbitron', fontSize: 14, fontWeight: 700,
                letterSpacing: '0.08em', cursor: 'pointer',
                boxShadow: '0 0 20px rgba(0,245,255,0.25)',
              }}
            >
              ⚡ ENTER COMMAND CENTER
            </motion.button>
            <motion.button
              onClick={() => navigate('/architecture')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              style={{
                padding: '16px 40px',
                background: 'transparent',
                border: '1px solid rgba(0,245,255,0.2)',
                borderRadius: 10, color: 'rgba(226,245,255,0.7)',
                fontFamily: 'Inter', fontSize: 14, cursor: 'pointer',
              }}
            >
              How It Works →
            </motion.button>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{ position: 'absolute', bottom: 40, color: 'rgba(0,245,255,0.3)', fontSize: 20 }}
        >
          ↓
        </motion.div>
      </section>

      {/* ── STATS ─────────────────────────────────────────────────────────── */}
      <section style={{
        padding: '80px 48px',
        background: 'rgba(0,245,255,0.02)',
        borderTop: '1px solid rgba(0,245,255,0.08)',
        borderBottom: '1px solid rgba(0,245,255,0.08)',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 40 }}>
          <StatItem value="10+" label="MESH NODES" color="#00f5ff" />
          <StatItem value="<20ms" label="AVG LATENCY" color="#00ff88" />
          <StatItem value="99.9%" label="UPTIME" color="#bf00ff" />
          <StatItem value="A*" label="AI ROUTING" color="#ff6b00" />
          <StatItem value="∞" label="SELF-HEALING" color="#00f5ff" />
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────────────────── */}
      <section style={{ padding: '100px 48px', maxWidth: 1200, margin: '0 auto' }}>
        <motion.div
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          style={{ textAlign: 'center', marginBottom: 64 }}
        >
          <h2 style={{ fontFamily: 'Orbitron', fontSize: 32, fontWeight: 700, color: '#e2f5ff', marginBottom: 16 }}>
            Built for the <span style={{ color: '#ff0040' }}>Worst</span> Scenarios
          </h2>
          <p style={{ fontSize: 15, color: 'rgba(127,168,201,0.7)', maxWidth: 600, margin: '0 auto' }}>
            Every feature designed for when conventional infrastructure fails
          </p>
        </motion.div>

        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <FeatureCard
            icon="🧠" title="Dijkstra AI Routing" color="#00f5ff" delay={0}
            desc="Weighted graph algorithm selects optimal paths considering latency, signal strength, battery life, and node reliability — with human-readable explanations."
          />
          <FeatureCard
            icon="🔄" title="Self-Healing Network" color="#00ff88" delay={0.1}
            desc="Failed nodes automatically trigger route recalculation. The mesh adapts in real-time, finding alternative paths within milliseconds of a node going offline."
          />
          <FeatureCard
            icon="🚨" title="SOS Broadcast" color="#ff0040" delay={0.2}
            desc="One-tap emergency broadcast fans out to all reachable nodes simultaneously, using optimal routes. Animated hop-by-hop visualization shows propagation in real-time."
          />
          <FeatureCard
            icon="📡" title="Mesh-Only Mode" color="#bf00ff" delay={0.3}
            desc="Internet uplink can be disabled to simulate full infrastructure collapse. The mesh network operates autonomously, maintaining communication via peer-to-peer links."
          />
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section style={{
        padding: '100px 48px', textAlign: 'center',
        background: 'linear-gradient(180deg, transparent, rgba(0,245,255,0.03))',
        borderTop: '1px solid rgba(0,245,255,0.08)',
      }}>
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 style={{ fontFamily: 'Orbitron', fontSize: 36, fontWeight: 900, color: '#e2f5ff', marginBottom: 20 }}>
            Deploy the <span style={{ color: '#00f5ff' }}>Grid</span>
          </h2>
          <p style={{ fontSize: 15, color: 'rgba(127,168,201,0.7)', marginBottom: 40 }}>
            Watch the network come alive — real-time routing, live node stats, full simulation control
          </p>
          <motion.button
            onClick={() => navigate('/dashboard')}
            whileHover={{ scale: 1.04, boxShadow: '0 0 60px rgba(0,245,255,0.5)' }}
            whileTap={{ scale: 0.97 }}
            style={{
              padding: '20px 60px',
              background: 'linear-gradient(135deg, rgba(0,245,255,0.25), rgba(0,255,136,0.1))',
              border: '2px solid #00f5ff',
              borderRadius: 12, color: '#fff',
              fontFamily: 'Orbitron', fontSize: 16, fontWeight: 900,
              letterSpacing: '0.1em', cursor: 'pointer',
              boxShadow: '0 0 30px rgba(0,245,255,0.3)',
            }}
          >
            🚀 LAUNCH DASHBOARD
          </motion.button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '24px 48px',
        borderTop: '1px solid rgba(0,245,255,0.08)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontFamily: 'Orbitron', fontSize: 12, color: 'rgba(0,245,255,0.3)' }}>NEUROGRID AI © 2026</span>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: 'rgba(127,168,201,0.3)' }}>
          DIJKSTRA ROUTING // SOCKET.IO // D3.JS // MONGODB
        </span>
      </footer>
    </div>
  );
}
