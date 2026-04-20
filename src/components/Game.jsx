import { useRef, useEffect, useState } from "react";
import { PoseLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

const ACTION_LABELS = {
  PUNCH: "👊 Punch",
  WAVE: "👋 Wave",
  POWER: "⚡ Power",
  KICK: "🦵 Kick",
  IDLE: "😴 Idle",
};

// Detect action (optional label only)
function detectPoseAction(lm) {
  const leftWrist = lm[15];
  const rightWrist = lm[16];
  const leftShoulder = lm[11];
  const rightShoulder = lm[12];

  if (leftWrist.y < leftShoulder.y && rightWrist.y < rightShoulder.y)
    return "POWER";

  if (rightWrist.x < rightShoulder.x - 0.1) return "PUNCH";

  if (leftWrist.x > leftShoulder.x + 0.1) return "WAVE";

  const leftKnee = lm[25];
  const leftHip = lm[23];
  if (leftKnee.y < leftHip.y) return "KICK";

  return "IDLE";
}

// 🔥 REAL POSE DRAWING (mimic)
function drawFigure(ctx, x, y, scale, pose) {
  if (!pose) return;

  const get = (i) => ({
    x: x + (pose[i].x - 0.5) * 300 * scale,
    y: y + (pose[i].y - 0.5) * 300 * scale,
  });

  const head = get(0);
  const ls = get(11);
  const rs = get(12);
  const le = get(13);
  const re = get(14);
  const lw = get(15);
  const rw = get(16);
  const lh = get(23);
  const rh = get(24);
  const lk = get(25);
  const rk = get(26);
  const la = get(27);
  const ra = get(28);

  ctx.strokeStyle = "#a78bfa";
  ctx.lineWidth = 5 * scale;

  // Head
  ctx.beginPath();
  ctx.arc(head.x, head.y - 40 * scale, 15 * scale, 0, Math.PI * 2);
  ctx.stroke();

  // Body
  ctx.beginPath();
  ctx.moveTo(ls.x, ls.y);
  ctx.lineTo(rs.x, rs.y);
  ctx.lineTo(rh.x, rh.y);
  ctx.lineTo(lh.x, lh.y);
  ctx.closePath();
  ctx.stroke();

  // Arms
  ctx.beginPath();
  ctx.moveTo(ls.x, ls.y);
  ctx.lineTo(le.x, le.y);
  ctx.lineTo(lw.x, lw.y);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(rs.x, rs.y);
  ctx.lineTo(re.x, re.y);
  ctx.lineTo(rw.x, rw.y);
  ctx.stroke();

  // Legs
  ctx.beginPath();
  ctx.moveTo(lh.x, lh.y);
  ctx.lineTo(lk.x, lk.y);
  ctx.lineTo(la.x, la.y);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(rh.x, rh.y);
  ctx.lineTo(rk.x, rk.y);
  ctx.lineTo(ra.x, ra.y);
  ctx.stroke();
}

export default function Game({ videoRef }) {
  const figureCanvasRef = useRef(null);
  const detectionCanvasRef = useRef(null);
  const poseRef = useRef(null);
  const poseDataRef = useRef(null);

  const [action, setAction] = useState("IDLE");
  const [loaded, setLoaded] = useState(false);

  // Init pose
  useEffect(() => {
    let alive = true;

    async function init() {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm",
      );

      const pose = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
      });

      poseRef.current = pose;

      if (alive) setLoaded(true);
    }

    init();
    return () => (alive = false);
  }, []);

  // Detection loop
  useEffect(() => {
    if (!loaded) return;

    let rafId;

    function loop() {
      const video = videoRef?.current;
      const canvas = detectionCanvasRef.current;

      if (!video || video.readyState < 2 || !canvas) {
        rafId = requestAnimationFrame(loop);
        return;
      }

      const ctx = canvas.getContext("2d");
      const now = performance.now();
      const res = poseRef.current.detectForVideo(video, now);

      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;

      ctx.clearRect(0, 0, w, h);

      ctx.save();
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, w, h);
      ctx.restore();

      if (res.landmarks.length > 0) {
        const lm = res.landmarks[0];
        if (poseDataRef.current) {
          poseDataRef.current = poseDataRef.current.map((p, i) => ({
            x: (p.x + lm[i].x) / 2,
            y: (p.y + lm[i].y) / 2,
            z: (p.z + lm[i].z) / 2,
          }));
        } else {
          poseDataRef.current = lm;
        }

        const a = detectPoseAction(lm);
        setAction(a);

        const POSE_CONNECTIONS = [
          // Face
          [0, 1],
          [1, 2],
          [2, 3],
          [3, 7],
          [0, 4],
          [4, 5],
          [5, 6],
          [6, 8],

          // Torso
          [9, 10],
          [11, 12],
          [11, 23],
          [12, 24],
          [23, 24],

          // Left arm
          [11, 13],
          [13, 15],
          [15, 17],
          [15, 19],
          [15, 21],

          // Right arm
          [12, 14],
          [14, 16],
          [16, 18],
          [16, 20],
          [16, 22],

          // Left leg
          [23, 25],
          [25, 27],
          [27, 29],
          [29, 31],

          // Right leg
          [24, 26],
          [26, 28],
          [28, 30],
          [30, 32],
        ];

        // Draw lines
        ctx.strokeStyle = "#a78bfa";
        ctx.lineWidth = 2;

        for (const [a, b] of POSE_CONNECTIONS) {
          ctx.beginPath();
          ctx.moveTo((1 - lm[a].x) * w, lm[a].y * h);
          ctx.lineTo((1 - lm[b].x) * w, lm[b].y * h);
          ctx.stroke();
        }

        // Draw points on top
        for (const p of lm) {
          ctx.beginPath();
          ctx.arc((1 - p.x) * w, p.y * h, 3, 0, Math.PI * 2);
          ctx.fillStyle = "#FFD700";
          ctx.fill();
        }
      } else {
        poseDataRef.current = null;
        setAction("IDLE");

        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = "rgba(255,255,255,0.3)";
        ctx.font = "13px monospace";
        ctx.textAlign = "center";
        ctx.fillText("No body detected", w / 2, h / 2);
      }

      rafId = requestAnimationFrame(loop);
    }

    loop();
    return () => cancelAnimationFrame(rafId);
  }, [loaded]);

  // Figure render loop
  useEffect(() => {
    let rafId;

    function loop() {
      const canvas = figureCanvasRef.current;
      if (!canvas) {
        rafId = requestAnimationFrame(loop);
        return;
      }

      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;

      const ctx = canvas.getContext("2d");
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;

      ctx.clearRect(0, 0, w, h);

      drawFigure(ctx, w / 2, h * 0.6, 1.5, poseDataRef.current);

      rafId = requestAnimationFrame(loop);
    }

    loop();
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        display: "flex",
        background: "#05050f",
      }}
    >
      {/* Left */}
      <div style={{ flex: 1, position: "relative" }}>
        <canvas
          ref={figureCanvasRef}
          style={{ width: "100%", height: "100%" }}
        />

        <div
          style={{
            position: "absolute",
            bottom: 30,
            left: "50%",
            transform: "translateX(-50%)",
            color: "#c4b5fd",
            fontFamily: "monospace",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10, opacity: 0.5, letterSpacing: "2px" }}>
              POSE
            </div>
            <div>{ACTION_LABELS[action]}</div>
          </div>
        </div>
      </div>

      {/* Right */}
      <div style={{ width: "35%" }}>
        <canvas
          ref={detectionCanvasRef}
          style={{ width: "100%", height: "100%" }}
        />
      </div>
    </div>
  );
}
