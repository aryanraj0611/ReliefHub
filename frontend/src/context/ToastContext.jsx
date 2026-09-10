import { createContext, useCallback, useContext, useRef, useState } from 'react';

const ToastContext = createContext(null);

let _nextId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'info') => {
    const id = ++_nextId;
    setToasts((prev) => [...prev, { id, message, type }]);
    timers.current[id] = setTimeout(() => dismiss(id), 3500);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

// ── Toast container — bottom-left, clear of the chatbot/map buttons ───────────
const TYPE_STYLES = {
  success: 'border-l-emerald-500 bg-emerald-500/10 text-emerald-200',
  error:   'border-l-red-500    bg-red-500/10    text-red-200',
  info:    'border-l-blue-500   bg-blue-500/10   text-blue-200',
};

const TYPE_ICON = {
  success: '✓',
  error:   '✕',
  info:    'ℹ',
};

function ToastContainer({ toasts, onDismiss }) {
  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-4 left-4 z-[3000] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            flex items-start gap-3 px-4 py-3 rounded-xl border-l-4 shadow-panel
            text-sm font-medium backdrop-blur pointer-events-auto
            animate-in slide-in-from-left-4 duration-200
            ${TYPE_STYLES[toast.type] ?? TYPE_STYLES.info}
          `}
        >
          <span className="shrink-0 font-bold mt-0.5">{TYPE_ICON[toast.type]}</span>
          <span className="flex-1 leading-snug">{toast.message}</span>
          <button
            onClick={() => onDismiss(toast.id)}
            className="shrink-0 opacity-50 hover:opacity-100 transition-opacity text-xs leading-none mt-0.5"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
