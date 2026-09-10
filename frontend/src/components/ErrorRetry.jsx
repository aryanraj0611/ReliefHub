/**
 * Inline error + retry banner.
 * Used in place of data when a TanStack Query fetch fails.
 */
export default function ErrorRetry({ message = 'Something went wrong', onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 min-h-[160px] gap-3 p-6 text-center">
      <p className="text-2xl">⚠️</p>
      <p className="text-slate-400 text-sm">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-xs text-red-400 hover:text-red-300 underline underline-offset-2 transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}
