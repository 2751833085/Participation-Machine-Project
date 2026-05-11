// Classical theme pages for Tourgo
// Palette: warm parchment, espresso brown, sage. Fonts: Cormorant Garamond + DM Sans.

const CLC = {
  light: {
    bg: '#f3ece2', bgWarm: '#e8dfd2', surface: '#fdf9f3', surface2: '#efe8dc',
    text: '#221e1a', muted: '#5e564c', border: '#dcd3c4', borderStrong: '#c9bfb0',
    accent: '#5c4a38', accentHover: '#453624', accentSoft: 'rgba(92,74,56,0.14)',
    brown: '#7a5c45', ok: '#4a6b4f', danger: '#a84848',
    footerBg: '#2a241c', shadowMd: '0 10px 28px rgba(42,37,32,0.08)',
    shadowSm: '0 1px 3px rgba(42,37,32,0.06)',
  },
  dark: {
    bg: '#141210', bgWarm: '#1c1915', surface: '#221e19', surface2: '#2e2923',
    text: '#f5f0e8', muted: '#9a9288', border: '#3d3730', borderStrong: '#524a41',
    accent: '#c4a574', accentHover: '#d4b88a', accentSoft: 'rgba(196,165,116,0.18)',
    brown: '#b09a86', ok: '#7aab84', danger: '#e07a7a',
    footerBg: '#0f0d0b', shadowMd: '0 10px 28px rgba(0,0,0,0.38)',
    shadowSm: '0 1px 3px rgba(0,0,0,0.3)',
  },
};

const CL_DISPLAY = '"Cormorant Garamond", Georgia, serif';
const CL_UI = '"DM Sans", system-ui, sans-serif';

// ── Photo placeholder with subtle stripes ─────────────────
function ClPhoto({ label, hue = 30, sat = 20, lite = 78, dark, style = {} }) {
  const bg = `oklch(${dark ? 0.42 : 0.82} 0.03 ${hue})`;
  const bg2 = `oklch(${dark ? 0.36 : 0.74} 0.03 ${hue + 20})`;
  return (
    <div style={{
      background: `linear-gradient(135deg, ${bg} 0%, ${bg2} 100%)`,
      backgroundImage: `repeating-linear-gradient(45deg, rgba(255,255,255,0.05) 0 6px, transparent 6px 12px), linear-gradient(135deg, ${bg}, ${bg2})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: dark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.4)',
      fontFamily: 'ui-monospace, monospace', fontSize: 9, letterSpacing: '0.08em',
      textTransform: 'uppercase', textAlign: 'center', padding: 6,
      ...style,
    }}>{label}</div>
  );
}

// ── Shared dock nav ───────────────────────────────────────
function ClDock({ active = 'hunts', dark }) {
  const C = dark ? CLC.dark : CLC.light;
  const items = [
    { k: 'hunts', label: 'Hunts', d: 'M3 10l9-6 9 6v10a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2z' },
    { k: 'saved', label: 'Saved', d: 'M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z' },
    { k: 'create', plus: true },
    { k: 'rank', label: 'Rank', d: 'M6 21V8m6 13V3m6 18v-8' },
    { k: 'profile', label: 'Profile', d: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z' },
  ];
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, height: 78,
      background: dark ? 'rgba(34,30,25,0.94)' : 'rgba(253,249,243,0.94)',
      backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
      borderTop: `1px solid ${C.border}`,
      display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', alignItems: 'start',
      paddingTop: 10, paddingBottom: 22,
    }}>
      {items.map(it => it.plus ? (
        <div key={it.k} style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: `linear-gradient(135deg, ${C.accent}, ${C.brown})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: dark ? '0 6px 16px rgba(196,165,116,0.3)' : '0 6px 16px rgba(92,74,56,0.25)',
            marginTop: -6,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={dark ? '#141210' : '#fdf9f3'} strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
          </div>
        </div>
      ) : (
        <div key={it.k} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
          color: active === it.k ? C.accent : C.muted,
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill={active === it.k ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d={it.d}/>
          </svg>
          <span style={{
            fontFamily: CL_UI, fontSize: 9, fontWeight: 600,
            letterSpacing: '0.12em', textTransform: 'uppercase',
          }}>{it.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Classical Header ──────────────────────────────────────
function ClHeader({ dark, title = 'Tourgo' }) {
  const C = dark ? CLC.dark : CLC.light;
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 20,
      height: 56, padding: '0 18px',
      background: dark ? 'rgba(20,18,16,0.88)' : 'rgba(243,236,226,0.88)',
      backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
      borderBottom: `1px solid ${C.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div style={{
        fontFamily: CL_DISPLAY, fontSize: 24, fontWeight: 600,
        color: C.text, letterSpacing: '-0.02em',
      }}>{title}</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          border: `1px solid ${C.border}`, background: C.surface,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: C.muted,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></svg>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// 1. WELCOME
// ═════════════════════════════════════════════════════════
function ClassicalWelcome({ dark }) {
  const C = dark ? CLC.dark : CLC.light;
  return (
    <div style={{
      width: '100%', height: '100%', background: C.bg,
      fontFamily: CL_UI, color: C.text, position: 'relative',
      display: 'flex', flexDirection: 'column',
      backgroundImage: `radial-gradient(ellipse at top, ${C.accentSoft} 0%, transparent 55%), radial-gradient(ellipse at bottom left, ${dark ? 'rgba(176,154,134,0.1)' : 'rgba(122,92,69,0.1)'} 0%, transparent 55%)`,
    }}>
      {/* Hero image */}
      <div style={{
        height: '48%', position: 'relative', overflow: 'hidden',
        borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
        margin: '0 14px', marginTop: 54,
        border: `1px solid ${C.border}`,
      }}>
        <ClPhoto dark={dark} hue={40} label="Manhattan skyline · sepia" style={{ position: 'absolute', inset: 0 }} />
        <div style={{
          position: 'absolute', top: 14, left: 14, right: 14,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{
            padding: '5px 10px', borderRadius: 999,
            background: dark ? 'rgba(20,18,16,0.7)' : 'rgba(253,249,243,0.85)',
            backdropFilter: 'blur(10px)',
            border: `1px solid ${C.border}`,
            fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
            color: C.accent,
          }}>Est. NYC</div>
          <div style={{
            padding: '5px 10px', borderRadius: 999,
            background: dark ? 'rgba(20,18,16,0.7)' : 'rgba(253,249,243,0.85)',
            backdropFilter: 'blur(10px)',
            border: `1px solid ${C.border}`,
            fontSize: 10, fontWeight: 600, letterSpacing: '0.1em',
            color: C.muted, fontFamily: 'ui-monospace, monospace',
          }}>40.7128° N</div>
        </div>
      </div>

      <div style={{ flex: 1, padding: '22px 22px 24px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.accent, marginBottom: 10 }}>
          Tourgo · Photo hunts
        </div>
        <h1 style={{
          fontFamily: CL_DISPLAY, fontWeight: 500, fontStyle: 'italic',
          fontSize: 44, lineHeight: 1.02, letterSpacing: '-0.03em',
          margin: 0, color: C.text,
        }}>
          The city,<br/>
          <span style={{ fontStyle: 'normal', fontWeight: 600 }}>on a timer.</span>
        </h1>
        <p style={{
          margin: '16px 0 0', fontSize: 14, lineHeight: 1.55,
          color: C.muted, maxWidth: 280,
        }}>
          Timed photo scavenger hunts across Manhattan. Follow the clues, beat the clock, earn merits.
        </p>

        <div style={{ flex: 1 }} />

        <button style={{
          height: 52, borderRadius: 12, border: 'none',
          background: C.accent, color: dark ? C.bg : '#fdf9f3',
          fontFamily: CL_UI, fontSize: 15, fontWeight: 600,
          letterSpacing: '0.02em', cursor: 'pointer',
          boxShadow: C.shadowMd, marginBottom: 10,
        }}>Begin the tour</button>
        <button style={{
          height: 48, borderRadius: 12,
          border: `1px solid ${C.borderStrong}`, background: 'transparent',
          color: C.text, fontFamily: CL_UI, fontSize: 14, fontWeight: 500,
          cursor: 'pointer',
        }}>I already have an account</button>

        <div style={{ textAlign: 'center', marginTop: 14, fontSize: 11, color: C.muted, fontStyle: 'italic' }}>
          Partly cloudy · 62°F · Manhattan
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// 2. LOGIN
// ═════════════════════════════════════════════════════════
function ClassicalLogin({ dark }) {
  const C = dark ? CLC.dark : CLC.light;
  return (
    <div style={{
      width: '100%', height: '100%', background: C.bg,
      fontFamily: CL_UI, color: C.text, position: 'relative',
      display: 'flex', flexDirection: 'column', padding: '64px 24px 28px',
      backgroundImage: `radial-gradient(ellipse at top, ${C.accentSoft} 0%, transparent 60%)`,
    }}>
      <button style={{
        width: 36, height: 36, borderRadius: 10,
        border: `1px solid ${C.border}`, background: C.surface,
        color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 28, cursor: 'pointer',
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
      </button>

      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: C.accent, marginBottom: 8 }}>
        Sign in
      </div>
      <h1 style={{
        fontFamily: CL_DISPLAY, fontWeight: 500, fontSize: 38,
        lineHeight: 1.05, letterSpacing: '-0.03em', margin: 0, color: C.text,
      }}>
        <span style={{ fontStyle: 'italic' }}>Welcome</span> back.
      </h1>
      <p style={{ margin: '10px 0 30px', fontSize: 13.5, color: C.muted, lineHeight: 1.5 }}>
        Pick up a hunt where you left it. Your merits, your trail, your city.
      </p>

      {/* Email field */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.muted, marginBottom: 7 }}>
          Email
        </div>
        <div style={{
          height: 48, padding: '0 14px', borderRadius: 12,
          background: C.surface, border: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', fontSize: 14, color: C.text,
        }}>you@manhattan.nyc</div>
      </div>
      {/* Password */}
      <div style={{ marginBottom: 10 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.muted, marginBottom: 7,
        }}>
          <span>Password</span>
          <span style={{ color: C.accent }}>Forgot?</span>
        </div>
        <div style={{
          height: 48, padding: '0 14px', borderRadius: 12,
          background: C.surface, border: `1px solid ${C.accent}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: 14, color: C.text, letterSpacing: '0.2em',
        }}>
          <span>••••••••</span>
          <span style={{ color: C.muted, fontSize: 11, letterSpacing: 0 }}>show</span>
        </div>
      </div>

      <button style={{
        marginTop: 18, height: 52, borderRadius: 12, border: 'none',
        background: C.accent, color: dark ? C.bg : '#fdf9f3',
        fontFamily: CL_UI, fontSize: 15, fontWeight: 600,
        letterSpacing: '0.02em', cursor: 'pointer', boxShadow: C.shadowMd,
      }}>Sign in</button>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
        <div style={{ flex: 1, height: 1, background: C.border }}/>
        <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.muted }}>or</div>
        <div style={{ flex: 1, height: 1, background: C.border }}/>
      </div>

      <button style={{
        height: 48, borderRadius: 12,
        border: `1px solid ${C.borderStrong}`, background: C.surface,
        color: C.text, fontFamily: CL_UI, fontSize: 14, fontWeight: 500,
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24"><path d="M22.5 12.3c0-.8-.1-1.5-.2-2.2H12v4.2h5.9c-.3 1.4-1 2.5-2.2 3.3v2.8h3.6c2.1-1.9 3.2-4.8 3.2-8.1z" fill="#4285F4"/><path d="M12 23c2.9 0 5.4-1 7.2-2.6l-3.6-2.8c-1 .7-2.3 1.1-3.7 1.1-2.8 0-5.2-1.9-6-4.4H2.3v2.9C4.1 20.8 7.8 23 12 23z" fill="#34A853"/><path d="M6 14.3c-.2-.7-.4-1.4-.4-2.3s.1-1.6.4-2.3V6.8H2.3C1.5 8.4 1 10.2 1 12s.5 3.6 1.3 5.2L6 14.3z" fill="#FBBC05"/><path d="M12 5.3c1.6 0 3 .5 4.1 1.6l3.1-3.1C17.4 2 14.9 1 12 1 7.8 1 4.1 3.2 2.3 6.8L6 9.7c.8-2.5 3.2-4.4 6-4.4z" fill="#EA4335"/></svg>
        Continue with Google
      </button>

      <div style={{ flex: 1 }}/>

      <div style={{ textAlign: 'center', fontSize: 13, color: C.muted }}>
        New here? <span style={{ color: C.accent, fontWeight: 600 }}>Create an account</span>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// 3. HOME
// ═════════════════════════════════════════════════════════
function ClassicalHome({ dark }) {
  const C = dark ? CLC.dark : CLC.light;
  const hunts = [
    { id: 'h1', title: 'Central Park Circuit', area: 'Central Park', meta: '5 checkpoints · 30 min', hue: 130, fav: true },
    { id: 'h2', title: 'SoHo Gallery Sprint', area: 'SoHo', meta: '4 checkpoints · 20 min', hue: 60 },
    { id: 'h3', title: 'Brooklyn Bridge Walk', area: 'DUMBO', meta: '6 checkpoints · 45 min', hue: 30 },
    { id: 'h4', title: 'Chinatown Bites', area: 'Chinatown', meta: '3 checkpoints · 15 min', hue: 10, fav: true },
  ];
  return (
    <div style={{
      width: '100%', height: '100%', background: C.bg,
      fontFamily: CL_UI, color: C.text, position: 'relative',
      overflow: 'hidden',
      backgroundImage: `radial-gradient(ellipse at top center, ${C.accentSoft} 0%, transparent 50%), radial-gradient(ellipse at bottom left, ${dark ? 'rgba(176,154,134,0.08)' : 'rgba(122,92,69,0.08)'} 0%, transparent 55%)`,
    }}>
      <div style={{ height: '100%', overflowY: 'auto', paddingBottom: 86 }}>
        <ClHeader dark={dark} />

        <div style={{ padding: '18px 20px 12px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.muted, marginBottom: 4 }}>
            Saturday, April 19
          </div>
          <h1 style={{
            fontFamily: CL_DISPLAY, fontWeight: 500, fontSize: 40,
            lineHeight: 1.05, letterSpacing: '-0.025em', margin: '0 0 2px',
            color: C.text,
          }}>
            Good day<span style={{ fontStyle: 'italic' }}>.</span>
          </h1>
          <p style={{ margin: '0 0 6px', fontSize: 12, color: C.muted, fontStyle: 'italic' }}>
            Partly cloudy · 62°F · Manhattan
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: C.muted, lineHeight: 1.5, maxWidth: 300 }}>
            Timed photo hunts on Manhattan streets — open a listing to preview checkpoints, then start the clock.
          </p>
        </div>

        <div style={{ padding: '14px 20px 6px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h2 style={{ fontFamily: CL_DISPLAY, fontWeight: 600, fontSize: 22, margin: 0, letterSpacing: '-0.02em', color: C.text }}>
            Open hunts
          </h2>
          <span style={{ fontSize: 11, color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{hunts.length} available</span>
        </div>

        <div style={{ padding: '6px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {hunts.map(h => (
            <div key={h.id} style={{
              display: 'grid', gridTemplateColumns: '92px 1fr auto', gap: 14,
              padding: 10, background: C.surface,
              border: `1px solid ${C.border}`, borderRadius: 16,
              boxShadow: C.shadowSm, alignItems: 'center',
            }}>
              <div style={{
                width: 92, height: 92, borderRadius: 10, overflow: 'hidden',
                border: `1px solid ${C.border}`,
              }}>
                <ClPhoto dark={dark} hue={h.hue} label={h.area} style={{ width: '100%', height: '100%' }}/>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{
                  display: 'inline-block', padding: '2px 7px', borderRadius: 4,
                  background: C.accentSoft, color: C.accent,
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                  marginBottom: 6,
                }}>{h.meta}</div>
                <h3 style={{
                  fontFamily: CL_DISPLAY, fontWeight: 600, fontSize: 19,
                  margin: '0 0 2px', letterSpacing: '-0.02em', color: C.text,
                  lineHeight: 1.1,
                }}>{h.title}</h3>
                <div style={{ fontSize: 12, color: C.muted }}>{h.area}</div>
              </div>
              <div style={{
                width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: h.fav ? C.danger : C.muted,
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill={h.fav ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              </div>
            </div>
          ))}
        </div>
      </div>
      <ClDock active="hunts" dark={dark} />
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// 4. CHALLENGE DETAIL
// ═════════════════════════════════════════════════════════
function ClassicalChallenge({ dark }) {
  const C = dark ? CLC.dark : CLC.light;
  const spots = [
    { i: 1, hint: 'Find the bronze angel by the fountain', hue: 130 },
    { i: 2, hint: 'Photograph the model sailboats on Conservatory Pond', hue: 200 },
    { i: 3, hint: 'Capture Belvedere Castle from below', hue: 60 },
    { i: 4, hint: 'Find the Alice in Wonderland statue', hue: 30 },
  ];
  return (
    <div style={{
      width: '100%', height: '100%', background: C.bg,
      fontFamily: CL_UI, color: C.text, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ height: '100%', overflowY: 'auto', paddingBottom: 120 }}>
        {/* Hero */}
        <div style={{ position: 'relative', height: 240, overflow: 'hidden' }}>
          <ClPhoto dark={dark} hue={130} label="Central Park · aerial" style={{ position: 'absolute', inset: 0 }}/>
          <div style={{
            position: 'absolute', inset: 0,
            background: `linear-gradient(180deg, rgba(0,0,0,0.1) 0%, transparent 40%, ${dark ? 'rgba(20,18,16,0.9)' : 'rgba(243,236,226,0.9)'} 100%)`,
          }}/>
          <button style={{
            position: 'absolute', top: 52, left: 14,
            width: 38, height: 38, borderRadius: 10,
            background: dark ? 'rgba(20,18,16,0.7)' : 'rgba(253,249,243,0.88)',
            backdropFilter: 'blur(12px)',
            border: `1px solid ${C.border}`, color: C.text,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
        </div>

        <div style={{ padding: '14px 20px 0' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.accent, marginBottom: 6 }}>
            Central Park · 5 stops
          </div>
          <h1 style={{
            fontFamily: CL_DISPLAY, fontWeight: 500, fontSize: 34,
            lineHeight: 1.05, letterSpacing: '-0.03em', margin: 0, color: C.text,
          }}>
            <span style={{ fontStyle: 'italic' }}>Central Park</span><br/>Circuit
          </h1>
          <div style={{ display: 'flex', gap: 18, marginTop: 14, paddingBottom: 16, borderBottom: `1px solid ${C.border}` }}>
            {[
              ['Time', '30 min'],
              ['Stops', '5'],
              ['Distance', '1.8 mi'],
              ['Merits', '50'],
            ].map(([k, v]) => (
              <div key={k}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.muted }}>{k}</div>
                <div style={{ fontFamily: CL_DISPLAY, fontWeight: 600, fontSize: 18, color: C.text, marginTop: 2 }}>{v}</div>
              </div>
            ))}
          </div>

          <p style={{ margin: '16px 0', fontSize: 14, lineHeight: 1.6, color: C.muted }}>
            A scenic loop through Central Park's most iconic spots. Starts at Bethesda Terrace — finishes at Bow Bridge.
          </p>

          <h2 style={{ fontFamily: CL_DISPLAY, fontWeight: 600, fontSize: 20, letterSpacing: '-0.02em', margin: '18px 0 10px' }}>
            Checkpoints
          </h2>

          <div style={{
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 16, overflow: 'hidden', boxShadow: C.shadowSm,
          }}>
            {spots.map((s, idx) => (
              <div key={s.i} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: 12,
                borderBottom: idx < spots.length - 1 ? `1px solid ${C.border}` : 'none',
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: '50%',
                  background: C.accentSoft, color: C.accent,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: CL_DISPLAY, fontWeight: 700, fontSize: 15,
                }}>{s.i}</div>
                <div style={{ width: 52, height: 52, borderRadius: 8, overflow: 'hidden', border: `1px solid ${C.border}`, flexShrink: 0 }}>
                  <ClPhoto dark={dark} hue={s.hue} label="" style={{ width: '100%', height: '100%' }}/>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 2 }}>Checkpoint {s.i}</div>
                  <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.4 }}>{s.hint}</div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1.8" strokeLinecap="round"><path d="m9 18 6-6-6-6"/></svg>
              </div>
            ))}
            <div style={{
              padding: 12, textAlign: 'center', fontSize: 11,
              color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase',
              borderTop: `1px solid ${C.border}`,
            }}>+ 1 more</div>
          </div>
        </div>
      </div>

      {/* Sticky CTA */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        padding: '14px 20px 34px',
        background: `linear-gradient(180deg, transparent 0%, ${C.bg} 24%)`,
      }}>
        <button style={{
          width: '100%', height: 54, borderRadius: 14, border: 'none',
          background: C.accent, color: dark ? C.bg : '#fdf9f3',
          fontFamily: CL_UI, fontSize: 15, fontWeight: 600,
          letterSpacing: '0.02em', cursor: 'pointer', boxShadow: C.shadowMd,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        }}>
          Start the hunt
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>
        </button>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// 5. ACTIVE RUN
// ═════════════════════════════════════════════════════════
function ClassicalRun({ dark }) {
  const C = dark ? CLC.dark : CLC.light;
  const spots = [
    { i: 1, hint: 'Bronze angel by the fountain', done: true },
    { i: 2, hint: 'Model sailboats · Conservatory Pond', done: true },
    { i: 3, hint: 'Belvedere Castle from below', active: true },
    { i: 4, hint: 'Alice in Wonderland statue' },
    { i: 5, hint: 'Bow Bridge · east bank' },
  ];
  return (
    <div style={{
      width: '100%', height: '100%', background: C.bg,
      fontFamily: CL_UI, color: C.text, position: 'relative', overflow: 'hidden',
    }}>
      {/* Top bar */}
      <div style={{
        paddingTop: 52, paddingLeft: 16, paddingRight: 16, paddingBottom: 8,
        background: dark ? 'rgba(20,18,16,0.88)' : 'rgba(243,236,226,0.88)',
        backdropFilter: 'blur(14px)', position: 'sticky', top: 0, zIndex: 10,
        borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <button style={{
            width: 36, height: 36, borderRadius: 10,
            border: `1px solid ${C.border}`, background: C.surface,
            color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.accent }}>
            Live · Central Park
          </div>
          <div style={{ width: 36 }}/>
        </div>

        {/* Timer */}
        <div style={{ textAlign: 'center', paddingBottom: 10 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.muted, marginBottom: 2 }}>
            Time remaining
          </div>
          <div style={{
            fontFamily: CL_DISPLAY, fontWeight: 500, fontSize: 56,
            letterSpacing: '-0.02em', color: C.text, lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
          }}>
            18<span style={{ color: C.muted, fontWeight: 400 }}>:</span>42
          </div>
          {/* Progress */}
          <div style={{ height: 3, background: C.border, borderRadius: 2, margin: '12px 4px 0', overflow: 'hidden' }}>
            <div style={{ width: '62%', height: '100%', background: C.accent }}/>
          </div>
        </div>
      </div>

      {/* Current checkpoint */}
      <div style={{ padding: '16px 16px 10px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.muted, marginBottom: 6 }}>
          Checkpoint 3 of 5
        </div>
        <h2 style={{ fontFamily: CL_DISPLAY, fontWeight: 500, fontSize: 24, lineHeight: 1.15, letterSpacing: '-0.02em', margin: '0 0 10px', color: C.text }}>
          <span style={{ fontStyle: 'italic' }}>Capture</span> Belvedere Castle from below.
        </h2>

        {/* Photo upload target */}
        <div style={{
          aspectRatio: '1.4/1', borderRadius: 14,
          background: C.surface, border: `2px dashed ${C.borderStrong}`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
          color: C.muted, marginTop: 8,
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%', background: C.accentSoft,
            color: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="4"/></svg>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Take your photo</div>
          <div style={{ fontSize: 11 }}>or upload from your library</div>
        </div>
      </div>

      {/* Checkpoint list */}
      <div style={{ padding: '6px 16px 140px' }}>
        <h3 style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.muted, margin: '16px 4px 10px' }}>Trail</h3>
        <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
          {spots.map((s, idx) => (
            <div key={s.i} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
              borderBottom: idx < spots.length - 1 ? `1px solid ${C.border}` : 'none',
              background: s.active ? C.accentSoft : 'transparent',
            }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%',
                background: s.done ? C.ok : s.active ? C.accent : C.border,
                color: s.done || s.active ? (dark ? C.bg : '#fdf9f3') : C.muted,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: CL_UI, fontWeight: 700, fontSize: 11,
              }}>
                {s.done ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 13 4 4L19 7"/></svg>
                ) : s.i}
              </div>
              <div style={{ flex: 1, fontSize: 12.5, color: s.done ? C.muted : C.text, textDecoration: s.done ? 'line-through' : 'none' }}>
                {s.hint}
              </div>
              {s.active && <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: C.accent }}>NOW</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Sticky submit */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        padding: '14px 16px 34px',
        background: `linear-gradient(180deg, transparent 0%, ${C.bg} 22%)`,
      }}>
        <button style={{
          width: '100%', height: 52, borderRadius: 14, border: 'none',
          background: C.accent, color: dark ? C.bg : '#fdf9f3',
          fontFamily: CL_UI, fontSize: 15, fontWeight: 600,
          letterSpacing: '0.02em', boxShadow: C.shadowMd,
        }}>Submit checkpoint</button>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// 6. PROFILE
// ═════════════════════════════════════════════════════════
function ClassicalProfile({ dark }) {
  const C = dark ? CLC.dark : CLC.light;
  return (
    <div style={{
      width: '100%', height: '100%', background: C.bg,
      fontFamily: CL_UI, color: C.text, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ height: '100%', overflowY: 'auto', paddingBottom: 86 }}>
        <ClHeader dark={dark} title="Profile" />

        {/* Avatar + name */}
        <div style={{ padding: '22px 20px 6px', display: 'flex', gap: 14, alignItems: 'center' }}>
          <div style={{
            width: 76, height: 76, borderRadius: '50%',
            border: `2px solid ${C.border}`, overflow: 'hidden',
            background: C.surface2,
          }}>
            <img src="assets/avatars/Male_1.webp" style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt=""/>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontFamily: CL_DISPLAY, fontWeight: 500, fontSize: 28, margin: 0, letterSpacing: '-0.02em', color: C.text, lineHeight: 1.1 }}>
              trailblazer_nyc
            </h1>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>Member since April 2024</div>
          </div>
        </div>

        {/* Merits */}
        <div style={{ padding: '14px 20px 6px' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10,
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 16, padding: 14, boxShadow: C.shadowSm,
          }}>
            {[
              ['1,240', 'Merits'],
              ['8', 'Hunts'],
              ['3', 'Badges'],
            ].map(([v, l], i) => (
              <div key={l} style={{
                textAlign: 'center',
                borderLeft: i > 0 ? `1px solid ${C.border}` : 'none',
              }}>
                <div style={{ fontFamily: CL_DISPLAY, fontWeight: 600, fontSize: 28, color: C.text, letterSpacing: '-0.02em', lineHeight: 1 }}>{v}</div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.muted, marginTop: 6 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Badges */}
        <div style={{ padding: '16px 20px 6px' }}>
          <h2 style={{ fontFamily: CL_DISPLAY, fontWeight: 600, fontSize: 18, margin: '0 0 10px', letterSpacing: '-0.02em' }}>Badges</h2>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto' }}>
            {['Founder', 'Central Park', 'Speedrun'].map((b, i) => (
              <div key={b} style={{
                flexShrink: 0, width: 98, padding: 10,
                background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: 12, textAlign: 'center',
              }}>
                <div style={{
                  width: 44, height: 44, margin: '0 auto 6px', borderRadius: '50%',
                  background: C.accentSoft, color: C.accent,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: CL_DISPLAY, fontWeight: 700, fontSize: 18,
                }}>{['★','♛','⚑'][i]}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.text }}>{b}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Settings list */}
        <div style={{ padding: '16px 20px 24px' }}>
          <h2 style={{ fontFamily: CL_DISPLAY, fontWeight: 600, fontSize: 18, margin: '0 0 10px', letterSpacing: '-0.02em' }}>Settings</h2>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
            {[
              { label: 'Appearance', value: dark ? 'Dark' : 'Light' },
              { label: 'Theme', value: 'Classical' },
              { label: 'Notifications', value: 'On' },
              { label: 'Privacy', value: '' },
              { label: 'Sign out', value: '', danger: true },
            ].map((row, idx, arr) => (
              <div key={row.label} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 14px', fontSize: 14,
                color: row.danger ? C.danger : C.text,
                borderBottom: idx < arr.length - 1 ? `1px solid ${C.border}` : 'none',
              }}>
                <span>{row.label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.muted, fontSize: 13 }}>
                  {row.value && <span>{row.value}</span>}
                  {!row.danger && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="m9 18 6-6-6-6"/></svg>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <ClDock active="profile" dark={dark} />
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// 7. LEADERBOARD
// ═════════════════════════════════════════════════════════
function ClassicalLeaderboard({ dark }) {
  const C = dark ? CLC.dark : CLC.light;
  const rows = [
    { rank: 1, name: 'trailblazer_nyc', merits: 1240, avatar: 'Male_1' },
    { rank: 2, name: 'photo_hunter', merits: 980, avatar: 'Female_1' },
    { rank: 3, name: 'citywalker', merits: 875, avatar: 'Boy' },
    { rank: 4, name: 'manhattan_explorer', merits: 720, avatar: 'Cat' },
    { rank: 5, name: 'streetwise', merits: 615, avatar: 'Female_2' },
    { rank: 6, name: 'bridgewalker', merits: 510, avatar: 'Girl' },
    { rank: 7, name: 'subway_sprinter', merits: 460, avatar: 'Dog' },
  ];
  return (
    <div style={{
      width: '100%', height: '100%', background: C.bg,
      fontFamily: CL_UI, color: C.text, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ height: '100%', overflowY: 'auto', paddingBottom: 86 }}>
        <ClHeader dark={dark} title="Rank" />

        <div style={{ padding: '18px 20px 10px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.accent, marginBottom: 4 }}>
            Weekly merit rank
          </div>
          <h1 style={{ fontFamily: CL_DISPLAY, fontWeight: 500, fontSize: 34, lineHeight: 1.05, margin: 0, letterSpacing: '-0.025em', color: C.text }}>
            The <span style={{ fontStyle: 'italic' }}>hunters</span><br/>of April.
          </h1>

          <div style={{ display: 'flex', gap: 6, marginTop: 14, padding: 4, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 999, width: 'fit-content' }}>
            {['Weekly', 'Monthly', 'All-time'].map((t, i) => (
              <div key={t} style={{
                padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                background: i === 0 ? C.accent : 'transparent',
                color: i === 0 ? (dark ? C.bg : '#fdf9f3') : C.muted,
              }}>{t}</div>
            ))}
          </div>
        </div>

        {/* Podium */}
        <div style={{ padding: '14px 20px 10px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, alignItems: 'end' }}>
          {[rows[1], rows[0], rows[2]].map((r, i) => {
            const isFirst = r.rank === 1;
            const heights = [88, 110, 76];
            return (
              <div key={r.rank} style={{ textAlign: 'center' }}>
                <div style={{
                  width: isFirst ? 60 : 48, height: isFirst ? 60 : 48,
                  margin: '0 auto 6px', borderRadius: '50%',
                  border: `2px solid ${isFirst ? C.accent : C.border}`, overflow: 'hidden',
                }}>
                  <img src={`assets/avatars/${r.avatar}.webp`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt=""/>
                </div>
                <div style={{ fontFamily: CL_UI, fontSize: 11, fontWeight: 600, color: C.text, marginBottom: 2 }}>@{r.name}</div>
                <div style={{
                  height: heights[i], borderRadius: '10px 10px 0 0',
                  background: isFirst ? C.accent : C.surface2,
                  border: `1px solid ${C.border}`, borderBottom: 'none',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  color: isFirst ? (dark ? C.bg : '#fdf9f3') : C.text,
                }}>
                  <div style={{ fontFamily: CL_DISPLAY, fontWeight: 600, fontSize: 24, lineHeight: 1 }}>{r.rank}</div>
                  <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700, opacity: 0.75, marginTop: 4 }}>{r.merits}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* List of rest */}
        <div style={{ padding: '4px 18px 20px' }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
            {rows.slice(3).map((r, idx, arr) => (
              <div key={r.rank} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                borderBottom: idx < arr.length - 1 ? `1px solid ${C.border}` : 'none',
              }}>
                <div style={{
                  width: 28, fontFamily: CL_DISPLAY, fontWeight: 600, fontSize: 18,
                  color: C.muted, textAlign: 'center',
                }}>{r.rank}</div>
                <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', border: `1px solid ${C.border}` }}>
                  <img src={`assets/avatars/${r.avatar}.webp`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt=""/>
                </div>
                <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: C.text }}>@{r.name}</div>
                <div style={{ fontFamily: CL_DISPLAY, fontWeight: 600, fontSize: 16, color: C.accent }}>{r.merits}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <ClDock active="rank" dark={dark} />
    </div>
  );
}

Object.assign(window, {
  ClassicalWelcome, ClassicalLogin, ClassicalHome,
  ClassicalChallenge, ClassicalRun, ClassicalProfile, ClassicalLeaderboard,
  CLC, CL_DISPLAY, CL_UI, ClHeader,
});
