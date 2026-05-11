import { renderShell } from "../components/shell.js";
import {
  buildPrimaryGreeting,
  fetchNYCWeather,
  formatNYCTimeClock,
  formatNYCWeekdayDate,
  getNYCCityLabel,
  getNYCHourNow,
  getWeatherUnavailableLabel,
} from "./nyc-hero-context.js";
import { getUiThemePreference, resolveUiTheme } from "./ui-theme.js";

import { agentLog } from "./agent-log.js";
export const WELCOME_SKIP_STORAGE_KEY = "tm-skip-welcome-screen";
const WEATHER_WAIT_MS = 1400;
const GREETING_DELAY_MS = 520;
const LINE_STAGGER_MS = 260;
const HOLD_AFTER_LINES_MS = 2600;
const OUTRO_MS = 420;

export function getWelcomeScreenSkipPreference() {
  return localStorage.getItem(WELCOME_SKIP_STORAGE_KEY) === "1";
}

export function setWelcomeScreenSkipPreference(skip) {
  if (skip) {
    localStorage.setItem(WELCOME_SKIP_STORAGE_KEY, "1");
    return;
  }
  localStorage.removeItem(WELCOME_SKIP_STORAGE_KEY);
}

function sleep(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function upper(text) {
  return String(text || "").toUpperCase();
}

async function resolveWeatherLine() {
  const weatherResult = await Promise.race([
    fetchNYCWeather(),
    sleep(WEATHER_WAIT_MS).then(() => null),
  ]);
  if (!weatherResult) {
    return {
      tempLine: "—",
      weatherLine: getWeatherUnavailableLabel(),
    };
  }
  const tempF = Math.round((weatherResult.tempC * 9) / 5 + 32);
  return {
    tempLine: `${tempF}°F`,
    weatherLine: weatherResult.hint || weatherResult.shortLabel || getWeatherUnavailableLabel(),
  };
}

function markVisible(el) {
  if (!el) return;
  el.hidden = false;
  el.classList.remove("is-visible");
  void el.offsetWidth;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.classList.add("is-visible");
    });
  });
}

async function revealLine(el, text, delayMs) {
  await sleep(delayMs);
  if (el && typeof text === "string") {
    el.textContent = text;
  }
  markVisible(el);
}

function renderWelcomeShell() {
  renderShell(
    `
    <section class="entry-welcome" aria-label="Welcome" role="status" aria-live="polite">
      <div class="entry-welcome__inner">
        <h1 class="entry-welcome__greeting entry-welcome__line" id="entry-welcome-greeting" hidden></h1>
        <div class="entry-welcome__meta">
          <p class="entry-welcome__line" id="entry-welcome-time" hidden></p>
          <p class="entry-welcome__line" id="entry-welcome-date" hidden></p>
          <p class="entry-welcome__line" id="entry-welcome-temp" hidden></p>
          <p class="entry-welcome__line" id="entry-welcome-weather" hidden></p>
        </div>
        <p class="entry-welcome__tagline entry-welcome__line" id="entry-welcome-tagline" hidden>Exploring like a local</p>
      </div>
    </section>
  `,
    "home",
    { stripChrome: true, fullBleedMain: true },
  );
}

export async function playLoggedInEntryWelcome() {
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;

  renderWelcomeShell();

  const greetingEl = document.getElementById("entry-welcome-greeting");
  const timeEl = document.getElementById("entry-welcome-time");
  const dateEl = document.getElementById("entry-welcome-date");
  const tempEl = document.getElementById("entry-welcome-temp");
  const weatherEl = document.getElementById("entry-welcome-weather");
  const taglineEl = document.getElementById("entry-welcome-tagline");
  const rootEl = document.querySelector(".entry-welcome");
  const innerEl = document.querySelector(".entry-welcome__inner");
  requestAnimationFrame(() => {
    const rootRect = rootEl?.getBoundingClientRect();
    const innerRect = innerEl?.getBoundingClientRect();
    const greetingRect = greetingEl?.getBoundingClientRect();
    const timeRect = timeEl?.getBoundingClientRect();
    agentLog({
      runId: "welcome-classical-style-1",
      hypothesisId: "H58_welcome_neo_css_bleeds_into_classical",
      location: "public/js/lib/entry-welcome.js:playLoggedInEntryWelcome:requestAnimationFrame",
      message: "Welcome computed style snapshot after mount",
      data: {
                uiThemePref: getUiThemePreference(),
                uiTheme: resolveUiTheme(),
                datasetUiTheme: document.documentElement.dataset.uiTheme || null,
                rootBg: rootEl ? getComputedStyle(rootEl).backgroundColor : null,
                rootColor: rootEl ? getComputedStyle(rootEl).color : null,
                rootWidth: rootRect ? Math.round(rootRect.width * 100) / 100 : null,
                viewportWidth: window.innerWidth,
                rootLeftGap: rootRect ? Math.round(rootRect.left * 100) / 100 : null,
                rootRightGap: rootRect
                  ? Math.round((window.innerWidth - rootRect.right) * 100) / 100
                  : null,
                innerWidth: innerRect ? Math.round(innerRect.width * 100) / 100 : null,
                greetingFontFamily: greetingEl ? getComputedStyle(greetingEl).fontFamily : null,
                greetingColor: greetingEl ? getComputedStyle(greetingEl).color : null,
                greetingTop: greetingRect ? Math.round(greetingRect.top * 100) / 100 : null,
                greetingOpacity: greetingEl ? getComputedStyle(greetingEl).opacity : null,
                greetingAnimationName: greetingEl
                  ? getComputedStyle(greetingEl).animationName
                  : null,
                lineFontFamily: timeEl ? getComputedStyle(timeEl).fontFamily : null,
                lineFontStyle: timeEl ? getComputedStyle(timeEl).fontStyle : null,
                timeTop: timeRect ? Math.round(timeRect.top * 100) / 100 : null,
                timeHiddenAttr: Boolean(timeEl?.hidden),
                timeOpacity: timeEl ? getComputedStyle(timeEl).opacity : null,
                timeAnimationName: timeEl ? getComputedStyle(timeEl).animationName : null,
              },
    });
  });

  const greeting = upper(buildPrimaryGreeting(getNYCHourNow()));
  const city = getNYCCityLabel();
  const timeText = `${formatNYCTimeClock()} · ${city}`;
  const dateText = upper(formatNYCWeekdayDate());

  if (greetingEl) greetingEl.textContent = greeting;
  if (timeEl) timeEl.textContent = timeText;
  if (dateEl) dateEl.textContent = dateText;

  const weatherPromise = resolveWeatherLine();

  const greetingDelay = reduceMotion ? 40 : GREETING_DELAY_MS;
  const lineStagger = reduceMotion ? 40 : LINE_STAGGER_MS;
  await revealLine(greetingEl, null, greetingDelay);
  await revealLine(timeEl, timeText, lineStagger);
  await revealLine(dateEl, dateText, lineStagger);

  const weather = await weatherPromise;
  await revealLine(tempEl, weather.tempLine, lineStagger);
  await revealLine(weatherEl, weather.weatherLine, lineStagger);
  await revealLine(taglineEl, null, lineStagger);
  agentLog({
    runId: "welcome-classical-layout-2",
    hypothesisId: "H95_classical_welcome_lines_mark_visible_but_remain_visually_hidden",
    location: "public/js/lib/entry-welcome.js:playLoggedInEntryWelcome:afterAllReveal",
    message: "Welcome visibility snapshot after line reveals",
    data: {
              uiTheme: resolveUiTheme(),
              greetingHidden: Boolean(greetingEl?.hidden),
              timeHidden: Boolean(timeEl?.hidden),
              dateHidden: Boolean(dateEl?.hidden),
              tempHidden: Boolean(tempEl?.hidden),
              weatherHidden: Boolean(weatherEl?.hidden),
              taglineHidden: Boolean(taglineEl?.hidden),
              greetingOpacity: greetingEl ? getComputedStyle(greetingEl).opacity : null,
              timeOpacity: timeEl ? getComputedStyle(timeEl).opacity : null,
              dateOpacity: dateEl ? getComputedStyle(dateEl).opacity : null,
              tempOpacity: tempEl ? getComputedStyle(tempEl).opacity : null,
              weatherOpacity: weatherEl ? getComputedStyle(weatherEl).opacity : null,
              taglineOpacity: taglineEl ? getComputedStyle(taglineEl).opacity : null,
            },
  });
  await sleep(reduceMotion ? 140 : HOLD_AFTER_LINES_MS);
  agentLog({
    runId: "welcome-classical-style-1",
    hypothesisId: "H59_classical_welcome_uses_same_animation_chain_as_neo",
    location: "public/js/lib/entry-welcome.js:playLoggedInEntryWelcome:beforeOutro",
    message: "Welcome animation state before outro",
    data: {
              uiTheme: resolveUiTheme(),
              greetingVisible: Boolean(greetingEl?.classList.contains("is-visible")),
              timeVisible: Boolean(timeEl?.classList.contains("is-visible")),
              dateVisible: Boolean(dateEl?.classList.contains("is-visible")),
              tempVisible: Boolean(tempEl?.classList.contains("is-visible")),
              weatherVisible: Boolean(weatherEl?.classList.contains("is-visible")),
              taglineVisible: Boolean(taglineEl?.classList.contains("is-visible")),
            },
  });

  if (rootEl) {
    rootEl.classList.add("is-ending");
  }
  await sleep(reduceMotion ? 80 : OUTRO_MS);
}
