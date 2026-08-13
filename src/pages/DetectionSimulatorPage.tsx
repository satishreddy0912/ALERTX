import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Radar, Zap, Activity, AlertTriangle, Flame, Car, HeartPulse, CheckCircle2,
  Smartphone, Beaker, Gauge, Navigation, ShieldAlert, Play, Square,
} from 'lucide-react';
import type { EmergencyType, Incident, Severity, EmergencyDetection, IncidentSource, SensorDetectionResult, LiveSensorValues, DetectionState } from '@/types';
import { simulateSensorEvent, getSensorManager, SENSOR_TESTS, SENSOR_CONFIG, testEmergencySound} from '@/lib/sensors';
import type { SensorTestType } from '@/lib/sensors';

interface Props {
  onCreate: (data: {
    type: EmergencyType;
    name: string;
    phone: string;
    location: string;
    description: string;
    imageData: string | null;
    coords: { lat: number; lng: number } | null;
    simLevel?: string;
    sensorConfidence?: number;
    sensorEventType?: string;
  }, source: IncidentSource) => Incident;
  onGoDashboard: () => void;
  onViewIncident: (id: string) => void;
}

type SimLevel = 'Normal' | 'Minor Impact' | 'Severe Impact' | 'Critical Impact';

const LEVELS: { level: SimLevel; color: string; ring: string }[] = [
  { level: 'Normal', color: 'text-emerald-400', ring: 'border-emerald-500/30' },
  { level: 'Minor Impact', color: 'text-amber-400', ring: 'border-amber-500/30' },
  { level: 'Severe Impact', color: 'text-accent-400', ring: 'border-accent-500/40' },
  { level: 'Critical Impact', color: 'text-emergency-400', ring: 'border-emergency-500/40' },
];

const SIM_LOCATIONS = [
  'Banjara Hills, Hyderabad',
  'Kondapur, Hyderabad',
  'Madhapur, Hyderabad',
  'Gachibowli, Hyderabad',
  'Begumpet, Hyderabad',
  'Hitech City, Hyderabad',
  'Secunderabad Junction',
  'Jubilee Hills, Hyderabad',
];

const SIM_TYPES: EmergencyType[] = ['Road Accident', 'Medical Emergency', 'Fire', 'Other'];

function severityFor(level: SimLevel): Severity {
  if (level === 'Critical Impact') return 'CRITICAL';
  if (level === 'Severe Impact') return 'HIGH';
  if (level === 'Minor Impact') return 'MEDIUM';
  return 'LOW';
}

const TYPE_ICON: Record<EmergencyType, typeof Car> = {
  'Road Accident': Car,
  'Medical Emergency': HeartPulse,
  Fire: Flame,
  Other: AlertTriangle,
};

const IDLE_VALUES: LiveSensorValues = {
  ax: 0, ay: 0, az: 0, rx: 0, ry: 0, rz: 0,
  accelerationMagnitude: 0, rotationMagnitude: 0, active: false,
};

export function DetectionSimulatorPage({ onCreate, onGoDashboard, onViewIncident }: Props) {
  const [level, setLevel] = useState<SimLevel>('Severe Impact');
  const [lastIncident, setLastIncident] = useState<Incident | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [sensorResult, setSensorResult] = useState<SensorDetectionResult | null>(null);
  const [sensorTestRunning, setSensorTestRunning] = useState<string | null>(null);

  // Live sensor state
  const [liveValues, setLiveValues] = useState<LiveSensorValues>(IDLE_VALUES);
  const [sensorActive, setSensorActive] = useState(false);
  const [sensorError, setSensorError] = useState<string | null>(null);
  const [detectionStatus, setDetectionStatus] = useState<DetectionState | 'CONFIRMING'>('MONITORING');
  const [liveConfidence, setLiveConfidence] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [countdownTotal, setCountdownTotal] = useState(15);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endTimeRef = useRef<number>(0);
  const firedRef = useRef<boolean>(false);
  const countdownActiveRef = useRef<boolean>(false);

  // Stable ref for onCreate so the detection subscription doesn't re-subscribe on every render
  const onCreateRef = useRef(onCreate);
  onCreateRef.current = onCreate;

  // Start live sensor polling
  const startPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      const manager = getSensorManager();
      setLiveValues(manager.getLiveValues());
      setLiveConfidence(manager.getConfidence());
    }, 100);
  }, []);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, []);

  // Subscribe to sensor state changes and detections — depends on nothing that changes during a countdown
  useEffect(() => {
    const manager = getSensorManager();
    const unsubState = manager.onStateChange((state, confidence) => {
      setLiveConfidence(confidence);
      if (state !== 'POSSIBLE_ACCIDENT') {
        setDetectionStatus((prev) => prev === 'CONFIRMING' ? prev : state);
      }
    });
    const unsub = manager.onDetection((result) => {
      // If a countdown is already in progress, do NOT reset it.
      // Only a completely new detection event (after the previous one completed/cancelled) starts a fresh countdown.
      if (countdownActiveRef.current) return;

      countdownActiveRef.current = true;
      const total = result.highConfidence ? 5 : 30;
      setDetectionStatus('CONFIRMING');
      setCountdownTotal(total);
      endTimeRef.current = Date.now() + total * 1000;
      firedRef.current = false;
      setCountdown(total);

      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }

      const tick = () => {
        const remaining = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
        setCountdown(remaining);
        if (remaining <= 0 && !firedRef.current) {
          firedRef.current = true;
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          countdownActiveRef.current = false;
          // Trigger emergency
          const location = SIM_LOCATIONS[Math.floor(Math.random() * SIM_LOCATIONS.length)];
          const coords = { lat: 17.38 + Math.random() * 0.15, lng: 78.38 + Math.random() * 0.15 };
          const incident = onCreateRef.current({
            type: 'Road Accident',
            name: 'Mobile Sensor',
            phone: '0000000000',
            location,
            description: `Automatic sensor detection: ${result.eventType.replace('POSSIBLE_', 'possible ')}`,
            imageData: null,
            coords,
            sensorConfidence: result.confidence,
            sensorEventType: result.eventType,
          }, 'mobile_sensor');
          setLastIncident(incident);
          setDetectionStatus('MONITORING');
        }
      };

      tick();
      countdownIntervalRef.current = setInterval(tick, 200);
    });
    return () => {
      unsub();
      unsubState();
    };
  }, []);

  // Check if sensor is already running on mount
  useEffect(() => {
    const manager = getSensorManager();
    if (manager.isActive()) {
      setSensorActive(true);
      startPolling();
    }
  }, [startPolling]);

  async function startMonitoring() {
    setSensorError(null);
    const manager = getSensorManager();

    // iOS 13+ requires permission request
    const DME = DeviceMotionEvent as typeof DeviceMotionEvent & { requestPermission?: () => Promise<string> };
    if (typeof DME.requestPermission === 'function') {
      try {
        const perm = await DME.requestPermission();
        if (perm !== 'granted') {
          setSensorError('Sensor permission denied. Please allow motion access to use automatic detection.');
          return;
        }
      } catch {
        setSensorError('Unable to request sensor permission. Try again or use the simulator below.');
        return;
      }
    }

    manager.start();
    setSensorActive(true);
    setDetectionStatus('MONITORING');
    startPolling();
  }

  function stopMonitoring() {
    const manager = getSensorManager();
    manager.stop();
    setSensorActive(false);
    setLiveValues(IDLE_VALUES);
    setLiveConfidence(0);
    setDetectionStatus('MONITORING');
    countdownActiveRef.current = false;
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }

  function cancelCountdown() {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    countdownActiveRef.current = false;
    setCountdown(0);
    const manager = getSensorManager();
    manager.clearReadings();
    setDetectionStatus('MONITORING');
  }

  function simulate() {
    setSimulating(true);
    setTimeout(() => {
      const type = SIM_TYPES[Math.floor(Math.random() * SIM_TYPES.length)];
      const location = SIM_LOCATIONS[Math.floor(Math.random() * SIM_LOCATIONS.length)];
      const coords = { lat: 17.38 + Math.random() * 0.15, lng: 78.38 + Math.random() * 0.15 };
      const incident = onCreate({
        type,
        name: 'Detection Simulator',
        phone: '0000000000',
        location,
        description: `[Simulated ${level}] Automated detection triggered.`,
        imageData: null,
        coords,
        simLevel: level,
      }, 'simulator');
      setLastIncident(incident);
      setSimulating(false);
    }, 600);
  }

  function runSensorTest(testType: SensorTestType) {
    setSensorTestRunning(testType);
    setSensorResult(null);
    setTimeout(() => {
      const manager = getSensorManager();
      const result = simulateSensorEvent(manager, testType);
      if (result.detected) {
        manager.startEmergencyAlert();
      }
      setSensorResult(result);
      setSensorTestRunning(null);
    }, 500);
  }


  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
          <Radar className="h-6 w-6 text-accent-400" /> Detection Simulator
        </h1>
        <p className="mt-1 text-sm text-secondary-400">
          Monitor live sensor data and test the automatic accident detection pipeline.
        </p>
      </div>

      {/* ===== AUTOMATIC ACCIDENT DETECTION CARD ===== */}
      <div className="card overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-navy-700 bg-navy-900 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-accent-400" />
            <span className="text-sm font-bold uppercase tracking-wide text-white">Automatic Accident Detection</span>
          </div>
          <div className="flex items-center gap-2">
            {sensorActive ? (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                SENSOR ACTIVE
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-secondary-400">
                <span className="h-2 w-2 rounded-full bg-secondary-600" />
                SENSOR OFF
              </span>
            )}
          </div>
        </div>

        <div className="p-4 sm:p-5">
          {/* Sensor controls */}
          <div className="mb-4 flex flex-col gap-2 sm:flex-row">
            {!sensorActive ? (
              <button onClick={startMonitoring} className="btn-primary flex-1 py-3 text-sm">
                <Play className="h-4 w-4" /> Start Monitoring
              </button>
            ) : (
              <button onClick={stopMonitoring} className="btn-ghost flex-1 py-3 text-sm">
                <Square className="h-4 w-4" /> Stop Monitoring
              </button>
            )}
          </div>

          {sensorError && (
            <div className="mb-4 rounded-lg border border-emergency-500/40 bg-emergency-600/10 p-3 text-sm text-emergency-400">
              {sensorError}
            </div>
          )}

          {/* Live sensor values */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* Accelerometer */}
            <div className="rounded-xl border border-navy-700 bg-navy-900 p-3.5">
              <div className="mb-2.5 flex items-center gap-2">
                <Gauge className="h-4 w-4 text-accent-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-secondary-400">Accelerometer</span>
              </div>
              <div className="space-y-1.5">
                <SensorRow label="X" value={liveValues.ax} unit="m/s²" />
                <SensorRow label="Y" value={liveValues.ay} unit="m/s²" />
                <SensorRow label="Z" value={liveValues.az} unit="m/s²" />
              </div>
              <div className="mt-2.5 border-t border-navy-700 pt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-secondary-400">Magnitude</span>
                  <span className="font-mono font-bold text-accent-400">{liveValues.accelerationMagnitude.toFixed(2)} m/s²</span>
                </div>
              </div>
            </div>

            {/* Gyroscope */}
            <div className="rounded-xl border border-navy-700 bg-navy-900 p-3.5">
              <div className="mb-2.5 flex items-center gap-2">
                <Navigation className="h-4 w-4 text-accent-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-secondary-400">Gyroscope</span>
              </div>
              <div className="space-y-1.5">
                <SensorRow label="X" value={liveValues.rx} unit="°/s" />
                <SensorRow label="Y" value={liveValues.ry} unit="°/s" />
                <SensorRow label="Z" value={liveValues.rz} unit="°/s" />
              </div>
              <div className="mt-2.5 border-t border-navy-700 pt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-secondary-400">Magnitude</span>
                  <span className="font-mono font-bold text-accent-400">{liveValues.rotationMagnitude.toFixed(2)} °/s</span>
                </div>
              </div>
            </div>
          </div>

          {/* Detection status */}
          <div className="mt-4">
            <div className="mb-1.5 text-xs font-bold uppercase tracking-wider text-secondary-400">Detection Status</div>
            {detectionStatus === 'CONFIRMING' && countdown > 0 ? (
              <CountdownDisplay seconds={countdown} total={countdownTotal} onCancel={cancelCountdown} />
            ) : detectionStatus === 'POSSIBLE_ACCIDENT' || detectionStatus === 'CONFIRMING' ? (
              <div className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3">
                <AlertTriangle className="h-5 w-5 animate-pulse text-amber-400" />
                <span className="text-sm font-bold text-amber-400">POSSIBLE ACCIDENT DETECTED</span>
              </div>
            ) : detectionStatus === 'ANALYZING' ? (
              <div className="flex items-center gap-2 rounded-xl border border-accent-500/40 bg-accent-500/10 px-4 py-3">
                <Activity className="h-5 w-5 animate-pulse text-accent-400" />
                <span className="text-sm font-bold text-accent-400">ANALYZING UNUSUAL MOTION</span>
              </div>
            ) : detectionStatus === 'NORMAL_MOVEMENT' ? (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <span className="text-sm font-bold text-emerald-400">NORMAL MOVEMENT</span>
              </div>
            ) : sensorActive ? (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                <span className="text-sm font-bold text-emerald-400">MONITORING</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-xl border border-navy-700 bg-navy-900 px-4 py-3">
                <span className="h-2 w-2 rounded-full bg-secondary-600" />
                <span className="text-sm font-bold text-secondary-400">INACTIVE</span>
              </div>
            )}
          </div>

          {/* Debug info — shown when sensor is active */}
          {sensorActive && (
            <div className="mt-3 rounded-xl border border-navy-700 bg-navy-950 p-3">
              <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-secondary-600">
                <Activity className="h-3 w-3" /> Debug Info
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-secondary-400">Accel Mag</span>
                  <span className="font-mono font-semibold text-white tabular-nums">{liveValues.accelerationMagnitude.toFixed(2)} m/s²</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-secondary-400">Rot Mag</span>
                  <span className="font-mono font-semibold text-white tabular-nums">{liveValues.rotationMagnitude.toFixed(2)} rad/s</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-secondary-400">Confidence</span>
                  <span className="font-mono font-semibold text-white tabular-nums">{(liveConfidence * 100).toFixed(0)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-secondary-400">State</span>
                  <span className="font-mono font-semibold text-white tabular-nums">{detectionStatus === 'CONFIRMING' ? 'CONFIRMING' : detectionStatus}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-secondary-400">Accel Dead Zone</span>
                  <span className="font-mono text-secondary-400">{SENSOR_CONFIG.ACCEL_DEAD_ZONE} m/s²</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-secondary-400">Rot Dead Zone</span>
                  <span className="font-mono text-secondary-400">{SENSOR_CONFIG.ROTATION_DEAD_ZONE} rad/s</span>
                </div>
              </div>
              {/* Confidence bar */}
              <div className="mt-2.5">
                <div className="mb-1 flex items-center justify-between text-[10px] text-secondary-600">
                  <span>Confidence</span>
                  <span>{SENSOR_CONFIG.MIN_CONFIDENCE * 100}% threshold</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-navy-900">
                  <div
                    className={`h-full rounded-full transition-all duration-200 ${
                      liveConfidence >= SENSOR_CONFIG.MIN_CONFIDENCE ? 'bg-emergency-500' : liveConfidence > 0.1 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, liveConfidence * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== SIMULATOR SECTION ===== */}
      <div className="mt-6">
        <h2 className="mb-3 text-lg font-bold text-white">Manual Simulator</h2>

        {/* Level selector */}
        <div className="card p-4 sm:p-5">
          <label className="label">Impact Level</label>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {LEVELS.map((l) => (
              <button
                key={l.level}
                onClick={() => setLevel(l.level)}
                className={`rounded-xl border p-3 text-center transition ${
                  level === l.level
                    ? `${l.ring} bg-navy-900`
                    : 'border-navy-700 bg-navy-800 hover:border-navy-500'
                }`}
              >
                <div className={`text-sm font-bold ${l.color}`}>{l.level}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Simulate button */}
        <button onClick={simulate} disabled={simulating} className="btn-danger mt-4 w-full py-4 text-base">
          <Zap className={`h-5 w-5 ${simulating ? 'animate-pulse' : ''}`} /> {simulating ? 'Simulating...' : 'SIMULATE EMERGENCY'}
        </button>

        {/* Preview */}
        <div className="mt-4 card p-4">
          <div className="flex items-center gap-2 text-xs text-secondary-400">
            <Activity className="h-4 w-4 text-accent-400" />
            Expected severity: <span className="font-bold text-white">{severityFor(level)}</span>
            <span className="text-secondary-600">·</span>
            Priority: <span className="font-bold text-white">{level === 'Normal' ? '15-29' : level === 'Minor Impact' ? '38-55' : level === 'Severe Impact' ? '65-82' : '88-98'}</span>
          </div>
        </div>
      </div>

      {/* Result */}
      {lastIncident && (
        <div className="mt-6 card animate-pop-in overflow-hidden">
          <div className="flex items-center gap-2 bg-gradient-to-r from-accent-600 to-accent-800 px-4 py-3 text-white">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm font-bold">Detection Event Created</span>
          </div>
          <div className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {(() => {
                  const Icon = TYPE_ICON[lastIncident.type];
                  return <Icon className="h-5 w-5 text-accent-400" />;
                })()}
                <span className="text-base font-bold text-white">{lastIncident.type}</span>
              </div>
              <span className="text-sm font-bold text-accent-400">{lastIncident.id}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Info label="Severity" value={lastIncident.severity} />
              <Info label="Priority" value={`${lastIncident.priority}/100`} />
              <Info label="Credibility" value={`${lastIncident.credibility.score}%`} />
              <Info label="Status" value={lastIncident.status === 'VERIFICATION_REQUIRED' ? 'VERIFY' : lastIncident.status} />
            </div>
            <div className="rounded-lg border border-navy-700 bg-navy-900 p-3">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-secondary-400">Emergency Detection:</span>
                <DetectionLabel value={lastIncident.emergencyDetection} />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-secondary-400">Confidence:</span>
                <span className="font-mono font-semibold text-accent-400">{lastIncident.confidence}%</span>
              </div>
            </div>
            <div className="rounded-lg border border-navy-700 bg-navy-900 p-3 text-sm text-secondary-400">
              <div className="mb-1 text-xs uppercase tracking-wider text-secondary-600">Reason</div>
              {lastIncident.reason}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button onClick={() => onViewIncident(lastIncident.id)} className="btn-primary flex-1 py-3 text-sm">
                View Incident
              </button>
              <button onClick={onGoDashboard} className="btn-ghost flex-1 py-3 text-sm">
                Open Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== SENSOR TEST MODE ===== */}
      <div className="mt-8">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Beaker className="h-5 w-5 text-amber-400" />
          <h2 className="text-lg font-bold text-white">Sensor Test Mode</h2>
          <span className="badge border border-amber-500/30 bg-amber-500/15 text-amber-400">DEMO / TEST MODE</span>
        </div>
        <p className="mb-4 text-sm text-secondary-400">
          Simulate sensor patterns to test the false-positive protection logic. These are NOT real sensor readings — they are clearly labeled simulated events.
        </p>
        <div className="space-y-2.5">
          {SENSOR_TESTS.map((test) => (
            <button
              key={test.type}
              onClick={() => runSensorTest(test.type)}
              disabled={sensorTestRunning === test.type}
              className="card flex w-full items-center justify-between gap-3 p-3.5 text-left transition hover:border-accent-500/50 disabled:opacity-50"
            >
            <button
              onClick={() => testEmergencySound()}
            >
              🔊 Test Emergency Sound
            </button>
              <div className="flex items-center gap-3">
                <Smartphone className="h-5 w-5 shrink-0 text-amber-400" />
                <div className="min-w-0">
                  <div className="text-sm font-bold text-white">{test.label}</div>
                  <div className="text-xs text-secondary-400">{test.desc}</div>
                </div>
              </div>
              {sensorTestRunning === test.type ? (
                <Activity className="h-4 w-4 animate-pulse text-accent-400" />
              ) : (
                <Zap className="h-4 w-4 text-secondary-600" />
              )}
            </button>
          ))}
        </div>

        {/* Sensor test result */}
        {sensorResult && (
          <div className="mt-4 card animate-pop-in overflow-hidden">
            <div className={`flex items-center gap-2 px-4 py-3 text-white ${sensorResult.detected ? 'bg-emergency-700' : 'bg-emerald-700'}`}>
              {sensorResult.detected ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
              <span className="text-sm font-bold">{sensorResult.detected ? 'Detection Triggered' : 'No Detection (Correct)'}</span>
            </div>
            <div className="space-y-3 p-4">
              <div className="grid grid-cols-2 gap-3">
                <Info label="Event Type" value={sensorResult.eventType === 'NONE' ? 'None' : sensorResult.eventType === 'TRANSIENT_MOTION' ? 'Transient (Bump)' : sensorResult.eventType.replace('POSSIBLE_', 'Possible ')} />
                <Info label="Confidence" value={`${Math.round(sensorResult.confidence * 100)}%`} />
                <Info label="Detection State" value={sensorResult.detectionState.replace(/_/g, ' ')} />
                <Info label="High Confidence" value={sensorResult.highConfidence ? 'Yes' : 'No'} />
              </div>
              <div className="rounded-lg border border-navy-700 bg-navy-900 p-3 text-sm text-secondary-400">
                <div className="mb-1 text-xs uppercase tracking-wider text-secondary-600">Reason</div>
                {sensorResult.reason}
              </div>
              {sensorResult.detected && (
                <button
                  onClick={() => {
                    const location = SIM_LOCATIONS[Math.floor(Math.random() * SIM_LOCATIONS.length)];
                    const coords = { lat: 17.38 + Math.random() * 0.15, lng: 78.38 + Math.random() * 0.15 };
                    const incident = onCreate({
                      type: 'Road Accident',
                      name: 'Mobile Sensor',
                      phone: '0000000000',
                      location,
                      description: 'Automatic sensor detection triggered.',
                      imageData: null,
                      coords,
                      sensorConfidence: sensorResult.confidence,
                      sensorEventType: sensorResult.eventType,
                    }, 'mobile_sensor');
                    setLastIncident(incident);
                    setSensorResult(null);
                  }}
                  className="btn-danger w-full py-3 text-sm"
                >
                  <Zap className="h-4 w-4" /> Create Emergency from This Detection
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SensorRow({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium text-secondary-400">{label}</span>
      <span className="font-mono text-sm font-semibold text-white tabular-nums">
        {value >= 0 ? ' ' : ''}{value.toFixed(2)} <span className="text-secondary-600 text-[10px]">{unit}</span>
      </span>
    </div>
  );
}

function CountdownDisplay({ seconds, total, onCancel }: { seconds: number; total: number; onCancel: () => void }) {
  const progress = ((total - seconds) / total) * 100;
  return (
    <div className="rounded-xl border border-emergency-500/50 bg-emergency-600/10 p-4">
      <div className="mb-2 flex items-center gap-2">
        <ShieldAlert className="h-5 w-5 animate-pulse text-emergency-400" />
        <span className="text-sm font-bold uppercase tracking-wide text-emergency-400">Confirm Emergency</span>
      </div>
      <div className="flex flex-col items-center gap-2 py-2">
        <div className={`text-7xl font-bold tabular-nums sm:text-8xl ${seconds <= 3 ? 'text-emergency-400' : 'text-amber-400'}`}>
          {seconds}
        </div>
        <div className="text-xs uppercase tracking-wider text-secondary-400">seconds remaining</div>
        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-navy-950">
          <div
            className="h-full rounded-full bg-emergency-500 transition-all duration-200 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <button
        onClick={onCancel}
        className="btn mt-3 w-full border border-emerald-500/40 bg-emerald-500/10 py-3 text-sm font-bold text-emerald-400 hover:bg-emerald-500/20"
      >
        Cancel — I'm OK
      </button>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-navy-700 bg-navy-900 p-3">
      <div className="text-xs uppercase tracking-wider text-secondary-400">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

const DETECTION_STYLES: Record<EmergencyDetection, string> = {
  'EMERGENCY DETECTED': 'bg-emergency-600/20 text-emergency-400 border border-emergency-500/40',
  'NO CLEAR EMERGENCY': 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  'UNCERTAIN': 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  'POSSIBLE EMERGENCY': 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  'HIGH-CONFIDENCE EMERGENCY': 'bg-emergency-600/25 text-emergency-400 border border-emergency-500/50',
};

function DetectionLabel({ value }: { value: EmergencyDetection }) {
  return <span className={`badge ${DETECTION_STYLES[value]}`}>{value}</span>;
}
