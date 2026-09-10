/**
 * Centered loading spinner.
 * Uses flex-1 so it fills its container without forcing a full viewport height
 * when nested inside a flex column (e.g. inside dashboard page layouts).
 */
export default function Loader({ text = 'Loading…' }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 min-h-[200px] gap-4">
      <div className="w-10 h-10 rounded-full border-4 border-slate-700 border-t-red-500 animate-spin" />
      <p className="text-slate-400 text-sm tracking-wide">{text}</p>
    </div>
  );
}
