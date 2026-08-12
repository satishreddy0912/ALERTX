import { useEffect, useState } from 'react';
import type { Incident, Responder, IncidentStatus, TimelineStage, AuditEntry, IncidentSource, EmergencyDetection } from '@/types';
import { analyzeIncident, generateIncidentId, initialTimeline, recommendedResponderType, assessCredibility } from '@/lib/ai';

const INCIDENTS_KEY = 'erai_incidents_v3';
const RESPONDERS_KEY = 'erai_responders_v1';

// Prototype automatic escalation timer. For hackathon demo only.
export const ESCALATION_TIMEOUT_MS = 20000;

const SEED_INCIDENTS: Incident[] = [
  {
    id: 'ER-2041',
    type: 'Road Accident',
    name: 'Arjun Patel',
    phone: '9876543210',
    location: 'Banjara Hills, Hyderabad',
    description: 'Two-car collision at signal junction.',
    imageData: null,
    severity: 'HIGH',
    priority: 78,
    aiSummary: 'Vehicle collision reported. Traffic response and medical units advised.',
    recommendedResponse: 'Medical Response + Traffic Response',
    credibility: { score: 82, level: 'HIGH CREDIBILITY', reasons: ['Location data available', 'Description provided', 'Consistent information across fields'] },
    status: 'RESPONDING',
    createdAt: Date.now() - 1000 * 60 * 14,
    assignedResponderId: 'r1',
    acceptedBy: 'R-101',
    acceptedByName: 'Cmdr. Arjun Patel',
    assignedByAdminId: 'A-001',
    assignedByAdminName: 'Admin A-001',
    timeline: buildTimeline(4),
    audit: buildAudit('ER-2041', 4, 'R-101', 'Cmdr. Arjun Patel', 'A-001', 'Admin A-001'),
    coords: { lat: 17.4126, lng: 78.4402 },
    source: 'user_report',
    escalated: false,
    reporterSafe: false,
    emergencyDetection: 'EMERGENCY DETECTED' as EmergencyDetection,
    confidence: 89,
    reason: 'Vehicle collision indicators suggest a significant road accident.',
  },
  {
    id: 'ER-2042',
    type: 'Fire',
    name: 'Sneha Rao',
    phone: '9988776655',
    location: 'Kondapur Industrial Area, Hyderabad',
    description: 'Smoke visible from warehouse roof.',
    imageData: null,
    severity: 'CRITICAL',
    priority: 91,
    aiSummary: 'Active fire reported. Fire & Rescue dispatch recommended immediately.',
    recommendedResponse: 'Fire & Rescue',
    credibility: { score: 88, level: 'HIGH CREDIBILITY', reasons: ['Location data available', 'Description provided', 'Consistent information across fields'] },
    status: 'ASSIGNED',
    createdAt: Date.now() - 1000 * 60 * 6,
    assignedResponderId: 'r2',
    acceptedBy: 'R-102',
    acceptedByName: 'Capt. Sneha Rao',
    assignedByAdminId: 'A-001',
    assignedByAdminName: 'Admin A-001',
    timeline: buildTimeline(3),
    audit: buildAudit('ER-2042', 3, 'R-102', 'Capt. Sneha Rao', 'A-001', 'Admin A-001'),
    coords: { lat: 17.4916, lng: 78.3877 },
    source: 'user_report',
    escalated: false,
    reporterSafe: false,
    emergencyDetection: 'EMERGENCY DETECTED' as EmergencyDetection,
    confidence: 92,
    reason: 'Fire-related indicators and urgent description suggest an active fire emergency.',
  },
  {
    id: 'ER-2043',
    type: 'Medical Emergency',
    name: 'Vikram Singh',
    phone: '9090909090',
    location: 'Madhapur, Hyderabad',
    description: '',
    imageData: null,
    severity: 'MEDIUM',
    priority: 52,
    aiSummary: 'Medical emergency reported. Ambulance dispatch recommended.',
    recommendedResponse: 'Medical Response',
    credibility: { score: 50, level: 'MEDIUM CREDIBILITY', reasons: ['Location data available', 'No photo evidence', 'No description provided'] },
    status: 'VERIFICATION_REQUIRED',
    createdAt: Date.now() - 1000 * 60 * 2,
    assignedResponderId: null,
    acceptedBy: null,
    acceptedByName: null,
    timeline: buildTimeline(3),
    audit: buildAudit('ER-2043', 3),
    coords: { lat: 17.4483, lng: 78.3841 },
    source: 'user_report',
    escalated: false,
    reporterSafe: false,
    emergencyDetection: 'UNCERTAIN' as EmergencyDetection,
    confidence: 48,
    reason: 'The available information does not provide enough evidence to confidently determine whether an emergency is occurring.',
  },
];
const SEED_RESPONDERS: Responder[] = [
  {
    id: 'r1',
    name: 'Medic Alpha-1',
    type: 'Medical Response',
    location: 'Jubilee Hills, Hyderabad',
    status: 'Responding',
    assignedIncidentId: 'ER-2041',
    coords: {
      lat: 17.4239,
      lng: 78.4738,
    },
  },
  {
    id: 'r2',
    name: 'Fire Unit Bravo-2',
    type: 'Fire & Rescue',
    location: 'Kondapur, Hyderabad',
    status: 'Busy',
    assignedIncidentId: 'ER-2042',
    coords: {
      lat: 17.4697,
      lng: 78.3728,
    },
  },
  {
    id: 'r3',
    name: 'Urban Rescue Gamma-3',
    type: 'Urban Rescue',
    location: 'Begumpet, Hyderabad',
    status: 'Available',
    assignedIncidentId: null,
    coords: {
      lat: 17.4447,
      lng: 78.4666,
    },
  },
  {
    id: 'r4',
    name: 'Traffic Delta-4',
    type: 'Traffic Response',
    location: 'Gachibowli, Hyderabad',
    status: 'Available',
    assignedIncidentId: null,
    coords: {
      lat: 17.4401,
      lng: 78.3489,
    },
  },
  {
    id: 'r5',
    name: 'Medic Alpha-5',
    type: 'Medical Response',
    location: 'Hitech City, Hyderabad',
    status: 'Offline',
    assignedIncidentId: null,
    coords: {
      lat: 17.4483,
      lng: 78.3915,
    },
  },
];
function buildTimeline(reachedCount: number): Incident['timeline'] {
  const now = Date.now();
  const stages: TimelineStage[] = ['Reported', 'AI Analyzed', 'Responder Alerted', 'Responder Assigned', 'Responding', 'Resolved'];
  return stages.map((stage, i) => ({
    stage,
    timestamp: i < reachedCount ? now - (reachedCount - i) * 60000 : 0,
    reached: i < reachedCount,
  }));
}

function buildAudit(id: string, reachedCount: number, responderId?: string, responderName?: string, adminId?: string, adminName?: string): AuditEntry[] {
  const now = Date.now();
  const events: { name: string; ts: number }[] = [
    { name: 'Emergency reported', ts: now - 120000 },
    { name: 'AI analysis completed', ts: now - 119000 },
    { name: 'Admin notified', ts: now - 118000 },
  ];
  if (adminId && reachedCount >= 3) events.push({ name: `Incident verified by ${adminId}`, ts: now - 117000 });
  if (adminId && reachedCount >= 4) events.push({ name: `Responder ${responderId || 'R-???'} assigned by ${adminId}`, ts: now - 61000 });
  if (reachedCount >= 4) events.push({ name: `Accepted by ${responderId || 'R-???'}`, ts: now - 60000 });
  if (reachedCount >= 5) events.push({ name: 'Responder responding', ts: now - 30000 });
  if (reachedCount >= 6) events.push({ name: 'Incident resolved', ts: now });
  return events.map((e, i) => ({
    id: `${id}-a${i}`,
    event: e.name,
    timestamp: e.ts,
    responderId,
    responderName,
    adminId: i >= 3 && i <= 4 ? adminId : undefined,
    adminName: i >= 3 && i <= 4 ? adminName : undefined,
  }));
}

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota */
  }
}

export interface ResponderSession {
  id: string;
  name: string;
  unit: string;
}

export interface AdminSession {
  id: string;
  name: string;
}

export interface CreateIncidentInput {
  type: Incident['type'];
  name: string;
  phone: string;
  location: string;
  description: string;
  imageData: string | null;
  coords: { lat: number; lng: number } | null;
  simLevel?: string;
  sensorConfidence?: number;
  sensorEventType?: string;
}

export function useStore() {
  const [incidents, setIncidents] = useState<Incident[]>(() => load(INCIDENTS_KEY, SEED_INCIDENTS));
  const [responders, setResponders] = useState<Responder[]>(() => load(RESPONDERS_KEY, SEED_RESPONDERS));

  useEffect(() => save(INCIDENTS_KEY, incidents), [incidents]);
  useEffect(() => save(RESPONDERS_KEY, responders), [responders]);

  // Cross-tab sync
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === INCIDENTS_KEY && e.newValue) {
        try { setIncidents(JSON.parse(e.newValue) as Incident[]); } catch { /* ignore */ }
      }
      if (e.key === RESPONDERS_KEY && e.newValue) {
        try { setResponders(JSON.parse(e.newValue) as Responder[]); } catch { /* ignore */ }
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Polling fallback for same-tab detection
  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const raw = localStorage.getItem(INCIDENTS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Incident[];
          setIncidents((prev) => (prev.length === parsed.length && prev[0]?.id === parsed[0]?.id ? prev : parsed));
        }
      } catch { /* ignore */ }
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  // Prototype automatic escalation timer for urgent critical incidents
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setIncidents((prev) =>
        prev.map((inc) => {
          if (
            !inc.escalated &&
            (inc.status === 'NEW' || inc.status === 'VERIFIED') &&
            (inc.severity === 'CRITICAL' || inc.urgent) &&
            now - inc.createdAt >= ESCALATION_TIMEOUT_MS
          ) {
            const timeline = inc.timeline.map((t) => ({ ...t }));
            const audit = [...inc.audit, {
              id: `${inc.id}-esc`,
              event: 'Prototype automatic escalation — no admin/responder acted in time',
              timestamp: now,
            } as AuditEntry];
            return { ...inc, status: 'ESCALATED' as IncidentStatus, escalated: true, timeline, audit };
          }
          return inc;
        })
      );
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  function addIncident(data: CreateIncidentInput, source: IncidentSource = 'user_report'): Incident {
    const analysis = analyzeIncident({
      type: data.type,
      description: data.description,
      imageData: data.imageData,
      hasLocation: !!data.location,
      hasCoords: !!data.coords,
      source,
      simLevel: data.simLevel,
      sensorConfidence: data.sensorConfidence,
      sensorEventType: data.sensorEventType,
    });
    const recentCount = incidents.filter(
      (i) => i.name === data.name && i.phone === data.phone && Date.now() - i.createdAt < 600000
    ).length;
    const credibility = assessCredibility(
      data.type,
      data.description,
      !!data.imageData,
      !!data.location,
      !!data.coords,
      source,
      recentCount
    );
    const now = Date.now();
    const id = generateIncidentId();
    const needsVerification = analysis.emergencyDetection !== 'EMERGENCY DETECTED' && analysis.emergencyDetection !== 'HIGH-CONFIDENCE EMERGENCY' || credibility.level === 'VERIFICATION REQUIRED';
    const initialStatus: IncidentStatus = needsVerification ? 'VERIFICATION_REQUIRED' : 'NEW';
    const isUrgent = source === 'fast_sos' || (source === 'mobile_sensor' && (data.sensorConfidence ?? 0) >= 0.75);
    const incident: Incident = {
      ...data,
      ...analysis,
      credibility,
      id,
      status: initialStatus,
      createdAt: now,
      assignedResponderId: null,
      acceptedBy: null,
      acceptedByName: null,
      assignedByAdminId: null,
      assignedByAdminName: null,
      timeline: initialTimeline(),
      audit: [
        { id: `${id}-a0`, event: 'Emergency reported', timestamp: now },
        { id: `${id}-a1`, event: 'AI analysis completed', timestamp: now + 1 },
        { id: `${id}-a2`, event: 'Admin notified', timestamp: now + 2 },
        ...(initialStatus === 'VERIFICATION_REQUIRED' ? [{ id: `${id}-a3`, event: `Flagged for verification — ${analysis.emergencyDetection === 'NO CLEAR EMERGENCY' ? 'no clear emergency detected' : 'uncertain / low credibility'}`, timestamp: now + 3 }] as AuditEntry[] : []),
        ...(isUrgent ? [{ id: `${id}-urg`, event: 'Marked URGENT — fast emergency path', timestamp: now + 4 }] as AuditEntry[] : []),
      ],
      source,
      simLevel: data.simLevel,
      escalated: false,
      reporterSafe: false,
      emergencyDetection: analysis.emergencyDetection,
      confidence: analysis.confidence,
      reason: analysis.reason,
      sensorConfidence: data.sensorConfidence,
      sensorEventType: data.sensorEventType,
      urgent: isUrgent,
    };
    setIncidents((prev) => [incident, ...prev]);
    return incident;
  }

  function appendAudit(inc: Incident, entry: Omit<AuditEntry, 'id' | 'timestamp'> & { timestamp?: number }): AuditEntry[] {
    return [...inc.audit, { id: `${inc.id}-a${inc.audit.length}`, timestamp: entry.timestamp ?? Date.now(), ...entry }];
  }

  function setIncidentStatus(id: string, status: IncidentStatus) {
    setIncidents((prev) =>
      prev.map((inc) => {
        if (inc.id !== id) return inc;
        const timeline = inc.timeline.map((t) => ({ ...t }));
        if (status === 'ASSIGNED') markStage(timeline, 'Responder Assigned');
        if (status === 'RESPONDING') {
          markStage(timeline, 'Responder Assigned');
          markStage(timeline, 'Responding');
        }
        if (status === 'RESOLVED') {
          markStage(timeline, 'Responder Assigned');
          markStage(timeline, 'Responding');
          markStage(timeline, 'Resolved');
        }
        return { ...inc, status, timeline };
      })
    );
  }

  // --- Admin actions ---

  function adminVerifyIncident(incidentId: string, admin: AdminSession) {
    setIncidents((prev) =>
      prev.map((inc) => {
        if (inc.id !== incidentId) return inc;
        return {
          ...inc,
          status: 'VERIFIED' as IncidentStatus,
          audit: appendAudit(inc, { event: `Incident verified by ${admin.id}`, adminId: admin.id, adminName: admin.name }),
        };
      })
    );
  }

  function adminAssignResponder(incidentId: string, responderId: string, admin: AdminSession) {
    setResponders((prev) =>
      prev.map((r) => {
        if (r.id === responderId) return { ...r, status: 'Responding', assignedIncidentId: incidentId };
        if (r.assignedIncidentId === incidentId) return { ...r, status: 'Available', assignedIncidentId: null };
        return r;
      })
    );
    setIncidents((prev) =>
      prev.map((inc) => {
        if (inc.id !== incidentId) return inc;
        const timeline = inc.timeline.map((t) => ({ ...t }));
        markStage(timeline, 'Responder Assigned');
        return {
          ...inc,
          assignedResponderId: responderId,
          assignedByAdminId: admin.id,
          assignedByAdminName: admin.name,
          status: 'ASSIGNED' as IncidentStatus,
          timeline,
          audit: appendAudit(inc, { event: `Responder ${responderId} assigned by ${admin.id}`, adminId: admin.id, adminName: admin.name }),
        };
      })
    );
  }

  function adminEscalateIncident(incidentId: string, admin: AdminSession) {
    setIncidents((prev) =>
      prev.map((inc) => {
        if (inc.id !== incidentId) return inc;
        return {
          ...inc,
          status: 'ESCALATED' as IncidentStatus,
          escalated: true,
          audit: appendAudit(inc, { event: `Incident escalated by ${admin.id}`, adminId: admin.id, adminName: admin.name }),
        };
      })
    );
  }

  function adminMarkSuspicious(incidentId: string, admin: AdminSession) {
    setIncidents((prev) =>
      prev.map((inc) => {
        if (inc.id !== incidentId) return inc;
        return {
          ...inc,
          status: 'SUSPICIOUS' as IncidentStatus,
          audit: appendAudit(inc, { event: `Incident marked suspicious by ${admin.id}`, adminId: admin.id, adminName: admin.name }),
        };
      })
    );
  }

  function adminCloseIncident(incidentId: string, admin: AdminSession) {
    setIncidents((prev) =>
      prev.map((inc) => {
        if (inc.id !== incidentId) return inc;
        const timeline = inc.timeline.map((t) => ({ ...t }));
        markStage(timeline, 'Resolved');
        return {
          ...inc,
          status: 'RESOLVED' as IncidentStatus,
          timeline,
          audit: appendAudit(inc, { event: `Incident closed by ${admin.id}`, adminId: admin.id, adminName: admin.name }),
        };
      })
    );
  }

  // --- Responder actions (unchanged from existing) ---

  function assignResponder(incidentId: string, responderId: string | null, session?: ResponderSession | null) {
    setResponders((prev) =>
      prev.map((r) => {
        if (r.id === responderId) return { ...r, status: 'Responding', assignedIncidentId: incidentId };
        if (r.assignedIncidentId === incidentId) return { ...r, status: 'Available', assignedIncidentId: null };
        return r;
      })
    );
    setIncidents((prev) =>
      prev.map((inc) => {
        if (inc.id !== incidentId) return inc;
        const timeline = inc.timeline.map((t) => ({ ...t }));
        markStage(timeline, 'Responder Assigned');
        const audit = appendAudit(inc, {
          event: `Accepted by ${session?.id || responderId || 'R-???'}`,
          responderId: session?.id || undefined,
          responderName: session?.name || undefined,
        });
        return {
          ...inc,
          assignedResponderId: responderId,
          acceptedBy: session?.id || inc.acceptedBy,
          acceptedByName: session?.name || inc.acceptedByName,
          status: (responderId ? 'ASSIGNED' : inc.status) as IncidentStatus,
          timeline,
          audit,
        };
      })
    );
  }

  function autoAssignResponder(incidentId: string, session?: ResponderSession | null) {
    const incident = incidents.find((i) => i.id === incidentId);
    if (!incident || incident.assignedResponderId) return;
    const preferredType = recommendedResponderType(incident.type);
    const candidate =
      responders.find((r) => r.type === preferredType && r.status === 'Available') ||
      responders.find((r) => r.status === 'Available');
    if (candidate) assignResponder(incidentId, candidate.id, session);
  }

  function markResponding(incidentId: string, session?: ResponderSession | null) {
    const inc = incidents.find((i) => i.id === incidentId);
    setIncidentStatus(incidentId, 'RESPONDING');
    if (inc?.assignedResponderId) {
      setResponders((prev) => prev.map((r) => (r.id === inc.assignedResponderId ? { ...r, status: 'Responding' } : r)));
    }
    setIncidents((prev) =>
      prev.map((i) => {
        if (i.id !== incidentId) return i;
        return { ...i, audit: appendAudit(i, { event: 'Status set to Responding', responderId: session?.id, responderName: session?.name }) };
      })
    );
  }

  function resolveIncident(incidentId: string, session?: ResponderSession | null) {
    const inc = incidents.find((i) => i.id === incidentId);
    setIncidentStatus(incidentId, 'RESOLVED');
    if (inc?.assignedResponderId) {
      setResponders((prev) => prev.map((r) => (r.id === inc.assignedResponderId ? { ...r, status: 'Available', assignedIncidentId: null } : r)));
    }
    setIncidents((prev) =>
      prev.map((i) => {
        if (i.id !== incidentId) return i;
        return { ...i, audit: appendAudit(i, { event: 'Incident resolved', responderId: session?.id, responderName: session?.name }) };
      })
    );
  }

  function markReporterSafe(incidentId: string) {
    setIncidents((prev) =>
      prev.map((i) => {
        if (i.id !== incidentId) return i;
        return { ...i, reporterSafe: true, audit: appendAudit(i, { event: 'Reporter marked themselves SAFE' }) };
      })
    );
  }

  function rejectIncident(incidentId: string, session?: ResponderSession | null) {
    setIncidents((prev) =>
      prev.map((i) => {
        if (i.id !== incidentId) return i;
        return {
          ...i,
          status: 'RESOLVED' as IncidentStatus,
          audit: appendAudit(i, { event: 'Report rejected/closed after verification review', responderId: session?.id, responderName: session?.name }),
        };
      })
    );
  }

  return {
    incidents,
    responders,
    addIncident,
    setIncidentStatus,
    assignResponder,
    autoAssignResponder,
    markResponding,
    resolveIncident,
    markReporterSafe,
    rejectIncident,
    adminVerifyIncident,
    adminAssignResponder,
    adminEscalateIncident,
    adminMarkSuspicious,
    adminCloseIncident,
  };
}

function markStage(timeline: { stage: TimelineStage; timestamp: number; reached: boolean }[], stage: TimelineStage) {
  const idx = timeline.findIndex((t) => t.stage === stage);
  if (idx >= 0 && !timeline[idx].reached) {
    timeline[idx] = { stage, timestamp: Date.now(), reached: true };
  }
}
