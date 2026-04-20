import { useEffect, useRef } from "react";

// Maps suit name → image file prefix
const SUIT_PREFIX = {
  Ironman: "Ironman",
  spider:  "spider",
  thor:    "thor",
  hulk:    "hulk",
};

// File extensions per image (from your /public/suits/ folder)
const EXT = {
  "Ironman-torso":    "png",
  "Ironman-leftarm":  "jpg",
  "Ironman-rightarm": "png",
  "spider-torso":     "png",
  "spider-leftarm":   "png",
  "spider-rightarm":  "png",
  "thor-torso":       "png",
  "thor-leftarm":     "png",
  "thor-rightarm":    "png",
  "hulk-torso":       "jpg",
  "hulk-leftarm":     "jpg",
  "hulk-rightarm":    "jpg",
};

function imgSrc(prefix, part) {
  const key = `${prefix}-${part}`;
  return `/suits/${key}.${EXT[key] || "png"}`;
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload  = () => resolve(img);
    img.onerror = () => { console.warn("Missing:", src); resolve(null); };
    img.src = src;
  });
}

export default function SuitOverlay({ poseLandmarksRef, activeSuit }) {
  const canvasRef = useRef(null);
  const imagesRef = useRef({ torso: null, leftArm: null, rightArm: null });
  const rafRef    = useRef(null);

  // Load images whenever suit changes
  useEffect(() => {
    if (!activeSuit) return;
    const prefix = SUIT_PREFIX[activeSuit] || activeSuit;
    Promise.all([
      loadImage(imgSrc(prefix, "torso")),
      loadImage(imgSrc(prefix, "leftarm")),
      loadImage(imgSrc(prefix, "rightarm")),
    ]).then(([torso, leftArm, rightArm]) => {
      imagesRef.current = { torso, leftArm, rightArm };
      console.log("[SuitOverlay] images loaded:", { torso: !!torso, leftArm: !!leftArm, rightArm: !!rightArm });
    });
  }, [activeSuit]);

  // Draw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext("2d");
    let running  = true;

    function resize() {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    // Convert normalized landmark to canvas pixels
    // NOTE: video is mirrored (scaleX -1), so we flip x: canvas_x = (1 - lm.x) * W
    function lx(lm) { return (1 - lm.x) * canvas.width;  }
    function ly(lm) { return lm.y        * canvas.height; }

    /**
     * Draw an image centered between two points, rotated to align with them,
     * scaled so its length matches the distance between the points.
     *
     * lengthMult  — how much of the segment the image covers (>1 = slightly longer)
     * widthMult   — image height relative to the segment length
     * offsetFrac  — shift the image along the segment (0 = start at p1, 0.5 = center)
     */
    function drawSegment(img, p1, p2, lengthMult = 1.15, widthMult = 1.0, offsetFrac = 0) {
      if (!img) return;
      const x1 = lx(p1), y1 = ly(p1);
      const x2 = lx(p2), y2 = ly(p2);

      const dx    = x2 - x1;
      const dy    = y2 - y1;
      const len   = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);

      const drawLen = len * lengthMult;
      const drawW   = drawLen * widthMult;

      ctx.save();
      ctx.translate(x1 + dx * offsetFrac, y1 + dy * offsetFrac);
      ctx.rotate(angle);
      // Draw centered on the segment, shifted by -drawLen/2 so it spans the segment
      ctx.drawImage(img, -drawLen * offsetFrac, -drawW / 2, drawLen, drawW);
      ctx.restore();
    }

    function draw() {
      if (!running) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const lm   = poseLandmarksRef.current;
      const imgs = imagesRef.current;

      if (lm && lm.length >= 25) {
        const ls = lm[11]; // left shoulder
        const rs = lm[12]; // right shoulder
        const lh = lm[23]; // left hip
        const rh = lm[24]; // right hip
        const le = lm[13]; // left elbow
        const re = lm[14]; // right elbow
        const lw = lm[15]; // left wrist
        const rw = lm[16]; // right wrist

        // ── TORSO ──
        // Draw from shoulder-center to hip-center, wide enough to cover chest
        if (imgs.torso) {
          const shoulderCX = (lx(ls) + lx(rs)) / 2;
          const shoulderCY = (ly(ls) + ly(rs)) / 2;
          const hipCX      = (lx(lh) + lx(rh)) / 2;
          const hipCY      = (ly(lh) + ly(rh)) / 2;

          const dx     = hipCX - shoulderCX;
          const dy     = hipCY - shoulderCY;
          const torsoH = Math.hypot(dx, dy) * 1.2;  // slightly taller than body
          const shoulderW = Math.hypot(lx(ls) - lx(rs), ly(ls) - ly(rs));
          const torsoW  = shoulderW * 1.8;           // wider than shoulder span

          const angle = Math.atan2(dy, dx) - Math.PI / 2; // perpendicular to body axis

          const centerX = (shoulderCX + hipCX) / 2;
          const centerY = (shoulderCY + hipCY) / 2;

          ctx.save();
          ctx.translate(centerX, centerY);
          ctx.rotate(angle);
          ctx.drawImage(imgs.torso, -torsoW / 2, -torsoH / 2, torsoW, torsoH);
          ctx.restore();
        }

        // ── LEFT ARM: shoulder → elbow → wrist ──
        // (In mirrored video, MediaPipe "left" = viewer's right side of screen)
        if (imgs.leftArm) {
          drawSegment(imgs.leftArm, ls, le, 1.1, 0.9, 0);   // upper arm
          drawSegment(imgs.leftArm, le, lw, 1.1, 0.8, 0);   // forearm
        }

        // ── RIGHT ARM: shoulder → elbow → wrist ──
        if (imgs.rightArm) {
          drawSegment(imgs.rightArm, rs, re, 1.1, 0.9, 0);
          drawSegment(imgs.rightArm, re, rw, 1.1, 0.8, 0);
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      running = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [poseLandmarksRef, activeSuit]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        top: 0, left: 0,
        width:  "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 30,
      }}
    />
  );
}
