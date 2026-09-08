import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import CitizenDashboard from './pages/citizen/CitizenDashboard';
import MyReports from './pages/citizen/MyReports';
import EOCDashboard from './pages/eoc/EOCDashboard';
import VerificationQueue from './pages/eoc/VerificationQueue';
import FacilityPortal from './pages/facility/FacilityPortal';
import RescueConsole from './pages/rescue/RescueConsole';

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login"    element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected — citizen, volunteer, ngo */}
      <Route element={<ProtectedRoute allowedRoles={['citizen', 'volunteer', 'ngo']} />}>
        <Route path="/citizen"             element={<CitizenDashboard />} />
        <Route path="/citizen/my-reports"  element={<MyReports />} />
      </Route>

      {/* Protected — EOC + admin */}
      <Route element={<ProtectedRoute allowedRoles={['eoc', 'admin']} />}>
        <Route path="/eoc"                element={<EOCDashboard />} />
        <Route path="/eoc/verification"   element={<VerificationQueue />} />
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
  );
}
