// Unified NeoUI loading animation.
// Rose Orbit loader adapted to Tourgo colors and sizing.

function roseOrbitPoint(progress, detailScale) {
  const t = progress * Math.PI * 2;
  const r = 7 - 2.7 * detailScale * Math.cos(7 * t);
  return {
    x: 50 + Math.cos(t) * r * 3.9,
    y: 50 + Math.sin(t) * r * 3.9,
  };
}

function roseOrbitPath(detailScale, steps = 480) {
  return Array.from({ length: steps + 1 }, (_, index) => {
    const p = roseOrbitPoint(index / steps, detailScale);
    return `${index === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
  }).join(' ');
}

function normalizeRoseProgress(progress) {
  return ((progress % 1) + 1) % 1;
}

function roseDetailScale(time) {
  const pulseProgress = (time % 4600) / 4600;
  return 0.52 + ((Math.sin(pulseProgress * Math.PI * 2 + 0.55) + 1) / 2) * 0.48;
}

function roseParticle(index, progress, detailScale, count = 72) {
  const tailOffset = index / (count - 1);
  const point = roseOrbitPoint(normalizeRoseProgress(progress - tailOffset * 0.42), detailScale);
  const fade = Math.pow(1 - tailOffset, 0.56);
  return {
    x: point.x,
    y: point.y,
    radius: 0.9 + fade * 2.7,
    opacity: 0.04 + fade * 0.96,
  };
}

const LOADER_CONFIGS = {
  rose: {
    particleCount: 72,
    trailSpan: 0.42,
    durationMs: 5200,
    rotationDurationMs: 28000,
    pulseDurationMs: 4600,
    strokeWidth: 5.2,
    path(detailScale, steps = 300) {
      return roseOrbitPath(detailScale, steps);
    },
    particle(index, progress, detailScale, count) {
      return roseParticle(index, progress, detailScale, count);
    },
    rotation(time) {
      return -((time % 28000) / 28000) * 360;
    },
  },
  spiral: {
    particleCount: 140,
    trailSpan: 0.28,
    durationMs: 7800,
    rotationDurationMs: 44000,
    pulseDurationMs: 6800,
    strokeWidth: 4.3,
    path(detailScale, steps = 320) {
      return Array.from({ length: steps + 1 }, (_, index) => {
        const p = spiralSearchPoint(index / steps, detailScale);
        return `${index === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
      }).join(' ');
    },
    particle(index, progress, detailScale, count) {
      const tailOffset = index / (count - 1);
      const point = spiralSearchPoint(normalizeRoseProgress(progress - tailOffset * 0.28), detailScale);
      const fade = Math.pow(1 - tailOffset, 0.56);
      return {
        x: point.x,
        y: point.y,
        radius: 0.9 + fade * 2.7,
        opacity: 0.04 + fade * 0.96,
      };
    },
    rotation() {
      return 0;
    },
  },
};

function spiralSearchPoint(progress, detailScale) {
  const t = progress * Math.PI * 2;
  const angle = t * 4;
  const radius = 8 + (1 - Math.cos(t)) * (8.5 + detailScale * 2.4);
  return {
    x: 50 + Math.cos(angle) * radius,
    y: 50 + Math.sin(angle) * radius,
  };
}

function NeoMathCurveLoader({
  dark,
  size = 168,
  label = 'Loading',
  sublabel = 'Preparing Tourgo',
  compact = false,
  bare = true,
  colorOverride = '',
  variant = 'rose',
}) {
  const C = dark ? NEO.dark : NEO.light;
  const rootRef = React.useRef(null);
  const groupRef = React.useRef(null);
  const pathRef = React.useRef(null);
  const particleRefs = React.useRef([]);
  const config = LOADER_CONFIGS[variant] || LOADER_CONFIGS.rose;
  const particleCount = compact ? Math.min(56, config.particleCount) : Math.min(96, config.particleCount);
  const color = colorOverride || (dark ? C.deep : C.accent);
  const frameBg = dark ? 'rgba(244,239,228,0.035)' : 'rgba(255,255,255,0.42)';
  const frameBorder = dark ? 'rgba(244,239,228,0.08)' : 'rgba(44,60,55,0.10)';

  React.useEffect(() => {
    let raf = 0;
    let active = false;
    let startedAt = performance.now();
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

    function paint(now) {
      const time = now - startedAt;
      const progress = reduced ? 0.18 : (time % config.durationMs) / config.durationMs;
      const detailScale = reduced ? 0.78 : roseDetailScale(time * (4600 / config.pulseDurationMs));
      const rotation = reduced ? (variant === 'spiral' ? 0 : -18) : config.rotation(time);

      if (groupRef.current) groupRef.current.setAttribute('transform', `rotate(${rotation} 50 50)`);
      if (pathRef.current) pathRef.current.setAttribute('d', config.path(detailScale));

      particleRefs.current.forEach((node, index) => {
        if (!node) return;
        const p = config.particle(index, progress, detailScale, particleCount);
        node.setAttribute('cx', p.x.toFixed(2));
        node.setAttribute('cy', p.y.toFixed(2));
        node.setAttribute('r', p.radius.toFixed(2));
        node.setAttribute('opacity', p.opacity.toFixed(3));
      });
    }

    function render(now) {
      paint(now);

      if (!reduced && active) raf = requestAnimationFrame(render);
    }

    function start() {
      if (raf) return;
      active = true;
      startedAt = performance.now();
      raf = requestAnimationFrame(render);
    }

    function stop() {
      active = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }

    paint(performance.now());

    const node = rootRef.current;
    let observer = null;
    if (!reduced && node && 'IntersectionObserver' in window) {
      observer = new IntersectionObserver((entries) => {
        const visible = entries.some((entry) => entry.isIntersecting);
        if (visible) start();
        else stop();
      }, { rootMargin: '260px' });
      observer.observe(node);
    } else if (!reduced) {
      start();
    }

    return () => {
      stop();
      if (observer) observer.disconnect();
    };
  }, [particleCount, variant]);

  return (
    <div ref={rootRef} style={{
      display: 'grid',
      gap: compact ? 10 : 16,
      justifyItems: 'center',
      color,
    }}>
      <div style={{
        width: size,
        height: size,
        aspectRatio: '1 / 1',
        borderRadius: '50%',
        background: bare ? 'transparent' : frameBg,
        border: bare ? 'none' : `1px solid ${frameBorder}`,
        display: 'grid',
        placeItems: 'center',
        boxShadow: bare ? 'none' : (dark ? 'inset 0 1px 0 rgba(255,255,255,0.05), 0 18px 45px rgba(0,0,0,0.24)' : 'inset 0 1px 0 rgba(255,255,255,0.8), 0 16px 36px rgba(60,91,83,0.12)'),
      }}>
        <svg viewBox="0 0 100 100" fill="none" aria-hidden="true" style={{ width: '86%', height: '86%', overflow: 'visible', filter: dark ? 'drop-shadow(0 0 12px rgba(230,220,200,0.14))' : 'drop-shadow(0 4px 12px rgba(199,106,78,0.18))' }}>
          <g ref={groupRef}>
            <path
              ref={pathRef}
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={compact ? Math.max(3.7, config.strokeWidth - 0.8) : config.strokeWidth}
              opacity={dark ? 0.16 : 0.18}
            />
            {Array.from({ length: particleCount }).map((_, index) => (
              <circle
                key={index}
                ref={(node) => { particleRefs.current[index] = node; }}
                fill="currentColor"
              />
            ))}
          </g>
        </svg>
      </div>

      {label && (
        <div style={{ textAlign: 'center', display: 'grid', gap: 4 }}>
          <div style={{
            fontFamily: NEO_DISPLAY,
            fontWeight: 800,
            fontSize: compact ? 18 : 28,
            lineHeight: 0.9,
            letterSpacing: '-0.01em',
            textTransform: 'uppercase',
            color: C.deep,
          }}>{label}</div>
          {sublabel && (
            <div style={{
              fontSize: compact ? 10 : 12,
              fontWeight: 800,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: C.muted,
            }}>{sublabel}</div>
          )}
        </div>
      )}
    </div>
  );
}

function NeoRoseOrbitLoader(props) {
  return <NeoMathCurveLoader {...props} variant="rose" />;
}

function NeoSpiralSearchLoader(props) {
  return <NeoMathCurveLoader {...props} variant="spiral" />;
}

function NeoLoadingScreen({ dark }) {
  const C = dark ? NEO.dark : NEO.light;
  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: C.bg,
      color: C.text,
      fontFamily: NEO_UI,
      display: 'grid',
      placeItems: 'center',
      padding: 28,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        top: 60,
        left: 28,
        fontFamily: NEO_DISPLAY,
        fontSize: 22,
        fontWeight: 800,
        color: C.accent,
        letterSpacing: '0.02em',
      }}>TOURGO</div>
      <NeoRoseOrbitLoader dark={dark} size={230} label="Loading Hunts" sublabel="Rose orbit route sync" />
      <div style={{
        position: 'absolute',
        left: 28,
        right: 28,
        bottom: 42,
        display: 'flex',
        justifyContent: 'space-between',
        color: C.muted,
        fontFamily: NEO_DISPLAY,
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
      }}>
        <span>Manhattan</span>
        <span>One moment</span>
      </div>
    </div>
  );
}

function NeoInlineLoadingPanel({ dark }) {
  const C = dark ? NEO.dark : NEO.light;
  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: C.bg,
      color: C.text,
      fontFamily: NEO_UI,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <NeoHome dark={dark} />
      <div style={{
        position: 'absolute',
        inset: 0,
        background: dark ? 'rgba(20,25,26,0.68)' : 'rgba(236,232,223,0.72)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'grid',
        placeItems: 'center',
        padding: 22,
      }}>
        <div style={{
          width: '100%',
          borderRadius: 30,
          padding: 22,
          background: C.surface,
          border: `1px solid ${C.border}`,
          boxShadow: '0 20px 56px rgba(0,0,0,0.28)',
        }}>
          <NeoSpiralSearchLoader dark={dark} size={156} label="Refreshing" sublabel="Searching nearby hunts" compact />
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  NeoRoseOrbitLoader,
  NeoSpiralSearchLoader,
  NeoMathCurveLoader,
  NeoLoadingScreen,
  NeoInlineLoadingPanel,
});
