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
      // Invalidate both lists so map + MyReports refresh immediately
      queryClient.invalidateQueries({ queryKey: incidentKeys.all });
      queryClient.invalidateQueries({ queryKey: incidentKeys.mine });
    },
  });
}
