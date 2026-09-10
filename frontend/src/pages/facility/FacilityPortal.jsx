import { useCallback, useEffect, useRef, useState } from 'react';
import {
  useCreateFacility,
  useMyFacility,
  useUpdateCapacity,
} from '../../api/facilities';
import Button from '../../components/Button';
import ErrorBanner from '../../components/ErrorBanner';
import ErrorRetry from '../../components/ErrorRetry';
import Input from '../../components/Input';
import Loader from '../../components/Loader';
import MapView from '../../components/MapView';
import Navbar from '../../components/Navbar';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

// ── Capacity bar helpers (mirrors FacilityDirectory logic) ────────────────────
function capacityColor(pct) {
  if (pct >= 90) return { bar: 'bg-red-500',     text: 'text-red-400',     label: 'Critical' };
  if (pct >= 70) return { bar: 'bg-amber-500',    text: 'text-amber-400',   label: 'High' };
  return             { bar: 'bg-emerald-500',  text: 'text-emerald-400', label: 'Normal' };
}

const STATUS_OPTIONS = ['operational', 'full', 'closed'];
const STATUS_STYLES = {
  operational: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  full:        'bg-red-500/15     text-red-300     border-red-500/30',
  closed:      'bg-slate-700/50   text-slate-400   border-slate-600',
};

// ── Registration form ─────────────────────────────────────────────────────────
function RegisterForm({ userRole }) {
  const { mutateAsync: create, isPending } = useCreateFacility();

  const [form, setForm] = useState({
    name:          '',
    address:       '',
    capacityTotal: '',
    contactPhone:  '',
  });
  const [location, setLocation] = useState(null); // { lat, lng }
  const [geoLoading, setGeoLoading] = useState(false);
  const [errors,   setErrors]   = useState({});
  const [apiError, setApiError] = useState('');

  const set = (f) => (e) => setForm((prev) => ({ ...prev, [f]: e.target.value }));

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setErrors((er) => ({ ...er, location: 'Geolocation not supported' }));
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setErrors((er) => ({ ...er, location: undefined }));
        setGeoLoading(false);
      },
      () => {
        setErrors((er) => ({ ...er, location: 'Could not get location — click the map instead' }));
        setGeoLoading(false);
      },
      { timeout: 8000 }
    );
  };

  function validate() {
    const e = {};
    if (!form.name.trim())       e.name          = 'Facility name is required';
    if (!form.capacityTotal || isNaN(Number(form.capacityTotal)) || Number(form.capacityTotal) < 1)
                                  e.capacityTotal = 'Enter a valid total capacity';
    if (!location)                e.location      = 'Set a location — click the map or use My Location';
    return e;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    const e_ = validate();
    if (Object.keys(e_).length) { setErrors(e_); return; }
    setErrors({});

    try {
      await create({
        type:          userRole, // locked to the user's role
        name:          form.name.trim(),
        lng:           location.lng,
        lat:           location.lat,
        address:       form.address.trim() || undefined,
        capacityTotal: Number(form.capacityTotal),
        contactPhone:  form.contactPhone.trim() || undefined,
      });
    } catch (err) {
      setApiError(err.response?.data?.message || 'Registration failed');
    }
  };

  const facilityLabel = userRole === 'hospital' ? 'Hospital' : 'Shelter';
  const capacityLabel = userRole === 'hospital' ? 'Total beds' : 'Total capacity (people)';

  return (
    <div className="flex-1 flex items-start justify-center px-4 py-8">
      <div className="panel w-full max-w-lg p-8 space-y-6">
        {/* Header */}
        <div className="text-center">
          <p className="text-4xl mb-2">{userRole === 'hospital' ? '🏥' : '🏠'}</p>
          <h2 className="text-xl font-bold text-slate-100">Register your {facilityLabel}</h2>
          <p className="text-slate-400 text-sm mt-1">
            Set up your facility so citizens and EOC can see your live capacity.
          </p>
        </div>

        <ErrorBanner message={apiError} />

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Type — locked, display only */}
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-navy-900 border border-slate-700 text-sm">
            <span>{userRole === 'hospital' ? '🏥' : '🏠'}</span>
            <span className="text-slate-300 capitalize font-medium">{facilityLabel}</span>
            <span className="text-slate-600 text-xs ml-auto">locked to your role</span>
          </div>

          <Input
            id="fac-name"
            label={`${facilityLabel} name`}
            type="text"
            placeholder={userRole === 'hospital' ? 'e.g. City General Hospital' : 'e.g. Red Cross Shelter 4'}
            value={form.name}
            onChange={set('name')}
            error={errors.name}
          />

          <Input
            id="fac-address"
            label="Address"
            hint="(optional)"
            type="text"
            placeholder="Street address or landmark"
            value={form.address}
            onChange={set('address')}
          />

          <Input
            id="fac-capacity"
            label={capacityLabel}
            type="number"
            min="1"
            placeholder="e.g. 150"
            value={form.capacityTotal}
            onChange={set('capacityTotal')}
            error={errors.capacityTotal}
          />

          <Input
            id="fac-phone"
            label="Contact phone"
            hint="(optional)"
            type="tel"
            placeholder="+91 00000 00000"
            value={form.contactPhone}
            onChange={set('contactPhone')}
          />

          {/* Location picker */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400">Location</p>
              <Button
                type="button"
                variant="ghost"
                className="text-xs py-1 px-2"
                loading={geoLoading}
                loadingText="Getting location…"
                onClick={useMyLocation}
              >
                📍 Use my location
              </Button>
            </div>
            <p className="text-xs text-slate-500">
              {location
                ? `✅ ${location.lat.toFixed(5)}, ${location.lng.toFixed(5)} — click map to adjust`
                : 'Click on the map to pin your facility location'}
            </p>
            <div className="h-52 rounded-xl overflow-hidden border border-slate-700/60">
              <MapView
                pickerMode
                pickerMarker={location}
                onLocationPick={(loc) => {
                  setLocation(loc);
                  setErrors((er) => ({ ...er, location: undefined }));
                }}
                center={location ? [location.lat, location.lng] : undefined}
                zoom={location ? 14 : 5}
                className="h-full w-full"
              />
            </div>
            {errors.location && <p className="text-xs text-red-400">{errors.location}</p>}
          </div>

          <Button type="submit" loading={isPending} loadingText="Registering…" className="w-full">
            Register {facilityLabel}
          </Button>
        </form>
      </div>
    </div>
  );
}

// ── Capacity stepper ──────────────────────────────────────────────────────────
function CapacityEditor({ facility }) {
  const { mutate: updateCap, isPending } = useUpdateCapacity();
  const { showToast } = useToast();

  const [localUsed, setLocalUsed] = useState(facility.capacityUsed ?? 0);
  const [saveState, setSaveState] = useState('idle');
  const debounceRef = useRef(null);

  useEffect(() => {
    setLocalUsed(facility.capacityUsed ?? 0);
  }, [facility.capacityUsed]);

  const triggerSave = useCallback(
    (value) => {
      setSaveState('saving');
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateCap(
          { id: facility._id, capacityUsed: value },
          {
            onSuccess: () => {
              setSaveState('saved');
              setTimeout(() => setSaveState('idle'), 2000);
            },
            onError: () => {
              setSaveState('idle');
              showToast("Couldn't save capacity — please try again", 'error');
            },
          }
        );
      }, 800);
    },
    [facility._id, updateCap, showToast]
  );

  const set = (val) => {
    const clamped = Math.max(0, Math.min(facility.capacityTotal, val));
    setLocalUsed(clamped);
    triggerSave(clamped);
  };

  const pct   = facility.capacityTotal > 0
    ? Math.round((localUsed / facility.capacityTotal) * 100)
    : 0;
  const color = capacityColor(pct);
  const unitLabel = facility.type === 'hospital' ? 'beds' : 'spots';

  return (
    <div className="panel p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
          Live Capacity
        </h3>
        <span className="text-xs">
          {saveState === 'saving' && <span className="text-slate-500">Saving…</span>}
          {saveState === 'saved'  && <span className="text-emerald-400">✓ Saved</span>}
        </span>
      </div>

      {/* Big number display */}
      <div className="flex items-end gap-2">
        <span className={`text-5xl font-bold tabular-nums ${color.text}`}>
          {localUsed}
        </span>
        <span className="text-slate-500 text-xl mb-1.5">/ {facility.capacityTotal} {unitLabel}</span>
      </div>

      {/* Capacity bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-slate-400">
          <span>{pct}% occupied</span>
          <span className={`font-semibold ${color.text}`}>{color.label}</span>
        </div>
        <div className="h-3 bg-navy-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${color.bar}`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      </div>

      {/* Stepper + direct input */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => set(localUsed - 1)}
          disabled={localUsed <= 0 || isPending}
          className="w-11 h-11 rounded-xl bg-navy-700 border border-slate-600 text-slate-200
                     text-xl font-bold hover:bg-navy-600 transition-colors
                     disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Decrease by 1"
        >
          −
        </button>

        <input
          type="number"
          min={0}
          max={facility.capacityTotal}
          value={localUsed}
          onChange={(e) => set(Number(e.target.value))}
          className="input text-center text-xl font-bold tabular-nums w-24 py-2"
          aria-label="Current occupancy"
        />

        <button
          onClick={() => set(localUsed + 1)}
          disabled={localUsed >= facility.capacityTotal || isPending}
          className="w-11 h-11 rounded-xl bg-navy-700 border border-slate-600 text-slate-200
                     text-xl font-bold hover:bg-navy-600 transition-colors
                     disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Increase by 1"
        >
          +
        </button>

        <span className="text-slate-500 text-sm ml-1">{unitLabel} occupied</span>
      </div>
    </div>
  );
}

// ── Status selector ────────────────────────────────────────────────────────────
function StatusEditor({ facility }) {
  const { mutate: updateCap, isPending } = useUpdateCapacity();
  const [saving, setSaving] = useState(false);

  const handleChange = (status) => {
    setSaving(true);
    updateCap(
      { id: facility._id, capacityUsed: facility.capacityUsed, status },
      { onSettled: () => setSaving(false) }
    );
  };

  return (
    <div className="panel p-5 space-y-3">
      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
        Facility Status
      </h3>
      <div className="flex gap-2 flex-wrap">
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => handleChange(s)}
            disabled={isPending || saving}
            className={`
              px-4 py-2 rounded-lg border text-sm font-medium capitalize transition-colors
              ${facility.status === s
                ? STATUS_STYLES[s]
                : 'border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300'}
              disabled:opacity-50
            `}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Facility dashboard (facility exists) ──────────────────────────────────────
function FacilityDashboard({ facility }) {
  const [lng, lat] = facility.location?.coordinates ?? [0, 0];
  const hasCoords  = !!(lat && lng);

  const facilityAsMapMarker = hasCoords ? [facility] : [];

  return (
    <div className="flex-1 max-w-2xl w-full mx-auto px-4 py-6 space-y-5">
      {/* Header card */}
      <div className="panel p-5 flex items-start gap-4">
        <span className="text-4xl shrink-0">{facility.type === 'hospital' ? '🏥' : '🏠'}</span>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold text-slate-100 truncate">{facility.name}</h2>
          <p className="text-slate-400 text-sm capitalize mt-0.5">{facility.type}</p>
          {facility.location?.address && (
            <p className="text-slate-500 text-xs mt-1 flex items-center gap-1">
              📍 {facility.location.address}
            </p>
          )}
          {!facility.location?.address && hasCoords && (
            <p className="text-slate-500 text-xs mt-1 font-mono">
              {lat.toFixed(5)}, {lng.toFixed(5)}
            </p>
          )}
          {facility.contactPhone && (
            <p className="text-slate-500 text-xs mt-1">📞 {facility.contactPhone}</p>
          )}
        </div>
      </div>

      {/* Live capacity editor */}
      <CapacityEditor facility={facility} />

      {/* Status toggle */}
      <StatusEditor facility={facility} />

      {/* Map */}
      {hasCoords && (
        <div className="panel overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-700/40">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Location</h3>
          </div>
          <div className="h-56">
            <MapView
              facilities={facilityAsMapMarker}
              center={[lat, lng]}
              zoom={15}
              className="h-full w-full"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page root ──────────────────────────────────────────────────────────────────
export default function FacilityPortal() {
  const { user } = useAuth();
  const { data: facility, isLoading, isError, refetch } = useMyFacility();

  return (
    <div className="flex flex-col min-h-screen bg-navy-950">
      <Navbar />

      {isLoading && <Loader text="Loading facility data…" />}

      {isError && (
        <div className="flex-1 flex items-center justify-center p-8">
          <ErrorRetry message="Couldn't load facility data" onRetry={refetch} />
        </div>
      )}

      {!isLoading && !isError && !facility && (
        <RegisterForm userRole={user?.role ?? 'shelter'} />
      )}

      {!isLoading && !isError && facility && (
        <FacilityDashboard facility={facility} />
      )}
    </div>
  );
}
