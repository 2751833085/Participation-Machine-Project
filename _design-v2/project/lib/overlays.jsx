// Overlay screens — daily welcome splash, confirmation modals, top banners.
// Renders the underlying home in each theme so the overlay has honest context.

// ─── shared helpers ──────────────────────────────────────
function Scrim({ children, dark }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 40,
      background: dark ? 'rgba(8,6,4,0.56)' : 'rgba(28,22,14,0.42)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>{children}</div>
  );
}

// ═══════════════════════════════════════════════════════════
// CLASSICAL — Daily welcome splash (auto-dismiss, no action)
// ═══════════════════════════════════════════════════════════
function ClassicalDailyWelcome({ dark }) {
  const C = dark ? CLC.dark : CLC.light;
  // Full-bleed parchment splash — shows for ~2s on launch, then fades.
  return (
    <div style={{
      width: '100%', height: '100%', position: 'relative',
      background: dark ? '#0b0907' : '#2a241c',
      fontFamily: CL_UI, color: dark ? C.text : '#f5f1e8',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    }}>
      {/* Soft vignette glow */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `radial-gradient(ellipse at center, ${dark ? 'rgba(196,165,116,0.14)' : 'rgba(196,165,116,0.18)'} 0%, transparent 55%)`,
      }}/>

      <div style={{ position: 'relative', textAlign: 'center', padding: '0 36px' }}>
        {/* Ornamental rule */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 18, color: C.accent }}>
          <div style={{ width: 28, height: 1, background: 'currentColor', opacity: 0.5 }}/>
          <div style={{ fontFamily: CL_DISPLAY, fontStyle: 'italic', fontSize: 16, fontWeight: 500 }}>t</div>
          <div style={{ width: 28, height: 1, background: 'currentColor', opacity: 0.5 }}/>
        </div>

        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: C.accent, marginBottom: 14 }}>
          Saturday, April 19
        </div>

        <h1 style={{
          fontFamily: CL_DISPLAY, fontWeight: 500, fontSize: 48,
          lineHeight: 1, letterSpacing: '-0.03em', margin: 0,
          color: dark ? C.text : '#f5f1e8',
        }}>
          <span style={{ fontStyle: 'italic' }}>Welcome</span> back,<br/>trailblazer.
        </h1>

        <p style={{ margin: '20px 0 0', fontSize: 13, color: dark ? C.muted : 'rgba(245,241,232,0.7)', lineHeight: 1.55, fontStyle: 'italic', fontFamily: CL_DISPLAY, fontWeight: 400 }}>
          Partly cloudy, 62°F · 3 hunts await.
        </p>
      </div>

      {/* Progress bar indicating auto-dismiss */}
      <div style={{
        position: 'absolute', bottom: 72, left: '50%', transform: 'translateX(-50%)',
        width: 160, height: 2, background: 'rgba(196,165,116,0.2)', borderRadius: 2, overflow: 'hidden',
      }}>
        <div style={{ width: '62%', height: '100%', background: C.accent }}/>
      </div>
      <div style={{
        position: 'absolute', bottom: 48, left: '50%', transform: 'translateX(-50%)',
        fontSize: 9, fontWeight: 600, letterSpacing: '0.24em', textTransform: 'uppercase',
        color: dark ? C.muted : 'rgba(245,241,232,0.5)',
      }}>
        Dismissing in 1s
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// CLASSICAL — Confirmation modal (end hunt)
// ═══════════════════════════════════════════════════════════
function ClassicalConfirmModal({ dark }) {
  const C = dark ? CLC.dark : CLC.light;
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: C.bg }}>
      <ClassicalRun dark={dark}/>
      <Scrim dark={dark}>
        <div style={{
          width: '100%', maxWidth: 320,
          background: C.surface, borderRadius: 18,
          border: `1px solid ${C.border}`, padding: 22,
          boxShadow: C.shadowMd, fontFamily: CL_UI, color: C.text,
        }}>
          <h3 style={{
            fontFamily: CL_DISPLAY, fontWeight: 600, fontSize: 22,
            letterSpacing: '-0.02em', margin: '0 0 8px',
          }}>
            End the hunt?
          </h3>
          <p style={{ margin: '0 0 18px', fontSize: 13, color: C.muted, lineHeight: 1.5 }}>
            You've finished 2 of 5 checkpoints. Quitting now forfeits your 18:42 on the clock — merits won't count.
          </p>
          <button style={{
            width: '100%', height: 46, borderRadius: 10, border: 'none',
            background: C.danger, color: '#fff',
            fontFamily: CL_UI, fontSize: 14, fontWeight: 600, marginBottom: 8, cursor: 'pointer',
          }}>End hunt</button>
          <button style={{
            width: '100%', height: 46, borderRadius: 10,
            border: `1px solid ${C.borderStrong}`, background: 'transparent',
            color: C.text, fontFamily: CL_UI, fontSize: 14, fontWeight: 500, cursor: 'pointer',
          }}>Keep going</button>
        </div>
      </Scrim>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// CLASSICAL — Top banner notification
// ═══════════════════════════════════════════════════════════
function ClassicalBanner({ dark }) {
  const C = dark ? CLC.dark : CLC.light;
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: C.bg }}>
      <ClassicalHome dark={dark}/>
      {/* Top banner */}
      <div style={{
        position: 'absolute', top: 56, left: 14, right: 14, zIndex: 40,
        padding: 14, borderRadius: 16,
        background: C.surface, border: `1px solid ${C.border}`,
        boxShadow: C.shadowMd, fontFamily: CL_UI,
        display: 'flex', gap: 12, alignItems: 'flex-start',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: C.accentSoft, color: C.accent, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: CL_DISPLAY, fontWeight: 700, fontSize: 16,
        }}>✓</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.accent, marginBottom: 2 }}>
            Checkpoint saved
          </div>
          <div style={{ fontFamily: CL_DISPLAY, fontWeight: 600, fontSize: 16, color: C.text, letterSpacing: '-0.01em', lineHeight: 1.2, marginBottom: 2 }}>
            "Bronze Angel" — +10 merits
          </div>
          <div style={{ fontSize: 11, color: C.muted }}>Photo uploaded · 2s ago</div>
        </div>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" style={{ marginTop: 4 }}><path d="M18 6 6 18M6 6l12 12"/></svg>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// NEO — Daily welcome splash (auto-dismiss, no action)
// ═══════════════════════════════════════════════════════════
function NeoDailyWelcome({ dark }) {
  const C = dark ? NEO.dark : NEO.light;
  return (
    <div style={{
      width: '100%', height: '100%', position: 'relative',
      background: C.accent, color: '#fff',
      fontFamily: NEO_UI,
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
      overflow: 'hidden', padding: '0 28px',
    }}>
      {/* Big brand mark */}
      <div style={{
        position: 'absolute', top: 60, left: 28,
        fontFamily: NEO_DISPLAY, fontWeight: 800, fontSize: 22,
        letterSpacing: '0.02em', opacity: 0.85,
      }}>TOURGO</div>
      <div style={{
        position: 'absolute', top: 60, right: 28,
        fontFamily: NEO_UI, fontSize: 11, fontWeight: 800, letterSpacing: '0.14em',
        textTransform: 'uppercase', opacity: 0.75,
      }}>Sat · 4/19 · 62°F</div>

      {/* Big slab greeting */}
      <div style={{
        fontFamily: NEO_DISPLAY, fontWeight: 700, fontSize: 108,
        lineHeight: 0.82, letterSpacing: '-0.04em', textTransform: 'uppercase',
      }}>
        Hey<br/>
        <span style={{ color: dark ? NEO.dark.cardPeach : '#fef5df' }}>trail-<br/>blazer.</span>
      </div>

      <div style={{
        marginTop: 22, fontSize: 14, fontWeight: 700,
        letterSpacing: '0.02em', opacity: 0.9, maxWidth: 260,
      }}>
        3 hunts within 10 blocks.
      </div>

      {/* Bonus pill */}
      <div style={{
        marginTop: 18, alignSelf: 'flex-start',
        padding: '8px 14px', borderRadius: 999,
        background: 'rgba(0,0,0,0.16)',
        fontFamily: NEO_DISPLAY, fontWeight: 700, fontSize: 14,
        letterSpacing: '0.04em', textTransform: 'uppercase',
      }}>★ +10 Daily Bonus</div>

      <div style={{
        position: 'absolute', bottom: 30, left: 28, right: 28,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontFamily: NEO_DISPLAY, fontSize: 11, fontWeight: 800,
        letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.75,
      }}>
        <span>Loading hunts</span>
        <div style={{ transform: 'scale(0.32)', transformOrigin: 'center', width: 48, height: 48, display: 'grid', placeItems: 'center', color: '#fff' }}>
          <NeoRoseOrbitLoader dark={dark} size={112} label="" sublabel="" compact bare colorOverride="#fff" />
        </div>
        <span>1s</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// NEO — Confirmation modal
// ═══════════════════════════════════════════════════════════
function NeoConfirmModal({ dark }) {
  const C = dark ? NEO.dark : NEO.light;
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: C.bg }}>
      <NeoRun dark={dark}/>
      <Scrim dark={dark}>
        <div style={{
          width: '100%', maxWidth: 320,
          background: C.surface, borderRadius: 22, padding: 20,
          border: `1px solid ${C.border}`,
          boxShadow: '0 12px 40px rgba(0,0,0,0.28)',
          fontFamily: NEO_UI,
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: C.cardPeach, color: nFg(dark, '#5a2615'),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: NEO_DISPLAY, fontWeight: 800, fontSize: 26,
            margin: '0 auto 14px',
          }}>!</div>
          <div style={{
            fontFamily: NEO_DISPLAY, fontWeight: 700, fontSize: 28,
            lineHeight: 0.92, letterSpacing: '-0.02em', textTransform: 'uppercase',
            textAlign: 'center', color: C.deep, marginBottom: 8,
          }}>
            End this hunt?
          </div>
          <p style={{ margin: '0 0 18px', fontSize: 13, color: C.muted, lineHeight: 1.5, textAlign: 'center', fontWeight: 500 }}>
            2 of 5 done. Quitting now drops your 18:42 run — no merits earned.
          </p>
          <button style={{
            width: '100%', height: 50, borderRadius: 999, border: 'none',
            background: C.accent, color: '#fff',
            fontFamily: NEO_DISPLAY, fontWeight: 800, fontSize: 17,
            letterSpacing: '0.04em', textTransform: 'uppercase',
            marginBottom: 8, boxShadow: '0 4px 0 rgba(0,0,0,0.22)', cursor: 'pointer',
          }}>End Hunt</button>
          <button style={{
            width: '100%', height: 50, borderRadius: 999,
            background: 'transparent', color: C.deep,
            border: `1.5px solid ${C.border}`,
            fontFamily: NEO_DISPLAY, fontWeight: 700, fontSize: 16,
            letterSpacing: '0.04em', textTransform: 'uppercase', cursor: 'pointer',
          }}>Keep Going</button>
        </div>
      </Scrim>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// NEO — Top banner notification
// ═══════════════════════════════════════════════════════════
function NeoBanner({ dark }) {
  const C = dark ? NEO.dark : NEO.light;
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: C.bg }}>
      <NeoHome dark={dark}/>
      <div style={{
        position: 'absolute', top: 54, left: 12, right: 12, zIndex: 40,
        padding: '12px 14px', borderRadius: 20,
        background: C.cardMint, color: nFg(dark, '#1d5c4d'),
        boxShadow: '0 6px 16px rgba(0,0,0,0.22), 0 3px 0 rgba(0,0,0,0.14)',
        fontFamily: NEO_UI,
        display: 'flex', gap: 12, alignItems: 'center',
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: 'rgba(255,255,255,0.3)', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: NEO_DISPLAY, fontWeight: 800, fontSize: 22,
        }}>✓</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.75, marginBottom: 2 }}>
            Saved · +10 merits
          </div>
          <div style={{
            fontFamily: NEO_DISPLAY, fontWeight: 700, fontSize: 18,
            lineHeight: 1, letterSpacing: '-0.01em', textTransform: 'uppercase',
          }}>
            Bronze Angel ✓
          </div>
        </div>
        <div style={{
          fontFamily: NEO_DISPLAY, fontWeight: 700, fontSize: 14,
          opacity: 0.65, letterSpacing: '0.04em',
        }}>2s</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// CLASSICAL — Hunt reviews / comments
// ═══════════════════════════════════════════════════════════
function ClassicalComments({ dark }) {
  const C = dark ? CLC.dark : CLC.light;
  const reviews = [
    { name: 'Maya L.', when: '2d ago', stars: 5, body: 'The Bronze Angel checkpoint was a revelation — I\'ve walked past it for years and never noticed the inscription. Worth every minute.', merit: 'Founder' },
    { name: 'Daniel R.', when: '4d ago', stars: 4, body: 'Pace was just right for a Sunday. One of the photo spots was hard to find in the rain — maybe add a hint.', merit: '120 hunts' },
    { name: 'Priya S.', when: '1w ago', stars: 5, body: 'My partner and I made an afternoon of it. The Bethesda prompt is genuinely clever.', merit: 'Central Park' },
  ];
  const Star = ({ filled }) => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill={filled ? C.accent : 'none'} stroke={C.accent} strokeWidth="1.6" strokeLinejoin="round">
      <path d="m12 2 3 7h7l-5.7 4.2L18 21l-6-4.5L6 21l1.7-7.8L2 9h7z"/>
    </svg>
  );
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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: C.muted }}>
            Central Park Circuit
          </div>
          <div style={{ width: 36 }}/>
        </div>

        {/* Title + aggregate */}
        <div style={{ padding: '22px 20px 14px' }}>
          <h1 style={{
            fontFamily: CL_DISPLAY, fontWeight: 500, fontSize: 40,
            lineHeight: 1.02, letterSpacing: '-0.03em', margin: '0 0 14px',
          }}>
            <span style={{ fontStyle: 'italic' }}>Reviews</span><br/>& remarks.
          </h1>

          <div style={{
            display: 'flex', alignItems: 'flex-end', gap: 16,
            padding: '14px 0 16px', borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`,
          }}>
            <div>
              <div style={{ fontFamily: CL_DISPLAY, fontWeight: 500, fontSize: 54, letterSpacing: '-0.03em', lineHeight: 1, color: C.text }}>
                4.7
              </div>
              <div style={{ display: 'flex', gap: 2, marginTop: 4 }}>
                {[1,2,3,4,5].map(i => <Star key={i} filled={i <= 5}/>)}
              </div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, paddingBottom: 2 }}>
              {[{n:5,w:78},{n:4,w:16},{n:3,w:4},{n:2,w:1},{n:1,w:1}].map(r => (
                <div key={r.n} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, color: C.muted }}>
                  <span style={{ width: 8, fontFamily: CL_DISPLAY, fontWeight: 600, fontSize: 12, color: C.text }}>{r.n}</span>
                  <div style={{ flex: 1, height: 4, background: C.border, borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${r.w}%`, height: '100%', background: C.accent }}/>
                  </div>
                  <span style={{ width: 22, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{r.w}%</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 10, fontStyle: 'italic', fontFamily: CL_DISPLAY }}>
            Based on 248 completed hunts.
          </div>
        </div>

        {/* Review list */}
        <div style={{ padding: '4px 20px 0' }}>
          {reviews.map((r, idx) => (
            <div key={idx} style={{
              padding: '18px 0',
              borderTop: idx === 0 ? `1px solid ${C.border}` : 'none',
              borderBottom: `1px solid ${C.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: '50%',
                  background: C.accentSoft, color: C.accent,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: CL_DISPLAY, fontWeight: 700, fontSize: 14,
                }}>{r.name[0]}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: CL_DISPLAY, fontWeight: 600, fontSize: 16, color: C.text, letterSpacing: '-0.01em' }}>
                    {r.name}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.muted }}>
                    {r.merit} · {r.when}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 1 }}>
                  {[1,2,3,4,5].map(i => <Star key={i} filled={i <= r.stars}/>)}
                </div>
              </div>
              <p style={{
                margin: 0, fontSize: 13.5, lineHeight: 1.55, color: C.text,
                fontFamily: CL_DISPLAY, fontWeight: 400,
              }}>
                {r.body}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Write-review CTA */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        padding: '14px 20px 28px',
        background: `linear-gradient(to top, ${C.bg} 65%, ${C.bg}00)`,
      }}>
        <button style={{
          width: '100%', height: 50, borderRadius: 12, border: 'none',
          background: C.accent, color: dark ? C.bg : '#fdf9f3',
          fontFamily: CL_UI, fontSize: 14, fontWeight: 600, letterSpacing: '0.02em',
          boxShadow: C.shadowMd, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          Write a review
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// NEO — Hunt reviews / comments
// ═══════════════════════════════════════════════════════════
function NeoComments({ dark }) {
  const C = dark ? NEO.dark : NEO.light;
  const reviews = [
    { name: 'Maya', when: '2d', stars: 5, body: 'Bronze Angel was the sneakiest checkpoint. Walked past it for years. Ten stars if I could.', tint: C.cardLav, fg: nFg(dark, '#3f2a56') },
    { name: 'Daniel', when: '4d', stars: 4, body: 'Solid Sunday pace. One photo spot was tricky in the rain — could use a hint.', tint: C.cardMustard, fg: nFg(dark, '#3e3310') },
    { name: 'Priya', when: '1w', stars: 5, body: 'Made an afternoon of it. The Bethesda prompt is *clever*.', tint: C.cardMint, fg: nFg(dark, '#1d5c4d') },
  ];
  const Star = ({ filled, color }) => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill={filled ? color : 'none'} stroke={color} strokeWidth="2" strokeLinejoin="round">
      <path d="m12 2 3 7h7l-5.7 4.2L18 21l-6-4.5L6 21l1.7-7.8L2 9h7z"/>
    </svg>
  );
  return (
    <div style={{
      width: '100%', height: '100%', background: C.bg,
      fontFamily: NEO_UI, color: C.text, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ height: '100%', overflowY: 'auto', paddingBottom: 110 }}>
        {/* Top bar */}
        <div style={{ padding: '60px 14px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button style={{
            width: 42, height: 42, borderRadius: '50%',
            background: C.surface, border: `1px solid ${C.border}`, color: C.deep,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div style={{
            fontFamily: NEO_DISPLAY, fontWeight: 800, fontSize: 13,
            letterSpacing: '0.14em', textTransform: 'uppercase', color: C.muted,
          }}>Central Park Circuit</div>
          <div style={{ width: 42 }}/>
        </div>

        {/* Slab aggregate block */}
        <div style={{
          margin: '16px 14px 0', padding: '20px 20px 22px', borderRadius: 24,
          background: C.cardPeach, color: nFg(dark, '#5a2615'),
          boxShadow: '0 3px 0 rgba(0,0,0,0.14)',
        }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 4, opacity: 0.8 }}>
            Reviews · 248
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
            <div style={{
              fontFamily: NEO_DISPLAY, fontWeight: 700, fontSize: 90,
              lineHeight: 0.82, letterSpacing: '-0.04em',
            }}>4.7</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 2, marginBottom: 8 }}>
                {[1,2,3,4,5].map(i => <Star key={i} filled color={nFg(dark, '#5a2615')}/>)}
              </div>
              <div style={{
                fontFamily: NEO_DISPLAY, fontWeight: 700, fontSize: 22,
                lineHeight: 0.9, letterSpacing: '-0.02em', textTransform: 'uppercase',
              }}>
                "Clever &<br/>well-paced."
              </div>
            </div>
          </div>
          {/* Bar breakdown */}
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[{n:5,w:78},{n:4,w:16},{n:3,w:4},{n:2,w:1},{n:1,w:1}].map(r => (
              <div key={r.n} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, fontFamily: NEO_DISPLAY, fontWeight: 800, fontSize: 12 }}>{r.n}</span>
                <div style={{ flex: 1, height: 5, background: 'rgba(0,0,0,0.14)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: `${r.w}%`, height: '100%', background: 'currentColor' }}/>
                </div>
                <span style={{ width: 28, fontFamily: NEO_DISPLAY, fontWeight: 700, fontSize: 11, textAlign: 'right', letterSpacing: '0.04em' }}>{r.w}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Filter chips */}
        <div style={{ padding: '16px 14px 6px', display: 'flex', gap: 8, overflowX: 'auto' }}>
          {['All', '★★★★★', 'With photos', 'Recent'].map((f, i) => (
            <div key={f} style={{
              padding: '7px 14px', borderRadius: 999,
              background: i === 0 ? C.deep : C.surface,
              color: i === 0 ? (dark ? C.bg : '#fef5df') : C.text,
              border: i === 0 ? 'none' : `1px solid ${C.border}`,
              fontFamily: NEO_DISPLAY, fontWeight: 700, fontSize: 13,
              letterSpacing: '0.04em', textTransform: 'uppercase',
              whiteSpace: 'nowrap', flexShrink: 0,
            }}>{f}</div>
          ))}
        </div>

        {/* Review cards */}
        <div style={{ padding: '6px 14px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {reviews.map((r, idx) => (
            <div key={idx} style={{
              padding: 16, borderRadius: 20,
              background: r.tint, color: r.fg,
              boxShadow: '0 2px 0 rgba(0,0,0,0.1)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: NEO_DISPLAY, fontWeight: 800, fontSize: 15,
                }}>{r.name[0]}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: NEO_DISPLAY, fontWeight: 800, fontSize: 17, letterSpacing: '-0.01em', textTransform: 'uppercase', lineHeight: 1 }}>
                    {r.name}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.75, marginTop: 3 }}>
                    {r.when} ago
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 1 }}>
                  {[1,2,3,4,5].map(i => <Star key={i} filled={i <= r.stars} color={r.fg}/>)}
                </div>
              </div>
              <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5, fontWeight: 500 }}>
                {r.body}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        padding: '14px 14px 28px',
        background: `linear-gradient(to top, ${C.bg} 60%, ${C.bg}00)`,
      }}>
        <button style={{
          width: '100%', height: 54, borderRadius: 999, border: 'none',
          background: C.accent, color: '#fff',
          fontFamily: NEO_DISPLAY, fontWeight: 800, fontSize: 18,
          letterSpacing: '0.04em', textTransform: 'uppercase',
          boxShadow: '0 4px 0 rgba(0,0,0,0.22)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          ★ Drop a review
        </button>
      </div>
    </div>
  );
}

Object.assign(window, {
  ClassicalDailyWelcome, ClassicalConfirmModal, ClassicalBanner, ClassicalComments,
  NeoDailyWelcome, NeoConfirmModal, NeoBanner, NeoComments,
});
