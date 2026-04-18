/**
 * NeuroGrid AI — Routing Engine
 * Implements Dijkstra's shortest path with composite edge weights.
 *
 * Weight formula per edge:
 *   w = latency×0.30 + (1−signal)×0.30 + (1−reliability)×0.20 + (1−battery)×0.20
 *
 * Lower weight = better path.
 */

const { NodeStatus } = require('../../../shared/nodeTypes');
const { ROUTING_WEIGHTS } = require('../../../shared/config');

class RoutingEngine {
  /**
   * Compute edge weight from both endpoint nodes and edge properties.
   * @param {Object} edge - Edge object with latency, signalStrength
   * @param {Object} srcNode - Source node
   * @param {Object} tgtNode - Target node
   * @returns {number} Composite weight (lower = better)
   */
  computeEdgeWeight(edge, srcNode, tgtNode) {
    // Normalize latency: 0ms → 0.0, 200ms+ → 1.0
    const latencyNorm = Math.min(1, (edge.latency || 50) / 200);

    // Signal: 1.0 = excellent. Invert for cost.
    const signalCost = 1 - Math.max(0, Math.min(1, edge.signalStrength || 0.5));

    // Reliability: average of src and tgt node reliabilities
    const avgReliability = ((srcNode.reliability || 0.8) + (tgtNode.reliability || 0.8)) / 2;
    const reliabilityCost = 1 - avgReliability;

    // Battery: average of src and tgt battery (0–100 → 0–1). Invert for cost.
    const avgBattery = (((srcNode.battery || 50) + (tgtNode.battery || 50)) / 2) / 100;
    const batteryCost = 1 - avgBattery;

    const w = ROUTING_WEIGHTS;
    return (
      latencyNorm * w.latency +
      signalCost * w.signal +
      reliabilityCost * w.reliability +
      batteryCost * w.battery
    );
  }

  /**
   * Build an adjacency list from nodes and edges.
   * Only includes active/degraded nodes and edges between them.
   * @param {Array} nodes
   * @param {Array} edges
   * @returns {Object} graph[nodeId] = [{ to, weight, edge }]
   */
  buildGraph(nodes, edges) {
    const graph = {};
    const nodeMap = {};

    nodes.forEach(node => {
      nodeMap[node.id] = node;
      if (node.status !== NodeStatus.OFFLINE) {
        graph[node.id] = [];
      }
    });

    edges.forEach(edge => {
      const src = nodeMap[edge.source];
      const tgt = nodeMap[edge.target];

      // Skip if either endpoint is offline or missing
      if (!src || !tgt) return;
      if (src.status === NodeStatus.OFFLINE || tgt.status === NodeStatus.OFFLINE) return;

      const weight = this.computeEdgeWeight(edge, src, tgt);

      if (graph[edge.source]) {
        graph[edge.source].push({ to: edge.target, weight, edge });
      }
      if (graph[edge.target]) {
        // Bidirectional — same weight
        graph[edge.target].push({ to: edge.source, weight, edge });
      }
    });

    return { graph, nodeMap };
  }

  /**
   * Dijkstra's shortest path algorithm.
   * Uses a simple sorted array as priority queue (suitable for N ≤ 50 mesh nodes).
   * @param {Object} graph - Adjacency list
   * @param {string} source - Source node ID
   * @param {string} target - Target node ID
   * @returns {{ path: string[], score: number, edgesUsed: Object[] } | null}
   */
  dijkstra(graph, source, target, nodeMap) {
    if (!graph[source] || !graph[target]) return null;
    if (source === target) return { path: [source], score: 0, edgesUsed: [] };

    const dist = {};
    const prev = {};
    const prevEdge = {};
    const visited = new Set();
    const queue = []; // [{ nodeId, dist }]

    // Initialize all distances to infinity
    Object.keys(graph).forEach(id => {
      dist[id] = Infinity;
      prev[id] = null;
    });
    dist[source] = 0;
    queue.push({ id: source, dist: 0 });

    while (queue.length > 0) {
      // Extract node with minimum distance (O(n log n) with sort — fine for mesh scale)
      queue.sort((a, b) => a.dist - b.dist);
      const { id: current } = queue.shift();

      if (visited.has(current)) continue;
      visited.add(current);

      if (current === target) break;

      for (const { to, weight, edge } of (graph[current] || [])) {
        if (visited.has(to)) continue;

        const newDist = dist[current] + weight;
        if (newDist < dist[to]) {
          dist[to] = newDist;
          prev[to] = current;
          prevEdge[to] = edge;
          queue.push({ id: to, dist: newDist });
        }
      }
    }

    if (dist[target] === Infinity) return null; // No path found

    // Reconstruct path
    const path = [];
    const edgesUsed = [];
    let cur = target;
    while (cur) {
      path.unshift(cur);
      if (prevEdge[cur]) edgesUsed.unshift(prevEdge[cur]);
      cur = prev[cur];
    }

    return { path, score: dist[target], edgesUsed };
  }

  /**
   * Main public method — find optimal route between two nodes.
   * @param {Array} nodes - All network nodes
   * @param {Array} edges - All network edges
   * @param {string} sourceId
   * @param {string} targetId
   * @returns {{ path, explanation, score, hops, edgesUsed } | null}
   */
  findOptimalRoute(nodes, edges, sourceId, targetId) {
    const { graph, nodeMap } = this.buildGraph(nodes, edges);
    const result = this.dijkstra(graph, sourceId, targetId, nodeMap);

    if (!result) {
      return {
        path: [],
        explanation: `⚠️ Network partitioned — no route from ${nodeMap[sourceId]?.name || sourceId} to ${nodeMap[targetId]?.name || targetId}. All paths blocked by offline nodes.`,
        score: Infinity,
        hops: 0,
        edgesUsed: [],
        feasible: false,
      };
    }

    const explanation = this.generateExplanation(result, nodeMap);

    return {
      path: result.path,
      explanation,
      score: parseFloat(result.score.toFixed(4)),
      hops: result.path.length - 1,
      edgesUsed: result.edgesUsed,
      feasible: true,
      sourceName: nodeMap[sourceId]?.name,
      targetName: nodeMap[targetId]?.name,
    };
  }

  /**
   * Find all shortest paths (for SOS broadcast — fan-out to all nodes).
   * Returns routes from source to all reachable nodes.
   */
  findAllRoutes(nodes, edges, sourceId) {
    const { graph, nodeMap } = this.buildGraph(nodes, edges);
    const routes = [];

    for (const targetId of Object.keys(graph)) {
      if (targetId === sourceId) continue;
      const result = this.dijkstra(graph, sourceId, targetId, nodeMap);
      if (result) {
        routes.push({
          targetId,
          targetName: nodeMap[targetId]?.name,
          path: result.path,
          score: result.score,
          hops: result.path.length - 1,
        });
      }
    }

    // Sort by score ascending (best routes first)
    return routes.sort((a, b) => a.score - b.score);
  }

  /**
   * Generate a human-readable AI explanation for the chosen path.
   */
  generateExplanation(result, nodeMap) {
    const { path, score, edgesUsed } = result;
    if (path.length < 2) return 'Direct local connection — no routing required.';

    const nodeNames = path.map(id => nodeMap[id]?.name || id);
    const hops = path.length - 1;

    // Analyze path quality
    let totalLatency = 0;
    let minSignal = 1;
    let minBattery = 100;
    let minReliability = 1;

    edgesUsed.forEach(edge => {
      totalLatency += edge.latency || 0;
      minSignal = Math.min(minSignal, edge.signalStrength || 1);
    });

    path.forEach(id => {
      const node = nodeMap[id];
      if (node) {
        minBattery = Math.min(minBattery, node.battery || 100);
        minReliability = Math.min(minReliability, node.reliability || 1);
      }
    });

    const avgLatencyPerHop = hops > 0 ? Math.round(totalLatency / hops) : 0;

    // Build factor descriptions
    const factors = [];
    if (avgLatencyPerHop < 25) factors.push('ultra-low latency corridor');
    else if (avgLatencyPerHop < 50) factors.push('low-latency path');
    if (minSignal > 0.80) factors.push('strong signal chain');
    if (minReliability > 0.85) factors.push('high reliability nodes');
    if (minBattery > 60) factors.push('sufficient battery reserves');
    if (hops === 1) factors.push('direct single-hop link');
    if (factors.length === 0) factors.push('optimal composite score');

    // Intermediate nodes (exclude source & target)
    const via = nodeNames.slice(1, -1);
    const viaStr = via.length > 0 ? ` via ${via.join(' → ')}` : ' (direct link)';

    return (
      `AI Router: ${nodeNames[0]} → ${nodeNames[nodeNames.length - 1]}${viaStr}. ` +
      `Selected for ${factors.join(' and ')}. ` +
      `Path score: ${score.toFixed(3)} | Hops: ${hops} | Est. latency: ${totalLatency}ms | ` +
      `Min signal: ${(minSignal * 100).toFixed(0)}% | Min battery: ${minBattery.toFixed(0)}%`
    );
  }

  /**
   * Compute network-wide connectivity health score (0–100).
   */
  computeNetworkHealth(nodes, edges) {
    const activeNodes = nodes.filter(n => n.status !== NodeStatus.OFFLINE);
    if (activeNodes.length < 2) return 0;

    let reachablePairs = 0;
    let totalPairs = 0;
    const { graph } = this.buildGraph(nodes, edges);

    for (let i = 0; i < activeNodes.length; i++) {
      for (let j = i + 1; j < activeNodes.length; j++) {
        totalPairs++;
        const result = this.dijkstra(graph, activeNodes[i].id, activeNodes[j].id);
        if (result) reachablePairs++;
      }
    }

    return totalPairs > 0 ? Math.round((reachablePairs / totalPairs) * 100) : 0;
  }
}

// Singleton
const routingEngine = new RoutingEngine();
module.exports = routingEngine;
