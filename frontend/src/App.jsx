import { Navigate, Route, Routes } from 'react-router-dom';
import ChatbotWidget from './components/ChatbotWidget';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';
import { useSocket } from './hooks/useSocket';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import CitizenDashboard from './pages/citizen/CitizenDashboard';
import MyReports from './pages/citizen/MyReports';
import EOCDashboard from './pages/eoc/EOCDashboard';
import VerificationQueue from './pages/eoc/VerificationQueue';
import FacilityPortal from './pages/facility/FacilityPortal';
import RescueConsole from './pages/rescue/RescueConsole';

// Mounts the Socket.IO connection and the chatbot for authenticated sessions.
// Must live inside AuthContext so it can read user + accessToken.
function AppShell({ children }) {
  useSocket(); // establishes socket, wires cache updates, cleans up on logout
  const { user } = useAuth();

  return (
    <>
      {children}
      {user && <ChatbotWidget />}
    </>
  );
}

export default function App() {
  return (
    <AppShell>
      <Routes>
        {/* Public */}
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected — citizen, volunteer, ngo */}
        <Route element={<ProtectedRoute allowedRoles={['citizen', 'volunteer', 'ngo']} />}>
          <Route path="/citizen"            element={<CitizenDashboard />} />
          <Route path="/citizen/my-reports" element={<MyReports />} />
        </Route>

        {/* Protected — EOC + admin */}
        <Route element={<ProtectedRoute allowedRoles={['eoc', 'admin']} />}>
          <Route path="/eoc"              element={<EOCDashboard />} />
          <Route path="/eoc/verification" element={<VerificationQueue />} />
        </Route>

        {/* Protected — rescue team */}
        <Route element={<ProtectedRoute allowedRoles={['rescue_team']} />}>
          <Route path="/rescue" element={<RescueConsole />} />
        </Route>

        {/* Protected — hospital + shelter */}
        <Route element={<ProtectedRoute allowedRoles={['hospital', 'shelter']} />}>
          <Route path="/facility" element={<FacilityPortal />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AppShell>
  );
}
