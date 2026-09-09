import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from './axios';

export const alertKeys = {
  active: ['alerts', 'active'],
};

// ── Fetchers ──────────────────────────────────────────────────────────────────
const fetchActiveAlerts = async () => {
  const { data } = await api.get('/alerts/active');
  return data.alerts;
};

const issueAlert = async ({ message, severity }) => {
  const { data } = await api.post('/alerts', { message, severity });
  return data.alert;
};

const dismissAlert = async (id) => {
  const { data } = await api.patch(`/alerts/${id}/dismiss`);
  return data.alert;
};

// ── Hooks ─────────────────────────────────────────────────────────────────────
export function useActiveAlerts() {
  return useQuery({
    queryKey: alertKeys.active,
    queryFn:  fetchActiveAlerts,
    staleTime: 15_000,
    // refetchInterval removed — socket events push new alerts in real time
  });
}

export function useIssueAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: issueAlert,
    onSuccess: () => qc.invalidateQueries({ queryKey: alertKeys.active }),
  });
}

export function useDismissAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: dismissAlert,
    onSuccess: () => qc.invalidateQueries({ queryKey: alertKeys.active }),
  });
}
