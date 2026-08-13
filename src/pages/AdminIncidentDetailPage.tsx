import { useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  Polyline,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import {
  ArrowLeft,
  Siren,
  MapPin,
  Clock,
  User,
  Phone,
  Brain,
  ShieldCheck,
  CheckCircle2,
  Activity,
  FileText,
  Ambulance,
  AlertTriangle,
  Ban,
  X,
  Navigation,
  Heart,
  ShieldAlert,
} from 'lucide-react';

import type {
  Incident,
  Responder,
  IncidentSource,
} from '@/types';

import {
  SeverityBadge,
  StatusBadge,
  PriorityScore,
} from '@/components/Badges';

import { AuditTrail } from '@/components/Timeline';
import {
  formatTime,
  formatRelative,
} from '@/lib/format';

interface Props {
  incident: Incident | undefined;
  responders: Responder[];
  adminSession?: unknown;
  onBack: () => void;
  onVerify: (id: string) => void;
  onAssign: (id: string, responderId: string) => void;
  onEscalate: (id: string) => void;
  onMarkSuspicious: (id: string) => void;
  onClose: (id: string) => void;
}

/* =========================================================
   MAP ICONS
   ========================================================= */

const accidentIcon = L.divIcon({
  className: 'custom-map-marker',
  html: `
    <div style="
      width:42px;
      height:42px;
      border-radius:50%;
      background:#dc2626;
      border:4px solid rgba(248,113,113,.35);
      display:flex;
      align-items:center;
      justify-content:center;
      box-shadow:0 0 20px rgba(239,68,68,.7);
      color:white;
      font-size:20px;
    ">
      🚨
    </div>
  `,
  iconSize: [42, 42],
  iconAnchor: [21, 21],
});

const ambulanceIcon = L.divIcon({
  className: 'custom-map-marker',
  html: `
    <div style="
      width:34px;
      height:34px;
      border-radius:50%;
      background:#0284c7;
      border:3px solid rgba(125,211,252,.5);
      display:flex;
      align-items:center;
      justify-content:center;
      box-shadow:0 0 14px rgba(14,165,233,.5);
      color:white;
      font-size:16px;
    ">
      🚑
    </div>
  `,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

const hospitalIcon = L.divIcon({
  className: 'custom-map-marker',
  html: `
    <div style="
      width:34px;
      height:34px;
      border-radius:50%;
      background:#059669;
      border:3px solid rgba(110,231,183,.5);
      display:flex;
      align-items:center;
      justify-content:center;
      box-shadow:0 0 14px rgba(16,185,129,.5);
      color:white;
      font-size:16px;
    ">
      🏥
    </div>
  `,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

/* =========================================================
   SOURCE LABELS
   ========================================================= */

const SOURCE_LABELS: Record<
  IncidentSource,
  string
> = {
  user_report: 'USER REPORTED',
  mobile_sensor: 'MOBILE SENSOR',
  simulator: 'SIMULATOR',
  fast_sos: 'FAST SOS',
};

/* =========================================================
   MAIN COMPONENT
   ========================================================= */

export function AdminIncidentDetailPage({
  incident,
  responders,
  onBack,
  onVerify,
  onAssign,
  onEscalate,
  onMarkSuspicious,
  onClose,
}: Props) {
  const [showAssign, setShowAssign] =
    useState(false);

  /* -------------------------------------------------------
     INCIDENT NOT FOUND
     ------------------------------------------------------- */

  if (!incident) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm text-secondary-400">
          Incident not found.
        </p>

        <button
          onClick={onBack}
          className="btn-ghost mt-4 px-4 py-2 text-sm"
        >
          Go back
        </button>
      </div>
    );
  }

  /* -------------------------------------------------------
     RESPONDER LOGIC
     ------------------------------------------------------- */

  const assignedResponder =
    responders.find(
      (responder) =>
        responder.id ===
        incident.assignedResponderId
    ) || null;

  const availableResponders =
    responders.filter(
      (responder) =>
        responder.status === 'Available'
    );

  /* -------------------------------------------------------
     ACTION PERMISSIONS
     ------------------------------------------------------- */

  const canVerify =
    incident.status === 'NEW' ||
    incident.status ===
      'VERIFICATION_REQUIRED';

  const canAssign =
    incident.status === 'VERIFIED' ||
    incident.status === 'NEW' ||
    incident.status === 'ESCALATED';

  const canEscalate =
    incident.status !== 'RESOLVED' &&
    incident.status !== 'SUSPICIOUS' &&
    incident.status !== 'ESCALATED';

  const canClose =
    incident.status !== 'RESOLVED' &&
    incident.status !== 'SUSPICIOUS';

  const canMarkSuspicious =
    incident.status !== 'RESOLVED' &&
    incident.status !== 'SUSPICIOUS';

  /* -------------------------------------------------------
     MAP COORDINATES
     ------------------------------------------------------- */

  const incidentLat =
    incident.coords?.lat ?? 17.385;

  const incidentLng =
    incident.coords?.lng ?? 78.4867;

  /*
   * Responder does not necessarily contain coords.
   * Therefore demo positions are generated around
   * the incident location.
   */

  const getResponderPosition = (
    index: number
  ): [number, number] => {
    const positions: [number, number][] = [
      [
        incidentLat + 0.008,
        incidentLng + 0.010,
      ],
      [
        incidentLat - 0.006,
        incidentLng + 0.012,
      ],
      [
        incidentLat + 0.010,
        incidentLng - 0.007,
      ],
      [
        incidentLat - 0.009,
        incidentLng - 0.006,
      ],
      [
        incidentLat + 0.004,
        incidentLng - 0.012,
      ],
    ];

    return positions[
      index % positions.length
    ];
  };

  return (
    <div className="space-y-5">

      {/* =====================================================
          BACK BUTTON
          ===================================================== */}

      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-secondary-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Control Center
      </button>

      {/* =====================================================
          INCIDENT HEADER
          ===================================================== */}

      <div className="card overflow-hidden">

        <div className="flex items-center justify-between bg-gradient-to-r from-accent-600 to-accent-800 px-4 py-3 sm:px-5">

          <div className="flex items-center gap-2">

            <Siren className="h-5 w-5 text-emergency-400" />

            <span className="font-mono text-sm font-bold text-secondary-400">
              {incident.id}
            </span>

            <span className="badge border border-navy-700 bg-white/5 text-secondary-400">
              {SOURCE_LABELS[incident.source]}
            </span>

          </div>

          <StatusBadge
            status={incident.status}
          />

        </div>

        <div className="p-4 sm:p-5">

          <div className="flex flex-wrap items-center gap-2">

            <h1 className="text-xl font-bold text-white">
              {incident.type}
            </h1>

            <SeverityBadge
              severity={incident.severity}
            />

            {incident.urgent && (
              <span className="badge border border-emergency-500/50 bg-emergency-600/25 text-emergency-300">
                <AlertTriangle className="h-3 w-3" />
                URGENT
              </span>
            )}

            {incident.escalated && (
              <span className="badge border border-emergency-500/50 bg-emergency-600/25 text-emergency-300">
                <AlertTriangle className="h-3 w-3" />
                ESCALATED
              </span>
            )}

            {incident.reporterSafe && (
              <span className="badge border border-emerald-500/30 bg-emerald-500/15 text-emerald-300">
                <Heart className="h-3 w-3" />
                REPORTER SAFE
              </span>
            )}

          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-secondary-400">

            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatRelative(
                incident.createdAt
              )}
            </span>

            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />

              <span className="truncate">
                {incident.location ||
                  'Location unavailable'}
              </span>
            </span>

            <span className="flex items-center gap-1">
              Priority
              <PriorityScore
                score={incident.priority}
              />
            </span>

          </div>

        </div>

      </div>

      {/* =====================================================
          INCIDENT IMAGE
          ===================================================== */}

      {incident.imageData && (
        <div className="card overflow-hidden">
          <img
            src={incident.imageData}
            alt="Incident"
            className="h-56 w-full object-cover sm:h-72"
          />
        </div>
      )}

      {/* =====================================================
          REPORTER INFORMATION
          ===================================================== */}

      <div className="card p-4 sm:p-5">

        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-secondary-400">
          Reporter
        </h2>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

          <InfoRow
            icon={User}
            label="Name"
            value={
              incident.name ||
              'Anonymous'
            }
          />

          <InfoRow
            icon={Phone}
            label="Phone"
            value={
              incident.phone ||
              'Not provided'
            }
          />

        </div>

      </div>

      {/* =====================================================
          DESCRIPTION
          ===================================================== */}

      <div className="card p-4 sm:p-5">

        <h2 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-secondary-400">
          <FileText className="h-4 w-4" />
          Description
        </h2>

        <p className="text-sm leading-relaxed text-secondary-400">
          {incident.description ||
            'No description provided.'}
        </p>

      </div>

      {/* =====================================================
          AI ANALYSIS
          ===================================================== */}

      <div className="card border-navy-700 bg-gradient-to-br from-navy-900 to-navy-950 p-4 sm:p-5">

        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-secondary-400">
          <Brain className="h-4 w-4" />
          AI Analysis
        </h2>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">

          <Info
            label="Severity"
            value={incident.severity}
          />

          <Info
            label="Priority"
            value={`${incident.priority}/100`}
          />

          <Info
            label="Credibility"
            value={`${incident.credibility.score}%`}
          />

          <Info
            label="Confidence"
            value={`${incident.confidence}%`}
          />

          <Info
            label="Detection"
            value={
              incident.emergencyDetection
            }
          />

          <Info
            label="Recommended"
            value={
              incident.recommendedResponse
            }
          />

        </div>

        <div className="mt-3 rounded-lg border border-navy-700 bg-navy-950/50 p-3 text-sm leading-relaxed text-secondary-400">
          {incident.aiSummary}
        </div>

        <div className="mt-2 rounded-lg border border-navy-700 bg-navy-950/50 p-3 text-sm text-secondary-400">

          <div className="mb-1 text-xs uppercase tracking-wider text-secondary-400">
            Reason
          </div>

          {incident.reason}

        </div>

        {incident.sensorConfidence !==
          undefined && (
          <div className="mt-2 flex items-center gap-2 rounded-lg bg-navy-900 p-3 text-sm text-secondary-400">

            <Activity className="h-4 w-4 shrink-0" />

            <span>
              Sensor confidence:{' '}
              <span className="font-mono font-semibold">
                {Math.round(
                  incident.sensorConfidence *
                    100
                )}
                %
              </span>

              {' · '}

              {incident.sensorEventType?.replace(
                'POSSIBLE_',
                'Possible '
              ) ||
                'Unknown event'}
            </span>

          </div>
        )}

      </div>

      {/* =====================================================
          RESPONSE INTELLIGENCE
          ===================================================== */}

      <div className="card p-4 sm:p-5">

        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-secondary-400">
          <Navigation className="h-4 w-4" />
          Response Intelligence
        </h2>

        <div className="space-y-2.5">

          <Row
            label="Source"
            value={
              SOURCE_LABELS[
                incident.source
              ]
            }
          />

          <Row
            label="Emergency Detection"
            value={
              incident.emergencyDetection
            }
          />

          <Row
            label="Severity"
            value={incident.severity}
          />

          <Row
            label="Confidence"
            value={`${incident.confidence}%`}
          />

          <Row
            label="Credibility"
            value={`${incident.credibility.score}% — ${incident.credibility.level.replace(
              ' CREDIBILITY',
              ''
            )}`}
          />

          <Row
            label="Priority"
            value={`${incident.priority}/100`}
          />

          <Row
            label="Recommended Response"
            value={
              incident.recommendedResponse
            }
          />

        </div>

      </div>

      {/* =====================================================
          LIVE INCIDENT COMMAND CENTER
          ===================================================== */}

      <div className="card overflow-hidden">

        <div className="border-b border-navy-700 bg-gradient-to-r from-navy-900 to-navy-950 px-4 py-3 sm:px-5">

          <div className="flex items-center justify-between">

            <div>

              <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white">

                <Navigation className="h-4 w-4 text-emergency-400" />

                Live Incident Command Center

              </h2>

              <p className="mt-1 text-xs text-secondary-400">
                Accident location and nearby emergency resources
              </p>

            </div>

            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
              LIVE
            </span>

          </div>

        </div>

        <div className="h-[420px] w-full">

          <MapContainer
            center={[
              incidentLat,
              incidentLng,
            ]}
            zoom={14}
            scrollWheelZoom={true}
            className="h-full w-full"
          >

            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Accident location */}

            <Marker
              position={[
                incidentLat,
                incidentLng,
              ]}
              icon={accidentIcon}
            >

              <Popup>

                <strong>
                  🚨 Accident Spot
                </strong>

                <br />

                {incident.location ||
                  'Location unavailable'}

              </Popup>

            </Marker>

            {/* Emergency radius */}

            <Circle
              center={[
                incidentLat,
                incidentLng,
              ]}
              radius={1000}
              pathOptions={{
                color: '#ef4444',
                fillColor: '#ef4444',
                fillOpacity: 0.08,
              }}
            />

            {/* Available responders */}

            {availableResponders.map(
              (responder, index) => {

                const [
                  responderLat,
                  responderLng,
                ] =
                  getResponderPosition(
                    index
                  );

                const distance =
                  calculateDistance(
                    incidentLat,
                    incidentLng,
                    responderLat,
                    responderLng
                  );

                const eta = Math.max(
                  2,
                  Math.round(
                    distance * 3
                  )
                );

                return (
                  <Marker
                    key={responder.id}
                    position={[
                      responderLat,
                      responderLng,
                    ]}
                    icon={ambulanceIcon}
                  >

                    <Popup>

                      <div className="min-w-[180px]">

                        <div className="font-bold">
                          🚑 {responder.name}
                        </div>

                        <div className="text-sm">
                          {responder.type}
                        </div>

                        <div className="mt-1 text-sm">
                          📍 {responder.location}
                        </div>

                        <div className="mt-1 text-sm">
                          📏{' '}
                          {distance.toFixed(
                            1
                          )}{' '}
                          km away
                        </div>

                        <div className="text-sm">
                          ⏱️ ETA: {eta} min
                        </div>

                      </div>

                    </Popup>

                  </Marker>
                );
              }
            )}

            {/* Nearest hospital */}

            <Marker
              position={[
                incidentLat + 0.012,
                incidentLng - 0.008,
              ]}
              icon={hospitalIcon}
            >

              <Popup>

                <strong>
                  🏥 Nearest Hospital
                </strong>

                <br />

                Approx. 3.4 km

              </Popup>

            </Marker>

            {/* Accident → Hospital route */}

            <Polyline
              positions={[
                [
                  incidentLat,
                  incidentLng,
                ],
                [
                  incidentLat + 0.012,
                  incidentLng - 0.008,
                ],
              ]}
              pathOptions={{
                color: '#10b981',
                weight: 3,
                dashArray: '8 8',
              }}
            />

          </MapContainer>

        </div>

        {/* Map information */}

        <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4">

          <div className="rounded-lg border border-navy-700 bg-navy-900 p-3">

            <div className="text-[9px] uppercase tracking-wider text-secondary-400">
              Accident
            </div>

            <div className="mt-1 text-xs font-bold text-emergency-300">
              ACTIVE
            </div>

          </div>

          <div className="rounded-lg border border-navy-700 bg-navy-900 p-3">

            <div className="text-[9px] uppercase tracking-wider text-secondary-400">
              Hospital
            </div>

            <div className="mt-1 text-xs font-bold text-emerald-300">
              3.4 km
            </div>

          </div>

          <div className="rounded-lg border border-navy-700 bg-navy-900 p-3">

            <div className="text-[9px] uppercase tracking-wider text-secondary-400">
              Responders
            </div>

            <div className="mt-1 text-xs font-bold text-sky-300">
              {
                availableResponders.length
              }{' '}
              Available
            </div>

          </div>

          <div className="rounded-lg border border-navy-700 bg-navy-900 p-3">

            <div className="text-[9px] uppercase tracking-wider text-secondary-400">
              Status
            </div>

            <div className="mt-1 text-xs font-bold text-white">
              LIVE
            </div>

          </div>

        </div>

      </div>

      {/* =====================================================
          ASSIGNED RESPONDER
          ===================================================== */}

      <div className="card p-4 sm:p-5">

        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-secondary-400">

          <ShieldAlert className="h-4 w-4" />

          Assigned Responder

        </h2>

        {assignedResponder ? (

          <div className="rounded-xl border border-navy-700 bg-navy-800 p-3">

            <div className="text-sm font-bold text-white">
              {assignedResponder.name}
            </div>

            <div className="text-xs text-secondary-400">
              {assignedResponder.type}
            </div>

            <div className="mt-1 flex items-center gap-1 text-xs text-secondary-400">

              <MapPin className="h-3.5 w-3.5" />

              {assignedResponder.location}

            </div>

            {incident.assignedByAdminId && (
              <div className="mt-1 text-xs text-secondary-400">
                Assigned by{' '}
                {incident.assignedByAdminId}
                {' · '}
                {incident.assignedByAdminName ||
                  ''}
              </div>
            )}

            {incident.acceptedBy && (
              <div className="mt-1 text-xs text-emerald-400">
                Accepted by{' '}
                {incident.acceptedBy}
                {' · '}
                {incident.acceptedByName ||
                  ''}
              </div>
            )}

          </div>

        ) : (

          <p className="text-sm text-secondary-400">
            No responder assigned yet.
          </p>

        )}

      </div>

      {/* =====================================================
          AUDIT TRAIL
          ===================================================== */}

      <div className="card p-4 sm:p-5">

        <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-secondary-400">

          <Activity className="h-4 w-4" />

          Incident Audit Trail

        </h2>

        <AuditTrail
          entries={incident.audit}
        />

      </div>

      {/* =====================================================
          ADMIN ACTIONS
          ===================================================== */}

      {incident.status !== 'RESOLVED' &&
        incident.status !== 'SUSPICIOUS' && (

          <div className="card p-4 sm:p-5">

            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-secondary-400">

              <ShieldCheck className="h-4 w-4" />

              Admin Actions

            </h2>

            <div className="flex flex-col gap-2.5">

              {canVerify && (
                <button
                  onClick={() =>
                    onVerify(
                      incident.id
                    )
                  }
                  className="btn w-full bg-emerald-600 py-3 text-sm text-white hover:bg-emerald-700"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Verify Incident
                </button>
              )}

              {canAssign && (
                <button
                  onClick={() =>
                    setShowAssign(true)
                  }
                  className="btn-primary w-full py-3 text-sm"
                >
                  <Ambulance className="h-4 w-4" />
                  Assign Responder
                </button>
              )}

              {canEscalate && (
                <button
                  onClick={() =>
                    onEscalate(
                      incident.id
                    )
                  }
                  className="btn w-full bg-emergency-600 py-3 text-sm text-white hover:bg-emergency-700"
                >
                  <AlertTriangle className="h-4 w-4" />
                  Escalate
                </button>
              )}

              {canMarkSuspicious && (
                <button
                  onClick={() =>
                    onMarkSuspicious(
                      incident.id
                    )
                  }
                  className="btn w-full bg-amber-600 py-3 text-sm text-white hover:bg-amber-700"
                >
                  <Ban className="h-4 w-4" />
                  Mark Suspicious
                </button>
              )}

              {canClose && (
                <button
                  onClick={() =>
                    onClose(incident.id)
                  }
                  className="btn w-full bg-slate-700 py-3 text-sm text-secondary-400 hover:bg-slate-600"
                >
                  <X className="h-4 w-4" />
                  Close Incident
                </button>
              )}

            </div>

          </div>
        )}

      {/* =====================================================
          SUSPICIOUS STATUS
          ===================================================== */}

      {incident.status ===
        'SUSPICIOUS' && (

        <div className="card p-4 text-center">

          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm font-semibold text-amber-300">

            This incident has been marked suspicious.

          </div>

        </div>
      )}

      {/* =====================================================
          RESOLVED STATUS
          ===================================================== */}

      {incident.status ===
        'RESOLVED' && (

        <div className="card p-4 text-center">

          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm font-semibold text-emerald-300">

            This incident has been resolved.

          </div>

        </div>
      )}

      {/* =====================================================
          ASSIGNMENT MODAL
          ===================================================== */}

      {showAssign && (

        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center animate-fade-in">

          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-navy-700 bg-navy-800 shadow-2xl animate-pop-in">

            <div className="flex items-center justify-between border-b border-navy-700 px-4 py-3">

              <h3 className="flex items-center gap-2 text-sm font-bold text-white">

                <Ambulance className="h-4 w-4 text-secondary-400" />

                Assign Responder to{' '}
                {incident.id}

              </h3>

              <button
                onClick={() =>
                  setShowAssign(false)
                }
                className="text-secondary-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>

            </div>

            <div className="space-y-2 p-4">

              {availableResponders.length ===
              0 ? (

                <p className="text-center text-sm text-secondary-400">
                  No available responders.
                </p>

              ) : (

                availableResponders.map(
                  (responder) => {

                    const distance =
                      getDemoDistance(
                        responder.id
                      );

                    return (
                      <button
                        key={responder.id}
                        onClick={() => {

                          onAssign(
                            incident.id,
                            responder.id
                          );

                          setShowAssign(
                            false
                          );

                        }}
                        className="flex w-full items-center justify-between gap-2 rounded-lg border border-navy-700 bg-navy-800 px-3 py-2.5 text-left transition hover:border-accent-500 hover:bg-navy-800"
                      >

                        <div className="flex items-center gap-3">

                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-900">

                            <Ambulance className="h-5 w-5 text-secondary-400" />

                          </div>

                          <div>

                            <div className="text-sm font-bold text-white">
                              {responder.id.toUpperCase()}
                            </div>

                            <div className="text-xs text-secondary-400">
                              {responder.type}
                            </div>

                          </div>

                        </div>

                        <div className="text-right">

                          <div className="text-xs font-semibold text-emerald-400">
                            {distance} km
                          </div>

                          <div className="text-[10px] uppercase tracking-wider text-emerald-500">
                            Available
                          </div>

                        </div>

                      </button>
                    );
                  }
                )

              )}

            </div>

          </div>

        </div>

      )}

      {/* =====================================================
          FOOTER
          ===================================================== */}

      <div className="text-center text-xs text-secondary-400">

        Reported at{' '}
        {formatTime(
          incident.createdAt
        )}

        {' · '}

        Source:{' '}
        {
          SOURCE_LABELS[
            incident.source
          ]
        }

      </div>

    </div>
  );
}

/* =========================================================
   INFO ROW
   ========================================================= */

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">

      <Icon className="h-4 w-4 shrink-0 text-secondary-400" />

      <div className="min-w-0">

        <div className="text-xs text-secondary-400">
          {label}
        </div>

        <div className="truncate text-sm text-secondary-400">
          {value}
        </div>

      </div>

    </div>
  );
}

/* =========================================================
   INFO BOX
   ========================================================= */

function Info({
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

/* =========================================================
   ROW
   ========================================================= */

function Row({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-navy-700 pb-2 last:border-0 last:pb-0">

      <span className="shrink-0 text-xs text-secondary-400">
        {label}
      </span>

      <span className="text-right text-sm font-semibold text-secondary-400">
        {value}
      </span>

    </div>
  );
}

/* =========================================================
   DISTANCE CALCULATION
   ========================================================= */

function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;

  const dLat =
    ((lat2 - lat1) * Math.PI) / 180;

  const dLng =
    ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(
      (lat1 * Math.PI) / 180
    ) *
      Math.cos(
        (lat2 * Math.PI) / 180
      ) *
      Math.sin(dLng / 2) ** 2;

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return R * c;
}

/* =========================================================
   DEMO DISTANCE FOR ASSIGNMENT MODAL
   ========================================================= */

function getDemoDistance(
  id: string
): string {
  const number =
    Number(
      id.replace(/\D/g, '')
    ) || 1;

  return (
    1.5 +
    (number % 4) * 0.7
  ).toFixed(1);
}