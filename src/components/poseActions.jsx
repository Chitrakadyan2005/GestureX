// ───────── STABLE ACTION (ANTI-FLICKER) ─────────
let actionBuffer = [];
let stableAction = "IDLE";

export function getStableAction(newAction) {
  actionBuffer.push(newAction);

  if (actionBuffer.length > 5) {
    actionBuffer.shift();
  }

  const allSame = actionBuffer.every(a => a === newAction);

  if (allSame) {
    stableAction = newAction;
  }

  return stableAction;
}


// ───────── JUMP MEMORY (FOR REAL JUMP DETECTION) ─────────
let prevHipY = null;


// ───────── MAIN POSE → ACTION FUNCTION ─────────
export function getActionFromPose(landmarks) {
  if (!landmarks || landmarks.length < 29) return "IDLE";

  const lw = landmarks[15]; // left wrist
  const rw = landmarks[16]; // right wrist
  const ls = landmarks[11]; // left shoulder
  const rs = landmarks[12]; // right shoulder
  const lh = landmarks[23]; // left hip
  const rh = landmarks[24]; // right hip
  const lk = landmarks[25]; // left knee
  const rk = landmarks[26]; // right knee

  const visible = (p) => p && (p.visibility === undefined || p.visibility > 0.6);

  // ───────── POWER: both hands up ─────────
  if (
    visible(lw) && visible(rw) &&
    visible(ls) && visible(rs) &&
    lw.y < ls.y - 0.03 &&
    rw.y < rs.y - 0.03
  ) {
    return "POWER";
  }

  // ───────── JUMP: detect upward motion ─────────
  if (visible(lh) && visible(rh)) {
    const currentHip = (lh.y + rh.y) / 2;

    if (prevHipY !== null && currentHip < prevHipY - 0.08) {
      prevHipY = currentHip;
      return "JUMP";
    }

    prevHipY = currentHip;
  }

  // ───────── KICK ─────────
  if (
    (visible(rk) && visible(rh) && rk.y < rh.y - 0.08) ||
    (visible(lk) && visible(lh) && lk.y < lh.y - 0.08)
  ) {
    return "KICK";
  }

  // ───────── PUNCH ─────────
  if (visible(rw) && visible(rs) && rw.y < rs.y - 0.03) {
    return "PUNCH";
  }

  // ───────── LEFT / RIGHT MOVEMENT ─────────
  if (visible(ls) && visible(rs)) {
    const center = (ls.x + rs.x) / 2;

    if (center < 0.42) return "LEFT";
    if (center > 0.58) return "RIGHT";
  }

  return "IDLE";
}


// ───────── FINAL HELPER (USE THIS IN YOUR APP) ─────────
export function getFinalAction(landmarks) {
  const raw = getActionFromPose(landmarks);
  return getStableAction(raw);
}