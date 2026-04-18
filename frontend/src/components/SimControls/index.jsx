import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useNetworkStore from '../../store/networkStore';
import { useSocket } from '../../hooks/useSocket';

export default function SimControls() {
  const nodes = useNetworkStore(s => s.nodes);
  const internetEnabled = useNetworkStore(s => s.internetEnabled);
  const { simulateAction } = useSocket();

  const [selectedNodeId, setSelectedNodeId] = useState('');
  const [signalVal, setSignalVal] = useState(80);
  const [batteryVal, setBatteryVal] = useState(80);
  const [newNodeName, setNewNodeName] = useState('');
  const [lastAction, setLastAction] = useState(null);

  const activeNodes = nodes.filter(n => n.status !== 'offline');
  const offlineNodes = nodes.filter(n => n.status === 'offline');

  const doAction = (type, payload = {}) => {
    simulateAction(type, payload);
    setLastAction({ type, ts: Date.now() });
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 12,
      padding: '14px 12px',
      height: '100%',
      overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{ fontFamily: 'Orbitron', fontSize: 11, color: '#00f5ff', letterSpacing: '0.15em', marginBottom: 4 }}>
        ⚙ SIM CONTROLS
      </div>

      {/* Node Selector */}
      <Section label="SELECT NODE">
        <select
          value={selectedNodeId}
          onChange={e => setSelectedNodeId(e.target.value)}
          style={{
            width: '100%', padding: '7px 10px',
            background: 'rgba(0,245,255,0.04)',
            border: '1px solid rgba(0,245,255,0.15)',
            borderRadius: 6, color: '#e2f5ff',
            fontFamily: 'JetBrains Mono', fontSize: 11,
            outline: 'none', cursor: 'pointer',
          }}
        >
          <option value="">— choose node —</option>
          {nodes.map(n => (
            <option key={n.id} value={n.id} style={{ background: '#020b18' }}>
              [{n.status.toUpperCase().slice(0,3)}] {n.name}
            </option>
          ))}
        </select>

        {selectedNode && (
          <div style={{
            marginTop: 6, padding: '6px 10px',
            background: 'rgba(0,245,255,0.04)',
            border: '1px solid rgba(0,245,255,0.1)',
            borderRadius: 6,
            fontFamily: 'JetBrains Mono', fontSize: 10, color: '#7fa8c9',
          }}>
            <div>Battery: <span style={{ color: '#00ff88' }}>{selectedNode.battery?.toFixed(0)}%</span></div>
            <div>Signal: <span style={{ color: '#00f5ff' }}>{(selectedNode.signalStrength * 100).toFixed(0)}%</span></div>
            <div>Status: <span style={{ color: selectedNode.status === 'active' ? '#00ff88' : '#ff6b00' }}>{selectedNode.status}</span></div>
          </div>
        )}
      </Section>

      {/* Node Actions */}
      <Section label="NODE ACTIONS">
        <ActionButton
          label="💀 Kill Node"
          color="#ff0040"
          disabled={!selectedNodeId || selectedNode?.status === 'offline'}
          onClick={() => doAction('FAIL_NODE', { nodeId: selectedNodeId })}
        />
        <ActionButton
          label="💚 Recover Node"
          color="#00ff88"
          disabled={!selectedNodeId || selectedNode?.status !== 'offline'}
          onClick={() => doAction('RECOVER_NODE', { nodeId: selectedNodeId })}
        />
        <ActionButton
          label="🗑 Remove Node"
          color="#ff6b00"
          disabled={!selectedNodeId}
          onClick={() => { doAction('REMOVE_NODE', { nodeId: selectedNodeId }); setSelectedNodeId(''); }}
        />
      </Section>

      {/* Signal Adjust */}
      <Section label="SIGNAL STRENGTH">
        <SliderControl
          value={signalVal}
          min={10} max={100}
          color="#00f5ff"
          label={`${signalVal}%`}
          onChange={setSignalVal}
        />
        <ActionButton
          label="Apply Signal"
          color="#00f5ff"
          disabled={!selectedNodeId}
          onClick={() => doAction('SET_SIGNAL', { nodeId: selectedNodeId, signal: signalVal / 100 })}
          small
        />
      </Section>

      {/* Battery Adjust */}
      <Section label="BATTERY LEVEL">
        <SliderControl
          value={batteryVal}
          min={0} max={100}
          color={batteryVal > 50 ? '#00ff88' : batteryVal > 20 ? '#ff6b00' : '#ff0040'}
          label={`${batteryVal}%`}
          onChange={setBatteryVal}
        />
        <ActionButton
          label="Apply Battery"
          color="#00ff88"
          disabled={!selectedNodeId}
          onClick={() => doAction('SET_BATTERY', { nodeId: selectedNodeId, battery: batteryVal })}
          small
        />
      </Section>

      <div style={{ height: 1, background: 'rgba(0,245,255,0.08)' }} />

      {/* Network Actions */}
      <Section label="NETWORK">
        <ActionButton
          label={internetEnabled ? '🔴 Disable Internet' : '🟢 Enable Internet'}
          color={internetEnabled ? '#ff6b00' : '#00ff88'}
          onClick={() => doAction('TOGGLE_INTERNET')}
        />
        <ActionButton
          label="🌩️ Trigger Storm"
          color="#bf00ff"
          onClick={() => doAction('TRIGGER_STORM')}
        />
        <ActionButton
          label="↺ Reset Network"
          color="#7fa8c9"
          onClick={() => doAction('RESET_NETWORK')}
        />
      </Section>

      {/* Add New Node */}
      <Section label="ADD NODE">
        <input
          type="text"
          placeholder="Node name..."
          value={newNodeName}
          onChange={e => setNewNodeName(e.target.value)}
          style={{
            width: '100%', padding: '7px 10px',
            background: 'rgba(0,245,255,0.04)',
            border: '1px solid rgba(0,245,255,0.15)', borderRadius: 6,
            color: '#e2f5ff', fontFamily: 'JetBrains Mono', fontSize: 11, outline: 'none',
          }}
        />
        <ActionButton
          label="➕ Add to Network"
          color="#00f5ff"
          disabled={!newNodeName.trim()}
          onClick={() => {
            doAction('ADD_NODE', { name: newNodeName.trim() });
            setNewNodeName('');
          }}
        />
      </Section>

      {/* Last action feedback */}
      <AnimatePresence>
        {lastAction && (
          <motion.div
            key={lastAction.ts}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              padding: '6px 10px',
              background: 'rgba(0,255,136,0.06)',
              border: '1px solid rgba(0,255,136,0.15)',
              borderRadius: 6, fontFamily: 'JetBrains Mono', fontSize: 10,
              color: '#00ff88',
            }}
          >
            ✓ {lastAction.type.replace(/_/g, ' ')}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Section({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{
        fontFamily: 'JetBrains Mono', fontSize: 9, color: 'rgba(0,245,255,0.4)',
        letterSpacing: '0.15em', textTransform: 'uppercase',
        borderBottom: '1px solid rgba(0,245,255,0.06)', paddingBottom: 4,
      }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function ActionButton({ label, color, onClick, disabled, small }) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={!disabled ? { scale: 1.01 } : undefined}
      whileTap={!disabled ? { scale: 0.98 } : undefined}
      style={{
        width: '100%',
        padding: small ? '6px 10px' : '8px 10px',
        background: disabled ? 'rgba(255,255,255,0.02)' : `${color}10`,
        border: `1px solid ${disabled ? 'rgba(255,255,255,0.06)' : `${color}35`}`,
        borderRadius: 6,
        color: disabled ? 'rgba(255,255,255,0.2)' : color,
        fontFamily: 'JetBrains Mono',
        fontSize: 11,
        cursor: disabled ? 'not-allowed' : 'pointer',
        textAlign: 'left',
        transition: 'all 0.15s',
      }}
    >
      {label}
    </motion.button>
  );
}

function SliderControl({ value, min, max, color, label, onChange }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: 'rgba(127,168,201,0.5)' }}>{min}%</span>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color, fontWeight: 700 }}>{label}</span>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: 'rgba(127,168,201,0.5)' }}>{max}%</span>
      </div>
      <div style={{ position: 'relative' }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, height: 4,
          width: `${((value - min) / (max - min)) * 100}%`,
          background: color, borderRadius: 2, pointerEvents: 'none',
          boxShadow: `0 0 6px ${color}80`,
          transition: 'all 0.1s',
        }} />
        <input
          type="range" min={min} max={max} value={value}
          onChange={e => onChange(parseInt(e.target.value))}
          style={{ width: '100%', position: 'relative', zIndex: 1 }}
        />
      </div>
    </div>
  );
}
