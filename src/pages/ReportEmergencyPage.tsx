import { useRef, useState } from 'react';
import {
  Siren,
  MapPin,
  LocateFixed,
  ImagePlus,
  X,
  CheckCircle2,
  AlertCircle,
  Upload,
  Phone,
  ShieldCheck,
} from 'lucide-react';

import type {
  EmergencyType,
  Incident,
  EmergencyDetection,
} from '@/types';

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

const TYPES: {
  value: EmergencyType;
  icon: string;
}[] = [
  {
    value: 'Road Accident',
    icon: '🚗',
  },
  {
    value: 'Medical Emergency',
    icon: '🚑',
  },
  {
    value: 'Fire',
    icon: '🔥',
  },
  {
    value: 'Other',
    icon: '⚠️',
  },
];

// ============================================================
// PHONE VALIDATION
// ============================================================

function normalizePhone(value: string): string {
  return value.replace(/\D/g, '');
}

function isValidIndianPhone(value: string): boolean {
  const digits = normalizePhone(value);

  if (digits.length === 10) {
    return /^[6-9]\d{9}$/.test(digits);
  }

  if (
    digits.length === 12 &&
    digits.startsWith('91')
  ) {
    return /^[6-9]\d{9}$/.test(
      digits.slice(2),
    );
  }

  return false;
}

function formatPhoneForDisplay(
  value: string,
): string {
  const digits = normalizePhone(value);

  if (
    digits.length === 12 &&
    digits.startsWith('91')
  ) {
    return `+91 ${digits.slice(2)}`;
  }

  if (digits.length === 10) {
    return `+91 ${digits}`;
  }

  return value;
}

// ============================================================
// MAIN PAGE
// ============================================================

export function ReportEmergencyPage({
  onSubmit,
  onGoDashboard,
  onViewIncident,
}: Props) {
  const [type, setType] =
    useState<EmergencyType>(
      'Road Accident',
    );

  const [name, setName] =
    useState('');

  const [phone, setPhone] =
    useState('');

  const [location, setLocation] =
    useState('');

  const [description, setDescription] =
    useState('');

  const [imageData, setImageData] =
    useState<string | null>(null);

  const [imageName, setImageName] =
    useState('');

  const [coords, setCoords] =
    useState<{
      lat: number;
      lng: number;
    } | null>(null);

  const [geoStatus, setGeoStatus] =
    useState<
      'idle' | 'loading' | 'ok' | 'error'
    >('idle');

  const [submitting, setSubmitting] =
    useState(false);

  const [result, setResult] =
    useState<Incident | null>(null);

  const [error, setError] =
    useState('');

  const [phoneTouched, setPhoneTouched] =
    useState(false);

  const fileRef =
    useRef<HTMLInputElement>(null);

  // ==========================================================
  // IMAGE UPLOAD
  // ==========================================================

  function handleFile(
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      setError(
        'Image is too large. Please pick an image under 4MB.',
      );
      return;
    }

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/jpg',
    ];

    if (!allowedTypes.includes(file.type)) {
      setError(
        'Please select a JPG, JPEG or PNG image.',
      );
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setImageData(
        reader.result as string,
      );

      setImageName(file.name);

      setError('');
    };

    reader.onerror = () => {
      setError(
        'Could not read the selected image.',
      );
    };

    reader.readAsDataURL(file);
  }

  function removeImage() {
    setImageData(null);
    setImageName('');

    if (fileRef.current) {
      fileRef.current.value = '';
    }
  }

  // ==========================================================
  // LOCATION
  // ==========================================================

  async function useMyLocation() {
    setGeoStatus('loading');
    setError('');

    if (!navigator.geolocation) {
      setGeoStatus('error');

      setError(
        'Location is not supported by this browser.',
      );

      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const {
          latitude,
          longitude,
        } = position.coords;

        setCoords({
          lat: latitude,
          lng: longitude,
        });

        let address = `Lat ${latitude.toFixed(
          4,
        )}, Lng ${longitude.toFixed(4)}`;

        try {
          const response =
            await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
            );

          if (response.ok) {
            const data =
              await response.json();

            if (data.display_name) {
              address =
                data.display_name;
            }
          }
        } catch {
          // Coordinate fallback is retained.
        }

        setLocation(address);

        setGeoStatus('ok');

        setError('');
      },
      () => {
        setGeoStatus('error');

        setError(
          'Location permission denied. Please allow location access or enter the location manually.',
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  }

  // ==========================================================
  // PHONE INPUT
  // ==========================================================

  function handlePhoneChange(
    value: string,
  ) {
    const digits =
      normalizePhone(value);

    // Allow +91XXXXXXXXXX or XXXXXXXXXX
    if (
      digits.length > 12
    ) {
      return;
    }

    setPhone(value);
    setPhoneTouched(true);
  }

  const phoneIsValid =
    isValidIndianPhone(phone);

  // ==========================================================
  // SUBMIT
  // ==========================================================

  function handleSubmit(
    e: React.FormEvent,
  ) {
    e.preventDefault();

    setError('');

    // --------------------------------------------------------
    // Name
    // --------------------------------------------------------

    if (!name.trim()) {
      setError(
        'Please enter your name.',
      );

      return;
    }

    if (name.trim().length < 2) {
      setError(
        'Please enter a valid name.',
      );

      return;
    }

    // --------------------------------------------------------
    // Phone
    // --------------------------------------------------------

    if (!phone.trim()) {
      setError(
        'Please enter your phone number.',
      );

      return;
    }

    if (!phoneIsValid) {
      setError(
        'Please enter a valid Indian mobile number starting with 6, 7, 8 or 9.',
      );

      return;
    }

    // --------------------------------------------------------
    // Location
    // --------------------------------------------------------

    if (
      !location.trim() &&
      !coords
    ) {
      setError(
        'Please enter a location or use your current location.',
      );

      return;
    }

    // --------------------------------------------------------
    // Submit
    // --------------------------------------------------------

    setSubmitting(true);

    setTimeout(() => {
      const incident =
        onSubmit({
          type,

          name: name.trim(),

          phone:
            formatPhoneForDisplay(
              phone,
            ),

          location:
            location.trim() ||
            (coords
              ? `Lat ${coords.lat.toFixed(
                  4,
                )}, Lng ${coords.lng.toFixed(
                  4,
                )}`
              : ''),

          description:
            description.trim(),

          imageData,

          coords,
        });

      setResult(incident);

      setSubmitting(false);

      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }, 400);
  }

  // ==========================================================
  // RESET
  // ==========================================================

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
    setError('');
    setPhoneTouched(false);

    if (fileRef.current) {
      fileRef.current.value = '';
    }
  }

  // ==========================================================
  // RESULT SCREEN
  // ==========================================================

  if (result) {
    return (
      <div className="mx-auto max-w-lg">
        <div className="card animate-pop-in p-6 text-center sm:p-8">
          {/* Success icon */}

          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
          </div>

          <h1 className="text-2xl font-bold text-white">
            Emergency Reported
          </h1>

          <p className="mt-2 text-sm text-secondary-400">
            Responders have been notified.
          </p>

          {/* Reporter verification */}

          <div className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-left">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />

              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                  Reporter Identified
                </div>

                <div className="mt-0.5 text-sm font-semibold text-white">
                  {result.name}
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2 text-xs text-secondary-400">
              <Phone className="h-3.5 w-3.5" />

              {result.phone}
            </div>

            <div className="mt-2 text-[10px] text-secondary-500">
              Phone number provided during emergency reporting.
            </div>
          </div>

          {/* Incident information */}

          <div className="mt-4 space-y-3 text-left">
            <div className="rounded-xl border border-navy-700 bg-navy-800 p-4">
              <div className="text-xs uppercase tracking-wider text-secondary-400">
                Incident ID
              </div>

              <div className="mt-1 text-lg font-bold text-secondary-400">
                {result.id}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <InfoBox
                label="Type"
                value={result.type}
              />

              <InfoBox
                label="Severity"
                value={result.severity}
              />

              <InfoBox
                label="Priority"
                value={`${result.priority}/100`}
              />

              <InfoBox
                label="Credibility"
                value={`${result.credibility.score}%`}
              />
            </div>

            {/* Detection */}

            <div className="rounded-xl border border-navy-700 bg-navy-800 p-3">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-secondary-400">
                  Emergency Detection:
                </span>

                <DetectionLabel
                  value={
                    result.emergencyDetection
                  }
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-secondary-400">
                  Confidence:
                </span>

                <span className="font-mono font-semibold text-secondary-400">
                  {result.confidence}%
                </span>
              </div>
            </div>

            {/* Reason */}

            <div className="rounded-xl border border-navy-700 bg-navy-800 p-3 text-sm text-secondary-400">
              <div className="mb-1 text-xs uppercase tracking-wider text-secondary-400">
                Reason
              </div>

              {result.reason}
            </div>

            {/* AI summary */}

            <div className="rounded-xl border border-navy-700 bg-navy-800 p-3 text-sm text-secondary-400">
              {result.aiSummary}
            </div>

            {/* Verification warning */}

            {result.status ===
              'VERIFICATION_REQUIRED' && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
                This report has been flagged for verification due to low credibility. Responders will review it before action.
              </div>
            )}
          </div>

          {/* Actions */}

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <button
              onClick={() =>
                onViewIncident(
                  result.id,
                )
              }
              className="btn-primary flex-1 py-3 text-sm"
            >
              View Incident
            </button>

            <button
              onClick={
                onGoDashboard
              }
              className="btn-ghost flex-1 py-3 text-sm"
            >
              Responder Dashboard
            </button>
          </div>

          <button
            onClick={resetForm}
            className="mt-3 text-xs text-secondary-400 underline hover:text-white"
          >
            Report another emergency
          </button>
        </div>
      </div>
    );
  }

  // ==========================================================
  // REPORT FORM
  // ==========================================================

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}

      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
          <Siren className="h-6 w-6 text-emergency-500" />

          Report an Emergency
        </h1>

        <p className="mt-1 text-sm text-secondary-400">
          Enter your name and phone number so responders can identify the reporter. No registration or account is required.
        </p>
      </div>

      {/* Trust information */}

      <div className="mb-5 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-cyan-400" />

          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-cyan-300">
              Reporter Identification
            </div>

            <p className="mt-1 text-xs leading-relaxed text-secondary-400">
              Your phone number is used to identify the reporter and improve emergency-report credibility. No account registration is required.
            </p>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        {/* ==================================================
            EMERGENCY TYPE
        ================================================== */}

        <div>
          <label className="label">
            Emergency Type
          </label>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {TYPES.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() =>
                  setType(item.value)
                }
                className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition ${
                  type === item.value
                    ? 'border-accent-500 bg-navy-900 text-white'
                    : 'border-navy-700 bg-navy-800 text-secondary-400 hover:border-navy-600'
                }`}
              >
                <span className="text-2xl">
                  {item.icon}
                </span>

                <span className="text-xs font-medium leading-tight">
                  {item.value}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ==================================================
            NAME + PHONE
        ================================================== */}

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Name */}

          <div>
            <label
              className="label"
              htmlFor="name"
            >
              Your Name
            </label>

            <input
              id="name"
              className="input"
              value={name}
              onChange={(e) =>
                setName(
                  e.target.value,
                )
              }
              placeholder="Enter your name"
              autoComplete="name"
            />
          </div>

          {/* Phone */}

          <div>
            <label
              className="label"
              htmlFor="phone"
            >
              Phone Number
            </label>

            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-500" />

              <input
                id="phone"
                type="tel"
                inputMode="numeric"
                className={`input pl-10 ${
                  phoneTouched &&
                  phone.length > 0
                    ? phoneIsValid
                      ? 'border-emerald-500/50'
                      : 'border-emergency-500/50'
                    : ''
                }`}
                value={phone}
                onChange={(e) =>
                  handlePhoneChange(
                    e.target.value,
                  )
                }
                onBlur={() =>
                  setPhoneTouched(
                    true,
                  )
                }
                placeholder="9876543210"
                autoComplete="tel"
              />
            </div>

            {phoneTouched &&
              phone.length > 0 &&
              !phoneIsValid && (
                <p className="mt-1.5 text-[10px] text-emergency-400">
                  Enter a valid 10-digit Indian mobile number.
                </p>
              )}

            {phoneTouched &&
              phoneIsValid && (
                <p className="mt-1.5 flex items-center gap-1 text-[10px] text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" />

                  Valid mobile number
                </p>
              )}
          </div>
        </div>

        {/* ==================================================
            LOCATION
        ================================================== */}

        <div>
          <label
            className="label"
            htmlFor="location"
          >
            Location
          </label>

          <input
            id="location"
            className="input"
            value={location}
            onChange={(e) =>
              setLocation(
                e.target.value,
              )
            }
            placeholder="Address or area"
          />

          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={
                useMyLocation
              }
              disabled={
                geoStatus ===
                'loading'
              }
              className="btn-ghost py-2.5 text-sm"
            >
              <LocateFixed
                className={`h-4 w-4 ${
                  geoStatus ===
                  'loading'
                    ? 'animate-spin'
                    : ''
                }`}
              />

              {geoStatus ===
              'loading'
                ? 'Finding Location...'
                : 'Use My Location'}
            </button>

            {geoStatus ===
              'ok' && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                <MapPin className="h-3.5 w-3.5" />

                Location found
              </span>
            )}

            {geoStatus ===
              'error' && (
              <span className="flex items-center gap-1.5 text-xs text-emergency-400">
                <AlertCircle className="h-3.5 w-3.5" />

                Location unavailable
              </span>
            )}
          </div>

          {coords && (
            <div className="mt-2 rounded-lg border border-navy-700 bg-navy-900 px-3 py-2 font-mono text-[10px] text-secondary-500">
              GPS: {coords.lat.toFixed(6)},{' '}
              {coords.lng.toFixed(6)}
            </div>
          )}
        </div>

        {/* ==================================================
            DESCRIPTION
        ================================================== */}

        <div>
          <label
            className="label"
            htmlFor="desc"
          >
            Description (Optional)
          </label>

          <textarea
            id="desc"
            className="input min-h-[88px] resize-y"
            value={description}
            onChange={(e) =>
              setDescription(
                e.target.value,
              )
            }
            placeholder="Describe what is happening (optional)"
          />
        </div>

        {/* ==================================================
            IMAGE UPLOAD
        ================================================== */}

        <div>
          <label className="label">
            Image (Optional)
          </label>

          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/jpg"
            onChange={handleFile}
            className="hidden"
          />

          {!imageData ? (
            <button
              type="button"
              onClick={() =>
                fileRef.current?.click()
              }
              className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-navy-700 bg-navy-800 p-6 text-secondary-400 transition hover:border-accent-500 hover:text-white"
            >
              <ImagePlus className="h-8 w-8" />

              <span className="text-sm font-medium">
                Tap to upload an image
              </span>

              <span className="text-xs text-secondary-400">
                JPG, JPEG or PNG · from camera or gallery
              </span>
            </button>
          ) : (
            <div className="space-y-3">
              <div className="relative overflow-hidden rounded-xl border border-navy-700">
                <img
                  src={imageData}
                  alt="Incident preview"
                  className="h-48 w-full object-cover sm:h-56"
                />

                <button
                  type="button"
                  onClick={
                    removeImage
                  }
                  className="absolute right-2 top-2 rounded-lg bg-navy-900 p-1.5 text-white backdrop-blur hover:bg-emergency-600"
                  aria-label="Remove image"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-center justify-between gap-2 rounded-lg bg-navy-800 px-3 py-2">
                <span className="flex min-w-0 items-center gap-2 text-xs text-secondary-400">
                  <Upload className="h-3.5 w-3.5 shrink-0 text-secondary-400" />

                  <span className="truncate">
                    {imageName ||
                      'Selected image'}
                  </span>
                </span>

                <button
                  type="button"
                  onClick={() =>
                    fileRef.current?.click()
                  }
                  className="shrink-0 text-xs font-semibold text-secondary-400 hover:text-white hover:underline"
                >
                  Change
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ==================================================
            ERROR
        ================================================== */}

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-emergency-500/30 bg-emergency-600/10 p-3 text-sm text-emergency-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

            <span>{error}</span>
          </div>
        )}

        {/* ==================================================
            SUBMIT
        ================================================== */}

        <button
          type="submit"
          disabled={submitting}
          className="btn-danger w-full py-4 text-base disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Siren className="h-5 w-5" />

          {submitting
            ? 'Reporting...'
            : 'REPORT EMERGENCY'}
        </button>

        <p className="text-center text-[10px] leading-relaxed text-secondary-500">
          Your name and phone number are collected only as part of this emergency report. No account registration is required.
        </p>
      </form>
    </div>
  );
}

// ============================================================
// INFO BOX
// ============================================================

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-navy-700 bg-navy-800 p-3">
      <div className="text-xs uppercase tracking-wider text-secondary-400">
        {label}
      </div>

      <div className="mt-0.5 text-sm font-semibold text-white">
        {value}
      </div>
    </div>
  );
}

// ============================================================
// DETECTION STYLES
// ============================================================

const DETECTION_STYLES: Record<
  EmergencyDetection,
  string
> = {
  'EMERGENCY DETECTED':
    'bg-emergency-600/20 text-emergency-300 border border-emergency-500/40',

  'NO CLEAR EMERGENCY':
    'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',

  UNCERTAIN:
    'bg-amber-500/15 text-amber-300 border border-amber-500/30',

  'POSSIBLE EMERGENCY':
    'bg-amber-500/15 text-amber-300 border border-amber-500/30',

  'HIGH-CONFIDENCE EMERGENCY':
    'bg-emergency-600/25 text-emergency-300 border border-emergency-500/50',
};

// ============================================================
// DETECTION LABEL
// ============================================================

function DetectionLabel({
  value,
}: {
  value: EmergencyDetection;
}) {
  return (
    <span
      className={`badge ${
        DETECTION_STYLES[value]
      }`}
    >
      {value}
    </span>
  );
}