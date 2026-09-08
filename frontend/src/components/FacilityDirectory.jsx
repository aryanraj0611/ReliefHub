import { useState } from 'react';
import { useFacilities } from '../api/facilities';
import Loader from './Loader';

function capacityColor(pct) {
  if (pct >= 90) return { bar: 'bg-red-500',    text: 'text-red-400' };
  if (pct >= 70) return { bar: 'bg-amber-500',   text: 'text-amber-400' };
  return             { bar: 'bg-emerald-500', text: 'text-emerald-400' };
}

const STATUS_BADGE = {
  operational: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  full:        'bg-red-500/15     text-red-300     border-red-500/30',
  closed:      'bg-slate-700/50   text-slate-400   border-slate-600',
};

export default function FacilityDirectory() {
  const { data: facilities = [], isLoading } = useFacilities();
  const [filter, setFilter] = useState('all'); // 'all' | 'hospital' | 'shelter'

  const visible = filter === 'all'
    ? facilities
    : facilities.filter((f) => f.type === filter);

  if (isLoading) return <Loader text="Loading facilities…" />;

  return (
    <div className="flex flex-col h-full">
      {/* Filter chips */}
      <div className="flex gap-2 px-4 py-3 border-b border-slate-700/50 shrink-0">
        {['all', 'hospital', 'shelter'].map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-3 py-1 rounded-full text-xs font-medium border capitalize transition-colors
              ${filter === t
                ? 'bg-red-600 border-red-500 text-white'
                : 'border-slate-600 text-slate-400 hover:border-slate-400 hover:text-slate-200'}`}
          >
            {t === 'all' ? 'All' : t === 'hospital' ? '🏥 Hospitals' : '🏠 Shelters'}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-500 self-center">{visible.length} facilities</span>
      </div>

      {/* List */}
      <div className="overflow-y-auto flex-1 divide-y divide-slate-700/40">
        {visible.length === 0 && (
          <div className="p-8 text-center text-slate-500 text-sm">No facilities registered yet.</div>
        )}
        {visible.map((fac) => {
          const pct   = fac.occupancyPercent ?? (fac.capacityTotal > 0 ? Math.round((fac.capacityUsed / fac.capacityTotal) * 100) : 0);
          const color = capacityColor(pct);
          return (
            <div key={fac._id} className="px-4 py-3 hover:bg-navy-700/30 transition-colors">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xl shrink-0">{fac.type === 'hospital' ? '🏥' : '🏠'}</span>
                  <div className="min-w-0">
                    <p className="text-slate-100 text-sm font-medium truncate">{fac.name}</p>
                    {fac.location?.address && (
                      <p className="text-slate-500 text-xs truncate">{fac.location.address}</p>
                    )}
                  </div>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border shrink-0 capitalize ${STATUS_BADGE[fac.status] ?? STATUS_BADGE.operational}`}>
                  {fac.status}
                </span>
              </div>

              {/* Capacity bar */}
              {fac.capacityTotal > 0 ? (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">
                      {fac.capacityUsed} / {fac.capacityTotal} {fac.type === 'hospital' ? 'beds' : 'occupants'}
                    </span>
                    <span className={`font-semibold ${color.text}`}>{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-navy-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${color.bar}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-600 italic">Capacity not set</p>
              )}

              {/* Resources (hospital only) */}
              {fac.resources?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {fac.resources.slice(0, 4).map((r) => (
                    <span key={r} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/60 text-slate-400 border border-slate-600/50">
                      {r}
                    </span>
                  ))}
                  {fac.resources.length > 4 && (
                    <span className="text-[10px] text-slate-500">+{fac.resources.length - 4} more</span>
                  )}
                </div>
              )}

              {fac.contactPhone && (
                <p className="text-xs text-slate-500 mt-1.5">📞 {fac.contactPhone}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
