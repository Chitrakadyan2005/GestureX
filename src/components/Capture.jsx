import {
  useRef,
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from "react";

// Gesture detection
function detectGestureCapture(lm) {
  const pinchDist = Math.hypot(lm[4].x - lm[8].x, lm[4].y - lm[8].y);
  const allUp =
    lm[8].y < lm[6].y &&
    lm[12].y < lm[10].y &&
    lm[16].y < lm[14].y &&
    lm[20].y < lm[18].y;
  if (allUp) return "OPEN";
  const isPeace =
    lm[8].y < lm[6].y &&
    lm[12].y < lm[10].y &&
    lm[16].y > lm[14].y &&
    lm[20].y > lm[18].y &&
    lm[4].y > lm[3].y &&
    pinchDist > 0.08;
  if (isPeace) return "PEACE";
  const isThumbsUp =
    lm[4].y < lm[3].y &&
    lm[4].y < lm[2].y &&
    lm[8].y > lm[6].y &&
    lm[12].y > lm[10].y &&
    lm[16].y > lm[14].y &&
    lm[20].y > lm[18].y;
  if (isThumbsUp) return "THUMBS_UP";
  return "OTHER";
}

const Capture = forwardRef(({ videoRef, handLandmarker }, ref) => {
  const photoCanvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const [photo, setPhoto] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [flash, setFlash] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [recording, setRecording] = useState(false);
  const [recordSec, setRecordSec] = useState(0);
  const [gestureHint, setGestureHint] = useState("");
  const [palmHeld, setPalmHeld] = useState(false);

  // Gesture detection loop
  useEffect(() => {
    if (!handLandmarker) return;
    let rafId;
    let gestureBuffer = [];
    let palmStartTime = null;
    let lastGesture = null;
    let cooldown = false;

    function loop() {
      const video = videoRef?.current;
      const oc = overlayCanvasRef.current;
      if (!video || video.readyState < 2 || !oc) {
        rafId = requestAnimationFrame(loop);
        return;
      }

      const now = performance.now();
      let res;
      try {
        res = handLandmarker.detectForVideo(video, now);
      } catch {
        rafId = requestAnimationFrame(loop);
        return;
      }

      const ctx = oc.getContext("2d");
      oc.width = oc.offsetWidth * window.devicePixelRatio;
      oc.height = oc.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      ctx.clearRect(0, 0, oc.offsetWidth, oc.offsetHeight);

      if (res.landmarks.length > 0) {
        const lm = res.landmarks[0];
        const g = detectGestureCapture(lm);
        gestureBuffer.push(g);
        if (gestureBuffer.length > 5) gestureBuffer.shift();

        let stable = g;
        if (gestureBuffer.length === 5) {
          const counts = {};
          gestureBuffer.forEach((v) => (counts[v] = (counts[v] || 0) + 1));
          stable = Object.keys(counts).reduce((a, b) =>
            counts[a] > counts[b] ? a : b,
          );
        }

        // Gesture hint overlay
        const labels = {
          PEACE: "✌ Peace → Photo",
          THUMBS_UP: "👍 Thumbs → Record",
          OPEN: "🖐 Palm → Download",
        };
        if (labels[stable]) setGestureHint(labels[stable]);
        else setGestureHint("");

        // Draw hand skeleton overlay
        const W = oc.offsetWidth,
          H = oc.offsetHeight;
        const CONNS = [
          [0, 1],
          [1, 2],
          [2, 3],
          [3, 4],
          [0, 5],
          [5, 6],
          [6, 7],
          [7, 8],
          [0, 9],
          [9, 10],
          [10, 11],
          [11, 12],
          [0, 13],
          [13, 14],
          [14, 15],
          [15, 16],
          [0, 17],
          [17, 18],
          [18, 19],
          [19, 20],
          [5, 9],
          [9, 13],
          [13, 17],
        ];
        ctx.strokeStyle = "rgba(167,139,250,0.6)";
        ctx.lineWidth = 1.5;
        for (const [a, b] of CONNS) {
          ctx.beginPath();
          ctx.moveTo((1 - lm[a].x) * W, lm[a].y * H);
          ctx.lineTo((1 - lm[b].x) * W, lm[b].y * H);
          ctx.stroke();
        }
        for (const p of lm) {
          ctx.beginPath();
          ctx.arc((1 - p.x) * W, p.y * H, 3, 0, Math.PI * 2);
          ctx.fillStyle =
            stable === "PEACE"
              ? "#00e5ff"
              : stable === "THUMBS_UP"
                ? "#FFD700"
                : stable === "OPEN"
                  ? "#4ade80"
                  : "#a78bfa";
          ctx.fill();
        }

        if (stable !== lastGesture) {
          lastGesture = stable;
          palmStartTime = stable === "OPEN" ? Date.now() : null;
        }

        if (!cooldown && stable !== lastGesture) {
          if (stable === "PEACE") {
            takePhoto();
            cooldown = true;
            setTimeout(() => {
              cooldown = false;
            }, 1500);
          } else if (stable === "THUMBS_UP") {
            if (!recording) startRecording();
            else stopRecording();

            cooldown = true;
            setTimeout(() => {
              cooldown = false;
            }, 1500);
          } else if (stable === "OPEN") {
            if (!palmStartTime) palmStartTime = Date.now();

            const held = Date.now() - palmStartTime > 1200;
            setPalmHeld(held);

            if (held) {
              downloadLatest();
              palmStartTime = null;
              cooldown = true;
              setTimeout(() => {
                cooldown = false;
                setPalmHeld(false);
              }, 2000);
            }
          }
        }
      } else {
        gestureBuffer = [];
        lastGesture = null;
        palmStartTime = null;
        setPalmHeld(false);
        setGestureHint("");
      }

      rafId = requestAnimationFrame(loop);
    }
    loop();
    return () => cancelAnimationFrame(rafId);
  }, [handLandmarker]);

  // Recording timer
  useEffect(() => {
    if (!recording) {
      setRecordSec(0);
      return;
    }
    const iv = setInterval(() => setRecordSec((s) => s + 1), 1000);
    return () => clearInterval(iv);
  }, [recording]);

  function takePhoto() {
    if (countdown !== null) return;
    let c = 3;
    setCountdown(c);
    const iv = setInterval(() => {
      c--;
      if (c > 0) {
        setCountdown(c);
      } else {
        clearInterval(iv);
        setCountdown(null);
        snap();
      }
    }, 1000);
  }

  function snap() {
    const canvas = photoCanvasRef.current;
    const video = videoRef.current;
    if (!video) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    setPhoto(canvas.toDataURL("image/png"));
    setFlash(true);
    setTimeout(() => setFlash(false), 350);
  }

  function toggleRecording() {
    if (recording) stopRecording();
    else startRecording();
  }

  function startRecording() {
    const video = videoRef.current;
    if (!video?.srcObject) return;
    chunksRef.current = [];
    const mr = new MediaRecorder(video.srcObject, { mimeType: "video/webm" });
    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      setVideoUrl(URL.createObjectURL(blob));
    };
    mr.start();
    mediaRecorderRef.current = mr;
    setRecording(true);
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  function downloadLatest() {
    if (videoUrl) {
      const a = document.createElement("a");
      a.href = videoUrl;
      a.download = `capture-video-${Date.now()}.webm`;
      a.click();
    } else if (photo) {
      const a = document.createElement("a");
      a.href = photo;
      a.download = `capture-photo-${Date.now()}.png`;
      a.click();
    }
  }

  useImperativeHandle(ref, () => ({
    takePhoto,
    startRecording,
    stopRecording,
  }));

  return (
    <>
      <canvas ref={photoCanvasRef} style={{ display: "none" }} />

      {/* Hand skeleton overlay on camera feed */}
      <canvas
        ref={overlayCanvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          zIndex: 10,
          pointerEvents: "none",
        }}
      />

      {flash && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "white",
            opacity: 0.7,
            zIndex: 200,
            pointerEvents: "none",
            animation: "flashFade 0.35s ease forwards",
          }}
        />
      )}

      {countdown !== null && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%,-50%)",
            fontFamily: "'Orbitron', monospace",
            fontSize: 120,
            fontWeight: 900,
            color: "#FFD700",
            zIndex: 150,
            pointerEvents: "none",
            textShadow: "0 0 40px rgba(255,215,0,0.5)",
            animation: "countPop 0.8s ease",
          }}
        >
          {countdown}
        </div>
      )}

      {/* Recording indicator */}
      {recording && (
        <div
          style={{
            position: "absolute",
            top: 80,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 40,
            background: "rgba(220,38,38,0.2)",
            border: "1px solid rgba(220,38,38,0.6)",
            borderRadius: 30,
            padding: "8px 20px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontFamily: "'Orbitron', monospace",
            fontSize: 12,
            color: "#f87171",
            letterSpacing: "2px",
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#f87171",
              animation: "recPulse 1s ease-in-out infinite",
            }}
          />
          REC {String(Math.floor(recordSec / 60)).padStart(2, "0")}:
          {String(recordSec % 60).padStart(2, "0")}
        </div>
      )}

      {/* Gesture hint */}
      {gestureHint && (
        <div
          style={{
            position: "absolute",
            top: 80,
            right: 24,
            zIndex: 40,
            background: "rgba(6,6,20,0.75)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10,
            padding: "8px 16px",
            fontFamily: "'Orbitron', monospace",
            fontSize: 11,
            color: "rgba(255,255,255,0.6)",
            letterSpacing: "2px",
          }}
        >
          {gestureHint}
        </div>
      )}

      {/* Palm held download progress */}
      {palmHeld && (
        <div
          style={{
            position: "absolute",
            bottom: 140,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 40,
            background: "rgba(74,222,128,0.15)",
            border: "1px solid rgba(74,222,128,0.4)",
            borderRadius: 10,
            padding: "10px 24px",
            fontFamily: "'Orbitron', monospace",
            fontSize: 12,
            color: "#4ade80",
            letterSpacing: "2px",
          }}
        >
          🖐 Downloading…
        </div>
      )}

      {/* Manual buttons */}
      <div
        style={{
          position: "absolute",
          bottom: 30,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 30,
          display: "flex",
          gap: 12,
          alignItems: "center",
        }}
      >
        <button
          onClick={takePhoto}
          disabled={countdown !== null || recording}
          style={capBtn("#00e5ff", countdown !== null)}
        >
          📸 Photo
        </button>
        <button
          onClick={toggleRecording}
          style={capBtn(recording ? "#f87171" : "#FFD700", false)}
        >
          {recording ? "⏹ Stop" : "🔴 Rec"}
        </button>
        {(photo || videoUrl) && (
          <button onClick={downloadLatest} style={capBtn("#4ade80", false)}>
            ⬇ Save
          </button>
        )}
      </div>

      {/* Preview thumbnails */}
      <div
        style={{
          position: "absolute",
          bottom: 100,
          right: 20,
          zIndex: 30,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          alignItems: "flex-end",
        }}
      >
        {photo && (
          <div style={{ position: "relative" }}>
            <img
              src={photo}
              alt="photo"
              style={{
                width: 180,
                borderRadius: 10,
                border: "1.5px solid rgba(0,229,255,0.4)",
              }}
            />
            <button onClick={() => setPhoto(null)} style={closeBtn}>
              ✕
            </button>
            <div style={previewLabel}>Photo</div>
          </div>
        )}
        {videoUrl && (
          <div style={{ position: "relative" }}>
            <video
              src={videoUrl}
              controls
              style={{
                width: 180,
                borderRadius: 10,
                border: "1.5px solid rgba(255,215,0,0.4)",
              }}
            />
            <button onClick={() => setVideoUrl(null)} style={closeBtn}>
              ✕
            </button>
            <div style={{ ...previewLabel, color: "#FFD700" }}>Video</div>
          </div>
        )}
      </div>

      {/* Gesture guide */}
      <div
        style={{
          position: "absolute",
          bottom: 100,
          left: 20,
          zIndex: 30,
          background: "rgba(6,6,20,0.8)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 12,
          padding: "12px 16px",
          fontFamily: "'Rajdhani', sans-serif",
          fontSize: 12,
          color: "rgba(255,255,255,0.4)",
          lineHeight: 2,
          letterSpacing: "1px",
        }}
      >
        ✌ Peace sign → 📸 Photo
        <br />
        👍 Thumbs up → 🎥 Record / Stop
        <br />
        🖐 Hold palm → ⬇ Download
      </div>

      <style>{`
        @keyframes flashFade { from { opacity: 0.7; } to { opacity: 0; } }
        @keyframes countPop { from { transform: translate(-50%,-50%) scale(1.6); opacity: 0.3; } to { transform: translate(-50%,-50%) scale(1); opacity: 1; } }
        @keyframes recPulse { 0%,100% { opacity:1; } 50% { opacity:0.2; } }
      `}</style>
    </>
  );
});

function capBtn(color, disabled) {
  return {
    padding: "10px 20px",
    borderRadius: 30,
    background: `rgba(${color === "#00e5ff" ? "0,229,255" : color === "#FFD700" ? "255,215,0" : color === "#f87171" ? "248,113,113" : "74,222,128"},0.12)`,
    border: `1.5px solid ${disabled ? "rgba(255,255,255,0.1)" : color}`,
    color: disabled ? "rgba(255,255,255,0.2)" : color,
    fontFamily: "'Rajdhani', sans-serif",
    fontWeight: 700,
    fontSize: 13,
    letterSpacing: "1.5px",
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

const closeBtn = {
  position: "absolute",
  top: -8,
  right: -8,
  width: 22,
  height: 22,
  borderRadius: "50%",
  background: "rgba(255,60,60,0.3)",
  border: "1px solid rgba(255,60,60,0.6)",
  color: "#fff",
  fontSize: 10,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const previewLabel = {
  fontSize: 10,
  color: "rgba(0,229,255,0.6)",
  fontFamily: "'Orbitron', monospace",
  letterSpacing: "1px",
  textAlign: "right",
  marginTop: 4,
};

export default Capture;
