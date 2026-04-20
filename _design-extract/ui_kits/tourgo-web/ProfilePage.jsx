// ProfilePage.jsx — Flowing profile layout + full-screen My Hunts overlay
// Exports: ProfilePage

const AVATAR_NAMES = [
  'Anonymous','Boy','Cat','Dog','Female_1','Female_2',
  'Ghoul','Girl','Lizard','Male_1','Male_2','Mouse',
  'Pig','Thiren_1','Thiren_2','Vampire'
];

const MY_HUNTS_SAMPLE = [
  { id:'mh1', title:'Central Park Circuit', spots:5, timeLimit:30, area:'Central Park', thumbGradient:'linear-gradient(135deg,#c8bfb0,#a89a88)', plays:14, meritsAwarded:280 },
  { id:'mh2', title:'SoHo Gallery Sprint',  spots:4, timeLimit:20, area:'SoHo',         thumbGradient:'linear-gradient(135deg,#b8c4b0,#90a888)', plays:7,  meritsAwarded:105 },
  { id:'mh3', title:'Chinatown Bites',      spots:3, timeLimit:15, area:'Chinatown',    thumbGradient:'linear-gradient(135deg,#d0c0b0,#b0a090)', plays:3,  meritsAwarded:42  },
];

function ProfilePage({ dark, themeMode, onSetTheme, selectedAvatar, onSelectAvatar, merits }) {
  const C = dark ? COLORS_DARK : COLORS_LIGHT;
  const [showMyHunts, setShowMyHunts] = React.useState(false);
  const [editingId, setEditingId] = React.useState(null);
  const [editTitle, setEditTitle] = React.useState('');

  // ── Divider row ──────────────────────────────────────────
  const Divider = () => <div style={{ height:1, background:C.border, margin:'0 0' }} />;

  // ── Setting row ──────────────────────────────────────────
  const Row = ({ label, sub, right, onClick, chevron, last, asDiv }) => {
    const Tag = (asDiv || !onClick) ? 'div' : 'button';
    return (
      <Tag onClick={onClick} style={{
        display:'flex', alignItems:'center', gap:'.85rem',
        width:'100%', padding:'.9rem 1rem', background:'none', border:'none',
        cursor: onClick ? 'pointer' : 'default', textAlign:'left',
        borderBottom: last ? 'none' : `1px solid ${C.border}`,
      }}>
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ margin:0, fontSize:'.92rem', color:C.text, fontWeight:500 }}>{label}</p>
          {sub && <p style={{ margin:'1px 0 0', fontSize:'.78rem', color:C.textMuted }}>{sub}</p>}
        </div>
        {right && <div style={{ flexShrink:0 }}>{right}</div>}
        {chevron && (
          <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
            <path d="M1 1l5 5-5 5" stroke={C.textMuted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </Tag>
    );
  };

  // ── Theme 3-way ───────────────────────────────────────────
  const ThemePill = ({ value, label }) => {
    const active = themeMode === value;
    return (
      <button onClick={() => onSetTheme(value)} style={{
        flex:1, padding:'.3rem 0', fontSize:'.68rem', fontWeight:700,
        letterSpacing:'.05em', textTransform:'uppercase',
        borderRadius:7, border:'none', cursor:'pointer',
        background: active ? C.accent : 'transparent',
        color: active ? '#fffcf5' : C.textMuted,
        transition:'background .18s, color .18s',
      }}>{label}</button>
    );
  };

  // ── My Hunts full-screen overlay ──────────────────────────
  const MyHuntsOverlay = () => (
    <div style={{
      position:'absolute', inset:0, zIndex:200,
      background: dark
        ? `radial-gradient(100% 55% at 50% -5%, color-mix(in srgb, ${C.accentSoft} 65%, transparent), transparent 52%), ${C.bg}`
        : `radial-gradient(100% 55% at 50% -5%, color-mix(in srgb, ${C.accentSoft} 65%, transparent), transparent 52%), ${C.bg}`,
      display:'flex', flexDirection:'column', overflowY:'auto',
    }}>
      {/* Header */}
      <div style={{
        display:'flex', alignItems:'center', gap:'.75rem',
        padding:'1rem 1rem .85rem',
        borderBottom:`1px solid ${C.border}`,
        background:`color-mix(in srgb, ${C.surface} 88%, transparent)`,
        backdropFilter:'blur(14px)',
        position:'sticky', top:0, zIndex:10,
      }}>
        <button onClick={() => { setShowMyHunts(false); setEditingId(null); }} style={{
          background:'none', border:`1px solid ${C.border}`, borderRadius:9,
          color:C.textMuted, cursor:'pointer', padding:'.35rem .65rem',
          fontSize:'.78rem', fontWeight:700, letterSpacing:'.06em', textTransform:'uppercase',
        }}>← Back</button>
        <span style={{ fontFamily:'"Cormorant Garamond", serif', fontWeight:600, fontSize:'1.15rem', color:C.text, flex:1 }}>My hunts</span>
        <button style={{
          background:C.accent, border:'none', borderRadius:9,
          color:'#fffcf5', cursor:'pointer', padding:'.4rem .8rem',
          fontSize:'.78rem', fontWeight:700, letterSpacing:'.06em', textTransform:'uppercase',
          boxShadow:`0 3px 10px color-mix(in srgb, ${C.accent} 32%, transparent)`,
        }}>+ New</button>
      </div>

      {/* Hunt list */}
      <div style={{ padding:'1rem', display:'flex', flexDirection:'column', gap:'.75rem', paddingBottom:'7rem' }}>
        {MY_HUNTS_SAMPLE.map(h => (
          <div key={h.id}>
            {/* Hunt row */}
            <div style={{
              background:C.surface, border:`1px solid ${C.border}`, borderRadius:16,
              overflow:'hidden', boxShadow:C.shadowMd,
            }}>
              {/* Thumb + info */}
              <div style={{ display:'flex', alignItems:'center', gap:'.85rem', padding:'.85rem 1rem' }}>
                <div style={{ width:52, height:52, borderRadius:10, background:h.thumbGradient, flexShrink:0, border:`1px solid ${C.border}` }} />
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ margin:0, fontSize:'.95rem', fontFamily:'"Cormorant Garamond", serif', fontWeight:600, color:C.text, lineHeight:1.25 }}>{h.title}</p>
                  <p style={{ margin:'3px 0 0', fontSize:'.78rem', color:C.textMuted }}>{h.spots} checkpoints · {h.timeLimit} min</p>
                </div>
              </div>
              {/* Stats strip */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', borderTop:`1px solid ${C.border}` }}>
                {[['Plays', h.plays], ['Merits awarded', h.meritsAwarded], ['Area', h.area]].map(([label, val]) => (
                  <div key={label} style={{ padding:'.6rem .85rem', borderRight:`1px solid ${C.border}`, lastChild:{borderRight:'none'} }}>
                    <p style={{ margin:0, fontSize:'.65rem', fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:C.textMuted }}>{label}</p>
                    <p style={{ margin:'2px 0 0', fontSize:'.92rem', fontWeight:600, color:C.text }}>{val}</p>
                  </div>
                ))}
              </div>
              {/* Actions */}
              <div style={{ display:'flex', gap:0, borderTop:`1px solid ${C.border}` }}>
                <button onClick={() => { setEditingId(editingId===h.id ? null : h.id); setEditTitle(h.title); }} style={{
                  flex:1, padding:'.65rem', background:'none', border:'none',
                  borderRight:`1px solid ${C.border}`,
                  color:C.text, fontSize:'.8rem', fontWeight:600, cursor:'pointer',
                }}>Edit</button>
                <button style={{
                  flex:1, padding:'.65rem', background:'none', border:'none',
                  color: dark ? '#e07a7a' : '#a84848',
                  fontSize:'.8rem', fontWeight:600, cursor:'pointer',
                }}>Delete</button>
              </div>
            </div>
            {/* Inline edit panel */}
            {editingId === h.id && (
              <div style={{
                marginTop:'.5rem', padding:'1rem', borderRadius:12,
                border:`1px solid ${C.borderStrong}`, background:C.surface2,
              }}>
                <p style={{ margin:'0 0 .65rem', fontSize:'.72rem', fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:C.textMuted }}>Edit title</p>
                <input value={editTitle} onChange={e=>setEditTitle(e.target.value)} style={{
                  width:'100%', padding:'.55rem .75rem', borderRadius:9,
                  border:`1px solid ${C.border}`, background:C.bg, color:C.text,
                  fontSize:'.92rem', fontFamily:'"DM Sans", sans-serif',
                  boxSizing:'border-box', marginBottom:'.65rem',
                }} />
                <div style={{ display:'flex', gap:'.5rem', justifyContent:'flex-end' }}>
                  <button onClick={()=>setEditingId(null)} style={{ height:36, padding:'0 .9rem', borderRadius:8, border:`1px solid ${C.border}`, background:'transparent', color:C.textMuted, fontSize:'.8rem', fontWeight:600, cursor:'pointer' }}>Cancel</button>
                  <button onClick={()=>setEditingId(null)} style={{ height:36, padding:'0 .9rem', borderRadius:8, border:'none', background:C.accent, color:'#fffcf5', fontSize:'.8rem', fontWeight:600, cursor:'pointer' }}>Save</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ position:'relative', minHeight:'100%' }}>
      {/* Main profile content */}
      <div style={{ paddingBottom:'7rem' }}>

        {/* Hero */}
        <div style={{ padding:'clamp(.55rem,2.2dvh,1rem) 1rem clamp(.45rem,1.4dvh,.85rem)', borderBottom:`1px solid color-mix(in srgb, ${C.border} 85%, ${C.accentSoft})`, marginBottom:'clamp(.5rem,1.6dvh,.85rem)' }}>
          <p style={{ margin:'0 0 .5rem .45rem', fontSize:'.72rem', fontWeight:700, letterSpacing:'.2em', textTransform:'uppercase', color:C.accent }}>Profile</p>
          <h1 style={{ margin:'0 0 0 .45rem', fontFamily:'"Cormorant Garamond", serif', fontSize:'clamp(2.2rem,11vw,2.75rem)', fontWeight:600, lineHeight:1.06, letterSpacing:'-.03em', color:C.text }}>Your account</h1>
        </div>

        {/* Identity strip */}
        <div style={{ display:'flex', alignItems:'center', gap:'1rem', padding:'1rem 1.25rem 1.25rem' }}>
          <div style={{ width:64, height:64, borderRadius:999, overflow:'hidden', border:`2px solid ${C.accent}`, flexShrink:0, background:C.bgWarm, boxShadow:`0 0 0 3px ${C.accentSoft}` }}>
            {selectedAvatar && <img src={`/assets/avatars/Avatar_Default_${selectedAvatar}.webp`} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />}
          </div>
          <div style={{ flex:1 }}>
            <p style={{ margin:0, fontFamily:'"Cormorant Garamond", serif', fontSize:'1.35rem', fontWeight:600, color:C.text, lineHeight:1.15 }}>Explorer</p>
            <p style={{ margin:'2px 0 0', fontSize:'.82rem', color:C.textMuted }}>NYC hunter</p>
          </div>
          <div style={{ textAlign:'right' }}>
            <p style={{ margin:0, fontFamily:'"Cormorant Garamond", serif', fontSize:'1.65rem', fontWeight:600, color:C.text }}>{merits}</p>
            <p style={{ margin:0, fontSize:'.65rem', fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:C.textMuted }}>merits</p>
          </div>
        </div>

        {/* Avatar picker — horizontal scroll */}
        <div style={{ padding:'0 1rem .2rem', marginBottom:'.5rem' }}>
          <p style={{ margin:'0 0 .55rem .1rem', fontSize:'.72rem', fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:C.textMuted }}>Avatar</p>
          <div style={{ display:'flex', gap:8, overflowX:'auto', paddingBottom:4, scrollbarWidth:'none' }}>
            {AVATAR_NAMES.map(name => (
              <button key={name} onClick={() => onSelectAvatar(name)} style={{
                padding:0, background:'none', flexShrink:0,
                border:`2px solid ${selectedAvatar===name ? C.accent : 'transparent'}`,
                borderRadius:999, cursor:'pointer', width:44, height:44, overflow:'hidden',
                outline: selectedAvatar===name ? `3px solid ${C.accentSoft}` : 'none',
                outlineOffset:1,
                transition:'border-color .15s',
              }}>
                <img src={`/assets/avatars/Avatar_Default_${name}.webp`} alt={name} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
              </button>
            ))}
          </div>
        </div>

        {/* Settings list — no card wrapper */}
        <div style={{ margin:'1rem 0 0', borderTop:`1px solid ${C.border}` }}>
          {/* My hunts */}
          <Row
            label="My hunts"
            sub={`${MY_HUNTS_SAMPLE.length} published · ${MY_HUNTS_SAMPLE.reduce((a,h)=>a+h.plays,0)} plays`}
            chevron
            onClick={() => setShowMyHunts(true)}
          />

          {/* Appearance */}
          <Row label="Appearance" right={
            <div style={{ display:'flex', background:C.surface2, borderRadius:9, padding:2, border:`1px solid ${C.border}`, gap:2, width:160 }}>
              <ThemePill value="light" label="Light" />
              <ThemePill value="dark"  label="Dark" />
              <ThemePill value="system" label="Device" />
            </div>
          } />

          {/* Notifications (placeholder toggle) */}
          <Row label="Notifications" sub="Hints and run reminders" right={
            <div style={{ width:44, height:24, borderRadius:999, background:C.surface2, border:`1px solid ${C.border}`, position:'relative', cursor:'pointer' }}>
              <div style={{ position:'absolute', top:2, left:2, width:18, height:18, borderRadius:'50%', background:C.textMuted }} />
            </div>
          } last />
        </div>

        {/* Sign out */}
        <div style={{ padding:'1rem 1rem 0' }}>
          <button style={{
            display:'flex', alignItems:'center', justifyContent:'center',
            minHeight:48, width:'100%', borderRadius:10,
            border:`1px solid ${C.border}`, background:'none',
            color:C.textMuted, fontSize:'.875rem', fontWeight:600,
            letterSpacing:'.02em', cursor:'pointer',
          }}>Sign out</button>
        </div>
      </div>

      {/* Full-screen My Hunts overlay */}
      {showMyHunts && <MyHuntsOverlay />}
    </div>
  );
}

Object.assign(window, { ProfilePage });
