import { useState } from 'react';
import { usePlayerStore } from '../store/playerStore';
import type { ShakaController } from '../hooks/useShakaPlayer';
import { CheckIcon, CloseIcon } from './icons';
import { formatBitrate } from '../lib/format';

interface Props {
  open: boolean;
  onClose: () => void;
  controller: ShakaController;
}

type Tab = 'quality' | 'speed' | 'audio' | 'subs';

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export default function SettingsMenu({ open, onClose, controller }: Props) {
  const [tab, setTab] = useState<Tab>('quality');
  const {
    qualities,
    audioTracks,
    textTracks,
    abrEnabled,
    currentQualityId,
    currentAudioLanguage,
    currentTextId,
    playbackRate,
  } = usePlayerStore();

  if (!open) return null;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'quality', label: 'Quality' },
    { id: 'speed', label: 'Speed' },
    { id: 'audio', label: 'Audio' },
    { id: 'subs', label: 'Subtitles' },
  ];

  const Row = ({
    active,
    onClick,
    children,
  }: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
  }) => (
    <button
      className={`omni-menu-row ${active ? 'is-active' : ''}`}
      onClick={() => {
        onClick();
        if (tab === 'quality' || tab === 'speed') {
          /* keep menu open while adjusting */
        }
      }}
    >
      <span className="omni-menu-row-label">{children}</span>
      {active && <CheckIcon size={18} className="omni-menu-check" />}
    </button>
  );

  return (
    <div className="omni-menu omni-glass" role="menu" onClick={(e) => e.stopPropagation()}>
      <div className="omni-menu-tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`omni-menu-tab ${tab === t.id ? 'is-active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="omni-menu-body">
        {tab === 'quality' && (
          <>
            <Row
              active={abrEnabled || currentQualityId === null}
              onClick={() => controller.selectQuality(null)}
            >
              <span className="omni-qual-name">Auto</span>
              <span className="omni-qual-sub">Adaptive bitrate (recommended)</span>
            </Row>
            {qualities.length === 0 && (
              <div className="omni-menu-empty">Resolutions appear once playback starts…</div>
            )}
            {qualities.map((q) => (
              <Row
                key={q.id}
                active={!abrEnabled && currentQualityId === q.id}
                onClick={() => controller.selectQuality(q.id)}
              >
                <span className="omni-qual-name">{q.label}</span>
                <span className="omni-qual-sub">{formatBitrate(q.bandwidth / 1000)}</span>
              </Row>
            ))}
          </>
        )}

        {tab === 'speed' &&
          SPEEDS.map((s) => (
            <Row key={s} active={playbackRate === s} onClick={() => usePlayerStore.getState().setPlaybackRate(s)}>
              {s === 1 ? 'Normal' : `${s}×`}
            </Row>
          ))}

        {tab === 'audio' && (
          <>
            {audioTracks.length === 0 && (
              <div className="omni-menu-empty">Single audio track.</div>
            )}
            {audioTracks.map((a) => (
              <Row
                key={a.id}
                active={currentAudioLanguage === a.language}
                onClick={() => controller.selectAudioLanguage(a.language)}
              >
                {a.label}
              </Row>
            ))}
          </>
        )}

        {tab === 'subs' && (
          <>
            <Row active={currentTextId === null} onClick={() => controller.selectTextTrack(null)}>
              Off
            </Row>
            {textTracks.length === 0 && (
              <div className="omni-menu-empty">No subtitles for this stream.</div>
            )}
            {textTracks.map((t) => (
              <Row
                key={t.id}
                active={currentTextId === t.id}
                onClick={() => controller.selectTextTrack(t.id)}
              >
                {t.label}
              </Row>
            ))}
          </>
        )}
      </div>

      <button className="omni-menu-close" onClick={onClose} aria-label="Close settings">
        <CloseIcon size={16} />
      </button>
    </div>
  );
}
