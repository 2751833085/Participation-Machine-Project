// HuntCard.jsx — Hunt row card component + Hero section
// Exports: HuntRow, HeroSection, Badge, SectionTitle

function Badge({ children, dark }) {
  const C = dark ? COLORS_DARK : COLORS_LIGHT;
  return (
    <span style={{
      alignSelf: 'flex-start', fontSize: '.65rem', fontWeight: 700,
      letterSpacing: '.1em', textTransform: 'uppercase',
      padding: '.28rem .5rem', borderRadius: 4,
      background: C.accentSoft, color: C.accent,
    }}>{children}</span>
  );
}

function HuntRow({ title, meta, areaLabel, thumbGradient, onClick, dark, favorited, onFavorite }) {
  const C = dark ? COLORS_DARK : COLORS_LIGHT;
  const [hovered, setHovered] = React.useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', minHeight: '7.5rem',
        borderRadius: 16, overflow: 'hidden',
        border: `1px solid ${hovered ? `color-mix(in srgb, ${C.accent} 28%, ${C.border})` : `color-mix(in srgb, ${C.border} 92%, ${C.accentSoft})`}`,
        background: C.surface, cursor: 'pointer',
        boxShadow: hovered ? C.shadowMd : C.shadow,
        transform: hovered ? 'translateY(-1px)' : 'none',
        transition: 'transform .2s, box-shadow .2s, border-color .2s',
      }}
    >
      {/* Thumbnail */}
      <div style={{
        flex: '0 0 7.5rem', width: '7.5rem', height: '7.5rem',
        background: thumbGradient || `linear-gradient(135deg, ${C.surface2}, color-mix(in srgb, ${C.accent} 22%, ${C.surface2}))`,
        overflow: 'hidden', flexShrink: 0,
      }} />
      {/* Body */}
      <div style={{ flex: 1, padding: '.88rem 2.2rem .88rem 1rem', display: 'flex', flexDirection: 'column', gap: '.28rem', minWidth: 0, position: 'relative' }}>
        <Badge dark={dark}>{areaLabel || 'NYC'}</Badge>
        <p style={{ margin: 0, fontFamily: '"Cormorant Garamond", serif', fontSize: '1.22rem', fontWeight: 600, lineHeight: 1.22, color: C.text }}>{title}</p>
        <p style={{ margin: 0, fontSize: '.88rem', color: C.textMuted }}>{meta}</p>
      </div>
      {/* Fav button */}
      {onFavorite && (
        <button onClick={(e) => { e.stopPropagation(); onFavorite(); }} style={{
          position: 'absolute', right: 8, top: 8,
          width: 28, height: 28, borderRadius: 8,
          background: 'none', border: 'none', cursor: 'pointer',
          color: favorited ? C.accent : C.textMuted, opacity: .7,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {ICONS.saved(favorited)}
        </button>
      )}
    </div>
  );
}

function HeroSection({ eyebrow, title, context, lead, dark }) {
  const C = dark ? COLORS_DARK : COLORS_LIGHT;
  return (
    <div style={{
      padding: 'clamp(.55rem,2.2dvh,1rem) 0 clamp(.45rem,1.4dvh,.85rem)',
      borderBottom: `1px solid color-mix(in srgb, ${C.border} 85%, ${C.accentSoft})`,
      marginBottom: 'clamp(.5rem,1.6dvh,.85rem)',
    }}>
      {eyebrow && <p style={{ margin: '0 0 .5rem .45rem', fontSize: '.72rem', fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: C.accent }}>{eyebrow}</p>}
      <h1 style={{ margin: '0 0 .5rem .45rem', fontFamily: '"Cormorant Garamond", serif', fontSize: 'clamp(2.2rem,11vw,2.75rem)', fontWeight: 600, lineHeight: 1.06, letterSpacing: '-0.03em', color: C.text }}>{title}</h1>
      {context && <p style={{ margin: '0 0 .4rem .45rem', fontSize: '.88rem', lineHeight: 1.5, fontStyle: 'italic', color: C.textMuted }}>{context}</p>}
      {lead && <p style={{ margin: '0 0 0 .45rem', fontSize: '.8rem', lineHeight: 1.5, color: `color-mix(in srgb, ${C.textMuted} 82%, ${C.border} 18%)` }} dangerouslySetInnerHTML={{ __html: lead }} />}
    </div>
  );
}

function SectionTitle({ children, dark }) {
  const C = dark ? COLORS_DARK : COLORS_LIGHT;
  return (
    <h2 style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 600, fontSize: 'clamp(1.42rem,5.5vw,1.72rem)', margin: '0 0 .85rem .45rem', color: C.text }}>
      {children}
    </h2>
  );
}

Object.assign(window, { HuntRow, HeroSection, SectionTitle, Badge });
