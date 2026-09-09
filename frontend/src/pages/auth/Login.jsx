import { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/Button';
import ErrorBanner from '../../components/ErrorBanner';
import Input from '../../components/Input';
import { useAuth } from '../../context/AuthContext';

export default function Login() {
  const { login } = useAuth();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [errors,   setErrors]   = useState({});
  const [apiError, setApiError] = useState('');
  const [loading,  setLoading]  = useState(false);

  // ── Client-side validation ─────────────────────────────────────────────────
  function validate() {
    const e = {};
    if (!email.trim())    e.email    = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email';
    if (!password)        e.password = 'Password is required';
    return e;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    const e_ = validate();
    if (Object.keys(e_).length) { setErrors(e_); return; }
    setErrors({});
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      // navigation is handled inside login()
    } catch (err) {
      setApiError(err.response?.data?.message || 'Login failed — check your credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-navy-950">
      <div className="panel w-full max-w-md p-8 space-y-6">

        {/* Header */}
        <div className="text-center">
          <p className="text-xs uppercase tracking-widest text-slate-500 mb-1">Emergency Response Platform</p>
          <h1 className="text-3xl font-bold text-slate-100">
            Relief<span className="text-red-500">Hub</span>
          </h1>
          <p className="text-slate-400 text-sm mt-2">Sign in to your account</p>
        </div>

        <ErrorBanner message={apiError} />

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <Input
            id="email"
            label="Email address"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
          />

          <Input
            id="password"
            label="Password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
          />

          <Button
            type="submit"
            loading={loading}
            loadingText="Signing in…"
            className="w-full mt-2"
          >
            Sign in
          </Button>
        </form>

        <p className="text-center text-slate-500 text-sm">
          No account?{' '}
          <Link to="/register" className="text-red-400 hover:text-red-300 underline underline-offset-2">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}
