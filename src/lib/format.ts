/** Format seconds into m:ss or h:mm:ss. */
export function formatTime(time: number): string {
  if (!Number.isFinite(time) || time < 0) return '0:00';
  const totalSeconds = Math.floor(time);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Format a bitrate (kbps) into a human string. */
export function formatBitrate(kbps: number): string {
  if (!kbps || kbps <= 0) return '—';
  if (kbps >= 1000) return `${(kbps / 1000).toFixed(2)} Mbps`;
  return `${Math.round(kbps)} kbps`;
}

/** Build a short label like "1080p" from a variant height. */
export function qualityLabel(height: number, bandwidth: number): string {
  if (height >= 2160) return '4K';
  if (height >= 1440) return '1440p';
  if (height >= 1080) return '1080p';
  if (height >= 720) return '720p';
  if (height >= 480) return '480p';
  if (height >= 360) return '360p';
  if (height > 0) return `${height}p`;
  if (bandwidth > 0) return `${Math.round(bandwidth / 1000)}k`;
  return 'Auto';
}
