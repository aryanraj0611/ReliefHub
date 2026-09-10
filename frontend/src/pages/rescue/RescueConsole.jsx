import { useState } from 'react';
import { useIncidents, useUpdateIncidentStatus } from '../../api/incidents';
import Button from '../../components/Button';
import Loader from '../../components/Loader';
import MapView, { CATEGORY_EMOJI } from '../../components/MapView';
import Navbar from '../../components/Navbar';
import StatusBadge from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { SEVERITY_BORDER, SEVERITY_TEXT, timeAgo } from '../../utils/constants';

// ── Constants ─────────────────────────────────────────────────────────────────
const AVAILABLE_STATUSES = ['acknowledged'];
const MY_JOB_STATUSES    = ['dispatched', 'in_progress'];
const NEXT_STATUS = {
  dispatched:  'in_progress',
  in_progress: 'resolved',
};

// timeAgo imported from utils/constants

// ── Single job card ───────────────────────────────────────────────────────────
function JobCard({ incident, mode }) {
  // mode: 'available' | 'mine'
  const { user }    = useAuth();
  const { mutate: update, isPending } = useUpdateIncidentStatus();
  const { showToast } = useToast();
  const [showMap, setShowMap] = useState(false);

  const [lng, lat] = incident.location?.coordinates ?? [0, 0];
  const hasCoords  = !!(lat && lng);

  const handleAccept = () => {
    update(
      { id: incident._id, status: 'dispatched', assignedTeam: user.id, note: `Accepted by ${user.name}` },
      {
        onSuccess: () => showToast('Job accepted', 'success'),
        onError:   () => showToast("Couldn't accept job — please try again", 'error'),
      }
    );
  };

  const handleAdvance = () => {
    const next = NEXT_STATUS[incident.status];
    if (!next) return;
    update(
      { id: incident._id, status: next, note: `Status updated by ${user.name}` },
      {
        onSuccess: () => showToast('Status updated', 'success'),
        onError:   () => showToast("Couldn't update status — please try again", 'error'),
      }
    );
  };

  const nextStatus = NEXT_STATUS[incident.status];

  return (
    <div className={`panel border-l-4 ${SEVERITY_BORDER[incident.severity] ?? 'border-l-slate-600'} overflow-hidden`}>
      {/* Card header */}
      <div className="px-4 pt-4 pb-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-2xl shrink-0">{CATEGORY_EMOJI[incident.category] ?? '⚠️'}</span>
            <div className="min-w-0">
              <p className="text-slate-100 font-semibold text-sm leading-snug truncate">
                {incident.title}
              </p>
              <p className={`text-xs font-medium capitalize ${SEVERITY_TEXT[incident.severity] ?? 'text-slate-400'}`}>
                {incident.severity} · {incident.category}
              </p>
            </div>
          </div>
          <StatusBadge status={incident.status} className="shrink-0" />
        </div>

        {/* AI summary */}
        {incident.aiAnalysis?.summary && (
          <p className="text-slate-400 text-sm leading-relaxed">
            {incident.aiAnalysis.summary}
          </p>
        )}

        {/* Location + time */}
        <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
          {incident.location?.address && (
            <span className="flex items-center gap-1">
              📍 {incident.location.address}
            </span>
          )}
          {hasCoords && !incident.location?.address && (
            <span className="font-mono">{lat.toFixed(4)}, {lng.toFixed(4)}</span>
          )}
          <span>{timeAgo(incident.createdAt)}</span>
        </div>

        {/* ETA chip */}
        {incident.aiAnalysis?.etaMinutes && (
          <p className="text-xs text-slate-500">
            Suggested response ETA: <span className="text-slate-300 font-medium">{incident.aiAnalysis.etaMinutes} min</span>
          </p>
        )}
      </div>

      {/* Embedded map — toggled */}
      {showMap && hasCoords && (
        <div className="h-48 border-t border-slate-700/50">
          <MapView
            incidents={[incident]}
            center={[lat, lng]}
            zoom={14}
            className="h-full w-full"
          />
        </div>
      )}

      {/* Action bar */}
      <div className="px-4 py-3 border-t border-slate-700/40 flex items-center gap-2 flex-wrap bg-navy-900/30">
        {/* Map toggle */}
        {hasCoords && (
          <button
            onClick={() => setShowMap((v) => !v)}
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1"
          >
            🗺️ {showMap ? 'Hide map' : 'View on map'}
          </button>
        )}

        <div className="ml-auto flex gap-2">
          {mode === 'available' && (
            <Button
              onClick={handleAccept}
              loading={isPending}
              loadingText="Accepting…"
              className="py-1.5 px-4 text-sm"
            >
              ✓ Accept Job
            </Button>
          )}

          {mode === 'mine' && nextStatus && (
            <Button
              onClick={handleAdvance}
              loading={isPending}
              loadingText="Updating…"
              className="py-1.5 px-4 text-sm"
            >
              → Mark {nextStatus.replace('_', ' ')}
            </Button>
          )}

          {mode === 'mine' && !nextStatus && (
            <span className="text-xs text-emerald-400 font-medium">✓ Resolved</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, count, badge, children, emptyIcon, emptyText }) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">{title}</h2>
        {count > 0 && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badge}`}>
            {count}
          </span>
        )}
      </div>

      {count === 0 ? (
        <div className="panel p-8 text-center">
          <p className="text-3xl mb-3">{emptyIcon}</p>
          <p className="text-slate-400 text-sm">{emptyText}</p>
        </div>
      ) : (
        <div className="space-y-3">{children}</div>
      )}
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function RescueConsole() {
  const { user } = useAuth();
  const { data: allIncidents = [], isLoading } = useIncidents();
  const [activeTab, setActiveTab] = useState('available'); // 'available' | 'mine'

  // Client-side filtering — backend only supports single status param
  const available = allIncidents.filter(
    (i) =>
      AVAILABLE_STATUSES.includes(i.status) &&
      !i.assignedTeam // not yet claimed by anyone
  );

  const myJobs = allIncidents.filter(
    (i) =>
      MY_JOB_STATUSES.includes(i.status) &&
      (i.assignedTeam?._id === user?.id || i.assignedTeam === user?.id)
  );

  // Also show resolved jobs the user resolved today so they can see their work
  const recentlyResolved = allIncidents.filter(
    (i) =>
      i.status === 'resolved' &&
      (i.assignedTeam?._id === user?.id || i.assignedTeam === user?.id) &&
      Date.now() - new Date(i.updatedAt ?? i.createdAt) < 8 * 60 * 60 * 1000 // last 8 h
  );

  const myJobsAll = [...myJobs, ...recentlyResolved];

  return (
    <div className="flex flex-col min-h-screen bg-navy-950">
      <Navbar />

      {/* Tab bar */}
      <div className="flex border-b border-slate-700/50 bg-navy-900/70 px-4 shrink-0">
        {[
          { id: 'available', label: 'Available', count: available.length, dot: 'bg-amber-500' },
          { id: 'mine',      label: 'My Jobs',   count: myJobs.length,    dot: 'bg-red-500' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors
              ${activeTab === tab.id
                ? 'border-red-500 text-slate-100'
                : 'border-transparent text-slate-400 hover:text-slate-200'}
            `}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`w-2 h-2 rounded-full ${tab.dot} shrink-0`} />
            )}
          </button>
        ))}
      </div>

      {/* Content — pb-20 keeps last card clear of the chatbot FAB on mobile */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-5 pb-20">
        {isLoading ? (
          <Loader text="Loading jobs…" />
        ) : (
          <>
            {activeTab === 'available' && (
              <Section
                title="Available Jobs"
                count={available.length}
                badge="bg-amber-500/20 text-amber-300"
                emptyIcon="✅"
                emptyText="No available jobs right now — check back soon."
              >
                {available.map((inc) => (
                  <JobCard key={inc._id} incident={inc} mode="available" />
                ))}
              </Section>
            )}

            {activeTab === 'mine' && (
              <Section
                title="My Jobs"
                count={myJobsAll.length}
                badge="bg-red-500/20 text-red-300"
                emptyIcon="🚨"
                emptyText="You have no active jobs — head to Available to accept one."
              >
                {myJobsAll.map((inc) => (
                  <JobCard key={inc._id} incident={inc} mode="mine" />
                ))}
              </Section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
