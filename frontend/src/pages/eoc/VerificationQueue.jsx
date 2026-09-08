import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDirectory, useReviewDocument, useVerificationDocument } from '../../api/users';
import Button from '../../components/Button';
import Loader from '../../components/Loader';
import Navbar from '../../components/Navbar';

const ROLE_LABEL = {
  eoc:         'EOC Staff',
  rescue_team: 'Rescue Team',
  hospital:    'Hospital',
  shelter:     'Shelter',
  volunteer:   'Volunteer',
  ngo:         'NGO',
};

const ROLE_COLOR = {
  eoc:         'text-red-300   bg-red-500/15   border-red-500/30',
  rescue_team: 'text-orange-300 bg-orange-500/15 border-orange-500/30',
  hospital:    'text-cyan-300  bg-cyan-500/15  border-cyan-500/30',
  shelter:     'text-violet-300 bg-violet-500/15 border-violet-500/30',
  volunteer:   'text-green-300 bg-green-500/15 border-green-500/30',
  ngo:         'text-amber-300 bg-amber-500/15 border-amber-500/30',
};

// ── Per-user card with lazy-loaded document ───────────────────────────────────
function VerificationCard({ entry }) {
  const [expanded,   setExpanded]   = useState(false);
  const [note,       setNote]       = useState('');
  const [confirmed,  setConfirmed]  = useState(null); // 'approved' | 'rejected' | null

  const { data: docData, isLoading: docLoading } = useVerificationDocument(
    entry._id,
    { enabled: expanded }
  );
  const { mutateAsync: review, isPending } = useReviewDocument();

  const handleReview = async (status) => {
    try {
      await review({ userId: entry._id, status, note });
      setConfirmed(status);
    } catch (e) {
      console.error(e);
    }
  };

  if (confirmed) {
    return (
      <div className={`panel p-4 flex items-center gap-3 opacity-60`}>
        <span className="text-xl">{confirmed === 'approved' ? '✅' : '❌'}</span>
        <div>
          <p className="text-slate-300 text-sm font-medium">{entry.organizationName || entry.name}</p>
          <p className="text-slate-500 text-xs capitalize">{confirmed} — page will update on next refresh</p>
        </div>
      </div>
    );
  }

  const doc = docData?.verificationDocument;

  return (
    <div className="panel overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-navy-700/30 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-slate-100 font-semibold text-sm">{entry.organizationName || entry.name}</p>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${ROLE_COLOR[entry.role] ?? ''}`}>
              {ROLE_LABEL[entry.role] ?? entry.role}
            </span>
          </div>
          <p className="text-slate-400 text-xs mt-0.5">{entry.name}</p>
        </div>
        <span className="text-slate-500 text-sm">{expanded ? '▲' : '▼'}</span>
      </div>

      {/* Expanded document view */}
      {expanded && (
        <div className="border-t border-slate-700/50 px-4 py-4 space-y-4">
          {docLoading && <Loader text="Loading document…" />}

          {!docLoading && doc?.dataUrl && (
            <div>
              <p className="text-xs text-slate-400 mb-2 uppercase tracking-wide">
                Uploaded document — {doc.fileName || 'unnamed'}
              </p>
              <img
                src={doc.dataUrl}
                alt="Verification document"
                className="max-w-full max-h-72 rounded-lg border border-slate-700 object-contain bg-navy-900"
              />
            </div>
          )}

          {!docLoading && !doc?.dataUrl && (
            <p className="text-slate-500 text-sm italic">No document uploaded.</p>
          )}

          {/* Review note */}
          <div>
            <label className="text-xs text-slate-400 block mb-1">Review note (optional)</label>
            <input
              type="text"
              className="input text-sm py-1.5"
              placeholder="Reason for approval or rejection…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button
              onClick={() => handleReview('approved')}
              loading={isPending}
              loadingText="Saving…"
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 focus:ring-emerald-500"
            >
              ✓ Approve
            </Button>
            <Button
              variant="danger"
              onClick={() => handleReview('rejected')}
              disabled={isPending}
              className="flex-1"
            >
              ✕ Reject
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function VerificationQueue() {
  const { data: directory = [], isLoading } = useDirectory();

  // Filter to only users with a pending document
  const pending = directory.filter((u) => u.documentStatus === 'pending');

  return (
    <div className="flex flex-col min-h-screen bg-navy-950">
      <Navbar />

      {/* Sub-nav */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-slate-700/50 bg-navy-900/70 text-sm">
        <Link to="/eoc" className="px-3 py-1 rounded-md text-slate-400 hover:text-slate-200 transition-colors">
          Live Map
        </Link>
        <Link to="/eoc/verification" className="px-3 py-1 rounded-md bg-navy-700 text-slate-100 font-medium">
          Verification Queue
        </Link>
      </div>

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-slate-100">Verification Queue</h1>
            <p className="text-slate-500 text-xs mt-0.5">
              Review uploaded credentials for organisations requesting access
            </p>
          </div>
          {pending.length > 0 && (
            <span className="bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">
              {pending.length} pending
            </span>
          )}
        </div>

        {isLoading && <Loader text="Loading queue…" />}

        {!isLoading && pending.length === 0 && (
          <div className="panel p-10 text-center">
            <p className="text-3xl mb-3">✅</p>
            <p className="text-slate-400 text-sm">No pending verifications — all clear.</p>
          </div>
        )}

        <div className="space-y-3">
          {pending.map((entry) => (
            <VerificationCard key={entry._id} entry={entry} />
          ))}
        </div>
      </main>
    </div>
  );
}
