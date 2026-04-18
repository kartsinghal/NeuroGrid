import React, { useEffect, useRef, useCallback, useState } from 'react';
import * as d3 from 'd3';
import useNetworkStore from '../../store/networkStore';

const NODE_RADIUS = 22;

const ROLE_COLOR = {
  gateway: '#00f5ff',
  relay: '#00ff88',
  endpoint: '#7fb3d3',
  satellite: '#bf00ff',
};

function getNodeColor(node) {
  if (node.status === 'offline')    return '#ff0040';
  if (node.status === 'degraded')   return '#ff6b00';
  if (node.status === 'recovering') return '#bf00ff';
  return ROLE_COLOR[node.role] || '#00f5ff';
}

function isEdgeOnRoute(d, path) {
  if (!path || path.length < 2) return false;
  const s = typeof d.source === 'object' ? d.source.id : d.source;
  const t = typeof d.target === 'object' ? d.target.id : d.target;
  for (let i = 0; i < path.length - 1; i++) {
    if ((path[i] === s && path[i + 1] === t) || (path[i] === t && path[i + 1] === s)) return true;
  }
  return false;
}

export default function NetworkGraph({ onNodeClick }) {
  const svgRef         = useRef(null);
  const containerRef   = useRef(null);
  const simulationRef  = useRef(null);
  const nodeDataRef    = useRef([]);
  const edgeDataRef    = useRef([]);
  const gRef           = useRef(null);
  const linkSelRef     = useRef(null);
  const nodeSelRef     = useRef(null);
  const particleLayerRef = useRef(null);
  const animFrameRef   = useRef(null);
  const sosOverlayRectRef = useRef(null); // Lightweight D3 SVG red overlay (replaces CSS filter)

  const nodes          = useNetworkStore(s => s.nodes);
  const edges          = useNetworkStore(s => s.edges);
  const activeRoute    = useNetworkStore(s => s.activeRoute);
  const particles      = useNetworkStore(s => s.particles);
  const sosActive      = useNetworkStore(s => s.sosActive);
  const sosOverlayActive = useNetworkStore(s => s.sosOverlayActive);
  const nodeFlashes    = useNetworkStore(s => s.nodeFlashes);
  const routeTooltipData = useNetworkStore(s => s.routeTooltipData);
  const showRouteTooltip = useNetworkStore(s => s.showRouteTooltip);
  const setSelectedNode = useNetworkStore(s => s.setSelectedNode);

  const [tooltip, setTooltip] = useState(null);
  const [dims, setDims]       = useState({ w: 800, h: 600 });
  const [routeTooltipPos, setRouteTooltipPos] = useState(null);

  // ── Resize Observer ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setDims({ w: width, h: height });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // ── D3 Core Setup (runs once per dimension change) ────────────────────────
  useEffect(() => {
    if (!svgRef.current) return;
    const { w, h } = dims;

    const svg = d3.select(svgRef.current).attr('width', w).attr('height', h);
    svg.selectAll('*').remove();

    // ── Defs ──────────────────────────────────────────────────────────────
    const defs = svg.append('defs');

    const makeGlow = (id, dev) => {
      const f = defs.append('filter').attr('id', id)
        .attr('x', '-120%').attr('y', '-120%').attr('width', '340%').attr('height', '340%');
      f.append('feGaussianBlur').attr('in', 'SourceGraphic').attr('stdDeviation', dev).attr('result', 'blur');
      const m = f.append('feMerge');
      m.append('feMergeNode').attr('in', 'blur');
      m.append('feMergeNode').attr('in', 'SourceGraphic');
    };

    makeGlow('node-glow', 4);
    makeGlow('sos-glow', 14);
    makeGlow('route-glow', 8);
    makeGlow('burst-glow', 10);
    makeGlow('rejected-glow', 2);

    // Animated gradient for route edges
    const routeGrad = defs.append('linearGradient')
      .attr('id', 'route-grad').attr('gradientUnits', 'userSpaceOnUse');
    routeGrad.append('stop').attr('offset', '0%').attr('stop-color', '#00f5ff');
    routeGrad.append('stop').attr('offset', '50%').attr('stop-color', '#00ff88');
    routeGrad.append('stop').attr('offset', '100%').attr('stop-color', '#bf00ff');

    // Background
    const bgGrad = defs.append('radialGradient').attr('id', 'bg-grad').attr('cx', '50%').attr('cy', '50%').attr('r', '65%');
    bgGrad.append('stop').attr('offset', '0%').attr('stop-color', '#030f1f');
    bgGrad.append('stop').attr('offset', '100%').attr('stop-color', '#020b18');

    svg.append('rect').attr('width', w).attr('height', h).attr('fill', 'url(#bg-grad)');

    // Grid — animated during SOS
    const gridG = svg.append('g').attr('class', 'grid');
    const gs = 40;
    for (let x = 0; x <= w; x += gs) {
      gridG.append('line').attr('x1', x).attr('y1', 0).attr('x2', x).attr('y2', h)
        .attr('stroke', 'rgba(0,245,255,0.03)').attr('stroke-width', 1);
    }
    for (let y = 0; y <= h; y += gs) {
      gridG.append('line').attr('x1', 0).attr('y1', y).attr('x2', w).attr('y2', y)
        .attr('stroke', 'rgba(0,245,255,0.03)').attr('stroke-width', 1);
    }

    // Zoom
    const g = svg.append('g').attr('class', 'main-group');
    gRef.current = g;

    const zoom = d3.zoom().scaleExtent([0.2, 5])
      .on('zoom', e => g.attr('transform', e.transform));
    svg.call(zoom);
    svg.call(zoom.transform, d3.zoomIdentity.translate(w * 0.05, h * 0.05).scale(0.9));

    // Layer order matters for Z-depth
    g.append('g').attr('class', 'edge-layer');
    g.append('g').attr('class', 'route-layer');
    g.append('g').attr('class', 'node-layer');
    g.append('g').attr('class', 'particle-layer');
    particleLayerRef.current = g.select('.particle-layer');

    // ── SOS overlay rect — GPU-composited opacity only (no filter on SVG elements) ─
    // Sits above main-group, tints the whole graph red with zero rasterization cost
    const sosRect = svg.append('rect')
      .attr('class', 'svg-sos-overlay-rect')
      .attr('width', w).attr('height', h)
      .attr('fill', '#ff0040')
      .style('opacity', 0)
      .attr('pointer-events', 'none');
    sosOverlayRectRef.current = sosRect;

    // Force simulation
    const simulation = d3.forceSimulation([])
      .force('link', d3.forceLink([]).id(d => d.id).distance(155).strength(0.38))
      .force('charge', d3.forceManyBody().strength(-430))
      .force('center', d3.forceCenter(w / 2, h / 2))
      .force('collision', d3.forceCollide(NODE_RADIUS + 16))
      .alphaDecay(0.014);

    simulationRef.current = simulation;

    simulation.on('tick', () => {
      linkSelRef.current?.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
                          .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
      nodeSelRef.current?.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    return () => { simulation.stop(); };
  }, [dims]);

  // ── Update Nodes & Edges ─────────────────────────────────────────────────
  useEffect(() => {
    if (!gRef.current || !simulationRef.current || nodes.length === 0) return;

    const sim = simulationRef.current;

    // Preserve positions
    const existingPos = {};
    nodeDataRef.current.forEach(n => { existingPos[n.id] = { x: n.x, y: n.y }; });
    nodeDataRef.current = nodes.map(n => {
      const pos = existingPos[n.id];
      return { ...n, x: pos?.x ?? (n.x ?? 400), y: pos?.y ?? (n.y ?? 300) };
    });
    edgeDataRef.current = edges.map(e => ({ ...e }));

    // ── Edges ──────────────────────────────────────────────────────────────
    const edgeLayer = gRef.current.select('.edge-layer');
    const link = edgeLayer.selectAll('.edge-line')
      .data(edgeDataRef.current, d => d.id)
      .join(
        enter => enter.append('line').attr('class', 'edge-line').attr('opacity', 0)
          .call(s => s.transition().duration(400).attr('opacity', 1)),
        update => update,
        exit => exit.transition().duration(300).attr('opacity', 0).remove()
      )
      .attr('stroke', 'rgba(0,245,255,0.18)')
      .attr('stroke-width', d => Math.max(1, (d.signalStrength || 0.5) * 3))
      .attr('stroke-dasharray', 'none')
      .classed('route-edge-active', false)
      .classed('sos-edge-pulsing', false);

    linkSelRef.current = link;

    // ── Nodes ──────────────────────────────────────────────────────────────
    const nodeLayer = gRef.current.select('.node-layer');
    const arcGen = d3.arc().innerRadius(NODE_RADIUS + 3).outerRadius(NODE_RADIUS + 7)
      .startAngle(-Math.PI / 2);

    const nodeGroups = nodeLayer.selectAll('.node-group')
      .data(nodeDataRef.current, d => d.id)
      .join(
        enter => {
          const g = enter.append('g').attr('class', 'node-group')
            .attr('data-id', d => d.id)
            .style('cursor', 'pointer')
            .attr('opacity', 0)
            .call(s => s.transition().duration(550).attr('opacity', 1));

          g.append('circle').attr('class', 'ping-ring').attr('r', NODE_RADIUS + 10)
            .attr('fill', 'none').attr('stroke-width', 1.5).attr('pointer-events', 'none');

          // Outer glow halo (separate from ping ring)
          g.append('circle').attr('class', 'halo-ring').attr('r', NODE_RADIUS + 18)
            .attr('fill', 'none').attr('stroke-width', 0.5).attr('pointer-events', 'none').attr('opacity', 0);

          // Secondary ambient glow ring
          g.append('circle').attr('class', 'ambient-glow').attr('r', NODE_RADIUS + 30)
            .attr('fill', 'none').attr('stroke-width', 0.3).attr('pointer-events', 'none').attr('opacity', 0);

          g.append('circle').attr('class', 'main-circle').attr('r', NODE_RADIUS)
            .attr('stroke-width', 2).attr('filter', 'url(#node-glow)');

          g.append('path').attr('class', 'battery-arc');

          g.append('text').attr('class', 'role-icon').attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'central').attr('font-size', '13px').attr('pointer-events', 'none');

          g.append('text').attr('class', 'node-label').attr('text-anchor', 'middle')
            .attr('dy', NODE_RADIUS + 18).attr('font-size', '10px')
            .attr('font-family', '"JetBrains Mono", monospace')
            .attr('fill', 'rgba(226,245,255,0.8)').attr('pointer-events', 'none');

          return g;
        },
        update => update,
        exit => exit.transition().duration(300).attr('opacity', 0).remove()
      );

    // Update each node's visuals
    nodeGroups.each(function(d) {
      const g     = d3.select(this);
      const color  = getNodeColor(d);
      const isOffline   = d.status === 'offline';
      const isDegraded  = d.status === 'degraded';
      const isRecovering = d.status === 'recovering';
      const isWeak       = !isOffline && (d.battery < 30 || isDegraded);

      // Ping ring with smart pulse rate
      const pulseDur = isDegraded ? 750 : isWeak ? 1100 : 1800;
      g.select('.ping-ring')
        .attr('stroke', color).attr('stroke-opacity', isOffline ? 0 : 0.35).attr('r', NODE_RADIUS + 12)
        .call(ring => {
          if (!isOffline) {
            const pulse = () => ring.transition().duration(pulseDur)
              .attr('r', NODE_RADIUS + 22).attr('stroke-opacity', 0.04)
              .transition().duration(pulseDur).attr('r', NODE_RADIUS + 12).attr('stroke-opacity', 0.35)
              .on('end', pulse);
            pulse();
          }
        });

      // Ambient glow for gateway/satellite nodes
      if (d.role === 'gateway' || d.role === 'satellite') {
        g.select('.ambient-glow')
          .attr('stroke', color)
          .attr('opacity', isOffline ? 0 : 0.08)
          .attr('r', NODE_RADIUS + 32);
      }

      g.select('.main-circle')
        .attr('fill', isOffline ? 'rgba(255,0,64,0.06)' : `${color}20`)
        .attr('stroke', color).attr('fill-opacity', 1);

      // Battery arc
      g.select('.battery-arc')
        .attr('d', arcGen({ endAngle: -Math.PI / 2 + (Math.max(0, d.battery) / 100) * Math.PI * 2 }))
        .attr('fill', d.battery > 50 ? '#00ff88' : d.battery > 20 ? '#ff6b00' : '#ff0040')
        .attr('opacity', isOffline ? 0.15 : 0.9);

      const roleIcons = { gateway: '⊕', relay: '◈', endpoint: '◉', satellite: '⊛' };
      g.select('.role-icon').text(roleIcons[d.role] || '◉')
        .attr('fill', color).attr('opacity', isOffline ? 0.25 : 0.9);

      g.select('.node-label').text(d.name);

      // ── CSS-based flicker for weak/degraded nodes ───────────────────────
      g.select('.main-circle').classed('node-flickering', isWeak && !isOffline);
      g.select('.main-circle').classed('node-offline-throb', isOffline);
    });

    // Drag
    nodeGroups.call(
      d3.drag()
        .on('start', (e, d) => { if (!e.active) simulationRef.current.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on('drag',  (e, d) => { d.fx = e.x; d.fy = e.y; })
        .on('end',   (e, d) => { if (!e.active) simulationRef.current.alphaTarget(0); d.fx = null; d.fy = null; })
    );

    // Hover + click
    nodeGroups
      .on('click', (e, d) => { e.stopPropagation(); setSelectedNode(d); if (onNodeClick) onNodeClick(d); })
      .on('mouseenter', (e, d) => {
        const [mx, my] = d3.pointer(e, svgRef.current);
        setTooltip({ node: d, x: mx, y: my });
        d3.select(e.currentTarget).select('.main-circle')
          .transition().duration(120).attr('r', NODE_RADIUS + 5);
      })
      .on('mouseleave', () => {
        setTooltip(null);
        nodeGroups.select('.main-circle').transition().duration(150).attr('r', NODE_RADIUS);
      });

    nodeSelRef.current = nodeGroups;

    sim.nodes(nodeDataRef.current);
    sim.force('link').links(edgeDataRef.current);
    sim.alpha(0.3).restart();

  }, [nodes, edges]);

  // ── Active Route Highlight + Rejected path dimming ─────────────────────
  useEffect(() => {
    if (!linkSelRef.current) return;

    const hasRoute   = !!(activeRoute?.path && activeRoute.path.length >= 2);
    const routePath  = hasRoute ? activeRoute.path : null;

    linkSelRef.current
      .each(function(d) {
        const onRoute = hasRoute && isEdgeOnRoute(d, routePath);
        const line    = d3.select(this);

        line.classed('route-edge-active', onRoute);

        if (onRoute) {
          // Active route: bright, thick, marching dashes with glow
          line
            .transition().duration(250)
            .attr('stroke', '#00ff88')
            .attr('stroke-width', 4.5)
            .attr('stroke-dasharray', '10 5')
            .attr('stroke-opacity', 1)
            .attr('filter', 'url(#route-glow)');
        } else if (hasRoute) {
          // Rejected / non-route: dramatically dimmed + rejected class
          line
            .classed('route-rejected', true)
            .transition().duration(350)
            .attr('stroke', 'rgba(0,245,255,0.08)')
            .attr('stroke-width', 0.8)
            .attr('stroke-dasharray', 'none')
            .attr('stroke-opacity', 0.06)
            .attr('filter', 'none');
        } else {
          // Reset to default
          line
            .classed('route-rejected', false)
            .transition().duration(300)
            .attr('stroke', 'rgba(0,245,255,0.18)')
            .attr('stroke-width', d => Math.max(1, (d.signalStrength || 0.5) * 3))
            .attr('stroke-dasharray', 'none')
            .attr('stroke-opacity', 1)
            .attr('filter', 'none');
        }
      });

    // Highlight nodes on the active route with green halos
    if (nodeSelRef.current && hasRoute) {
      nodeSelRef.current.each(function(d) {
        const onPath = routePath.includes(d.id);
        const isFirst = onPath && d.id === routePath[0];
        const isLast  = onPath && d.id === routePath[routePath.length - 1];
        const haloColor = isFirst ? '#00f5ff' : isLast ? '#bf00ff' : '#00ff88';

        d3.select(this).select('.halo-ring')
          .attr('stroke', onPath ? haloColor : 'none')
          .attr('opacity', onPath ? 0.45 : 0)
          .attr('r', onPath ? NODE_RADIUS + 20 : NODE_RADIUS + 12);
      });

      // Show route tooltip near the middle of the route
      if (routePath.length >= 2) {
        const midNode = nodeDataRef.current.find(n =>
          n.id === routePath[Math.floor(routePath.length / 2)]
        );
        if (midNode) {
          setRouteTooltipPos({ x: midNode.x, y: midNode.y });
        }
      }
    } else if (nodeSelRef.current) {
      nodeSelRef.current.select('.halo-ring').attr('opacity', 0);
      setRouteTooltipPos(null);
    }

  }, [activeRoute]);

  // ── SOS Mode — Lightweight (no per-node filters = no per-element rasterization) ──
  useEffect(() => {
    if (!nodeSelRef.current || !linkSelRef.current) return;
    const grid = d3.select(svgRef.current).select('.grid');

    if (sosActive) {
      // SVG overlay rect: CSS class pulses opacity (single GPU layer)
      sosOverlayRectRef.current?.classed('svg-sos-overlay-rect', true);

      // Nodes: stroke/halo changes ONLY — NO .main-circle filter
      // Applying url(#sos-glow) filter to 10+ nodes = 10+ GPU rasterizations/frame
      nodeSelRef.current.each(function(d) {
        if (d.status !== 'offline') {
          const ng = d3.select(this);
          ng.select('.ping-ring').attr('stroke', '#ff0040').attr('stroke-width', 2.5).attr('r', NODE_RADIUS + 10);
          ng.select('.halo-ring').attr('stroke', '#ff0040').attr('opacity', 0.28).attr('r', NODE_RADIUS + 20);
        }
      });

      // Edges: CSS class = GPU-composited opacity animation
      linkSelRef.current.classed('sos-edge-pulsing', true).attr('stroke-dasharray', 'none').attr('filter', 'none');
      grid.selectAll('line').attr('stroke', 'rgba(255,0,64,0.055)');

    } else {
      sosOverlayRectRef.current?.classed('svg-sos-overlay-rect', false);

      nodeSelRef.current.each(function(d) {
        const color = getNodeColor(d);
        const ng = d3.select(this);
        ng.select('.ping-ring').attr('stroke', color).attr('stroke-width', 1.5);
        ng.select('.main-circle').attr('filter', 'url(#node-glow)');
        ng.select('.halo-ring').attr('opacity', 0);
      });

      linkSelRef.current
        .classed('sos-edge-pulsing', false)
        .attr('stroke', 'rgba(0,245,255,0.18)')
        .attr('stroke-width', d => Math.max(1, (d.signalStrength || 0.5) * 3));

      grid.selectAll('line').attr('stroke', 'rgba(0,245,255,0.03)');
    }
  }, [sosActive]);

  // ── Node Flash (particle arrival burst) ──────────────────────────────────
  useEffect(() => {
    if (!gRef.current || !nodeFlashes || Object.keys(nodeFlashes).length === 0) return;

    Object.keys(nodeFlashes).forEach(nodeId => {
      const nodeGroup = gRef.current.select(`.node-group[data-id="${nodeId}"]`);
      if (nodeGroup.empty()) return;

      const nodeData = nodeDataRef.current.find(n => n.id === nodeId);
      const color    = nodeData ? getNodeColor(nodeData) : '#00f5ff';
      const isRecovery = nodeData?.status === 'active' || nodeData?.status === 'recovering';

      // Flash the main circle
      nodeGroup.select('.main-circle')
        .transition().duration(60)
        .attr('r', NODE_RADIUS + 10).attr('fill-opacity', 0.95)
        .transition().duration(600)
        .attr('r', NODE_RADIUS).attr('fill-opacity', 0.15);

      // Burst expanding rings from the node position
      if (nodeData) {
        const layer = particleLayerRef.current;
        const burstColor = isRecovery ? '#00ff88' : color;
        const ringCount = isRecovery ? 4 : 3;

        Array.from({ length: ringCount }).forEach((_, i) => {
          setTimeout(() => {
            layer.append('circle')
              .attr('cx', nodeData.x).attr('cy', nodeData.y)
              .attr('r', NODE_RADIUS + 2)
              .attr('fill', 'none')
              .attr('stroke', i === 0 ? '#fff' : burstColor)
              .attr('stroke-width', i === 0 ? 2.5 : 1.5)
              .attr('opacity', 0.9)
              .attr('pointer-events', 'none')
              .attr('filter', 'url(#burst-glow)')
              .transition().duration(700)
              .attr('r', NODE_RADIUS + 22 + i * 14)
              .attr('stroke-width', 0)
              .attr('opacity', 0)
              .remove();
          }, i * 100);
        });
      }
    });
  }, [nodeFlashes]);

  // ── Particle Animation (trails + hop-to-hop traversal) ───────────────────
  useEffect(() => {
    if (!particleLayerRef.current) return;

    const layer = particleLayerRef.current;

    // Sync particle visuals to store
    layer.selectAll('.message-particle')
      .data(particles, d => d.id)
      .join(
        enter => enter.append('circle').attr('class', 'message-particle')
          .attr('r', 0)
          .attr('fill', d => d.color || '#00f5ff')
          .attr('filter', d => d.isSOS ? 'url(#sos-glow)' : 'url(#node-glow)')
          .attr('pointer-events', 'none')
          .call(s => s.transition().duration(80).attr('r', d => d.isSOS ? 9 : 6)),
        update => update,
        exit => exit.transition().duration(180).attr('r', 0).remove()
      );

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    const animate = () => {
      layer.selectAll('.message-particle').each(function(d) {
        const src = nodeDataRef.current.find(n => n.id === d.source);
        const tgt = nodeDataRef.current.find(n => n.id === d.target);
        if (!src || !tgt) return;

        const prevProg  = d.progress || 0;
        d.progress = Math.min(1, prevProg + (d.isSOS ? 0.022 : 0.016));

        // Ease-in-out interpolation for organic feel
        const t = d.progress < 0.5
          ? 2 * d.progress * d.progress
          : -1 + (4 - 2 * d.progress) * d.progress;

        const x = src.x + (tgt.x - src.x) * t;
        const y = src.y + (tgt.y - src.y) * t;

        d3.select(this).attr('cx', x).attr('cy', y);

        // ── Trail: ghost particle every ~0.05 progress steps ────────────
        const trailInterval = d.isSOS ? 0.04 : 0.055;
        if (Math.floor(d.progress / trailInterval) > Math.floor(prevProg / trailInterval)) {
          layer.append('circle')
            .attr('cx', x).attr('cy', y)
            .attr('r', d.isSOS ? 5 : 3.5)
            .attr('fill', d.color || '#00f5ff')
            .attr('opacity', d.isSOS ? 0.65 : 0.45)
            .attr('pointer-events', 'none')
            .attr('filter', d.isSOS ? 'url(#burst-glow)' : undefined)
            .transition().duration(d.isSOS ? 500 : 380)
            .attr('r', 0).attr('opacity', 0).remove();

          // Extra glow dot for SOS
          if (d.isSOS) {
            layer.append('circle')
              .attr('cx', x).attr('cy', y)
              .attr('r', 9)
              .attr('fill', 'rgba(255,0,64,0.12)')
              .attr('pointer-events', 'none')
              .transition().duration(300)
              .attr('r', 2).attr('opacity', 0).remove();
          }
        }

        // ── Arrival burst at destination ─────────────────────────────────
        if (d.progress >= 0.93 && !d._arrived) {
          d._arrived = true;
          const burstCount = d.isSOS ? 5 : 3;
          Array.from({ length: burstCount }).forEach((_, i) => {
            setTimeout(() => {
              layer.append('circle')
                .attr('cx', tgt.x).attr('cy', tgt.y)
                .attr('r', NODE_RADIUS + 2)
                .attr('fill', 'none')
                .attr('stroke', i === 0 ? '#fff' : (d.color || '#00f5ff'))
                .attr('stroke-width', d.isSOS ? 3.5 : 2)
                .attr('opacity', 0.9)
                .attr('pointer-events', 'none')
                .attr('filter', d.isSOS ? 'url(#sos-glow)' : 'url(#burst-glow)')
                .transition().duration(750)
                .attr('r', NODE_RADIUS + 20 + i * 12)
                .attr('stroke-width', 0).attr('opacity', 0)
                .remove();
            }, i * 85);
          });
        }
      });

      animFrameRef.current = requestAnimationFrame(animate);
    };

    if (particles.length > 0) animate();

    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [particles]);

  const handleSvgClick = useCallback(() => { setSelectedNode(null); setTooltip(null); }, [setSelectedNode]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <svg ref={svgRef} style={{ width: '100%', height: '100%', display: 'block', willChange: 'transform' }}
        onClick={handleSvgClick} />

      {tooltip && <NodeTooltipOverlay node={tooltip.node} x={tooltip.x} y={tooltip.y} routePath={activeRoute?.path} />}

      {/* ── AI Route Tooltip (shown near route midpoint) ─── */}
      {showRouteTooltip && routeTooltipData && !sosActive && (
        <div className="route-tooltip" style={{
          position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,11,24,0.96)', border: '1px solid rgba(0,255,136,0.4)',
          borderRadius: 12, padding: '8px 16px', pointerEvents: 'none',
          display: 'flex', flexDirection: 'column', gap: 5,
          /* No backdrop-filter — too expensive during active graph animations */
          boxShadow: '0 0 24px rgba(0,255,136,0.2), 0 4px 16px rgba(0,0,0,0.6)',
          maxWidth: 380,
          willChange: 'transform, opacity',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#00ff88', boxShadow: '0 0 8px #00ff88' }} />
            <span style={{ fontFamily: 'Orbitron', fontSize: 9, color: '#00ff88', letterSpacing: '0.15em' }}>
              AI ROUTE SELECTED
            </span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <span style={{ fontFamily: 'Orbitron', fontSize: 10, color: '#00f5ff' }}>
                {routeTooltipData.hops} HOP{routeTooltipData.hops !== 1 ? 'S' : ''}
              </span>
              <span style={{ fontFamily: 'Orbitron', fontSize: 10, color: '#00ff88' }}>
                {routeTooltipData.avgLatency}MS
              </span>
              <span style={{ fontFamily: 'Orbitron', fontSize: 10, color: '#bf00ff' }}>
                {(routeTooltipData.avgReliability * 100).toFixed(0)}% REL
              </span>
            </div>
          </div>
          <div style={{ fontFamily: 'Inter', fontSize: 10, color: 'rgba(226,245,255,0.75)', lineHeight: 1.5 }}>
            {routeTooltipData.explanation}
          </div>
          {routeTooltipData.factors?.length > 0 && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {routeTooltipData.factors.map((f, i) => (
                <span key={i} style={{
                  fontFamily: 'JetBrains Mono', fontSize: 9, color: '#00ff88',
                  background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.2)',
                  padding: '1px 7px', borderRadius: 3,
                }}>
                  ✓ {f}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SOS active badge */}
      {sosActive && (
        <div style={{
          position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(255,0,64,0.18)', border: '2px solid rgba(255,0,64,0.8)',
          borderRadius: 20, padding: '8px 24px', pointerEvents: 'none',
          fontFamily: 'Orbitron', fontSize: 12, color: '#ff0040', letterSpacing: '0.2em',
          boxShadow: '0 0 30px rgba(255,0,64,0.5)',
          animation: 'blink 0.65s ease-in-out infinite',
          willChange: 'opacity',
        }}>
          🚨 SOS BROADCAST ACTIVE
        </div>
      )}

      <div style={{ position: 'absolute', top: 12, left: 12, pointerEvents: 'none' }}>
        <div style={{ fontFamily: 'Orbitron', fontSize: 9, color: 'rgba(0,245,255,0.35)', letterSpacing: '0.15em' }}>
          NEUROGRID // MESH TOPOLOGY
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: 14, left: 14, pointerEvents: 'none' }}>
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'rgba(0,245,255,0.2)', letterSpacing: '0.08em' }}>
          DRAG • ZOOM • CLICK TO INSPECT
        </div>
      </div>
      <div style={{ position: 'absolute', top: 12, right: 12, pointerEvents: 'none', textAlign: 'right' }}>
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: sosActive ? 'rgba(255,0,64,0.5)' : 'rgba(0,245,255,0.28)' }}>
          NODES: {nodes.filter(n => n.status !== 'offline').length}/{nodes.length}
        </div>
      </div>
    </div>
  );
}

// ── Rich Node Tooltip ─────────────────────────────────────────────────────────
function NodeTooltipOverlay({ node, x, y, routePath }) {
  const color     = getNodeColor(node);
  const battColor = node.battery > 50 ? '#00ff88' : node.battery > 20 ? '#ff6b00' : '#ff0040';
  const isOnRoute = routePath?.includes(node.id);
  const isFirst   = isOnRoute && routePath?.[0] === node.id;
  const isLast    = isOnRoute && routePath?.[routePath.length - 1] === node.id;
  const routeRole = isFirst ? 'SOURCE' : isLast ? 'DESTINATION' : isOnRoute ? 'RELAY' : null;

  return (
    <div style={{
      position: 'absolute',
      left: Math.min(x + 14, window.innerWidth - 290),
      top: Math.max(y - 70, 10),
      width: 272,
      background: 'rgba(2,11,24,0.97)',
      border: `1px solid ${isOnRoute ? 'rgba(0,255,136,0.5)' : `${color}40`}`,
      borderRadius: 12, padding: '13px 15px',
      pointerEvents: 'none', zIndex: 1000,
      /* No backdrop-filter — causes compositing during active D3 animations */
      boxShadow: `0 0 20px ${isOnRoute ? 'rgba(0,255,136,0.2)' : `${color}18`}, 0 8px 28px rgba(0,0,0,0.7)`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ width: 9, height: 9, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}` }} />
        <span style={{ fontFamily: 'Orbitron', fontSize: 12, color, fontWeight: 700 }}>{node.name}</span>
        {routeRole && (
          <span style={{
            fontSize: 8, fontFamily: 'JetBrains Mono', color: '#00ff88', marginLeft: 2,
            letterSpacing: '0.1em', background: 'rgba(0,255,136,0.1)', padding: '1px 6px', borderRadius: 3,
          }}>
            {routeRole}
          </span>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 9, fontFamily: 'JetBrains Mono',
          color: node.status === 'active' ? '#00ff88' : node.status === 'degraded' ? '#ff6b00' : '#ff0040',
          textTransform: 'uppercase' }}>
          {node.status}
        </span>
      </div>

      <div style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: '#7fa8c9', lineHeight: 1.9 }}>
        <TRow label="ROLE"        value={node.role?.toUpperCase()} color="#00f5ff" />
        <TRow label="BATTERY"     value={`${node.battery?.toFixed(1)}%`} color={battColor}
              bar={node.battery} barColor={battColor} />
        <TRow label="SIGNAL"      value={`${(node.signalStrength * 100).toFixed(0)}%`} color="#00f5ff"
              bar={node.signalStrength * 100} barColor="#00f5ff" />
        <TRow label="LATENCY"     value={`${node.latency}ms`}
              color={node.latency < 30 ? '#00ff88' : node.latency < 60 ? '#ff6b00' : '#ff0040'} />
        <TRow label="RELIABILITY" value={`${(node.reliability * 100).toFixed(0)}%`} color="#bf00ff"
              bar={node.reliability * 100} barColor="#bf00ff" />
      </div>

      {/* Mini health bar */}
      <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(0,245,255,0.08)' }}>
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: 8, color: 'rgba(127,168,201,0.4)', marginBottom: 4 }}>
          HEALTH INDEX
        </div>
        <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${((node.battery / 100) * 0.4 + node.signalStrength * 0.3 + node.reliability * 0.3) * 100}%`,
            background: `linear-gradient(90deg, ${color}, ${battColor})`,
            borderRadius: 2, transition: 'width 0.5s',
            boxShadow: `0 0 6px ${color}80`,
          }} />
        </div>
      </div>

      {node.status === 'degraded' && (
        <div style={{ marginTop: 8, padding: '4px 8px', background: 'rgba(255,107,0,0.08)',
          border: '1px solid rgba(255,107,0,0.2)', borderRadius: 4,
          fontFamily: 'Inter', fontSize: 9, color: '#ff8c00' }}>
          ⚠ Node showing instability — signal fluctuating
        </div>
      )}

      {node.status === 'offline' && (
        <div style={{ marginTop: 8, padding: '4px 8px', background: 'rgba(255,0,64,0.08)',
          border: '1px solid rgba(255,0,64,0.2)', borderRadius: 4,
          fontFamily: 'Inter', fontSize: 9, color: '#ff4060' }}>
          💀 Node offline — traffic rerouted
        </div>
      )}

      {isOnRoute && (
        <div style={{ marginTop: 8, padding: '4px 8px', background: 'rgba(0,255,136,0.06)',
          border: '1px solid rgba(0,255,136,0.2)', borderRadius: 4,
          fontFamily: 'Inter', fontSize: 9, color: '#00cc6a' }}>
          ◉ Active route node — {routeRole}
        </div>
      )}
    </div>
  );
}

function TRow({ label, value, color, bar, barColor }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 1 }}>
      <span style={{ color: 'rgba(127,168,201,0.55)', width: 82, fontSize: 10 }}>{label}</span>
      <span style={{ color, fontWeight: 600 }}>{value}</span>
      {bar !== undefined && (
        <div style={{ flex: 1, height: 2, background: 'rgba(255,255,255,0.05)', borderRadius: 1, overflow: 'hidden' }}>
          <div style={{ width: `${Math.min(100, bar)}%`, height: '100%', background: barColor, borderRadius: 1 }} />
        </div>
      )}
    </div>
  );
}
