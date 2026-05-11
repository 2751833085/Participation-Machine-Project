/** Friends app — server clock offset for synchronized countdowns. */

let serverOffsetMs = 0;

export function calibrateServerTime(serverMs) {
  if (!serverMs) return;
  const sample = serverMs - Date.now();
  if (serverOffsetMs === 0) serverOffsetMs = sample;
  else serverOffsetMs = Math.round(serverOffsetMs * 0.7 + sample * 0.3);
}

export function gameNow() {
  return Date.now() + serverOffsetMs;
}
