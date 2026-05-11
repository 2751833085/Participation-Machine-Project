// Interactive NeoUI prototypes.
// Standalone demo state machines for implementation handoff only.

const DEMO_ROUTES = {
  tourgo: [
    ['login', 'Sign in', NeoLogin],
    ['home', 'Hunts home', NeoHome],
    ['detail', 'Hunt detail', NeoChallenge],
    ['run', 'Active run', NeoRun],
    ['leaderboard', 'Leaderboard', NeoLeaderboard],
    ['profile', 'Profile', NeoProfile],
    ['loading', 'Loading', NeoLoadingScreen],
    ['inlineLoading', 'Refresh overlay', NeoInlineLoadingPanel],
    ['daily', 'Daily welcome', NeoDailyWelcome],
    ['confirm', 'Confirm modal', NeoConfirmModal],
    ['banner', 'Top banner', NeoBanner],
    ['reviews', 'Reviews', NeoComments],
    ['grid', 'Grid view', NeoGrid],
    ['map', 'Map explore', NeoMapExplore],
    ['createPicker', 'Create menu', NeoCreatePicker],
    ['create', 'Create hunt', NeoCreate],
    ['createMap', 'Create map sheet', NeoCreateMapSheet],
    ['photoProof', 'Photo proof', NeoPhotoProof],
    ['saved', 'Saved', NeoSaved],
    ['admin', 'Admin', NeoAdminDashboard],
    ['profileMenu', 'Profile menu', NeoProfileMenuSheet],
    ['filter', 'Filter sheet', NeoFilterSheet],
    ['report', 'Report modal', NeoReportModal],
    ['publishSuccess', 'Publish success', NeoPublishSuccess],
    ['loginKeyboard', 'Sign in keyboard', NeoLogin, { keyboard: true }],
    ['mapKeyboard', 'Map search keyboard', NeoMapExplore, { keyboard: true }],
    ['createKeyboard', 'Create title keyboard', NeoCreate, { keyboard: true }],
    ['reportKeyboard', 'Report details keyboard', NeoReportModal, { keyboard: true, lift: 108 }],
  ],
  friends: [
    ['login', 'Sign in', NeoLogin],
    ['start', 'Friends start', FriendsStart],
    ['create', 'Create room', FriendsCreateRoom],
    ['join', 'Join room', FriendsJoinRoom],
    ['ranks', 'Friends ranks', FriendsRanks],
    ['social', 'Social', FriendsSocial],
    ['me', 'Me', FriendsMe],
    ['lobby', 'Room lobby', FriendsLobby],
    ['ready', 'Ready check', FriendsReadyCheck],
    ['dispersal', 'Dispersal', FriendsDispersal],
    ['roleRunner', 'Role reveal runner', FriendsRoleRevealRunner],
    ['roleHunter', 'Role reveal hunter', FriendsRoleRevealHunter],
    ['hunterStatus', 'Hunter status', FriendsHunterStatus],
    ['runnerStatus', 'Runner status', FriendsRunnerStatus],
    ['teamChat', 'Team chat', FriendsTeamChat],
    ['hunterScan', 'Hunter scan tab', FriendsHunterScan],
    ['runnerQr', 'Runner QR tab', FriendsRunnerQr],
    ['about', 'Room about', FriendsRoomAbout],
    ['camera', 'Camera headshot', FriendsCameraHeadshot],
    ['photoPreview', 'Photo preview', FriendsPhotoPreview],
    ['scanner', 'Scanner overlay', FriendsScanner],
    ['createConfirm', 'Create confirm', FriendsCreateConfirm],
    ['addFriend', 'Add friend modal', FriendsAddFriendModal],
    ['captureConfirm', 'Capture confirm', FriendsCaptureConfirm],
    ['stalemate', 'Stalemate overlay', FriendsStalemateOverlay],
    ['relocate', 'Relocate alert', FriendsRelocateAlert],
    ['captured', 'Captured overlay', FriendsCapturedOverlay],
    ['spectatorStats', 'Spectator stats', FriendsSpectatorStats],
    ['spectatorChat', 'Spectator chat', FriendsSpectatorChat],
    ['spectatorExit', 'Spectator exit', FriendsSpectatorExit],
    ['endHunters', 'Hunters win', FriendsEndHunters],
    ['endRunners', 'Runners win', FriendsEndRunners],
    ['creatingRoom', 'Creating room', FriendsCreatingRoom],
    ['createdSuccess', 'Created success', FriendsCreatedSuccess],
    ['createKeyboard', 'Create room keyboard', FriendsCreateRoom, { keyboard: true }],
    ['joinKeyboard', 'Join code keyboard', FriendsJoinRoom, { keyboard: true }],
    ['addFriendKeyboard', 'Add friend keyboard', FriendsAddFriendModal, { keyboard: true, lift: 76 }],
    ['teamChatKeyboard', 'Team chat keyboard', FriendsTeamChat, { keyboard: true }],
  ],
};

const TOURGO_HINTS = {
  login: 'Demo starts here after every refresh. Sign in opens Hunts home.',
  home: 'Browse hunts, open details, map, saved, create, rank, and profile.',
  detail: 'Start a timed run, read reviews, or report this hunt.',
  run: 'Active run view with checkpoint/photo proof flow.',
  create: 'Draft a new hunt, then continue to map and photo proof.',
  report: 'Popup modal state with keyboard-safe details input.',
};

const FRIEND_HINTS = {
  login: 'Demo starts here after every refresh. Sign in opens Tourgo Friends.',
  start: 'Choose Create Room, Join Room, Social, Ranks, or Me.',
  lobby: 'Room code, player readiness, chat preview, and start-ready-check action.',
  ready: 'Everyone must tap Ready. When all agree, go directly to Dispersal.',
  dispersal: 'Runners hide first. Roles remain hidden in this phase.',
  roleRunner: 'After Dispersal ends, show this fullscreen role reveal for 5 seconds.',
  roleHunter: 'Hunter role reveal variant. Then enter the matching game UI.',
  runnerStatus: 'Runner game status with QR/team/about tabs.',
  hunterStatus: 'Hunter game status with scan/team/about tabs.',
};

function DemoButton({ children, onClick, tone = 'primary', disabled = false }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={{
        minHeight: 34,
        borderRadius: 999,
        border: tone === 'ghost' ? '1px solid currentColor' : 'none',
        background: disabled ? 'rgba(60,91,83,0.18)' : tone === 'ghost' ? 'transparent' : '#c76a4e',
        color: tone === 'ghost' ? 'inherit' : '#fff',
        opacity: disabled ? 0.48 : 1,
        padding: '0 13px',
        fontFamily: NEO_DISPLAY,
        fontSize: 14,
        fontWeight: 800,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        cursor: disabled ? 'default' : 'pointer',
      }}
    >
      {children}
    </button>
  );
}

function DemoChrome({ kind, dark, setDark, route, setRoute, routes, history, goBack, children, hint }) {
  const currentLabel = routes.find(([id]) => id === route)?.[1] || route;
  const panelBg = dark ? '#2d3536' : '#f7f3ea';
  const border = dark ? 'rgba(244,239,228,0.14)' : 'rgba(44,60,55,0.14)';
  const muted = dark ? '#b2bdb8' : '#6a7570';
  const text = dark ? '#f4efe4' : '#2c3c37';

  return (
    <div style={{
      minHeight: '100vh',
      background: dark ? '#202728' : '#f0eee9',
      color: text,
      fontFamily: NEO_UI,
      display: 'grid',
      gridTemplateRows: 'auto 1fr',
    }}>
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        background: dark ? 'rgba(32,39,40,0.86)' : 'rgba(240,238,233,0.88)',
        borderBottom: `1px solid ${border}`,
        backdropFilter: 'blur(16px)',
      }}>
        <div style={{
          width: 'min(100%, 1180px)',
          minHeight: 72,
          margin: '0 auto',
          padding: '12px 22px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}>
          <div style={{
            marginRight: 'auto',
            fontFamily: NEO_DISPLAY,
            fontSize: 25,
            lineHeight: 0.92,
            fontWeight: 800,
            color: dark ? '#e6dcc8' : '#3c5b53',
            textTransform: 'uppercase',
          }}>
            {kind === 'tourgo' ? 'Tourgo' : 'Tourgo Friends'} Demo
          </div>
          <label style={{
            display: 'grid',
            gap: 4,
            color: muted,
            fontSize: 9,
            fontWeight: 900,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}>
            Screen
            <select
              value={route}
              onChange={(event) => setRoute(event.target.value)}
              style={{
                minWidth: 210,
                height: 34,
                borderRadius: 999,
                border: `1px solid ${border}`,
                background: panelBg,
                color: text,
                padding: '0 34px 0 12px',
                font: `800 13px ${NEO_UI}`,
                outline: 'none',
              }}
            >
              {routes.map(([id, label]) => (
                <option key={id} value={id}>{label}</option>
              ))}
            </select>
          </label>
          <DemoButton tone="ghost" onClick={goBack} disabled={!history.length}>Back</DemoButton>
          <DemoButton onClick={() => setRoute('login')}>Reset</DemoButton>
          <DemoButton tone="ghost" onClick={() => setDark(!dark)}>{dark ? 'Light' : 'Dark'}</DemoButton>
        </div>
      </header>
      <main className="demo-stage" style={{
        width: 'min(100%, 1180px)',
        margin: '0 auto',
        padding: '28px 22px 34px',
        display: 'grid',
        gridTemplateColumns: '390px minmax(240px, 360px)',
        gap: 28,
        justifyContent: 'center',
        alignItems: 'start',
      }}>
        <section style={{ display: 'grid', gap: 10 }}>
          <div style={{
            width: 390,
            height: 844,
            overflow: 'hidden',
            background: dark ? NEO.dark.bg : NEO.light.bg,
            boxShadow: '0 22px 60px rgba(0,0,0,0.25)',
          }}>{children}</div>
          <div style={{ width: 390, display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: muted, fontSize: 12, fontWeight: 750 }}>
            <span>{currentLabel}</span>
            <span>390 x 844</span>
          </div>
        </section>
        <aside style={{ display: 'grid', gap: 12 }}>
          <div style={{
            borderRadius: 20,
            background: panelBg,
            border: `1px solid ${border}`,
            padding: 18,
          }}>
            <div style={{ fontFamily: NEO_DISPLAY, fontSize: 24, fontWeight: 800, color: dark ? '#e6dcc8' : '#3c5b53', textTransform: 'uppercase' }}>UI hint</div>
            <p style={{ margin: '8px 0 0', color: muted, fontSize: 13, lineHeight: 1.48, fontWeight: 700 }}>
              {hint} Tap the visible app controls to move through the demo.
            </p>
          </div>
          <div style={{
            borderRadius: 20,
            background: panelBg,
            border: `1px solid ${border}`,
            padding: 18,
          }}>
            <div style={{ fontFamily: NEO_DISPLAY, fontSize: 24, fontWeight: 800, color: dark ? '#e6dcc8' : '#3c5b53', textTransform: 'uppercase' }}>Demo state</div>
            <div style={{ marginTop: 10, display: 'grid', gap: 8, color: muted, fontSize: 12, fontWeight: 750 }}>
              <div>Current: <b style={{ color: text }}>{route}</b></div>
              <div>Recent: {history.slice(-5).join(' -> ') || 'none'}</div>
            </div>
          </div>
        </aside>
      </main>
      <style>{`
        @media (max-width: 820px) {
          .demo-stage { grid-template-columns: 390px !important; }
        }
      `}</style>
    </div>
  );
}

function Hotspots({ items }) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 180, pointerEvents: 'none' }}>
      {items.map((item) => (
        <button key={item.label} onClick={item.onClick} title={item.label} aria-label={item.label} style={{
          position: 'absolute',
          left: item.x,
          top: item.y,
          width: item.w,
          height: item.h,
          border: 'none',
          borderRadius: item.r || 18,
          background: 'transparent',
          color: 'transparent',
          pointerEvents: 'auto',
          cursor: 'pointer',
          padding: 0,
          fontSize: 0,
          appearance: 'none',
          WebkitAppearance: 'none',
        }} />
      ))}
    </div>
  );
}

function DemoScreen({ dark, routeInfo, hotspots = [] }) {
  const [id, label, C, opts = {}] = routeInfo;
  return (
    <PreviewScreen dark={dark} keyboard={opts.keyboard} lift={opts.lift || 0}>
      <C dark={dark} />
      <Hotspots items={hotspots} />
    </PreviewScreen>
  );
}

function useDemoRoute(initial = 'login') {
  const [route, rawSetRoute] = React.useState(initial);
  const [history, setHistory] = React.useState([]);
  const setRoute = React.useCallback((next) => {
    rawSetRoute((prev) => {
      if (next === prev) return prev;
      setHistory((h) => [...h.slice(-8), prev]);
      return next;
    });
  }, []);
  const goBack = React.useCallback(() => {
    setHistory((h) => {
      if (!h.length) return h;
      const next = h[h.length - 1];
      rawSetRoute(next);
      return h.slice(0, -1);
    });
  }, []);
  return [route, setRoute, history, goBack];
}

function TourgoInteractiveApp() {
  const routes = DEMO_ROUTES.tourgo;
  const routeMap = Object.fromEntries(routes.map((r) => [r[0], r]));
  const [route, setRoute, history, goBack] = useDemoRoute('login');
  const [dark, setDark] = React.useState(false);

  React.useEffect(() => {
    if (route === 'loading') {
      const t = setTimeout(() => setRoute('home'), 1400);
      return () => clearTimeout(t);
    }
  }, [route, setRoute]);

  const go = (id) => () => setRoute(id);
  const hotspots = {
    login: [{ label: 'Sign in', x: 42, y: 562, w: 306, h: 58, onClick: go('home') }],
    home: [
      { label: 'Open hunt detail', x: 16, y: 286, w: 176, h: 174, onClick: go('detail') },
      { label: 'Saved tab', x: 88, y: 790, w: 54, h: 44, onClick: go('saved') },
      { label: 'Create', x: 168, y: 778, w: 58, h: 58, r: 999, onClick: go('createPicker') },
      { label: 'Rank tab', x: 238, y: 790, w: 54, h: 44, onClick: go('leaderboard') },
      { label: 'Profile tab', x: 302, y: 790, w: 54, h: 44, onClick: go('profile') },
      { label: 'Refresh', x: 302, y: 66, w: 52, h: 44, r: 999, onClick: go('inlineLoading') },
    ],
    detail: [
      { label: 'Start run', x: 22, y: 690, w: 346, h: 58, onClick: go('confirm') },
      { label: 'Reviews', x: 22, y: 752, w: 166, h: 48, onClick: go('reviews') },
      { label: 'Report', x: 202, y: 752, w: 166, h: 48, onClick: go('report') },
    ],
    confirm: [{ label: 'Confirm start', x: 46, y: 560, w: 298, h: 58, onClick: go('loading') }],
    run: [{ label: 'Photo proof', x: 28, y: 612, w: 334, h: 58, onClick: go('photoProof') }],
    map: [{ label: 'Open filters', x: 320, y: 58, w: 52, h: 52, r: 999, onClick: go('filter') }],
    createPicker: [
      { label: 'Create guided hunt', x: 24, y: 270, w: 342, h: 138, onClick: go('create') },
      { label: 'Create map hunt', x: 24, y: 430, w: 342, h: 138, onClick: go('createMap') },
    ],
    create: [{ label: 'Continue map', x: 22, y: 738, w: 346, h: 58, onClick: go('createMap') }],
    createMap: [{ label: 'Continue photo', x: 30, y: 720, w: 330, h: 58, onClick: go('photoProof') }],
    photoProof: [{ label: 'Publish', x: 32, y: 716, w: 326, h: 58, onClick: go('publishSuccess') }],
    profile: [{ label: 'Open profile menu', x: 312, y: 58, w: 52, h: 52, r: 999, onClick: go('profileMenu') }],
    inlineLoading: [{ label: 'Back to map', x: 16, y: 16, w: 358, h: 812, onClick: go('map') }],
  }[route] || [];

  return (
    <DemoChrome kind="tourgo" dark={dark} setDark={setDark} route={route} setRoute={setRoute} routes={routes} history={history} goBack={goBack} hint={TOURGO_HINTS[route] || 'Use the screen menu or app controls to simulate the app.'}>
      <DemoScreen dark={dark} routeInfo={routeMap[route] || routeMap.login} hotspots={hotspots} />
    </DemoChrome>
  );
}

function FriendsInteractiveApp() {
  const routes = DEMO_ROUTES.friends;
  const routeMap = Object.fromEntries(routes.map((r) => [r[0], r]));
  const [route, setRoute, history, goBack] = useDemoRoute('login');
  const [dark, setDark] = React.useState(false);
  const [role, setRole] = React.useState('runner');

  React.useEffect(() => {
    if (route === 'creatingRoom') {
      const t = setTimeout(() => setRoute('createdSuccess'), 1400);
      return () => clearTimeout(t);
    }
    if (route === 'roleRunner') {
      const t = setTimeout(() => setRoute('runnerStatus'), 5000);
      return () => clearTimeout(t);
    }
    if (route === 'roleHunter') {
      const t = setTimeout(() => setRoute('hunterStatus'), 5000);
      return () => clearTimeout(t);
    }
  }, [route, setRoute]);

  const go = (id) => () => setRoute(id);
  const chooseRole = (nextRole) => () => {
    setRole(nextRole);
    setRoute(nextRole === 'hunter' ? 'roleHunter' : 'roleRunner');
  };
  const roleRevealRoute = role === 'hunter' ? 'roleHunter' : 'roleRunner';

  const hotspots = {
    login: [{ label: 'Sign in', x: 42, y: 562, w: 306, h: 58, onClick: go('start') }],
    start: [
      { label: 'Create room', x: 20, y: 374, w: 168, h: 170, onClick: go('create') },
      { label: 'Join room', x: 202, y: 374, w: 168, h: 170, onClick: go('join') },
      { label: 'Ranks', x: 94, y: 790, w: 52, h: 44, onClick: go('ranks') },
      { label: 'Social', x: 172, y: 790, w: 52, h: 44, onClick: go('social') },
      { label: 'Me', x: 252, y: 790, w: 52, h: 44, onClick: go('me') },
    ],
    create: [{ label: 'Create room', x: 42, y: 610, w: 306, h: 58, onClick: go('createConfirm') }],
    createConfirm: [{ label: 'Confirm create', x: 44, y: 610, w: 302, h: 58, onClick: go('creatingRoom') }],
    createdSuccess: [{ label: 'Enter lobby', x: 18, y: 18, w: 354, h: 808, onClick: go('lobby') }],
    join: [{ label: 'Join lobby', x: 42, y: 550, w: 306, h: 58, onClick: go('lobby') }],
    lobby: [{ label: 'Start ready check', x: 20, y: 738, w: 350, h: 62, onClick: go('ready') }],
    ready: [{ label: "I'm ready", x: 152, y: 706, w: 214, h: 58, onClick: go('dispersal') }],
    dispersal: [
      { label: 'Reveal runner role', x: 18, y: 18, w: 170, h: 808, onClick: chooseRole('runner') },
      { label: 'Reveal hunter role', x: 202, y: 18, w: 170, h: 808, onClick: chooseRole('hunter') },
    ],
    hunterStatus: [
      { label: 'Team chat', x: 96, y: 790, w: 64, h: 44, onClick: go('teamChat') },
      { label: 'Scan', x: 176, y: 790, w: 64, h: 44, onClick: go('hunterScan') },
      { label: 'About', x: 252, y: 790, w: 64, h: 44, onClick: go('about') },
    ],
    runnerStatus: [
      { label: 'Team chat', x: 96, y: 790, w: 64, h: 44, onClick: go('teamChat') },
      { label: 'QR', x: 176, y: 790, w: 64, h: 44, onClick: go('runnerQr') },
      { label: 'About', x: 252, y: 790, w: 64, h: 44, onClick: go('about') },
    ],
    hunterScan: [{ label: 'Open scanner', x: 34, y: 284, w: 322, h: 260, onClick: go('scanner') }],
    scanner: [{ label: 'Capture found', x: 34, y: 660, w: 322, h: 58, onClick: go('captureConfirm') }],
    captureConfirm: [{ label: 'Confirm capture', x: 44, y: 610, w: 302, h: 58, onClick: go('captured') }],
    captured: [{ label: 'Enter spectator', x: 70, y: 620, w: 250, h: 58, onClick: go('spectatorStats') }],
    spectatorStats: [
      { label: 'All chat', x: 126, y: 790, w: 82, h: 44, onClick: go('spectatorChat') },
      { label: 'Exit', x: 228, y: 790, w: 82, h: 44, onClick: go('spectatorExit') },
    ],
    camera: [{ label: 'Preview photo', x: 44, y: 702, w: 302, h: 58, onClick: go('photoPreview') }],
    photoPreview: [{ label: 'Save and ready', x: 42, y: 706, w: 306, h: 58, onClick: go('lobby') }],
  }[route] || [];

  return (
    <DemoChrome kind="friends" dark={dark} setDark={setDark} route={route} setRoute={setRoute} routes={routes} history={history} goBack={goBack} hint={FRIEND_HINTS[route] || 'Use the screen menu or app controls to simulate the Friends app.'}>
      <DemoScreen dark={dark} routeInfo={routeMap[route] || routeMap.login} hotspots={hotspots} />
    </DemoChrome>
  );
}

Object.assign(window, {
  TourgoInteractiveApp,
  FriendsInteractiveApp,
});
