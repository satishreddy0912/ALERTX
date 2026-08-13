import { useMemo } from 'react';
import {
  LayoutDashboard,
  Siren,
  MapPin,
  Clock,
  ShieldAlert,
  CheckCircle2,
  Trophy,
  Timer,
  Lock,
  Activity,
  Radio,
  ArrowRight,
} from 'lucide-react';

import type { Incident, Responder } from '@/types';

import {
  SeverityBadge,
  StatusBadge,
  PriorityScore,
} from '@/components/Badges';

import { formatRelative } from '@/lib/format';

interface Props {
  incidents: Incident[];
  responders: Responder[];
  isAuthenticated: boolean;

  session: {
    id: string;
    name: string;
    unit: string;
  } | null;

  onAccept: (id: string) => void;
  onView: (id: string) => void;
  onGoLogin: () => void;
}

/*
|--------------------------------------------------------------------------
| INCIDENT ASSIGNMENT HELPERS
|--------------------------------------------------------------------------
*/

type IncidentWithResponderInfo = Incident & {
  assignedResponderId?: string;
  responderId?: string;
  acceptedBy?: string;
  acceptedResponderId?: string;

  assignedTo?: string;
  assignedResponder?: string;

  acceptedAt?: number | string;
  responseTime?: number;
  responseTimeSeconds?: number;

  resolvedAt?: number | string;
};

function getIncidentResponderId(
  incident: Incident,
): string | null {
  const item = incident as IncidentWithResponderInfo;

  return (
    item.assignedResponderId ??
    item.acceptedResponderId ??
    item.acceptedBy ??
    item.responderId ??
    item.assignedTo ??
    item.assignedResponder ??
    null
  );
}

function getAcceptedTime(
  incident: Incident,
): number | null {
  const item = incident as IncidentWithResponderInfo;

  if (item.acceptedAt === undefined) {
    return null;
  }

  if (typeof item.acceptedAt === 'number') {
    return item.acceptedAt;
  }

  const parsed = new Date(item.acceptedAt).getTime();

  return Number.isNaN(parsed) ? null : parsed;
}

function getResponseTimeSeconds(
  incident: Incident,
): number | null {
  const item = incident as IncidentWithResponderInfo;

  if (
    typeof item.responseTimeSeconds === 'number' &&
    Number.isFinite(item.responseTimeSeconds)
  ) {
    return item.responseTimeSeconds;
  }

  if (
    typeof item.responseTime === 'number' &&
    Number.isFinite(item.responseTime)
  ) {
    return item.responseTime;
  }

  const acceptedAt = getAcceptedTime(incident);

  if (acceptedAt === null) {
    return null;
  }

  const createdAt = new Date(
    incident.createdAt,
  ).getTime();

  if (Number.isNaN(createdAt)) {
    return null;
  }

  const difference = acceptedAt - createdAt;

  if (difference < 0) {
    return null;
  }

  return difference / 1000;
}

/*
|--------------------------------------------------------------------------
| RESPONSE TIME FORMATTER
|--------------------------------------------------------------------------
*/

function formatResponseTime(
  seconds: number | null,
): string {
  if (seconds === null) {
    return '—';
  }

  if (seconds < 60) {
    return `${Math.round(seconds)} sec`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);

  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${hours}h ${remainingMinutes}m`;
}

/*
|--------------------------------------------------------------------------
| RESPONDER SCORE
|--------------------------------------------------------------------------
*/

function calculateResponderScore(
  solvedCases: number,
  averageResponseSeconds: number | null,
): number {
  if (solvedCases === 0) {
    return 0;
  }

  const caseScore = Math.min(
    solvedCases * 10,
    60,
  );

  let speedScore = 0;

  if (averageResponseSeconds !== null) {
    if (averageResponseSeconds < 30) {
      speedScore = 40;
    } else if (averageResponseSeconds < 60) {
      speedScore = 35;
    } else if (averageResponseSeconds < 120) {
      speedScore = 30;
    } else if (averageResponseSeconds < 300) {
      speedScore = 20;
    } else {
      speedScore = 10;
    }
  }

  return Math.min(
    100,
    caseScore + speedScore,
  );
}

function getPerformanceLabel(
  score: number,
): string {
  if (score >= 90) {
    return 'Elite Responder';
  }

  if (score >= 75) {
    return 'Excellent Responder';
  }

  if (score >= 60) {
    return 'Strong Responder';
  }

  if (score >= 40) {
    return 'Active Responder';
  }

  if (score > 0) {
    return 'Developing Responder';
  }

  return 'No Cases Completed';
}

/*
|--------------------------------------------------------------------------
| MAIN DASHBOARD
|--------------------------------------------------------------------------
*/

export function ResponderDashboardPage({
  incidents,
  responders,
  isAuthenticated,
  session,
  onView,
  onGoLogin,
}: Props) {

  /*
  |--------------------------------------------------------------------------
  | CURRENT RESPONDER
  |--------------------------------------------------------------------------
  */

  const currentResponder = useMemo(() => {
    if (!session) {
      return null;
    }

    return responders.find(
      (responder) =>
        responder.id === session.id,
    ) ?? null;
  }, [responders, session]);

  /*
  |--------------------------------------------------------------------------
  | INCIDENTS BELONGING TO CURRENT RESPONDER
  |--------------------------------------------------------------------------
  */

  const myIncidents = useMemo(() => {
    if (!session) {
      return [];
    }

    return incidents
      .filter((incident) => {
        const responderId =
          getIncidentResponderId(incident);

        return responderId === session.id;
      })
      .sort((a, b) => {
        const aTime = new Date(
          a.createdAt,
        ).getTime();

        const bTime = new Date(
          b.createdAt,
        ).getTime();

        return bTime - aTime;
      });
  }, [incidents, session]);

  /*
  |--------------------------------------------------------------------------
  | LIVE / IN-PROGRESS INCIDENTS
  |--------------------------------------------------------------------------
  |
  | These are incidents assigned to this responder but not resolved.
  |
  */

  const assignedLiveIncidents = useMemo(() => {
    return myIncidents.filter(
      (incident) =>
        incident.status !== 'RESOLVED',
    );
  }, [myIncidents]);

  /*
  |--------------------------------------------------------------------------
  | PAST / COMPLETED INCIDENTS
  |--------------------------------------------------------------------------
  */

  const completedCases = useMemo(() => {
    return myIncidents.filter(
      (incident) =>
        incident.status === 'RESOLVED',
    );
  }, [myIncidents]);

  /*
  |--------------------------------------------------------------------------
  | RESPONSE TIMES
  |--------------------------------------------------------------------------
  */

  const responseTimes = useMemo(() => {
    return completedCases
      .map((incident) =>
        getResponseTimeSeconds(
          incident,
        ),
      )
      .filter(
        (
          value,
        ): value is number =>
          value !== null &&
          Number.isFinite(value),
      );
  }, [completedCases]);

  /*
  |--------------------------------------------------------------------------
  | AVERAGE RESPONSE TIME
  |--------------------------------------------------------------------------
  */

  const averageResponseSeconds = useMemo(() => {
    if (responseTimes.length === 0) {
      return null;
    }

    const total = responseTimes.reduce(
      (sum, value) =>
        sum + value,
      0,
    );

    return (
      total /
      responseTimes.length
    );
  }, [responseTimes]);

  /*
  |--------------------------------------------------------------------------
  | SCORE
  |--------------------------------------------------------------------------
  */

  const responderScore = useMemo(() => {
    return calculateResponderScore(
      completedCases.length,
      averageResponseSeconds,
    );
  }, [
    completedCases.length,
    averageResponseSeconds,
  ]);

  const performanceLabel =
    getPerformanceLabel(
      responderScore,
    );

  /*
  |--------------------------------------------------------------------------
  | AUTHENTICATION SCREEN
  |--------------------------------------------------------------------------
  */

  if (!isAuthenticated || !session) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="card w-full max-w-md p-8 text-center">

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-navy-800">
            <Lock className="h-7 w-7 text-secondary-400" />
          </div>

          <h1 className="mt-4 text-xl font-bold text-white">
            Responder Access Required
          </h1>

          <p className="mt-2 text-sm leading-relaxed text-secondary-400">
            This dashboard is private. Only authenticated
            responders can view their assigned incidents and
            personal performance information.
          </p>

          <button
            onClick={onGoLogin}
            className="btn-danger mt-6 w-full"
          >
            Responder Login
          </button>

        </div>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | AUTHENTICATED DASHBOARD
  |--------------------------------------------------------------------------
  */

  return (
    <div className="space-y-6 pb-8">

      {/* HEADER */}

      <div>
        <div className="flex flex-wrap items-center gap-3">

          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-500/15">
            <LayoutDashboard className="h-6 w-6 text-accent-400" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-white">
              My Responder Dashboard
            </h1>

            <p className="mt-1 text-sm text-secondary-400">
              Your assigned incidents, completed cases,
              and personal performance.
            </p>
          </div>

        </div>

        <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-300">

          <ShieldAlert className="h-3.5 w-3.5" />

          Signed in:

          <span className="font-semibold">
            {session.name}
          </span>

          <span className="text-emerald-400/60">
            ·
          </span>

          <span>
            {session.id}
          </span>

        </div>
      </div>

      {/* PRIVACY NOTICE */}

      <div className="flex items-start gap-3 rounded-xl border border-navy-700 bg-navy-800/70 p-4">

        <Lock className="mt-0.5 h-5 w-5 shrink-0 text-accent-400" />

        <div>
          <div className="text-sm font-semibold text-white">
            Private responder view
          </div>

          <p className="mt-1 text-xs leading-relaxed text-secondary-400">
            You can only see incidents assigned to your responder
            account. Unassigned incidents and incidents assigned
            to other responders are hidden.
          </p>
        </div>

      </div>

      {/* RESPONDER PROFILE */}

      <section className="card overflow-hidden">

        <div className="border-b border-navy-700 bg-navy-800/60 p-5">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div className="flex items-center gap-4">

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-500/15">
                <ShieldAlert className="h-7 w-7 text-accent-400" />
              </div>

              <div>

                <div className="text-lg font-bold text-white">
                  {session.name}
                </div>

                <div className="mt-1 text-xs text-secondary-400">
                  Responder ID: {session.id}
                </div>

                <div className="mt-1 text-xs text-secondary-400">
                  Unit: {session.unit}
                </div>

              </div>

            </div>

            {currentResponder && (
              <div className="rounded-xl border border-navy-700 bg-navy-900 px-4 py-3">

                <div className="text-[10px] uppercase tracking-wider text-secondary-500">
                  Current Status
                </div>

                <div className="mt-1 text-sm font-semibold text-emerald-400">
                  {currentResponder.status}
                </div>

              </div>
            )}

          </div>

        </div>

      </section>

      {/* LIVE ASSIGNED INCIDENT */}

      <section>

        <div className="mb-3 flex items-center justify-between">

          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-white">

              <Radio className="h-5 w-5 text-emergency-400" />

              Assigned Live Incident

            </h2>

            <p className="mt-1 text-xs text-secondary-500">
              Only incidents assigned to you are shown here.
            </p>
          </div>

          {assignedLiveIncidents.length > 0 && (
            <span className="rounded-full border border-emergency-500/30 bg-emergency-500/10 px-3 py-1 text-xs font-semibold text-emergency-300">
              {assignedLiveIncidents.length} active
            </span>
          )}

        </div>

        {assignedLiveIncidents.length === 0 ? (

          <div className="card p-8 text-center">

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-navy-800">

              <CheckCircle2 className="h-7 w-7 text-emerald-400" />

            </div>

            <h3 className="mt-4 text-sm font-bold text-white">
              No active assignment
            </h3>

            <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-secondary-500">
              You currently have no live incident assigned to you.
            </p>

          </div>

        ) : (

          <div className="space-y-3">

            {assignedLiveIncidents.map(
              (incident) => (
                <LiveIncidentCard
                  key={incident.id}
                  incident={incident}
                  onView={onView}
                />
              ),
            )}

          </div>

        )}

      </section>

      {/* PERFORMANCE */}

      <section>

        <h2 className="mb-3 text-lg font-bold text-white">
          My Performance
        </h2>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">

          <PerformanceCard
            icon={
              <Trophy className="h-5 w-5" />
            }
            label="Responder Score"
            value={`${responderScore}/100`}
            description={performanceLabel}
          />

          <PerformanceCard
            icon={
              <CheckCircle2 className="h-5 w-5" />
            }
            label="Cases Solved"
            value={completedCases.length}
            description="Resolved incidents"
          />

          <PerformanceCard
            icon={
              <Timer className="h-5 w-5" />
            }
            label="Average Response"
            value={formatResponseTime(
              averageResponseSeconds,
            )}
            description="Completed cases"
          />

          <PerformanceCard
            icon={
              <Activity className="h-5 w-5" />
            }
            label="My Incidents"
            value={myIncidents.length}
            description="Assigned to you"
          />

        </div>

      </section>

      {/* SCORE */}

      <section className="card p-5">

        <div className="flex items-center gap-2">

          <Trophy className="h-5 w-5 text-accent-400" />

          <h2 className="text-base font-bold text-white">
            Responder Performance Score
          </h2>

        </div>

        <div className="mt-4">

          <div className="flex items-end justify-between">

            <div>

              <div className="text-3xl font-bold text-white">

                {responderScore}

                <span className="text-lg text-secondary-500">
                  /100
                </span>

              </div>

              <div className="mt-1 text-xs text-secondary-400">
                {performanceLabel}
              </div>

            </div>

            <div className="text-right text-xs text-secondary-400">

              Cases solved:

              <span className="ml-1 font-semibold text-white">
                {completedCases.length}
              </span>

            </div>

          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-navy-700">

            <div
              className="h-full rounded-full bg-accent-500 transition-all duration-500"
              style={{
                width: `${responderScore}%`,
              }}
            />

          </div>

          <p className="mt-3 text-xs leading-relaxed text-secondary-500">
            Your score is based on completed emergency cases
            and response speed. Faster responses and more
            successfully completed cases improve your score.
          </p>

        </div>

      </section>

      {/* PAST INCIDENTS */}

      <section>

        <div className="mb-3 flex items-center justify-between">

          <div>

            <h2 className="text-lg font-bold text-white">
              My Past Incidents
            </h2>

            <p className="mt-1 text-xs text-secondary-500">
              Only incidents completed by your responder account.
            </p>

          </div>

          <div className="rounded-lg border border-navy-700 bg-navy-800 px-3 py-1.5 text-xs text-secondary-400">

            {completedCases.length} completed

          </div>

        </div>

        {completedCases.length === 0 ? (

          <div className="card p-10 text-center">

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-navy-800">

              <CheckCircle2 className="h-7 w-7 text-secondary-500" />

            </div>

            <h3 className="mt-4 text-sm font-bold text-white">
              No completed incidents yet
            </h3>

            <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-secondary-500">
              Completed incidents assigned to you will appear
              here after they are resolved.
            </p>

          </div>

        ) : (

          <div className="space-y-3">

            {completedCases.map(
              (incident) => (
                <PastIncidentCard
                  key={incident.id}
                  incident={incident}
                />
              ),
            )}

          </div>

        )}

      </section>

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| PERFORMANCE CARD
|--------------------------------------------------------------------------
*/

function PerformanceCard({
  icon,
  label,
  value,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  description: string;
}) {
  return (
    <div className="card p-4">

      <div className="flex items-center justify-between">

        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-500/10 text-accent-400">
          {icon}
        </div>

        <span className="h-2 w-2 rounded-full bg-emerald-400" />

      </div>

      <div className="mt-4">

        <div className="text-xs font-medium uppercase tracking-wider text-secondary-500">
          {label}
        </div>

        <div className="mt-1 text-2xl font-bold text-white">
          {value}
        </div>

        <div className="mt-1 text-xs text-secondary-500">
          {description}
        </div>

      </div>

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| LIVE INCIDENT CARD
|--------------------------------------------------------------------------
*/

function LiveIncidentCard({
  incident,
  onView,
}: {
  incident: Incident;
  onView: (id: string) => void;
}) {
  const responseTime =
    getResponseTimeSeconds(
      incident,
    );

  return (
    <div className="card overflow-hidden border-emergency-500/40 ring-1 ring-emergency-500/20">

      <div className="flex items-center justify-between border-b border-emergency-500/20 bg-emergency-500/10 px-4 py-2.5">

        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-emergency-300">

          <span className="h-2 w-2 animate-pulse rounded-full bg-emergency-400" />

          LIVE ASSIGNMENT

        </div>

        <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-300">

          IN PROGRESS

        </span>

      </div>

      <div className="flex flex-col gap-4 p-4 sm:flex-row">

        <div className="shrink-0 sm:w-28">

          {incident.imageData ? (

            <img
              src={incident.imageData}
              alt="Incident"
              className="h-20 w-full rounded-lg object-cover"
            />

          ) : (

            <div className="flex h-20 w-full items-center justify-center rounded-lg bg-navy-800">

              <Siren className="h-7 w-7 text-emergency-400" />

            </div>

          )}

        </div>

        <div className="min-w-0 flex-1">

          <div className="flex flex-wrap items-center gap-2">

            <span className="text-sm font-bold text-white">
              {incident.type}
            </span>

            <SeverityBadge
              severity={incident.severity}
            />

            <StatusBadge
              status={incident.status}
            />

          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-secondary-400">

            <span className="font-mono">
              {incident.id}
            </span>

            <span className="flex items-center gap-1">

              <MapPin className="h-3.5 w-3.5" />

              <span className="truncate">
                {incident.location}
              </span>

            </span>

            <span className="flex items-center gap-1">

              <Clock className="h-3.5 w-3.5" />

              {formatRelative(
                incident.createdAt,
              )}

            </span>

          </div>

          <div className="mt-3 flex flex-wrap gap-2">

            <div className="rounded-lg bg-navy-800 px-2.5 py-1.5 text-xs">

              <span className="text-secondary-500">
                Priority
              </span>

              <span className="ml-1">
                <PriorityScore
                  score={
                    incident.priority
                  }
                />
              </span>

            </div>

            <div className="rounded-lg bg-navy-800 px-2.5 py-1.5 text-xs">

              <span className="text-secondary-500">
                Response
              </span>

              <span className="ml-1 font-semibold text-white">
                {formatResponseTime(
                  responseTime,
                )}
              </span>

            </div>

          </div>

          {incident.aiSummary && (

            <p className="mt-3 rounded-lg border border-navy-700 bg-navy-800 p-2.5 text-xs leading-relaxed text-secondary-400">

              {incident.aiSummary}

            </p>

          )}

          <button
            onClick={() =>
              onView(incident.id)
            }
            className="btn-ghost mt-3 w-full py-2.5 text-sm sm:w-auto"
          >

            View Assigned Incident

            <ArrowRight className="h-4 w-4" />

          </button>

        </div>

      </div>

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| PAST INCIDENT CARD
|--------------------------------------------------------------------------
*/

function PastIncidentCard({
  incident,
}: {
  incident: Incident;
}) {
  const responseTime =
    getResponseTimeSeconds(
      incident,
    );

  return (
    <div className="card overflow-hidden">

      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start">

        <div className="shrink-0 sm:w-28">

          {incident.imageData ? (

            <img
              src={incident.imageData}
              alt="Incident"
              className="h-20 w-full rounded-lg object-cover"
            />

          ) : (

            <div className="flex h-20 w-full items-center justify-center rounded-lg bg-navy-800">

              <Siren className="h-7 w-7 text-secondary-500" />

            </div>

          )}

        </div>

        <div className="min-w-0 flex-1">

          <div className="flex flex-wrap items-center gap-2">

            <span className="text-sm font-bold text-white">
              {incident.type}
            </span>

            <SeverityBadge
              severity={incident.severity}
            />

            <StatusBadge
              status={incident.status}
            />

          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-secondary-400">

            <span className="font-mono">
              {incident.id}
            </span>

            <span className="flex items-center gap-1">

              <MapPin className="h-3.5 w-3.5" />

              <span className="truncate">
                {incident.location}
              </span>

            </span>

            <span className="flex items-center gap-1">

              <Clock className="h-3.5 w-3.5" />

              {formatRelative(
                incident.createdAt,
              )}

            </span>

          </div>

          <div className="mt-3 flex flex-wrap gap-2">

            <div className="rounded-lg bg-navy-800 px-2.5 py-1.5 text-xs">

              <span className="text-secondary-500">
                Priority
              </span>

              <span className="ml-1">
                <PriorityScore
                  score={
                    incident.priority
                  }
                />
              </span>

            </div>

            <div className="rounded-lg bg-navy-800 px-2.5 py-1.5 text-xs">

              <span className="text-secondary-500">
                Response
              </span>

              <span className="ml-1 font-semibold text-white">
                {formatResponseTime(
                  responseTime,
                )}
              </span>

            </div>

            <div className="rounded-lg bg-emerald-500/10 px-2.5 py-1.5 text-xs font-semibold text-emerald-400">

              <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />

              Completed

            </div>

          </div>

          {incident.aiSummary && (

            <p className="mt-3 rounded-lg border border-navy-700 bg-navy-800 p-2.5 text-xs leading-relaxed text-secondary-400">

              {incident.aiSummary}

            </p>

          )}

        </div>

      </div>

    </div>
  );
}