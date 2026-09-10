import { useState } from 'react';
import { useActiveAlerts, useDismissAlert, useIssueAlert } from '../api/alerts';
import { useToast } from '../context/ToastContext';
import Button from './Button';

const SEVERITY_STYLES = {
  info:     'bg-blue-500/15  border-blue-500/40  text-blue-300',
  warning:  'bg-amber-500/15 border-amber-500/40 text-amber-300',
  critical: 'bg-red-500/15   border-red-500/40   text-red-300',
};

const SEVERITY_DOT = {
  info:     'bg-blue-400',
  warning:  'bg-amber-400',
  critical: 'bg-red-500 animate-pulse',
};

export default function BroadcastBar() {
  const { data: alerts = [] } = useActiveAlerts();
  const { mutateAsync: issue, isPending: issuing } = useIssueAlert();
  const { mutateAsync: dismiss } = useDismissAlert();
  const { showToast } = useToast();

  const [composing, setComposing] = useState(false);
  const [message,   setMessage]   = useState('');
  const [severity,  setSeverity]  = useState('warning');
  const [error,     setError]     = useState('');

  const latestAlert = alerts[0] ?? null;

  const handleSend = async () => {
    if (!message.trim()) { setError('Message is required'); return; }
    setError('');
    try {
      await issue({ message: message.trim(), severity });
      setMessage('');
      setComposing(false);
      showToast('Alert broadcast sent', 'success');
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to send alert');
      showToast("Couldn't send alert — please try again", 'error');
    }
  };

  return (
    <div className="bg-navy-900 border-b border-slate-700/60 px-4 py-2">
      {/* Active alert banner */}
      {latestAlert && !composing && (
        <div className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-sm ${SEVERITY_STYLES[latestAlert.severity] ?? SEVERITY_STYLES.warning}`}>
          <span className={`w-2 h-2 rounded-full shrink-0 ${SEVERITY_DOT[latestAlert.severity] ?? SEVERITY_DOT.warning}`} />
          <span className="flex-1 font-medium">{latestAlert.message}</span>
          <button
            onClick={() => dismiss(latestAlert._id)}
            className="text-xs opacity-60 hover:opacity-100 shrink-0 transition-opacity"
            aria-label="Dismiss alert"
          >
            Dismiss ✕
          </button>
          <button
            onClick={() => setComposing(true)}
            className="text-xs opacity-60 hover:opacity-100 shrink-0 transition-opacity ml-1"
          >
            + New
          </button>
        </div>
      )}

      {/* No active alert — show compose trigger */}
      {!latestAlert && !composing && (
        <button
          onClick={() => setComposing(true)}
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          📢 Broadcast an alert to all users…
        </button>
      )}

      {/* Compose form */}
      {composing && (
        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
          <input
            type="text"
            value={message}
            onChange={(e) => { setMessage(e.target.value); setError(''); }}
            placeholder="Alert message…"
            className="input flex-1 py-1.5 text-sm"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); if (e.key === 'Escape') setComposing(false); }}
          />
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="input py-1.5 text-sm w-auto"
          >
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
          </select>
          <div className="flex gap-2">
            <Button onClick={handleSend} loading={issuing} loadingText="Sending…" className="py-1.5 px-3 text-sm">
              Send
            </Button>
            <Button variant="ghost" onClick={() => setComposing(false)} className="py-1.5 px-3 text-sm">
              Cancel
            </Button>
          </div>
          {error && <p className="text-xs text-red-400 sm:absolute sm:bottom-1">{error}</p>}
        </div>
      )}
    </div>
  );
}
