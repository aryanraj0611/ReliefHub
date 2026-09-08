import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from './axios';

// ── Query keys ────────────────────────────────────────────────────────────────
export const incidentKeys = {
  all:  ['incidents'],
  mine: ['incidents', 'mine'],
  one:  (id) => ['incidents', id],
};

// ── Fetchers ──────────────────────────────────────────────────────────────────
const fetchIncidents = async () => {
  const { data } = await api.get('/incidents');
  return data.incidents;
};

const fetchMyIncidents = async () => {
  const { data } = await api.get('/incidents?mine=true');
  return data.incidents;
};

const createIncident = async (payload) => {
  const { data } = await api.post('/incidents', payload);
  return data.incident;
};

const updateIncidentStatus = async ({ id, status, note }) => {
  const { data } = await api.patch(`/incidents/${id}/status`, { status, note });
  return data.incident;
};

// ── Hooks ─────────────────────────────────────────────────────────────────────
export function useIncidents() {
  return useQuery({
    queryKey: incidentKeys.all,
    queryFn:  fetchIncidents,
    staleTime: 20_000, // 20 s — map refreshes frequently enough
    refetchInterval: 30_000, // live polling for real-time feel
  });
}

export function useMyIncidents() {
  return useQuery({
    queryKey: incidentKeys.mine,
    queryFn:  fetchMyIncidents,
    staleTime: 15_000,
  });
}

export function useCreateIncident() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createIncident,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: incidentKeys.all });
      queryClient.invalidateQueries({ queryKey: incidentKeys.mine });
    },
  });
}

export function useUpdateIncidentStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateIncidentStatus,
    // Optimistic update — swap status in-place so the sidebar reacts instantly
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: incidentKeys.all });
      const prev = queryClient.getQueryData(incidentKeys.all);
      queryClient.setQueryData(incidentKeys.all, (old) =>
        old?.map((inc) => (inc._id === id ? { ...inc, status } : inc))
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(incidentKeys.all, ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: incidentKeys.all });
    },
  });
}
