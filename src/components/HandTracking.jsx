import { useEffect, useRef } from "react";
import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

function isPinch(lm) {
  return Math.hypot(lm[4].x - lm[8].x, lm[4].y - lm[8].y) < 0.08;
}
function isTwoFingers(lm) {
  const noPinch = Math.hypot(lm[4].x - lm[8].x, lm[4].y - lm[8].y) > 0.08;
  return lm[8].y < lm[6].y && lm[12].y < lm[10].y &&
         lm[16].y > lm[14].y && lm[20].y > lm[18].y && noPinch;
}
function isOneFingerPoint(lm) {
  const noPinch = Math.hypot(lm[4].x - lm[8].x, lm[4].y - lm[8].y) > 0.08;
  return lm[8].y < lm[6].y && lm[12].y > lm[10].y && noPinch;
}
function isOpenPalm(lm) {
  return lm[8].y < lm[6].y && lm[12].y < lm[10].y &&
         lm[16].y < lm[14].y && lm[20].y < lm[18].y;
}
function isFist(lm) {
  return lm[8].y > lm[6].y && lm[12].y > lm[10].y &&
         lm[16].y > lm[14].y && lm[20].y > lm[18].y;
}
function isPeaceSign(lm) {
  // Index + middle up, ring + pinky down, no pinch
  const noPinch = Math.hypot(lm[4].x - lm[8].x, lm[4].y - lm[8].y) > 0.08;
  return lm[8].y < lm[6].y && lm[12].y < lm[10].y &&
         lm[16].y > lm[14].y && lm[20].y > lm[18].y &&
         lm[4].y > lm[3].y && noPinch;
}
function isThumbsUp(lm) {
  // Thumb up, all fingers curled
  const thumbUp = lm[4].y < lm[3].y && lm[4].y < lm[2].y;
  const fingersCurled = lm[8].y > lm[6].y && lm[12].y > lm[10].y &&
                        lm[16].y > lm[14].y && lm[20].y > lm[18].y;
  return thumbUp && fingersCurled;
}

function detectGesture(lm) {
  if (isPinch(lm))           return "PINCH";
  if (isPeaceSign(lm))       return "PEACE";
  if (isThumbsUp(lm))        return "THUMBS_UP";
  if (isTwoFingers(lm))      return "TWO_FINGER";
  if (isOneFingerPoint(lm))  return "POINT";
  if (isOpenPalm(lm))        return "OPEN";
  if (isFist(lm))            return "FIST";
  return "UNKNOWN";
}

export default function HandTracking({ videoRef, onGesture }) {
  const cbRef = useRef(onGesture);
  useEffect(() => { cbRef.current = onGesture; }, [onGesture]);

  useEffect(() => {
    let hl, rafId;
    let alive = true;
    let buf = [], curGesture = null, wasPinch = false;
    let lastMoveT = 0;
    const posHist = [];
    let hadHand = false;

    const emit = (e) => cbRef.current?.(e);

    async function init() {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
      );
      hl = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numHands: 2,
      });
      loop();
    }

    function loop() {
      if (!alive) return;
      const video = videoRef.current;
      if (!video || video.readyState < 2) { rafId = requestAnimationFrame(loop); return; }

      const now = performance.now();
      const res = hl.detectForVideo(video, now);

      if (res.landmarks.length === 0) {
        if (hadHand) {
          hadHand = false; buf = []; curGesture = null; wasPinch = false; posHist.length = 0;
          emit({ type: "NO_HAND" });
        }
        rafId = requestAnimationFrame(loop); return;
      }

      hadHand = true;

      if (res.landmarks.length === 2) {
        const a = res.landmarks[0][8], b = res.landmarks[1][8];
        emit({ type: "TWO_HAND", dist: Math.hypot(a.x - b.x, a.y - b.y) });
        rafId = requestAnimationFrame(loop); return;
      }

      const lm = res.landmarks[0];
      const cx = 1 - lm[8].x, cy = lm[8].y;

      if (now - lastMoveT > 16) {
        lastMoveT = now;
        emit({ type: "MOVE", x: cx, y: cy });
        posHist.push({ x: cx, t: now });
        if (posHist.length > 20) posHist.shift();
      }

      const g = detectGesture(lm);
      buf.push(g); if (buf.length > 3) buf.shift();
      if (buf.every(v => v === g) && g !== curGesture) {
        curGesture = g;
        emit({ type: "GESTURE", value: g });
      }

      const pinching = (g === "PINCH");
      if (pinching && !wasPinch) emit({ type: "PINCH_DOWN", x: cx, y: cy });
      if (!pinching && wasPinch)  emit({ type: "PINCH_UP",   x: cx, y: cy });
      wasPinch = pinching;

      if (g === "OPEN" && posHist.length >= 8) {
        const dx = posHist[posHist.length-1].x - posHist[0].x;
        const dt = posHist[posHist.length-1].t - posHist[0].t;
        if (dt < 500 && Math.abs(dx) > 0.25) {
          emit({ type: "SWIPE" });
          posHist.length = 0;
        }
      }

      rafId = requestAnimationFrame(loop);
    }

    init();
    return () => { alive = false; cancelAnimationFrame(rafId); hl?.close?.(); };
  }, []);

  return null;
}