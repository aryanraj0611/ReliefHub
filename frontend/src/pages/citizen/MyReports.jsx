import { Link } from 'react-router-dom';
import { useMyIncidents } from '../../api/incidents';
import ErrorRetry from '../../components/ErrorRetry';
import Loader from '../../components/Loader';
import { CATEGORY_EMOJI } from '../../components/MapView';
import Navbar from '../../components/Navbar';
import StatusBadge from '../../components/StatusBadge';
import { SEVERITY_DOT, SEVERITY_TEXT, timeAgo } from '../../utils/constants';

export default function MyReports() {
  const { data: incidents = [], isLoading, isError, refetch } = useMyIncidents();

  return (
    <div className="flex flex-col min-h-screen bg-navy-950">
      <Navbar />

      {/* Sub-nav tabs */}
      <div className="flex items-center gap-4 px-4 sm:px-6 py-2 border-b border-slate-700/50 bg-navy-900/70 text-sm relative">
        <Link
          to="/citizen"
          className="text-slate-400 hover:text-slate-200 pb-1.5 border-b-2 border-transparent hover:border-slate-500 transition-all duration-200"
        >
          Live Map
        </Link>
        <Link
          to="/citizen/my-reports"
          className="text-slate-200 font-medium border-b-2 border-red-500 pb-1.5 transition-all duration-200 relative"
        >
          My Reports
          <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500 rounded-t transition-all duration-200" />
        </Link>
      </div>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-6 pb-20">
        {/* Header — wraps gracefully on small screens */}
        <div className="flex items-center justify-between gap-2 mb-5 flex-wrap">
          <h1 className="text-xl font-bold text-slate-100">My Reports</h1>
          <span className="text-xs text-slate-500">{incidents.length} total</span>
        </div>

        {isLoading && <Loader text="Loading your reports…" />}

        {isError && (
          <ErrorRetry message="Couldn't load your reports" onRetry={refetch} />
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
                  <span className={`capitalize font-medium ${SEVERITY_TEXT[inc.severity] ?? 'text-slate-400'}`}>
                    {inc.severity}
                  </span>
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
