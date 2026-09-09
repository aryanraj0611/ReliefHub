import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/Button';
import ErrorBanner from '../../components/ErrorBanner';
import Input from '../../components/Input';
import { useAuth } from '../../context/AuthContext';

// ── Role card definitions ─────────────────────────────────────────────────────
const ROLES = [
  {
    value: 'citizen',
    label: 'Citizen',
    icon: '🏘️',
    desc: 'Report incidents, check safety',
    color: 'border-indigo-500/50 bg-indigo-500/10 text-indigo-300',
    active: 'ring-2 ring-indigo-400',
  },
  {
    value: 'eoc',
    label: 'EOC Staff',
    icon: '🎛️',
    desc: 'Dispatch, coordinate response',
    color: 'border-red-500/50 bg-red-500/10 text-red-300',
    active: 'ring-2 ring-red-400',
  },
  {
    value: 'rescue_team',
    label: 'Rescue Team',
    icon: '🚨',
    desc: 'Field response & rescue ops',
    color: 'border-orange-500/50 bg-orange-500/10 text-orange-300',
    active: 'ring-2 ring-orange-400',
  },
  {
    value: 'hospital',
    label: 'Hospital',
    icon: '🏥',
    desc: 'Manage beds & medical resources',
    color: 'border-cyan-500/50 bg-cyan-500/10 text-cyan-300',
    active: 'ring-2 ring-cyan-400',
  },
  {
    value: 'shelter',
    label: 'Shelter',
    icon: '🏠',
    desc: 'Manage shelter capacity',
    color: 'border-violet-500/50 bg-violet-500/10 text-violet-300',
    active: 'ring-2 ring-violet-400',
  },
];

// Roles that require a verification document
const NEEDS_VERIFICATION = ['eoc', 'rescue_team', 'hospital', 'shelter'];
// Roles that need an org name
const NEEDS_ORG = ['eoc', 'rescue_team', 'hospital', 'shelter'];

const MAX_FILE_BYTES = 2.5 * 1024 * 1024; // match backend limit

export default function Register() {
  const { register } = useAuth();

  const [form, setForm] = useState({
    name: '', email: '', password: '', phone: '',
    role: 'citizen', organizationName: '',
  });
  const [errors,   setErrors]   = useState({});
  const [apiError, setApiError] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [docFile,  setDocFile]  = useState(null);   // { name, dataUrl }
  const fileRef = useRef(null);

  const set = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  // ── File → base64 ──────────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_BYTES) {
      setErrors((er) => ({ ...er, doc: 'File must be under 2.5 MB' }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () =>
      setDocFile({ name: file.name, dataUrl: reader.result });
    reader.readAsDataURL(file);
    setErrors((er) => ({ ...er, doc: undefined }));
  };

  // ── Validation ─────────────────────────────────────────────────────────────
  function validate() {
    const e = {};
    if (!form.name.trim())      e.name     = 'Name is required';
    if (!form.email.trim())     e.email    = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.password)         e.password = 'Password is required';
    else if (form.password.length < 8)         e.password = 'At least 8 characters';
    else if (!/[A-Z]/.test(form.password))     e.password = 'Include at least one uppercase letter';
    else if (!/[0-9]/.test(form.password))     e.password = 'Include at least one number';
    if (NEEDS_ORG.includes(form.role) && !form.organizationName.trim())
      e.organizationName = 'Organization name is required for this role';
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
      const payload = {
        name:     form.name.trim(),
        email:    form.email.trim().toLowerCase(),
        password: form.password,
        role:     form.role,
        phone:    form.phone.trim() || undefined,
        organizationName: NEEDS_ORG.includes(form.role)
          ? form.organizationName.trim()
          : undefined,
        verificationDocument: NEEDS_VERIFICATION.includes(form.role) && docFile
          ? { dataUrl: docFile.dataUrl, fileName: docFile.name }
          : undefined,
      };
      await register(payload);
      // navigation is handled inside register()
    } catch (err) {
      setApiError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const selectedRole = ROLES.find((r) => r.value === form.role);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-navy-950 py-12">
      <div className="panel w-full max-w-lg p-8 space-y-6">

        {/* Header */}
        <div className="text-center">
          <p className="text-xs uppercase tracking-widest text-slate-500 mb-1">Emergency Response Platform</p>
          <h1 className="text-3xl font-bold text-slate-100">
            Relief<span className="text-red-500">Hub</span>
          </h1>
          <p className="text-slate-400 text-sm mt-2">Create your account</p>
        </div>

        <ErrorBanner message={apiError} />

        <form onSubmit={handleSubmit} noValidate className="space-y-5">

          {/* Name + Email */}
          <Input id="name" label="Full name" type="text" autoComplete="name"
            placeholder="Your name" value={form.name} onChange={set('name')}
            error={errors.name} />

          <Input id="email" label="Email address" type="email" autoComplete="email"
            placeholder="you@example.com" value={form.email} onChange={set('email')}
            error={errors.email} />

          <Input id="password" label="Password" type="password" autoComplete="new-password"
            placeholder="Min 8 chars, 1 uppercase, 1 number"
            value={form.password} onChange={set('password')}
            error={errors.password} />

          <Input id="phone" label="Phone" hint="(optional)" type="tel"
            placeholder="+91 00000 00000"
            value={form.phone} onChange={set('phone')} />

          {/* ── Role cards ─────────────────────────────────────────────────── */}
          <div>
            <p className="text-sm text-slate-400 mb-2 select-none">Select your role</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ROLES.map((role) => (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, role: role.value }))}
                  className={`
                    flex flex-col items-center gap-1 px-3 py-3 rounded-xl border
                    transition-all duration-150 text-center cursor-pointer
                    ${role.color}
                    ${form.role === role.value ? role.active : 'opacity-60 hover:opacity-90'}
                  `}
                >
                  <span className="text-2xl">{role.icon}</span>
                  <span className="text-xs font-semibold">{role.label}</span>
                  <span className="text-[10px] text-slate-400 leading-tight">{role.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Org name — conditional */}
          {NEEDS_ORG.includes(form.role) && (
            <Input
              id="organizationName"
              label="Organization name"
              type="text"
              placeholder={
                form.role === 'hospital' ? 'e.g. City General Hospital' :
                form.role === 'shelter'  ? 'e.g. Red Cross Shelter 4' :
                form.role === 'rescue_team' ? 'e.g. NDRF Team Alpha' :
                'e.g. District EOC'
              }
              value={form.organizationName}
              onChange={set('organizationName')}
              error={errors.organizationName}
            />
          )}

          {/* Verification document — conditional */}
          {NEEDS_VERIFICATION.includes(form.role) && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-slate-400 select-none">
                Verification document
                <span className="text-slate-600 ml-1">(optional — speeds up approval)</span>
              </label>
              <p className="text-xs text-slate-500">
                Upload an image of your official ID or organisation registration (max 2.5 MB).
                An EOC admin will review it.
              </p>

              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className={`
                  mt-1 flex items-center gap-3 px-4 py-3 rounded-lg border border-dashed
                  transition-colors duration-150 text-sm
                  ${docFile
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                    : 'border-slate-600 hover:border-slate-400 text-slate-400 hover:text-slate-200'}
                `}
              >
                <span className="text-lg">{docFile ? '✅' : '📎'}</span>
                <span className="truncate">
                  {docFile ? docFile.name : 'Click to choose a file…'}
                </span>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={handleFileChange}
              />
              {errors.doc && <p className="text-xs text-red-400">{errors.doc}</p>}
            </div>
          )}

          <Button
            type="submit"
            loading={loading}
            loadingText="Creating account…"
            className="w-full"
          >
            Create account
          </Button>
        </form>

        <p className="text-center text-slate-500 text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-red-400 hover:text-red-300 underline underline-offset-2">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
