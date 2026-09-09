import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { incidentKeys } from '../api/incidents';
import { facilityKeys } from '../api/facilities';
import { alertKeys } from '../api/alerts';
import { useAuth } from '../context/AuthContext';

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api')
  .replace('/api', ''); // Socket.IO connects to the server root, not /api

/**
 * Establishes a single Socket.IO connection when authenticated.
 * Wires server events directly into the TanStack Query cache so every
 * component that reads incidents/facilities/alerts updates automatically.
 *
 * Call this once at the top of the app (inside AuthProvider context).
 */
export function useSocket() {
  const { user, accessToken } = useAuth();
  const qc  = useQueryClient();
  const ref = useRef(null); // holds the socket instance

  useEffect(() => {
    if (!user) {
      // Disconnect any existing socket on logout
      if (ref.current) {
        ref.current.disconnect();
        ref.current = null;
      }
      return;
    }

    // Already connected — don't open a second socket
    if (ref.current?.connected) return;

    const socket = io(SOCKET_URL, {
      withCredentials: true,
      // Pass the access token so the server can identify the user if needed
      auth: { token: accessToken ?? '' },
      transports: ['websocket', 'polling'],
    });

    ref.current = socket;

    socket.on('connect', () => {
      console.log('[socket] connected:', socket.id);
    });

    socket.on('connect_error', (err) => {
      console.warn('[socket] connection error:', err.message);
    });

    // ── Incident events ───────────────────────────────────────────────────────
    // "incident:new" — prepend the new incident to the cached list
    socket.on('incident:new', (incident) => {
      qc.setQueryData(incidentKeys.all, (old) =>
        old ? [incident, ...old] : [incident]
      );
      // Also invalidate "mine" — the new incident may belong to this user
      qc.invalidateQueries({ queryKey: incidentKeys.mine });
    });

    // "incident:update" — replace the matching incident in cache
    socket.on('incident:update', (updated) => {
      qc.setQueryData(incidentKeys.all, (old) =>
        old?.map((inc) => (inc._id === updated._id ? updated : inc)) ?? old
      );
      qc.setQueryData(incidentKeys.mine, (old) =>
        old?.map((inc) => (inc._id === updated._id ? updated : inc)) ?? old
      );
    });

    // ── Facility events ───────────────────────────────────────────────────────
    socket.on('facility:new', (facility) => {
      qc.setQueryData(facilityKeys.all, (old) =>
        old ? [...old, facility] : [facility]
      );
    });

    socket.on('facility:update', (updated) => {
      qc.setQueryData(facilityKeys.all, (old) =>
        old?.map((f) => (f._id === updated._id ? updated : f)) ?? old
      );
      // Update "mine" if this facility belongs to the current user
      qc.setQueryData(facilityKeys.mine, (old) =>
        old?._id === updated._id ? updated : old
      );
    });

    // ── Alert events ──────────────────────────────────────────────────────────
    socket.on('alert:new', (alert) => {
      qc.setQueryData(alertKeys.active, (old) =>
        old ? [alert, ...old] : [alert]
      );
    });

    socket.on('alert:dismissed', ({ _id }) => {
      qc.setQueryData(alertKeys.active, (old) =>
        old?.filter((a) => a._id !== _id) ?? old
      );
    });

    return () => {
      socket.disconnect();
      ref.current = null;
    };
  }, [user]); // reconnect if user changes (login/logout)
}
