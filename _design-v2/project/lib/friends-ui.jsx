// Tourgo Friends / Manhunt UI inventory.
// Same NeoUI visual system, tuned for room-based social gameplay.

const FRIENDS = {
  players: [
    { name: 'Maya', role: 'host', team: 'hunter', ready: true, avatar: 'Female_1' },
    { name: 'Leo', role: '', team: 'hunter', ready: true, avatar: 'Male_1' },
    { name: 'Aria', role: '', team: 'runner', ready: true, avatar: 'Girl' },
    { name: 'Noah', role: '', team: 'runner', ready: false, avatar: 'Boy' },
    { name: 'June', role: '', team: 'runner', ready: true, avatar: 'Cat' },
  ],
  chats: [
    ['Maya', 'Hunters freeze if we stall. Split north/south.'],
    ['Aria', 'Runners, use the fountain crowd.'],
    ['Leo', 'Scanning by the west gate now.'],
  ],
};

function FTheme(dark) {
  const C = dark ? NEO.dark : NEO.light;
  return {
    ...C,
    hunter: dark ? '#71c8bd' : '#3d7b72',
    runner: dark ? '#e2a07e' : '#bd6c4f',
    spectator: dark ? '#d7c5ee' : '#7c6aa1',
    danger: dark ? '#f08d78' : '#b95442',
    shell: dark ? '#202728' : '#ebe7dd',
  };
}

function FriendBase({ dark, children, dock = null, bg }) {
  const C = FTheme(dark);
  return (
    <div style={{
      width: '100%', height: '100%', background: bg || C.bg,
      fontFamily: NEO_UI, color: C.text, position: 'relative', overflow: 'hidden',
    }}>
      {children}
      {dock}
    </div>
  );
}

function FriendAvatar({ p, size = 48, dark, ring = false }) {
  const C = FTheme(dark);
  return (
    <div style={{
      width: size, height: size, aspectRatio: '1 / 1', borderRadius: '50%',
      overflow: 'hidden', flexShrink: 0,
      border: ring ? `3px solid ${p.team === 'hunter' ? C.hunter : C.runner}` : `1px solid ${C.border}`,
      background: C.surface,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: C.deep, fontFamily: NEO_DISPLAY, fontWeight: 800,
    }}>
      {p.avatar ? <img src={`assets/avatars/${p.avatar}.webp`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : p.name[0]}
    </div>
  );
}

function FriendDock({ dark, active = 'start', mode = 'home', role = 'hunter' }) {
  const C = FTheme(dark);
  const items = mode === 'spectator'
    ? [['stats', 'Stats'], ['allchat', 'All chat'], ['exit', 'Exit']]
    : mode === 'game'
      ? [['status', 'Status'], ['team', 'Team'], ['qr', role === 'hunter' ? 'Scan' : 'QR'], ['about', 'About']]
      : [['start', 'Start'], ['ranks', 'Ranks'], ['social', 'Social'], ['me', 'Me']];
  const cols = `repeat(${items.length}, 1fr)`;
  const activeColor = role === 'runner' ? C.runner : role === 'spectator' ? C.spectator : C.hunter;
  return (
    <nav style={{
      position: 'absolute', left: 14, right: 14, bottom: 14,
      borderRadius: 30, background: C.dock,
      border: `1px solid ${C.border}`,
      padding: '8px 10px 10px',
      display: 'grid', gridTemplateColumns: cols, gap: 6,
      boxShadow: '0 10px 26px rgba(0,0,0,0.18)',
    }}>
      {items.map(([id, label]) => {
        const on = id === active;
        return (
          <div key={id} style={{
            height: 48, borderRadius: 22,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: on ? activeColor : 'transparent',
            color: on ? '#fff' : C.muted,
            fontFamily: NEO_DISPLAY, fontWeight: 800, fontSize: 10,
            letterSpacing: '0.04em', textTransform: 'uppercase',
          }}>
            <FriendDockIcon id={id} />
            <span>{label}</span>
          </div>
        );
      })}
    </nav>
  );
}

function FriendDockIcon({ id }) {
  const props = { width: 19, height: 19, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.25, strokeLinecap: 'round', strokeLinejoin: 'round', style: { marginBottom: 2, flexShrink: 0 } };
  if (id === 'start') return <svg {...props}><path d="M7 5v14l11-7-11-7z"/></svg>;
  if (id === 'ranks') return <svg {...props}><path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v4a5 5 0 0 1-10 0V4z"/><path d="M5 6H3a3 3 0 0 0 3 3"/><path d="M19 6h2a3 3 0 0 1-3 3"/></svg>;
  if (id === 'social') return <svg {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
  if (id === 'me') return <svg {...props}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>;
  if (id === 'status') return <svg {...props}><circle cx="12" cy="12" r="8"/><path d="M12 8v5l3 2"/></svg>;
  if (id === 'team' || id === 'allchat') return <svg {...props}><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/><path d="M8 9h8"/><path d="M8 13h5"/></svg>;
  if (id === 'qr') return <svg {...props}><path d="M4 4h6v6H4z"/><path d="M14 4h6v6h-6z"/><path d="M4 14h6v6H4z"/><path d="M15 15h2"/><path d="M19 15h1"/><path d="M15 19h5"/><path d="M15 17v3"/></svg>;
  if (id === 'about') return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/></svg>;
  if (id === 'stats') return <svg {...props}><path d="M4 19V9"/><path d="M10 19V5"/><path d="M16 19v-7"/><path d="M22 19H2"/></svg>;
  if (id === 'exit') return <svg {...props}><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/></svg>;
  return <svg {...props}><circle cx="12" cy="12" r="8"/></svg>;
}

function FriendExitChip({ dark }) {
  const C = FTheme(dark);
  return (
    <div style={{
      position: 'absolute', top: 58, left: 14, zIndex: 5,
      padding: '8px 12px', borderRadius: 999,
      background: C.surface, border: `1px solid ${C.border}`,
      color: C.deep, fontFamily: NEO_DISPLAY, fontWeight: 800, fontSize: 12,
      letterSpacing: '0.08em', textTransform: 'uppercase',
    }}>‹ Tourgo</div>
  );
}

function FriendHero({ dark, kicker, title, copy, tone = 'mint' }) {
  const C = FTheme(dark);
  const bg = tone === 'peach' ? C.cardPeach : tone === 'lav' ? C.cardLav : tone === 'mustard' ? C.cardMustard : C.cardMint;
  const fg = tone === 'peach' ? nFg(dark, '#5a2615') : tone === 'lav' ? nFg(dark, '#3f2a56') : tone === 'mustard' ? nFg(dark, '#3e3310') : nFg(dark, '#1d5c4d');
  return (
    <div style={{ borderRadius: 28, background: bg, color: fg, padding: 20, boxShadow: '0 4px 0 rgba(0,0,0,0.14)' }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', opacity: 0.76 }}>{kicker}</div>
      <div style={{ fontFamily: NEO_DISPLAY, fontSize: 56, lineHeight: 0.84, fontWeight: 700, letterSpacing: '-0.04em', textTransform: 'uppercase', marginTop: 8 }}>{title}</div>
      <p style={{ margin: '12px 0 0', fontSize: 13, lineHeight: 1.42, fontWeight: 700, opacity: 0.88 }}>{copy}</p>
    </div>
  );
}

function FriendMetric({ dark, label, value, tone = 'surface' }) {
  const C = FTheme(dark);
  const bg = tone === 'hunter' ? C.hunter : tone === 'runner' ? C.runner : tone === 'danger' ? C.danger : C.surface;
  const color = tone === 'surface' ? C.text : '#fff';
  return (
    <div style={{ borderRadius: 18, background: bg, color, padding: 13, border: tone === 'surface' ? `1px solid ${C.border}` : 'none' }}>
      <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.72 }}>{label}</div>
      <div style={{ fontFamily: NEO_DISPLAY, fontSize: 32, fontWeight: 700, lineHeight: 0.9, marginTop: 4 }}>{value}</div>
    </div>
  );
}

function FriendRoomTop({ dark, title = 'Dusk Dash', sub = 'Lobby · Host', role = '' }) {
  const C = FTheme(dark);
  const roleColor = role === 'runner' ? C.runner : role === 'spectator' ? C.spectator : C.hunter;
  return (
    <div style={{ padding: '58px 14px 10px', display: 'grid', gridTemplateColumns: '44px 1fr auto', alignItems: 'center', gap: 10 }}>
      <button style={{ width: 44, height: 44, aspectRatio: '1 / 1', borderRadius: '50%', border: `1px solid ${C.border}`, background: C.surface, color: C.deep, padding: 0 }}>‹</button>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.muted }}>{sub}</div>
        <div style={{ fontFamily: NEO_DISPLAY, fontSize: 25, lineHeight: 0.9, fontWeight: 800, textTransform: 'uppercase', color: C.deep }}>{title}</div>
      </div>
      {role && <div style={{ padding: '7px 12px', borderRadius: 999, background: roleColor, color: '#fff', fontFamily: NEO_DISPLAY, fontWeight: 800, fontSize: 12, textTransform: 'uppercase' }}>{role}</div>}
    </div>
  );
}

function FriendPlayerTile({ dark, p }) {
  const C = FTheme(dark);
  return (
    <div style={{
      borderRadius: 18, background: C.surface, border: `1px solid ${C.border}`,
      padding: 10, display: 'grid', justifyItems: 'center', gap: 7,
    }}>
      <FriendAvatar p={p} dark={dark} size={52} ring={p.ready} />
      <div style={{ fontFamily: NEO_DISPLAY, fontSize: 15, lineHeight: 1, fontWeight: 800, color: C.deep, textTransform: 'uppercase' }}>{p.name}</div>
      <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: p.ready ? C.hunter : C.muted }}>{p.ready ? 'Ready' : 'Waiting'}</div>
    </div>
  );
}

function FriendChatPreview({ dark, team = 'all' }) {
  const C = FTheme(dark);
  return (
    <div style={{ borderRadius: 22, background: C.surface, border: `1px solid ${C.border}`, padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontFamily: NEO_DISPLAY, fontSize: 18, fontWeight: 800, color: C.deep, textTransform: 'uppercase' }}>{team === 'all' ? 'Lobby chat' : 'Team chat'}</div>
        <div style={{ color: C.muted, fontSize: 11, fontWeight: 800 }}>3 new</div>
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {FRIENDS.chats.map(([name, text], i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <FriendAvatar p={{ name, avatar: ['Female_1', 'Male_1', 'Girl'][i], team: i === 1 ? 'hunter' : 'runner' }} dark={dark} size={28} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, color: C.muted, fontWeight: 800 }}>{name}</div>
              <div style={{ fontSize: 12, color: C.text, lineHeight: 1.3, fontWeight: 650 }}>{text}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 10, height: 38, borderRadius: 999, background: C.bgAlt, color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', fontSize: 12, fontWeight: 700 }}>
        <span>Message...</span><span>↑</span>
      </div>
    </div>
  );
}

function FriendsStart({ dark }) {
  const C = FTheme(dark);
  return (
    <FriendBase dark={dark} dock={<FriendDock dark={dark} active="start" />}>
      <FriendExitChip dark={dark} />
      <div style={{ height: '100%', overflowY: 'auto', padding: '104px 14px 112px' }}>
        <FriendHero dark={dark} kicker="Tourgo Friends" title={<>Manhunt<br/>with friends.</>} copy="Create a room, lock in selfies, then split into Hunters and Runners across the city." />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
          <div style={{ borderRadius: 24, padding: 16, background: C.cardPeach, color: nFg(dark, '#5a2615'), minHeight: 176, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 3px 0 rgba(0,0,0,0.13)' }}>
            <div style={{ fontFamily: NEO_DISPLAY, fontSize: 54, fontWeight: 700, lineHeight: 0.8 }}>01</div>
            <div><div style={{ fontFamily: NEO_DISPLAY, fontSize: 30, fontWeight: 700, lineHeight: 0.86, textTransform: 'uppercase' }}>Create<br/>Room</div><div style={{ fontSize: 11, fontWeight: 800, marginTop: 6 }}>Host a game →</div></div>
          </div>
          <div style={{ borderRadius: 24, padding: 16, background: C.cardLav, color: nFg(dark, '#3f2a56'), minHeight: 176, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 3px 0 rgba(0,0,0,0.13)' }}>
            <div style={{ fontFamily: NEO_DISPLAY, fontSize: 54, fontWeight: 700, lineHeight: 0.8 }}>02</div>
            <div><div style={{ fontFamily: NEO_DISPLAY, fontSize: 30, fontWeight: 700, lineHeight: 0.86, textTransform: 'uppercase' }}>Join<br/>Room</div><div style={{ fontSize: 11, fontWeight: 800, marginTop: 6 }}>Use a code →</div></div>
          </div>
        </div>
        <div style={{ marginTop: 12, padding: 14, borderRadius: 18, background: C.surface, border: `1px solid ${C.border}`, color: C.muted, fontSize: 12, fontWeight: 700 }}>
          Signed in anonymous · friend code <b style={{ color: C.deep }}>MAYA07</b>
        </div>
      </div>
    </FriendBase>
  );
}

function FriendsCreateRoom({ dark }) {
  const C = FTheme(dark);
  const settings = [['Dispersal', '03 min'], ['Hunt', '40 min'], ['Photo lock', '06 min'], ['Freeze', '05 min']];
  return (
    <FriendBase dark={dark}>
      <FriendRoomTop dark={dark} title="Create room" sub="Host setup" />
      <div style={{ height: '100%', overflowY: 'auto', padding: '0 14px 28px' }}>
        <FriendHero dark={dark} tone="peach" kicker="Room name" title={<>Dusk<br/>Dash</>} copy="Friends join by code. You can tune timing before publishing the lobby." />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
          {settings.map((s, i) => <FriendMetric key={s[0]} dark={dark} label={s[0]} value={s[1]} tone={i === 1 ? 'hunter' : 'surface'} />)}
        </div>
        <button style={{ marginTop: 14, width: '100%', height: 56, borderRadius: 999, border: 'none', background: C.accent, color: '#fff', fontFamily: NEO_DISPLAY, fontSize: 20, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', boxShadow: '0 4px 0 rgba(0,0,0,0.22)' }}>Create room</button>
      </div>
    </FriendBase>
  );
}

function FriendsJoinRoom({ dark }) {
  const C = FTheme(dark);
  return (
    <FriendBase dark={dark}>
      <FriendRoomTop dark={dark} title="Join room" sub="Invite code" />
      <div style={{ padding: '18px 14px' }}>
        <div style={{ display: 'grid', gap: 14, justifyItems: 'center', marginTop: 54 }}>
          <div style={{ fontFamily: NEO_DISPLAY, color: C.deep, fontSize: 66, lineHeight: 0.84, fontWeight: 700, textTransform: 'uppercase', textAlign: 'center' }}>Enter<br/>code.</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, width: '100%' }}>
            {'739AQL'.split('').map((x) => <div key={x} style={{ height: 58, borderRadius: 16, background: C.surface, border: `1px solid ${C.border}`, color: C.deep, fontFamily: NEO_DISPLAY, fontSize: 32, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{x}</div>)}
          </div>
          <div style={{ width: '100%', borderRadius: 22, background: C.cardMint, color: nFg(dark, '#1d5c4d'), padding: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.75 }}>Found room</div>
            <div style={{ fontFamily: NEO_DISPLAY, fontSize: 34, lineHeight: 0.9, fontWeight: 700, textTransform: 'uppercase', marginTop: 5 }}>Dusk Dash</div>
            <div style={{ fontSize: 12, fontWeight: 700, marginTop: 8 }}>Host Maya · 4 players waiting</div>
          </div>
          <button style={{ width: '100%', height: 56, borderRadius: 999, border: 'none', background: C.accent, color: '#fff', fontFamily: NEO_DISPLAY, fontSize: 20, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Join lobby</button>
        </div>
      </div>
    </FriendBase>
  );
}

function FriendsRanks({ dark }) {
  const C = FTheme(dark);
  return (
    <FriendBase dark={dark} dock={<FriendDock dark={dark} active="ranks" />}>
      <FriendExitChip dark={dark} />
      <div style={{ padding: '106px 14px 112px', height: '100%', overflowY: 'auto' }}>
        <div style={{ color: C.accent, fontSize: 10, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase' }}>Friends ranks</div>
        <h1 style={{ margin: '6px 0 14px', fontFamily: NEO_DISPLAY, fontSize: 62, color: C.deep, lineHeight: 0.84, fontWeight: 700, textTransform: 'uppercase' }}>Hall of<br/>friends.</h1>
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 10 }}>
          <FriendMetric dark={dark} label="Captures" value="18" tone="hunter" />
          <FriendMetric dark={dark} label="Wins" value="04" tone="runner" />
          <FriendMetric dark={dark} label="Games" value="12" />
          <FriendMetric dark={dark} label="Hosted" value="05" />
        </div>
        <div style={{ marginTop: 14, display: 'grid', gap: 8 }}>
          {FRIENDS.players.slice(0, 4).map((p, i) => (
            <div key={p.name} style={{ display: 'grid', gridTemplateColumns: '36px 44px 1fr auto', gap: 10, alignItems: 'center', padding: 10, borderRadius: 18, background: C.surface, border: `1px solid ${C.border}` }}>
              <div style={{ fontFamily: NEO_DISPLAY, fontSize: 23, color: C.accent, fontWeight: 800 }}>#{i + 1}</div>
              <FriendAvatar p={p} dark={dark} size={40} />
              <div style={{ fontFamily: NEO_DISPLAY, color: C.deep, fontSize: 18, fontWeight: 800, textTransform: 'uppercase' }}>{p.name}</div>
              <div style={{ color: C.muted, fontWeight: 800, fontSize: 12 }}>{18 - i * 3}</div>
            </div>
          ))}
        </div>
      </div>
    </FriendBase>
  );
}

function FriendsSocial({ dark }) {
  const C = FTheme(dark);
  return (
    <FriendBase dark={dark} dock={<FriendDock dark={dark} active="social" />}>
      <FriendExitChip dark={dark} />
      <div style={{ padding: '106px 14px 112px', height: '100%', overflowY: 'auto' }}>
        <FriendHero dark={dark} tone="lav" kicker="Friend code" title={<>MAYA<br/>07</>} copy="Share your code or accept incoming requests before you start a room." />
        <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
          <div style={{ padding: 14, borderRadius: 20, background: C.cardPeach, color: nFg(dark, '#5a2615') }}>
            <div style={{ fontFamily: NEO_DISPLAY, fontSize: 20, fontWeight: 800, textTransform: 'uppercase' }}>Pending request</div>
            <div style={{ marginTop: 10, display: 'flex', gap: 10, alignItems: 'center' }}><FriendAvatar p={{ name: 'Iris', avatar: 'Female_2', team: 'runner' }} dark={dark} /><div style={{ flex: 1, fontWeight: 750 }}>Iris wants to add you</div><div style={{ fontFamily: NEO_DISPLAY, fontWeight: 800 }}>Accept</div></div>
          </div>
          {FRIENDS.players.slice(1, 5).map((p) => (
            <div key={p.name} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 12, borderRadius: 18, background: C.surface, border: `1px solid ${C.border}` }}>
              <FriendAvatar p={p} dark={dark} size={42} />
              <div style={{ flex: 1 }}><div style={{ fontFamily: NEO_DISPLAY, fontSize: 18, color: C.deep, fontWeight: 800, textTransform: 'uppercase' }}>{p.name}</div><div style={{ fontSize: 11, color: C.muted, fontWeight: 700 }}>Friend · ready to invite</div></div>
              <div style={{ color: C.hunter, fontFamily: NEO_DISPLAY, fontWeight: 800 }}>Invite</div>
            </div>
          ))}
        </div>
      </div>
    </FriendBase>
  );
}

function FriendsMe({ dark }) {
  const C = FTheme(dark);
  return (
    <FriendBase dark={dark} dock={<FriendDock dark={dark} active="me" />}>
      <FriendExitChip dark={dark} />
      <div style={{ padding: '106px 14px 112px', height: '100%', overflowY: 'auto' }}>
        <div style={{ borderRadius: 28, padding: 18, background: C.cardPeach, color: nFg(dark, '#5a2615'), boxShadow: '0 4px 0 rgba(0,0,0,0.14)' }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <FriendAvatar p={{ name: 'Maya', avatar: 'Female_1', team: 'hunter' }} dark={dark} size={78} ring />
            <div><div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.75 }}>Tourgo friend</div><div style={{ fontFamily: NEO_DISPLAY, fontSize: 36, lineHeight: 0.9, fontWeight: 700, textTransform: 'uppercase' }}>Maya<br/>NYC</div></div>
          </div>
        </div>
        <div style={{ marginTop: 14, display: 'grid', gap: 8 }}>
          {['Display name', 'Same as Tourgo', 'Camera permissions', 'Reset local stats'].map((x, i) => (
            <div key={x} style={{ padding: 15, borderRadius: 17, background: C.surface, border: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: NEO_DISPLAY, fontSize: 18, color: i === 3 ? C.danger : C.deep, fontWeight: 800, textTransform: 'uppercase' }}>{x}</span><span style={{ color: C.muted }}>›</span>
            </div>
          ))}
        </div>
      </div>
    </FriendBase>
  );
}

function FriendsLobby({ dark }) {
  const C = FTheme(dark);
  return (
    <FriendBase dark={dark}>
      <FriendRoomTop dark={dark} title="Dusk Dash" sub="Lobby · Host" />
      <div style={{ padding: '0 14px 24px', height: '100%', overflowY: 'auto' }}>
        <div style={{ borderRadius: 26, padding: 18, background: C.cardMustard, color: nFg(dark, '#3e3310'), textAlign: 'center', boxShadow: '0 4px 0 rgba(0,0,0,0.13)' }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase' }}>Room code</div>
          <div style={{ fontFamily: NEO_DISPLAY, fontSize: 66, fontWeight: 700, letterSpacing: '0.04em', lineHeight: 0.9 }}>739AQL</div>
          <div style={{ fontSize: 12, fontWeight: 800 }}>Tap to copy</div>
        </div>
        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {FRIENDS.players.map((p) => <FriendPlayerTile key={p.name} p={p} dark={dark} />)}
        </div>
        <div style={{ marginTop: 12 }}><FriendChatPreview dark={dark} /></div>
        <button style={{ marginTop: 12, width: '100%', height: 56, borderRadius: 999, border: 'none', background: C.hunter, color: '#fff', fontFamily: NEO_DISPLAY, fontSize: 20, fontWeight: 800, textTransform: 'uppercase' }}>Start game</button>
      </div>
    </FriendBase>
  );
}

function FriendsReadyCheck({ dark }) {
  const C = FTheme(dark);
  const votes = FRIENDS.players.map((p) => ({ ...p, vote: p.ready ? 'ready' : 'waiting' }));
  const readyCount = votes.filter((p) => p.vote === 'ready').length;
  const total = votes.length;
  return (
    <FriendBase dark={dark}>
      <FriendRoomTop dark={dark} title="Ready check" sub="Game starting" />
      <div style={{ height: 'calc(100% - 112px)', padding: '8px 14px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{
          borderRadius: 28, padding: 18,
          background: C.cardMint, color: nFg(dark, '#1d5c4d'),
          boxShadow: '0 4px 0 rgba(0,0,0,0.14)',
        }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', opacity: 0.76 }}>Everyone must agree</div>
          <div style={{ display: 'flex', alignItems: 'end', justifyContent: 'space-between', gap: 12, marginTop: 8 }}>
            <div style={{ fontFamily: NEO_DISPLAY, fontSize: 55, lineHeight: 0.84, fontWeight: 700, letterSpacing: '-0.04em', textTransform: 'uppercase' }}>Ready<br/>up.</div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: NEO_DISPLAY, fontSize: 52, lineHeight: 0.85, fontWeight: 800 }}>{readyCount}/{total}</div>
              <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.16em', textTransform: 'uppercase', opacity: 0.78 }}>agreed</div>
            </div>
          </div>
          <div style={{ marginTop: 12, height: 9, borderRadius: 999, background: 'rgba(0,0,0,0.12)', overflow: 'hidden' }}>
            <div style={{ width: `${(readyCount / total) * 100}%`, height: '100%', borderRadius: 999, background: 'currentColor', opacity: 0.82 }} />
          </div>
          <div style={{ marginTop: 10, fontSize: 12, lineHeight: 1.35, fontWeight: 800, opacity: 0.82 }}>
            Dispersal begins immediately after every player taps Ready. A single Cancel returns everyone to Lobby.
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
          {votes.map((p) => {
            const ready = p.vote === 'ready';
            const isHost = p.role === 'host';
            return (
              <div key={p.name} style={{
                minWidth: 0, position: 'relative',
                padding: '12px 5px 10px', borderRadius: 20,
                background: ready ? C.surface : C.bgAlt,
                border: `1.5px solid ${ready ? C.hunter : C.border}`,
                display: 'grid', justifyItems: 'center', gap: 6,
              }}>
                {isHost && <div style={{ position: 'absolute', top: -8, padding: '2px 7px', borderRadius: 999, background: C.cardMustard, color: nFg(dark, '#3e3310'), fontSize: 8, fontWeight: 900, letterSpacing: '0.12em' }}>HOST</div>}
                <FriendAvatar p={p} dark={dark} size={44} ring={ready} />
                <div style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: NEO_DISPLAY, color: C.deep, fontSize: 15, fontWeight: 800, textTransform: 'uppercase' }}>{p.name}</div>
                <div style={{ color: ready ? C.hunter : C.muted, fontSize: 9, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{ready ? 'Ready' : 'Waiting'}</div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 'auto', display: 'grid', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.35fr', gap: 10 }}>
            <button style={{ height: 54, borderRadius: 999, border: `1.5px solid ${C.border}`, background: 'transparent', color: C.text, fontFamily: NEO_DISPLAY, fontSize: 18, fontWeight: 800, textTransform: 'uppercase' }}>Cancel</button>
            <button style={{ height: 54, borderRadius: 999, border: 'none', background: C.hunter, color: '#fff', fontFamily: NEO_DISPLAY, fontSize: 18, fontWeight: 800, textTransform: 'uppercase', boxShadow: '0 4px 0 rgba(0,0,0,0.2)' }}>I'm ready</button>
          </div>
          <div style={{ borderRadius: 18, padding: '11px 13px', background: C.surface, border: `1px solid ${C.border}`, color: C.muted, fontSize: 12, fontWeight: 800, lineHeight: 1.35 }}>
            Waiting on <span style={{ color: C.deep }}>Noah</span>. Dispersal begins when everyone agrees.
          </div>
        </div>
      </div>
    </FriendBase>
  );
}

function FriendsRoleReveal({ dark, role = 'runner' }) {
  const C = FTheme(dark);
  const isHunter = role === 'hunter';
  const roleColor = isHunter ? C.hunter : C.runner;
  const nextCopy = isHunter ? 'Catch runners by scanning their QR.' : 'Hide first, survive the timer, avoid scans.';
  return (
    <FriendBase dark={dark} bg={dark ? '#121718' : '#f0ece3'}>
      <div style={{
        position: 'absolute', inset: 0,
        background: isHunter
          ? `radial-gradient(circle at 50% 28%, ${dark ? 'rgba(113,200,189,0.34)' : 'rgba(61,123,114,0.28)'}, transparent 46%)`
          : `radial-gradient(circle at 50% 28%, ${dark ? 'rgba(226,160,126,0.32)' : 'rgba(189,108,79,0.26)'}, transparent 46%)`,
      }} />
      <div style={{
        position: 'relative', zIndex: 1, height: '100%',
        display: 'grid', gridTemplateRows: '1fr auto 1fr', alignItems: 'center',
        padding: '72px 24px 42px', textAlign: 'center',
      }}>
        <div style={{ alignSelf: 'start', justifySelf: 'center', padding: '8px 14px', borderRadius: 999, background: C.surface, border: `1px solid ${C.border}`, color: C.muted, fontSize: 11, fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
          Dispersal complete · 5 sec
        </div>
        <div>
          <div style={{ width: 132, height: 132, borderRadius: '50%', margin: '0 auto 24px', background: roleColor, color: '#fff', display: 'grid', placeItems: 'center', boxShadow: `0 0 0 14px ${dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}, 0 22px 54px rgba(0,0,0,0.28)` }}>
            {isHunter ? (
              <svg width="58" height="58" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.15" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/><path d="M11 7v8"/><path d="M7 11h8"/></svg>
            ) : (
              <svg width="62" height="62" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.15" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3c-4 3.2-6 6.2-6 9a6 6 0 0 0 12 0c0-2.8-2-5.8-6-9Z"/><path d="M12 14v7"/><path d="M9 17h6"/></svg>
            )}
          </div>
          <div style={{ color: C.muted, fontSize: 12, fontWeight: 900, letterSpacing: '0.22em', textTransform: 'uppercase' }}>You are a</div>
          <div style={{ marginTop: 8, fontFamily: NEO_DISPLAY, color: roleColor, fontSize: 82, lineHeight: 0.8, fontWeight: 700, letterSpacing: '-0.05em', textTransform: 'uppercase' }}>
            {isHunter ? 'Hunter' : 'Runner'}.
          </div>
          <p style={{ maxWidth: 280, margin: '20px auto 0', color: C.text, fontSize: 15, lineHeight: 1.45, fontWeight: 750 }}>
            {nextCopy}
          </p>
        </div>
        <div style={{ alignSelf: 'end', display: 'grid', gap: 10 }}>
          <div style={{ height: 8, borderRadius: 999, background: C.bgAlt, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            <div style={{ width: '68%', height: '100%', borderRadius: 999, background: roleColor }} />
          </div>
          <div style={{ color: C.muted, fontSize: 11, fontWeight: 900, letterSpacing: '0.16em', textTransform: 'uppercase' }}>Entering game phase</div>
        </div>
      </div>
    </FriendBase>
  );
}

function FriendsRoleRevealRunner({ dark }) {
  return <FriendsRoleReveal dark={dark} role="runner" />;
}

function FriendsRoleRevealHunter({ dark }) {
  return <FriendsRoleReveal dark={dark} role="hunter" />;
}

function FriendsDispersal({ dark }) {
  const C = FTheme(dark);
  return (
    <FriendBase dark={dark}>
      <FriendRoomTop dark={dark} title="Dispersal" sub="Runners hide first" role="runner" />
      <div style={{ padding: '8px 14px 24px' }}>
        <div style={{ borderRadius: 32, padding: 24, background: C.cardPeach, color: nFg(dark, '#5a2615'), textAlign: 'center' }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase' }}>Remaining</div>
          <div style={{ fontFamily: NEO_DISPLAY, fontSize: 94, lineHeight: 0.82, fontWeight: 700 }}>02:41</div>
          <p style={{ margin: '12px 0 0', fontSize: 13, lineHeight: 1.4, fontWeight: 700 }}>Runners find a spot. Hunters wait until the timer releases.</p>
        </div>
        <div style={{ marginTop: 14 }}><FriendChatPreview dark={dark} team="all" /></div>
      </div>
    </FriendBase>
  );
}

function FriendsHunterStatus({ dark }) {
  const C = FTheme(dark);
  return (
    <FriendBase dark={dark} dock={<FriendDock dark={dark} active="status" mode="game" role="hunter" />}>
      <FriendRoomTop dark={dark} title="Dusk Dash" sub="Hunt · 28:14 left" role="hunter" />
      <div style={{ padding: '0 14px 110px', height: '100%', overflowY: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <FriendMetric dark={dark} label="Runners" value="3/3" />
          <FriendMetric dark={dark} label="Freeze in" value="08:44" tone="danger" />
          <FriendMetric dark={dark} label="Captures" value="0" tone="hunter" />
        </div>
        <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
          {FRIENDS.players.filter((p) => p.team === 'runner').map((p, i) => (
            <div key={p.name} style={{ borderRadius: 24, overflow: 'hidden', background: C.surface, border: `1px solid ${C.border}` }}>
              <NeoPhoto dark={dark} hue={70 + i * 55} label={`${p.name} position`} style={{ height: 158 }} />
              <div style={{ padding: 13, display: 'flex', alignItems: 'center', gap: 10 }}>
                <FriendAvatar p={p} dark={dark} size={38} />
                <div style={{ flex: 1 }}><div style={{ fontFamily: NEO_DISPLAY, color: C.deep, fontSize: 20, fontWeight: 800, textTransform: 'uppercase' }}>{p.name}</div><div style={{ color: C.muted, fontSize: 11, fontWeight: 700 }}>Photo lock · 04:12 until move</div></div>
                <div style={{ color: C.runner, fontFamily: NEO_DISPLAY, fontWeight: 800 }}>Locked</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </FriendBase>
  );
}

function FriendsRunnerStatus({ dark }) {
  const C = FTheme(dark);
  return (
    <FriendBase dark={dark} dock={<FriendDock dark={dark} active="status" mode="game" role="runner" />}>
      <FriendRoomTop dark={dark} title="Dusk Dash" sub="Hunt · 28:14 left" role="runner" />
      <div style={{ padding: '0 14px 110px' }}>
        <div style={{ borderRadius: 28, overflow: 'hidden', background: C.surface, border: `1px solid ${C.border}` }}>
          <NeoPhoto dark={dark} hue={110} label="Your position photo" style={{ height: 330 }} />
          <div style={{ padding: 16 }}>
            <div style={{ fontFamily: NEO_DISPLAY, color: C.deep, fontSize: 34, lineHeight: 0.9, fontWeight: 700, textTransform: 'uppercase' }}>Stay still.</div>
            <p style={{ margin: '8px 0 0', color: C.muted, fontSize: 13, lineHeight: 1.4, fontWeight: 700 }}>Hunters see this image until your lock expires.</p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 12 }}>
          <FriendMetric dark={dark} label="Move in" value="04:12" tone="runner" />
          <FriendMetric dark={dark} label="Runners" value="3" />
          <FriendMetric dark={dark} label="Hunters" value="2" />
        </div>
      </div>
    </FriendBase>
  );
}

function FriendsTeamChat({ dark }) {
  return (
    <FriendBase dark={dark} dock={<FriendDock dark={dark} active="team" mode="game" role="runner" />}>
      <FriendRoomTop dark={dark} title="Team chat" sub="Runners only" role="runner" />
      <div style={{ padding: '0 14px 110px' }}><FriendChatPreview dark={dark} team="runner" /></div>
    </FriendBase>
  );
}

function FriendsHunterScan({ dark }) {
  const C = FTheme(dark);
  return (
    <FriendBase dark={dark} dock={<FriendDock dark={dark} active="qr" mode="game" role="hunter" />}>
      <FriendRoomTop dark={dark} title="Scan capture" sub="Hunters" role="hunter" />
      <div style={{ padding: '0 14px 110px' }}>
        <div style={{ borderRadius: 30, padding: 18, background: C.cardMint, color: nFg(dark, '#1d5c4d'), textAlign: 'center' }}>
          <div style={{ height: 260, borderRadius: 24, border: '3px solid currentColor', display: 'grid', placeItems: 'center', fontFamily: NEO_DISPLAY, fontSize: 44, fontWeight: 800 }}>▦</div>
          <div style={{ marginTop: 14, fontFamily: NEO_DISPLAY, fontSize: 34, lineHeight: 0.9, fontWeight: 700, textTransform: 'uppercase' }}>Open QR<br/>scanner</div>
        </div>
        <div style={{ marginTop: 12, padding: 14, borderRadius: 18, background: C.surface, border: `1px solid ${C.border}`, color: C.muted, fontWeight: 700 }}>No captures yet · be the first.</div>
      </div>
    </FriendBase>
  );
}

function FriendsRunnerQr({ dark }) {
  const C = FTheme(dark);
  return (
    <FriendBase dark={dark} dock={<FriendDock dark={dark} active="qr" mode="game" role="runner" />}>
      <FriendRoomTop dark={dark} title="Capture code" sub="Runner QR" role="runner" />
      <div style={{ padding: '0 14px 110px' }}>
        <div style={{ borderRadius: 30, padding: 20, background: '#fff', color: '#1b1b1b', textAlign: 'center' }}>
          <div style={{ height: 285, borderRadius: 18, background: 'repeating-linear-gradient(45deg,#111 0 9px,#fff 9px 18px)', display: 'grid', placeItems: 'center' }} />
        </div>
        <p style={{ color: C.muted, fontSize: 13, lineHeight: 1.45, fontWeight: 700, textAlign: 'center' }}>If a Hunter reaches you, they scan this QR. The capture is final.</p>
      </div>
    </FriendBase>
  );
}

function FriendsRoomAbout({ dark }) {
  const C = FTheme(dark);
  return (
    <FriendBase dark={dark} dock={<FriendDock dark={dark} active="about" mode="game" role="hunter" />}>
      <FriendRoomTop dark={dark} title="Room about" sub="Settings" role="hunter" />
      <div style={{ padding: '0 14px 110px', display: 'grid', gap: 10 }}>
        {['Hunt duration · 40 min', 'Dispersal · 3 min', 'Position lock · 6 min', 'Stalemate freeze · 5 min', 'Leave room'].map((x, i) => (
          <div key={x} style={{ padding: 16, borderRadius: 18, background: C.surface, border: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', color: i === 4 ? C.danger : C.text }}>
            <span style={{ fontFamily: NEO_DISPLAY, color: i === 4 ? C.danger : C.deep, fontSize: 18, fontWeight: 800, textTransform: 'uppercase' }}>{x}</span><span>›</span>
          </div>
        ))}
      </div>
    </FriendBase>
  );
}

function FriendOverlayScrim({ dark, children }) {
  const C = FTheme(dark);
  return (
    <FriendBase dark={dark}>
      <FriendsLobby dark={dark} />
      <div style={{ position: 'absolute', inset: 0, background: dark ? 'rgba(12,16,17,0.62)' : 'rgba(36,43,44,0.34)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 }}>
        <div style={{ width: '100%', borderRadius: 30, padding: 20, background: C.surface, border: `1px solid ${C.border}`, boxShadow: '0 20px 56px rgba(0,0,0,0.35)' }}>{children}</div>
      </div>
    </FriendBase>
  );
}

function FriendsCameraHeadshot({ dark }) {
  const C = FTheme(dark);
  return (
    <FriendBase dark={dark} bg={dark ? '#141b1c' : '#24302d'}>
      <NeoPhoto dark hue={35} label="Live selfie camera" style={{ position: 'absolute', inset: 0, opacity: 0.72 }} />
      <button style={{ position: 'absolute', top: 60, left: 14, height: 42, padding: '0 14px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.24)', background: 'rgba(0,0,0,0.22)', color: '#fff', fontWeight: 800 }}>Cancel</button>
      <div style={{ position: 'absolute', left: '50%', top: '42%', transform: 'translate(-50%,-50%)', width: 238, height: 300, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.86)', boxShadow: '0 0 0 999px rgba(0,0,0,0.28)' }} />
      <div style={{ position: 'absolute', left: 24, right: 24, bottom: 92, textAlign: 'center', color: '#fff' }}>
        <div style={{ fontFamily: NEO_DISPLAY, fontSize: 44, lineHeight: 0.86, fontWeight: 700, textTransform: 'uppercase' }}>Center<br/>your face</div>
        <p style={{ fontSize: 13, fontWeight: 700, opacity: 0.8 }}>Auto-capture in 3 seconds</p>
      </div>
      <div style={{ position: 'absolute', bottom: 34, left: 0, right: 0, display: 'grid', placeItems: 'center' }}><div style={{ padding: '8px 14px', borderRadius: 999, background: C.accent, color: '#fff', fontFamily: NEO_DISPLAY, fontWeight: 800 }}>No shutter button</div></div>
    </FriendBase>
  );
}

function FriendsPhotoPreview({ dark }) {
  const C = FTheme(dark);
  return (
    <FriendBase dark={dark}>
      <div style={{ padding: '60px 14px 28px' }}>
        <div style={{ borderRadius: 30, overflow: 'hidden', background: C.surface, border: `1px solid ${C.border}` }}>
          <NeoPhoto dark={dark} hue={30} label="Captured preview" style={{ height: 520 }} />
          <div style={{ padding: 16 }}>
            <div style={{ fontFamily: NEO_DISPLAY, color: C.deep, fontSize: 34, lineHeight: 0.9, fontWeight: 700, textTransform: 'uppercase' }}>Save &<br/>ready.</div>
            <button style={{ marginTop: 14, width: '100%', height: 54, borderRadius: 999, border: 'none', background: C.accent, color: '#fff', fontFamily: NEO_DISPLAY, fontSize: 18, fontWeight: 800 }}>Save photo</button>
            <button style={{ marginTop: 8, width: '100%', height: 48, borderRadius: 999, border: `1px solid ${C.border}`, background: 'transparent', color: C.text, fontFamily: NEO_DISPLAY, fontSize: 16, fontWeight: 800 }}>Retake</button>
          </div>
        </div>
      </div>
    </FriendBase>
  );
}

function FriendsScanner({ dark }) {
  return (
    <FriendBase dark={dark} bg={dark ? '#111819' : '#1c2b29'}>
      <NeoPhoto dark hue={190} label="Scanner camera" style={{ position: 'absolute', inset: 0, opacity: 0.64 }} />
      <button style={{ position: 'absolute', top: 60, left: 14, height: 42, padding: '0 14px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.24)', background: 'rgba(0,0,0,0.22)', color: '#fff', fontWeight: 800 }}>Cancel</button>
      <div style={{ position: 'absolute', left: '50%', top: '46%', transform: 'translate(-50%,-50%)', width: 270, height: 270, borderRadius: 30, border: '4px solid #fff', boxShadow: '0 0 0 999px rgba(0,0,0,0.34)' }} />
      <div style={{ position: 'absolute', left: 42, right: 42, top: '46%', height: 3, background: '#fff', boxShadow: '0 0 18px #fff' }} />
      <div style={{ position: 'absolute', left: 24, right: 24, bottom: 86, textAlign: 'center', color: '#fff', fontFamily: NEO_DISPLAY, fontSize: 36, lineHeight: 0.9, fontWeight: 700, textTransform: 'uppercase' }}>Point at<br/>runner QR</div>
    </FriendBase>
  );
}

function FriendsCreateConfirm({ dark }) {
  const C = FTheme(dark);
  return <FriendOverlayScrim dark={dark}><div style={{ width: 56, height: 56, borderRadius: '50%', background: C.cardMint, color: nFg(dark, '#1d5c4d'), display: 'grid', placeItems: 'center', fontFamily: NEO_DISPLAY, fontSize: 34, fontWeight: 800 }}>+</div><div style={{ marginTop: 14, fontFamily: NEO_DISPLAY, color: C.deep, fontSize: 38, lineHeight: 0.88, fontWeight: 700, textTransform: 'uppercase' }}>Create<br/>this room?</div><p style={{ color: C.muted, fontSize: 13, lineHeight: 1.45, fontWeight: 700 }}>A 6-character invite code is generated immediately. You'll be the Host.</p><button style={{ width: '100%', height: 52, borderRadius: 999, border: 'none', background: C.accent, color: '#fff', fontFamily: NEO_DISPLAY, fontSize: 18, fontWeight: 800 }}>Confirm create</button></FriendOverlayScrim>;
}

function FriendsAddFriendModal({ dark }) {
  const C = FTheme(dark);
  return <FriendOverlayScrim dark={dark}><div style={{ fontFamily: NEO_DISPLAY, color: C.deep, fontSize: 38, lineHeight: 0.88, fontWeight: 700, textTransform: 'uppercase' }}>Add a<br/>friend.</div><p style={{ color: C.muted, fontSize: 13, lineHeight: 1.45, fontWeight: 700 }}>Enter their 6-character code. They'll receive a request.</p><div style={{ height: 56, borderRadius: 18, background: C.bgAlt, border: `1px solid ${C.border}`, display: 'grid', placeItems: 'center', fontFamily: NEO_DISPLAY, color: C.deep, fontSize: 30, fontWeight: 800, letterSpacing: '0.12em' }}>IRIS02</div><button style={{ marginTop: 12, width: '100%', height: 52, borderRadius: 999, border: 'none', background: C.accent, color: '#fff', fontFamily: NEO_DISPLAY, fontSize: 18, fontWeight: 800 }}>Send request</button></FriendOverlayScrim>;
}

function FriendsCaptureConfirm({ dark }) {
  const C = FTheme(dark);
  return <FriendOverlayScrim dark={dark}><div style={{ width: 64, height: 64, borderRadius: '50%', background: C.danger, color: '#fff', display: 'grid', placeItems: 'center', fontFamily: NEO_DISPLAY, fontSize: 34, fontWeight: 800 }}>!</div><div style={{ marginTop: 14, fontFamily: NEO_DISPLAY, color: C.deep, fontSize: 38, lineHeight: 0.88, fontWeight: 700, textTransform: 'uppercase' }}>Confirm<br/>capture?</div><p style={{ color: C.muted, fontSize: 13, lineHeight: 1.45, fontWeight: 700 }}>Mark Aria as caught. This is final and moves them to Spectator mode.</p><button style={{ width: '100%', height: 52, borderRadius: 999, border: 'none', background: C.danger, color: '#fff', fontFamily: NEO_DISPLAY, fontSize: 18, fontWeight: 800 }}>Confirm capture</button></FriendOverlayScrim>;
}

function FriendsStalemateOverlay({ dark }) {
  const C = FTheme(dark);
  return (
    <FriendBase dark={dark}>
      <FriendsHunterStatus dark={dark} />
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${C.cardMustard}, ${C.danger})`, color: '#fff', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center' }}>
        <div><div style={{ fontFamily: NEO_DISPLAY, fontSize: 88, lineHeight: 0.8, fontWeight: 700 }}>05:00</div><div style={{ marginTop: 16, fontFamily: NEO_DISPLAY, fontSize: 48, lineHeight: 0.84, fontWeight: 700, textTransform: 'uppercase' }}>Hunters<br/>frozen.</div><p style={{ fontWeight: 700, lineHeight: 1.45 }}>No capture for 15 minutes. Runners get time to relocate.</p></div>
      </div>
    </FriendBase>
  );
}

function FriendsRelocateAlert({ dark }) {
  const C = FTheme(dark);
  return (
    <FriendBase dark={dark}>
      <FriendsRunnerStatus dark={dark} />
      <div style={{ position: 'absolute', inset: 0, background: dark ? 'rgba(32,39,40,0.92)' : 'rgba(235,231,221,0.94)', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center' }}>
        <div style={{ color: C.text }}><div style={{ fontFamily: NEO_DISPLAY, color: C.runner, fontSize: 72, lineHeight: 0.82, fontWeight: 700, textTransform: 'uppercase' }}>Move<br/>now.</div><p style={{ color: C.muted, fontSize: 14, fontWeight: 700, lineHeight: 1.45 }}>Your lock expired. Relocate, settle, and capture a new position photo.</p><button style={{ marginTop: 12, width: 260, height: 54, borderRadius: 999, border: 'none', background: C.runner, color: '#fff', fontFamily: NEO_DISPLAY, fontSize: 18, fontWeight: 800 }}>Auto-capture now</button></div>
      </div>
    </FriendBase>
  );
}

function FriendsCapturedOverlay({ dark }) {
  const C = FTheme(dark);
  return (
    <FriendBase dark={dark} bg={dark ? '#171313' : '#33201d'}>
      <div style={{ height: '100%', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center', color: '#fff' }}>
        <div><div style={{ fontFamily: NEO_DISPLAY, fontSize: 78, lineHeight: 0.82, fontWeight: 700, textTransform: 'uppercase' }}>You were<br/>caught.</div><p style={{ fontWeight: 700, lineHeight: 1.45 }}>Leo scanned your QR. Enter Spectator mode to watch the rest.</p><button style={{ marginTop: 12, width: 250, height: 54, borderRadius: 999, border: 'none', background: '#fff', color: '#33201d', fontFamily: NEO_DISPLAY, fontSize: 18, fontWeight: 800 }}>Enter spectator</button></div>
      </div>
    </FriendBase>
  );
}

function FriendsSpectatorStats({ dark }) {
  const C = FTheme(dark);
  return (
    <FriendBase dark={dark} dock={<FriendDock dark={dark} active="stats" mode="spectator" role="spectator" />}>
      <FriendRoomTop dark={dark} title="Spectator" sub="Live stats" role="spectator" />
      <div style={{ padding: '0 14px 110px' }}>
        <FriendHero dark={dark} tone="lav" kicker="Captured · watching" title={<>2 runners<br/>left.</>} copy="Your stats are saved. Stay for the recap and final ranking." />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}><FriendMetric dark={dark} label="Time alive" value="21:09" /><FriendMetric dark={dark} label="MVP" value="Leo" tone="hunter" /></div>
      </div>
    </FriendBase>
  );
}

function FriendsSpectatorChat({ dark }) {
  return <FriendBase dark={dark} dock={<FriendDock dark={dark} active="allchat" mode="spectator" role="spectator" />}><FriendRoomTop dark={dark} title="All chat" sub="Read only" role="spectator" /><div style={{ padding: '0 14px 110px' }}><FriendChatPreview dark={dark} team="all" /></div></FriendBase>;
}

function FriendsSpectatorExit({ dark }) {
  const C = FTheme(dark);
  return <FriendBase dark={dark} dock={<FriendDock dark={dark} active="exit" mode="spectator" role="spectator" />}><FriendRoomTop dark={dark} title="Exit" sub="Spectator" role="spectator" /><div style={{ padding: '0 14px 110px' }}><FriendHero dark={dark} tone="mustard" kicker="Leave now" title={<>Exit or<br/>watch?</>} copy="Stay through the recap, or leave now and keep your saved stats." /><button style={{ marginTop: 14, width: '100%', height: 54, borderRadius: 999, border: 'none', background: C.accent, color: '#fff', fontFamily: NEO_DISPLAY, fontSize: 18, fontWeight: 800 }}>Leave room</button></div></FriendBase>;
}

function FriendsEndHunters({ dark }) {
  const C = FTheme(dark);
  return <FriendBase dark={dark}><div style={{ padding: '64px 14px 28px' }}><FriendHero dark={dark} tone="mint" kicker="Game over" title={<>Hunters<br/>win.</>} copy="All runners caught within 40 minutes. Leo takes MVP." /><div style={{ marginTop: 14, display: 'grid', gap: 8 }}>{FRIENDS.players.slice(0, 3).map((p, i) => <div key={p.name} style={{ padding: 12, borderRadius: 18, background: C.surface, border: `1px solid ${C.border}`, display: 'flex', gap: 10, alignItems: 'center' }}><div style={{ fontFamily: NEO_DISPLAY, color: C.accent, fontSize: 24, fontWeight: 800 }}>#{i + 1}</div><FriendAvatar p={p} dark={dark} /><div style={{ fontFamily: NEO_DISPLAY, color: C.deep, fontSize: 20, fontWeight: 800, textTransform: 'uppercase' }}>{p.name}</div></div>)}</div></div></FriendBase>;
}

function FriendsEndRunners({ dark }) {
  return <FriendBase dark={dark}><div style={{ padding: '64px 14px 28px' }}><FriendHero dark={dark} tone="peach" kicker="Game over" title={<>Runners<br/>escape.</>} copy="At least one runner survived the hunt timer. Longest alive wins." /><div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}><FriendMetric dark={dark} label="Survivors" value="1" tone="runner" /><FriendMetric dark={dark} label="Captures" value="4" tone="hunter" /></div></div></FriendBase>;
}

function FriendsCreatingRoom({ dark }) {
  return <FriendBase dark={dark}><div style={{ height: '100%', display: 'grid', placeItems: 'center', padding: 28 }}><NeoRoseOrbitLoader dark={dark} size={210} label="Creating Room" sublabel="Reserving invite code" /></div></FriendBase>;
}

function FriendsCreatedSuccess({ dark }) {
  const C = FTheme(dark);
  return <FriendBase dark={dark}><div style={{ height: '100%', display: 'grid', placeItems: 'center', padding: 22, textAlign: 'center' }}><div style={{ borderRadius: 32, padding: 24, background: C.cardMint, color: nFg(dark, '#1d5c4d'), width: '100%' }}><div style={{ fontFamily: NEO_DISPLAY, fontSize: 88, lineHeight: 0.8, fontWeight: 700 }}>✓</div><div style={{ marginTop: 8, fontFamily: NEO_DISPLAY, fontSize: 54, lineHeight: 0.84, fontWeight: 700, textTransform: 'uppercase' }}>Room<br/>created.</div><div style={{ marginTop: 14, fontFamily: NEO_DISPLAY, fontSize: 36, fontWeight: 800, letterSpacing: '0.12em' }}>739AQL</div></div></div></FriendBase>;
}

Object.assign(window, {
  FriendsStart,
  FriendsCreateRoom,
  FriendsJoinRoom,
  FriendsRanks,
  FriendsSocial,
  FriendsMe,
  FriendsLobby,
  FriendsReadyCheck,
  FriendsRoleRevealRunner,
  FriendsRoleRevealHunter,
  FriendsDispersal,
  FriendsHunterStatus,
  FriendsRunnerStatus,
  FriendsTeamChat,
  FriendsHunterScan,
  FriendsRunnerQr,
  FriendsRoomAbout,
  FriendsCameraHeadshot,
  FriendsPhotoPreview,
  FriendsScanner,
  FriendsCreateConfirm,
  FriendsAddFriendModal,
  FriendsCaptureConfirm,
  FriendsStalemateOverlay,
  FriendsRelocateAlert,
  FriendsCapturedOverlay,
  FriendsSpectatorStats,
  FriendsSpectatorChat,
  FriendsSpectatorExit,
  FriendsEndHunters,
  FriendsEndRunners,
  FriendsCreatingRoom,
  FriendsCreatedSuccess,
});
