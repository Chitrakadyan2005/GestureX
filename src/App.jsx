import { useRef, useState, useCallback, useEffect } from "react";
import Camera from "./components/Camera";
import HandTracking from "./components/HandTracking";
import Capture from "./components/Capture";
import Game from "./components/Game";
import CanvasBoard from "./components/CanvasBoard";
import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

const TABS = ["draw", "game", "capture"];
const TAB_ICONS = { draw: "✏️", game: "⚔️", capture: "📸" };

const SHAPES = [
  { id: "circle", icon: "○" },
  { id: "rect", icon: "□" },
  { id: "triangle", icon: "△" },
  { id: "line", icon: "╱" },
  { id: "star", icon: "★" },
  { id: "arrow", icon: "→" },
];

const DRAW_TOOLS = [
  { id: "draw", icon: "✌", label: "Draw" },
  { id: "strong", icon: "☝", label: "Bold" },
  { id: "erase", icon: "🖐", label: "Erase" },
];

export default function App() {
  const videoRef = useRef(null);
  const captureRef = useRef(null);
  const boardRef = useRef(null);
  const cursorRef = useRef({ x: 0.5, y: 0.5 });
  const modeRef = useRef("idle");
  const toolbarRef = useRef(null);
  const navRef = useRef(null);

  const [cursor, setCursor] = useState({ x: 0.5, y: 0.5 });
  const [activeTab, setActiveTab] = useState("draw");
  const [drawMode, setDrawMode] = useState("idle");
  const [isHandVisible, setIsHandVisible] = useState(false);
  const [shapeMenuOpen, setShapeMenuOpen] = useState(false);
  const [gestureLabel, setGestureLabel] = useState("");
  const [hoveredTool, setHoveredTool] = useState(null);
  const [hoveredTab, setHoveredTab] = useState(null);
  const [sharedHL, setSharedHL] = useState(null);

  // Shared HandLandmarker for Capture tab gesture detection
  useEffect(() => {
    async function init() {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm",
      );
      const hl = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numHands: 1,
      });
      setSharedHL(hl);
    }
    init();
  }, []);

  const setMode = (m) => {
    setDrawMode(m);
    modeRef.current = m;
  };
  const HIT_TOLERANCE = 15;

  const getHoveredTool = useCallback((cx, cy) => {
    const el = toolbarRef.current;
    if (!el) return null;
    const px = cx * window.innerWidth,
      py = cy * window.innerHeight;
    for (const btn of el.querySelectorAll("button[data-id]")) {
      const r = btn.getBoundingClientRect();
      if (
        px >= r.left - HIT_TOLERANCE &&
        px <= r.right + HIT_TOLERANCE &&
        py >= r.top - HIT_TOLERANCE &&
        py <= r.bottom + HIT_TOLERANCE
      )
        return btn.getAttribute("data-id");
    }
    return null;
  }, []);

  const getHoveredTab = useCallback((cx, cy) => {
    const el = navRef.current;
    if (!el) return null;
    const px = cx * window.innerWidth,
      py = cy * window.innerHeight;
    for (const btn of el.querySelectorAll("button[data-tab]")) {
      const r = btn.getBoundingClientRect();
      if (
        px >= r.left - HIT_TOLERANCE &&
        px <= r.right + HIT_TOLERANCE &&
        py >= r.top - HIT_TOLERANCE &&
        py <= r.bottom + HIT_TOLERANCE
      )
        return btn.getAttribute("data-tab");
    }
    return null;
  }, []);

  const stateRef = useRef({});
  const lastPinchTime = useRef(0);
  stateRef.current = { drawMode, shapeMenuOpen, activeTab };

  const onGesture = useCallback(
    (data) => {
      const s = stateRef.current;

      if (data.type === "MOVE") {
        cursorRef.current = { x: data.x, y: data.y };
        setCursor({ x: data.x, y: data.y });
        setIsHandVisible(true);
        setHoveredTool(getHoveredTool(data.x, data.y));
        setHoveredTab(getHoveredTab(data.x, data.y));
        return;
      }
      if (data.type === "NO_HAND") {
        setIsHandVisible(false);
        setGestureLabel("");
        setHoveredTool(null);
        setHoveredTab(null);
        boardRef.current?.clearZoomRef();
        return;
      }
      if (data.type === "TWO_HAND") {
        boardRef.current?.twoHandZoom(data.dist);
        return;
      }

      // Game tab: pass gestures to game window global
      if (s.activeTab === "game") {
        if (data.type === "GESTURE") {
          const map = {
            POINT: "PUNCH",
            TWO_FINGER: "WAVE",
            OPEN: "POWER",
            FIST: "KICK",
          };
          window.__gameAction = map[data.value] || "IDLE";
        }
      }

      if (s.activeTab === "capture") {
        if (data.type !== "PINCH_DOWN" && data.type !== "MOVE") return;
      }

      if (s.activeTab !== "draw") {
        if (data.type !== "PINCH_DOWN") return;
      }

      if (data.type === "GESTURE") {
        setGestureLabel(data.value);
        if (boardRef.current?.hasGhost()) return;
        if (data.value === "TWO_FINGER") {
          setMode("draw");
          setShapeMenuOpen(false);
        } else if (data.value === "POINT") {
          setMode("strong");
          setShapeMenuOpen(false);
        } else if (data.value === "OPEN") {
          setMode("erase");
          setShapeMenuOpen(false);
        } else if (data.value === "FIST") {
          setMode("idle");
          setShapeMenuOpen(false);
        }
      }

      if (data.type === "PINCH_DOWN") {
        const tabHover = getHoveredTab(data.x, data.y);
        if (tabHover) {
          setActiveTab(tabHover);
          setShapeMenuOpen(false);
          setMode("idle");
          return;
        }
        const now = Date.now();
        if (now - lastPinchTime.current < 400) return;
        lastPinchTime.current = now;
        const hovered = getHoveredTool(data.x, data.y);
        if (hovered === "shapes") {
          setShapeMenuOpen((v) => !v);
          setMode("idle");
          return;
        }
        if (hovered === "clear") {
          boardRef.current?.clear();
          return;
        }
        if (hovered && hovered !== "shapes") {
          setMode(hovered);
          setShapeMenuOpen(false);
          return;
        }
        if (s.shapeMenuOpen) {
          const menuEl = document.getElementById("shape-menu");
          if (menuEl) {
            const px = data.x * window.innerWidth,
              py = data.y * window.innerHeight;
            for (const card of menuEl.querySelectorAll("button[data-shape]")) {
              const r = card.getBoundingClientRect();
              if (
                px >= r.left &&
                px <= r.right &&
                py >= r.top &&
                py <= r.bottom
              ) {
                boardRef.current?.startShape(card.getAttribute("data-shape"));
                setShapeMenuOpen(false);
                setMode("idle");
                return;
              }
            }
          }
          setShapeMenuOpen(false);
          return;
        }
        if (boardRef.current?.hasGhost()) {
          const result = boardRef.current.pinchDown(data.x, data.y);
          if (result === "committed") boardRef.current.clearZoomRef();
          return;
        }
      }

      if (data.type === "SWIPE") boardRef.current?.clear();
    },
    [getHoveredTool, getHoveredTab],
  );

  const isDrawTab = activeTab === "draw";

  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "#050510",
      }}
    >
      <Camera videoRef={videoRef} />
      {activeTab !== "game" && (
        <HandTracking videoRef={videoRef} onGesture={onGesture} />
      )}

      <div style={{ display: isDrawTab ? "block" : "none" }}>
        <CanvasBoard ref={boardRef} cursorRef={cursorRef} modeRef={modeRef} />
      </div>
      {activeTab === "game" && <Game videoRef={videoRef} />}
      {activeTab === "capture" && (
        <Capture
          ref={captureRef}
          videoRef={videoRef}
          handLandmarker={sharedHL}
        />
      )}

      {/* Top nav */}
      <nav ref={navRef} style={navStyle}>
        {TABS.map((tab) => (
          <button
            key={tab}
            data-tab={tab}
            onClick={() => setActiveTab(tab)}
            style={tabBtnStyle(activeTab === tab)}
          >
            <span style={{ fontSize: 15 }}>{TAB_ICONS[tab]}</span>
            {tab}
          </button>
        ))}
      </nav>

      {/* Shape menu */}
      {isDrawTab && shapeMenuOpen && (
        <div id="shape-menu" style={shapeMenuStyle}>
          <div style={shapeMenuLabel}>Hover + pinch to place</div>
          <div style={{ display: "flex", gap: 8 }}>
            {SHAPES.map((s) => (
              <button
                key={s.id}
                data-shape={s.id}
                onClick={() => {
                  boardRef.current?.startShape(s.id);
                  setShapeMenuOpen(false);
                  setMode("idle");
                }}
                style={shapeCardStyle()}
              >
                <span style={{ fontSize: 26, lineHeight: 1 }}>{s.icon}</span>
                <span
                  style={{
                    fontSize: 9,
                    opacity: 0.6,
                    letterSpacing: "1px",
                    marginTop: 3,
                  }}
                >
                  {s.id}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom toolbar */}
      {isDrawTab && (
        <div ref={toolbarRef} style={toolbarStyle}>
          {DRAW_TOOLS.map(({ id, icon, label }) => (
            <button
              key={id}
              data-id={id}
              onClick={() => {
                setMode(id);
                setShapeMenuOpen(false);
              }}
              style={toolBtnStyle(drawMode === id, hoveredTool === id)}
            >
              <span style={{ fontSize: 18 }}>{icon}</span>
              <span
                style={{ fontSize: 9, letterSpacing: "1.5px", opacity: 0.65 }}
              >
                {label}
              </span>
            </button>
          ))}
          <div style={divider} />
          <button
            data-id="shapes"
            onClick={() => {
              setShapeMenuOpen((v) => !v);
              setMode("idle");
            }}
            style={toolBtnStyle(shapeMenuOpen, hoveredTool === "shapes")}
          >
            <span style={{ fontSize: 18 }}>◇</span>
            <span
              style={{ fontSize: 9, letterSpacing: "1.5px", opacity: 0.65 }}
            >
              Shapes
            </span>
          </button>
          <div style={divider} />
          <button
            data-id="clear"
            onClick={() => {
              boardRef.current?.clear();
              setMode("idle");
            }}
            style={toolBtnStyle(false, hoveredTool === "clear")}
          >
            <span style={{ fontSize: 18 }}>🗑</span>
            <span
              style={{ fontSize: 9, letterSpacing: "1.5px", opacity: 0.65 }}
            >
              Clear
            </span>
          </button>
        </div>
      )}

      {gestureLabel && gestureLabel !== "UNKNOWN" && (
        <div style={gestureTagStyle}>{gestureLabel}</div>
      )}

      {isHandVisible && (
        <CursorDot cursor={cursor} mode={drawMode} hoveredTool={hoveredTool} />
      )}

      <style>{`
        @keyframes spin   { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  );
}

function CursorDot({ cursor, mode, hoveredTool }) {
  const c = hoveredTool
    ? "#FFD700"
    : mode === "draw"
      ? "#00e5ff"
      : mode === "strong"
        ? "#FFD700"
        : mode === "erase"
          ? "#f87171"
          : "rgba(255,255,255,0.5)";
  const big = mode === "erase" && !hoveredTool;
  const sz = big ? 58 : hoveredTool ? 22 : 14;
  return (
    <div
      style={{
        position: "absolute",
        left: `${cursor.x * window.innerWidth}px`,
        top: `${cursor.y * window.innerHeight}px`,
        width: sz,
        height: sz,
        borderRadius: "50%",
        background: big ? "transparent" : c,
        border: big
          ? `2.5px solid ${c}`
          : hoveredTool
            ? `2px solid ${c}`
            : "none",
        transform: "translate(-50%,-50%)",
        zIndex: 70,
        pointerEvents: "none",
        boxShadow: `0 0 0 ${hoveredTool ? 5 : 3}px ${c}25`,
        transition: "width .12s, height .12s, background .15s",
      }}
    />
  );
}

const navStyle = {
  position: "absolute",
  top: 18,
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 100,
  display: "flex",
  gap: 4,
  background: "rgba(6,6,20,0.82)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 50,
  padding: 5,
  backdropFilter: "blur(20px)",
  boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
};

function tabBtnStyle(active) {
  return {
    padding: "8px 20px",
    borderRadius: 40,
    border: active ? "1px solid rgba(255,215,0,0.5)" : "1px solid transparent",
    background: active ? "rgba(255,215,0,0.12)" : "transparent",
    color: active ? "#FFD700" : "rgba(255,255,255,0.45)",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    letterSpacing: "1.5px",
    textTransform: "uppercase",
    fontFamily: "'Orbitron',monospace",
    transition: "all .2s",
    display: "flex",
    alignItems: "center",
    gap: 7,
  };
}

const toolbarStyle = {
  position: "absolute",
  bottom: 24,
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 50,
  display: "flex",
  gap: 2,
  alignItems: "center",
  background: "rgba(6,6,20,0.9)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 18,
  padding: "8px 10px",
  backdropFilter: "blur(20px)",
  boxShadow: "0 4px 30px rgba(0,0,0,0.6)",
};

function toolBtnStyle(active, hovered) {
  return {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 3,
    padding: "9px 16px",
    borderRadius: 12,
    minWidth: 54,
    border: active
      ? "1px solid rgba(255,255,255,0.28)"
      : hovered
        ? "1px solid rgba(255,215,0,0.55)"
        : "1px solid transparent",
    background: active
      ? "rgba(255,255,255,0.12)"
      : hovered
        ? "rgba(255,215,0,0.1)"
        : "transparent",
    color: active ? "#fff" : hovered ? "#FFD700" : "rgba(255,255,255,0.42)",
    cursor: "pointer",
    fontFamily: "'Rajdhani',sans-serif",
    textTransform: "uppercase",
    transition: "all .12s",
  };
}

const divider = {
  width: 1,
  height: 36,
  background: "rgba(255,255,255,0.07)",
  margin: "0 3px",
};

const shapeMenuStyle = {
  position: "absolute",
  bottom: 96,
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 60,
  background: "rgba(6,6,28,0.96)",
  border: "1px solid rgba(167,139,250,0.22)",
  borderRadius: 18,
  padding: "14px 16px",
  backdropFilter: "blur(24px)",
  boxShadow: "0 -4px 32px rgba(0,0,0,0.6)",
  animation: "fadeUp .18s ease",
};

const shapeMenuLabel = {
  color: "rgba(255,255,255,0.25)",
  fontSize: 10,
  fontFamily: "'Orbitron',monospace",
  letterSpacing: "2px",
  textTransform: "uppercase",
  marginBottom: 10,
  textAlign: "center",
};

function shapeCardStyle() {
  return {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    width: 62,
    height: 62,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.09)",
    background: "rgba(255,255,255,0.04)",
    color: "rgba(255,255,255,0.7)",
    cursor: "pointer",
    transition: "all .12s",
    fontFamily: "'Orbitron',monospace",
  };
}

const gestureTagStyle = {
  position: "absolute",
  bottom: 96,
  left: 24,
  zIndex: 50,
  background: "rgba(6,6,20,0.8)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 10,
  padding: "5px 13px",
  color: "rgba(255,255,255,0.35)",
  fontSize: 10,
  fontFamily: "'Orbitron',monospace",
  letterSpacing: "2px",
  textTransform: "uppercase",
};
