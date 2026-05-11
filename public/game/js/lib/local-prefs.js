/** Friends app — localStorage-backed profile, stats, settings, session. */

import {
  DEFAULT_SETTINGS,
  FRIEND_CODE_KEY,
  NAME_KEY,
  SESSION_KEY,
  SETTINGS_KEY,
  STATS_KEY,
} from "./constants.js";
import { generateFriendCode } from "./id-generators.js";

export function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

export function saveJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    /* ignore */
  }
}

export function loadStats() {
  return loadJson(STATS_KEY, { games: 0, wins: 0, captures: 0, hosted: 0 });
}

export function bumpStat(key, by = 1) {
  const stats = loadStats();
  stats[key] = (stats[key] || 0) + by;
  saveJson(STATS_KEY, stats);
}

export function loadSettings() {
  return { ...DEFAULT_SETTINGS, ...loadJson(SETTINGS_KEY, {}) };
}

export function saveSession(roomCode) {
  try {
    if (roomCode) localStorage.setItem(SESSION_KEY, roomCode);
    else localStorage.removeItem(SESSION_KEY);
  } catch (e) {
    /* ignore */
  }
}

export function loadSession() {
  try {
    return localStorage.getItem(SESSION_KEY) || null;
  } catch (e) {
    return null;
  }
}

export function getOrCreateFriendCode() {
  let code = localStorage.getItem(FRIEND_CODE_KEY);
  if (!code) {
    code = generateFriendCode();
    localStorage.setItem(FRIEND_CODE_KEY, code);
  }
  return code;
}

export function getDisplayName() {
  return (localStorage.getItem(NAME_KEY) || "").trim();
}

export function setDisplayName(name) {
  localStorage.setItem(NAME_KEY, String(name || "").trim().slice(0, 24));
}
