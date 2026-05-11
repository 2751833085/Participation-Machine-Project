// NeoUI main app inventory screens: map, creation flows, camera proof,
// admin, and the popup menus/sheets used around the primary app.

function NeoMapTexture({ dark, children }) {
  const base1 = dark ? '#263133' : '#d9e0d6';
  const base2 = dark ? '#313b38' : '#edf0e6';
  const road = dark ? 'rgba(230,220,200,0.12)' : 'rgba(60,91,83,0.18)';
  const park = dark ? 'rgba(70,96,73,0.34)' : 'rgba(160,184,147,0.45)';
  const water = dark ? 'rgba(52,78,88,0.32)' : 'rgba(164,190,199,0.55)';
  return (
    <div style={{
      position: 'relative', overflow: 'hidden',
      background: base1,
      backgroundImage: `
        linear-gradient(28deg, transparent 0 46%, ${water} 46% 58%, transparent 58%),
        radial-gradient(circle at 28% 28%, ${park} 0 14%, transparent 14%),
        radial-gradient(circle at 72% 72%, ${park} 0 12%, transparent 12%),
        repeating-linear-gradient(35deg, transparent 0 34px, ${road} 34px 37px, transparent 37px 82px),
        repeating-linear-gradient(102deg, transparent 0 42px, ${road} 42px 45px, transparent 45px 96px),
        linear-gradient(135deg, ${base1}, ${base2})
      `,
      ...children?.props?.style,
    }}>
      {children}
    </div>
  );
}

function NeoMiniIcon({ children, bg, color }) {
  return (
    <div style={{
      width: 40, height: 40, aspectRatio: '1 / 1', borderRadius: '50%',
      background: bg, color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>{children}</div>
  );
}

function NeoPill({ active, children, C, dark }) {
  return (
    <div style={{
      padding: '8px 13px', borderRadius: 999,
      background: active ? C.deep : C.surface,
      color: active ? (dark ? C.bg : '#fef5df') : C.text,
      border: active ? 'none' : `1px solid ${C.border}`,
      fontFamily: NEO_DISPLAY, fontWeight: 800, fontSize: 12,
      letterSpacing: '0.08em', textTransform: 'uppercase',
      whiteSpace: 'nowrap',
    }}>{children}</div>
  );
}

function NeoMapExplore({ dark }) {
  const C = dark ? NEO.dark : NEO.light;
  const pins = [
    { x: '28%', y: '32%', bg: C.cardPeach, fg: nFg(dark, '#5a2615'), n: 1 },
    { x: '56%', y: '42%', bg: C.cardMint, fg: nFg(dark, '#1d5c4d'), n: 2 },
    { x: '42%', y: '62%', bg: C.cardMustard, fg: nFg(dark, '#3e3310'), n: 3 },
    { x: '72%', y: '25%', bg: C.cardLav, fg: nFg(dark, '#3f2a56'), n: 4 },
  ];
  return (
    <div style={{ width: '100%', height: '100%', background: C.bg, position: 'relative', overflow: 'hidden', fontFamily: NEO_UI, color: C.text }}>
      <NeoMapTexture dark={dark}>
        <div style={{ position: 'absolute', inset: 0 }} />
      </NeoMapTexture>
      <div style={{ position: 'absolute', inset: 0 }}>
        {pins.map((p) => (
          <div key={p.n} style={{
            position: 'absolute', left: p.x, top: p.y, transform: 'translate(-50%,-50%)',
            width: 42, height: 42, aspectRatio: '1 / 1', borderRadius: '50%',
            background: p.bg, color: p.fg,
            border: `3px solid ${dark ? '#242b2c' : '#f7f3ea'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            fontFamily: NEO_DISPLAY, fontWeight: 800, fontSize: 18,
            boxShadow: '0 8px 18px rgba(0,0,0,0.24)',
          }}>{p.n}</div>
        ))}
      </div>

      <div style={{ position: 'absolute', top: 58, left: 14, right: 14, display: 'flex', gap: 10, alignItems: 'center' }}>
        <div style={{
          flex: 1, height: 48, borderRadius: 999, background: C.surface,
          border: `1px solid ${C.border}`, boxShadow: '0 8px 22px rgba(0,0,0,0.16)',
          display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px',
        }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></svg>
          <span style={{ color: C.muted, fontSize: 13, fontWeight: 700 }}>Search Manhattan hunts</span>
        </div>
        <button style={{ width: 48, height: 48, aspectRatio: '1 / 1', borderRadius: '50%', border: `1px solid ${C.border}`, background: C.surface, color: C.deep, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M4 6h16M7 12h10M10 18h4"/></svg>
        </button>
      </div>

      <div style={{ position: 'absolute', top: 118, left: 14, right: 14, display: 'flex', gap: 8, overflow: 'hidden' }}>
        {['Nearby', 'Fast', 'Scenic', 'Open now'].map((x, i) => <NeoPill key={x} active={i === 0} C={C} dark={dark}>{x}</NeoPill>)}
      </div>

      <div style={{
        position: 'absolute', left: 14, right: 14, bottom: 98,
        padding: 16, borderRadius: 24,
        background: C.cardPeach, color: nFg(dark, '#5a2615'),
        boxShadow: '0 10px 28px rgba(0,0,0,0.26), 0 4px 0 rgba(0,0,0,0.16)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <NeoPhoto dark={dark} hue={40} label="Map card" style={{ width: 84, height: 84, borderRadius: 18, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.78 }}>0.4 mi · 30 min</div>
            <div style={{ fontFamily: NEO_DISPLAY, fontSize: 28, lineHeight: 0.9, fontWeight: 700, textTransform: 'uppercase', marginTop: 3 }}>
              Central Park Circuit
            </div>
            <div style={{ marginTop: 9, display: 'flex', gap: 7 }}>
              <span style={{ padding: '5px 9px', borderRadius: 999, background: 'rgba(0,0,0,0.14)', fontFamily: NEO_DISPLAY, fontWeight: 800, fontSize: 11 }}>5 spots</span>
              <span style={{ padding: '5px 9px', borderRadius: 999, background: 'rgba(0,0,0,0.14)', fontFamily: NEO_DISPLAY, fontWeight: 800, fontSize: 11 }}>+50</span>
            </div>
          </div>
        </div>
      </div>
      <NeoDock active="hunts" dark={dark} />
    </div>
  );
}

function NeoCreatePicker({ dark }) {
  const C = dark ? NEO.dark : NEO.light;
  const cards = [
    { title: 'Map Builder', sub: 'Place checkpoint zones on Manhattan map.', bg: C.cardMint, fg: nFg(dark, '#1d5c4d'), icon: '⌖' },
    { title: 'Quick Draft', sub: 'Write the hunt first, add photos later.', bg: C.cardPeach, fg: nFg(dark, '#5a2615'), icon: '✎' },
    { title: 'Import Photos', sub: 'Start from a camera roll sequence.', bg: C.cardLav, fg: nFg(dark, '#3f2a56'), icon: '▣' },
  ];
  return (
    <div style={{ width: '100%', height: '100%', background: C.bg, position: 'relative', overflow: 'hidden', fontFamily: NEO_UI, color: C.text }}>
      <div style={{ height: '100%', overflowY: 'auto', padding: '60px 14px 110px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <button style={{ width: 42, height: 42, aspectRatio: '1 / 1', borderRadius: '50%', border: `1px solid ${C.border}`, background: C.surface, color: C.deep, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
          <div style={{ fontFamily: NEO_DISPLAY, fontSize: 13, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.muted }}>Create</div>
          <div style={{ width: 42 }} />
        </div>
        <h1 style={{ fontFamily: NEO_DISPLAY, fontWeight: 700, fontSize: 66, lineHeight: 0.84, letterSpacing: '-0.04em', color: C.deep, textTransform: 'uppercase', margin: '0 0 18px' }}>
          Build<br/>a hunt.
        </h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {cards.map((card, i) => (
            <div key={card.title} style={{ background: card.bg, color: card.fg, borderRadius: 26, padding: 18, boxShadow: '0 4px 0 rgba(0,0,0,0.14)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', opacity: 0.78 }}>Option 0{i + 1}</div>
                  <div style={{ fontFamily: NEO_DISPLAY, fontSize: 36, lineHeight: 0.88, fontWeight: 700, textTransform: 'uppercase', marginTop: 6 }}>{card.title}</div>
                  <p style={{ margin: '10px 0 0', fontSize: 13, lineHeight: 1.35, fontWeight: 650, opacity: 0.86 }}>{card.sub}</p>
                </div>
                <div style={{ width: 62, height: 62, borderRadius: 18, background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: NEO_DISPLAY, fontSize: 34, fontWeight: 800 }}>{card.icon}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <NeoDock active="create" dark={dark} />
    </div>
  );
}

function NeoCreateMapSheet({ dark }) {
  const C = dark ? NEO.dark : NEO.light;
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', fontFamily: NEO_UI, color: C.text, background: C.bg }}>
      <NeoMapTexture dark={dark}>
        <div style={{ position: 'absolute', inset: 0 }} />
      </NeoMapTexture>
      <div style={{ position: 'absolute', top: 60, left: 14, right: 14, display: 'grid', gridTemplateColumns: '44px 1fr 44px', gap: 10 }}>
        <button style={{ width: 44, height: 44, aspectRatio: '1 / 1', border: `1px solid ${C.border}`, background: C.surface, color: C.deep, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0, fontSize: 20, lineHeight: 1 }}>×</button>
        <div style={{ border: `1px solid ${C.border}`, background: C.surface, borderRadius: 999, display: 'flex', alignItems: 'center', padding: '0 14px', color: C.muted, fontSize: 12, fontWeight: 700 }}>Bethesda Fountain</div>
        <button style={{ width: 44, height: 44, aspectRatio: '1 / 1', border: `1px solid ${C.border}`, background: C.surface, color: C.deep, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0, fontSize: 18, lineHeight: 1 }}>⌖</button>
      </div>
      <div style={{
        position: 'absolute', left: '50%', top: '40%', transform: 'translate(-50%,-50%)',
        width: 96, height: 96, aspectRatio: '1 / 1', borderRadius: '50%',
        border: `2px solid ${C.accent}`, background: `${C.accentSoft}55`,
      }} />
      <div style={{
        position: 'absolute', left: '50%', top: '40%', transform: 'translate(-50%,-100%)',
        width: 42, height: 42, aspectRatio: '1 / 1', borderRadius: '50%', background: C.accent, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: NEO_DISPLAY, fontWeight: 800, boxShadow: '0 8px 18px rgba(0,0,0,0.28)',
      }}>1</div>

      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        borderTopLeftRadius: 30, borderTopRightRadius: 30,
        background: C.bg, borderTop: `1px solid ${C.border}`,
        padding: '12px 14px 28px', boxShadow: '0 -18px 44px rgba(0,0,0,0.28)',
      }}>
        <div style={{ width: 48, height: 5, borderRadius: 999, background: C.border, margin: '0 auto 14px' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
          <div>
            <div style={{ color: C.accent, fontSize: 10, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase' }}>Checkpoint zone</div>
            <div style={{ fontFamily: NEO_DISPLAY, color: C.deep, fontSize: 32, fontWeight: 700, lineHeight: 0.9, textTransform: 'uppercase' }}>Bethesda<br/>Fountain</div>
          </div>
          <NeoPill active C={C} dark={dark}>80m</NeoPill>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {['Area: Central Park', 'Photo required', 'Hint enabled', 'Public draft'].map((x, i) => (
            <div key={x} style={{ padding: 12, borderRadius: 16, background: i === 0 ? C.cardMint : C.surface, color: i === 0 ? nFg(dark, '#1d5c4d') : C.text, border: i === 0 ? 'none' : `1px solid ${C.border}`, fontSize: 12, fontWeight: 750 }}>{x}</div>
          ))}
        </div>
        <button style={{ marginTop: 12, width: '100%', height: 54, borderRadius: 999, border: 'none', background: C.accent, color: '#fff', fontFamily: NEO_DISPLAY, fontWeight: 800, fontSize: 18, letterSpacing: '0.05em', textTransform: 'uppercase', boxShadow: '0 4px 0 rgba(0,0,0,0.22)' }}>
          Use this spot
        </button>
      </div>
    </div>
  );
}

function NeoPhotoProof({ dark }) {
  const C = dark ? NEO.dark : NEO.light;
  return (
    <div style={{ width: '100%', height: '100%', background: dark ? '#182021' : '#23302d', position: 'relative', overflow: 'hidden', fontFamily: NEO_UI, color: '#fff' }}>
      <NeoPhoto dark hue={160} label="Live camera preview" style={{ position: 'absolute', inset: 0, opacity: 0.78 }} />
      <div style={{ position: 'absolute', top: 60, left: 14, right: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button style={{ width: 44, height: 44, aspectRatio: '1 / 1', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.24)', background: 'rgba(0,0,0,0.22)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0, fontSize: 20, lineHeight: 1 }}>×</button>
        <div style={{ padding: '8px 14px', borderRadius: 999, background: 'rgba(0,0,0,0.28)', fontFamily: NEO_DISPLAY, fontWeight: 800, fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Checkpoint 3/5</div>
        <button style={{ width: 44, height: 44, aspectRatio: '1 / 1', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.24)', background: 'rgba(0,0,0,0.22)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0, fontSize: 18, lineHeight: 1 }}>⚡</button>
      </div>
      <div style={{
        position: 'absolute', left: '50%', top: '43%', transform: 'translate(-50%,-50%)',
        width: 248, height: 248, borderRadius: 36,
        border: '3px solid rgba(255,255,255,0.82)',
        boxShadow: '0 0 0 999px rgba(0,0,0,0.34), inset 0 0 0 1px rgba(0,0,0,0.18)',
      }} />
      <div style={{ position: 'absolute', left: 24, right: 24, bottom: 128, textAlign: 'center' }}>
        <div style={{ fontFamily: NEO_DISPLAY, fontSize: 40, lineHeight: 0.88, fontWeight: 700, textTransform: 'uppercase' }}>Frame the<br/>Bronze Angel</div>
        <div style={{ marginTop: 10, fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.78)' }}>Hold steady. Auto-capture when matched.</div>
      </div>
      <div style={{ position: 'absolute', bottom: 38, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 36 }}>
        <div style={{ width: 56, height: 56, aspectRatio: '1 / 1', borderRadius: '50%', background: 'rgba(255,255,255,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>↺</div>
        <div style={{ width: 82, height: 82, aspectRatio: '1 / 1', borderRadius: '50%', background: C.accent, border: '5px solid rgba(255,255,255,0.72)', boxShadow: '0 8px 24px rgba(0,0,0,0.28)', flexShrink: 0 }} />
        <div style={{ width: 56, height: 56, aspectRatio: '1 / 1', borderRadius: '50%', background: 'rgba(255,255,255,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✓</div>
      </div>
    </div>
  );
}

function NeoAdminDashboard({ dark }) {
  const C = dark ? NEO.dark : NEO.light;
  const rows = [
    { title: 'Reports queue', n: 8, bg: C.cardPeach, fg: nFg(dark, '#5a2615') },
    { title: 'Pending hunts', n: 12, bg: C.cardLav, fg: nFg(dark, '#3f2a56') },
    { title: 'Photo flags', n: 3, bg: C.cardMustard, fg: nFg(dark, '#3e3310') },
  ];
  return (
    <div style={{ width: '100%', height: '100%', background: C.bg, position: 'relative', overflow: 'hidden', fontFamily: NEO_UI, color: C.text }}>
      <div style={{ height: '100%', overflowY: 'auto', padding: '60px 14px 110px' }}>
        <div style={{ color: C.accent, fontSize: 10, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase' }}>Admin portal</div>
        <h1 style={{ margin: '6px 0 18px', fontFamily: NEO_DISPLAY, color: C.deep, fontSize: 64, fontWeight: 700, lineHeight: 0.84, letterSpacing: '-0.04em', textTransform: 'uppercase' }}>Ops<br/>console.</h1>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <div style={{ gridColumn: 'span 2', borderRadius: 24, padding: 18, background: C.cardMint, color: nFg(dark, '#1d5c4d'), boxShadow: '0 4px 0 rgba(0,0,0,0.14)' }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', opacity: 0.75 }}>Today</div>
            <div style={{ fontFamily: NEO_DISPLAY, fontSize: 58, fontWeight: 700, lineHeight: 0.85 }}>426</div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>runs started · 91 completed</div>
          </div>
          {rows.map((r) => (
            <div key={r.title} style={{ borderRadius: 20, padding: 14, background: r.bg, color: r.fg, boxShadow: '0 3px 0 rgba(0,0,0,0.12)' }}>
              <div style={{ fontFamily: NEO_DISPLAY, fontSize: 42, fontWeight: 700, lineHeight: 0.9 }}>{r.n}</div>
              <div style={{ marginTop: 5, fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.78 }}>{r.title}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {['Approve: Midtown after dark', 'Report: blurred checkpoint photo', 'User appeal: missing merits'].map((x, i) => (
            <div key={x} style={{ padding: 14, borderRadius: 17, background: C.surface, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontFamily: NEO_DISPLAY, color: C.accent, fontSize: 24, fontWeight: 800 }}>0{i + 1}</div>
              <div style={{ flex: 1, fontFamily: NEO_DISPLAY, color: C.deep, fontSize: 18, lineHeight: 0.95, fontWeight: 700, textTransform: 'uppercase' }}>{x}</div>
              <span style={{ color: C.muted }}>›</span>
            </div>
          ))}
        </div>
      </div>
      <NeoDock active="profile" dark={dark} />
    </div>
  );
}

function NeoProfileMenuSheet({ dark }) {
  const C = dark ? NEO.dark : NEO.light;
  const rows = [
    ['Edit profile', 'Change username and avatar'],
    ['Appearance', 'Light · dark · system'],
    ['Language', 'English / Chinese'],
    ['Privacy', 'Saved hunts and visibility'],
    ['Sign out', 'Leave this device'],
  ];
  return (
    <div style={{ width: '100%', height: '100%', background: C.bg, position: 'relative', overflow: 'hidden', fontFamily: NEO_UI, color: C.text }}>
      <NeoProfile dark={dark} />
      <div style={{ position: 'absolute', inset: 0, background: dark ? 'rgba(13,17,18,0.58)' : 'rgba(36,43,44,0.32)', backdropFilter: 'blur(8px)' }} />
      <div style={{ position: 'absolute', left: 12, right: 12, bottom: 18, borderRadius: 30, padding: 16, background: C.surface, border: `1px solid ${C.border}`, boxShadow: '0 20px 56px rgba(0,0,0,0.35)' }}>
        <div style={{ width: 44, height: 5, borderRadius: 999, background: C.border, margin: '0 auto 14px' }} />
        <div style={{ fontFamily: NEO_DISPLAY, color: C.deep, fontSize: 34, fontWeight: 700, lineHeight: 0.9, textTransform: 'uppercase', marginBottom: 12 }}>Account<br/>menu.</div>
        {rows.map((r, i) => (
          <div key={r[0]} style={{ display: 'grid', gridTemplateColumns: '40px 1fr auto', gap: 12, alignItems: 'center', padding: '12px 0', borderTop: i === 0 ? 'none' : `1px solid ${C.border}`, color: r[0] === 'Sign out' ? C.accent : C.text }}>
            <NeoMiniIcon bg={i === 1 ? C.cardMint : i === 2 ? C.cardLav : C.bgAlt} color={i === 1 ? nFg(dark, '#1d5c4d') : i === 2 ? nFg(dark, '#3f2a56') : C.deep}>{i + 1}</NeoMiniIcon>
            <div>
              <div style={{ fontFamily: NEO_DISPLAY, fontSize: 18, fontWeight: 700, textTransform: 'uppercase', lineHeight: 1 }}>{r[0]}</div>
              <div style={{ fontSize: 11, color: C.muted, fontWeight: 650, marginTop: 2 }}>{r[1]}</div>
            </div>
            <span style={{ color: C.muted }}>›</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NeoFilterSheet({ dark }) {
  const C = dark ? NEO.dark : NEO.light;
  return (
    <div style={{ width: '100%', height: '100%', background: C.bg, position: 'relative', overflow: 'hidden', fontFamily: NEO_UI, color: C.text }}>
      <NeoHome dark={dark} />
      <div style={{ position: 'absolute', inset: 0, background: dark ? 'rgba(13,17,18,0.5)' : 'rgba(36,43,44,0.25)', backdropFilter: 'blur(7px)' }} />
      <div style={{ position: 'absolute', left: 12, right: 12, bottom: 18, borderRadius: 30, padding: 16, background: C.bg, border: `1px solid ${C.border}`, boxShadow: '0 20px 56px rgba(0,0,0,0.35)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 14 }}>
          <div>
            <div style={{ color: C.accent, fontSize: 10, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase' }}>Refine hunts</div>
            <div style={{ fontFamily: NEO_DISPLAY, color: C.deep, fontSize: 36, fontWeight: 700, lineHeight: 0.9, textTransform: 'uppercase' }}>Filters.</div>
          </div>
          <button style={{ width: 38, height: 38, aspectRatio: '1 / 1', borderRadius: '50%', background: C.surface, color: C.deep, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0, fontSize: 18, lineHeight: 1 }}>×</button>
        </div>
        {[
          ['Distance', ['Near me', '1 mi', '5 mi']],
          ['Duration', ['15m', '30m', '45m+']],
          ['Mood', ['Scenic', 'Food', 'History']],
        ].map((group, gi) => (
          <div key={group[0]} style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: NEO_DISPLAY, fontSize: 15, fontWeight: 800, color: C.deep, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>{group[0]}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {group[1].map((x, i) => <NeoPill key={x} active={(gi + i) % 3 === 0} C={C} dark={dark}>{x}</NeoPill>)}
            </div>
          </div>
        ))}
        <button style={{ width: '100%', height: 52, borderRadius: 999, border: 'none', background: C.accent, color: '#fff', fontFamily: NEO_DISPLAY, fontSize: 18, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', boxShadow: '0 4px 0 rgba(0,0,0,0.22)' }}>Show 24 hunts</button>
      </div>
    </div>
  );
}

function NeoReportModal({ dark }) {
  const C = dark ? NEO.dark : NEO.light;
  return (
    <div style={{ width: '100%', height: '100%', background: C.bg, position: 'relative', overflow: 'hidden', fontFamily: NEO_UI, color: C.text }}>
      <NeoChallenge dark={dark} />
      <div style={{ position: 'absolute', inset: 0, background: dark ? 'rgba(13,17,18,0.58)' : 'rgba(36,43,44,0.32)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 }}>
        <div style={{ width: '100%', borderRadius: 28, padding: 18, background: C.surface, border: `1px solid ${C.border}`, boxShadow: '0 20px 56px rgba(0,0,0,0.36)' }}>
          <div style={{ width: 54, height: 54, borderRadius: '50%', background: C.cardPeach, color: nFg(dark, '#5a2615'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: NEO_DISPLAY, fontSize: 30, fontWeight: 800, marginBottom: 12 }}>!</div>
          <div style={{ fontFamily: NEO_DISPLAY, color: C.deep, fontSize: 36, fontWeight: 700, lineHeight: 0.9, textTransform: 'uppercase' }}>Report<br/>this hunt?</div>
          <p style={{ margin: '10px 0 14px', color: C.muted, fontSize: 13, lineHeight: 1.45, fontWeight: 650 }}>Choose a reason so the admin queue can triage it quickly.</p>
          {['Unsafe route', 'Wrong checkpoint', 'Offensive content'].map((x, i) => (
            <div key={x} style={{ padding: '12px 14px', borderRadius: 16, background: i === 1 ? C.cardMustard : C.bgAlt, color: i === 1 ? nFg(dark, '#3e3310') : C.text, marginBottom: 8, fontWeight: 750 }}>{x}</div>
          ))}
          <div style={{ height: 78, borderRadius: 18, background: C.bgAlt, border: `1px solid ${C.border}`, padding: 12, color: C.muted, fontSize: 12, fontWeight: 650 }}>Add details...</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.25fr', gap: 10, marginTop: 12 }}>
            <button style={{ height: 50, borderRadius: 999, border: `1px solid ${C.border}`, background: 'transparent', color: C.text, fontFamily: NEO_DISPLAY, fontWeight: 800, fontSize: 16 }}>Cancel</button>
            <button style={{ height: 50, borderRadius: 999, border: 'none', background: C.accent, color: '#fff', fontFamily: NEO_DISPLAY, fontWeight: 800, fontSize: 16 }}>Submit report</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function NeoPublishSuccess({ dark }) {
  const C = dark ? NEO.dark : NEO.light;
  return (
    <div style={{ width: '100%', height: '100%', background: C.bg, position: 'relative', overflow: 'hidden', fontFamily: NEO_UI, color: C.text }}>
      <NeoCreate dark={dark} />
      <div style={{ position: 'absolute', inset: 0, background: dark ? 'rgba(13,17,18,0.62)' : 'rgba(36,43,44,0.34)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 }}>
        <div style={{ width: '100%', borderRadius: 30, padding: 20, background: C.cardMint, color: nFg(dark, '#1d5c4d'), boxShadow: '0 20px 56px rgba(0,0,0,0.36), 0 4px 0 rgba(0,0,0,0.18)' }}>
          <div style={{ fontFamily: NEO_DISPLAY, fontSize: 86, lineHeight: 0.8, fontWeight: 700 }}>✓</div>
          <div style={{ fontFamily: NEO_DISPLAY, fontSize: 54, lineHeight: 0.84, fontWeight: 700, letterSpacing: '-0.04em', textTransform: 'uppercase', marginTop: 8 }}>Hunt<br/>published.</div>
          <p style={{ margin: '12px 0 18px', fontSize: 13, lineHeight: 1.45, fontWeight: 700 }}>Midtown After Dark is live and ready for players. Share the review link or open the hunt page.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button style={{ height: 50, borderRadius: 999, border: 'none', background: 'rgba(255,255,255,0.22)', color: 'currentColor', fontFamily: NEO_DISPLAY, fontWeight: 800, fontSize: 16 }}>Share</button>
            <button style={{ height: 50, borderRadius: 999, border: 'none', background: C.accent, color: '#fff', fontFamily: NEO_DISPLAY, fontWeight: 800, fontSize: 16 }}>View hunt</button>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  NeoMapExplore,
  NeoCreatePicker,
  NeoCreateMapSheet,
  NeoPhotoProof,
  NeoAdminDashboard,
  NeoProfileMenuSheet,
  NeoFilterSheet,
  NeoReportModal,
  NeoPublishSuccess,
});
