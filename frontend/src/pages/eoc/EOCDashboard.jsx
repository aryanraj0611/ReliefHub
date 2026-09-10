import { useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useMap } from 'react-leaflet';
import { useFacilities } from '../../api/facilities';
import { useIncidents, useUpdateIncidentStatus } from '../../api/incidents';
import BroadcastBar from '../../components/BroadcastBar';
import ErrorRetry from '../../components/ErrorRetry';
import FacilityDirectory from '../../components/FacilityDirectory';
import Loader from '../../components/Loader';
import MapView, { CATEGORY_EMOJI } from '../../components/MapView';
import Navbar from '../../components/Navbar';
import RescueTeamsPanel from '../../components/RescueTeamsPanel';
import StatusBadge from '../../components/StatusBadge';
import { useToast } from '../../context/ToastContext';
import { timeAgo } from '../../utils/constants';

// ── Filter config ─────────────────────────────────────────────────────────────
const SEVERITY_FILTERS = [
  { label: 'All',      value: null },
  { label: '🔴 Critical', value: 'critical' },
  { label: '🟠 High',     value: 'high' },
  { label: '🟡 Medium',   value: 'medium' },
  { label: '🟢 Low',      value: 'low' },
];

const STATUS_FILTERS = [
  { label: 'Active',      value: null },
  { label: 'Reported',    value: 'reported' },
  { label: 'Acknowledged', value: 'acknowledged' },
  { label: 'Dispatched',  value: 'dispatched' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Resolved',    value: 'resolved' },
];

const NEXT_STATUSES = {
  reported:     ['acknowledged', 'rejected'],
  acknowledged: ['dispatched'],
  dispatched:   ['in_progress'],
  in_progress:  ['resolved'],
  resolved:     [],
  merged:       [],
  rejected:     [],
};

const SEVERITY_SORT = { critical: 0, high: 1, medium: 2, low: 3 };

// timeAgo imported from utils/constants

// ── Map pan helper — must be a child of MapContainer ─────────────────────────
function MapPanner({ target }) {
  const map = useMap();
  if (target) {
    map.flyTo([target.lat, target.lng], 14, { duration: 0.8 });
  }
  return null;
}

// ── Incident sidebar card ─────────────────────────────────────────────────────
function IncidentCard({ incident, onSelect, isSelected }) {
  const { mutate: updateStatus, isPending } = useUpdateIncidentStatus();
  const { showToast } = useToast();
  const nexts = NEXT_STATUSES[incident.status] ?? [];

  return (
    <div
      className={`px-3 py-2.5 border-b border-slate-700/40 cursor-pointer transition-colors
        ${isSelected ? 'bg-navy-700/60 border-l-2 border-l-red-500' : 'hover:bg-navy-700/30'}`}
      onClick={() => onSelect(incident)}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-base shrink-0">{CATEGORY_EMOJI[incident.category] ?? '⚠️'}</span>
          <p className="text-slate-100 text-sm font-medium truncate leading-tight">{incident.title}</p>
        </div>
        <StatusBadge status={incident.status} className="shrink-0 text-[10px]" />
      </div>

      {incident.aiAnalysis?.summary && (
        <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed mb-1.5">
          {incident.aiAnalysis.summary}
        </p>
      )}

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-[10px] text-slate-500">{timeAgo(incident.createdAt)}</span>

        {nexts.length > 0 && (
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            {nexts.map((s) => (
              <button
                key={s}
                disabled={isPending}
                onClick={() => updateStatus(
                  { id: incident._id, status: s },
                  {
                    onSuccess: () => showToast('Status updated', 'success'),
                    onError:   () => showToast("Couldn't update status — please try again", 'error'),
                  }
                )}
                className="text-[10px] px-2 py-0.5 rounded border border-slate-600 text-slate-300
                           hover:border-red-500/60 hover:text-red-300 transition-colors disabled:opacity-40 capitalize"
              >
                {s.replace('_', ' ')}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function EOCDashboard() {
  const { pathname } = useLocation();

  const { data: incidents = [], isLoading: incLoading, isError: incError, refetch: refetchInc } = useIncidents();
  const { data: facilities = [], isError: facError, refetch: refetchFac }                        = useFacilities();

  const [severityFilter, setSeverityFilter] = useState(null);
  const [statusFilter,   setStatusFilter]   = useState(null);
  const [selectedInc,    setSelectedInc]    = useState(null);
  const [mapTarget,      setMapTarget]      = useState(null);
  const [activeTab,      setActiveTab]      = useState('map'); // 'map' | 'facilities'

  // ── Filter + sort incidents ────────────────────────────────────────────────
  const filtered = incidents
    .filter((i) => {
      if (severityFilter && i.severity !== severityFilter) return false;
      if (statusFilter) {
        if (statusFilter === null) return !['resolved', 'merged', 'rejected'].includes(i.status);
        return i.status === statusFilter;
      }
      // Default: hide resolved/merged/rejected from EOC active view
      if (!statusFilter && ['resolved', 'merged', 'rejected'].includes(i.status)) return false;
      return true;
    })
    .sort((a, b) => {
      const sd = (SEVERITY_SORT[a.severity] ?? 9) - (SEVERITY_SORT[b.severity] ?? 9);
      if (sd !== 0) return sd;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

  const handleSelectIncident = (inc) => {
    setSelectedInc(inc._id);
    const [lng, lat] = inc.location?.coordinates ?? [0, 0];
    if (lat && lng) setMapTarget({ lat, lng });
    setActiveTab('map');
  };

  const tabs = [
    { id: 'map',        label: 'Live Map' },
    { id: 'facilities', label: 'Facilities' },
    { id: 'rescue',     label: 'Rescue Teams' },
  ];

  return (
    <div className="flex flex-col h-screen bg-navy-950 overflow-hidden">
      <Navbar />
      <BroadcastBar />

      {/* Sub-nav — horizontally scrollable so tabs never truncate or wrap */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-slate-700/50 bg-navy-900/70 shrink-0 overflow-x-auto scrollbar-none relative">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-all duration-200 whitespace-nowrap relative
              ${activeTab === tab.id
                ? 'bg-navy-700 text-slate-100'
                : 'text-slate-400 hover:text-slate-200'}`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500 rounded-t transition-all duration-200" />
            )}
          </button>
        ))}
        {/* Short label below lg, full label at lg+ */}
        <Link
          to="/eoc/verification"
          className={`px-3 py-1 rounded-md text-sm font-medium transition-all duration-200 whitespace-nowrap ml-1 relative
            ${pathname === '/eoc/verification'
              ? 'bg-navy-700 text-slate-100'
              : 'text-slate-400 hover:text-slate-200'}`}
        >
          <span className="lg:hidden">Verify</span>
          <span className="hidden lg:inline">Verification Queue</span>
          {pathname === '/eoc/verification' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500 rounded-t transition-all duration-200" />
          )}
        </Link>
      </div>

      {/* Filter chip row — own scrollable row so it never wraps onto the nav or content */}
      <div className="flex items-center gap-1 px-4 py-1.5 border-b border-slate-700/40 bg-navy-900/50 shrink-0 overflow-x-auto scrollbar-none">
        {SEVERITY_FILTERS.map((f) => (
          <button
            key={String(f.value)}
            onClick={() => setSeverityFilter(f.value === severityFilter ? null : f.value)}
            className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap shrink-0
              ${severityFilter === f.value
                ? 'bg-red-600 border-red-500 text-white'
                : 'border-slate-600 text-slate-400 hover:border-slate-400 hover:text-slate-200'}`}
          >
            {f.label}
          </button>
        ))}
        <span className="text-slate-600 text-xs mx-1 shrink-0">|</span>
        {STATUS_FILTERS.map((f) => (
          <button
            key={String(f.value)}
            onClick={() => setStatusFilter(f.value === statusFilter ? null : f.value)}
            className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap shrink-0
              ${statusFilter === f.value
                ? 'bg-slate-500 border-slate-400 text-white'
                : 'border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Body — stacks vertically on mobile, side-by-side on large screens */}
      <div className="flex flex-col lg:flex-row flex-1 min-h-0">

        {/* Main panel — map gets 40vh on mobile, full height on desktop */}
        <div className="flex-1 min-w-0 relative h-[40vh] lg:h-auto">
          {activeTab === 'map' && (
            <div className="h-full w-full animate-[fadeIn_0.15s_ease-out]">
              {incLoading ? (
                <Loader text="Loading incident data…" />
              ) : incError ? (
                <ErrorRetry message="Couldn't load incidents" onRetry={refetchInc} />
              ) : (
                <MapView
                  incidents={filtered}
                  facilities={facilities}
                  className="h-full w-full"
                >
                  {mapTarget && <MapPanner target={mapTarget} />}
                </MapView>
              )}
              <div className="absolute top-3 left-3 z-[500] panel px-3 py-1.5 text-xs text-slate-300 pointer-events-none">
                {filtered.length} incident{filtered.length !== 1 ? 's' : ''} shown
              </div>
            </div>
          )}
          {activeTab === 'facilities' && (
            <div className="h-full overflow-hidden flex flex-col animate-[fadeIn_0.15s_ease-out]">
              <FacilityDirectory />
            </div>
          )}
          {activeTab === 'rescue' && (
            <div className="h-full overflow-hidden flex flex-col animate-[fadeIn_0.15s_ease-out]">
              <RescueTeamsPanel />
            </div>
          )}
        </div>

        {/* Incident sidebar
            Mobile: full-width below map, max height to avoid taking over the screen
            Desktop: fixed-width column beside the map
            pb-16 on mobile keeps last card clear of the chatbot FAB (fix #2) */}
        <div className="w-full lg:w-64 xl:w-80 shrink-0 border-t lg:border-t-0 lg:border-l border-slate-700/60 flex flex-col bg-navy-900/50 overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-700/40 shrink-0">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Incidents · {filtered.length}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto max-h-64 lg:max-h-none pb-16 lg:pb-0">
            {filtered.length === 0 && (
              <div className="p-6 text-center text-slate-500 text-sm">No incidents match the current filters.</div>
            )}
            {filtered.map((inc) => (
              <IncidentCard
                key={inc._id}
                incident={inc}
                isSelected={selectedInc === inc._id}
                onSelect={handleSelectIncident}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
