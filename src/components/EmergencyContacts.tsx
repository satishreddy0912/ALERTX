import { useEffect, useState } from 'react';
import {
  Phone,
  Plus,
  Trash2,
  UserRound,
  ShieldCheck,
} from 'lucide-react';

import {
  EMERGENCY_CONTACTS_STORAGE_KEY,
  type EmergencyContact,
} from '@/lib/emergencyContacts';

interface Props {
  compact?: boolean;
}

export default function EmergencyContacts({
  compact = false,
}: Props) {
  const [contacts, setContacts] = useState<
    EmergencyContact[]
  >([]);

  const [name, setName] = useState('');
  const [relation, setRelation] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(
        EMERGENCY_CONTACTS_STORAGE_KEY,
      );

      if (stored) {
        const parsed = JSON.parse(
          stored,
        ) as EmergencyContact[];

        if (Array.isArray(parsed)) {
          setContacts(parsed);
        }
      }
    } catch {
      setContacts([]);
    }
  }, []);

  const saveContacts = (
    nextContacts: EmergencyContact[],
  ) => {
    setContacts(nextContacts);

    localStorage.setItem(
      EMERGENCY_CONTACTS_STORAGE_KEY,
      JSON.stringify(nextContacts),
    );
  };

  const addContact = () => {
    const trimmedName = name.trim();
    const trimmedRelation = relation.trim();
    const trimmedPhone = phone.trim();

    if (
      !trimmedName ||
      !trimmedRelation ||
      !trimmedPhone
    ) {
      return;
    }

    const newContact: EmergencyContact = {
      id: `EC-${Date.now()}`,
      name: trimmedName,
      relation: trimmedRelation,
      phone: trimmedPhone,
    };

    saveContacts([
      ...contacts,
      newContact,
    ]);

    setName('');
    setRelation('');
    setPhone('');
  };

  const removeContact = (id: string) => {
    saveContacts(
      contacts.filter(
        (contact) => contact.id !== id,
      ),
    );
  };

  return (
    <section
      className={`rounded-2xl border border-navy-700 bg-navy-900 ${
        compact ? 'p-4' : 'p-5'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emergency-500/10">
          <ShieldCheck className="h-5 w-5 text-emergency-400" />
        </div>

        <div>
          <h2 className="font-bold text-white">
            Emergency Contacts
          </h2>

          <p className="mt-1 text-xs leading-relaxed text-secondary-400">
            Add trusted people who can be contacted
            during an emergency. This setup is
            completely separate from Fast SOS.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {contacts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-navy-700 bg-navy-950 p-4 text-center">
            <UserRound className="mx-auto h-6 w-6 text-secondary-500" />

            <p className="mt-2 text-xs font-medium text-secondary-400">
              No emergency contacts added yet.
            </p>

            <p className="mt-1 text-[10px] text-secondary-500">
              You can still use Fast SOS without
              adding contacts.
            </p>
          </div>
        ) : (
          contacts.map((contact) => (
            <div
              key={contact.id}
              className="flex items-center gap-3 rounded-xl border border-navy-700 bg-navy-800 p-3"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy-900">
                <UserRound className="h-4 w-4 text-secondary-400" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-white">
                  {contact.name}
                </div>

                <div className="text-[10px] text-secondary-400">
                  {contact.relation} ·{' '}
                  {contact.phone}
                </div>
              </div>

              <a
                href={`tel:${contact.phone}`}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-500"
                aria-label={`Call ${contact.name}`}
              >
                <Phone className="h-4 w-4" />
              </a>

              <button
                type="button"
                onClick={() =>
                  removeContact(contact.id)
                }
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20"
                aria-label={`Remove ${contact.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 rounded-xl border border-navy-700 bg-navy-950 p-3">
        <div className="mb-3 flex items-center gap-2">
          <Plus className="h-4 w-4 text-cyan-400" />

          <span className="text-xs font-bold uppercase tracking-wider text-white">
            Add Contact
          </span>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <input
            value={name}
            onChange={(event) =>
              setName(event.target.value)
            }
            placeholder="Name"
            className="rounded-lg border border-navy-700 bg-navy-800 px-3 py-2 text-sm text-white outline-none placeholder:text-secondary-500 focus:border-cyan-500"
          />

          <input
            value={relation}
            onChange={(event) =>
              setRelation(event.target.value)
            }
            placeholder="Relation"
            className="rounded-lg border border-navy-700 bg-navy-800 px-3 py-2 text-sm text-white outline-none placeholder:text-secondary-500 focus:border-cyan-500"
          />

          <input
            value={phone}
            onChange={(event) =>
              setPhone(event.target.value)
            }
            placeholder="+91 XXXXX XXXXX"
            type="tel"
            className="rounded-lg border border-navy-700 bg-navy-800 px-3 py-2 text-sm text-white outline-none placeholder:text-secondary-500 focus:border-cyan-500"
          />
        </div>

        <button
          type="button"
          onClick={addContact}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-cyan-500"
        >
          <Plus className="h-4 w-4" />
          Add Emergency Contact
        </button>
      </div>
    </section>
  );
}