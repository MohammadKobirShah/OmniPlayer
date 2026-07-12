import { memo } from 'react';

/**
 * Splash Overlay — shown when player launches a new stream.
 * Displays channel logo (tvg-logo), name, and stylish loading animation.
 * Auto-hides when ready=true && playing=true.
 * Chrome 65+ safe — no backdrop-filter, no inset, no gap.
 */

interface SplashProps {
  visible: boolean;
  name: string;
  logo?: string;
  glyph?: string;
  gradient?: string;
  isLive?: boolean;
}

export var SplashOverlay = memo(function SplashOverlay(props: SplashProps) {
  if (!props.visible) return null;

  var hasLogo = !!props.logo;

  return (
    <div className="splash-overlay">
      {/* Background image (blurred logo) */}
      {hasLogo && (
        <div className="splash-bg" style={{ backgroundImage: 'url(' + props.logo + ')' }} />
      )}

      <div className="splash-content">
        {/* Logo / glyph */}
        <div className="splash-logo-wrap">
          {hasLogo ? (
            <img
              className="splash-logo-img"
              src={props.logo}
              alt=""
              onError={function(e) { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div className="splash-logo-glyph" style={props.gradient ? { background: props.gradient } : undefined}>
              {props.glyph || '📺'}
            </div>
          )}
        </div>

        {/* Spinner ring around logo */}
        <div className="splash-ring" />

        {/* Channel info */}
        <div className="splash-info">
          <span className="splash-watching">Now watching</span>
          <span className="splash-name">{props.name}</span>
          {props.isLive && <span className="splash-live-tag">● LIVE</span>}
        </div>
      </div>
    </div>
  );
});
