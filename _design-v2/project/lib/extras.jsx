// Extra screens — grid/list view, create hunt, saved hunts.
// Neo and Classical variants. Each is a full-bleed screen (not an overlay).

// ═══════════════════════════════════════════════════════════
// NEO — Grid / dense list view of all hunts
// The Neo home is a big 2-column poster grid. Tapping the grid
// icon in the top bar swaps to a dense horizontal list, optimized
// for scanning many hunts by name/time.
// ═══════════════════════════════════════════════════════════
function NeoGrid({ dark }) {
  const C = dark ? NEO.dark : NEO.light;
  const tints = [
    { bg: C.cardLav,     fg: nFg(dark, '#3f2a56') },
    { bg: C.cardPeach,   fg: nFg(dark, '#5a2615') },
    { bg: C.cardMustard, fg: nFg(dark, '#3e3310') },
    { bg: C.cardMint,    fg: nFg(dark, '#1d5c4d') },
  ];
  const hunts = [
    { title: 'Central Park Circuit', area: 'Central Park',  spots: 5, mins: 30, tag: 'Popular' },
    { title: 'SoHo Gallery Sprint',  area: 'SoHo',           spots: 4, mins: 20, tag: 'Indoor' },
    { title: 'Brooklyn Bridge',      area: 'DUMBO',          spots: 6, mins: 45, tag: 'Scenic' },
    { title: 'Chinatown Bites',      area: 'Chinatown',      spots: 3, mins: 15, tag: 'Food' },
    { title: 'High Line Horizon',    area: 'Chelsea',        spots: 5, mins: 25, tag: 'New' },
    { title: 'Financial Ghosts',     area: 'FiDi',           spots: 4, mins: 22, tag: 'History' },
    { title: 'Williamsburg Walls',   area: 'Williamsburg',   spots: 6, mins: 40, tag: 'Art' },
  ];
  return (
    <div style={{
      width: '100%', height: '100%', background: C.bg,
      fontFamily: NEO_UI, color: C.text, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ height: '100%', overflowY: 'auto', paddingTop: 50, paddingBottom: 110 }}>
        {/* Top bar — matches NeoHome, but grid icon is now the active one */}
        <div style={{ padding: '6px 14px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button style={{
            width: 44, height: 44, aspectRatio: '1 / 1', borderRadius: '50%',
            background: C.surface, border: `1px solid ${C.border}`, color: C.deep,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 0, flexShrink: 0,
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.2c-4.1 0-7.4 3.2-7.4 7.2 0 5.1 5.6 10.8 7 12.1.2.2.6.2.8 0 1.4-1.3 7-7 7-12.1 0-4-3.3-7.2-7.4-7.2zm0 10.2c-1.8 0-3.2-1.4-3.2-3.2S10.2 6 12 6s3.2 1.4 3.2 3.2-1.4 3.2-3.2 3.2z"/></svg>
          </button>
          {/* View-mode toggle segmented control */}
          <div style={{
            display: 'flex', background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 999, padding: 3, gap: 2,
          }}>
            <div style={{
              width: 38, height: 32, borderRadius: 999,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: C.muted,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/></svg>
            </div>
            <div style={{
              width: 38, height: 32, borderRadius: 999,
              background: C.accent, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 0 rgba(0,0,0,0.14)',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
            </div>
          </div>
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
          margin: '14px 14px 4px',
        }}>
          All hunts<br/>at a glance.
        </h1>
        <div style={{ padding: '0 18px', fontSize: 12, color: C.muted, fontWeight: 500, marginBottom: 14 }}>
          {hunts.length} live · sorted by distance
        </div>

        {/* Dense list — each row is a colored rectangle with big number + title */}
        <div style={{ padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {hunts.map((h, i) => {
            const t = tints[i % tints.length];
            return (
              <div key={i} style={{
                display: 'grid',
                gridTemplateColumns: '56px 1fr auto',
                alignItems: 'center', gap: 12,
                padding: '10px 14px 10px 10px', borderRadius: 18,
                background: t.bg, color: t.fg,
                boxShadow: '0 2px 0 rgba(0,0,0,0.1)',
              }}>
                {/* Big numeral */}
                <div style={{
                  height: 56, borderRadius: 12,
                  background: 'rgba(255,255,255,0.22)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: NEO_DISPLAY, fontWeight: 800, fontSize: 30,
                  letterSpacing: '-0.02em',
                }}>
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontFamily: NEO_DISPLAY, fontWeight: 700, fontSize: 22,
                    lineHeight: 1, letterSpacing: '-0.01em', textTransform: 'uppercase',
                    marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {h.title}
                  </div>
                  <div style={{
                    fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.8,
                  }}>
                    {h.area} · {h.spots} spots · {h.mins}m
                  </div>
                </div>
                <div style={{
                  padding: '4px 10px', borderRadius: 999,
                  background: 'rgba(0,0,0,0.14)',
                  fontFamily: NEO_DISPLAY, fontWeight: 800, fontSize: 10,
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                }}>{h.tag}</div>
              </div>
            );
          })}
        </div>
      </div>
      <NeoDock active="hunts" dark={dark}/>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// CLASSICAL — Create hunt (editorial form)
// ═══════════════════════════════════════════════════════════
function ClassicalCreate({ dark }) {
  const C = dark ? CLC.dark : CLC.light;
  return (
    <div style={{
      width: '100%', height: '100%', background: C.bg,
      fontFamily: CL_UI, color: C.text, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ height: '100%', overflowY: 'auto', paddingBottom: 100 }}>
        {/* Header — matches ClHeader height (56px) */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 20,
          height: 56, padding: '0 18px',
          background: dark ? 'rgba(20,18,16,0.88)' : 'rgba(243,236,226,0.88)',
          backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
          borderBottom: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <button style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'transparent', border: `1px solid ${C.border}`,
            color: C.text, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.24em', textTransform: 'uppercase', color: C.muted }}>
            New composition
          </div>
          <div style={{ fontSize: 11, color: C.accent, fontWeight: 600, fontStyle: 'italic', fontFamily: CL_DISPLAY }}>
            Draft
          </div>
        </div>

        <div style={{ padding: '22px 20px 0' }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.24em', textTransform: 'uppercase', color: C.accent, marginBottom: 8 }}>
            Step 1 · the essentials
          </div>
          <h1 style={{
            fontFamily: CL_DISPLAY, fontWeight: 500, fontSize: 40,
            lineHeight: 1.02, letterSpacing: '-0.03em', margin: '0 0 18px',
          }}>
            <span style={{ fontStyle: 'italic' }}>Compose</span> a hunt.
          </h1>
        </div>

        {/* Title field */}
        <div style={{ padding: '4px 20px 16px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.muted, marginBottom: 6 }}>
            Title
          </div>
          <div style={{
            paddingBottom: 10, borderBottom: `1.5px solid ${C.text}`,
            fontFamily: CL_DISPLAY, fontWeight: 500, fontSize: 26,
            letterSpacing: '-0.02em', color: C.text,
          }}>
            Midtown after dark
          </div>
        </div>

        {/* Description */}
        <div style={{ padding: '0 22px 18px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.muted, marginBottom: 6 }}>
            Subtitle / intro
          </div>
          <div style={{
            padding: '12px 14px', borderRadius: 10,
            border: `1px solid ${C.border}`, background: C.surface,
            fontSize: 13, lineHeight: 1.55, color: C.text,
            fontFamily: CL_DISPLAY, fontStyle: 'italic',
          }}>
            A slow walk from Bryant Park to Rockefeller as the lights come up.
          </div>
        </div>

        {/* Meta row */}
        <div style={{ padding: '0 22px 18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { k: 'Duration', v: '45 min', sub: 'estimated' },
            { k: 'Difficulty', v: 'Measured', sub: 'level 2 of 4' },
          ].map(x => (
            <div key={x.k} style={{
              padding: '12px 14px', borderRadius: 10,
              border: `1px solid ${C.border}`, background: C.surface,
            }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.muted, marginBottom: 4 }}>
                {x.k}
              </div>
              <div style={{ fontFamily: CL_DISPLAY, fontWeight: 600, fontSize: 18, letterSpacing: '-0.01em', color: C.text }}>
                {x.v}
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 2, fontStyle: 'italic' }}>
                {x.sub}
              </div>
            </div>
          ))}
        </div>

        {/* Checkpoints */}
        <div style={{ padding: '4px 20px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h2 style={{ fontFamily: CL_DISPLAY, fontWeight: 600, fontSize: 22, margin: 0, letterSpacing: '-0.02em' }}>
            Checkpoints <span style={{ color: C.muted, fontWeight: 400, fontStyle: 'italic', fontSize: 16 }}>· 3 of 5</span>
          </h2>
          <div style={{ fontSize: 11, color: C.accent, fontWeight: 600 }}>+ Add</div>
        </div>

        <div style={{ padding: '0 22px' }}>
          {[
            { i: 1, name: 'Bryant Park lion', note: 'Capture the south guardian.' },
            { i: 2, name: 'Radio City marquee', note: 'Framed low, dusk lighting.' },
            { i: 3, name: 'Rockefeller skating rink', note: 'From the overlook.' },
          ].map((s, idx, arr) => (
            <div key={s.i} style={{
              display: 'flex', gap: 12, padding: '14px 0',
              borderTop: idx === 0 ? `1px solid ${C.border}` : 'none',
              borderBottom: `1px solid ${C.border}`,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: C.accentSoft, color: C.accent,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: CL_DISPLAY, fontWeight: 700, fontSize: 14, flexShrink: 0,
              }}>{s.i}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: CL_DISPLAY, fontWeight: 600, fontSize: 16, letterSpacing: '-0.01em', color: C.text }}>
                  {s.name}
                </div>
                <div style={{ fontSize: 12, color: C.muted, fontStyle: 'italic', fontFamily: CL_DISPLAY, marginTop: 2 }}>
                  {s.note}
                </div>
              </div>
              <div style={{ color: C.muted, display: 'flex', alignItems: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Publish CTA */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        padding: '14px 20px 28px',
        background: `linear-gradient(to top, ${C.bg} 60%, ${C.bg}00)`,
        display: 'flex', gap: 10,
      }}>
        <button style={{
          flex: 1, height: 50, borderRadius: 12,
          border: `1px solid ${C.borderStrong}`, background: 'transparent',
          color: C.text, fontFamily: CL_UI, fontSize: 13, fontWeight: 500, cursor: 'pointer',
        }}>Save draft</button>
        <button style={{
          flex: 1.4, height: 50, borderRadius: 12, border: 'none',
          background: C.accent, color: dark ? C.bg : '#fdf9f3',
          fontFamily: CL_UI, fontSize: 14, fontWeight: 600, letterSpacing: '0.02em',
          boxShadow: C.shadowMd, cursor: 'pointer',
        }}>Publish</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// NEO — Create hunt (slab form)
// ═══════════════════════════════════════════════════════════
function NeoCreate({ dark }) {
  const C = dark ? NEO.dark : NEO.light;
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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
          <div style={{
            fontFamily: NEO_DISPLAY, fontWeight: 800, fontSize: 13,
            letterSpacing: '0.14em', textTransform: 'uppercase', color: C.muted,
          }}>Draft · Step 1/3</div>
          <div style={{
            padding: '6px 12px', borderRadius: 999,
            background: 'transparent', border: `1px solid ${C.border}`,
            fontFamily: NEO_DISPLAY, fontWeight: 800, fontSize: 11,
            letterSpacing: '0.1em', textTransform: 'uppercase', color: C.deep,
          }}>Save</div>
        </div>

        {/* Hero slab */}
        <div style={{
          margin: '14px 14px 0', padding: '18px 20px 20px', borderRadius: 24,
          background: C.cardPeach, color: nFg(dark, '#5a2615'),
          boxShadow: '0 3px 0 rgba(0,0,0,0.14)',
        }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', opacity: 0.8, marginBottom: 4 }}>
            Title
          </div>
          <div style={{
            fontFamily: NEO_DISPLAY, fontWeight: 700, fontSize: 54,
            lineHeight: 0.85, letterSpacing: '-0.035em', textTransform: 'uppercase',
            marginBottom: 10,
          }}>
            Midtown<br/>After Dark
          </div>
          <div style={{
            display: 'inline-block',
            padding: '5px 10px', borderRadius: 999,
            background: 'rgba(0,0,0,0.16)',
            fontFamily: NEO_DISPLAY, fontWeight: 800, fontSize: 11,
            letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>⌨︎ Tap to edit</div>
        </div>

        {/* Meta slab triple */}
        <div style={{ padding: '12px 14px 0', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {[
            { k: 'TIME',  v: '45', u: 'min',  bg: C.cardMint,    fg: nFg(dark, '#1d5c4d') },
            { k: 'SPOTS', v: '05', u: 'stops', bg: C.cardLav,     fg: nFg(dark, '#3f2a56') },
            { k: 'DIFF',  v: '02', u: '/ 04',  bg: C.cardMustard, fg: nFg(dark, '#3e3310') },
          ].map(x => (
            <div key={x.k} style={{
              borderRadius: 18, background: x.bg, color: x.fg,
              padding: '12px 12px 10px', boxShadow: '0 3px 0 rgba(0,0,0,0.12)',
            }}>
              <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', opacity: 0.75, marginBottom: 2 }}>{x.k}</div>
              <div style={{ fontFamily: NEO_DISPLAY, fontWeight: 700, fontSize: 36, lineHeight: 0.9, letterSpacing: '-0.02em' }}>
                {x.v}
              </div>
              <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.7, marginTop: 2 }}>
                {x.u}
              </div>
            </div>
          ))}
        </div>

        {/* Section: checkpoints */}
        <div style={{ padding: '18px 14px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h2 style={{
            fontFamily: NEO_DISPLAY, fontWeight: 700, fontSize: 28,
            margin: 0, letterSpacing: '-0.02em', textTransform: 'uppercase', color: C.deep, lineHeight: 1,
          }}>
            Checkpoints <span style={{ color: C.muted, fontSize: 16 }}>3/5</span>
          </h2>
          <div style={{
            padding: '6px 12px', borderRadius: 999,
            background: C.accent, color: '#fff',
            fontFamily: NEO_DISPLAY, fontWeight: 800, fontSize: 11,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            boxShadow: '0 2px 0 rgba(0,0,0,0.18)',
          }}>+ Add</div>
        </div>

        <div style={{ padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { i: 1, name: 'Bryant Park Lion',   sub: 'South guardian, low angle' },
            { i: 2, name: 'Radio City Marquee', sub: 'Neon at dusk' },
            { i: 3, name: 'Rockefeller Rink',   sub: 'From the overlook' },
          ].map(s => (
            <div key={s.i} style={{
              display: 'grid', gridTemplateColumns: '44px 1fr 20px', gap: 12,
              alignItems: 'center', padding: '10px 14px',
              borderRadius: 16, background: C.surface, border: `1px solid ${C.border}`,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: C.deep, color: dark ? C.bg : '#fef5df',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: NEO_DISPLAY, fontWeight: 800, fontSize: 20,
              }}>{String(s.i).padStart(2, '0')}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontFamily: NEO_DISPLAY, fontWeight: 700, fontSize: 17,
                  textTransform: 'uppercase', letterSpacing: '-0.01em', lineHeight: 1, color: C.deep,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{s.name}</div>
                <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginTop: 3 }}>{s.sub}</div>
              </div>
              <div style={{ color: C.muted, display: 'flex', alignItems: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Publish CTA */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 86,
        padding: '10px 14px 12px',
        background: `linear-gradient(to top, ${C.bg} 60%, ${C.bg}00)`,
      }}>
        <button style={{
          width: '100%', height: 54, borderRadius: 999, border: 'none',
          background: C.accent, color: '#fff',
          fontFamily: NEO_DISPLAY, fontWeight: 800, fontSize: 19,
          letterSpacing: '0.04em', textTransform: 'uppercase',
          boxShadow: '0 4px 0 rgba(0,0,0,0.22)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          Publish hunt ↗
        </button>
      </div>
      <NeoDock active="create" dark={dark}/>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// CLASSICAL — Saved hunts (bookmarks)
// ═══════════════════════════════════════════════════════════
function ClassicalSaved({ dark }) {
  const C = dark ? CLC.dark : CLC.light;
  const saved = [
    { title: 'The Village at Golden Hour', area: 'West Village', meta: '6 checkpoints · 40 min', savedOn: 'Apr 14', hue: 22 },
    { title: 'Brooklyn Bridge Basilica',   area: 'DUMBO',         meta: '5 checkpoints · 35 min', savedOn: 'Apr 10', hue: 200 },
    { title: 'Chinatown Bites',            area: 'Chinatown',     meta: '3 checkpoints · 15 min', savedOn: 'Mar 29', hue: 340 },
    { title: 'Prospect Park Parade',       area: 'Park Slope',    meta: '7 checkpoints · 55 min', savedOn: 'Mar 21', hue: 120 },
  ];
  return (
    <div style={{
      width: '100%', height: '100%', background: C.bg,
      fontFamily: CL_UI, color: C.text, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ height: '100%', overflowY: 'auto', paddingBottom: 90 }}>
        <ClHeader dark={dark} title="Saved" />

        {/* Intro */}
        <div style={{ padding: '22px 20px 10px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.24em', textTransform: 'uppercase', color: C.accent, marginBottom: 10 }}>
            Collected · 14
          </div>
          <h1 style={{
            fontFamily: CL_DISPLAY, fontWeight: 500, fontSize: 42,
            lineHeight: 1.02, letterSpacing: '-0.03em', margin: '0 0 4px',
          }}>
            <span style={{ fontStyle: 'italic' }}>Saved</span> for later.
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: C.muted, lineHeight: 1.5, fontStyle: 'italic', fontFamily: CL_DISPLAY }}>
            A private reading list of hunts you've bookmarked. No one else can see these.
          </p>
        </div>

        {/* Segmented tabs */}
        <div style={{ padding: '14px 20px 8px', display: 'flex', gap: 18, borderBottom: `1px solid ${C.border}` }}>
          {['All', 'Nearby', 'Offline'].map((t, i) => (
            <div key={t} style={{
              paddingBottom: 10, position: 'relative',
              fontSize: 12, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase',
              color: i === 0 ? C.text : C.muted,
            }}>
              {t}
              {i === 0 && (
                <div style={{ position: 'absolute', bottom: -1, left: 0, right: 0, height: 1.5, background: C.accent }}/>
              )}
            </div>
          ))}
        </div>

        {/* List */}
        {saved.map((h, idx) => (
          <div key={idx} style={{
            padding: '16px 20px',
            display: 'flex', gap: 14, alignItems: 'flex-start',
            borderBottom: `1px solid ${C.border}`,
          }}>
            <div style={{
              width: 68, height: 86, borderRadius: 4, flexShrink: 0,
              background: `hsl(${h.hue}, 28%, ${dark ? 24 : 74}%)`,
              border: `1px solid ${C.border}`,
              backgroundImage: `repeating-linear-gradient(135deg, ${dark ? 'rgba(245,240,232,0.06)' : 'rgba(42,37,32,0.04)'} 0 6px, transparent 6px 14px)`,
              position: 'relative',
            }}>
              {/* Bookmark corner */}
              <div style={{
                position: 'absolute', top: 0, right: 6, width: 14, height: 22,
                background: C.accent, clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 78%, 0 100%)',
              }}/>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.accent, marginBottom: 3 }}>
                {h.area}
              </div>
              <h3 style={{
                fontFamily: CL_DISPLAY, fontWeight: 600, fontSize: 19,
                margin: '0 0 4px', letterSpacing: '-0.02em', color: C.text, lineHeight: 1.15,
              }}>{h.title}</h3>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>{h.meta}</div>
              <div style={{ fontSize: 11, color: C.muted, fontStyle: 'italic', fontFamily: CL_DISPLAY }}>
                Saved {h.savedOn}
              </div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill={C.accent} stroke={C.accent} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 2 }}>
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// NEO — Saved hunts (color-block stack)
// ═══════════════════════════════════════════════════════════
function NeoSaved({ dark }) {
  const C = dark ? NEO.dark : NEO.light;
  const tints = [
    { bg: C.cardPeach,   fg: nFg(dark, '#5a2615') },
    { bg: C.cardLav,     fg: nFg(dark, '#3f2a56') },
    { bg: C.cardMint,    fg: nFg(dark, '#1d5c4d') },
    { bg: C.cardMustard, fg: nFg(dark, '#3e3310') },
  ];
  const saved = [
    { title: 'Village Golden Hour', area: 'West Village', spots: 6, mins: 40, note: 'For a date night.', savedOn: '4/14' },
    { title: 'Bridge Basilica',     area: 'DUMBO',         spots: 5, mins: 35, note: 'Sunrise shoot.',    savedOn: '4/10' },
    { title: 'Chinatown Bites',     area: 'Chinatown',     spots: 3, mins: 15, note: 'Quick lunch run.',  savedOn: '3/29' },
    { title: 'Prospect Parade',     area: 'Park Slope',    spots: 7, mins: 55, note: 'Sunday crew.',      savedOn: '3/21' },
  ];
  return (
    <div style={{
      width: '100%', height: '100%', background: C.bg,
      fontFamily: NEO_UI, color: C.text, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ height: '100%', overflowY: 'auto', paddingTop: 50, paddingBottom: 110 }}>
        {/* Header */}
        <div style={{ padding: '10px 14px 0' }}>
          <div style={{
            fontFamily: NEO_DISPLAY, fontWeight: 800, fontSize: 11,
            letterSpacing: '0.18em', textTransform: 'uppercase', color: C.accent,
            marginBottom: 6,
          }}>
            ★ Saved · 14
          </div>
          <h1 style={{
            fontFamily: NEO_DISPLAY, fontWeight: 700, fontSize: 64,
            lineHeight: 0.85, letterSpacing: '-0.035em',
            color: C.deep, textTransform: 'uppercase', margin: 0,
          }}>
            Your<br/>stash.
          </h1>
        </div>

        {/* Chip filters */}
        <div style={{ padding: '18px 14px 4px', display: 'flex', gap: 8, overflowX: 'auto' }}>
          {['All', 'Nearby', 'Offline', 'By me'].map((f, i) => (
            <div key={f} style={{
              padding: '8px 14px', borderRadius: 999,
              background: i === 0 ? C.deep : C.surface,
              color: i === 0 ? (dark ? C.bg : '#fef5df') : C.text,
              border: i === 0 ? 'none' : `1px solid ${C.border}`,
              fontFamily: NEO_DISPLAY, fontWeight: 700, fontSize: 12,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              whiteSpace: 'nowrap', flexShrink: 0,
            }}>{f}</div>
          ))}
        </div>

        {/* Saved cards stack */}
        <div style={{ padding: '10px 14px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {saved.map((h, i) => {
            const t = tints[i % tints.length];
            return (
              <div key={i} style={{
                padding: 16, borderRadius: 22,
                background: t.bg, color: t.fg,
                boxShadow: '0 3px 0 rgba(0,0,0,0.12)',
                position: 'relative',
              }}>
                <div style={{
                  position: 'absolute', top: 14, right: 14,
                  width: 30, height: 30, borderRadius: '50%',
                  background: 'rgba(0,0,0,0.14)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                  </svg>
                </div>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.8, marginBottom: 4 }}>
                  {h.area}
                </div>
                <div style={{
                  fontFamily: NEO_DISPLAY, fontWeight: 700, fontSize: 30,
                  lineHeight: 0.9, letterSpacing: '-0.02em', textTransform: 'uppercase',
                  marginBottom: 8, paddingRight: 40,
                }}>
                  {h.title}
                </div>
                <div style={{
                  display: 'flex', gap: 8, alignItems: 'center',
                  fontFamily: NEO_DISPLAY, fontWeight: 700, fontSize: 12,
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                  marginBottom: 10,
                }}>
                  <span>{h.spots} spots</span>
                  <span style={{ opacity: 0.5 }}>·</span>
                  <span>{h.mins}m</span>
                  <span style={{ opacity: 0.5 }}>·</span>
                  <span>Saved {h.savedOn}</span>
                </div>
                <div style={{
                  padding: '7px 12px', borderRadius: 999,
                  background: 'rgba(255,255,255,0.2)',
                  display: 'inline-block',
                  fontSize: 11, fontWeight: 700, fontStyle: 'italic',
                }}>"{h.note}"</div>
              </div>
            );
          })}
        </div>
      </div>
      <NeoDock active="saved" dark={dark}/>
    </div>
  );
}

Object.assign(window, {
  NeoGrid,
  ClassicalCreate, NeoCreate,
  ClassicalSaved, NeoSaved,
});
