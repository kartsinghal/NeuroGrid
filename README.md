# 🧠 NeuroGrid AI

> **Decentralized AI-powered mesh communication system for disaster scenarios**
> Real-time D3.js visualization • Dijkstra AI routing • Self-healing network • WebSocket-driven

---

## 🚀 Quick Start (2 minutes)

### Prerequisites
- Node.js 18+
- npm 9+

### Setup

```bash
# 1. Clone / open the project
cd neuro

# 2. Install backend dependencies
cd backend && npm install

# 3. Install frontend dependencies  
cd ../frontend && npm install
```

### Run (Two Terminals)

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
```
Output: `🧠 NeuroGrid AI Backend running at http://localhost:5000`

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```
Output: `VITE ready → http://localhost:5173`

**Open** `http://localhost:5173` — you should see the landing page immediately.

---

## 🌐 Database Setup (Optional)

The app runs **without any database** using in-memory mode.

| Mode | Config | Notes |
|---|---|---|
| In-Memory | Default | Fastest. Data resets on restart. |
| Local MongoDB | `MONGODB_LOCAL_URI=mongodb://127.0.0.1:27017/neurogrid` | Install MongoDB locally |
| Atlas (Production) | Add `MONGODB_ATLAS_URI` to `backend/.env` | Full persistence |

Edit `backend/.env` to configure.

---

## 🎮 Demo Flow (Hackathon)

1. **Landing Page** → Premium animated mesh hero with feature cards
2. **Dashboard** → Watch 10 nodes with live battery/signal updates
3. **Send a Message** → Select FROM/TO nodes → Click "Route Message"
   - Watch the neon path highlight in the graph
   - AI explanation appears in the left panel
4. **Kill a Node** → Sim Controls → Select node → "Kill Node"
   - Network recalculates routes automatically
5. **SOS Button** → Hold the SOS button
   - Concentric rings pulse
   - Propagation animation across all nodes
6. **Toggle Internet** → "Disable Internet" button
   - System switches to mesh-only mode
7. **Trigger Storm** → Multiple nodes fail simultaneously
   - Watch self-healing kick in after a few seconds
8. **Architecture page** → Explain the AI routing formula

---

## 📁 Project Structure

```
neuro/
├── frontend/           React + Vite + D3.js + Tailwind v4
│   └── src/
│       ├── components/
│       │   ├── NetworkGraph/   D3 force-directed graph with particles
│       │   ├── SOSButton/      Animated SOS with ping rings
│       │   ├── StatusBar/      Live HUD with animated counters
│       │   ├── SimControls/    Simulation control panel
│       │   └── MessageLog/     Real-time event log
│       ├── pages/
│       │   ├── Landing.jsx     Canvas mesh hero, feature cards
│       │   ├── Dashboard.jsx   Main command center
│       │   ├── Simulation.jsx  Node grid + controls
│       │   └── Architecture.jsx System diagram + AI algorithm
│       ├── store/networkStore.js  Zustand state
│       └── hooks/useSocket.js     Socket.IO client
│
├── backend/            Node.js + Express + Socket.IO
│   └── src/
│       ├── engine/
│       │   ├── NodeManager.js      Network topology CRUD
│       │   ├── RoutingEngine.js    Dijkstra's algorithm
│       │   ├── SimulationEngine.js Battery/failure simulation
│       │   └── EventSystem.js      WebSocket event hub
│       ├── routes/     REST API endpoints
│       └── models/     Mongoose schemas
│
└── shared/             Constants shared across layers
    ├── config.js       Routing weights, simulation params
    └── nodeTypes.js    Status/role/event enums
```

---

## 🧠 AI Routing Engine

Located in `backend/src/engine/RoutingEngine.js`

**Formula (per edge):**
```
weight = latency_norm × 0.30
       + (1 − signal)  × 0.30
       + (1 − reliability) × 0.20
       + (1 − battery/100) × 0.20
```

**Algorithm:** Dijkstra's shortest path with priority queue

**Output:** `{ path, explanation, score, hops, feasible }`

**Example explanation:**
> "AI Router: Alpha Base → Eta Sector → Delta Field via Eta Sector. Selected for low-latency corridor and strong signal chain. Path score: 0.284 | Hops: 2 | Est. latency: 58ms | Min signal: 80%"

---

## ⚡ Real-Time Events (Socket.IO)

| Event | Direction | Description |
|---|---|---|
| `network:state` | S→C | Full snapshot every 15 seconds |
| `node:update` | S→C | Live battery/signal changes |
| `node:failed` | S→C | Node went offline |
| `node:recovered` | S→C | Self-healing success |
| `route:selected` | S→C | Optimal route computed |
| `message:sent` | S→C | Message dispatched with hop animation |
| `sos:triggered` | C→S | Trigger SOS broadcast |
| `sos:propagating` | S→C | SOS hop-by-hop animation |
| `simulate:action` | C→S | User simulation command |

---

## 🔌 REST API

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/nodes` | All nodes |
| POST | `/api/nodes` | Add node |
| GET | `/api/network/state` | Full network snapshot |
| GET | `/api/network/health` | Health score |
| GET | `/api/network/route?from=&to=` | Compute route |
| POST | `/api/messages/send` | Send message with AI routing |
| POST | `/api/simulate` | Execute simulation action |
| GET | `/health` | Server health |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 5, Tailwind CSS v4 |
| Visualization | D3.js v7 (force-directed graph) |
| Animations | Framer Motion 11 |
| State | Zustand |
| Real-time | Socket.IO |
| Backend | Node.js, Express 4 |
| Routing AI | Dijkstra's algorithm (custom implementation) |
| Database | MongoDB Atlas / Local / In-Memory |
| Icons | Lucide React |

---

Built for the **Hackathon** — production architecture, not a student project.
