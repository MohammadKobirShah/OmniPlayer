import { useEffect, useState } from 'react';
import { ChromecastIcon } from './icons';

/* Minimal ambient types for the Cast Framework (loaded at runtime). */
interface CastContext {
  setOptions: (o: unknown) => void;
  addEventListener: (t: string, cb: () => void) => void;
  getCastState: () => string;
  requestSession: () => Promise<void>;
  getCurrentSession: () => { getCastDevice: () => { friendlyName?: string } } | null;
}
interface CastApi {
  framework: {
    CastContext: {
      getInstance: () => CastContext;
      CastState: { CONNECTED: string; CONNECTING: string; NO_DEVICES_AVAILABLE: string };
    };
    RemotePlayer: new () => unknown;
    RemotePlayerController: new (p: unknown) => unknown;
  };
}

let sdkPromise: Promise<CastApi | null> | null = null;

/** Lazily inject the Cast sender SDK once. */
function loadCastSdk(): Promise<CastApi | null> {
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(null);
    const w = window as unknown as { google?: { cast?: unknown }; __onGCastApiAvailable?: (a: boolean) => void };
    w.__onGCastApiAvailable = (available: boolean) => {
      if (available && w.google?.cast) resolve(w.google.cast as CastApi);
      else resolve(null);
    };
    if (!document.getElementById('omni-cast-sdk')) {
      const s = document.createElement('script');
      s.id = 'omni-cast-sdk';
      s.src = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';
      s.onerror = () => resolve(null);
      document.body.appendChild(s);
    }
  });
  return sdkPromise;
}

type CastUi = 'unavailable' | 'idle' | 'connecting' | 'connected';

export default function CastButton() {
  const [ui, setUi] = useState<CastUi>('unavailable');
  const [device, setDevice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let interval: ReturnType<typeof setInterval> | null = null;

    loadCastSdk().then((api) => {
      if (!active || !api) return;
      try {
        const ctx = api.framework.CastContext.getInstance();
        ctx.setOptions({
          receiverApplicationId: 'CC1AD845', // default Styled Media Receiver
          autoJoinPolicy: 'origin_scoped',
        });
        const map = (state: string) => {
          const C = api.framework.CastContext.CastState;
          if (state === C.CONNECTED) return 'connected';
          if (state === C.CONNECTING) return 'connecting';
          if (state === C.NO_DEVICES_AVAILABLE) return 'unavailable';
          return 'idle';
        };
        const sync = () => {
          setUi(map(ctx.getCastState()));
          const sess = ctx.getCurrentSession();
          setDevice(sess?.getCastDevice()?.friendlyName ?? null);
        };
        ctx.addEventListener('caststatechanged', sync);
        sync();
        interval = setInterval(sync, 1500);
      } catch {
        setUi('unavailable');
      }
    });

    return () => {
      active = false;
      if (interval) clearInterval(interval);
    };
  }, []);

  const onClick = async () => {
    const api = await loadCastSdk();
    if (!api) {
      setUi('unavailable');
      return;
    }
    try {
      await api.framework.CastContext.getInstance().requestSession();
    } catch {
      /* user dismissed the dialog */
    }
  };

  const label =
    ui === 'connected'
      ? `Casting${device ? ` · ${device}` : ''}`
      : ui === 'connecting'
        ? 'Connecting…'
        : ui === 'idle'
          ? 'Cast'
          : 'Cast unavailable';

  const active = ui === 'connected' || ui === 'connecting';

  return (
    <button
      className={`omni-btn omni-cast ${active ? 'is-active' : ''} ${ui === 'unavailable' ? 'is-muted' : ''}`}
      onClick={onClick}
      title={label}
      aria-label={label}
    >
      <ChromecastIcon size={22} />
    </button>
  );
}
