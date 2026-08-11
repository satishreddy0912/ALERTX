import { useRef, useState } from 'react';
import { Siren, MapPin, LocateFixed, ImagePlus, X, CheckCircle2, AlertCircle, Upload } from 'lucide-react';
import type { EmergencyType, Incident, EmergencyDetection } from '@/types';

interface Props {
  onSubmit: (data: {
    type: EmergencyType;
    name: string;
    phone: string;
    location: string;
    description: string;
    imageData: string | null;
    coords: { lat: number; lng: number } | null;
  }) => Incident;
  onGoDashboard: () => void;
  onViewIncident: (id: string) => void;
}

const TYPES: { value: EmergencyType; icon: string }[] = [
  { value: 'Road Accident', icon: '🚗' },
  { value: 'Medical Emergency', icon: '🚑' },
  { value: 'Fire', icon: '🔥' },
  { value: 'Other', icon: '⚠️' },
];

export function ReportEmergencyPage({ onSubmit, onGoDashboard, onViewIncident }: Props) {
  const [type, setType] = useState<EmergencyType>('Road Accident');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [imageData, setImageData] = useState<string | null>(null);
  const [imageName, setImageName] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Incident | null>(null);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setError('Image is too large. Please pick an image under 4MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageData(reader.result as string);
      setImageName(file.name);
      setError('');
    };
    reader.onerror = () => setError('Could not read the selected image.');
    reader.readAsDataURL(file);
  }

  function removeImage() {
    setImageData(null);
    setImageName('');
    if (fileRef.current) fileRef.current.value = '';
  }

  function useMyLocation() {
    setGeoStatus('loading');
    if (!navigator.geolocation) {
      setGeoStatus('error');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });
        setLocation((prev) => prev || `Lat ${latitude.toFixed(4)}, Lng ${longitude.toFixed(4)}`);
        setGeoStatus('ok');
      },
      () => setGeoStatus('error'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (!phone.trim()) {
      setError('Please enter a phone number.');
      return;
    }
    if (!location.trim() && !coords) {
      setError('Please enter a location or use your current location.');
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      const incident = onSubmit({
        type,
        name: name.trim(),
        phone: phone.trim(),
        location: location.trim() || (coords ? `Lat ${coords.lat.toFixed(4)}, Lng ${coords.lng.toFixed(4)}` : ''),
        description: description.trim(),
        imageData,
        coords,
      });
      setResult(incident);
      setSubmitting(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 400);
  }

  function resetForm() {
    setType('Road Accident');
    setName('');
    setPhone('');
    setLocation('');
    setDescription('');
    setImageData(null);
    setImageName('');
    setCoords(null);
    setGeoStatus('idle');
    setResult(null);
  }

  if (result) {
    return (
      <div className="mx-auto max-w-lg">
        <div className="card animate-pop-in p-6 text-center sm:p-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Emergency Reported</h1>
          <p className="mt-2 text-sm text-secondary-400">Responders have been notified.</p>

          <div className="mt-5 space-y-3 text-left">
            <div className="rounded-xl border border-navy-700 bg-navy-800 p-4">
              <div className="text-xs uppercase tracking-wider text-secondary-400">Incident ID</div>
              <div className="mt-1 text-lg font-bold text-secondary-400">{result.id}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <InfoBox label="Type" value={result.type} />
              <InfoBox label="Severity" value={result.severity} />
              <InfoBox label="Priority" value={`${result.priority}/100`} />
              <InfoBox label="Credibility" value={`${result.credibility.score}%`} />
            </div>
            <div className="rounded-xl border border-navy-700 bg-navy-800 p-3">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-secondary-400">Emergency Detection:</span>
                <DetectionLabel value={result.emergencyDetection} />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-secondary-400">Confidence:</span>
                <span className="font-mono font-semibold text-secondary-400">{result.confidence}%</span>
              </div>
            </div>
            <div className="rounded-xl border border-navy-700 bg-navy-800 p-3 text-sm text-secondary-400">
              <div className="mb-1 text-xs uppercase tracking-wider text-secondary-400">Reason</div>
              {result.reason}
            </div>
            <div className="rounded-xl border border-navy-700 bg-navy-800 p-3 text-sm text-secondary-400">
              {result.aiSummary}
            </div>
            {result.status === 'VERIFICATION_REQUIRED' && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
                This report has been flagged for verification due to low credibility. Responders will review it before action.
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <button onClick={() => onViewIncident(result.id)} className="btn-primary flex-1 py-3 text-sm">
              View Incident
            </button>
            <button onClick={() => onGoDashboard()} className="btn-ghost flex-1 py-3 text-sm">
              Responder Dashboard
            </button>
          </div>
          <button onClick={resetForm} className="mt-3 text-xs text-secondary-400 underline hover:text-secondary-400">
            Report another emergency
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
          <Siren className="h-6 w-6 text-emergency-500" /> Report an Emergency
        </h1>
        <p className="mt-1 text-sm text-secondary-400">
          Provide the details below. The description is optional. Your report will be analyzed by AI and sent to responders immediately.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Type */}
        <div>
          <label className="label">Emergency Type</label>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition ${
                  type === t.value
                    ? 'border-accent-500 bg-navy-900 text-white'
                    : 'border-navy-700 bg-navy-800 text-secondary-400 hover:border-navy-600'
                }`}
              >
                <span className="text-2xl">{t.icon}</span>
                <span className="text-xs font-medium leading-tight">{t.value}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Name + Phone */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="name">Name</label>
            <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          </div>
          <div>
            <label className="label" htmlFor="phone">Phone Number</label>
            <input id="phone" type="tel" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 9876543210" />
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="label" htmlFor="location">Location</label>
          <input id="location" className="input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Address or area" />
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
            <button type="button" onClick={useMyLocation} className="btn-ghost py-2.5 text-sm">
              <LocateFixed className={`h-4 w-4 ${geoStatus === 'loading' ? 'animate-spin' : ''}`} /> Use My Location
            </button>
            {geoStatus === 'ok' && coords && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                <MapPin className="h-3.5 w-3.5" /> {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
              </span>
            )}
            {geoStatus === 'error' && (
              <span className="flex items-center gap-1.5 text-xs text-emergency-400">
                <AlertCircle className="h-3.5 w-3.5" /> Location permission denied
              </span>
            )}
          </div>
        </div>

        {/* Description (optional) */}
        <div>
          <label className="label" htmlFor="desc">Description (Optional)</label>
          <textarea
            id="desc"
            className="input min-h-[88px] resize-y"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what is happening (optional)"
          />
        </div>

        {/* Image upload */}
        <div>
          <label className="label">Image (Optional)</label>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/jpg" onChange={handleFile} className="hidden" />

          {!imageData ? (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-navy-700 bg-navy-800 p-6 text-secondary-400 transition hover:border-accent-500 hover:text-secondary-400"
            >
              <ImagePlus className="h-8 w-8" />
              <span className="text-sm font-medium">Tap to upload an image</span>
              <span className="text-xs text-secondary-400">JPG, JPEG or PNG · from camera or gallery</span>
            </button>
          ) : (
            <div className="space-y-3">
              <div className="relative overflow-hidden rounded-xl border border-navy-700">
                <img src={imageData} alt="Preview" className="h-48 w-full object-cover sm:h-56" />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute right-2 top-2 rounded-lg bg-navy-900 p-1.5 text-white backdrop-blur hover:bg-emergency-600"
                  aria-label="Remove image"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-lg bg-navy-800 px-3 py-2">
                <span className="flex min-w-0 items-center gap-2 text-xs text-secondary-400">
                  <Upload className="h-3.5 w-3.5 shrink-0 text-secondary-400" />
                  <span className="truncate">{imageName || 'Selected image'}</span>
                </span>
                <button type="button" onClick={() => fileRef.current?.click()} className="shrink-0 text-xs font-semibold text-secondary-400 hover:underline">
                  Change
                </button>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-emergency-500/30 bg-emergency-600/10 p-3 text-sm text-emergency-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        <button type="submit" disabled={submitting} className="btn-danger w-full py-4 text-base">
          <Siren className="h-5 w-5" /> {submitting ? 'Reporting...' : 'REPORT EMERGENCY'}
        </button>
      </form>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-navy-700 bg-navy-800 p-3">
      <div className="text-xs uppercase tracking-wider text-secondary-400">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

const DETECTION_STYLES: Record<EmergencyDetection, string> = {
  'EMERGENCY DETECTED': 'bg-emergency-600/20 text-emergency-300 border border-emergency-500/40',
  'NO CLEAR EMERGENCY': 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
  'UNCERTAIN': 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
  'POSSIBLE EMERGENCY': 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
  'HIGH-CONFIDENCE EMERGENCY': 'bg-emergency-600/25 text-emergency-300 border border-emergency-500/50',
};

function DetectionLabel({ value }: { value: EmergencyDetection }) {
  return <span className={`badge ${DETECTION_STYLES[value]}`}>{value}</span>;
}
