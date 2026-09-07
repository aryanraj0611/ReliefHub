import { useQuery } from '@tanstack/react-query';
import api from './axios';

export const facilityKeys = {
  all:  ['facilities'],
  type: (t) => ['facilities', t],
};

const fetchFacilities = async () => {
  const { data } = await api.get('/facilities');
  return data.facilities;
};

export function useFacilities() {
  return useQuery({
    queryKey: facilityKeys.all,
    queryFn:  fetchFacilities,
    staleTime: 60_000, // facilities change less often than incidents
  });
}
