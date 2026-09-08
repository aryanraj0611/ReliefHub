import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from './axios';

export const userKeys = {
  directory: ['users', 'directory'],
  document:  (id) => ['users', id, 'document'],
};

// ── Fetchers ──────────────────────────────────────────────────────────────────
const fetchDirectory = async () => {
  const { data } = await api.get('/users/directory');
  return data.directory; // [{ _id, name, role, organizationName, documentStatus, facility }]
};

const fetchDocument = async (userId) => {
  const { data } = await api.get(`/users/${userId}/document`);
  return data.user; // { name, organizationName, verificationDocument }
};

const reviewDocument = async ({ userId, status, note }) => {
  const { data } = await api.patch(`/users/${userId}/verify-document`, { status, note });
  return data.user;
};

// ── Hooks ─────────────────────────────────────────────────────────────────────
export function useDirectory() {
  return useQuery({
    queryKey: userKeys.directory,
    queryFn:  fetchDirectory,
    staleTime: 30_000,
  });
}

export function useVerificationDocument(userId, { enabled = true } = {}) {
  return useQuery({
    queryKey: userKeys.document(userId),
    queryFn:  () => fetchDocument(userId),
    enabled:  !!userId && enabled,
    staleTime: Infinity, // document doesn't change once uploaded
  });
}

export function useReviewDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: reviewDocument,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.directory });
    },
  });
}
