/**
 * Reusable status pill — used by citizen cards, EOC table, rescue console.
 * status values mirror the backend enum:
 *   reported | acknowledged | dispatched | in_progress | resolved | merged | rejected
 */
const CONFIG = {
  reported:     { label: 'Reported',     cls: 'bg-slate-700/60 text-slate-300  border-slate-600' },
  acknowledged: { label: 'Acknowledged', cls: 'bg-blue-500/20  text-blue-300   border-blue-500/40' },
  dispatched:   { label: 'Dispatched',   cls: 'bg-amber-500/20 text-amber-300  border-amber-500/40' },
  in_progress:  { label: 'In Progress',  cls: 'bg-orange-500/20 text-orange-300 border-orange-500/40' },
  resolved:     { label: 'Resolved',     cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  merged:       { label: 'Merged',       cls: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
  rejected:     { label: 'Rejected',     cls: 'bg-red-900/40   text-red-400    border-red-700/40' },
};

export default function StatusBadge({ status, className = '' }) {
  const { label, cls } = CONFIG[status] ?? CONFIG.reported;
  return (
    <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full border ${cls} ${className}`}>
      {label}
    </span>
  );
}
