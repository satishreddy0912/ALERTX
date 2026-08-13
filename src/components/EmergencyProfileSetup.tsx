import {
  useState,
} from 'react';

import {
  CheckCircle2,
  Phone,
  ShieldCheck,
  UserRound,
} from 'lucide-react';

import type {
  EmergencyContact,
  EmergencyProfile,
} from '@/lib/emergencyContacts';

interface Props {
  onComplete: (
    profile: EmergencyProfile | null,
  ) => void;
}

export default function EmergencyProfileSetup({
  onComplete,
}: Props) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const [contactName, setContactName] =
    useState('');

  const [contactRelation, setContactRelation] =
    useState('');

  const [contactPhone, setContactPhone] =
    useState('');

  const [error, setError] =
    useState('');

  const [saving, setSaving] =
    useState(false);

  function normalizePhone(
    value: string,
  ): string {
    return value.replace(
      /[^\d+]/g,
      '',
    );
  }

  function isValidPhone(
    value: string,
  ): boolean {
    const normalized =
      normalizePhone(value);

    const digits =
      normalized.replace(/\D/g, '');

    return (
      digits.length >= 10 &&
      digits.length <= 15
    );
  }

  function handleContinue() {
    setError('');

    const trimmedName =
      name.trim();

    const trimmedPhone =
      normalizePhone(phone);

    const trimmedContactName =
      contactName.trim();

    const trimmedRelation =
      contactRelation.trim();

    const trimmedContactPhone =
      normalizePhone(contactPhone);

    if (!trimmedName) {
      setError(
        'Please enter your name.',
      );
      return;
    }

    if (
      !isValidPhone(trimmedPhone)
    ) {
      setError(
        'Please enter a valid phone number.',
      );
      return;
    }

    if (!trimmedContactName) {
      setError(
        'Please enter your emergency contact name.',
      );
      return;
    }

    if (!trimmedRelation) {
      setError(
        'Please enter your relationship with the contact.',
      );
      return;
    }

    if (
      !isValidPhone(
        trimmedContactPhone,
      )
    ) {
      setError(
        'Please enter a valid emergency contact number.',
      );
      return;
    }

    setSaving(true);

    const contact: EmergencyContact =
      {
        id: `EC-${Date.now()}`,
        name: trimmedContactName,
        relation: trimmedRelation,
        phone: trimmedContactPhone,
      };

    const profile: EmergencyProfile =
      {
        name: trimmedName,
        phone: trimmedPhone,
        contacts: [contact],
      };

    try {
      onComplete(profile);
    } finally {
      setSaving(false);
    }
  }

  function handleSkip() {
    setError('');

    onComplete(null);
  }

  return (
    <div className="fixed inset-0 z-[200] flex min-h-screen items-center justify-center overflow-y-auto bg-[#030914] p-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.12),transparent_45%)]" />

      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-navy-700 bg-navy-900 shadow-2xl">
        {/* HEADER */}

        <div className="border-b border-navy-700 bg-gradient-to-r from-navy-900 via-navy-800 to-navy-900 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emergency-500/10">
              <ShieldCheck className="h-6 w-6 text-emergency-400" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white">
                  Set Up AlertX
                </h1>

                <span className="rounded-full bg-cyan-500/10 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-cyan-400">
                  First Setup
                </span>
              </div>

              <p className="mt-1 text-xs leading-relaxed text-secondary-400">
                Add your details and one trusted
                emergency contact. AlertX can use
                this information to help your family
                during a serious emergency.
              </p>
            </div>
          </div>
        </div>

        {/* CONTENT */}

        <div className="space-y-5 p-5 sm:p-6">
          {/* YOUR DETAILS */}

          <div>
            <div className="mb-3 flex items-center gap-2">
              <UserRound className="h-4 w-4 text-cyan-400" />

              <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                Your Details
              </h2>
            </div>

            <div className="space-y-2">
              <input
                value={name}
                onChange={(event) =>
                  setName(
                    event.target.value,
                  )
                }
                placeholder="Your full name"
                autoComplete="name"
                className="w-full rounded-xl border border-navy-700 bg-navy-950 px-4 py-3 text-sm text-white outline-none placeholder:text-secondary-500 focus:border-cyan-500"
              />

              <input
                value={phone}
                onChange={(event) =>
                  setPhone(
                    event.target.value,
                  )
                }
                placeholder="Your phone number"
                type="tel"
                autoComplete="tel"
                className="w-full rounded-xl border border-navy-700 bg-navy-950 px-4 py-3 text-sm text-white outline-none placeholder:text-secondary-500 focus:border-cyan-500"
              />
            </div>
          </div>

          {/* EMERGENCY CONTACT */}

          <div>
            <div className="mb-3 flex items-center gap-2">
              <Phone className="h-4 w-4 text-emergency-400" />

              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                  Emergency Contact
                </h2>

                <p className="mt-0.5 text-[10px] text-secondary-500">
                  Someone AlertX can contact if
                  you need help.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <input
                value={contactName}
                onChange={(event) =>
                  setContactName(
                    event.target.value,
                  )
                }
                placeholder="Contact name"
                autoComplete="name"
                className="w-full rounded-xl border border-navy-700 bg-navy-950 px-4 py-3 text-sm text-white outline-none placeholder:text-secondary-500 focus:border-emergency-500"
              />

              <input
                value={contactRelation}
                onChange={(event) =>
                  setContactRelation(
                    event.target.value,
                  )
                }
                placeholder="Relationship — Father, Mother, Brother..."
                className="w-full rounded-xl border border-navy-700 bg-navy-950 px-4 py-3 text-sm text-white outline-none placeholder:text-secondary-500 focus:border-emergency-500"
              />

              <input
                value={contactPhone}
                onChange={(event) =>
                  setContactPhone(
                    event.target.value,
                  )
                }
                placeholder="+91 XXXXX XXXXX"
                type="tel"
                autoComplete="tel"
                className="w-full rounded-xl border border-navy-700 bg-navy-950 px-4 py-3 text-sm text-white outline-none placeholder:text-secondary-500 focus:border-emergency-500"
              />
            </div>
          </div>

          {/* INFORMATION */}

          <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3">
            <div className="flex gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />

              <p className="text-[11px] leading-relaxed text-secondary-400">
                Fast SOS will remain available even
                if you skip this setup. You can add or
                change emergency contacts later.
              </p>
            </div>
          </div>

          {/* ERROR */}

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-xs font-medium text-red-300">
              {error}
            </div>
          )}

          {/* BUTTONS */}

          <div className="space-y-2">
            <button
              type="button"
              disabled={saving}
              onClick={handleContinue}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emergency-600 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-emergency-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ShieldCheck className="h-4 w-4" />

              {saving
                ? 'Saving...'
                : 'Save & Continue'}
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={handleSkip}
              className="w-full rounded-xl border border-navy-700 bg-navy-800 px-4 py-3 text-sm font-semibold text-secondary-300 transition hover:bg-navy-700 hover:text-white disabled:opacity-60"
            >
              Skip for now — I need to get in quickly
            </button>
          </div>

          <p className="text-center text-[9px] leading-relaxed text-secondary-600">
            You can manage emergency contacts later
            from your AlertX profile/settings.
          </p>
        </div>
      </div>
    </div>
  );
}