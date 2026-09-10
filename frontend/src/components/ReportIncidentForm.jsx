import { useEffect, useRef, useState } from 'react';
import { useCreateIncident } from '../api/incidents';
import Button from './Button';
import ErrorBanner from './ErrorBanner';
import Input from './Input';
import MapView from './MapView';
import { useToast } from '../context/ToastContext';

// ── Category selector config ──────────────────────────────────────────────────
const CATEGORIES = [
  { value: 'flood',      emoji: '🌊', label: 'Flood' },
  { value: 'fire',       emoji: '🔥', label: 'Fire' },
  { value: 'medical',    emoji: '🚑', label: 'Medical' },
  { value: 'earthquake', emoji: '🏚️', label: 'Quake' },
  { value: 'structural', emoji: '🏗️', label: 'Structural' },
  { value: 'other',      emoji: '⚠️', label: 'Other' },
];

// ── Confirmation card shown after successful submission ───────────────────────
function ConfirmationCard({ incident, onClose }) {
  const ai = incident.aiAnalysis ?? {};
  const resources = ai.recommendedResources ?? [];
  const SEVERITY_COLOR = {
    low: 'text-green-400', medium: 'text-amber-400',
    high: 'text-orange-400', critical: 'text-red-400',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-2xl">✅</span>
        <div>
          <p className="font-semibold text-slate-100">Report submitted</p>
          <p className="text-xs text-slate-400">Our AI has triaged your report</p>
        </div>
      </div>

      {ai.summary && (
        <div className="p-3 bg-navy-900 rounded-lg border border-slate-700/50">
          <p className="text-xs text-slate-400 mb-1 uppercase tracking-wide">AI Summary</p>
          <p className="text-slate-200 text-sm leading-relaxed">{ai.summary}</p>
        </div>
      )}

      <div className="flex gap-4 text-sm">
        <div>
          <p className="text-xs text-slate-500">Severity</p>
          <p className={`font-semibold capitalize ${SEVERITY_COLOR[incident.severity] ?? ''}`}>
            {incident.severity}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Category</p>
          <p className="text-slate-200 capitalize">{incident.category}</p>
        </div>
        {ai.etaMinutes && (
          <div>
            <p className="text-xs text-slate-500">Est. Response</p>
            <p className="text-slate-200">{ai.etaMinutes} min</p>
          </div>
        )}
      </div>

      {resources.length > 0 && (
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Recommended Resources</p>
          <ul className="space-y-1">
            {resources.map((r, i) => (
              <li key={i} className="flex justify-between text-sm text-slate-300 bg-navy-900 px-3 py-1.5 rounded-lg border border-slate-700/40">
                <span>{r.name}</span>
                <span className="text-slate-500">×{r.qty}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {incident.status === 'merged' && (
        <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg text-purple-300 text-sm">
          ℹ️ This report was detected as a duplicate of an existing incident and has been merged.
        </div>
      )}

      <Button onClick={onClose} className="w-full">Close</Button>
    </div>
  );
}

// ── Main form ─────────────────────────────────────────────────────────────────
export default function ReportIncidentForm({ onClose }) {
  const { mutateAsync: createIncident, isPending } = useCreateIncident();
  const { showToast } = useToast();

  const [step, setStep] = useState('form'); // 'form' | 'success'
  const [createdIncident, setCreatedIncident] = useState(null);

  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [category,    setCategory]    = useState('other');
  const [location,    setLocation]    = useState(null); // { lat, lng }
  const [errors,      setErrors]      = useState({});
  const [apiError,    setApiError]    = useState('');
  const [geoLoading,  setGeoLoading]  = useState(false);

  const modalRef = useRef(null);

  // Trap focus inside modal
  useEffect(() => {
    modalRef.current?.focus();
  }, []);

  // ── Geolocation ─────────────────────────────────────────────────────────────
  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setErrors((e) => ({ ...e, location: 'Geolocation not supported by your browser' }));
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setErrors((e) => ({ ...e, location: undefined }));
        setGeoLoading(false);
      },
      () => {
        setErrors((e) => ({ ...e, location: 'Could not get location — please click on the map instead' }));
        setGeoLoading(false);
      },
      { timeout: 8000 }
    );
  };

  // ── Validation ───────────────────────────────────────────────────────────────
  function validate() {
    const e = {};
    if (!title.trim())       e.title       = 'Title is required';
    if (!description.trim()) e.description = 'Description is required';
    if (!location)           e.location    = 'Set a location — click the map or use My Location';
    return e;
  }

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    const e_ = validate();
    if (Object.keys(e_).length) { setErrors(e_); return; }
    setErrors({});

    try {
      const incident = await createIncident({
        title:       title.trim(),
        description: description.trim(),
        category,
        lng:         location.lng,
        lat:         location.lat,
      });
      setCreatedIncident(incident);
      setStep('success');
      showToast('Incident reported successfully', 'success');
    } catch (err) {
      setApiError(err.response?.data?.message || 'Failed to submit report');
      showToast("Couldn't report incident — please try again", 'error');
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className="panel w-full sm:max-w-xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-6 outline-none"
      >
        {step === 'success' ? (
          <ConfirmationCard incident={createdIncident} onClose={onClose} />
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-100">Report Incident</h2>
              <button onClick={onClose} className="text-slate-500 hover:text-slate-200 text-xl leading-none" aria-label="Close">✕</button>
            </div>

            <ErrorBanner message={apiError} />

            <form onSubmit={handleSubmit} noValidate className="space-y-5 mt-4">

              {/* Title */}
              <Input
                id="inc-title"
                label="Title"
                type="text"
                placeholder="Brief title, e.g. 'Flooding near Station Road'"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                error={errors.title}
              />

              {/* Category */}
              <div className="flex flex-col gap-1.5">
                <p className="text-sm text-slate-400 select-none">Category</p>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setCategory(cat.value)}
                      className={`
                        flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-medium
                        transition-all duration-100 cursor-pointer
                        ${category === cat.value
                          ? 'border-red-500/60 bg-red-500/15 text-red-300 ring-1 ring-red-500/40'
                          : 'border-slate-700 bg-navy-900 text-slate-400 hover:border-slate-500 hover:text-slate-200'}
                      `}
                    >
                      <span className="text-xl">{cat.emoji}</span>
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <Input
                id="inc-desc"
                as="textarea"
                label="Description"
                placeholder="Describe the situation in detail — include how many people are affected if known"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                error={errors.description}
              />

              {/* Location */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-400 select-none">Location</p>
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

                <p className="text-xs text-slate-500 mb-1">
                  {location
                    ? `✅ ${location.lat.toFixed(5)}, ${location.lng.toFixed(5)} — or click map to adjust`
                    : 'Click on the map to pin the incident location'}
                </p>

                <div className="h-52 rounded-xl overflow-hidden border border-slate-700/60">
                  <MapView
                    pickerMode
                    pickerMarker={location}
                    onLocationPick={(loc) => {
                      setLocation(loc);
                      setErrors((e) => ({ ...e, location: undefined }));
                    }}
                    center={location ? [location.lat, location.lng] : undefined}
                    zoom={location ? 13 : 5}
                    className="h-full w-full"
                  />
                </div>
                {errors.location && <p className="text-xs text-red-400">{errors.location}</p>}
              </div>

              <Button type="submit" loading={isPending} loadingText="Submitting…" className="w-full">
                Submit Report
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
