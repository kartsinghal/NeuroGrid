import React from 'react';
import { motion } from 'framer-motion';
import useNetworkStore from '../../store/networkStore';

const LOG_COLORS = {
  info: '#00f5ff',
  success: '#00ff88',
  warning: '#ff6b00',
  error: '#ff0040',
  system: '#bf00ff',
  sos: '#ff0040',
};

const LOG_ICONS = {
  info: '●',
  success: '✓',
  warning: '⚠',
  error: '✗',
  system: '◈',
  sos: '🚨',
};

export default function MessageLog() {
  const logs = useNetworkStore(s => s.logs);
  const messages = useNetworkStore(s => s.messages);
  const setSelectedNode = useNetworkStore(s => s.setSelectedNode);
  const setActiveRoute = useNetworkStore(s => s.setActiveRoute);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px',
        borderBottom: '1px solid rgba(0,245,255,0.08)',
      }}>
        <div style={{ fontFamily: 'Orbitron', fontSize: 10, color: '#00f5ff', letterSpacing: '0.15em' }}>
          SYSTEM LOG
        </div>
        <div style={{
          padding: '2px 8px', borderRadius: 9999,
          background: 'rgba(0,245,255,0.08)',
          fontFamily: 'JetBrains Mono', fontSize: 9, color: '#00f5ff',
        }}>
          {logs.length}
        </div>
      </div>

      {/* Log Entries */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }} className="log-scroll">
        {logs.length === 0 && (
          <div style={{
            textAlign: 'center', padding: 20,
            fontFamily: 'JetBrains Mono', fontSize: 10, color: 'rgba(127,168,201,0.3)',
          }}>
            Awaiting events...
          </div>
        )}
        {logs.map((log, i) => (
          <motion.div
            key={log.id || i}
            initial={i === 0 ? { opacity: 0, x: -10 } : false}
            animate={{ opacity: 1, x: 0 }}
            style={{
              display: 'flex',
              gap: 8,
              padding: '5px 12px',
              borderLeft: `2px solid ${(LOG_COLORS[log.level] || '#00f5ff')}20`,
              marginBottom: 2,
              background: log.level === 'sos' ? 'rgba(255,0,64,0.04)' : 'transparent',
            }}
          >
            <span style={{
              fontSize: 10,
              color: LOG_COLORS[log.level] || '#00f5ff',
              minWidth: 12,
              marginTop: 1,
            }}>
              {LOG_ICONS[log.level] || '●'}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: 'Inter', fontSize: 10,
                color: log.level === 'error' ? '#ff6b6b' : log.level === 'success' ? '#00cc6a' : 'rgba(226,245,255,0.75)',
                wordBreak: 'break-word',
                lineHeight: 1.4,
              }}>
                {log.message}
              </div>
              {log.timestamp && (
                <div style={{
                  fontFamily: 'JetBrains Mono', fontSize: 9,
                  color: 'rgba(127,168,201,0.3)',
                  marginTop: 2,
                }}>
                  {new Date(log.timestamp).toLocaleTimeString()}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Recent Messages */}
      {messages.length > 0 && (
        <>
          <div style={{
            borderTop: '1px solid rgba(0,245,255,0.08)',
            padding: '6px 12px',
            fontFamily: 'Orbitron', fontSize: 9, color: 'rgba(0,245,255,0.4)', letterSpacing: '0.1em',
          }}>
            RECENT MESSAGES
          </div>
          <div style={{ maxHeight: 120, overflowY: 'auto' }} className="log-scroll">
            {messages.slice(0, 5).map((msg, i) => (
              <div
                key={msg.id || i}
                onClick={() => msg.route && setActiveRoute(msg.route)}
                style={{
                  padding: '5px 12px', cursor: 'pointer',
                  borderBottom: '1px solid rgba(0,245,255,0.04)',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,245,255,0.03)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{
                    fontFamily: 'JetBrains Mono', fontSize: 9,
                    color: msg.type === 'sos' ? '#ff0040' : '#00f5ff',
                    textTransform: 'uppercase',
                  }}>
                    {msg.type === 'sos' ? '🚨 SOS' : '▶ MSG'}
                  </span>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'rgba(127,168,201,0.3)' }}>
                    {msg.route?.hops ?? 0} hops
                  </span>
                </div>
                {msg.route?.explanation && (
                  <div style={{
                    fontFamily: 'Inter', fontSize: 9, color: 'rgba(226,245,255,0.4)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    marginTop: 2,
                  }}>
                    {msg.route.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
