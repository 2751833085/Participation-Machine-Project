// Shell.jsx — App shell, dock nav, header
// Exports: AppShell, Dock, AppHeader

const COLORS_LIGHT = {
  bg: '#f3ece2', bgWarm: '#e8dfd2',
  surface: '#fdf9f3', surface2: '#efe8dc',
  text: '#221e1a', textMuted: '#5e564c',
  border: '#dcd3c4', borderStrong: '#c9bfb0',
  accent: '#5c4a38', accentHover: '#453624',
  accentSoft: 'rgba(92,74,56,0.14)',
  shadow: '0 1px 3px rgba(42,37,32,0.06)',
  shadowMd: '0 10px 28px rgba(42,37,32,0.08)',
};

const COLORS_DARK = {
  bg: '#141210', bgWarm: '#1c1915',
  surface: '#221e19', surface2: '#2e2923',
  text: '#f5f0e8', textMuted: '#9a9288',
  border: '#3d3730', borderStrong: '#524a41',
  accent: '#c4a574', accentHover: '#d4b88a',
  accentSoft: 'rgba(196,165,116,0.18)',
  shadow: '0 1px 3px rgba(42,37,32,0.12)',
  shadowMd: '0 10px 28px rgba(42,37,32,0.14)',
};

// Icon SVGs as constants
const ICONS = {
  hunts: (fill) => fill
    ? <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
    : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
  saved: (fill) => fill
    ? <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
    : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>,
  plus: (fill) => fill
    ? <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="10.25" y="5" width="3.5" height="14" rx="1.75"/><rect x="5" y="10.25" width="14" height="3.5" rx="1.75"/></svg>
    : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>,
  rank: (fill) => fill
    ? <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="4" y="10" width="5" height="11" rx="1"/><rect x="15" y="6" width="5" height="15" rx="1"/><rect x="9.5" y="14" width="5" height="7" rx="1"/></svg>
    : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><rect x="4" y="10" width="5" height="11" rx="1"/><rect x="15" y="6" width="5" height="15" rx="1"/><rect x="9.5" y="14" width="5" height="7" rx="1"/></svg>,
  profile: (fill) => fill
    ? <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="12" cy="8" r="4"/><ellipse cx="12" cy="19" rx="6.5" ry="3.75"/></svg>
    : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20a8 8 0 0 1 16 0"/></svg>,
  sun: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  moon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
};

function Dock({ active, onNav, dark }) {
  const C = dark ? COLORS_DARK : COLORS_LIGHT;
  const tabs = [
    { key: 'hunts', label: 'Hunts', icon: ICONS.hunts },
    { key: 'saved', label: 'Saved', icon: ICONS.saved },
    { key: 'create', label: 'Create', fab: true },
    { key: 'rank',  label: 'Rank',  icon: ICONS.rank },
    { key: 'profile', label: 'Profile', icon: ICONS.profile },
  ];
  return (
    <nav style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 50,
      background: `color-mix(in srgb, ${C.surface} 94%, transparent)`,
      borderTop: `1px solid color-mix(in srgb, ${C.border} 80%, ${C.accentSoft})`,
      backdropFilter: 'blur(16px)',
      paddingBottom: 'max(8px, env(safe-area-inset-bottom, 0px))',
    }}>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr auto 1fr 1fr',
        gap: '2px', padding: '1px 4px 0', maxWidth: '100%',
      }}>
        {tabs.map(t => {
          const isActive = active === t.key;
          if (t.fab) {
            return (
              <button key={t.key} onClick={() => onNav(t.key)} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 2, padding: '4px 0', background: 'none', border: 'none', cursor: 'pointer',
                color: C.textMuted,
              }}>
                <div style={{
                  width: 46, height: 46, borderRadius: '50%',
                  background: `linear-gradient(145deg, ${C.accentHover}, ${C.accent})`,
                  color: '#fdf9f3', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 4px 16px color-mix(in srgb, ${C.accent} 42%, transparent), 0 0 0 1px rgba(255,255,255,0.12) inset`,
                }}>
                  {ICONS.plus(isActive)}
                </div>
                <span style={{ fontSize: '.58rem', fontWeight: 600, letterSpacing: '.04em', color: C.textMuted }}>Create</span>
              </button>
            );
          }
          // Per original CSS: outer tabs drop .3rem; inner tabs (flanking FAB) nudge outward .42rem + drop .3rem
        const tabIndex = tabs.indexOf(t); // 0=hunts,1=saved,3=rank,4=profile
        const tabTransform = tabIndex === 1
          ? 'translate(-0.42rem, 0.3rem)'
          : tabIndex === 3
            ? 'translate(0.42rem, 0.3rem)'
            : 'translateY(0.3rem)';

        return (
            <button key={t.key} onClick={() => onNav(t.key)} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 2, padding: '5px 0', background: 'none', border: 'none', cursor: 'pointer',
              color: isActive ? C.text : C.textMuted,
              minHeight: 48,
              transform: tabTransform,
              transition: 'transform .22s, color .2s',
            }}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, transform: isActive ? 'scale(1.06)' : 'scale(1)', transition: 'transform .2s' }}>
                {t.icon(isActive)}
              </span>
              <span style={{ fontSize: '.58rem', fontWeight: 600, letterSpacing: '.04em', color: isActive ? C.text : C.textMuted }}>
                {t.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function AppHeader({ dark, onToggleTheme, meritPoints }) {
  const C = dark ? COLORS_DARK : COLORS_LIGHT;
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 40,
      minHeight: '3.5rem', display: 'flex', alignItems: 'center',
      borderBottom: `1px solid ${C.border}`,
      background: `color-mix(in srgb, ${C.surface} 88%, transparent)`,
      backdropFilter: 'blur(14px)', padding: '0 1rem',
      justifyContent: 'space-between',
    }}>
      <span style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 600, fontSize: '1.15rem', letterSpacing: '-0.02em', color: C.text }}>
        Tour<span style={{ color: C.accent }}>go</span>
      </span>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {meritPoints && (
          <span style={{ fontSize: '.72rem', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: C.textMuted, padding: '.35rem .65rem', border: `1px solid ${C.border}`, borderRadius: 999, background: C.surface, boxShadow: C.shadow }}>
            {meritPoints} pts
          </span>
        )}
        <button onClick={onToggleTheme} style={{
          width: '2.5rem', height: '2.5rem', padding: 0, borderRadius: 10,
          border: `1px solid ${C.border}`, background: C.surface, color: C.text,
          cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {dark ? ICONS.sun : ICONS.moon}
        </button>
      </div>
    </header>
  );
}

Object.assign(window, { AppHeader, Dock, COLORS_LIGHT, COLORS_DARK, ICONS });
