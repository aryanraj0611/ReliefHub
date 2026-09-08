import 'leaflet/dist/leaflet.css';
import { divIcon } from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from 'react-leaflet';

// ── Category config ───────────────────────────────────────────────────────────
export const CATEGORY_EMOJI = {
  flood:      '🌊',
  fire:       '🔥',
  earthquake: '🏚️',
  medical:    '🚑',
  structural: '🏗️',
  other:      '⚠️',
};

// ── Severity → ring colour ────────────────────────────────────────────────────
const SEVERITY_RING = {
  low:      'ring-green-400  bg-green-400/20',
  medium:   'ring-amber-400  bg-amber-400/20',
  high:     'ring-orange-500 bg-orange-500/20',
  critical: 'ring-red-500    bg-red-500/20',
};

// Tailwind can't generate dynamic class strings at runtime — we embed a tiny
// inline style for the ring colour instead of relying on dynamic class names.
const SEVERITY_BORDER_COLOR = {
  low:      '#4ade80',
  medium:   '#fbbf24',
  high:     '#f97316',
  critical: '#ef4444',
};

// ── Build a divIcon from an emoji so we get custom styled markers ─────────────
function makeIncidentIcon(category, severity) {
  const pulse   = severity === 'critical';
  const emoji   = CATEGORY_EMOJI[category] ?? CATEGORY_EMOJI.other;
  const color   = SEVERITY_BORDER_COLOR[severity] ?? SEVERITY_BORDER_COLOR.medium;
  const animate = pulse ? 'animate-ping-slow' : '';

  const html = `
    <div style="position:relative;width:36px;height:36px;">
      ${pulse ? `<div style="position:absolute;inset:0;border-radius:50%;background:${color};opacity:0.4;" class="animate-ping"></div>` : ''}
      <div style="
        position:absolute;inset:0;
        border-radius:50%;
        border:2.5px solid ${color};
        background:rgba(15,20,40,0.85);
        display:flex;align-items:center;justify-content:center;
        font-size:18px;line-height:1;
      ">${emoji}</div>
    </div>`;

  return divIcon({ html, className: '', iconSize: [36, 36], iconAnchor: [18, 18] });
}

function makeFacilityIcon(type) {
  const emoji = type === 'hospital' ? '🏥' : '🏠';
  const color = type === 'hospital' ? '#06b6d4' : '#8b5cf6';
  const html = `
    <div style="
      width:34px;height:34px;border-radius:6px;
      border:2px solid ${color};
      background:rgba(15,20,40,0.9);
      display:flex;align-items:center;justify-content:center;
      font-size:18px;line-height:1;
    ">${emoji}</div>`;
  return divIcon({ html, className: '', iconSize: [34, 34], iconAnchor: [17, 17] });
}

function makePickerIcon() {
  const html = `
    <div style="
      width:28px;height:28px;border-radius:50%;
      border:3px solid #ef4444;background:rgba(239,68,68,0.25);
      display:flex;align-items:center;justify-content:center;
      font-size:16px;
    ">📍</div>`;
  return divIcon({ html, className: '', iconSize: [28, 28], iconAnchor: [14, 28] });
}

// ── Internal sub-component: handles map-click in picker mode ─────────────────
function LocationPicker({ onPick }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

// ── Format helpers ────────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Main component ────────────────────────────────────────────────────────────
/**
 * @param {object[]} incidents
 * @param {object[]} facilities
 * @param {boolean}  pickerMode     — if true, clicking the map calls onLocationPick
 * @param {{lat,lng}} pickerMarker  — currently selected location in picker mode
 * @param {function} onLocationPick — called with { lat, lng }
 * @param {[number,number]} center  — [lat, lng] default center
 * @param {number}   zoom
 * @param {string}   className
 */
export default function MapView({
  incidents = [],
  facilities = [],
  pickerMode = false,
  pickerMarker = null,
  onLocationPick,
  center = [20.5937, 78.9629],
  zoom = 5,
  className = 'h-full w-full',
  children, // allows callers to inject react-leaflet sub-components (e.g. MapPanner)
}) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className={className}
      style={{ background: '#0b1221' }}
      scrollWheelZoom={true}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        // Dark-tinted OSM via CartoDB — no API key, free
        // Swap for: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />

      {/* Picker mode click handler */}
      {pickerMode && onLocationPick && (
        <LocationPicker onPick={onLocationPick} />
      )}

      {/* Picker mode selected location marker */}
      {pickerMode && pickerMarker && (
        <Marker
          position={[pickerMarker.lat, pickerMarker.lng]}
          icon={makePickerIcon()}
        >
          <Popup>Selected location</Popup>
        </Marker>
      )}

      {/* Incident markers */}
      {incidents.map((inc) => {
        const [lng, lat] = inc.location?.coordinates ?? [0, 0];
        if (!lat && !lng) return null;
        return (
          <Marker
            key={inc._id}
            position={[lat, lng]}
            icon={makeIncidentIcon(inc.category, inc.severity)}
          >
            <Popup maxWidth={260}>
              <div className="text-sm space-y-1" style={{ fontFamily: 'system-ui, sans-serif' }}>
                <div className="font-semibold text-base">
                  {CATEGORY_EMOJI[inc.category] ?? '⚠️'} {inc.title}
                </div>
                {inc.aiAnalysis?.summary && (
                  <p className="text-slate-600 leading-snug">{inc.aiAnalysis.summary}</p>
                )}
                <div className="flex gap-2 flex-wrap pt-1">
                  <span className="capitalize font-medium">{inc.category}</span>
                  <span>·</span>
                  <span className="capitalize">{inc.severity}</span>
                  <span>·</span>
                  <span className="capitalize">{inc.status?.replace('_', ' ')}</span>
                </div>
                <div className="text-slate-400 text-xs">{timeAgo(inc.createdAt)}</div>
              </div>
            </Popup>
          </Marker>
        );
      })}

      {/* Facility markers */}
      {facilities.map((fac) => {
        const [lng, lat] = fac.location?.coordinates ?? [0, 0];
        if (!lat && !lng) return null;
        const pct = fac.occupancyPercent ?? 0;
        return (
          <Marker
            key={fac._id}
            position={[lat, lng]}
            icon={makeFacilityIcon(fac.type)}
          >
            <Popup maxWidth={240}>
              <div className="text-sm space-y-1" style={{ fontFamily: 'system-ui, sans-serif' }}>
                <div className="font-semibold text-base">
                  {fac.type === 'hospital' ? '🏥' : '🏠'} {fac.name}
                </div>
                <div className="capitalize text-slate-500">{fac.type} · {fac.status}</div>
                {fac.capacityTotal > 0 && (
                  <div>
                    Capacity: {fac.capacityUsed}/{fac.capacityTotal} ({pct}% full)
                  </div>
                )}
                {fac.contactPhone && (
                  <div className="text-slate-500">📞 {fac.contactPhone}</div>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}

      {/* Injected sub-components (e.g. MapPanner from EOCDashboard) */}
      {children}
    </MapContainer>
  );
}
