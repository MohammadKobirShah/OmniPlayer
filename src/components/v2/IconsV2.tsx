import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
}

// ═══════════════════════════════════════════════════
//  OmniStream V2 — Premium Icon Set
//  Optically balanced · 2px stroke · Rounded caps
//  Inspired by: Lucide, Phosphor, Apple SF Symbols
// ═══════════════════════════════════════════════════

export const PlayV2: React.FC<IconProps> = ({ size = 24, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
    <path d="M7.5 4.27c-.84-.53-1.93.03-1.93 1v13.46c0 .97 1.09 1.53 1.93 1L19.1 12.99c.78-.49.78-1.49 0-1.98L7.5 4.27z" fill="currentColor" />
  </svg>
);

export const PauseV2: React.FC<IconProps> = ({ size = 24, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
    <rect x="5.5" y="3.5" width="4" height="17" rx="1.25" fill="currentColor" />
    <rect x="14.5" y="3.5" width="4" height="17" rx="1.25" fill="currentColor" />
  </svg>
);

export const SkipBackV2: React.FC<IconProps> = ({ size = 24, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M12.5 4.5a8 8 0 11-1 .08" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M12.5 4.5L9.5 7l3 2.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9.8 14.1V16H8.6v-4.2h1.05l1.3 2.8 1.3-2.8h1.05V16h-1.2v-1.9l-.85 1.9h-.7l-.7-1.9zm5.8-2.3v.9h-1.15v-.9h1.15zM14.3 13.3c0-.24.07-.45.2-.62.14-.17.34-.26.6-.26s.46.09.6.26c.14.17.2.38.2.62V16h-1.6v-2.7z" fill="currentColor" />
  </svg>
);

export const SkipForwardV2: React.FC<IconProps> = ({ size = 24, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M11.5 4.5a8 8 0 101-.08" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M11.5 4.5l3 2.5-3 2.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9.8 14.1V16H8.6v-4.2h1.05l1.3 2.8 1.3-2.8h1.05V16h-1.2v-1.9l-.85 1.9h-.7l-.7-1.9zm5.8-2.3v.9h-1.15v-.9h1.15zM14.3 13.3c0-.24.07-.45.2-.62.14-.17.34-.26.6-.26s.46.09.6.26c.14.17.2.38.2.62V16h-1.6v-2.7z" fill="currentColor" />
  </svg>
);

export const VolumeV2: React.FC<IconProps> = ({ size = 24, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
    <path d="M10.6 4.88a.6.6 0 00-.96-.48L6.24 7.5H3.6A1.6 1.6 0 002 9.1v5.8a1.6 1.6 0 001.6 1.6h2.64l3.4 3.1a.6.6 0 00.96-.48V4.88z" fill="currentColor" />
    <path d="M14.1 9.2a4 4 0 010 5.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
    <path d="M17 6.5a8.5 8.5 0 010 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
  </svg>
);

export const VolumeLowV2: React.FC<IconProps> = ({ size = 24, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
    <path d="M10.6 4.88a.6.6 0 00-.96-.48L6.24 7.5H3.6A1.6 1.6 0 002 9.1v5.8a1.6 1.6 0 001.6 1.6h2.64l3.4 3.1a.6.6 0 00.96-.48V4.88z" fill="currentColor" />
    <path d="M14.1 9.2a4 4 0 010 5.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
  </svg>
);

export const VolumeMuteV2: React.FC<IconProps> = ({ size = 24, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
    <path d="M10.6 4.88a.6.6 0 00-.96-.48L6.24 7.5H3.6A1.6 1.6 0 002 9.1v5.8a1.6 1.6 0 001.6 1.6h2.64l3.4 3.1a.6.6 0 00.96-.48V4.88z" fill="currentColor" />
    <path d="M20.5 9l-5 6m0-6l5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
  </svg>
);

export const FullscreenV2: React.FC<IconProps> = ({ size = 24, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3.5 8.5v-3a2 2 0 012-2h3" />
    <path d="M20.5 8.5v-3a2 2 0 00-2-2h-3" />
    <path d="M3.5 15.5v3a2 2 0 002 2h3" />
    <path d="M20.5 15.5v3a2 2 0 01-2 2h-3" />
  </svg>
);

export const FullscreenExitV2: React.FC<IconProps> = ({ size = 24, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M8.5 3.5v3a2 2 0 01-2 2h-3" />
    <path d="M15.5 3.5v3a2 2 0 002 2h3" />
    <path d="M8.5 20.5v-3a2 2 0 00-2-2h-3" />
    <path d="M15.5 20.5v-3a2 2 0 012-2h3" />
  </svg>
);

export const SettingsV2: React.FC<IconProps> = ({ size = 24, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const SubtitlesV2: React.FC<IconProps> = ({ size = 24, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
    <rect x="1.5" y="3.5" width="21" height="17" rx="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
    <text x="12" y="15.8" textAnchor="middle" fill="currentColor" fontSize="9.5" fontWeight="800" fontFamily="Inter,system-ui,sans-serif" letterSpacing="-0.5">CC</text>
  </svg>
);

export const AudioV2: React.FC<IconProps> = ({ size = 24, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" fill="currentColor" stroke="none" />
    <circle cx="18" cy="16" r="3" fill="currentColor" stroke="none" />
  </svg>
);

export const PipV2: React.FC<IconProps> = ({ size = 24, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="2" y="3.5" width="20" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
    <rect x="12.5" y="10" width="7.5" height="5" rx="1.25" fill="currentColor" opacity="0.35" stroke="currentColor" strokeWidth="1" />
  </svg>
);

export const BackV2: React.FC<IconProps> = ({ size = 24, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M14 18l-6-6 6-6" />
  </svg>
);

export const CloseV2: React.FC<IconProps> = ({ size = 24, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className={className}>
    <path d="M17 7L7 17M7 7l10 10" />
  </svg>
);

export const CheckV2: React.FC<IconProps> = ({ size = 24, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M20 6L9.5 17 4 12" />
  </svg>
);

export const LiveV2: React.FC<IconProps> = ({ size = 24, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="3.5" fill="currentColor" />
    <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
    <circle cx="12" cy="12" r="10.5" stroke="currentColor" strokeWidth="1" opacity="0.12" />
  </svg>
);

export const LockV2: React.FC<IconProps> = ({ size = 24, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="4.5" y="10.5" width="15" height="11" rx="2.5" />
    <path d="M7.5 10.5V7a4.5 4.5 0 019 0v3.5" />
    <circle cx="12" cy="16" r="1.5" fill="currentColor" stroke="none" />
  </svg>
);
