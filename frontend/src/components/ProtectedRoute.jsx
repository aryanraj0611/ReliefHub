import { Navigate, Outlet } from 'react-router-dom';
import { ROLE_HOME, useAuth } from '../context/AuthContext';
import Loader from './Loader';

/**
 * Wraps protected routes.
 * - Shows a loader while the session-restore check runs on boot.
 * - Redirects to /login if no authenticated user.
 * - If the user IS logged in but their role isn't in allowedRoles,
 *   redirects them to their correct dashboard instead of an error page.
 *
 * @param {string[]} [allowedRoles]
 */
export default function ProtectedRoute({ allowedRoles }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <Loader text="Verifying session…" />;

  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Send the user to their own dashboard, not to a generic error
    const home = ROLE_HOME[user.role] ?? '/citizen';
    return <Navigate to={home} replace />;
  }

  return <Outlet />;
}
