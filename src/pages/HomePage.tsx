import { useEffect, useState } from 'react';
import {
  Siren,
  LayoutDashboard,
  Zap,
  Brain,
  ArrowRight,
  UserRound,
  Phone,
  X,
  ShieldCheck,
} from 'lucide-react';
import type { ViewKey } from '@/types';

interface EmergencyContact {
  id: string;
  name: string;
  relation: string;
  phone: string;
}

interface UserProfile {
  name: string;
  phone: string;
  contacts: EmergencyContact[];
}

interface Props {
  onNavigate: (v: ViewKey) => void;
}

const PROFILE_STORAGE_KEY = 'alertx_user_profile';
const CONTACTS_STORAGE_KEY = 'alertx_emergency_contacts';

export function HomePage({ onNavigate }: Props) {
  const [showStartPopup, setShowStartPopup] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');

  const [contactName, setContactName] = useState('');
  const [contactRelation, setContactRelation] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [profileSaved, setProfileSaved] = useState(false);

  useEffect(() => {
    try {
      const profile = localStorage.getItem(PROFILE_STORAGE_KEY);

      if (profile) {
        const parsed = JSON.parse(profile) as UserProfile;

        setProfileName(parsed.name || '');
        setProfilePhone(parsed.phone || '');
        setProfileSaved(true);
      }

      const storedContacts = localStorage.getItem(
        CONTACTS_STORAGE_KEY,
      );

      if (storedContacts) {
        const parsed = JSON.parse(storedContacts);

        if (Array.isArray(parsed)) {
          setContacts(parsed);
        }
      }

      // Show the start popup only if profile isn't configured.
      if (!profile) {
        setShowStartPopup(true);
      }
    } catch {
      setShowStartPopup(true);
    }
  }, []);

  function saveContacts(nextContacts: EmergencyContact[]) {
    setContacts(nextContacts);

    localStorage.setItem(
      CONTACTS_STORAGE_KEY,
      JSON.stringify(nextContacts),
    );
  }

  function addContact() {
    const name = contactName.trim();
    const relation = contactRelation.trim();
    const phone = contactPhone.trim();

    if (!name || !relation || !phone) {
      return;
    }

    const newContact: EmergencyContact = {
      id: `EC-${Date.now()}`,
      name,
      relation,
      phone,
    };

    saveContacts([...contacts, newContact]);

    setContactName('');
    setContactRelation('');
    setContactPhone('');
  }

  function removeContact(id: string) {
    saveContacts(
      contacts.filter((contact) => contact.id !== id),
    );
  }

  function saveProfile() {
    const name = profileName.trim();
    const phone = profilePhone.trim();

    if (!name || !phone) {
      return;
    }

    const profile: UserProfile = {
      name,
      phone,
      contacts,
    };

    localStorage.setItem(
      PROFILE_STORAGE_KEY,
      JSON.stringify(profile),
    );

    localStorage.setItem(
      CONTACTS_STORAGE_KEY,
      JSON.stringify(contacts),
    );

    setProfileSaved(true);
    setShowProfile(false);
    setShowStartPopup(false);
  }

  function openReport() {
    setShowStartPopup(false);
    onNavigate('report');
  }

  function openProfile() {
    setShowStartPopup(false);
    setShowProfile(true);
  }

  return (
    <div className="space-y-8">

      {/* ───────────────── HERO ───────────────── */}

      <section className="relative overflow-hidden rounded-3xl border border-navy-700 bg-gradient-to-br from-accent-600 to-accent-800 p-6 sm:p-10">

        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-emergency-600/20 blur-3xl" />

        <div className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-navy-900 blur-3xl" />

        <div className="relative">

          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emergency-500/30 bg-emergency-600/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emergency-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emergency-400" />
            AI-Assisted Prototype
          </div>

          <h1 className="max-w-2xl text-3xl font-bold leading-tight text-white sm:text-4xl md:text-5xl">
            Alert<span className="text-secondary-400">X</span>
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-relaxed text-secondary-400 sm:text-base">
            An AI-assisted emergency reporting and responder coordination
            prototype. Report incidents, get instant AI severity analysis,
            and coordinate responders in real time.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">

            <button
              onClick={openReport}
              className="btn-danger flex items-center justify-center gap-2 px-5 py-3 text-sm sm:text-base"
            >
              <Siren className="h-5 w-5" />
              Report an Emergency
            </button>

            <button
              onClick={openProfile}
              className="flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
            >
              <UserRound className="h-5 w-5" />

              {profileSaved
                ? 'Edit My Profile'
                : 'Set Up My Profile'}
            </button>

          </div>

        </div>
      </section>

      {/* ───────────────── PROFILE STATUS ───────────────── */}

      {profileSaved && (
        <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
            </div>

            <div className="flex-1">
              <p className="text-sm font-bold text-white">
                Profile Ready
              </p>

              <p className="text-xs text-secondary-400">
                {profileName} · {profilePhone}
                {contacts.length > 0 &&
                  ` · ${contacts.length} emergency contact${
                    contacts.length > 1 ? 's' : ''
                  }`}
              </p>
            </div>

            <button
              onClick={openProfile}
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300"
            >
              Edit
            </button>

          </div>

        </section>
      )}

      {/* ───────────────── AI STATUS ───────────────── */}

      <section className="grid grid-cols-1 gap-3 sm:gap-4">

        <StatCard
          label="AI Analysis"
          value="Live"
          icon={Brain}
          color="text-indigo-400"
        />

      </section>

      {/* ───────────────── FLOW ───────────────── */}

      <section>

        <h2 className="mb-4 text-lg font-bold text-white">
          How it works
        </h2>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

          <FlowCard
            step="01"
            title="Emergency Reporting"
            desc="Citizens can quickly report an emergency with location and supporting information."
            icon={Siren}
            onClick={openReport}
          />

          <FlowCard
            step="02"
            title="AI Analysis"
            desc="The AI layer analyzes type, severity, priority score and recommends the right response unit."
            icon={Brain}
            onClick={() => onNavigate('incidents')}
          />

          <FlowCard
            step="03"
            title="Responder Coordination"
            desc="Responders get instant alerts, accept incidents, and update status through resolution."
            icon={LayoutDashboard}
            onClick={() => onNavigate('dashboard')}
          />

        </div>

      </section>

      {/* ───────────────── LIFECYCLE ───────────────── */}

      <section className="card p-5 sm:p-6">

        <h2 className="mb-4 text-lg font-bold text-white">
          Incident lifecycle
        </h2>

        <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">

          {[
            'NEW',
            'ASSIGNED',
            'RESPONDING',
            'RESOLVED',
          ].map((s, i, arr) => (

            <div
              key={s}
              className="flex items-center gap-2"
            >

              <span className="rounded-lg border border-navy-700 bg-navy-800 px-3 py-1.5 font-semibold text-secondary-400">
                {s}
              </span>

              {i < arr.length - 1 && (
                <ArrowRight className="h-4 w-4 text-secondary-400" />
              )}

            </div>

          ))}

        </div>

        <p className="mt-4 text-xs text-secondary-400">
          This is a prototype demonstrating how AI can assist emergency
          reporting and responder coordination. It is not connected to
          real emergency services.
        </p>

      </section>

      {/* ───────────────── ADMIN ───────────────── */}

      <footer className="flex justify-center pb-4">

        <button
          onClick={() => onNavigate('admin_login')}
          className="text-xs font-medium text-secondary-400 transition hover:text-white"
        >
          Admin Centre
        </button>

      </footer>

      {/* ========================================================= */}
      {/* START POPUP                                               */}
      {/* ========================================================= */}

      {showStartPopup && (

        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">

          <div className="relative w-full max-w-md rounded-3xl border border-navy-700 bg-navy-900 p-6 shadow-2xl">

            <button
              onClick={() => setShowStartPopup(false)}
              className="absolute right-4 top-4 text-secondary-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-500/10">
              <Siren className="h-7 w-7 text-accent-400" />
            </div>

            <h2 className="mt-5 text-center text-2xl font-black text-white">
              Welcome to AlertX
            </h2>

            <p className="mt-2 text-center text-sm leading-relaxed text-secondary-400">
              Set up your profile for faster emergency reporting,
              or report an emergency immediately.
            </p>

            <div className="mt-6 space-y-3">

              <button
                onClick={openProfile}
                className="flex w-full items-center gap-4 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4 text-left transition hover:bg-cyan-500/20"
              >

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/10">
                  <UserRound className="h-5 w-5 text-cyan-400" />
                </div>

                <div>
                  <p className="font-bold text-white">
                    Set Up My Profile
                  </p>

                  <p className="mt-1 text-xs text-secondary-400">
                    Add your details and emergency contacts.
                  </p>
                </div>

              </button>

              <button
                onClick={openReport}
                className="flex w-full items-center gap-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-left transition hover:bg-red-500/20"
              >

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10">
                  <Siren className="h-5 w-5 text-red-400" />
                </div>

                <div>
                  <p className="font-bold text-white">
                    Report Emergency Now
                  </p>

                  <p className="mt-1 text-xs text-secondary-400">
                    Skip profile setup and report immediately.
                  </p>
                </div>

              </button>

            </div>

          </div>

        </div>

      )}

      {/* ========================================================= */}
      {/* PROFILE SETUP                                             */}
      {/* ========================================================= */}

      {showProfile && (

        <div className="fixed inset-0 z-[95] flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">

          <div className="relative my-8 w-full max-w-lg rounded-3xl border border-navy-700 bg-navy-900 p-6 shadow-2xl">

            <button
              onClick={() => setShowProfile(false)}
              className="absolute right-4 top-4 text-secondary-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3">

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10">
                <UserRound className="h-6 w-6 text-cyan-400" />
              </div>

              <div>
                <h2 className="text-xl font-black text-white">
                  Set Up Your Profile
                </h2>

                <p className="text-xs text-secondary-400">
                  This makes future emergency reporting faster.
                </p>
              </div>

            </div>

            {/* USER DETAILS */}

            <div className="mt-6 space-y-3">

              <input
                value={profileName}
                onChange={(e) =>
                  setProfileName(e.target.value)
                }
                placeholder="Your full name"
                className="w-full rounded-xl border border-navy-700 bg-navy-800 px-4 py-3 text-sm text-white outline-none placeholder:text-secondary-500 focus:border-cyan-500"
              />

              <input
                value={profilePhone}
                onChange={(e) =>
                  setProfilePhone(e.target.value)
                }
                placeholder="+91 XXXXX XXXXX"
                type="tel"
                className="w-full rounded-xl border border-navy-700 bg-navy-800 px-4 py-3 text-sm text-white outline-none placeholder:text-secondary-500 focus:border-cyan-500"
              />

            </div>

            {/* CONTACTS */}

            <div className="mt-6">

              <div className="flex items-center gap-2">

                <ShieldCheck className="h-5 w-5 text-emerald-400" />

                <h3 className="font-bold text-white">
                  Emergency Contacts
                </h3>

              </div>

              <p className="mt-1 text-xs text-secondary-400">
                These people can be contacted by the emergency
                response team if an emergency is reported.
              </p>

              {/* EXISTING CONTACTS */}

              {contacts.length > 0 && (

                <div className="mt-3 space-y-2">

                  {contacts.map((contact) => (

                    <div
                      key={contact.id}
                      className="flex items-center gap-3 rounded-xl border border-navy-700 bg-navy-800 p-3"
                    >

                      <UserRound className="h-4 w-4 text-secondary-400" />

                      <div className="min-w-0 flex-1">

                        <p className="text-sm font-bold text-white">
                          {contact.name}
                        </p>

                        <p className="text-[11px] text-secondary-400">
                          {contact.relation} · {contact.phone}
                        </p>

                      </div>

                      <button
                        onClick={() =>
                          removeContact(contact.id)
                        }
                        className="text-red-400 hover:text-red-300"
                      >
                        <X className="h-4 w-4" />
                      </button>

                    </div>

                  ))}

                </div>

              )}

              {/* ADD CONTACT */}

              <div className="mt-3 rounded-xl border border-navy-700 bg-navy-950 p-3">

                <div className="grid gap-2 sm:grid-cols-3">

                  <input
                    value={contactName}
                    onChange={(e) =>
                      setContactName(e.target.value)
                    }
                    placeholder="Name"
                    className="rounded-lg border border-navy-700 bg-navy-800 px-3 py-2 text-sm text-white outline-none placeholder:text-secondary-500 focus:border-cyan-500"
                  />

                  <input
                    value={contactRelation}
                    onChange={(e) =>
                      setContactRelation(e.target.value)
                    }
                    placeholder="Relation"
                    className="rounded-lg border border-navy-700 bg-navy-800 px-3 py-2 text-sm text-white outline-none placeholder:text-secondary-500 focus:border-cyan-500"
                  />

                  <input
                    value={contactPhone}
                    onChange={(e) =>
                      setContactPhone(e.target.value)
                    }
                    placeholder="Phone"
                    type="tel"
                    className="rounded-lg border border-navy-700 bg-navy-800 px-3 py-2 text-sm text-white outline-none placeholder:text-secondary-500 focus:border-cyan-500"
                  />

                </div>

                <button
                  onClick={addContact}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-cyan-500"
                >
                  <Phone className="h-4 w-4" />
                  Add Emergency Contact
                </button>

              </div>

            </div>

            {/* SAVE */}

            <button
              onClick={saveProfile}
              disabled={
                !profileName.trim() ||
                !profilePhone.trim()
              }
              className="mt-6 w-full rounded-xl bg-emerald-600 px-4 py-3 font-bold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Save Profile
            </button>

            <button
              onClick={openReport}
              className="mt-2 w-full rounded-xl border border-navy-700 px-4 py-3 text-sm font-semibold text-secondary-300 hover:bg-navy-800 hover:text-white"
            >
              Skip & Report Emergency
            </button>

          </div>

        </div>

      )}

    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number | string;
  icon: typeof Brain;
  color: string;
}) {
  return (
    <div className="card p-4">

      <div className="flex items-center justify-between">

        <span className="text-xs font-medium uppercase tracking-wider text-secondary-400">
          {label}
        </span>

        <Icon className={`h-4 w-4 ${color}`} />

      </div>

      <div className="mt-2 text-2xl font-bold text-white">
        {value}
      </div>

    </div>
  );
}

function FlowCard({
  step,
  title,
  desc,
  icon: Icon,
  onClick,
}: {
  step: string;
  title: string;
  desc: string;
  icon: typeof Siren;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="card group p-5 text-left transition hover:border-accent-500 hover:bg-navy-800"
    >

      <div className="mb-3 flex items-center justify-between">

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-900 text-secondary-400">
          <Icon className="h-5 w-5" />
        </div>

        <span className="text-xs font-bold text-secondary-400">
          {step}
        </span>

      </div>

      <h3 className="text-base font-bold text-white">
        {title}
      </h3>

      <p className="mt-1.5 text-sm leading-relaxed text-secondary-400">
        {desc}
      </p>

      <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-secondary-400 opacity-0 transition group-hover:opacity-100">
        <Zap className="h-3.5 w-3.5" />
        Open
      </div>

    </button>
  );
}