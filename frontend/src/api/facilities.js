import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from './axios';

// ── Query keys ────────────────────────────────────────────────────────────────
export const facilityKeys = {
  all:  ['facilities'],
  mine: ['facilities', 'mine'],
  type: (t) => ['facilities', t],
};

// ── Fetchers ──────────────────────────────────────────────────────────────────
const fetchFacilities = async () => {
  const { data } = await api.get('/facilities');
  return data.facilities;
};

const fetchMyFacility = async () => {
  const { data } = await api.get('/facilities/mine');
  return data.facility; // null if not registered yet
};

const createFacility = async (payload) => {
  const { data } = await api.post('/facilities', payload);
  return data.facility;
};

// PATCH /facilities/:id/capacity — { capacityUsed, status? }
const updateCapacity = async ({ id, capacityUsed, status }) => {
  const body = { capacityUsed };
  if (status !== undefined) body.status = status;
  const { data } = await api.patch(`/facilities/${id}/capacity`, body);
  return data.facility;
};

// ── Hooks ─────────────────────────────────────────────────────────────────────
export function useFacilities() {
  return useQuery({
    queryKey: facilityKeys.all,
    queryFn:  fetchFacilities,
    staleTime: 60_000,
  });
}

export function useMyFacility() {
  return useQuery({
    queryKey: facilityKeys.mine,
    queryFn:  fetchMyFacility,
    staleTime: 30_000,
  });
}

export function useCreateFacility() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createFacility,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: facilityKeys.mine });
      qc.invalidateQueries({ queryKey: facilityKeys.all });
    },
  });
}

export function useUpdateCapacity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateCapacity,
    // Optimistic update so the bar and stepper respond instantly
    onMutate: async ({ id, capacityUsed }) => {
      await qc.cancelQueries({ queryKey: facilityKeys.mine });
      const prev = qc.getQueryData(facilityKeys.mine);
      qc.setQueryData(facilityKeys.mine, (old) =>
        old ? { ...old, capacityUsed } : old
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev !== undefined) qc.setQueryData(facilityKeys.mine, ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: facilityKeys.mine });
      qc.invalidateQueries({ queryKey: facilityKeys.all });
    },
  });
}
