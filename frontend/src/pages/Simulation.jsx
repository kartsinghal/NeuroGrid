import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import StatusBar from '../components/StatusBar';
import SimControls from '../components/SimControls';
import MessageLog from '../components/MessageLog';
import useNetworkStore from '../store/networkStore';

function NodeGrid() {
  const nodes = useNetworkStore(s => s.nodes);
  const setSelectedNode = useNetworkStore(s => s.setSelectedNode);

  const statusColor = { active: '#00ff88', degraded: '#ff6b00', offline: '#ff0040', recovering: '#bf00ff' };
  const roleIcon = { gateway: '⊕', relay: '◈', endpoint: '◉', satellite: '⊛' };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
      gap: 12, padding: 16,
    }}>
      {nodes.map((node, i) => (
        <motion.div
          key={node.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          onClick={() => setSelectedNode(node)}
          style={{
            background: 'rgba(4,20,45,0.8)',
            border: `1px solid ${statusColor[node.status] || '#00f5ff'}20`,
            borderRadius: 12, padding: '14px 16px', cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          whileHover={{ borderColor: `${statusColor[node.status] || '#00f5ff'}50`, y: -2 }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 18 }}>{roleIcon[node.role] || '◉'}</span>
            <span style={{
              padding: '2px 8px', borderRadius: 4,
              background: `${statusColor[node.status]}15`,
              border: `1px solid ${statusColor[node.status]}30`,
              fontFamily: 'JetBrains Mono', fontSize: 9,
              color: statusColor[node.status], textTransform: 'uppercase',
            }}>
              {node.status}
            </span>
          </div>
          <div style={{ fontFamily: 'Orbitron', fontSize: 12, color: '#e2f5ff', marginBottom: 8 }}>{node.name}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <MiniBar label="BAT" value={node.battery} max={100} color={node.battery > 50 ? '#00ff88' : node.battery > 20 ? '#ff6b00' : '#ff0040'} />
            <MiniBar label="SIG" value={node.signalStrength * 100} max={100} color="#00f5ff" />
            <MiniBar label="REL" value={node.reliability * 100} max={100} color="#bf00ff" />
          </div>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: 'rgba(127,168,201,0.5)', marginTop: 8 }}>
            {node.latency}ms • {node.role.toUpperCase()}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function MiniBar({ label, value, max, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontFamily: 'JetBrains Mono', fontSize: 8, color: 'rgba(127,168,201,0.4)', width: 22 }}>{label}</span>
      <div style={{ flex: 1, height: 2, background: 'rgba(255,255,255,0.05)', borderRadius: 1 }}>
        <div style={{ width: `${(value / max) * 100}%`, height: '100%', background: color, borderRadius: 1, transition: 'width 0.5s' }} />
      </div>
      <span style={{ fontFamily: 'JetBrains Mono', fontSize: 8, color, width: 28, textAlign: 'right' }}>
        {value?.toFixed(0)}%
      </span>
    </div>
  );
}

export default function Simulation() {
  const navigate = useNavigate();
  const nodes = useNetworkStore(s => s.nodes);
  const networkStatus = useNetworkStore(s => s.networkStatus);
  const [activeTab, setActiveTab] = useState('nodes'); // nodes | controls | log

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
            ⚙ SIMULATION
          </div>
          {[{ label: '🏠 Home', path: '/' }, { label: '📡 Dashboard', path: '/dashboard' }, { label: '⚙ Simulation', path: '/simulation', active: true }, { label: '🗺 Architecture', path: '/architecture' }].map(item => (
            <button key={item.path} onClick={() => navigate(item.path)} style={{
              width: '100%', padding: '8px 12px', textAlign: 'left',
              background: item.active ? 'rgba(0,245,255,0.08)' : 'transparent',
              border: `1px solid ${item.active ? 'rgba(0,245,255,0.2)' : 'transparent'}`,
              borderRadius: 6, color: item.active ? '#00f5ff' : 'rgba(226,245,255,0.5)',
              fontFamily: 'Inter', fontSize: 12, cursor: 'pointer',
            }}>{item.label}</button>
          ))}

          <div style={{ height: 1, background: 'rgba(0,245,255,0.08)', marginTop: 8 }} />

          {/* Network stats */}
          <div style={{ fontFamily: 'Orbitron', fontSize: 9, color: 'rgba(0,245,255,0.4)', letterSpacing: '0.12em', marginTop: 4 }}>
            NETWORK STATS
          </div>
          {[
            { label: 'TOTAL', value: networkStatus.total, color: '#e2f5ff' },
            { label: 'ACTIVE', value: networkStatus.active, color: '#00ff88' },
            { label: 'DEGRADED', value: networkStatus.degraded, color: '#ff6b00' },
            { label: 'OFFLINE', value: networkStatus.offline, color: '#ff0040' },
            { label: 'AVG LAT', value: `${networkStatus.avgLatency}ms`, color: '#00f5ff' },
            { label: 'AVG BAT', value: `${networkStatus.avgBattery?.toFixed(0)}%`, color: '#00ff88' },
          ].map(stat => (
            <div key={stat.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 4px' }}>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'rgba(127,168,201,0.4)' }}>{stat.label}</span>
              <span style={{ fontFamily: 'Orbitron', fontSize: 12, color: stat.color, fontWeight: 700 }}>{stat.value}</span>
            </div>
          ))}
        </div>

        {/* Main content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Tab bar */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(0,245,255,0.08)', background: 'rgba(2,11,24,0.8)' }}>
            {[
              { key: 'nodes', label: `⬡ NODE GRID (${nodes.length})` },
              { key: 'controls', label: '⚙ CONTROLS' },
              { key: 'log', label: '📋 EVENT LOG' },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                padding: '12px 24px',
                background: activeTab === tab.key ? 'rgba(0,245,255,0.06)' : 'transparent',
                border: 'none',
                borderBottom: `2px solid ${activeTab === tab.key ? '#00f5ff' : 'transparent'}`,
                color: activeTab === tab.key ? '#00f5ff' : 'rgba(226,245,255,0.4)',
                fontFamily: 'JetBrains Mono', fontSize: 10, cursor: 'pointer',
                letterSpacing: '0.1em', transition: 'all 0.15s',
              }}>
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflow: 'auto' }}>
            {activeTab === 'nodes' && <NodeGrid />}
            {activeTab === 'controls' && (
              <div style={{ maxWidth: 400, padding: 16 }}>
                <SimControls />
              </div>
            )}
            {activeTab === 'log' && (
              <div style={{ height: '100%' }}>
                <MessageLog />
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
