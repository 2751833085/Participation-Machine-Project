// Neo theme pages for Tourgo
// Palette: cream bg #efeee8, orange #de542f, deep green #1d5c4d, 
// card blocks lavender/peach/mustard/mint. Fonts: Barlow Condensed + Avenir Next.

const NEO = {
  light: {
    // Desaturated Neo palette — still warm + color-blocked, but quieter
    bg: '#ece8df', bgAlt: '#f1ede4', surface: '#f7f3ea',
    accent: '#c76a4e', accentSoft: '#d99a82',
    deep: '#3c5b53', copy: '#b57258', text: '#2c3c37',
    muted: '#6a7570', border: 'rgba(44,60,55,0.16)',
    dock: '#e0d2b3', dockActive: '#c76a4e',
    cardLav: '#bdaec4', cardPeach: '#d9a892',
    cardMustard: '#c4b585', cardMint: '#a8b8ac',
    btn: '#c76a4e',
  },
  dark: {
    // Dark mode is now a deep mineral graphite, not black and not purple-heavy.
    // Surfaces step up gently; color blocks stay low-chroma with high-contrast
    // warm-cream foregrounds so dense UI remains readable.
    bg: '#242b2c', bgAlt: '#2d3536', surface: '#374042',
    accent: '#d88d6f', accentSoft: '#9f6a59',
    deep: '#e6dcc8', copy: '#dfb29e', text: '#f4efe4',
    muted: '#b2bdb8', border: 'rgba(244,239,228,0.15)',
    dock: '#343d3f', dockActive: '#d88d6f',
    // Card tints — muted lavender, clay, umber, and pine, all held near the
    // same value so the app feels designed rather than rainbowed.
    cardLav: '#4a4658', cardPeach: '#59453f',
    cardMustard: '#554c38', cardMint: '#3b4e48',
    cardLavFg: '#f2ecdf', cardPeachFg: '#f7e7da',
    cardMustardFg: '#f3eccf', cardMintFg: '#e4ece3',
    btn: '#d88d6f',
  },
};

// Helper: pick the right foreground for a card background in the current theme.
// Pass the light-mode fg you want; dark mode looks up the paired cardXxxFg.
function neoCardFg(C, lightFg, key) {
  if (!C.cardLavFg) return lightFg;
  return C[key] || lightFg;
}

const NEO_DISPLAY = '"Barlow Condensed", "DIN Condensed", "Arial Narrow", "Helvetica Neue Condensed", sans-serif';
const NEO_UI = '"Avenir Next", "Helvetica Neue", "Segoe UI", Arial, sans-serif';

// Pair light-mode card-foreground hex → dark-mode replacement.
// All dark-mode fg are bright warm cream for high contrast on dark cards.
const NFG_MAP = {
  '#3f2a56': '#f2ecdf', // on cardLav
  '#5a2615': '#f7e7da', // on cardPeach
  '#3e3310': '#f3eccf', // on cardMustard
  '#1d5c4d': '#e4ece3', // on cardMint
  '#2f5a4e': '#f7e7da', // on cardPeach (welcome hero)
};
function nFg(dark, light) { return dark ? (NFG_MAP[light] || light) : light; }

function NeoPhoto({ hue = 30, dark, label = '', style = {} }) {
  const b1 = `oklch(${dark ? 0.42 : 0.78} 0.025 ${hue})`;
  const b2 = `oklch(${dark ? 0.36 : 0.68} 0.035 ${hue + 25})`;
  return (
    <div style={{
      background: `linear-gradient(135deg, ${b1}, ${b2})`,
      backgroundImage: `repeating-linear-gradient(45deg, rgba(255,255,255,0.06) 0 5px, transparent 5px 10px), linear-gradient(135deg, ${b1}, ${b2})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: dark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.35)',
      fontFamily: 'ui-monospace, monospace', fontSize: 8, letterSpacing: '0.06em',
      textTransform: 'uppercase', textAlign: 'center', padding: 4,
      ...style,
    }}>{label}</div>
  );
}

// ── Neo Dock ─────────────────────────────────────────────
function NeoDock({ active = 'hunts', dark }) {
  const C = dark ? NEO.dark : NEO.light;
  const tabs = [
    { k: 'hunts', label: 'Hunts', d: 'M3 10l9-6 9 6v10a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2z' },
    { k: 'saved', label: 'Saved', d: 'M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z' },
    { k: 'create', plus: true },
    { k: 'rank', label: 'Rank', d: 'M6 21V8m6 13V3m6 18v-8' },
    { k: 'profile', label: 'Me', d: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z' },
  ];
  return (
    <div style={{
      position: 'absolute', bottom: 14, left: 14, right: 14,
      borderRadius: 32, background: C.dock,
      border: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(192,146,80,0.28)'}`,
      boxShadow: '0 7px 18px rgba(96,75,47,0.16), inset 0 2px 0 rgba(255,247,220,0.55)',
      padding: '8px 12px 10px',
      display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', alignItems: 'center',
    }}>
      {tabs.map(t => t.plus ? (
        <div key={t.k} style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: C.accent, marginTop: -18,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 6px 16px rgba(222,84,47,0.4), inset 0 2px 0 rgba(255,255,255,0.3)',
            border: `3px solid ${C.dock}`,
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
          </div>
        </div>
      ) : (
        <div key={t.k} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
          padding: '4px 2px', borderRadius: 14,
          background: active === t.k ? C.dockActive : 'transparent',
          color: active === t.k ? '#fef5df' : (dark ? C.muted : '#de6f49'),
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill={active === t.k ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d={t.d}/></svg>
          {active === t.k && (
            <span style={{ fontFamily: NEO_UI, fontSize: 8.5, fontWeight: 800, letterSpacing: '0.02em', color: '#fef5df' }}>
              {t.label}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// 1. NEO WELCOME
// ═════════════════════════════════════════════════════════
function NeoWelcome({ dark }) {
  const C = dark ? NEO.dark : NEO.light;
  return (
    <div style={{
      width: '100%', height: '100%', background: C.bg,
      fontFamily: NEO_UI, color: C.text, position: 'relative',
      overflow: 'hidden', display: 'flex', flexDirection: 'column',
    }}>
      {/* Top brand strip */}
      <div style={{ padding: '60px 14px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontFamily: NEO_DISPLAY, fontWeight: 800, fontSize: 28, color: C.accent, letterSpacing: '-0.02em', lineHeight: 1 }}>
          TOURGO
        </div>
        <div style={{
          padding: '6px 12px', borderRadius: 999, background: C.deep,
          color: '#fef5df', fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase',
        }}>NYC</div>
      </div>

      {/* Big slab headline */}
      <div style={{ padding: '26px 14px 8px' }}>
        <div style={{
          fontFamily: NEO_DISPLAY, fontWeight: 700, fontSize: 86,
          lineHeight: 0.86, letterSpacing: '-0.035em',
          color: C.deep, textTransform: 'uppercase',
        }}>
          Hunt.<br/>
          <span style={{ color: C.accent }}>Snap.</span><br/>
          Run.
        </div>
      </div>

      {/* Collage of color blocks */}
      <div style={{ padding: '12px 16px 0', display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 10, flex: 1 }}>
        <div style={{
          borderRadius: 20, background: C.cardPeach, padding: 12,
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 150,
          boxShadow: '0 3px 0 rgba(65,42,21,0.12)',
        }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', color: nFg(dark, '#2f5a4e') }}>CHECKPOINT 01</div>
          <div style={{ fontFamily: NEO_DISPLAY, fontWeight: 700, fontSize: 34, color: nFg(dark, '#2f5a4e'), lineHeight: 0.9, textTransform: 'uppercase' }}>
            Bronze<br/>Angel
          </div>
        </div>
        <div style={{
          borderRadius: 20, overflow: 'hidden', background: C.cardMustard, position: 'relative',
          boxShadow: '0 3px 0 rgba(65,42,21,0.12)',
        }}>
          <NeoPhoto dark={dark} hue={80} label="Park scene" style={{ position: 'absolute', inset: 0 }}/>
          <div style={{ position: 'absolute', top: 10, right: 10, background: '#fff', color: C.accent, padding: '3px 8px', borderRadius: 999, fontSize: 9, fontWeight: 800, letterSpacing: '0.1em' }}>30 MIN</div>
        </div>
        <div style={{
          borderRadius: 20, background: C.cardMint, padding: 12,
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          boxShadow: '0 3px 0 rgba(65,42,21,0.12)',
        }}>
          <div style={{ fontFamily: NEO_DISPLAY, fontWeight: 700, fontSize: 30, color: nFg(dark, '#1d5c4d'), lineHeight: 0.9, textTransform: 'uppercase' }}>
            5<br/>Spots
          </div>
          <div style={{ fontSize: 10, fontWeight: 800, color: nFg(dark, '#1d5c4d'), letterSpacing: '0.08em' }}>CENTRAL PARK</div>
        </div>
        <div style={{
          borderRadius: 20, background: C.cardLav, padding: 12,
          display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center',
          boxShadow: '0 3px 0 rgba(65,42,21,0.12)',
        }}>
          <div style={{ fontFamily: NEO_DISPLAY, fontWeight: 700, fontSize: 44, color: nFg(dark, '#3f2a56'), lineHeight: 0.9 }}>+50</div>
          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: nFg(dark, '#3f2a56'), marginTop: 4 }}>MERITS</div>
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: '18px 14px 28px' }}>
        <button style={{
          width: '100%', height: 56, borderRadius: 999, border: 'none',
          background: C.accent, color: '#fff',
          fontFamily: NEO_DISPLAY, fontWeight: 800, fontSize: 22,
          letterSpacing: '0.03em', textTransform: 'uppercase',
          boxShadow: '0 6px 0 rgba(146,50,19,0.35), 0 10px 24px rgba(222,84,47,0.3)',
        }}>Let's Go →</button>
        <div style={{ textAlign: 'center', marginTop: 14, fontSize: 12, color: C.muted, fontWeight: 500 }}>
          Have an account? <span style={{ color: C.accent, fontWeight: 700, textDecoration: 'underline' }}>Sign in</span>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// 2. NEO LOGIN
// ═════════════════════════════════════════════════════════
function NeoLogin({ dark }) {
  const C = dark ? NEO.dark : NEO.light;
  return (
    <div style={{
      width: '100%', height: '100%', background: C.bg,
      fontFamily: NEO_UI, color: C.text, position: 'relative',
      overflow: 'hidden', padding: '60px 14px 24px',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Back */}
      <button style={{
        width: 44, height: 44, aspectRatio: '1 / 1', borderRadius: '50%',
        background: C.surface, border: `1px solid ${C.border}`,
        color: C.deep, display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 22, padding: 0, flexShrink: 0,
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="m15 18-6-6 6-6"/></svg>
      </button>

      {/* Slab title */}
      <div style={{
        fontFamily: NEO_DISPLAY, fontWeight: 700, fontSize: 68,
        lineHeight: 0.85, letterSpacing: '-0.03em',
        color: C.deep, textTransform: 'uppercase',
      }}>
        Hey,<br/>
        <span style={{ color: C.accent }}>welcome<br/>back.</span>
      </div>
      <p style={{ margin: '14px 0 26px', fontSize: 13, color: C.muted, fontWeight: 500 }}>
        Pick up where you left off.
      </p>

      {/* Fields */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontFamily: NEO_DISPLAY, fontWeight: 700, fontSize: 14, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.deep, marginBottom: 6 }}>
          Email
        </div>
        <div style={{
          height: 52, padding: '0 18px', borderRadius: 999,
          background: C.surface, border: `1.5px solid ${C.border}`,
          display: 'flex', alignItems: 'center', fontSize: 15, color: C.text,
        }}>you@manhattan.nyc</div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: NEO_DISPLAY, fontWeight: 700, fontSize: 14, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.deep, marginBottom: 6 }}>
          Password
        </div>
        <div style={{
          height: 52, padding: '0 18px', borderRadius: 999,
          background: C.surface, border: `2px solid ${C.accent}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: 15, color: C.text, letterSpacing: '0.18em',
        }}>
          <span>••••••••</span>
          <span style={{ color: C.accent, fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Show</span>
        </div>
      </div>

      <div style={{ textAlign: 'right', fontSize: 11, fontWeight: 700, color: C.accent, marginBottom: 22, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        Forgot password
      </div>

      <button style={{
        height: 56, borderRadius: 999, border: 'none',
        background: C.accent, color: '#fff',
        fontFamily: NEO_DISPLAY, fontWeight: 800, fontSize: 20,
        letterSpacing: '0.04em', textTransform: 'uppercase',
        boxShadow: '0 6px 0 rgba(146,50,19,0.35)',
      }}>Sign in</button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0' }}>
        <div style={{ flex: 1, height: 1, background: C.border }}/>
        <div style={{ fontFamily: NEO_DISPLAY, fontSize: 12, fontWeight: 700, letterSpacing: '0.18em', color: C.muted }}>OR</div>
        <div style={{ flex: 1, height: 1, background: C.border }}/>
      </div>

      <button style={{
        height: 52, borderRadius: 999,
        background: C.surface, border: `1.5px solid ${C.border}`,
        color: C.text, fontFamily: NEO_UI, fontSize: 14, fontWeight: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24"><path d="M22.5 12.3c0-.8-.1-1.5-.2-2.2H12v4.2h5.9c-.3 1.4-1 2.5-2.2 3.3v2.8h3.6c2.1-1.9 3.2-4.8 3.2-8.1z" fill="#4285F4"/><path d="M12 23c2.9 0 5.4-1 7.2-2.6l-3.6-2.8c-1 .7-2.3 1.1-3.7 1.1-2.8 0-5.2-1.9-6-4.4H2.3v2.9C4.1 20.8 7.8 23 12 23z" fill="#34A853"/><path d="M6 14.3c-.2-.7-.4-1.4-.4-2.3s.1-1.6.4-2.3V6.8H2.3C1.5 8.4 1 10.2 1 12s.5 3.6 1.3 5.2L6 14.3z" fill="#FBBC05"/><path d="M12 5.3c1.6 0 3 .5 4.1 1.6l3.1-3.1C17.4 2 14.9 1 12 1 7.8 1 4.1 3.2 2.3 6.8L6 9.7c.8-2.5 3.2-4.4 6-4.4z" fill="#EA4335"/></svg>
        Continue with Google
      </button>

      <div style={{ flex: 1 }}/>
      <div style={{ textAlign: 'center', fontSize: 12, color: C.muted, fontWeight: 500 }}>
        New hunter? <span style={{ color: C.accent, fontWeight: 800, textDecoration: 'underline' }}>Create account</span>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// 3. NEO HOME (grid of punchy cards)
// ═════════════════════════════════════════════════════════
function NeoHome({ dark }) {
  const C = dark ? NEO.dark : NEO.light;
  const cards = [
    { title: 'Central Park Circuit', area: 'NYC', meta: '5 Checkpoints — 30mins', bg: C.cardLav, fg: nFg(dark, '#3f2a56'), hue: 280, fav: true },
    { title: 'SoHo Gallery Sprint', area: 'SoHo', meta: '4 Checkpoints — 20mins', bg: C.cardPeach, fg: nFg(dark, '#5a2615'), hue: 30 },
    { title: 'Brooklyn Bridge', area: 'DUMBO', meta: '6 Checkpoints — 45mins', bg: C.cardMustard, fg: nFg(dark, '#3e3310'), hue: 80 },
    { title: 'Chinatown Bites', area: 'Chinatown', meta: '3 Checkpoints — 15mins', bg: C.cardMint, fg: nFg(dark, '#1d5c4d'), hue: 140, fav: true },
  ];
  return (
    <div style={{
      width: '100%', height: '100%', background: C.bg,
      fontFamily: NEO_UI, color: C.text, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ height: '100%', overflowY: 'auto', paddingTop: 50, paddingBottom: 110 }}>
        {/* Top bar */}
        <div style={{ padding: '6px 14px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button style={{
            width: 44, height: 44, aspectRatio: '1 / 1', borderRadius: '50%',
            background: C.surface, border: `1px solid ${C.border}`, color: C.deep,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 0, flexShrink: 0,
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.2c-4.1 0-7.4 3.2-7.4 7.2 0 5.1 5.6 10.8 7 12.1.2.2.6.2.8 0 1.4-1.3 7-7 7-12.1 0-4-3.3-7.2-7.4-7.2zm0 10.2c-1.8 0-3.2-1.4-3.2-3.2S10.2 6 12 6s3.2 1.4 3.2 3.2-1.4 3.2-3.2 3.2z"/></svg>
          </button>
          <button style={{
            width: 44, height: 44, aspectRatio: '1 / 1', borderRadius: '50%',
            background: C.surface, border: `1px solid ${C.border}`, color: C.deep,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 0, flexShrink: 0,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h8v5H4zM12 13h8v5h-8z"/><path d="M14.5 6.5h5M17 4v5"/></svg>
          </button>
        </div>

        <h1 style={{
          fontFamily: NEO_DISPLAY, fontWeight: 700, fontSize: 46,
          lineHeight: 0.9, letterSpacing: '-0.025em',
          color: C.deep, textTransform: 'uppercase',
          margin: '14px 14px 18px',
        }}>
          Hunts<br/>
          <span style={{ color: C.accent }}>For You.</span>
        </h1>

        {/* Grid */}
        <div style={{ padding: '0 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {cards.map((c, i) => (
            <div key={i} style={{
              background: c.bg, borderRadius: 20, padding: 10,
              boxShadow: '0 3px 0 rgba(65,42,21,0.14)', position: 'relative',
              display: 'flex', flexDirection: 'column', gap: 6,
            }}>
              <div style={{
                position: 'absolute', top: 14, right: 14,
                fontSize: 18, color: c.fg, lineHeight: 1,
              }}>{c.fav ? '♥' : '♡'}</div>
              <div style={{
                aspectRatio: '1/1', borderRadius: 14, overflow: 'hidden',
                background: 'rgba(255,255,255,0.4)',
              }}>
                <NeoPhoto dark={dark} hue={c.hue} label={c.area} style={{ width: '100%', height: '100%' }}/>
              </div>
              <div style={{ fontSize: 9, fontWeight: 700, color: c.fg, fontStyle: 'italic', marginTop: 4 }}>
                {c.meta}
              </div>
              <div style={{
                fontFamily: NEO_DISPLAY, fontWeight: 700, fontSize: 24,
                lineHeight: 0.9, color: c.fg, textTransform: 'uppercase',
                letterSpacing: '-0.01em',
              }}>{c.title}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, fontWeight: 700, color: c.fg, marginTop: 2 }}>
                <span>{c.area}</span>
                <span>⚠︎</span>
              </div>
            </div>
          ))}
        </div>

        {/* Quick guide */}
        <div style={{
          margin: '14px 14px 0', padding: '14px 16px',
          borderRadius: 20, background: dark ? 'rgba(239,217,161,0.12)' : 'rgba(255,248,224,0.82)',
          color: dark ? C.deep : '#335248',
        }}>
          <div style={{ fontFamily: NEO_DISPLAY, fontWeight: 700, fontSize: 20, textTransform: 'uppercase', letterSpacing: '-0.01em', marginBottom: 6 }}>
            Quick guide
          </div>
          <div style={{ fontSize: 12, lineHeight: 1.5, fontWeight: 500 }}>
            Tap any card to open, review checkpoints, and start your run. Scroll for the full catalog.
          </div>
        </div>
      </div>
      <NeoDock active="hunts" dark={dark} />
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// 4. NEO CHALLENGE DETAIL
// ═════════════════════════════════════════════════════════
function NeoChallenge({ dark }) {
  const C = dark ? NEO.dark : NEO.light;
  const spots = [
    { i: 1, name: 'Bethesda Fountain', hue: 30 },
    { i: 2, name: 'Conservatory Pond', hue: 200 },
    { i: 3, name: 'Belvedere Castle', hue: 80 },
    { i: 4, name: 'Alice Statue', hue: 300 },
    { i: 5, name: 'Bow Bridge', hue: 140 },
  ];
  return (
    <div style={{
      width: '100%', height: '100%', background: C.bg,
      fontFamily: NEO_UI, color: C.text, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ height: '100%', overflowY: 'auto', paddingBottom: 120 }}>
        {/* Hero card */}
        <div style={{ padding: '60px 14px 0' }}>
          <div style={{
            borderRadius: 26, background: C.cardLav, padding: 18,
            position: 'relative', boxShadow: '0 4px 0 rgba(65,42,21,0.14)',
            minHeight: 240, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            overflow: 'hidden',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button style={{
                width: 40, height: 40, borderRadius: '50%',
                background: '#fff', border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: nFg(dark, '#3f2a56'),
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="m15 18-6-6 6-6"/></svg>
              </button>
              <div style={{
                padding: '6px 12px', borderRadius: 999, background: '#3f2a56',
                color: '#fff', fontSize: 10, fontWeight: 800, letterSpacing: '0.1em',
              }}>5 STOPS · 30 MIN</div>
            </div>
            <div>
              <div style={{ fontFamily: NEO_UI, fontSize: 11, fontStyle: 'italic', color: nFg(dark, '#3f2a56'), fontWeight: 700 }}>
                Central Park · Scenic Loop
              </div>
              <div style={{
                fontFamily: NEO_DISPLAY, fontWeight: 700, fontSize: 54,
                lineHeight: 0.82, letterSpacing: '-0.03em',
                color: nFg(dark, '#3f2a56'), textTransform: 'uppercase', marginTop: 6,
              }}>
                Central<br/>Park<br/>Circuit
              </div>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ padding: '14px 14px 0', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {[
            ['30', 'min', C.cardPeach, nFg(dark, '#5a2615')],
            ['5', 'stops', C.cardMint, nFg(dark, '#1d5c4d')],
            ['+50', 'merits', C.cardMustard, nFg(dark, '#3e3310')],
          ].map(([v, l, bg, fg]) => (
            <div key={l} style={{
              background: bg, borderRadius: 16, padding: '12px 10px',
              textAlign: 'center', boxShadow: '0 2px 0 rgba(65,42,21,0.12)',
            }}>
              <div style={{ fontFamily: NEO_DISPLAY, fontWeight: 700, fontSize: 30, color: fg, lineHeight: 1 }}>{v}</div>
              <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: fg, marginTop: 3 }}>{l}</div>
            </div>
          ))}
        </div>

        {/* Copy */}
        <div style={{ padding: '18px 14px 0' }}>
          <div style={{
            fontFamily: NEO_DISPLAY, fontWeight: 700, fontSize: 22,
            color: C.deep, textTransform: 'uppercase', letterSpacing: '-0.01em',
            marginBottom: 8,
          }}>The Route</div>
          <p style={{ fontSize: 13, lineHeight: 1.55, color: C.muted, fontWeight: 500, margin: 0 }}>
            Scenic loop hitting Central Park's most iconic spots. Starts at Bethesda — finishes at Bow Bridge.
          </p>
        </div>

        {/* Checkpoint pills */}
        <div style={{ padding: '14px 14px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {spots.map(s => (
            <div key={s.i} style={{
              display: 'grid', gridTemplateColumns: '44px 52px 1fr auto', gap: 12,
              alignItems: 'center', padding: 10,
              borderRadius: 18, background: C.surface,
              border: `1px solid ${C.border}`,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: C.accent, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: NEO_DISPLAY, fontWeight: 800, fontSize: 20,
              }}>{s.i}</div>
              <div style={{ width: 52, height: 52, borderRadius: 12, overflow: 'hidden' }}>
                <NeoPhoto dark={dark} hue={s.hue} label="" style={{ width: '100%', height: '100%' }}/>
              </div>
              <div style={{
                fontFamily: NEO_DISPLAY, fontWeight: 700, fontSize: 20,
                color: C.deep, textTransform: 'uppercase', letterSpacing: '-0.01em',
                lineHeight: 1,
              }}>{s.name}</div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2.4" strokeLinecap="round"><path d="m9 18 6-6-6-6"/></svg>
            </div>
          ))}
        </div>
      </div>

      {/* Sticky CTA */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        padding: '14px 14px 28px',
        background: `linear-gradient(180deg, transparent 0%, ${C.bg} 30%)`,
      }}>
        <button style={{
          width: '100%', height: 58, borderRadius: 999, border: 'none',
          background: C.accent, color: '#fff',
          fontFamily: NEO_DISPLAY, fontWeight: 800, fontSize: 22,
          letterSpacing: '0.04em', textTransform: 'uppercase',
          boxShadow: '0 6px 0 rgba(146,50,19,0.35), 0 10px 24px rgba(222,84,47,0.3)',
        }}>Start Hunt →</button>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// 5. NEO RUN
// ═════════════════════════════════════════════════════════
function NeoRun({ dark }) {
  const C = dark ? NEO.dark : NEO.light;
  const spots = [
    { i: 1, name: 'Bronze Angel', done: true },
    { i: 2, name: 'Sailboats', done: true },
    { i: 3, name: 'Belvedere Castle', active: true },
    { i: 4, name: 'Alice Statue' },
    { i: 5, name: 'Bow Bridge' },
  ];
  return (
    <div style={{
      width: '100%', height: '100%', background: C.bg,
      fontFamily: NEO_UI, color: C.text, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ height: '100%', overflowY: 'auto', paddingBottom: 140 }}>
        {/* Timer block — always ink-dark so the big numerals hit hard in both modes */}
        <div style={{
          margin: '48px 14px 0', borderRadius: 26,
          background: dark ? '#1a141d' : '#2a1e35', color: '#fef5df', padding: '18px 20px',
          boxShadow: dark ? '0 4px 0 rgba(0,0,0,0.4)' : '0 4px 0 rgba(0,0,0,0.25)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.accent, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.accent, boxShadow: `0 0 0 3px ${C.accent}33` }}/>
              Live · Checkpoint 3 of 5
            </div>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </div>
          </div>
          <div style={{
            fontFamily: NEO_DISPLAY, fontWeight: 700, fontSize: 96,
            lineHeight: 0.82, letterSpacing: '-0.035em',
            fontVariantNumeric: 'tabular-nums',
          }}>
            18:42
          </div>
          <div style={{ height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2, marginTop: 14, overflow: 'hidden' }}>
            <div style={{ width: '62%', height: '100%', background: C.accent }}/>
          </div>
        </div>

        {/* Current objective */}
        <div style={{ padding: '16px 14px 0' }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.accent, marginBottom: 4 }}>
            Next: Checkpoint 03
          </div>
          <div style={{
            fontFamily: NEO_DISPLAY, fontWeight: 700, fontSize: 40,
            lineHeight: 0.88, letterSpacing: '-0.02em', textTransform: 'uppercase',
            color: C.deep,
          }}>
            Capture<br/>Belvedere Castle<br/>from below.
          </div>
        </div>

        {/* Camera target */}
        <div style={{ padding: '16px 14px 0' }}>
          <div style={{
            aspectRatio: '4/3', borderRadius: 22,
            background: C.cardMustard, padding: 18,
            boxShadow: '0 3px 0 rgba(65,42,21,0.14)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%', background: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: C.accent,
            }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="4"/></svg>
            </div>
            <div style={{ fontFamily: NEO_DISPLAY, fontWeight: 700, fontSize: 26, textTransform: 'uppercase', color: nFg(dark, '#3e3310'), letterSpacing: '-0.01em' }}>
              Snap the photo
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: nFg(dark, '#3e3310'), opacity: 0.7 }}>
              or upload from library
            </div>
          </div>
        </div>

        {/* Trail chips */}
        <div style={{ padding: '16px 14px 0' }}>
          <div style={{ fontFamily: NEO_DISPLAY, fontWeight: 700, fontSize: 18, color: C.deep, textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: 8 }}>
            Trail
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {spots.map(s => (
              <div key={s.i} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 12px', borderRadius: 999,
                background: s.active ? C.accent : s.done ? C.deep : C.surface,
                color: s.active || s.done ? '#fef5df' : C.muted,
                border: s.active || s.done ? 'none' : `1px solid ${C.border}`,
                fontSize: 12, fontWeight: 700,
              }}>
                <span style={{
                  width: 18, height: 18, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.22)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: NEO_DISPLAY, fontWeight: 800, fontSize: 11,
                }}>{s.done ? '✓' : s.i}</span>
                {s.name}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Submit */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        padding: '14px 14px 28px',
        background: `linear-gradient(180deg, transparent 0%, ${C.bg} 30%)`,
      }}>
        <button style={{
          width: '100%', height: 56, borderRadius: 999, border: 'none',
          background: C.accent, color: '#fff',
          fontFamily: NEO_DISPLAY, fontWeight: 800, fontSize: 20,
          letterSpacing: '0.04em', textTransform: 'uppercase',
          boxShadow: '0 6px 0 rgba(146,50,19,0.35)',
        }}>Submit Photo</button>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// 6. NEO PROFILE
// ═════════════════════════════════════════════════════════
function NeoProfile({ dark }) {
  const C = dark ? NEO.dark : NEO.light;
  return (
    <div style={{
      width: '100%', height: '100%', background: C.bg,
      fontFamily: NEO_UI, color: C.text, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ height: '100%', overflowY: 'auto', paddingTop: 50, paddingBottom: 110 }}>
        {/* Header card */}
        <div style={{ padding: '10px 14px 0' }}>
          <div style={{
            borderRadius: 26, background: C.cardPeach, padding: 18,
            boxShadow: '0 4px 0 rgba(65,42,21,0.14)',
            display: 'flex', flexDirection: 'column', gap: 14,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', color: nFg(dark, '#5a2615') }}>MEMBER · 2024</div>
              <button style={{
                width: 36, height: 36, aspectRatio: '1 / 1', borderRadius: '50%',
                background: '#fff', border: 'none', color: nFg(dark, '#5a2615'),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 0, flexShrink: 0,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>
              </button>
            </div>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                border: '3px solid #fff', overflow: 'hidden',
              }}>
                <img src="assets/avatars/Male_1.webp" style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt=""/>
              </div>
              <div>
                <div style={{
                  fontFamily: NEO_DISPLAY, fontWeight: 700, fontSize: 32,
                  lineHeight: 0.92, color: nFg(dark, '#5a2615'), textTransform: 'uppercase', letterSpacing: '-0.02em',
                }}>Trailblazer<br/>_NYC</div>
              </div>
            </div>
          </div>
        </div>

        {/* Stat blocks */}
        <div style={{ padding: '14px 14px 0', display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 10 }}>
          <div style={{ background: C.cardMint, borderRadius: 18, padding: 14, boxShadow: '0 3px 0 rgba(65,42,21,0.12)' }}>
            <div style={{ fontFamily: NEO_DISPLAY, fontWeight: 700, fontSize: 40, color: nFg(dark, '#1d5c4d'), lineHeight: 0.95 }}>1,240</div>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: nFg(dark, '#1d5c4d'), marginTop: 3 }}>Merits</div>
          </div>
          <div style={{ background: C.cardMustard, borderRadius: 18, padding: 14, boxShadow: '0 3px 0 rgba(65,42,21,0.12)' }}>
            <div style={{ fontFamily: NEO_DISPLAY, fontWeight: 700, fontSize: 40, color: nFg(dark, '#3e3310'), lineHeight: 0.95 }}>8</div>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: nFg(dark, '#3e3310'), marginTop: 3 }}>Hunts</div>
          </div>
          <div style={{ background: C.cardLav, borderRadius: 18, padding: 14, boxShadow: '0 3px 0 rgba(65,42,21,0.12)' }}>
            <div style={{ fontFamily: NEO_DISPLAY, fontWeight: 700, fontSize: 40, color: nFg(dark, '#3f2a56'), lineHeight: 0.95 }}>3</div>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: nFg(dark, '#3f2a56'), marginTop: 3 }}>Badges</div>
          </div>
        </div>

        {/* Badges list */}
        <div style={{ padding: '18px 14px 0' }}>
          <div style={{ fontFamily: NEO_DISPLAY, fontWeight: 700, fontSize: 22, color: C.deep, textTransform: 'uppercase', letterSpacing: '-0.01em', marginBottom: 10 }}>Badges</div>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
            {[
              { l: 'Founder', c: '#ef8d6e', fg: '#fff' },
              { l: 'Central Park', c: '#c9b45a', fg: nFg(dark, '#3e3310') },
              { l: 'Speedrun', c: '#a8c1ad', fg: nFg(dark, '#1d5c4d') },
              { l: 'Night Hunt', c: '#c9add1', fg: nFg(dark, '#3f2a56') },
            ].map(b => (
              <div key={b.l} style={{
                flexShrink: 0, width: 96, padding: 10,
                background: b.c, color: b.fg, borderRadius: 16,
                boxShadow: '0 2px 0 rgba(65,42,21,0.14)',
              }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>★</div>
                <div style={{ fontFamily: NEO_DISPLAY, fontWeight: 700, fontSize: 14, textTransform: 'uppercase', letterSpacing: '-0.01em', lineHeight: 0.95 }}>
                  {b.l}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Settings */}
        <div style={{ padding: '18px 14px 0' }}>
          <div style={{ fontFamily: NEO_DISPLAY, fontWeight: 700, fontSize: 22, color: C.deep, textTransform: 'uppercase', letterSpacing: '-0.01em', marginBottom: 10 }}>Settings</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { l: 'Theme', v: 'Neo' },
              { l: 'Appearance', v: dark ? 'Dark' : 'Light' },
              { l: 'Notifications', v: 'On' },
              { l: 'Privacy', v: '' },
              { l: 'Sign out', danger: true, v: '' },
            ].map(r => (
              <div key={r.l} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '14px 16px', borderRadius: 16,
                background: C.surface, border: `1px solid ${C.border}`,
                color: r.danger ? C.accent : C.text,
              }}>
                <span style={{ fontFamily: NEO_DISPLAY, fontWeight: 700, fontSize: 17, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>{r.l}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: C.muted, fontWeight: 600 }}>
                  {r.v && <span>{r.v}</span>}
                  {!r.danger && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="m9 18 6-6-6-6"/></svg>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <NeoDock active="profile" dark={dark} />
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// 7. NEO LEADERBOARD
// ═════════════════════════════════════════════════════════
function NeoLeaderboard({ dark }) {
  const C = dark ? NEO.dark : NEO.light;
  const rows = [
    { rank: 1, name: 'trailblazer_nyc', merits: 1240, avatar: 'Male_1' },
    { rank: 2, name: 'photo_hunter', merits: 980, avatar: 'Female_1' },
    { rank: 3, name: 'citywalker', merits: 875, avatar: 'Boy' },
    { rank: 4, name: 'manhattan_explorer', merits: 720, avatar: 'Cat' },
    { rank: 5, name: 'streetwise', merits: 615, avatar: 'Female_2' },
    { rank: 6, name: 'bridgewalker', merits: 510, avatar: 'Girl' },
  ];
  const podiumBg = [C.cardMustard, C.cardPeach, C.cardMint];
  const podiumFg = [nFg(dark, '#3e3310'), nFg(dark, '#5a2615'), nFg(dark, '#1d5c4d')];
  return (
    <div style={{
      width: '100%', height: '100%', background: C.bg,
      fontFamily: NEO_UI, color: C.text, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ height: '100%', overflowY: 'auto', paddingTop: 50, paddingBottom: 110 }}>
        <div style={{ padding: '10px 14px 0' }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.accent, marginBottom: 4 }}>Weekly · April</div>
          <h1 style={{
            fontFamily: NEO_DISPLAY, fontWeight: 700, fontSize: 52,
            lineHeight: 0.86, letterSpacing: '-0.03em',
            color: C.deep, textTransform: 'uppercase', margin: 0,
          }}>
            The<br/><span style={{ color: C.accent }}>Hunters.</span>
          </h1>
        </div>

        {/* Tab pills */}
        <div style={{ padding: '14px 14px 0' }}>
          <div style={{
            display: 'inline-flex', gap: 4, padding: 4, borderRadius: 999,
            background: C.surface, border: `1px solid ${C.border}`,
          }}>
            {['Weekly', 'Monthly', 'All-time'].map((t, i) => (
              <div key={t} style={{
                padding: '8px 16px', borderRadius: 999,
                background: i === 0 ? C.accent : 'transparent',
                color: i === 0 ? '#fff' : C.muted,
                fontFamily: NEO_DISPLAY, fontWeight: 700, fontSize: 13,
                textTransform: 'uppercase', letterSpacing: '0.04em',
              }}>{t}</div>
            ))}
          </div>
        </div>

        {/* Podium */}
        <div style={{ padding: '18px 14px 0', display: 'grid', gridTemplateColumns: '1fr 1.15fr 1fr', gap: 8, alignItems: 'end' }}>
          {[rows[1], rows[0], rows[2]].map((r, i) => {
            const bg = podiumBg[r.rank === 1 ? 0 : r.rank === 2 ? 1 : 2];
            const fg = podiumFg[r.rank === 1 ? 0 : r.rank === 2 ? 1 : 2];
            const h = r.rank === 1 ? 170 : r.rank === 2 ? 140 : 120;
            return (
              <div key={r.rank} style={{
                background: bg, color: fg,
                borderRadius: 20, padding: 12, height: h,
                boxShadow: '0 3px 0 rgba(65,42,21,0.14)',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              }}>
                <div style={{
                  fontFamily: NEO_DISPLAY, fontWeight: 800, fontSize: 34,
                  lineHeight: 0.9,
                }}>#{r.rank}</div>
                <div>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', overflow: 'hidden',
                    border: '2px solid rgba(255,255,255,0.6)', marginBottom: 6,
                  }}>
                    <img src={`assets/avatars/${r.avatar}.webp`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt=""/>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 800, lineHeight: 1.1, marginBottom: 2 }}>@{r.name}</div>
                  <div style={{ fontFamily: NEO_DISPLAY, fontWeight: 700, fontSize: 22, lineHeight: 1 }}>{r.merits}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Rest list */}
        <div style={{ padding: '14px 14px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.slice(3).map(r => (
            <div key={r.rank} style={{
              display: 'grid', gridTemplateColumns: '36px 40px 1fr auto', gap: 12,
              alignItems: 'center', padding: '10px 14px',
              borderRadius: 16, background: C.surface,
              border: `1px solid ${C.border}`,
            }}>
              <div style={{ fontFamily: NEO_DISPLAY, fontWeight: 700, fontSize: 22, color: C.accent }}>#{r.rank}</div>
              <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden' }}>
                <img src={`assets/avatars/${r.avatar}.webp`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt=""/>
              </div>
              <div style={{ fontFamily: NEO_DISPLAY, fontWeight: 700, fontSize: 16, color: C.deep, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>
                @{r.name}
              </div>
              <div style={{ fontFamily: NEO_DISPLAY, fontWeight: 700, fontSize: 20, color: C.accent }}>{r.merits}</div>
            </div>
          ))}
        </div>
      </div>
      <NeoDock active="rank" dark={dark} />
    </div>
  );
}

Object.assign(window, {
  NeoWelcome, NeoLogin, NeoHome, NeoChallenge, NeoRun, NeoProfile, NeoLeaderboard,
  NEO, NEO_DISPLAY, NEO_UI,
});
