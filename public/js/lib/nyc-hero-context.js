/**
 * Home hero copy — NYC local time + weather via Open-Meteo (free, no API key).
 * https://open-meteo.com/en/docs (non-commercial / fair use)
 */

const NYC_TZ = "America/New_York";
/** Roughly Midtown — representative for “NYC” weather line */
const NYC_LAT = 40.758;
const NYC_LNG = -73.9855;

const OPEN_METEO =
  `https://api.open-meteo.com/v1/forecast?latitude=${NYC_LAT}&longitude=${NYC_LNG}` +
  `&current_weather=true&timezone=${encodeURIComponent(NYC_TZ)}`;

/**
 * Hour 0–23 in New York (works regardless of visitor’s device timezone).
 */
export function getNYCHourNow() {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: NYC_TZ,
    hour: "numeric",
    hour12: false,
  });
  const h = parseInt(fmt.format(new Date()), 10);
  return Number.isFinite(h) ? h : 12;
}

/**
 * Short time-of-day greeting from NYC clock (English only; no rotating poetry).
 */
export function buildPrimaryGreeting(hour) {
  if (hour >= 5 && hour < 12) return "Good morning!";
  if (hour >= 12 && hour < 17) return "Good afternoon!";
  if (hour >= 17 && hour < 22) return "Good evening!";
  return "Good night!";
}

function formatNYCTimeClock() {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: NYC_TZ,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date());
}

/** e.g. "Wednesday, April 13" in New York */
export function formatNYCWeekdayDate() {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: NYC_TZ,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

function celsiusToF(c) {
  return (c * 9) / 5 + 32;
}

/** Short condition label for the eyebrow (WMO code). */
export function weatherCodeToShortLabel(code) {
  const c = code;
  if (c === 0) return "Clear";
  if (c === 1) return "Mostly clear";
  if (c === 2) return "Partly cloudy";
  if (c === 3) return "Overcast";
  if (c >= 45 && c <= 48) return "Fog";
  if (c >= 51 && c <= 55) return "Drizzle";
  if (c >= 56 && c <= 57) return "Freezing drizzle";
  if (c >= 61 && c <= 64) return "Rain";
  if (c === 65 || c === 66 || c === 67) return "Heavy rain";
  if (c >= 71 && c <= 77) return "Snow";
  if (c >= 80 && c <= 82) return "Rain showers";
  if (c >= 85 && c <= 86) return "Snow showers";
  if (c >= 95 && c <= 99) return "Thunderstorm";
  return "Mixed conditions";
}

/**
 * Human hint from WMO weather code (+ optional °F for extremes).
 * @param {number} code
 * @param {number|null} tempC
 */
export function weatherCodeToHint(code, tempC) {
  const c = code;
  const tempF =
    typeof tempC === "number" && Number.isFinite(tempC)
      ? celsiusToF(tempC)
      : null;

  if (c === 0) {
    return "Clear skies over the city — great light for photos.";
  }
  if (c === 1 || c === 2) {
    return "Partly cloudy in NYC — soft light for a hunt.";
  }
  if (c === 3) {
    return "Gray skies today — screens and sidewalks both a little softer.";
  }
  if (c >= 45 && c <= 48) {
    return "Foggy out — stay aware near traffic and crossings.";
  }
  if (c >= 51 && c <= 57) {
    return "Light drizzle — keep your phone dry between shots.";
  }
  if (c >= 61 && c <= 67) {
    return "Rain in Manhattan — watch your footing on the hunt.";
  }
  if (c >= 71 && c <= 77) {
    return "Snow around NYC — dress warm and mind icy patches.";
  }
  if (c >= 80 && c <= 82) {
    return "Showers possible — duck under awnings between checkpoints.";
  }
  if (c >= 95) {
    return "Storms in the area — maybe save long outdoor runs for calmer weather.";
  }
  if (tempF != null && tempF >= 90) {
    return "Serious heat — hydrate between stops.";
  }
  if (tempF != null && tempF <= 28) {
    return "Freezing cold — layers help on longer hunts.";
  }
  return null;
}

export async function fetchNYCWeather() {
  const ctrl = new AbortController();
  const t = window.setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(OPEN_METEO, {
      signal: ctrl.signal,
      credentials: "omit",
    });
    if (!res.ok) return null;
    const data = await res.json();
    const cw = data?.current_weather;
    if (!cw || typeof cw.weathercode !== "number") return null;
    return {
      tempC: cw.temperature,
      weathercode: cw.weathercode,
      shortLabel: weatherCodeToShortLabel(cw.weathercode),
      hint: weatherCodeToHint(cw.weathercode, cw.temperature),
    };
  } catch {
    return null;
  } finally {
    window.clearTimeout(t);
  }
}

/**
 * Sets #hero-dynamic-title from NYC clock (sync — call right after paint).
 */
export function applyHomeHeroTitle() {
  const titleEl = document.getElementById("hero-dynamic-title");
  if (!titleEl) return;
  titleEl.textContent = buildPrimaryGreeting(getNYCHourNow());
}

/** Eyebrow: weekday + date (NYC, uppercase) until weather fills in via `hydrateHomeHeroContext`. */
export function applyHomeHeroEyebrowDateOnly() {
  const el = document.getElementById("hero-eyebrow");
  if (!el) return;
  el.textContent = formatNYCWeekdayDate().toUpperCase();
}

function triggerHeroContextEnter(ctxEl) {
  if (!ctxEl || ctxEl.hidden) return;
  if (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
  ) {
    return;
  }
  ctxEl.classList.remove("hero-context--enter");
  void ctxEl.offsetWidth;
  ctxEl.classList.add("hero-context--enter");
}

/** Shows time + short placeholder until Open-Meteo responds. */
export function applyHomeHeroContextPlaceholder() {
  const ctxEl = document.getElementById("hero-context");
  if (!ctxEl) return;
  ctxEl.textContent = `${formatNYCTimeClock()} · NYC — checking the sky…`;
  ctxEl.hidden = false;
  requestAnimationFrame(() => {
    triggerHeroContextEnter(ctxEl);
  });
}

/**
 * Fills `#hero-eyebrow` (DATE • °F • CONDITION) and `#hero-context` after one Open-Meteo fetch.
 */
export async function hydrateHomeHeroContext() {
  const brow = document.getElementById("hero-eyebrow");
  const ctxEl = document.getElementById("hero-context");
  const hour = getNYCHourNow();
  const wx = await fetchNYCWeather();

  const dateCaps = formatNYCWeekdayDate().toUpperCase();
  if (brow) {
    if (wx && typeof wx.tempC === "number") {
      const f = Math.round(celsiusToF(wx.tempC));
      brow.textContent = `${dateCaps} • ${f}°F • ${wx.shortLabel.toUpperCase()}`;
    } else {
      brow.textContent = `${dateCaps} • WEATHER UNAVAILABLE`;
    }
  }

  if (!ctxEl) return;

  const timeBit = formatNYCTimeClock();
  let line = `${timeBit} · NYC`;

  if (wx?.hint) {
    line += ` — ${wx.hint}`;
  } else {
    line +=
      hour >= 23 || hour < 5
        ? " — Take breaks; the clock on a hunt is ruthless enough."
        : " — Browse open hunts below when you’re ready.";
  }

  ctxEl.textContent = line;
  ctxEl.hidden = false;
  requestAnimationFrame(() => {
    triggerHeroContextEnter(ctxEl);
  });
}
