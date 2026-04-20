export default function UIOverlay({ activeTab, setActiveTab, cursor, gestureLabel, activeSuit, onClearSuit }) {
  const tabs = [
    { id: "character", label: "Character", icon: "🦸" },
    { id: "game",      label: "Game",      icon: "⚔️" },
    { id: "capture",   label: "Capture",   icon: "📸" },
  ];

  const buttonWidth = 130;
  const gap = 20;

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 20,
        fontFamily: "'Rajdhani', 'Orbitron', sans-serif",
      }}
    >
      {/* ── Top Nav ── */}
      <div
        style={{
          position: "absolute",
          top: "16px",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: `${gap}px`,
          pointerEvents: "auto",
          background: "rgba(0,0,0,0.45)",
          borderRadius: "40px",
          border: "1px solid rgba(255,215,0,0.25)",
          padding: "6px",
          backdropFilter: "blur(12px)",
          boxShadow: "0 4px 30px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)",
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(isActive ? null : tab.id)}
              style={{
                width: `${buttonWidth}px`,
                height: "46px",
                borderRadius: "35px",
                border: isActive
                  ? "1.5px solid rgba(255,215,0,0.8)"
                  : "1.5px solid transparent",
                background: isActive
                  ? "linear-gradient(135deg, rgba(255,215,0,0.25) 0%, rgba(255,100,0,0.15) 100%)"
                  : "transparent",
                color: isActive ? "#FFD700" : "rgba(255,255,255,0.7)",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
                letterSpacing: "1.5px",
                textTransform: "uppercase",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                boxShadow: isActive ? "0 0 15px rgba(255,215,0,0.3)" : "none",
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Gesture HUD (bottom left) ── */}
      {gestureLabel && gestureLabel !== "IDLE" && (
        <div
          style={{
            position: "absolute",
            bottom: "24px",
            left: "24px",
            background: "rgba(0,0,0,0.55)",
            border: "1px solid rgba(255,215,0,0.35)",
            borderRadius: "12px",
            padding: "10px 18px",
            backdropFilter: "blur(10px)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <div
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#FFD700",
              boxShadow: "0 0 8px #FFD700",
              animation: "gestPulse 1s ease-in-out infinite",
            }}
          />
          <span
            style={{
              color: "#FFD700",
              fontSize: "13px",
              fontWeight: 700,
              letterSpacing: "2px",
              textTransform: "uppercase",
            }}
          >
            {gestureLabel}
          </span>
        </div>
      )}

      {/* ── Active Suit Badge + Clear Button ── */}
      {activeSuit && (
        <div
          style={{
            position: "absolute",
            bottom: "24px",
            right: "24px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            pointerEvents: "auto",
          }}
        >
          <div style={{
            background: "rgba(0,0,0,0.55)",
            border: "1px solid rgba(255,215,0,0.4)",
            borderRadius: "12px",
            padding: "10px 18px",
            backdropFilter: "blur(10px)",
            color: "rgba(255,255,255,0.8)",
            fontSize: "13px",
            fontWeight: 600,
            letterSpacing: "1.5px",
            textTransform: "uppercase",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}>
            <span>🦾 {activeSuit} SUIT ACTIVE</span>
            <span style={{ fontSize: "10px", color: "rgba(255,215,0,0.6)", letterSpacing: "1px" }}>
              ✊ HOLD FIST 1s TO REMOVE
            </span>
          </div>
          <button
            onClick={onClearSuit}
            style={{
              width: "36px", height: "36px",
              borderRadius: "50%",
              background: "rgba(255,60,60,0.2)",
              border: "1.5px solid rgba(255,60,60,0.6)",
              color: "#ff6666", fontSize: "16px",
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.2s",
            }}
            title="Remove suit"
          >✕</button>
        </div>
      )}

      {/* ── Instructions hint ── */}
      {!activeTab && (
        <div
          style={{
            position: "absolute",
            bottom: "80px",
            left: "50%",
            transform: "translateX(-50%)",
            color: "rgba(255,255,255,0.45)",
            fontSize: "13px",
            letterSpacing: "2px",
            textTransform: "uppercase",
            textAlign: "center",
            pointerEvents: "none",
          }}
        >
          👆 Pinch to select a tab &nbsp;|&nbsp; ✊ Fist + drag to wear a suit
        </div>
      )}

      <style>{`
        @keyframes gestPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.7); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
