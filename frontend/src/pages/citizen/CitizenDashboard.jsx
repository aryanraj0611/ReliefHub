import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFacilities } from '../../api/facilities';
import { useIncidents } from '../../api/incidents';
import Loader from '../../components/Loader';
import MapView from '../../components/MapView';
import Navbar from '../../components/Navbar';
import ReportIncidentForm from '../../components/ReportIncidentForm';

export default function CitizenDashboard() {
  const [showForm, setShowForm] = useState(false);

  const { data: incidents = [], isLoading: incLoading } = useIncidents();
  const { data: facilities = [] }                        = useFacilities();

  return (
    <div className="flex flex-col h-screen bg-navy-950">
      <Navbar />

      {/* Sub-nav tabs */}
      <div className="flex items-center gap-4 px-4 sm:px-6 py-2 border-b border-slate-700/50 bg-navy-900/70 text-sm">
        <Link
          to="/citizen"
          className="text-slate-200 font-medium border-b-2 border-red-500 pb-1.5"
        >
          Live Map
        </Link>
        <Link
          to="/citizen/my-reports"
          className="text-slate-400 hover:text-slate-200 pb-1.5 border-b-2 border-transparent hover:border-slate-500 transition-colors"
        >
          My Reports
        </Link>
      </div>

      {/* Map — fills remaining height */}
      <div className="relative flex-1">
        {incLoading ? (
          <Loader text="Loading incidents…" />
        ) : (
          <MapView
            incidents={incidents}
            facilities={facilities}
            className="h-full w-full"
          />
        )}

        {/* Legend — top-left overlay */}
        <div className="absolute top-3 left-3 z-[500] panel px-3 py-2 text-xs space-y-1 pointer-events-none">
          <p className="text-slate-400 font-semibold uppercase tracking-wide mb-1">Severity</p>
          {[
            { label: 'Critical', color: 'bg-red-500' },
            { label: 'High',     color: 'bg-orange-500' },
            { label: 'Medium',   color: 'bg-amber-500' },
            { label: 'Low',      color: 'bg-green-500' },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
              <span className="text-slate-300">{label}</span>
            </div>
          ))}
          <hr className="border-slate-700 my-1" />
          <div className="flex items-center gap-1.5"><span>🏥</span><span className="text-slate-300">Hospital</span></div>
          <div className="flex items-center gap-1.5"><span>🏠</span><span className="text-slate-300">Shelter</span></div>
        </div>

        {/* Incident count badge */}
        {incidents.length > 0 && (
          <div className="absolute top-3 right-3 z-[500] panel px-3 py-1.5 text-xs text-slate-300 pointer-events-none">
            {incidents.length} active incident{incidents.length !== 1 ? 's' : ''}
          </div>
        )}

        {/* Report Incident FAB — bottom-right, leaves space for future chatbot */}
        <button
          onClick={() => setShowForm(true)}
          className="absolute bottom-24 right-4 z-[500] flex items-center gap-2
                     bg-red-600 hover:bg-red-500 active:bg-red-700
                     text-white font-semibold text-sm px-4 py-3 rounded-full
                     shadow-glow transition-colors duration-150
                     focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-navy-900"
          aria-label="Report an incident"
        >
          <span className="text-lg leading-none">＋</span>
          Report Incident
        </button>
      </div>

      {/* Report form modal */}
      {showForm && <ReportIncidentForm onClose={() => setShowForm(false)} />}
    </div>
  );
}
