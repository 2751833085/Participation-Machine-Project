// Preview shell for app-only artboards.
// Keeps the iPhone screen ratio without rendering the physical phone frame.

const PREVIEW_SCREEN_W = 390;
const PREVIEW_SCREEN_H = 844;

function PreviewScreen({ dark, children, keyboard = false, lift = 0 }) {
  const C = dark ? NEO.dark : NEO.light;
  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'grid', placeItems: 'center',
      background: dark ? NEO.dark.bgAlt : '#f5f1e8',
    }}>
      <div style={{
        width: PREVIEW_SCREEN_W, height: PREVIEW_SCREEN_H,
        position: 'relative', overflow: 'hidden',
        background: C.bg,
        fontFamily: NEO_UI,
        WebkitFontSmoothing: 'antialiased',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          transform: lift ? `translateY(-${lift}px)` : 'none',
          transition: 'transform 180ms ease',
        }}>
          {children}
        </div>
        {keyboard && (
          <div style={{
            position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 120,
            background: dark ? 'rgba(40,44,48,0.92)' : 'rgba(238,238,242,0.96)',
          }}>
            <IOSKeyboard dark={dark} />
          </div>
        )}
      </div>
    </div>
  );
}

function makeArtboards(flow, dark, suffix) {
  return flow.map(({ id, label, C, keyboard = false, lift = 0 }) => (
    <DCArtboard key={id + suffix} id={id + suffix} label={label} width={PREVIEW_SCREEN_W} height={PREVIEW_SCREEN_H}>
      <PreviewScreen dark={dark} keyboard={keyboard} lift={lift}>
        <C dark={dark} />
      </PreviewScreen>
    </DCArtboard>
  ));
}

Object.assign(window, {
  PREVIEW_SCREEN_W,
  PREVIEW_SCREEN_H,
  PreviewScreen,
  makeArtboards,
});
