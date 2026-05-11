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

const HOME_LOCALIZED_COPY = {
  en: {
    morning: "Good morning!",
    afternoon: "Good afternoon!",
    evening: "Good evening!",
    night: "Good night!",
    cityLabel: "NYC",
    checkingSky: "checking the sky…",
    weatherUnavailable: "WEATHER UNAVAILABLE",
    fallbackNight: "Take breaks; the clock on a hunt is ruthless enough.",
    fallbackDay: "Browse open hunts below when you’re ready.",
    shortLabel: {
      clear: "Clear",
      mostlyClear: "Mostly clear",
      partlyCloudy: "Partly cloudy",
      overcast: "Overcast",
      fog: "Fog",
      drizzle: "Drizzle",
      freezingDrizzle: "Freezing drizzle",
      rain: "Rain",
      heavyRain: "Heavy rain",
      snow: "Snow",
      rainShowers: "Rain showers",
      snowShowers: "Snow showers",
      thunderstorm: "Thunderstorm",
      mixed: "Mixed conditions",
    },
    hints: {
      clear: "Clear skies over the city — great light for photos.",
      partlyCloudy: "Partly cloudy in NYC — soft light for a hunt.",
      overcast: "Gray skies today — screens and sidewalks both a little softer.",
      fog: "Foggy out — stay aware near traffic and crossings.",
      drizzle: "Light drizzle — keep your phone dry between shots.",
      rain: "Rain in Manhattan — watch your footing on the hunt.",
      snow: "Snow around NYC — dress warm and mind icy patches.",
      showers: "Showers possible — duck under awnings between checkpoints.",
      storm: "Storms in the area — maybe save long outdoor runs for calmer weather.",
      heat: "Serious heat — hydrate between stops.",
      freeze: "Freezing cold — layers help on longer hunts.",
    },
  },
  "zh-Hans": {
    morning: "早上好！",
    afternoon: "下午好！",
    evening: "晚上好！",
    night: "晚上好！",
    cityLabel: "纽约市",
    checkingSky: "正在查看天空情况…",
    weatherUnavailable: "天气不可用",
    fallbackNight: "注意休息，计时挑战本来就够紧张了。",
    fallbackDay: "准备好后可在下方浏览公开寻宝。",
    shortLabel: {
      clear: "晴朗",
      mostlyClear: "大体晴朗",
      partlyCloudy: "局部多云",
      overcast: "阴天",
      fog: "有雾",
      drizzle: "毛毛雨",
      freezingDrizzle: "冻毛毛雨",
      rain: "降雨",
      heavyRain: "大雨",
      snow: "降雪",
      rainShowers: "阵雨",
      snowShowers: "阵雪",
      thunderstorm: "雷暴",
      mixed: "多变天气",
    },
    hints: {
      clear: "城市上空晴朗无云 — 光线很适合拍照。",
      partlyCloudy: "纽约局部多云 — 光线柔和，适合寻宝。",
      overcast: "今天偏阴，屏幕和街景的反差会更柔和。",
      fog: "有雾天气，过路口时请注意周边车辆。",
      drizzle: "小雨天气，拍照间隙注意防水。",
      rain: "曼哈顿有雨，寻宝时注意脚下湿滑。",
      snow: "纽约有雪，请注意保暖并留意结冰路面。",
      showers: "可能有阵雨，站点之间可临时避雨。",
      storm: "附近有雷暴，建议把长时间户外路线留到天气稳定时。",
      heat: "天气较热，站点之间记得补水。",
      freeze: "天气寒冷，长线路建议多穿一层。",
    },
  },
  "zh-Hant": {
    morning: "早安！",
    afternoon: "午安！",
    evening: "晚安！",
    night: "晚安！",
    cityLabel: "紐約市",
    checkingSky: "正在查看天空狀況…",
    weatherUnavailable: "天氣不可用",
    fallbackNight: "記得休息，計時挑戰本來就很緊湊。",
    fallbackDay: "準備好後可在下方瀏覽公開尋寶。",
    shortLabel: {
      clear: "晴朗",
      mostlyClear: "大致晴朗",
      partlyCloudy: "局部多雲",
      overcast: "陰天",
      fog: "有霧",
      drizzle: "毛毛雨",
      freezingDrizzle: "凍毛毛雨",
      rain: "降雨",
      heavyRain: "大雨",
      snow: "降雪",
      rainShowers: "陣雨",
      snowShowers: "陣雪",
      thunderstorm: "雷暴",
      mixed: "多變天氣",
    },
    hints: {
      clear: "城市上空晴朗無雲 — 光線很適合拍照。",
      partlyCloudy: "紐約局部多雲 — 光線柔和，適合尋寶。",
      overcast: "今天偏陰，螢幕與街景對比會更柔和。",
      fog: "有霧天氣，過路口時請留意車流。",
      drizzle: "小雨天氣，拍照間隔請注意防水。",
      rain: "曼哈頓有雨，尋寶時留意地面濕滑。",
      snow: "紐約有雪，請注意保暖並留意結冰路面。",
      showers: "可能有陣雨，站點之間可暫時避雨。",
      storm: "附近有雷暴，建議把長時間戶外路線留到天氣穩定時。",
      heat: "天氣偏熱，站點之間記得補水。",
      freeze: "天氣偏冷，長路線建議多加一層。",
    },
  },
};

function getHeroLocale() {
  return "en";
}

function getCopy() {
  return HOME_LOCALIZED_COPY.en;
}

/**
 * Hour 0–23 in New York (works regardless of visitor’s device timezone).
 */
export function getNYCHourNow() {
  const fmt = new Intl.DateTimeFormat(getHeroLocale(), {
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
  const copy = getCopy();
  if (hour >= 5 && hour < 12) return copy.morning;
  if (hour >= 12 && hour < 17) return copy.afternoon;
  if (hour >= 17 && hour < 22) return copy.evening;
  return copy.night;
}

function formatNYCTimeClock() {
  return new Intl.DateTimeFormat(getHeroLocale(), {
    timeZone: NYC_TZ,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date());
}

/** e.g. "Wednesday, April 13" in New York */
export function formatNYCWeekdayDate() {
  return new Intl.DateTimeFormat(getHeroLocale(), {
    timeZone: NYC_TZ,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

function celsiusToF(c) {
  return (c * 9) / 5 + 32;
}

const WEATHER_SHORT_EXACT = new Map([
  [0, "clear"],
  [1, "mostlyClear"],
  [2, "partlyCloudy"],
  [3, "overcast"],
  [65, "heavyRain"],
  [66, "heavyRain"],
  [67, "heavyRain"],
]);

const WEATHER_SHORT_RANGES = [
  [45, 48, "fog"],
  [51, 55, "drizzle"],
  [56, 57, "freezingDrizzle"],
  [61, 64, "rain"],
  [71, 77, "snow"],
  [80, 82, "rainShowers"],
  [85, 86, "snowShowers"],
  [95, 99, "thunderstorm"],
];

const WEATHER_HINT_EXACT = new Map([
  [0, "clear"],
  [1, "partlyCloudy"],
  [2, "partlyCloudy"],
  [3, "overcast"],
]);

const WEATHER_HINT_RANGES = [
  [45, 48, "fog"],
  [51, 57, "drizzle"],
  [61, 67, "rain"],
  [71, 77, "snow"],
  [80, 82, "showers"],
  [95, Infinity, "storm"],
];

function weatherRangeKey(code, exactMap, ranges, fallback = null) {
  if (exactMap.has(code)) return exactMap.get(code);
  const match = ranges.find(([min, max]) => code >= min && code <= max);
  return match?.[2] ?? fallback;
}

/** Short condition label for the eyebrow (WMO code). */
export function weatherCodeToShortLabel(code) {
  const short = getCopy().shortLabel;
  const key = weatherRangeKey(code, WEATHER_SHORT_EXACT, WEATHER_SHORT_RANGES, "mixed");
  return short[key];
}

/**
 * Human hint from WMO weather code (+ optional °F for extremes).
 * @param {number} code
 * @param {number|null} tempC
 */
export function weatherCodeToHint(code, tempC) {
  const hints = getCopy().hints;
  const tempF =
    typeof tempC === "number" && Number.isFinite(tempC)
      ? celsiusToF(tempC)
      : null;

  const key = weatherRangeKey(code, WEATHER_HINT_EXACT, WEATHER_HINT_RANGES);
  if (key) return hints[key];
  if (tempF != null && tempF >= 90) {
    return hints.heat;
  }
  if (tempF != null && tempF <= 28) {
    return hints.freeze;
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
  const date = formatNYCWeekdayDate();
  el.textContent = getHeroLocale().startsWith("en") ? date.toUpperCase() : date;
}

/** Shows time + short placeholder until Open-Meteo responds. */
export function applyHomeHeroContextPlaceholder() {
  const ctxEl = document.getElementById("hero-context");
  if (!ctxEl) return;
  const copy = getCopy();
  ctxEl.textContent = `${formatNYCTimeClock()} · ${copy.cityLabel} — ${copy.checkingSky}`;
  ctxEl.hidden = false;
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
  const copy = getCopy();
  const localizedDate = getHeroLocale().startsWith("en")
    ? dateCaps
    : formatNYCWeekdayDate();
  if (brow) {
    if (wx && typeof wx.tempC === "number") {
      const f = Math.round(celsiusToF(wx.tempC));
      const condition = getHeroLocale().startsWith("en")
        ? wx.shortLabel.toUpperCase()
        : wx.shortLabel;
      brow.textContent = `${localizedDate} • ${f}°F • ${condition}`;
    } else {
      brow.textContent = `${localizedDate} • ${copy.weatherUnavailable}`;
    }
  }

  if (!ctxEl) return;

  const timeBit = formatNYCTimeClock();
  let line = `${timeBit} · ${copy.cityLabel}`;

  if (wx?.hint) {
    line += ` — ${wx.hint}`;
  } else {
    line +=
      hour >= 23 || hour < 5
        ? ` — ${copy.fallbackNight}`
        : ` — ${copy.fallbackDay}`;
  }

  ctxEl.textContent = line;
  ctxEl.hidden = false;
  requestAnimationFrame(() => {
    triggerHeroContextEnter(ctxEl);
  });
}
