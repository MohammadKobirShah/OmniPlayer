import React from 'react';
import { CloseIcon } from './Icons';

const shortcuts: [string, string][] = [
  ['Space / K', 'Play / Pause'],
  ['J / L', 'Rewind / Forward 10s'],
  ['← / →', 'Seek 5s'],
  ['↑ / ↓', 'Volume up / down'],
  ['M', 'Mute'],
  ['F', 'Fullscreen'],
  ['C', 'Captions'],
  ['G', 'Channels / EPG'],
  ['Q', 'Settings'],
  ['S', 'Stats for Nerds'],
  ['[ / ]', 'Slower / Faster'],
  ['0 – 9', 'Seek to 0% – 90%'],
  ['?', 'This help'],
];

interface HelpOverlayProps {
  open: boolean;
  onClose: () => void;
}

export const HelpOverlay: React.FC<HelpOverlayProps> = ({ open, onClose }) => {
  if (!open) return null;

  return (
    <div className="omni-help-overlay" onClick={onClose}>
      <div className="omni-help omni-glass" onClick={(e) => e.stopPropagation()}>
        <div className="omni-help-head">
          <h3>Shortcuts & Gestures</h3>
          <button className="omni-help-close" onClick={onClose}>
            <CloseIcon size={18} />
          </button>
        </div>
        <div className="omni-help-grid">
          {shortcuts.map(([key, desc]) => (
            <div key={key} className="omni-help-row">
              <kbd>{key}</kbd>
              <span>{desc}</span>
            </div>
          ))}
        </div>
        <div className="omni-help-touch">
          <strong>Touch</strong>
          <span>Double-tap sides · ±10s</span>
          <span>Swipe horizontal · seek</span>
          <span>Swipe right · volume</span>
          <span>Swipe left · brightness</span>
          <span>Long-press · 2× speed</span>
        </div>
      </div>
    </div>
  );
};
