import { Link } from 'react-router-dom';
import { useMyIncidents } from '../../api/incidents';
import Loader from '../../components/Loader';
import Navbar from '../../components/Navbar';
import StatusBadge from '../../components/StatusBadge';
import { CATEGORY_EMOJI } from '../../components/MapView';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const SEVERITY_DOT = {
  low:      'bg-green-500',
  medium:   'bg-amber-500',
  high:     'bg-orange-500',
  critical: 'bg-red-500',
};

export default function MyReports() {
  const { data: incidents = [], isLoading, isError } = useMyIncidents();

  return (
    <div className="flex flex-col min-h-screen bg-navy-950">
      <Navbar />

      {/* Sub-nav tabs */}
      <div className="flex items-center gap-4 px-4 sm:px-6 py-2 border-b border-slate-700/50 bg-navy-900/70 text-sm">
        <Link
          to="/citizen"
          className="text-slate-400 hover:text-slate-200 pb-1.5 border-b-2 border-transparent hover:border-slate-500 transition-colors"
        >
          Live Map
        </Link>
        <Link
          to="/citizen/my-reports"
          className="text-slate-200 font-medium border-b-2 border-red-500 pb-1.5"
        >
          My Reports
        </Link>
      </div>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-bold text-slate-100">My Reports</h1>
          <span className="text-xs text-slate-500">{incidents.length} total</span>
        </div>

        {isLoading && <Loader text="Loading your reports…" />}

        {isError && (
          <div className="panel p-6 text-center text-red-400 text-sm">
            Failed to load reports. Please try again.
          </div>
        )}

        {!isLoading && !isError && incidents.length === 0 && (
          <div className="panel p-10 text-center">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-slate-400 text-sm">You haven't submitted any reports yet.</p>
            <Link to="/citizen" className="text-red-400 hover:text-red-300 text-sm underline mt-2 inline-block">
              Go to map →
            </Link>
          </div>
        )}

        <ul className="space-y-3">
          {incidents.map((inc) => (
            <li key={inc._id} className="panel p-4 flex gap-4 items-start hover:border-slate-600/80 transition-colors">
              {/* Category emoji + severity dot */}
              <div className="relative mt-0.5 shrink-0">
                <span className="text-2xl">{CATEGORY_EMOJI[inc.category] ?? '⚠️'}</span>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-navy-800 ${SEVERITY_DOT[inc.severity] ?? 'bg-slate-500'}`}
                />
              </div>

              {/* Body */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <p className="font-semibold text-slate-100 truncate">{inc.title}</p>
                  <StatusBadge status={inc.status} />
                </div>

                {inc.aiAnalysis?.summary ? (
                  <p className="text-slate-400 text-sm line-clamp-2 leading-relaxed">
                    {inc.aiAnalysis.summary}
                  </p>
                ) : (
                  <p className="text-slate-500 text-sm italic">Awaiting AI analysis…</p>
                )}

                <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap pt-0.5">
                  <span className="capitalize">{inc.category}</span>
                  <span>·</span>
                  <span className={`capitalize font-medium ${
                    inc.severity === 'critical' ? 'text-red-400' :
                    inc.severity === 'high'     ? 'text-orange-400' :
                    inc.severity === 'medium'   ? 'text-amber-400' :
                    'text-green-400'
                  }`}>{inc.severity}</span>
                  <span>·</span>
                  <span>{timeAgo(inc.createdAt)}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
