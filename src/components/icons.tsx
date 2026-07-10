import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Base({ size = 24, children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {children}
    </svg>
  );
}

export const PlayIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M8 5.14v13.72a1 1 0 0 0 1.53.85l10.36-6.86a1 1 0 0 0 0-1.7L9.53 4.29A1 1 0 0 0 8 5.14Z" />
  </Base>
);

export const PauseIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M7 4a1 1 0 0 1 1 1v14a1 1 0 0 1-2 0V5a1 1 0 0 1 1-1Zm10 0a1 1 0 0 1 1 1v14a1 1 0 0 1-2 0V5a1 1 0 0 1 1-1Z" />
  </Base>
);

export const RewindIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M11 5.5v4.3l6.2-4.5a.8.8 0 0 1 1.3.63v12.14a.8.8 0 0 1-1.3.63L11 14.2v4.3a.8.8 0 0 1-1.3.62L2.4 13.1a1 1 0 0 1 0-1.62l7.3-5.6A.8.8 0 0 1 11 6.3v-.8Z" />
    <text x="5.4" y="15" fontSize="6" fontWeight="700" fill="#0B0B0B">10</text>
  </Base>
);

export const ForwardIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M13 5.5v4.3L6.8 5.3a.8.8 0 0 0-1.3.63v12.14a.8.8 0 0 0 1.3.63L13 14.2v4.3a.8.8 0 0 0 1.3.62l7.3-5.6a1 1 0 0 0 0-1.62l-7.3-5.6A.8.8 0 0 0 13 6.3v-.8Z" />
    <text x="13.7" y="15" fontSize="6" fontWeight="700" fill="#0B0B0B">10</text>
  </Base>
);

export const NextIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M5 5.14v13.72a1 1 0 0 0 1.53.85l9-5.96V19a1 1 0 0 0 2 0V5a1 1 0 1 0-2 0v5.25l-9-5.96A1 1 0 0 0 5 5.14Z" />
  </Base>
);

export const VolumeHighIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M11 5 6 9H3a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h3l5 4a1 1 0 0 0 1.6-.8V5.8A1 1 0 0 0 11 5Z" />
    <path
      d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </Base>
);

export const VolumeLowIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M11 5 6 9H3a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h3l5 4a1 1 0 0 0 1.6-.8V5.8A1 1 0 0 0 11 5Z" />
    <path
      d="M15.5 9.5a4 4 0 0 1 0 5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </Base>
);

export const VolumeMuteIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M11 5 6 9H3a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h3l5 4a1 1 0 0 0 1.6-.8V5.8A1 1 0 0 0 11 5Z" />
    <path
      d="M16 9l5 6m0-6-5 6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </Base>
);

export const FullscreenIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 9a1 1 0 0 1-2 0V4a1 1 0 0 1 1-1h5a1 1 0 0 1 0 2H4v4Zm16 0V5h-4a1 1 0 1 1 0-2h5a1 1 0 0 1 1 1v5a1 1 0 1 1-2 0ZM4 15v4h4a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1v-5a1 1 0 1 1 2 0Zm16 0a1 1 0 0 1 2 0v5a1 1 0 0 1-1 1h-5a1 1 0 1 1 0-2h4v-4Z" />
  </Base>
);

export const FullscreenExitIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M9 4a1 1 0 0 1 0 2H5v4a1 1 0 1 1-2 0V5a1 1 0 0 1 1-1h5Zm6 0h4a1 1 0 0 1 1 1v5a1 1 0 1 1-2 0V6h-3a1 1 0 1 1 0-2ZM9 20H5a1 1 0 0 1-1-1v-5a1 1 0 1 1 2 0v4h4a1 1 0 1 1 0 2Zm6 0a1 1 0 1 1 0-2h4v-4a1 1 0 1 1 2 0v5a1 1 0 0 1-1 1h-5Z" />
  </Base>
);

export const SettingsIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z" />
    <path d="M19.4 13a1.7 1.7 0 0 1 .34-1.86l.06-.06a1.5 1.5 0 1 0-2.12-2.12l-.06.06a1.7 1.7 0 0 1-2.9-1.2V7.5a1.5 1.5 0 0 0-3 0v.32a1.7 1.7 0 0 1-2.9 1.2l-.06-.06a1.5 1.5 0 1 0-2.12 2.12l.06.06A1.7 1.7 0 0 1 4.6 13H4.5a1.5 1.5 0 0 0 0 3h.1a1.7 1.7 0 0 1 1.2 2.9l-.06.06a1.5 1.5 0 1 0 2.12 2.12l.06-.06a1.7 1.7 0 0 1 2.9 1.2v.32a1.5 1.5 0 0 0 3 0v-.32a1.7 1.7 0 0 1 2.9-1.2l.06.06a1.5 1.5 0 1 0 2.12-2.12l-.06-.06A1.7 1.7 0 0 1 19.4 16h.1a1.5 1.5 0 0 0 0-3h-.1Z" opacity="0.0" />
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      d="M12 2.5l1.6.2.9-1.3 2.3 1.3-.2 1.6 1.4 1-1.4 1 .2 1.6-2.3 1.3-.9-1.3-1.6.2-.9 1.5h-2.2l-.9-1.5-1.6-.2-.9 1.3-2.3-1.3.2-1.6-1.4-1 1.4-1-.2-1.6L5.5 1.4l.9 1.3 1.6-.2L9.8 0h4.4z"
    />
  </Base>
);

export const CaptionsIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm5 5a2 2 0 0 0-2 2 2 2 0 0 0 3.6 1.2.9.9 0 1 1 1.2 1.3A3.8 3.8 0 0 1 4 12a3.8 3.8 0 0 1 7.8-1.5.9.9 0 1 1-1.2 1.3A2 2 0 0 0 9 10Zm7 0a2 2 0 0 0-2 2 2 2 0 0 0 3.6 1.2.9.9 0 1 1 1.2 1.3A3.8 3.8 0 0 1 11 12a3.8 3.8 0 0 1 7.8-1.5.9.9 0 1 1-1.2 1.3A2 2 0 0 0 16 10Z" />
  </Base>
);

export const InfoIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 4.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM12 11a1 1 0 0 1 1 1v5a1 1 0 1 1-2 0v-5a1 1 0 0 1 1-1Z" />
  </Base>
);

export const CheckIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M9.55 17.55 4.4 12.4l1.7-1.7 3.45 3.45 8.25-8.25 1.7 1.7-9.95 9.95Z" />
  </Base>
);

export const CloseIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12 19 6.4 17.6 5 12 10.6 6.4 5Z" />
  </Base>
);

export const PiPIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Zm2 0v8h12V6H5Zm7 10h5v2h-5v-2Z" />
  </Base>
);

export const KeyboardIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M2 7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7Zm3 2v1h2V9H5Zm0 3v1h2v-1H5Zm3-3v1h2V9H8Zm0 3v1h2v-1H8Zm3-3v1h2V9h-2Zm0 3v1h2v-1h-2Zm3-3v1h2V9h-2Zm0 3v1h5v-1h-5Zm3-3v1h2V9h-2Z" />
  </Base>
);

export const ArrowLeftIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M15.5 4.6 9 11l6.5 6.4a1 1 0 0 1-1.4 1.42l-7-6.9a1 1 0 0 1 0-1.42l7-6.9a1 1 0 1 1 1.4 1.4Z" />
  </Base>
);

export const ChromecastIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M21 3H3a2 2 0 0 0-2 2v3a1 1 0 0 0 2 0V5h18v14h-7a1 1 0 1 0 0 2h7a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2ZM3 11a1 1 0 1 0 0 2 3 3 0 0 1 3 3 1 1 0 1 0 2 0 5 5 0 0 0-5-5Zm0 4a1 1 0 0 0-1 1v2a1 1 0 0 0 2 0v-2a1 1 0 0 0-1-1Zm0-8a1 1 0 1 0 0 2 7 7 0 0 1 7 7 1 1 0 1 0 2 0 9 9 0 0 0-9-9Z" />
  </Base>
);

export const ListIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 6h13a1 1 0 0 1 0 2H4a1 1 0 0 1 0-2Zm0 5h13a1 1 0 0 1 0 2H4a1 1 0 0 1 0-2Zm0 5h9a1 1 0 0 1 0 2H4a1 1 0 0 1 0-2Z" />
    <circle cx="19.5" cy="7" r="1.4" />
    <circle cx="19.5" cy="12" r="1.4" />
    <circle cx="19.5" cy="17" r="1.4" />
  </Base>
);

export const SearchIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M10.5 3a7.5 7.5 0 1 0 4.55 13.46l4.5 4.5a1 1 0 0 0 1.41-1.42l-4.5-4.5A7.5 7.5 0 0 0 10.5 3Zm0 2a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11Z" />
  </Base>
);

export const StarIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 2.5l2.9 5.9 6.5.95-4.7 4.58 1.11 6.47L12 17.9 6.19 20.9l1.11-6.47L2.6 9.85l6.5-.95L12 2.5Zm0 3.2L10.1 9.5a1 1 0 0 1-.75.55l-3.86.56 2.8 2.73a1 1 0 0 1 .29.88l-.66 3.85L11.1 16.5a1 1 0 0 1 .93 0l3.45 1.82-.66-3.85a1 1 0 0 1 .29-.88l2.8-2.73-3.86-.56a1 1 0 0 1-.75-.55L12 5.7Z" />
  </Base>
);

export const StarFilledIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 2.5l2.9 5.9 6.5.95-4.7 4.58 1.11 6.47L12 17.9 6.19 20.9l1.11-6.47L2.6 9.85l6.5-.95L12 2.5Z" />
  </Base>
);

export const TvIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Zm2 0v10h14V6H5Zm5 13a1 1 0 0 1 1-1h2a1 1 0 1 1 0 2h-2a1 1 0 0 1-1-1Z" />
    <path
      d="M8.5 3.2 12 6.5l3.5-3.3"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Base>
);

export const ImportIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3a1 1 0 0 1 1 1v7.59l2.3-2.3a1 1 0 0 1 1.4 1.42l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.42l2.3 2.3V4a1 1 0 0 1 1-1Z" />
    <path d="M4 15a1 1 0 0 1 1 1v2a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2a1 1 0 1 1 2 0v2a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-2a1 1 0 0 1 1-1Z" />
  </Base>
);

export const ChevronRightIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M8.6 5.6a1 1 0 0 1 1.4 0l6 6a1 1 0 0 1 0 1.42l-6 6a1 1 0 0 1-1.4-1.42L14.1 12 8.6 6.7a1 1 0 0 1 0-1.4Z" />
  </Base>
);

export const RefreshIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M20 11a8 8 0 1 0-.9 4.6 1 1 0 1 0-1.78-.9A6 6 0 1 1 18 11h-2.2a1 1 0 0 0 0 2H19a1 1 0 0 0 1-1v-3a1 1 0 1 0-2 0v2Z" />
    <path d="M4 13a8 8 0 0 0 14.3 4.6 1 1 0 1 0-1.7-1.06A6 6 0 0 1 6 13h2.2a1 1 0 0 0 0-2H5a1 1 0 0 0-1 1v3a1 1 0 1 0 2 0v-2Z" opacity="0" />
  </Base>
);
