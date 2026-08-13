import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Phone,
  ShieldCheck,
  Users,
} from 'lucide-react';

interface EmergencyContact {
  id: string;
  name: string;
  relation: string;
  phone: string;
}

interface Props {
  contacts: EmergencyContact[];
  incidentId: string;
}

export default function FamilyNotificationPanel({
  contacts,
  incidentId,
}: Props) {
  const [calledContacts, setCalledContacts] =
    useState<string[]>([]);

  const allCalled = useMemo(() => {
    return (
      contacts.length > 0 &&
      contacts.every((contact) =>
        calledContacts.includes(contact.id),
      )
    );
  }, [contacts, calledContacts]);

  const markCalled = (id: string) => {
    setCalledContacts((current) => {
      if (current.includes(id)) {
        return current;
      }

      return [...current, id];
    });
  };

  const callContact = (
    contact: EmergencyContact,
  ) => {
    markCalled(contact.id);

    window.location.href = `tel:${contact.phone}`;
  };

  const callAll = () => {
    const firstContact = contacts[0];

    if (!firstContact) {
      return;
    }

    contacts.forEach((contact) => {
      markCalled(contact.id);
    });

    window.location.href = `tel:${firstContact.phone}`;
  };

  return (
    <section className="rounded-2xl border border-purple-500/30 bg-purple-500/5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/10">
            <Users className="h-5 w-5 text-purple-400" />
          </div>

          <div>
            <h3 className="text-sm font-bold text-white">
              Family Notification
            </h3>

            <p className="mt-1 text-[10px] leading-relaxed text-secondary-400">
              Authorized emergency contacts for{' '}
              <span className="font-mono text-secondary-300">
                {incidentId}
              </span>
            </p>
          </div>
        </div>

        {contacts.length > 0 && (
          <button
            type="button"
            onClick={callAll}
            disabled={allCalled}
            className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-2 text-[10px] font-bold text-white hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Phone className="h-3.5 w-3.5" />
            {allCalled ? 'CALLED' : 'CALL ALL'}
          </button>
        )}
      </div>

      {contacts.length === 0 ? (
        <div className="mt-4 rounded-xl border border-navy-700 bg-navy-900 p-4 text-center">
          <ShieldCheck className="mx-auto h-6 w-6 text-secondary-500" />

          <p className="mt-2 text-xs font-bold text-secondary-400">
            No emergency contacts registered
          </p>

          <p className="mt-1 text-[10px] text-secondary-500">
            Continue emergency response normally.
            Family notification is unavailable for
            this incident.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {contacts.map((contact) => {
            const called =
              calledContacts.includes(
                contact.id,
              );

            return (
              <div
                key={contact.id}
                className="flex items-center gap-3 rounded-xl border border-navy-700 bg-navy-900 p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-white">
                    {contact.name}
                  </div>

                  <div className="mt-0.5 text-[10px] text-secondary-400">
                    {contact.relation} ·{' '}
                    {contact.phone}
                  </div>
                </div>

                {called && (
                  <div className="flex items-center gap-1 text-[9px] font-bold uppercase text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Contacted
                  </div>
                )}

                <button
                  type="button"
                  onClick={() =>
                    callContact(contact)
                  }
                  disabled={called}
                  className="flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-[10px] font-bold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-900 disabled:text-emerald-400"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {called ? 'CALLED' : 'CALL'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}