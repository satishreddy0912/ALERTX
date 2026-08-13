export interface EmergencyContact {
  id: string;
  name: string;
  relation: string;
  phone: string;
}

export interface EmergencyProfile {
  name: string;
  phone: string;
  contacts: EmergencyContact[];
}

export const EMERGENCY_CONTACTS_STORAGE_KEY =
  'alertx_emergency_contacts';

export const EMERGENCY_PROFILE_STORAGE_KEY =
  'alertx_emergency_profile';

export const EMERGENCY_PROFILE_SETUP_KEY =
  'alertx_emergency_profile_setup_complete';

export function getEmergencyContacts(): EmergencyContact[] {
  try {
    const stored = localStorage.getItem(
      EMERGENCY_CONTACTS_STORAGE_KEY,
    );

    if (!stored) {
      return [];
    }

    const parsed: unknown = JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (item): item is EmergencyContact => {
        if (
          typeof item !== 'object' ||
          item === null
        ) {
          return false;
        }

        const contact =
          item as Record<string, unknown>;

        return (
          typeof contact.id === 'string' &&
          typeof contact.name === 'string' &&
          typeof contact.relation === 'string' &&
          typeof contact.phone === 'string'
        );
      },
    );
  } catch {
    return [];
  }
}

export function saveEmergencyContacts(
  contacts: EmergencyContact[],
): void {
  localStorage.setItem(
    EMERGENCY_CONTACTS_STORAGE_KEY,
    JSON.stringify(contacts),
  );
}

export function getEmergencyProfile(): EmergencyProfile | null {
  try {
    const stored = localStorage.getItem(
      EMERGENCY_PROFILE_STORAGE_KEY,
    );

    if (!stored) {
      return null;
    }

    const parsed: unknown = JSON.parse(stored);

    if (
      typeof parsed !== 'object' ||
      parsed === null
    ) {
      return null;
    }

    const profile =
      parsed as Record<string, unknown>;

    const contacts = Array.isArray(
      profile.contacts,
    )
      ? profile.contacts.filter(
          (item): item is EmergencyContact => {
            if (
              typeof item !== 'object' ||
              item === null
            ) {
              return false;
            }

            const contact =
              item as Record<string, unknown>;

            return (
              typeof contact.id === 'string' &&
              typeof contact.name === 'string' &&
              typeof contact.relation === 'string' &&
              typeof contact.phone === 'string'
            );
          },
        )
      : [];

    if (
      typeof profile.name !== 'string' ||
      typeof profile.phone !== 'string'
    ) {
      return null;
    }

    return {
      name: profile.name,
      phone: profile.phone,
      contacts,
    };
  } catch {
    return null;
  }
}

export function saveEmergencyProfile(
  profile: EmergencyProfile,
): void {
  localStorage.setItem(
    EMERGENCY_PROFILE_STORAGE_KEY,
    JSON.stringify(profile),
  );

  saveEmergencyContacts(profile.contacts);
}

export function hasCompletedEmergencyProfileSetup(): boolean {
  try {
    return (
      localStorage.getItem(
        EMERGENCY_PROFILE_SETUP_KEY,
      ) === '1'
    );
  } catch {
    return false;
  }
}

export function markEmergencyProfileSetupComplete(): void {
  localStorage.setItem(
    EMERGENCY_PROFILE_SETUP_KEY,
    '1',
  );
}

export function resetEmergencyProfileSetup(): void {
  localStorage.removeItem(
    EMERGENCY_PROFILE_SETUP_KEY,
  );
}

export function getPrimaryEmergencyContact(): EmergencyContact | null {
  const contacts = getEmergencyContacts();

  return contacts.length > 0
    ? contacts[0]
    : null;
}