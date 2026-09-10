import { useDirectory } from '../api/users';
import { useIncidents } from '../api/incidents';
import { CATEGORY_EMOJI } from './MapView';
import ErrorRetry from './ErrorRetry';
import Loader from './Loader';

// Statuses that mean a rescue member is actively on a job
const ACTIVE_STATUSES = new Set(['dispatched', 'in_progress']);

function TeamMemberCard({ member, activeIncident }) {
  const onJob = !!activeIncident;

  return (
    <div className="flex items-start gap-3 px-4 py-3 border-b border-slate-700/40 last:border-b-0 hover:bg-navy-700/20 transition-colors">
      {/* Avatar initials */}
      <div className="w-9 h-9 rounded-full bg-navy-700 border border-slate-600 flex items-center justify-center shrink-0">
        <span className="text-xs font-bold text-slate-300 uppercase">
          {(member.name ?? '?').slice(0, 2)}
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-slate-100 text-sm font-medium truncate">{member.name}</p>
          {/* Status pill */}
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${
            onJob
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
          }`}>
            {onJob ? 'On Job' : 'Available'}
          </span>
        </div>

        {member.organizationName && (
          <p className="text-slate-500 text-xs truncate">{member.organizationName}</p>
        )}

        {/* Active job subtitle */}
        {onJob && (
          <p className="text-amber-400/80 text-xs mt-0.5 flex items-center gap-1 truncate">
            <span>{CATEGORY_EMOJI[activeIncident.category] ?? '⚠️'}</span>
            <span className="truncate">
              {activeIncident.aiAnalysis?.summary || activeIncident.title}
            </span>
          </p>
        )}

        {member.phone && (
          <p className="text-slate-600 text-xs mt-0.5">📞 {member.phone}</p>
        )}
      </div>
    </div>
  );
}

export default function RescueTeamsPanel() {
  const { data: directory = [], isLoading: dirLoading, isError: dirError, refetch } = useDirectory();
  const { data: incidents = [] }                         = useIncidents();

  if (dirLoading) return <Loader text="Loading rescue teams…" />;
  if (dirError) return <ErrorRetry message="Couldn't load rescue teams" onRetry={refetch} />;

  // Only approved rescue_team accounts
  const rescueMembers = directory.filter(
    (u) => u.role === 'rescue_team' && u.documentStatus === 'approved'
  );

  if (rescueMembers.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-3xl mb-3">🚨</p>
          <p className="text-slate-400 text-sm">No approved rescue teams yet.</p>
          <p className="text-slate-600 text-xs mt-1">
            Approve rescue team accounts in the Verification Queue first.
          </p>
        </div>
      </div>
    );
  }

  // Build a lookup: userId -> active incident
  // assignedTeam is populated as { _id, name, organizationName } OR just an ID string
  const activeByUserId = new Map();
  for (const inc of incidents) {
    if (!ACTIVE_STATUSES.has(inc.status)) continue;
    if (!inc.assignedTeam) continue;
    const teamId =
      typeof inc.assignedTeam === 'object' ? inc.assignedTeam._id : inc.assignedTeam;
    if (teamId) activeByUserId.set(String(teamId), inc);
  }

  // Annotate + sort: available first, on-job second
  const annotated = rescueMembers
    .map((m) => ({ member: m, activeIncident: activeByUserId.get(String(m._id)) ?? null }))
    .sort((a, b) => {
      // available (no incident) sorts before on-job
      if (!a.activeIncident && b.activeIncident)  return -1;
      if (a.activeIncident  && !b.activeIncident) return  1;
      return (a.member.name ?? '').localeCompare(b.member.name ?? '');
    });

  const availableCount = annotated.filter((a) => !a.activeIncident).length;
  const onJobCount     = annotated.length - availableCount;

  return (
    <div className="flex flex-col h-full">
      {/* Summary chips */}
      <div className="flex gap-2 px-4 py-3 border-b border-slate-700/50 shrink-0">
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
          {availableCount} available
        </span>
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
          {onJobCount} on job
        </span>
        <span className="ml-auto text-xs text-slate-500 self-center">
          {annotated.length} total
        </span>
      </div>

      {/* Member list */}
      <div className="overflow-y-auto flex-1">
        {annotated.map(({ member, activeIncident }) => (
          <TeamMemberCard
            key={member._id}
            member={member}
            activeIncident={activeIncident}
          />
        ))}
      </div>
    </div>
  );
}
