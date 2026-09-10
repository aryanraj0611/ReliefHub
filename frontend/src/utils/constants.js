// ── Shared color/style constants — import these instead of redefining per component

// Severity: text color classes
export const SEVERITY_TEXT = {
  critical: 'text-red-400',
  high:     'text-orange-400',
  medium:   'text-amber-400',
  low:      'text-green-400',
};

// Severity: left-border classes (for cards)
export const SEVERITY_BORDER = {
  critical: 'border-l-red-500',
  high:     'border-l-orange-500',
  medium:   'border-l-amber-500',
  low:      'border-l-green-500',
};

// Severity: filled dot/circle background (for legend dots, severity indicators)
export const SEVERITY_DOT = {
  critical: 'bg-red-500',
  high:     'bg-orange-500',
  medium:   'bg-amber-500',
  low:      'bg-green-500',
};

// Severity: badge background+text+border (for inline severity pills)
export const SEVERITY_BADGE = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/40',
  high:     'bg-orange-500/20 text-orange-400 border-orange-500/40',
  medium:   'bg-amber-500/20 text-amber-400 border-amber-500/40',
  low:      'bg-green-500/20 text-green-400 border-green-500/40',
};

// Utility: shared timeAgo formatter — avoids defining it in every component
export function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
