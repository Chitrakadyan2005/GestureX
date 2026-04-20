export function isPinch(lm) {
  return Math.hypot(lm[4].x - lm[8].x, lm[4].y - lm[8].y) < 0.08;
}

export function isTwoFingers(lm) {
  const noPinch = Math.hypot(lm[4].x - lm[8].x, lm[4].y - lm[8].y) > 0.08;
  return lm[8].y < lm[6].y && lm[12].y < lm[10].y &&
         lm[16].y > lm[14].y && lm[20].y > lm[18].y && noPinch;
}

export function isOneFingerPoint(lm) {
  const noPinch = Math.hypot(lm[4].x - lm[8].x, lm[4].y - lm[8].y) > 0.08;
  return lm[8].y < lm[6].y && lm[12].y > lm[10].y && noPinch;
}

export function isOpenPalm(lm) {
  return lm[8].y < lm[6].y && lm[12].y < lm[10].y &&
         lm[16].y < lm[14].y && lm[20].y < lm[18].y;
}

export function isFist(lm) {
  return lm[8].y > lm[6].y && lm[12].y > lm[10].y &&
         lm[16].y > lm[14].y && lm[20].y > lm[18].y;
}

export function detectGesture(lm) {
  if (isPinch(lm))           return "PINCH";
  if (isTwoFingers(lm))      return "TWO_FINGER";
  if (isOneFingerPoint(lm))  return "POINT";
  if (isOpenPalm(lm))        return "OPEN";
  if (isFist(lm))            return "FIST";
  return "UNKNOWN";
}