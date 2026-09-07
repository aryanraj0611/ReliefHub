/** Inline error banner for forms. */
export default function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/40 text-red-400 text-sm"
    >
      {message}
    </div>
  );
}
