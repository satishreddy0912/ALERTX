import { useEffect, useState } from 'react';
import { User, Phone, MapPin, Save, CheckCircle } from 'lucide-react';

interface ProfileData {
  name: string;
  phone: string;
  emergencyContact: string;
  emergencyContactPhone: string;
  location: string;
}

interface Props {
  onBack?: () => void;
}

const DEFAULT_PROFILE: ProfileData = {
  name: '',
  phone: '',
  emergencyContact: '',
  emergencyContactPhone: '',
  location: '',
};

export function ProfilePage({ onBack }: Props) {
  const [profile, setProfile] = useState<ProfileData>(() => {
    try {
      const saved = localStorage.getItem('alertx_profile');

      if (saved) {
        return {
          ...DEFAULT_PROFILE,
          ...JSON.parse(saved),
        };
      }
    } catch {
      // Ignore invalid local storage data
    }

    return DEFAULT_PROFILE;
  });

  const [saved, setSaved] = useState(false);

  function updateField(
    field: keyof ProfileData,
    value: string,
  ) {
    setProfile((current) => ({
      ...current,
      [field]: value,
    }));

    setSaved(false);
  }

  function handleSave() {
    try {
      localStorage.setItem(
        'alertx_profile',
        JSON.stringify(profile),
      );
    } catch {
      // Ignore storage errors
    }

    setSaved(true);

    window.setTimeout(() => {
      setSaved(false);
    }, 3000);
  }

  useEffect(() => {
    try {
      const savedProfile =
        localStorage.getItem('alertx_profile');

      if (savedProfile) {
        setProfile({
          ...DEFAULT_PROFILE,
          ...JSON.parse(savedProfile),
        });
      }
    } catch {
      // Ignore invalid data
    }
  }, []);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <section className="card p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-600/20">
            <User className="h-7 w-7 text-accent-400" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-white">
              Set Up Your Profile
            </h1>

            <p className="mt-1 text-sm text-secondary-400">
              Add your details so AlertX can use them during an
              emergency.
            </p>
          </div>
        </div>
      </section>

      {/* Personal Information */}
      <section className="card p-6">
        <h2 className="mb-5 text-lg font-bold text-white">
          Personal Information
        </h2>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-secondary-300">
              Full Name
            </label>

            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-500" />

              <input
                type="text"
                value={profile.name}
                onChange={(e) =>
                  updateField('name', e.target.value)
                }
                placeholder="Enter your full name"
                className="w-full rounded-xl border border-navy-700 bg-navy-900 py-3 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-secondary-600 focus:border-accent-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-secondary-300">
              Phone Number
            </label>

            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-500" />

              <input
                type="tel"
                value={profile.phone}
                onChange={(e) =>
                  updateField('phone', e.target.value)
                }
                placeholder="Enter your phone number"
                className="w-full rounded-xl border border-navy-700 bg-navy-900 py-3 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-secondary-600 focus:border-accent-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-secondary-300">
              Current Location
            </label>

            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-500" />

              <input
                type="text"
                value={profile.location}
                onChange={(e) =>
                  updateField('location', e.target.value)
                }
                placeholder="Enter your location"
                className="w-full rounded-xl border border-navy-700 bg-navy-900 py-3 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-secondary-600 focus:border-accent-500"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Emergency Contact */}
      <section className="card p-6">
        <h2 className="mb-2 text-lg font-bold text-white">
          Emergency Contact
        </h2>

        <p className="mb-5 text-sm text-secondary-400">
          Someone AlertX can identify or contact if an emergency
          occurs.
        </p>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-secondary-300">
              Contact Name
            </label>

            <input
              type="text"
              value={profile.emergencyContact}
              onChange={(e) =>
                updateField(
                  'emergencyContact',
                  e.target.value,
                )
              }
              placeholder="Emergency contact name"
              className="w-full rounded-xl border border-navy-700 bg-navy-900 px-4 py-3 text-sm text-white outline-none transition placeholder:text-secondary-600 focus:border-accent-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-secondary-300">
              Contact Phone
            </label>

            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-500" />

              <input
                type="tel"
                value={profile.emergencyContactPhone}
                onChange={(e) =>
                  updateField(
                    'emergencyContactPhone',
                    e.target.value,
                  )
                }
                placeholder="Emergency contact phone"
                className="w-full rounded-xl border border-navy-700 bg-navy-900 py-3 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-secondary-600 focus:border-accent-500"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Save */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={handleSave}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent-600 px-5 py-3 font-semibold text-white transition hover:bg-accent-500"
        >
          {saved ? (
            <>
              <CheckCircle className="h-5 w-5" />
              Profile Saved
            </>
          ) : (
            <>
              <Save className="h-5 w-5" />
              Save Profile
            </>
          )}
        </button>

        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="rounded-xl border border-navy-700 px-5 py-3 font-semibold text-secondary-300 transition hover:border-accent-500 hover:text-white"
          >
            Back
          </button>
        )}
      </div>
    </div>
  );
}