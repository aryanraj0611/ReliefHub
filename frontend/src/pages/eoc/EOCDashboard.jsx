import 'leaflet/dist/leaflet.css';
import { useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useMap } from 'react-leaflet';
import { useFacilities } from '../../api/facilities';
import { useIncidents, useUpdateIncidentStatus } from '../../api/incidents';
import BroadcastBar from '../../components/BroadcastBar';
import FacilityDirectory from '../../components/FacilityDirectory';
import Loader from '../../components/Loader';
import MapView, { CATEGORY_EMOJI } from '../../components/MapView';
import Navbar from '../../components/Navbar';
import StatusBadge from '../../components/StatusBadge';

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

function timeAgo(d) {
  const m = Math.floor((Date.now() - new Date(d)) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

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
                onClick={() => updateStatus({ id: incident._id, status: s })}
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

  const { data: incidents = [], isLoading: incLoading } = useIncidents();
  const { data: facilities = [] }                        = useFacilities();

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
  ];

  return (
    <div className="flex flex-col h-screen bg-navy-950 overflow-hidden">
      <Navbar />
      <BroadcastBar />

      {/* Sub-nav */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-slate-700/50 bg-navy-900/70 shrink-0 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors whitespace-nowrap
              ${activeTab === tab.id
                ? 'bg-navy-700 text-slate-100'
                : 'text-slate-400 hover:text-slate-200'}`}
          >
            {tab.label}
          </button>
        ))}
        <Link
          to="/eoc/verification"
          className={`px-3 py-1 rounded-md text-sm font-medium transition-colors whitespace-nowrap ml-1
            ${pathname === '/eoc/verification'
              ? 'bg-navy-700 text-slate-100'
              : 'text-slate-400 hover:text-slate-200'}`}
        >
          Verification Queue
        </Link>

        {/* Severity + status filter chips — right side */}
        <div className="ml-auto flex gap-1 flex-wrap">
          {SEVERITY_FILTERS.map((f) => (
            <button
              key={String(f.value)}
              onClick={() => setSeverityFilter(f.value === severityFilter ? null : f.value)}
              className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap
                ${severityFilter === f.value
                  ? 'bg-red-600 border-red-500 text-white'
                  : 'border-slate-600 text-slate-400 hover:border-slate-400 hover:text-slate-200'}`}
            >
              {f.label}
            </button>
          ))}
          <span className="text-slate-600 text-xs self-center mx-1">|</span>
          {STATUS_FILTERS.map((f) => (
            <button
              key={String(f.value)}
              onClick={() => setStatusFilter(f.value === statusFilter ? null : f.value)}
              className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap
                ${statusFilter === f.value
                  ? 'bg-slate-500 border-slate-400 text-white'
                  : 'border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body — map/facilities panel + sidebar */}
      <div className="flex flex-1 min-h-0">

        {/* Main panel */}
        <div className="flex-1 min-w-0 relative">
          {activeTab === 'map' && (
            <>
              {incLoading ? (
                <Loader text="Loading incident data…" />
              ) : (
                <MapView
                  incidents={filtered}
                  facilities={facilities}
                  className="h-full w-full"
                >
                  {mapTarget && <MapPanner target={mapTarget} />}
                </MapView>
              )}
              {/* Live count overlay */}
              <div className="absolute top-3 left-3 z-[500] panel px-3 py-1.5 text-xs text-slate-300 pointer-events-none">
                {filtered.length} incident{filtered.length !== 1 ? 's' : ''} shown
              </div>
            </>
          )}
          {activeTab === 'facilities' && (
            <div className="h-full overflow-hidden flex flex-col">
              <FacilityDirectory />
            </div>
          )}
        </div>

        {/* Incident sidebar */}
        <div className="w-80 shrink-0 border-l border-slate-700/60 flex flex-col bg-navy-900/50 overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-700/40 shrink-0">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Incidents · {filtered.length}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
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
