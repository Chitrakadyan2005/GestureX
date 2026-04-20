import ironman from "../assets/ironman.png";
import spiderman from "../assets/spiderman.png";
import thor from "../assets/thor.png";
import hulk from "../assets/hulk.png";

const characters = [
  {
    id: "ironman",
    name: "Iron Man",
    img: ironman,
    color: "#c0392b",
    glow: "rgba(192,57,43,0.6)",
    power: "Repulsor Blast",
    suit: "Mark L Nanotech",
  },
  {
    id: "spiderman",
    name: "Spider-Man",
    img: spiderman,
    color: "#e74c3c",
    glow: "rgba(41,128,185,0.6)",
    power: "Web Shoot",
    suit: "Advanced Suit",
  },
  {
    id: "thor",
    name: "Thor",
    img: thor,
    color: "#2980b9",
    glow: "rgba(241,196,15,0.6)",
    power: "Lightning Strike",
    suit: "Asgardian Armor",
  },
  {
    id: "hulk",
    name: "Hulk",
    img: hulk,
    color: "#27ae60",
    glow: "rgba(39,174,96,0.6)",
    power: "Ground Smash",
    suit: "No Suit Needed",
  },
];

export default function Character({ hoveredChar, selectedChar, activeSuit }) {
  return (
    <div
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 20,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "32px",
      }}
    >
      {/* Title */}
      <div style={{
        fontFamily: "'Orbitron', sans-serif",
        fontSize: "13px",
        letterSpacing: "6px",
        color: "rgba(255,215,0,0.7)",
        textTransform: "uppercase",
        textAlign: "center",
      }}>
        ✊ Fist + Drag to Wear
      </div>

      {/* Character cards */}
      <div style={{ display: "flex", gap: "36px" }}>
        {characters.map((char) => {
          const isHovered = hoveredChar === char.id;
          const isSelected = selectedChar === char.id;
          const isWorn = activeSuit === char.id || activeSuit?.toLowerCase().includes(char.id.replace("man","").replace("-",""));

          return (
            <div
              key={char.id}
              data-char-id={char.id}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "12px",
                transition: "transform 0.2s cubic-bezier(0.34,1.56,0.64,1)",
                transform: isHovered ? "scale(1.1) translateY(-6px)" : "scale(1)",
              }}
            >
              {/* Avatar ring */}
              <div
                style={{
                  position: "relative",
                  width: "130px",
                  height: "130px",
                }}
              >
                {/* Outer glow ring */}
                <div
                  style={{
                    position: "absolute",
                    inset: "-4px",
                    borderRadius: "50%",
                    background: isHovered || isSelected
                      ? `conic-gradient(${char.color}, transparent, ${char.color})`
                      : "transparent",
                    animation: isHovered ? "rotateBorder 1.5s linear infinite" : "none",
                    opacity: 0.8,
                  }}
                />

                {/* Image circle */}
                <div
                  style={{
                    position: "absolute",
                    inset: isHovered || isSelected ? "2px" : "0",
                    borderRadius: "50%",
                    overflow: "hidden",
                    border: isWorn
                      ? `3px solid #FFD700`
                      : isSelected
                      ? `3px solid ${char.color}`
                      : isHovered
                      ? `2px solid rgba(255,255,255,0.7)`
                      : "2px solid rgba(255,255,255,0.2)",
                    boxShadow: isHovered
                      ? `0 0 20px ${char.glow}, 0 8px 32px rgba(0,0,0,0.5)`
                      : isWorn
                      ? `0 0 25px rgba(255,215,0,0.7)`
                      : "0 4px 20px rgba(0,0,0,0.4)",
                    transition: "all 0.2s ease",
                    background: "rgba(0,0,0,0.3)",
                  }}
                >
                  <img
                    src={char.img}
                    alt={char.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>

                {/* Worn indicator */}
                {isWorn && (
                  <div
                    style={{
                      position: "absolute",
                      top: "0",
                      right: "0",
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #FFD700, #FF8C00)",
                      border: "2px solid rgba(0,0,0,0.5)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "14px",
                      zIndex: 5,
                    }}
                  >
                    ✓
                  </div>
                )}
              </div>

              {/* Name */}
              <div style={{
                fontFamily: "'Rajdhani', sans-serif",
                color: isHovered ? "white" : "rgba(255,255,255,0.75)",
                fontSize: "14px",
                fontWeight: 700,
                letterSpacing: "2px",
                textShadow: isHovered ? `0 0 12px ${char.glow}` : "none",
                textTransform: "uppercase",
                transition: "all 0.2s",
              }}>
                {char.name}
              </div>

              {/* Hover tooltip */}
              {isHovered && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    background: "rgba(0,0,0,0.75)",
                    border: `1px solid ${char.color}`,
                    borderRadius: "8px",
                    padding: "8px 14px",
                    minWidth: "140px",
                    backdropFilter: "blur(10px)",
                    textAlign: "center",
                    pointerEvents: "none",
                  }}
                >
                  <div style={{
                    color: char.color,
                    fontSize: "10px",
                    fontWeight: 700,
                    letterSpacing: "1.5px",
                    textTransform: "uppercase",
                    marginBottom: "3px",
                  }}>
                    {char.suit}
                  </div>
                  <div style={{
                    color: "rgba(255,255,255,0.6)",
                    fontSize: "11px",
                    letterSpacing: "1px",
                  }}>
                    ⚡ {char.power}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes rotateBorder {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
