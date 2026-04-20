import { useRef, useEffect, useImperativeHandle, forwardRef } from "react";

function drawShape(ctx, shape, cx, cy, r, ghost) {
  ctx.save();
  if (ghost) {
    ctx.strokeStyle = "#a78bfa";
    ctx.fillStyle   = "rgba(167,139,250,0.12)";
    ctx.lineWidth   = 2;
    ctx.setLineDash([6, 5]);
  } else {
    ctx.strokeStyle = "#a78bfa";
    ctx.fillStyle   = "rgba(167,139,250,0.18)";
    ctx.lineWidth   = 2.5;
    ctx.setLineDash([]);
  }
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.beginPath();

  if (shape === "circle") {
    ctx.arc(cx, cy, Math.max(r, 2), 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
  } else if (shape === "rect") {
    ctx.rect(cx - r, cy - r, r * 2, r * 2);
    ctx.fill(); ctx.stroke();
  } else if (shape === "triangle") {
    ctx.moveTo(cx, cy - r); ctx.lineTo(cx - r, cy + r); ctx.lineTo(cx + r, cy + r);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if (shape === "line") {
    ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy); ctx.stroke();
  } else if (shape === "star") {
    const inn = r * 0.42;
    for (let i = 0; i < 10; i++) {
      const a = (i * Math.PI) / 5 - Math.PI / 2;
      const rad = i % 2 === 0 ? r : inn;
      i === 0 ? ctx.moveTo(cx + Math.cos(a)*rad, cy + Math.sin(a)*rad)
              : ctx.lineTo(cx + Math.cos(a)*rad, cy + Math.sin(a)*rad);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if (shape === "arrow") {
    const h = r * 0.45;
    ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy);
    ctx.moveTo(cx + r, cy); ctx.lineTo(cx + r - h, cy - h * 0.6);
    ctx.moveTo(cx + r, cy); ctx.lineTo(cx + r - h, cy + h * 0.6);
    ctx.stroke();
  }
  ctx.restore();
}

const CanvasBoard = forwardRef(({ cursorRef, modeRef }, ref) => {
  const canvasRef    = useRef(null);
  const ghostRef     = useRef(null);
  const shapesRef    = useRef([]);
  const prevDistRef  = useRef(null);
  // Smoothed cursor position for drawing
  const smoothRef    = useRef({ x: 0.5, y: 0.5 });

  useImperativeHandle(ref, () => ({
    clear() {
      const cv = canvasRef.current;
      cv.getContext("2d").clearRect(0, 0, cv.width, cv.height);
      shapesRef.current = [];
      ghostRef.current  = null;
    },
    startShape(id) {
      ghostRef.current = { shape: id, x: 0.5, y: 0.45, r: 0.08, dragging: true };
    },
    pinchDown(nx, ny) {
      const g = ghostRef.current;
      if (!g) return "none";
      if (g.dragging) {
        g.dragging = false;
        g.x = nx; g.y = ny;
        return "locked";
      } else {
        shapesRef.current.push({ ...g });
        ghostRef.current = null;
        return "committed";
      }
    },
    twoHandZoom(dist) {
      const g = ghostRef.current;
      if (!g || g.dragging) { prevDistRef.current = dist; return; }
      if (prevDistRef.current !== null) {
        const delta = (dist - prevDistRef.current) * 1.8;
        g.r = Math.max(0.03, Math.min(0.45, g.r + delta));
      }
      prevDistRef.current = dist;
    },
    clearZoomRef() { prevDistRef.current = null; },
    hasGhost() { return !!ghostRef.current; },
    ghostDragging() { return ghostRef.current?.dragging ?? false; },
  }));

  useEffect(() => {
    const cv = canvasRef.current;
    cv.width  = window.innerWidth;
    cv.height = window.innerHeight;
    const ctx = cv.getContext("2d");

    const fc  = document.createElement("canvas");
    fc.width  = cv.width; fc.height = cv.height;
    const fctx = fc.getContext("2d");

    let rafId, prev = null;

    function loop() {
      const mode   = modeRef.current;
      const cursor = cursorRef.current;

      // Smooth the cursor for drawing (lerp)
      const SMOOTH = mode === "erase" ? 0.6 : 0.35;
      smoothRef.current.x += (cursor.x - smoothRef.current.x) * SMOOTH;
      smoothRef.current.y += (cursor.y - smoothRef.current.y) * SMOOTH;

      const x = smoothRef.current.x * cv.width;
      const y = smoothRef.current.y * cv.height;

      if (mode === "draw" || mode === "strong") {
        if (prev) {
          fctx.globalCompositeOperation = "source-over";
          fctx.strokeStyle = mode === "strong" ? "#FFD700" : "#00e5ff";
          fctx.lineWidth   = mode === "strong" ? 7 : 3.5;
          fctx.lineCap = "round"; fctx.lineJoin = "round";
          fctx.beginPath(); fctx.moveTo(prev.x, prev.y); fctx.lineTo(x, y); fctx.stroke();
        }
        prev = { x, y };
      } else if (mode === "erase") {
        fctx.globalCompositeOperation = "destination-out";
        fctx.beginPath(); fctx.arc(x, y, 32, 0, Math.PI * 2); fctx.fill();
        fctx.globalCompositeOperation = "source-over";
        prev = null;
      } else {
        prev = null;
      }

      const g = ghostRef.current;
      if (g?.dragging) { g.x = cursor.x; g.y = cursor.y; }

      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.drawImage(fc, 0, 0);

      for (const s of shapesRef.current) {
        drawShape(ctx, s.shape, s.x * cv.width, s.y * cv.height,
          s.r * Math.min(cv.width, cv.height), false);
      }

      if (g) {
        drawShape(ctx, g.shape, g.x * cv.width, g.y * cv.height,
          g.r * Math.min(cv.width, cv.height), true);
        ctx.save();
        ctx.font = "12px 'Orbitron', monospace";
        ctx.fillStyle = g.dragging ? "rgba(167,139,250,0.8)" : "rgba(52,211,153,0.8)";
        ctx.textAlign = "center";
        ctx.fillText(
          g.dragging ? "pinch to lock" : "pinch to stamp  ·  2 hands to resize",
          g.x * cv.width,
          g.y * cv.height + g.r * Math.min(cv.width, cv.height) + 22
        );
        ctx.restore();
      }

      rafId = requestAnimationFrame(loop);
    }

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <canvas ref={canvasRef} style={{
      position: "absolute", top: 0, left: 0, zIndex: 5, pointerEvents: "none",
    }} />
  );
});

export default CanvasBoard;