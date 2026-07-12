import React, { useState, memo } from 'react';
import { usePlayerStore } from '../store/playerStore';
import { formatBitrate } from '../utils/formatTime';
import { CloseIcon, CheckIcon } from './Icons';

type Tab = 'quality' | 'speed' | 'audio' | 'subs';

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

interface SettingsMenuProps {
  open: boolean;
  onClose: () => void;
  controller: {
    selectQuality: (id: number | null) => void;
    selectAudioLanguage: (lang: string) => void;
    selectTextTrack: (id: number | null) => void;
  };
}

export const SettingsMenu: React.FC<SettingsMenuProps> = memo(({ open, onClose, controller }) => {
  const [tab, setTab] = useState<Tab>('quality');
  const qualities = usePlayerStore((s) => s.qualities);
  const currentQualityId = usePlayerStore((s) => s.currentQualityId);
  const abrEnabled = usePlayerStore((s) => s.abrEnabled);
  const playbackRate = usePlayerStore((s) => s.playbackRate);
  const audioTracks = usePlayerStore((s) => s.audioTracks);
  const currentAudioLanguage = usePlayerStore((s) => s.currentAudioLanguage);
  const textTracks = usePlayerStore((s) => s.textTracks);
  const currentTextTrackId = usePlayerStore((s) => s.currentTextTrackId);

  if (!open) return null;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'quality', label: 'Quality' },
    { key: 'speed', label: 'Speed' },
    { key: 'audio', label: 'Audio' },
    { key: 'subs', label: 'Subs' },
  ];

  const MenuRow: React.FC<{
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
  }> = ({ active, onClick, children }) => (
    <button
      className={`omni-menu-row ${active ? 'is-active' : ''}`}
      onClick={onClick}
    >
      <span className="omni-menu-row-label">{children}</span>
      {active && <CheckIcon size={16} className="omni-menu-check" />}
    </button>
  );

  return (
    <div className="omni-menu omni-glass" onClick={(e) => e.stopPropagation()}>
      <div className="omni-menu-tabs">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`omni-menu-tab ${tab === t.key ? 'is-active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="omni-menu-body">
        {tab === 'quality' && (
          <>
            <MenuRow
              active={abrEnabled || currentQualityId === null}
              onClick={() => controller.selectQuality(null)}
            >
              Auto
            </MenuRow>
            {qualities.length === 0 && (
              <div className="omni-menu-empty">
                Qualities appear once playback starts…
              </div>
            )}
            {qualities.map((q) => (
              <MenuRow
                key={q.id}
                active={!abrEnabled && currentQualityId === q.id}
                onClick={() => controller.selectQuality(q.id)}
              >
                {q.label} <span className="omni-qual-bw">{formatBitrate(q.bandwidth / 1000)}</span>
              </MenuRow>
            ))}
          </>
        )}

        {tab === 'speed' &&
          SPEED_OPTIONS.map((s) => (
            <MenuRow
              key={s}
              active={playbackRate === s}
              onClick={() => usePlayerStore.getState().setPlaybackRate(s)}
            >
              {s === 1 ? 'Normal' : `${s}×`}
            </MenuRow>
          ))}

        {tab === 'audio' && (
          <>
            {audioTracks.length === 0 && (
              <div className="omni-menu-empty">Single audio track.</div>
            )}
            {audioTracks.map((t) => (
              <MenuRow
                key={t.id}
                active={currentAudioLanguage === t.language}
                onClick={() => controller.selectAudioLanguage(t.language)}
              >
                {t.label}
              </MenuRow>
            ))}
          </>
        )}

        {tab === 'subs' && (
          <>
            <MenuRow
              active={currentTextTrackId === null}
              onClick={() => controller.selectTextTrack(null)}
            >
              Off
            </MenuRow>
            {textTracks.length === 0 && (
              <div className="omni-menu-empty">No subtitles for this stream.</div>
            )}
            {textTracks.map((t) => (
              <MenuRow
                key={t.id}
                active={currentTextTrackId === t.id}
                onClick={() => controller.selectTextTrack(t.id)}
              >
                {t.label}
              </MenuRow>
            ))}
          </>
        )}
      </div>

      <button className="omni-menu-close" onClick={onClose} aria-label="Close settings">
        <CloseIcon size={16} />
      </button>
    </div>
  );
});
