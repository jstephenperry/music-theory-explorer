/**
 * Small line-icon set drawn for this app (no icon font dependency).
 * Strokes use currentColor so icons follow the surrounding text color.
 */
export type IconName =
  | 'play' | 'stop' | 'pause' | 'loop' | 'metronome' | 'shuffle' | 'plus' | 'minus' | 'trash' | 'x'
  | 'chevron-left' | 'chevron-right' | 'chevron-down' | 'info' | 'sound' | 'mute' | 'sun' | 'moon'
  | 'menu' | 'midi' | 'keyboard' | 'arrow-right' | 'undo' | 'copy' | 'link' | 'sparkle' | 'check' | 'drag';

const PATHS: Record<IconName, string> = {
  play: 'M7 5.5v13l11-6.5z',
  stop: 'M6.5 6.5h11v11h-11z',
  pause: 'M7.5 5.5h3v13h-3zM13.5 5.5h3v13h-3z',
  loop: 'M17 2.5l3 3-3 3M4 11.5v-1a5 5 0 0 1 5-5h11M7 21.5l-3-3 3-3M20 12.5v1a5 5 0 0 1-5 5H4',
  metronome: 'M9 3h6l4 18H5zM12 17l5-11M8 14h8',
  shuffle: 'M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  trash: 'M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3',
  x: 'M6 6l12 12M18 6L6 18',
  'chevron-left': 'M15 5l-7 7 7 7',
  'chevron-right': 'M9 5l7 7-7 7',
  'chevron-down': 'M5 9l7 7 7-7',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v6M12 7.5v.5',
  sound: 'M4 9.5h4l5-4v13l-5-4H4zM16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12',
  mute: 'M4 9.5h4l5-4v13l-5-4H4zM17 9.5l5 5M22 9.5l-5 5',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z',
  menu: 'M4 7h16M4 12h16M4 17h16',
  midi: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8 10.5v.01M10 8v.01M14 8v.01M16 10.5v.01M10 15h4',
  keyboard: 'M3 6h18v12H3zM7 6v7M11 6v7M15 6v7M7 13v5M12 13v5M17 13v5',
  'arrow-right': 'M5 12h14M13 6l6 6-6 6',
  undo: 'M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3',
  copy: 'M8 8h12v12H8zM16 8V4H4v12h4',
  link: 'M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z',
  check: 'M5 12.5l4.5 4.5L19 7',
  drag: 'M9 6h.01M9 12h.01M9 18h.01M15 6h.01M15 12h.01M15 18h.01',
};

const FILLED = new Set<IconName>(['play', 'stop', 'pause']);

export function Icon({ name, size = 18, title }: { name: IconName; size?: number; title?: string }) {
  const filled = FILLED.has(name);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      style={{ flex: 'none' }}
    >
      {title && <title>{title}</title>}
      <path d={PATHS[name]} />
    </svg>
  );
}
