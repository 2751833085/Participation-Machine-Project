// RunPage.jsx — Live run timer, checkpoints, status banners
// Exports: RunPage, StatusBanner, TimerBar, CheckpointRow

function StatusBanner({ type, children, dark }) {
  const C = dark ? COLORS_DARK : COLORS_LIGHT;
  const styles = {
    ok:    { bg: dark ? 'rgba(122,171,132,.18)' : 'rgba(74,107,79,.15)',    border: dark ? 'rgba(122,171,132,.35)' : 'rgba(74,107,79,.35)' },
    error: { bg: dark ? 'rgba(224,122,122,.14)' : 'rgba(168,72,72,.12)',    border: dark ? 'rgba(224,122,122,.35)' : 'rgba(168,72,72,.35)' },
    info:  { bg: dark ? 'rgba(176,154,134,.14)' : 'rgba(122,92,69,.12)',    border: dark ? 'rgba(176,154,134,.25)' : 'rgba(122,92,69,.28)' },
  };
  const s = styles[type] || styles.info;
  return (
    <div style={{
      padding: '.85rem 1rem', borderRadius: 10,
      background: s.bg, border: `1px solid ${s.border}`,
      fontSize: '.92rem', color: C.text, marginBottom: '1rem', lineHeight: 1.5,
    }}>{children}</div>
  );
}

function TimerBar({ pct, dark }) {
  const C = dark ? COLORS_DARK : COLORS_LIGHT;
  return (
    <div style={{
      height: 8, borderRadius: 999, background: C.surface2,
      overflow: 'hidden', margin: '.65rem 0 1.25rem',
      border: `1px solid ${C.border}`,
    }}>
      <div style={{
        height: '100%', width: `${pct}%`,
        background: `linear-gradient(90deg, ${C.accent}, ${C.accentHover})`,
        transition: 'width .35s',
      }} />
    </div>
  );
}

function CheckpointRow({ index, hint, imageGradient, done, dark }) {
  const C = dark ? COLORS_DARK : COLORS_LIGHT;
  return (
    <div style={{
      display: 'flex', gap: '1rem', alignItems: 'flex-start',
      marginBottom: '1.1rem', paddingBottom: '1.1rem',
      borderBottom: `1px solid ${C.border}`,
    }}>
      <div style={{
        width: 96, height: 96, flexShrink: 0, borderRadius: 10,
        border: `1px solid ${C.border}`, boxShadow: C.shadow,
        background: imageGradient || C.bgWarm, overflow: 'hidden',
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <strong style={{ fontSize: '.95rem', color: C.text, display: 'block', marginBottom: 4 }}>
          Checkpoint {index + 1}
        </strong>
        {hint && <p style={{ margin: '0 0 .5rem', fontSize: '.88rem', color: C.textMuted }}>{hint}</p>}
        {done ? (
          <span style={{
            fontSize: '.65rem', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase',
            padding: '.28rem .5rem', borderRadius: 4, background: C.accentSoft, color: C.accent,
          }}>Photo submitted</span>
        ) : (
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            minHeight: 40, padding: '0 1rem', borderRadius: 10,
            border: `1px solid ${C.border}`, background: C.surface,
            fontSize: '.8rem', fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase',
            color: C.text, cursor: 'pointer', boxShadow: C.shadow,
          }}>Take checkpoint photo</div>
        )}
      </div>
    </div>
  );
}

function RunPage({ hunt, dark, timeLeft, pct, completedIndices }) {
  const C = dark ? COLORS_DARK : COLORS_LIGHT;
  const spots = hunt.spots || [];
  return (
    <div style={{ padding: '1rem 1rem 7rem' }}>
      <a style={{ display: 'inline-flex', alignItems: 'center', gap: '.35rem', fontSize: '.85rem', fontWeight: 600, color: C.textMuted, textDecoration: 'none', marginBottom: '1rem' }}>← Home</a>
      <h1 style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 600, fontSize: 'clamp(2.15rem,10.5vw,2.65rem)', lineHeight: 1.12, margin: '0 0 .55rem .45rem', letterSpacing: '-.025em', color: C.text }}>
        {hunt.title}
      </h1>
      {timeLeft > 0 ? (
        <StatusBanner type="info" dark={dark}>Time left: <strong>{formatTime(timeLeft)}</strong></StatusBanner>
      ) : (
        <StatusBanner type="ok" dark={dark}>You finished in time. Merits added to your profile.</StatusBanner>
      )}
      <TimerBar pct={pct} dark={dark} />
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: '1.15rem 1.25rem', boxShadow: C.shadowMd }}>
        {spots.map((s, i) => (
          <CheckpointRow
            key={i} index={i} hint={s.hint}
            imageGradient={s.gradient}
            done={completedIndices.includes(i)}
            dark={dark}
          />
        ))}
      </div>
    </div>
  );
}

function formatTime(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

Object.assign(window, { RunPage, StatusBanner, TimerBar, CheckpointRow, formatTime });
