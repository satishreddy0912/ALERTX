export type EmergencyType = 'Road Accident' | 'Medical Emergency' | 'Fire' | 'Other';

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type EmergencyDetection = 'EMERGENCY DETECTED' | 'NO CLEAR EMERGENCY' | 'UNCERTAIN' | 'POSSIBLE EMERGENCY' | 'HIGH-CONFIDENCE EMERGENCY';

export type IncidentStatus =
  | 'NEW'
  | 'ASSIGNED'
  | 'RESPONDING'
  | 'RESOLVED'
  | 'ESCALATED'
  | 'VERIFICATION_REQUIRED'
  | 'VERIFIED'
  | 'SUSPICIOUS';

export type IncidentSource = 'user_report' | 'mobile_sensor' | 'simulator' | 'fast_sos';

export type ResponderType = 'Medical Response' | 'Fire & Rescue' | 'Urban Rescue' | 'Traffic Response';

export type ResponderStatus = 'Available' | 'Responding' | 'Busy' | 'Offline';

export type TimelineStage = 'Reported' | 'AI Analyzed' | 'Responder Alerted' | 'Responder Assigned' | 'Responding' | 'Resolved';

export type CredibilityLevel = 'HIGH CREDIBILITY' | 'MEDIUM CREDIBILITY' | 'LOW CREDIBILITY' | 'VERIFICATION REQUIRED';

export interface CredibilityAssessment {
  score: number;
  level: CredibilityLevel;
  reasons: string[];
}

export interface TimelineEntry {
  stage: TimelineStage;
  timestamp: number;
  reached: boolean;
}

export interface AuditEntry {
  id: string;
  event: string;
  timestamp: number;
  responderId?: string;
  responderName?: string;
  adminId?: string;
  adminName?: string;
  detail?: string;
}

export interface SensorReading {
  accelerationMagnitude: number;
  rotationMagnitude: number;
  timestamp: number;
  ax?: number;
  ay?: number;
  az?: number;
  rx?: number;
  ry?: number;
  rz?: number;
}

export interface LiveSensorValues {
  ax: number;
  ay: number;
  az: number;
  rx: number;
  ry: number;
  rz: number;
  accelerationMagnitude: number;
  rotationMagnitude: number;
  active: boolean;
}

export type DetectionState = 'MONITORING' | 'NORMAL_MOVEMENT' | 'ANALYZING' | 'POSSIBLE_ACCIDENT';

export interface SensorDetectionResult {
  detected: boolean;
  confidence: number;
  eventType: 'NONE' | 'POSSIBLE_FALL' | 'POSSIBLE_IMPACT' | 'POSSIBLE_COLLISION' | 'TRANSIENT_MOTION';
  reason: string;
  highConfidence: boolean;
  detectionState: DetectionState;
}

export interface Incident {
  id: string;
  type: EmergencyType;
  name: string;
  phone: string;
  location: string;
  description: string;
  imageData: string | null;
  severity: Severity;
  priority: number;
  aiSummary: string;
  recommendedResponse: string;
  credibility: CredibilityAssessment;
  status: IncidentStatus;
  createdAt: number;
  assignedResponderId: string | null;
  acceptedBy: string | null;
  acceptedByName: string | null;
  assignedByAdminId?: string | null;
  assignedByAdminName?: string | null;
  timeline: TimelineEntry[];
  audit: AuditEntry[];
  coords: { lat: number; lng: number } | null;
  source: IncidentSource;
  simLevel?: string;
  escalated: boolean;
  reporterSafe: boolean;
  emergencyDetection: EmergencyDetection;
  confidence: number;
  reason: string;
  sensorConfidence?: number;
  sensorEventType?: string;
  urgent?: boolean;
}

export interface Responder {
  id: string;
  name: string;
  type: ResponderType;
  location: string;
  status: ResponderStatus;
  assignedIncidentId: string | null;
}

export interface ResponderAccount {
  id: string;
  email: string;
  password: string;
  name: string;
  unit: string;
}

export interface AdminAccount {
  id: string;
  email: string;
  password: string;
  name: string;
}

export type ViewKey =
  | 'home'
  | 'report'
  | 'simulator'
  | 'dashboard'
  | 'incidents'
  | 'responders'
  | 'about'
  | 'login'
  | 'admin_login'
  | 'admin'
  | 'admin_incident';
