import { useAuth } from '../context/AuthContext';
import { useNavigate } from "react-router-dom";

const ROLE_LABELS = {
  citizen:     'Citizen',
  eoc:         'EOC',
  rescue_team: 'Rescue',
  hospital:    'Hospital',
  shelter:     'Shelter',
  volunteer:   'Volunteer',
  ngo:         'NGO',
  admin:       'Admin',
};

const ROLE_COLORS = {
  citizen:     'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
  eoc:         'bg-red-500/20 text-red-300 border-red-500/40',
  rescue_team: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
  hospital:    'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  shelter:     'bg-violet-500/20 text-violet-300 border-violet-500/40',
  volunteer:   'bg-green-500/20 text-green-300 border-green-500/40',
  ngo:         'bg-amber-500/20 text-amber-300 border-amber-500/40',
  admin:       'bg-pink-500/20 text-pink-300 border-pink-500/40',
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // logout() in AuthContext now handles navigation internally
  const handleLogout = () => logout();

  return (
    <nav className="sticky top-0 z-50 bg-navy-900/95 backdrop-blur border-b border-slate-700/60 px-4 sm:px-6 h-14 flex items-center justify-between">
      {/* Brand */}
      <div className="flex items-center gap-2">
        <span className="text-red-500 font-bold text-xl tracking-tight select-none">
          Crisis<span className="text-slate-100">Grid</span>
        </span>
        <span className="hidden sm:block text-slate-600 text-xs uppercase tracking-widest mt-0.5">
          Emergency Response
        </span>
      </div>

      {/* Right side */}
      {user && (
        <div className="flex items-center gap-3">
          {/* User name */}
          <span className="hidden sm:block text-slate-300 text-sm truncate max-w-[140px]">
            {user.name}
          </span>

          {/* Role badge */}
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full border tracking-wide uppercase ${
              ROLE_COLORS[user.role] ?? 'bg-slate-700/40 text-slate-300 border-slate-600'
            }`}
          >
            {ROLE_LABELS[user.role] ?? user.role}
          </span>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="btn-ghost text-sm px-3 py-1.5"
            aria-label="Log out"
          >
            Log out
          </button>
        </div>
      )}
    </nav>
  );
}
