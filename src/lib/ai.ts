import type { EmergencyType, ResponderType, Severity, TimelineEntry, CredibilityAssessment, CredibilityLevel, EmergencyDetection, IncidentSource } from '@/types';

const RESPONSE_MAP: Record<EmergencyType, string> = {
  'Road Accident': 'Medical Response + Traffic Response',
  'Medical Emergency': 'Medical Response',
  Fire: 'Fire & Rescue',
  Other: 'Urban Rescue',
};

const URGENCY_WORDS = [
  'critical', 'severe', 'bleeding', 'unconscious', 'trapped', 'fire', 'smoke',
  'crash', 'collision', 'fast', 'help', 'dying', 'casualty', 'casualties',
  'explosion', 'burning', 'collapsed', 'not breathing', 'blood',
];

type SimLevel = 'Normal' | 'Minor Impact' | 'Severe Impact' | 'Critical Impact';

function severityFromPriority(p: number): Severity {
  if (p >= 85) return 'CRITICAL';
  if (p >= 60) return 'HIGH';
  if (p >= 35) return 'MEDIUM';
  return 'LOW';
}

export function generateIncidentId(): string {
  const n = Math.floor(1000 + Math.random() * 9000);
  return `ER-${n}`;
}

export interface AnalysisResult {
  severity: Severity;
  priority: number;
  aiSummary: string;
  recommendedResponse: string;
  emergencyDetection: EmergencyDetection;
  confidence: number;
  reason: string;
}

export interface AnalyzeInput {
  type: EmergencyType;
  description: string;
  imageData: string | null;
  hasLocation: boolean;
  hasCoords: boolean;
  source: IncidentSource;
  simLevel?: string;
  sensorConfidence?: number;
  sensorEventType?: string;
}

/**
 * Prototype AI analysis engine.
 *
 * Severity is NOT derived from a single signal. It combines:
 *   - emergency type (treated as a user REPORT, not proof of an emergency)
 *   - image (presence is NOT severity; content is unknown to the prototype)
 *   - location / coords (context, not severity)
 *   - description keywords (strongest text signal)
 *   - simulator impact level (strong signal when present)
 *
 * Image upload alone, description presence alone, or type selection alone
 * never pushes severity above LOW/MEDIUM. Strong evidence must come from
 * corroborating signals (urgent keywords, simulator severe/critical level,
 * or a fire type with urgent description).
 */
export function analyzeIncident(input: AnalyzeInput): AnalysisResult {
  const { type, description, imageData, hasLocation, hasCoords, source, simLevel, sensorConfidence, sensorEventType } = input;
  const text = (description || '').toLowerCase();
  const hasImage = !!imageData;
  const hasLoc = hasLocation || hasCoords;
  const hasSensor = source === 'mobile_sensor' && typeof sensorConfidence === 'number';

  // --- Evidence scoring -----------------------------------------------------
  let evidence = 0; // -5 .. +60
  const evidenceFactors: string[] = [];

  // Description urgency keywords are the strongest citizen-provided signal.
  const matched = URGENCY_WORDS.filter((w) => text.includes(w));
  if (matched.length > 0) {
    evidence += Math.min(30, matched.length * 8);
    evidenceFactors.push(`urgent keywords (${matched.length})`);
  }

  // Mobile sensor confidence is a strong independent signal when present.
  if (hasSensor && sensorConfidence !== undefined) {
    const sc = sensorConfidence;
    if (sc >= 0.75) { evidence += 40; evidenceFactors.push('high-confidence sensor detection'); }
    else if (sc >= 0.45) { evidence += 22; evidenceFactors.push('medium-confidence sensor detection'); }
    else { evidence += 5; evidenceFactors.push('low-confidence sensor signal'); }
  }

  // Fast SOS is a strong manual signal — the user explicitly triggered it.
  if (source === 'fast_sos') {
    evidence += 35;
    evidenceFactors.push('manual SOS trigger');
  }

  // Simulator impact level is a strong independent signal.
  if (source === 'simulator' && simLevel) {
    const lvl = simLevel as SimLevel;
    if (lvl === 'Critical Impact') { evidence += 45; evidenceFactors.push('simulator critical'); }
    else if (lvl === 'Severe Impact') { evidence += 28; evidenceFactors.push('simulator severe'); }
    else if (lvl === 'Minor Impact') { evidence += 12; evidenceFactors.push('simulator minor'); }
    else { evidence -= 6; evidenceFactors.push('simulator normal'); }
  }

  // Fire type with corroborating description keywords is a strong signal.
  // Fire type alone is only a weak-to-moderate signal (user report).
  if (type === 'Fire') {
    if (matched.length > 0 || source === 'simulator') {
      evidence += 12;
      evidenceFactors.push('fire type + corroboration');
    } else {
      evidence += 6;
      evidenceFactors.push('fire type (reported)');
    }
  }

  // Road Accident / Medical type with corroboration is a moderate signal.
  // Alone, they are weak signals (user report).
  if (type === 'Road Accident' || type === 'Medical Emergency') {
    if (matched.length > 0 || (source === 'simulator' && simLevel && simLevel !== 'Normal')) {
      evidence += 6;
      evidenceFactors.push(`${type.toLowerCase()} + corroboration`);
    } else {
      evidence += 3;
      evidenceFactors.push(`${type.toLowerCase()} (reported)`);
    }
  }

  // Image presence is NOT evidence of severity. It only slightly supports
  // that the reporter was at a scene — content is unknown to the prototype.
  if (hasImage) evidenceFactors.push('image attached (content unverified)');

  // Location is context, not severity.
  if (hasLoc) evidenceFactors.push('location provided');

  // --- Emergency detection --------------------------------------------------
  let emergencyDetection: EmergencyDetection;
  if (hasSensor && sensorConfidence !== undefined && sensorConfidence >= 0.75) {
    emergencyDetection = 'HIGH-CONFIDENCE EMERGENCY';
  } else if (source === 'fast_sos') {
    emergencyDetection = 'EMERGENCY DETECTED';
  } else if (evidence >= 25) {
    emergencyDetection = 'EMERGENCY DETECTED';
  } else if (evidence >= 8) {
    emergencyDetection = 'UNCERTAIN';
  } else {
    emergencyDetection = 'NO CLEAR EMERGENCY';
  }

  // --- Priority -------------------------------------------------------------
  // Base reflects only that a report was filed — low by default.
  let priority = 20;
  // Type selection alone: small bump (it's a report, not proof).
  if (type === 'Fire') priority += 8;
  else if (type === 'Road Accident' || type === 'Medical Emergency') priority += 5;
  else priority += 2;

  // Corroborating evidence drives priority up.
  priority += evidence;

  // Image and location are NOT severity drivers — no priority bump.

  // Fast SOS / high-confidence sensor bumps priority to urgent range.
  if (source === 'fast_sos' || (hasSensor && sensorConfidence !== undefined && sensorConfidence >= 0.75)) {
    priority = Math.max(priority, 85);
  }

  // Small deterministic jitter so identical inputs don't always collide.
  const seed = (type + description).length + Math.floor(Date.now() / 1000) % 97;
  const jitter = (Math.abs(seed) % 9) - 4;
  priority = Math.max(8, Math.min(99, priority + jitter));

  const severity = severityFromPriority(priority);

  // --- Confidence -----------------------------------------------------------
  // Confidence in the analysis. High when evidence is strong and corroborated;
  // low when the only signal is a user-selected type with no corroboration.
  let confidence = 50;
  if (emergencyDetection === 'HIGH-CONFIDENCE EMERGENCY') {
    confidence = Math.min(95, 80 + evidence);
  } else if (emergencyDetection === 'EMERGENCY DETECTED') {
    confidence = Math.min(95, 65 + evidence);
  } else if (emergencyDetection === 'NO CLEAR EMERGENCY') {
    // High confidence that there is NO emergency.
    confidence = Math.max(80, 88 - (hasImage ? 4 : 0));
  } else {
    // UNCERTAIN — genuinely unsure.
    confidence = Math.max(35, Math.min(65, 40 + evidence));
  }
  // Clamp
  confidence = Math.max(15, Math.min(98, confidence));

  // --- Reason ---------------------------------------------------------------
  let reason: string;
  if (emergencyDetection === 'NO CLEAR EMERGENCY') {
    reason = hasImage
      ? 'No obvious emergency indicators were detected in the uploaded image or report.'
      : 'No obvious emergency indicators were detected in the report.';
  } else if (emergencyDetection === 'UNCERTAIN') {
    reason =
      'The available information does not provide enough evidence to confidently determine whether an emergency is occurring.';
  } else {
    const parts: string[] = [];
    if (type === 'Fire') parts.push('fire-related indicators');
    if (type === 'Road Accident') parts.push('vehicle collision indicators');
    if (type === 'Medical Emergency') parts.push('medical emergency indicators');
    if (matched.length > 0) parts.push('urgent description keywords');
    if (source === 'simulator' && simLevel && simLevel !== 'Normal') parts.push(`simulator ${simLevel.toLowerCase()} signal`);
    if (hasSensor && sensorEventType) parts.push(`sensor ${sensorEventType.toLowerCase().replace('possible_', 'possible ')}`);
    if (source === 'fast_sos') parts.push('manual SOS trigger');
    reason = parts.length
      ? `${capitalize(parts[0])}${parts.length > 1 ? ' and ' + parts.slice(1).join(' and ') : ''} suggest ${severity === 'CRITICAL' ? 'a severe, immediately life-threatening' : severity === 'HIGH' ? 'a significant active' : 'a possible'} emergency.`
      : 'Evidence suggests an active emergency.';
  }

  // --- Summary (display) ----------------------------------------------------
  let aiSummary: string;
  if (emergencyDetection === 'HIGH-CONFIDENCE EMERGENCY') {
    aiSummary = buildSummary(type, severity) + ' Sensor confidence is high — fast emergency path activated.';
  } else if (emergencyDetection === 'NO CLEAR EMERGENCY') {
    aiSummary = 'No clear emergency detected from the provided information. Flagged for review — not automatically dispatched as high priority.';
  } else if (emergencyDetection === 'UNCERTAIN') {
    aiSummary = 'Insufficient evidence to confirm an emergency. Flagged for verification before high-priority dispatch.';
  } else {
    aiSummary = buildSummary(type, severity);
  }

  const recommendedResponse = RESPONSE_MAP[type];

  return { severity, priority, aiSummary, recommendedResponse, emergencyDetection, confidence, reason };
}

function buildSummary(type: EmergencyType, severity: Severity): string {
  const base: Record<EmergencyType, string> = {
    'Road Accident': 'Vehicle collision reported. Traffic response and medical units advised.',
    'Medical Emergency': 'Medical emergency reported. Ambulance dispatch recommended.',
    Fire: 'Active fire reported. Fire & Rescue dispatch recommended immediately.',
    Other: 'Emergency reported. Urban Rescue assessment recommended.',
  };
  if (severity === 'CRITICAL') return base[type].replace('recommended', 'recommended immediately — potentially life-threatening');
  return base[type];
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function assessCredibility(
  type: EmergencyType,
  description: string,
  hasImage: boolean,
  hasLocation: boolean,
  hasCoords: boolean,
  source: IncidentSource,
  recentIncidentCount: number
): CredibilityAssessment {
  let score = 50;
  const reasons: string[] = [];

  if (hasImage) {
    score += 14;
    reasons.push('Photo evidence provided');
  } else {
    reasons.push('No photo evidence');
  }

  if (hasLocation || hasCoords) {
    score += 15;
    reasons.push('Location data available');
  } else {
    reasons.push('No location data');
  }

  if (description.trim().length > 0) {
    score += 10;
    reasons.push('Description provided');
  } else {
    reasons.push('No description provided');
  }

  if (source === 'simulator') {
    score += 8;
    reasons.push('Automated detection signal');
  }

  if (source === 'mobile_sensor') {
    score += 10;
    reasons.push('Sensor-detected event');
  }

  if (source === 'fast_sos') {
    score += 12;
    reasons.push('Manual SOS trigger');
  }

  if (recentIncidentCount > 2) {
    score -= 20;
    reasons.push('Multiple recent reports from same source');
  } else if (recentIncidentCount === 2) {
    score -= 8;
    reasons.push('Repeated report pattern detected');
  }

  if (hasImage && hasLocation && description.trim().length > 0) {
    score += 5;
    reasons.push('Consistent information across fields');
  }

  score = Math.max(5, Math.min(99, score));

  let level: CredibilityLevel;
  if (score >= 75) level = 'HIGH CREDIBILITY';
  else if (score >= 45) level = 'MEDIUM CREDIBILITY';
  else if (score >= 25) level = 'LOW CREDIBILITY';
  else level = 'VERIFICATION REQUIRED';

  return { score, level, reasons };
}

export function initialTimeline(): TimelineEntry[] {
  const now = Date.now();
  return [
    { stage: 'Reported', timestamp: now, reached: true },
    { stage: 'AI Analyzed', timestamp: now + 1, reached: true },
    { stage: 'Responder Alerted', timestamp: now + 2, reached: true },
    { stage: 'Responder Assigned', timestamp: 0, reached: false },
    { stage: 'Responding', timestamp: 0, reached: false },
    { stage: 'Resolved', timestamp: 0, reached: false },
  ];
}

export function recommendedResponderType(type: EmergencyType): ResponderType {
  switch (type) {
    case 'Fire':
      return 'Fire & Rescue';
    case 'Medical Emergency':
    case 'Road Accident':
      return 'Medical Response';
    default:
      return 'Urban Rescue';
  }
}
