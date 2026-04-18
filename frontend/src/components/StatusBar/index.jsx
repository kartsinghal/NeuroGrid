import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useNetworkStore from '../../store/networkStore';

function AnimatedCounter({ value, decimals = 0, suffix = '' }) {
  const prevRef = useRef(value);
  useEffect(() => { prevRef.current = value; }, [value]);

  return (
    <motion.span
      key={value}
      initial={{ opacity: 0.4, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      style={{ display: 'inline-block' }}
    >
      {typeof value === 'number' ? value.toFixed(decimals) : value}{suffix}
    </motion.span>
  );
}

// ── Live signal waveform bars ─────────────────────────────────────────────────
function SignalWave({ value, color }) {
  const bars = [0.25, 0.5, 0.75, 1.0];
  const isLive = value > 0.3;

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 16 }}>
      {bars.map((threshold, i) => (
        <div
          key={i}
          className={isLive ? `signal-wave-bar` : ''}
          style={{
            width: 4,
            height: `${(i + 1) * 25}%`,
            borderRadius: 1,
            background: value >= threshold
              ? (value > 0.7 ? '#00ff88' : value > 0.4 ? '#ff6b00' : '#ff4500')
              : 'rgba(255,255,255,0.08)',
            transition: 'background 0.4s, height 0.3s',
            transformOrigin: 'bottom',
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}
    </div>
  );
}

function StatCard({ label, value, suffix, color, icon, bar, decimals, sos, pulse }) {
  return (
    <div style={{
      background: sos ? 'rgba(255,0,64,0.04)' : 'rgba(0,245,255,0.03)',
      border: `1px solid ${sos ? 'rgba(255,0,64,0.15)' : 'rgba(0,245,255,0.08)'}`,
      borderRadius: 10,
      padding: '10px 14px',
      flex: 1,
      transition: 'all 0.4s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'rgba(127,168,201,0.6)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {label}
        </span>
        <span style={{ fontSize: 12 }}>{icon}</span>
      </div>
      <div style={{ fontFamily: 'Orbitron', fontSize: 18, fontWeight: 700, color, lineHeight: 1 }}
        className={pulse ? 'health-critical' : ''}>
        <AnimatedCounter value={value} decimals={decimals || 0} suffix={suffix || ''} />
      </div>
      {bar !== undefined && (
        <div style={{ marginTop: 6, height: 2, background: 'rgba(255,255,255,0.05)', borderRadius: 1, overflow: 'hidden' }}>
          <motion.div
            animate={{ width: `${Math.min(100, bar)}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{
              height: '100%', background: color, borderRadius: 1,
              boxShadow: pulse ? `0 0 8px ${color}` : 'none',
            }}
          />
        </div>
      )}
    </div>
  );
}

export default function StatusBar() {
  const { networkStatus, isConnected, internetEnabled, nodes, sosActive } = useNetworkStore(s => ({
    networkStatus: s.networkStatus,
    isConnected: s.isConnected,
    internetEnabled: s.internetEnabled,
    nodes: s.nodes,
    sosActive: s.sosActive,
  }));

  const { active, degraded, offline, total, avgLatency, avgSignal, avgBattery } = networkStatus;
  const healthScore    = total > 0 ? Math.round((active / total) * 100) : 0;
  const healthColor    = healthScore > 70 ? '#00ff88' : healthScore > 40 ? '#ff6b00' : '#ff0040';
  const latencyColor   = avgLatency < 30 ? '#00ff88' : avgLatency < 60 ? '#ff6b00' : '#ff0040';
  const batteryColor   = avgBattery > 50 ? '#00ff88' : avgBattery > 20 ? '#ff6b00' : '#ff0040';
  const isCritical     = healthScore < 40 || offline > active;

  return (
    <div
      className={sosActive ? 'statusbar-sos-mode' : ''}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 16px',
        background: 'rgba(2,11,24,0.9)',
        borderBottom: '1px solid rgba(0,245,255,0.1)',
        backdropFilter: 'blur(20px)',
        transition: 'background 0.4s, border-color 0.4s',
        position: 'relative',
        zIndex: 10,
      }}>

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 'fit-content' }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          border: `2px solid ${sosActive ? 'rgba(255,0,64,0.6)' : 'rgba(0,245,255,0.5)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: sosActive ? 'rgba(255,0,64,0.08)' : 'rgba(0,245,255,0.08)',
          position: 'relative',
          transition: 'all 0.4s',
        }}>
          <span style={{ fontSize: 16 }}>🧠</span>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: sosActive ? 2 : 6, repeat: Infinity, ease: 'linear' }}
            style={{
              position: 'absolute', inset: -5,
              borderRadius: '50%',
              border: '1px solid transparent',
              borderTopColor: sosActive ? 'rgba(255,0,64,0.6)' : 'rgba(0,245,255,0.4)',
              borderRightColor: sosActive ? 'rgba(255,0,64,0.3)' : 'rgba(0,245,255,0.2)',
            }}
          />
        </div>
        <div>
          <div style={{ fontFamily: 'Orbitron', fontSize: 13, fontWeight: 700,
            color: sosActive ? '#ff0040' : '#00f5ff',
            letterSpacing: '0.08em', transition: 'color 0.4s' }}>
            NEUROGRID
          </div>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9,
            color: sosActive ? 'rgba(255,0,64,0.5)' : 'rgba(0,245,255,0.4)',
            letterSpacing: '0.15em', transition: 'color 0.4s' }}>
            {sosActive ? '🚨 SOS MODE' : 'AI MESH v2.0'}
          </div>
        </div>
      </div>

      <div style={{ width: 1, height: 36, background: sosActive ? 'rgba(255,0,64,0.2)' : 'rgba(0,245,255,0.1)', transition: 'background 0.4s' }} />

      {/* Connection status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 'fit-content' }}>
        <motion.div
          animate={{ scale: isConnected ? [1, 1.35, 1] : 1, opacity: isConnected ? 1 : 0.4 }}
          transition={{ duration: isConnected ? (sosActive ? 0.7 : 1.5) : 0, repeat: isConnected ? Infinity : 0 }}
          style={{
            width: 8, height: 8, borderRadius: '50%',
            background: isConnected ? '#00ff88' : '#ff0040',
            boxShadow: isConnected ? '0 0 8px rgba(0,255,136,0.6)' : 'none',
          }}
        />
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: isConnected ? '#00ff88' : '#ff0040' }}>
          {isConnected ? 'LIVE' : 'OFFLINE'}
        </span>
      </div>

      {/* Internet indicator */}
      <div style={{
        padding: '3px 10px',
        borderRadius: 4,
        background: internetEnabled ? 'rgba(0,255,136,0.08)' : 'rgba(255,107,0,0.08)',
        border: `1px solid ${internetEnabled ? 'rgba(0,255,136,0.2)' : 'rgba(255,107,0,0.3)'}`,
        fontFamily: 'JetBrains Mono', fontSize: 9,
        color: internetEnabled ? '#00ff88' : '#ff6b00',
        letterSpacing: '0.1em',
      }}>
        {internetEnabled ? '🌐 UPLINK' : '📡 MESH'}
      </div>

      {/* Avg signal waveform */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 'fit-content' }}>
        <SignalWave value={avgSignal} color="#00ff88" />
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'rgba(0,245,255,0.5)' }}>
          {(avgSignal * 100).toFixed(0)}%
        </span>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'flex', gap: 8, flex: 1 }}>
        <StatCard label="Nodes"   value={active}   suffix={`/${total}`} color="#00ff88" icon="⬡" sos={sosActive} />
        <StatCard label="Latency" value={avgLatency} suffix="ms"        color={latencyColor} icon="⚡" sos={sosActive} />
        <StatCard label="Battery" value={avgBattery} suffix="%" decimals={0} color={batteryColor} icon="🔋" bar={avgBattery} sos={sosActive} />
        <StatCard label="Health"  value={healthScore} suffix="%" color={healthColor} icon={isCritical ? '⚠' : '💚'} bar={healthScore} sos={sosActive} pulse={isCritical} />
      </div>

      {/* Node status pills */}
      <div style={{ display: 'flex', gap: 6, minWidth: 'fit-content' }}>
        <Pill label={`${active} ACTIVE`} color="#00ff88" />
        {degraded > 0 && <Pill label={`${degraded} DEGRD`} color="#ff6b00" pulse />}
        {offline > 0 && <Pill label={`${offline} DOWN`} color="#ff0040" pulse={sosActive} />}
      </div>

      {/* SOS mode indicator in status bar */}
      <AnimatePresence>
        {sosActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            style={{
              padding: '4px 12px',
              background: 'rgba(255,0,64,0.15)',
              border: '1px solid rgba(255,0,64,0.5)',
              borderRadius: 6,
              fontFamily: 'Orbitron', fontSize: 9,
              color: '#ff0040', letterSpacing: '0.12em',
              animation: 'blink 0.65s ease-in-out infinite',
              boxShadow: '0 0 12px rgba(255,0,64,0.3)',
            }}
          >
            🚨 SOS
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Pill({ label, color, pulse }) {
  return (
    <div style={{
      padding: '3px 8px', borderRadius: 4,
      background: `${color}12`,
      border: `1px solid ${color}30`,
      fontFamily: 'JetBrains Mono', fontSize: 9,
      color, letterSpacing: '0.08em', fontWeight: 600,
      animation: pulse ? `blink 0.8s ease-in-out infinite` : 'none',
    }}>
      {label}
    </div>
  );
}
