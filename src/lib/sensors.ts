import type { SensorReading, SensorDetectionResult, LiveSensorValues, DetectionState } from '@/types';

/**
 * PROTOTYPE SENSOR CONFIGURATION
 *
 * All thresholds are PROTOTYPE VALUES for hackathon demonstration only.
 * They have NOT been validated against real-world crash data and will require
 * extensive calibration with actual sensor recordings from real incidents
 * before any production use.
 *
 * The system is intentionally conservative to minimize false positives.
 * Walking, normal driving, road bumps, speed breakers, phone handling, and
 * small movements should NOT trigger an emergency.
 */

export const SENSOR_CONFIG = {
  // --- Dead zone: anything below these is NORMAL_MOVEMENT, confidence stays 0 ---
  ACCEL_DEAD_ZONE: 18,        // m/s² — below this, no impact at all
  ROTATION_DEAD_ZONE: 3.5,    // rad/s — below this, no significant rotation

  // --- Impact thresholds (above dead zone, becomes "interesting") ---
  IMPACT_ACCEL_THRESHOLD: 38,    // m/s² — a genuine strong impact
  SIGNIFICANT_ROTATION_THRESHOLD: 6.0, // rad/s — meaningful rotation

  // --- Post-impact stillness ---
  POST_IMPACT_STILL_THRESHOLD: 2.5, // m/s² — near-stillness after impact

  // --- Rolling buffer ---
  WINDOW_SIZE: 45,            // readings to examine (~0.75s at 60Hz)
  MIN_CONSECUTIVE_ABNORMAL: 3, // min consecutive abnormal readings to start ANALYZING

  // --- Confidence ---
  MIN_CONFIDENCE: 0.75,       // below this → no detection
  HIGH_CONFIDENCE_THRESHOLD: 0.90,
  CONFIDENCE_DECAY_RATE: 0.82, // per-tick decay when motion normalizes
  CONFIDENCE_BOOST_IMPACT: 0.35,
  CONFIDENCE_BOOST_ROTATION: 0.25,
  CONFIDENCE_BOOST_STILLNESS: 0.30,
  CONFIDENCE_PENALTY_NO_ROTATION: 0.08,
  CONFIDENCE_PENALTY_CONTINUED_MOVEMENT: 0.15,

  // --- Cooldown / debounce ---
  COOLDOWN_MS: 10000,          // after a detection, wait this long before re-evaluating
  REJECT_COOLDOWN_MS: 3000,   // short cooldown after a transient/road-bump rejection

  // --- Baseline calibration ---
  BASELINE_SAMPLES: 30,       // readings to average for the baseline (~0.5s)
  BASELINE_ADAPT_RATE: 0.02,   // slow drift so it doesn't absorb a real crash

  // --- Sampling ---
  MIN_SAMPLE_INTERVAL_MS: 16,
} as const;

// ─── Internal state ────────────────────────────────────────────────

interface InternalState {
  baselineAccel: number;
  baselineRotation: number;
  baselineSamples: number;
  baselineAccelSum: number;
  baselineRotationSum: number;
  confidence: number;
  detectionState: DetectionState;
  consecutiveAbnormal: number;
  lastRejectTime: number;
  lastDetectionTime: number;
}

function makeInternalState(): InternalState {
  return {
    baselineAccel: 9.8,
    baselineRotation: 0,
    baselineSamples: 0,
    baselineAccelSum: 0,
    baselineRotationSum: 0,
    confidence: 0,
    detectionState: 'MONITORING',
    consecutiveAbnormal: 0,
    lastRejectTime: 0,
    lastDetectionTime: 0,
  };
}

// ─── Analysis engine ───────────────────────────────────────────────

/**
 * Multi-factor, temporal accident detection engine.
 *
 * Detection pipeline:
 *   MONITORING → NORMAL_MOVEMENT (dead zone)
 *   MONITORING → ANALYZING (sustained abnormal readings)
 *   ANALYZING  → POSSIBLE_ACCIDENT (multi-sensor pattern validated)
 *   ANALYZING  → NORMAL_MOVEMENT (confidence decays, transient rejected)
 *
 * Road bumps, potholes, speed breakers, normal driving, walking, and
 * phone handling are filtered out through dead zones, temporal validation,
 * and road-bump rejection logic.
 */
export function analyzeSensorReadings(
  readings: SensorReading[],
  state: InternalState = makeInternalState(),
  now: number = Date.now(),
): SensorDetectionResult {
  /*
   * ALERTX ACCIDENT DETECTION — HACKATHON VERSION
   *
   * Detection requires a RAPID, high-energy event.
   *
   * Normal:
   * - opening the website
   * - picking up the phone
   * - walking
   * - normal turning
   * - slow direction changes
   * - small shakes
   * - road vibration
   * - speed breakers
   * - small bumps
   *
   * should not trigger.
   *
   * A detection requires:
   * 1. Sensor baseline already established
   * 2. A rapid acceleration spike
   * 3. Significant rotation during/near the spike
   * 4. Multiple abnormal readings
   * 5. Motion changes rapidly rather than gradually
   */

  if (readings.length < SENSOR_CONFIG.WINDOW_SIZE) {
    return {
      detected: false,
      confidence: 0,
      eventType: 'NONE',
      reason: 'Collecting sensor data',
      highConfidence: false,
      detectionState: 'MONITORING',
    };
  }

  const window = readings.slice(-SENSOR_CONFIG.WINDOW_SIZE);

  // ------------------------------------------------------------
  // 1. BASELINE CALIBRATION
  // ------------------------------------------------------------

  const calibrationSamples = Math.min(
    window.length,
    SENSOR_CONFIG.BASELINE_SAMPLES
  );

  const calibrationWindow = window.slice(-calibrationSamples);

  const avgAccel =
    calibrationWindow.reduce(
      (sum, r) => sum + r.accelerationMagnitude,
      0
    ) / calibrationWindow.length;

  const avgRotation =
    calibrationWindow.reduce(
      (sum, r) => sum + r.rotationMagnitude,
      0
    ) / calibrationWindow.length;

  if (state.baselineSamples < SENSOR_CONFIG.BASELINE_SAMPLES) {
    state.baselineAccelSum += avgAccel;
    state.baselineRotationSum += avgRotation;
    state.baselineSamples++;

    if (
      state.baselineSamples >=
      SENSOR_CONFIG.BASELINE_SAMPLES
    ) {
      state.baselineAccel =
        state.baselineAccelSum /
        state.baselineSamples;

      state.baselineRotation =
        state.baselineRotationSum /
        state.baselineSamples;
    }

    state.confidence = 0;
    state.consecutiveAbnormal = 0;
    state.detectionState = 'MONITORING';

    return {
      detected: false,
      confidence: 0,
      eventType: 'NONE',
      reason: 'Calibrating sensors — normal movement ignored',
      highConfidence: false,
      detectionState: 'MONITORING',
    };
  }

  // ------------------------------------------------------------
  // 2. HARD SAFETY LIMITS
  // ------------------------------------------------------------

  // These values are intentionally high for the hackathon prototype.
  // Normal phone movement should remain far below this level.

  const RAPID_ACCEL_THRESHOLD = 28; // m/s²
  const EXTREME_ACCEL_THRESHOLD = 35; // m/s²
  const RAPID_ROTATION_THRESHOLD = 4.5; // rad/s

  // Minimum number of abnormal readings required.
  const REQUIRED_ABNORMAL_READINGS = 3;

  // ------------------------------------------------------------
  // 3. FIND PEAK ACCELERATION
  // ------------------------------------------------------------

  let peakAccel = 0;
  let peakIndex = 0;

  for (let i = 0; i < window.length; i++) {
    if (window[i].accelerationMagnitude > peakAccel) {
      peakAccel = window[i].accelerationMagnitude;
      peakIndex = i;
    }
  }

  // ------------------------------------------------------------
  // 4. FIND ROTATION NEAR THE ACCELERATION SPIKE
  // ------------------------------------------------------------

  const rotationStart = Math.max(0, peakIndex - 5);
  const rotationEnd = Math.min(
    window.length,
    peakIndex + 6
  );

  let peakRotation = 0;

  for (
    let i = rotationStart;
    i < rotationEnd;
    i++
  ) {
    if (
      window[i].rotationMagnitude >
      peakRotation
    ) {
      peakRotation =
        window[i].rotationMagnitude;
    }
  }

  // ------------------------------------------------------------
  // 5. RAPID ACCELERATION CHECK
  // ------------------------------------------------------------

  const rapidAcceleration =
    peakAccel >= RAPID_ACCEL_THRESHOLD;

  const extremeAcceleration =
    peakAccel >= EXTREME_ACCEL_THRESHOLD;

  // ------------------------------------------------------------
  // 6. RAPID ROTATION CHECK
  // ------------------------------------------------------------

  const rapidRotation =
    peakRotation >= RAPID_ROTATION_THRESHOLD;

  // ------------------------------------------------------------
  // 7. COUNT ABNORMAL READINGS
  // ------------------------------------------------------------

  let abnormalCount = 0;

  for (const reading of window) {
    const abnormal =
      reading.accelerationMagnitude >=
        RAPID_ACCEL_THRESHOLD ||
      reading.rotationMagnitude >=
        RAPID_ROTATION_THRESHOLD;

    if (abnormal) {
      abnormalCount++;
    }
  }

  const sustainedEvent =
    abnormalCount >= REQUIRED_ABNORMAL_READINGS;

  // ------------------------------------------------------------
  // 8. CHECK HOW FAST THE ACCELERATION CHANGED
  // ------------------------------------------------------------

  let rapidChange = false;

  if (peakIndex > 0) {
    const before =
      window[Math.max(0, peakIndex - 3)]
        .accelerationMagnitude;

    const increase =
      peakAccel - before;

    // A sudden increase is much more meaningful than
    // continuously high acceleration.
    rapidChange = increase >= 12;
  }

  // ------------------------------------------------------------
  // 9. CHECK POST-IMPACT MOTION
  // ------------------------------------------------------------

  const postImpact =
    window.slice(peakIndex + 1);

  let postImpactStillness = false;

  if (postImpact.length >= 5) {
    const postAverage =
      postImpact.reduce(
        (sum, r) =>
          sum + r.accelerationMagnitude,
        0
      ) / postImpact.length;

    postImpactStillness =
      postAverage <= 14;
  }

  // ------------------------------------------------------------
  // 10. COOLDOWN
  // ------------------------------------------------------------

  const inRejectCooldown =
    now - state.lastRejectTime <
    SENSOR_CONFIG.REJECT_COOLDOWN_MS;

  const inDetectionCooldown =
    now - state.lastDetectionTime <
    SENSOR_CONFIG.COOLDOWN_MS;

  if (
    inRejectCooldown ||
    inDetectionCooldown
  ) {
    return {
      detected: false,
      confidence: state.confidence,
      eventType: 'NONE',
      reason: 'Detection cooldown active',
      highConfidence: false,
      detectionState: state.detectionState,
    };
  }

  // ------------------------------------------------------------
  // 11. NORMAL MOVEMENT FILTER
  // ------------------------------------------------------------

  if (
    !rapidAcceleration &&
    !rapidRotation
  ) {
    state.confidence *=
      SENSOR_CONFIG.CONFIDENCE_DECAY_RATE;

    if (state.confidence < 0.02) {
      state.confidence = 0;
      state.detectionState =
        'NORMAL_MOVEMENT';
    }

    state.consecutiveAbnormal = 0;

    return {
      detected: false,
      confidence: state.confidence,
      eventType: 'NONE',
      reason:
        'Normal movement — no rapid impact detected',
      highConfidence: false,
      detectionState:
        state.confidence > 0
          ? state.detectionState
          : 'NORMAL_MOVEMENT',
    };
  }

  // ------------------------------------------------------------
  // 12. SINGLE SPIKE FILTER
  // ------------------------------------------------------------

  if (
    !sustainedEvent &&
    !extremeAcceleration
  ) {
    state.confidence *= 0.5;
    state.consecutiveAbnormal = 0;
    state.lastRejectTime = now;
    state.detectionState =
      'NORMAL_MOVEMENT';

    return {
      detected: false,
      confidence: state.confidence,
      eventType: 'TRANSIENT_MOTION',
      reason:
        'Single transient movement rejected',
      highConfidence: false,
      detectionState:
        'NORMAL_MOVEMENT',
    };
  }

  // ------------------------------------------------------------
  // 13. MAIN ACCIDENT GATE
  // ------------------------------------------------------------
  //
  // IMPORTANT:
  //
  // We require BOTH:
  //
  //     rapid acceleration
  //            +
  //     rapid rotation
  //
  // This prevents:
  //
  // acceleration alone -> alert
  // rotation alone     -> alert
  //
  // ------------------------------------------------------------

  const accidentPattern =
    rapidAcceleration &&
    rapidRotation &&
    sustainedEvent &&
    rapidChange;

  if (!accidentPattern) {
    state.confidence = Math.min(
      state.confidence * 0.5,
      0.25
    );

    state.consecutiveAbnormal = 0;
    state.detectionState =
      'ANALYZING';

    return {
      detected: false,
      confidence: state.confidence,
      eventType: 'NONE',
      reason:
        'Rapid movement detected, but no complete accident pattern',
      highConfidence: false,
      detectionState:
        'ANALYZING',
    };
  }

  // ------------------------------------------------------------
  // 14. CALCULATE CONFIDENCE
  // ------------------------------------------------------------

  let confidence = 0;

  // Strong acceleration
  if (peakAccel >= EXTREME_ACCEL_THRESHOLD) {
    confidence += 0.40;
  } else {
    confidence += 0.30;
  }

  // Strong rotation
  if (peakRotation >= 6) {
    confidence += 0.30;
  } else {
    confidence += 0.20;
  }

  // Rapid change
  if (rapidChange) {
    confidence += 0.15;
  }

  // Multiple abnormal readings
  if (abnormalCount >= 5) {
    confidence += 0.10;
  }

  // Post-impact stabilization
  if (postImpactStillness) {
    confidence += 0.10;
  }

  confidence =
    Math.max(0, Math.min(1, confidence));

  state.confidence = confidence;

  // ------------------------------------------------------------
  // 15. FINAL CONFIDENCE GATE
  // ------------------------------------------------------------

  if (confidence < 0.75) {
    state.detectionState =
      'ANALYZING';

    return {
      detected: false,
      confidence,
      eventType: 'NONE',
      reason:
        `Strong movement detected but confidence is only ${Math.round(
          confidence * 100
        )}%`,
      highConfidence: false,
      detectionState:
        'ANALYZING',
    };
  }

  // ------------------------------------------------------------
  // 16. ACCIDENT DETECTED
  // ------------------------------------------------------------

  const eventType =
    peakRotation >= 6
      ? 'POSSIBLE_COLLISION'
      : 'POSSIBLE_IMPACT';

  state.detectionState =
    'POSSIBLE_ACCIDENT';

  state.lastDetectionTime = now;
  state.consecutiveAbnormal = 0;

  const highConfidence =
    confidence >= 0.85;

  return {
    detected: true,
    confidence,
    eventType,
    reason:
      `Rapid impact detected — ${peakAccel.toFixed(
        1
      )} m/s² acceleration + ${peakRotation.toFixed(
        1
      )} rad/s rotation`,
    highConfidence,
    detectionState:
      'POSSIBLE_ACCIDENT',
  };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── SensorManager ─────────────────────────────────────────────────

export class SensorManager {
  private readings: SensorReading[] = [];
  private listeners: ((result: SensorDetectionResult) => void)[] = [];
  private stateListeners: ((state: DetectionState, confidence: number) => void)[] = [];
  private lastSampleTime = 0;
  private active = false;
  private liveAx = 0;
  private liveAy = 0;
  private liveAz = 0;
  private liveRx = 0;
  private liveRy = 0;
  private liveRz = 0;
  private liveAccelMag = 0;
  private liveRotMag = 0;
  private internalState: InternalState = makeInternalState();

  private emergencyAudioContext: AudioContext | null = null;
  private emergencyOscillator: OscillatorNode | null = null;
  private emergencyAlertTimer: ReturnType<typeof setTimeout> | null = null;

  isSupported(): boolean {
    return typeof window !== 'undefined' && 'DeviceMotionEvent' in window;
  }

  async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) return false;

    const motionEvent = window.DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> };
    if (typeof motionEvent?.requestPermission === 'function') {
      try {
        const perm = await motionEvent.requestPermission();
        if (perm !== 'granted') return false;
      } catch {
        return false;
      }
    }

    const orientEvent = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
    if (typeof orientEvent?.requestPermission === 'function') {
      try {
        const perm = await orientEvent.requestPermission();
        if (perm !== 'granted') return false;
      } catch {
        /* orientation is optional */
      }
    }

    this.start();
    this.notifyMonitoringStarted();
    return true;
  }
  private notifyMonitoringStarted() {
  // Short vibration on supported devices
  if ('vibrate' in navigator) {
    navigator.vibrate([150, 80, 150]);
  }

  // Short confirmation sound
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & {
        webkitAudioContext?: typeof AudioContext;
      }).webkitAudioContext;

    if (!AudioContextClass) return;

    const audioContext = new AudioContextClass();

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);

    gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.12,
      audioContext.currentTime + 0.02
    );
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      audioContext.currentTime + 0.18
    );

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.2);

    oscillator.onended = () => {
      audioContext.close();
    };
  } catch {
    // Audio is optional; monitoring should continue even if sound fails.
  }
}
startEmergencyAlert() {
  // Vibrate
  if ('vibrate' in navigator) {
    navigator.vibrate([
      500, 200, 500, 200, 500,
      400,
      500, 200, 500, 200, 500
    ]);
  }

  // Emergency sound
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & {
        webkitAudioContext?: typeof AudioContext;
      }).webkitAudioContext;

    if (!AudioContextClass) return;

    const audioContext = new AudioContextClass();

    audioContext.resume().catch(() => {});

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = 'square';

    oscillator.frequency.setValueAtTime(
      700,
      audioContext.currentTime
    );

    oscillator.frequency.linearRampToValueAtTime(
      1100,
      audioContext.currentTime + 0.5
    );

    oscillator.frequency.linearRampToValueAtTime(
      700,
      audioContext.currentTime + 1
    );

    gain.gain.setValueAtTime(
      0.0001,
      audioContext.currentTime
    );

    gain.gain.exponentialRampToValueAtTime(
      0.25,
      audioContext.currentTime + 0.05
    );

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start();

    this.emergencyAudioContext = audioContext;
    this.emergencyOscillator = oscillator;

    this.emergencyAlertTimer = setTimeout(() => {
      this.stopEmergencyAlert();
    }, 10000);

  } catch {
    // Continue monitoring even if audio is unavailable.
  }
}

stopEmergencyAlert() {
  if (this.emergencyAlertTimer) {
    clearTimeout(this.emergencyAlertTimer);
    this.emergencyAlertTimer = null;
  }

  if ('vibrate' in navigator) {
    navigator.vibrate(0);
  }

  try {
    this.emergencyOscillator?.stop();
  } catch {
    // Already stopped.
  }

  this.emergencyOscillator = null;

  if (this.emergencyAudioContext) {
    this.emergencyAudioContext.close().catch(() => {});
    this.emergencyAudioContext = null;
  }
}
  start() {
    if (this.active || !this.isSupported()) return;
    this.active = true;
    this.internalState = makeInternalState();
    window.addEventListener('devicemotion', this.handleMotion, { passive: true });
  }

  stop() {
    if (!this.active) return;
    this.active = false;
    window.removeEventListener('devicemotion', this.handleMotion);
    this.readings = [];
    this.internalState = makeInternalState();
  }

  isActive(): boolean {
    return this.active;
  }

  getLiveValues(): LiveSensorValues {
    return {
      ax: this.liveAx,
      ay: this.liveAy,
      az: this.liveAz,
      rx: this.liveRx,
      ry: this.liveRy,
      rz: this.liveRz,
      accelerationMagnitude: this.liveAccelMag,
      rotationMagnitude: this.liveRotMag,
      active: this.active,
    };
  }

  getDetectionState(): DetectionState {
    return this.internalState.detectionState;
  }

  getConfidence(): number {
    return this.internalState.confidence;
  }

  onDetection(callback: (result: SensorDetectionResult) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  onStateChange(callback: (state: DetectionState, confidence: number) => void) {
    this.stateListeners.push(callback);
    return () => {
      this.stateListeners = this.stateListeners.filter((l) => l !== callback);
    };
  }

  clearReadings() {
    this.readings = [];
    this.internalState = makeInternalState();
  }

  private handleMotion = (event: DeviceMotionEvent) => {
    const now = Date.now();
    if (now - this.lastSampleTime < SENSOR_CONFIG.MIN_SAMPLE_INTERVAL_MS) return;
    this.lastSampleTime = now;

    const acc = event.acceleration || event.accelerationIncludinggravity;
    const rot = event.rotationRate;

    if (!acc) return;

    const ax = acc.x ?? 0;
    const ay = acc.y ?? 0;
    const az = acc.z ?? 0;
    const accelerationMagnitude = Math.sqrt(ax * ax + ay * ay + az * az);

    let rotationMagnitude = 0;
    if (rot) {
      const rx = rot.alpha ?? 0;
      const ry = rot.beta ?? 0;
      const rz = rot.gamma ?? 0;
      rotationMagnitude = Math.sqrt(rx * rx + ry * ry + rz * rz);
    }

    this.liveAx = ax;
    this.liveAy = ay;
    this.liveAz = az;
    this.liveAccelMag = accelerationMagnitude;

    if (rot) {
      this.liveRx = rot.alpha ?? 0;
      this.liveRy = rot.beta ?? 0;
      this.liveRz = rot.gamma ?? 0;
      this.liveRotMag = rotationMagnitude;
    }

    this.readings.push({ accelerationMagnitude, rotationMagnitude, timestamp: now, ax, ay, az, rx: this.liveRx, ry: this.liveRy, rz: this.liveRz });

    if (this.readings.length > 200) {
      this.readings = this.readings.slice(-200);
    }

    if (this.readings.length >= SENSOR_CONFIG.WINDOW_SIZE) {
      const result = analyzeSensorReadings(this.readings, this.internalState, now);

      this.stateListeners.forEach((l) => l(result.detectionState, result.confidence));

      if (result.detected) {
        this.startEmergencyAlert();
        this.listeners.forEach((l) => l(result));
        this.readings = [];
      }
    }
  };
}

let globalSensorManager: SensorManager | null = null;

export function getSensorManager(): SensorManager {
  if (!globalSensorManager) {
    globalSensorManager = new SensorManager();
  }
  return globalSensorManager;
}

// ─── Onboarding state (localStorage) ───────────────────────────────

const ONBOARDING_KEY = 'alertx_sensor_onboarding_v1';
const SENSOR_ENABLED_KEY = 'alertx_sensor_enabled_v1';

export function getOnboardingState(): { completed: boolean; enabled: boolean } {
  try {
    const raw = localStorage.getItem(ONBOARDING_KEY);
    const enabledRaw = localStorage.getItem(SENSOR_ENABLED_KEY);
    return {
      completed: raw === 'done',
      enabled: enabledRaw === 'true',
    };
  } catch {
    return { completed: false, enabled: false };
  }
}

export function setOnboardingCompleted(enabled: boolean) {
  try {
    localStorage.setItem(ONBOARDING_KEY, 'done');
    localStorage.setItem(SENSOR_ENABLED_KEY, enabled ? 'true' : 'false');
  } catch {
    /* ignore */
  }
}

export function setSensorEnabled(enabled: boolean) {
  try {
    localStorage.setItem(SENSOR_ENABLED_KEY, enabled ? 'true' : 'false');
  } catch {
    /* ignore */
  }
}

// ─── Simulated sensor events for demo/test mode ────────────────────

export type SensorTestType =
  | 'TINY_MOVEMENT'
  | 'HAND_MOVEMENT'
  | 'NORMAL_WALKING'
  | 'ROAD_VIBRATION'
  | 'SMALL_ROAD_BUMP'
  | 'SPEED_BREAKER'
  | 'NORMAL_BRAKING'
  | 'NORMAL_TURNING'
  | 'PHONE_SHAKE'
  | 'STRONG_ACCIDENT_PATTERN';

export const SENSOR_TESTS: { type: SensorTestType; label: string; desc: string }[] = [
  { type: 'TINY_MOVEMENT', label: 'Tiny Phone Movement', desc: 'Minimal motion — must NOT trigger' },
  { type: 'HAND_MOVEMENT', label: 'Small Hand Movement', desc: 'Picking up / placing down — must NOT trigger' },
  { type: 'NORMAL_WALKING', label: 'Normal Walking', desc: 'Pocket walking motion — must NOT trigger' },
  { type: 'ROAD_VIBRATION', label: 'Normal Road Vibration', desc: 'Engine + road noise — must NOT trigger' },
  { type: 'SMALL_ROAD_BUMP', label: 'Small Road Bump', desc: 'Isolated low spike — must NOT trigger' },
  { type: 'SPEED_BREAKER', label: 'Speed Breaker', desc: 'Brief vertical jolt — must NOT trigger' },
  { type: 'NORMAL_BRAKING', label: 'Normal Braking', desc: 'Deceleration without rotation — must NOT trigger' },
  { type: 'NORMAL_TURNING', label: 'Normal Turning', desc: 'Rotation without impact — must NOT trigger' },
  { type: 'PHONE_SHAKE', label: 'Brief Phone Shake', desc: 'Short shake, motion resumes — must NOT trigger' },
  { type: 'STRONG_ACCIDENT_PATTERN', label: 'Strong Accident Pattern', desc: 'Impact + rotation + stillness — SHOULD trigger' },
];

export function simulateSensorEvent(
  _manager: SensorManager,
  type: SensorTestType,
): SensorDetectionResult {
  const readings: SensorReading[] = [];
  const now = Date.now();
  const ts = (i: number) => now - (60 - i) * 16;

  switch (type) {
    case 'TINY_MOVEMENT': {
      for (let i = 0; i < 60; i++) {
        readings.push({ accelerationMagnitude: 9.8 + (Math.random() - 0.5) * 1.5, rotationMagnitude: 0.1 + Math.random() * 0.3, timestamp: ts(i) });
      }
      break;
    }
    case 'HAND_MOVEMENT': {
      for (let i = 0; i < 60; i++) {
        readings.push({ accelerationMagnitude: 9.5 + Math.random() * 3, rotationMagnitude: 0.2 + Math.random() * 0.8, timestamp: ts(i) });
      }
      break;
    }
    case 'NORMAL_WALKING': {
      for (let i = 0; i < 60; i++) {
        const step = Math.sin(i * 0.5) * 2;
        readings.push({ accelerationMagnitude: 10 + step + Math.random() * 2, rotationMagnitude: 0.3 + Math.random() * 0.6, timestamp: ts(i) });
      }
      break;
    }
    case 'ROAD_VIBRATION': {
      for (let i = 0; i < 60; i++) {
        readings.push({ accelerationMagnitude: 9.8 + Math.random() * 2, rotationMagnitude: 0.1 + Math.random() * 0.4, timestamp: ts(i) });
      }
      break;
    }
    case 'SMALL_ROAD_BUMP': {
      for (let i = 0; i < 60; i++) {
        const isBump = i === 30;
        readings.push({
          accelerationMagnitude: isBump ? 16 + Math.random() * 2 : 9.8 + Math.random() * 1.5,
          rotationMagnitude: isBump ? 0.8 : 0.2 + Math.random() * 0.3,
          timestamp: ts(i),
        });
      }
      break;
    }
    case 'SPEED_BREAKER': {
      for (let i = 0; i < 60; i++) {
        const isBreaker = i >= 29 && i <= 31;
        readings.push({
          accelerationMagnitude: isBreaker ? 18 + Math.random() * 2 : 10 + Math.random() * 1.5,
          rotationMagnitude: isBreaker ? 1.0 : 0.2 + Math.random() * 0.3,
          timestamp: ts(i),
        });
      }
      break;
    }
    case 'NORMAL_BRAKING': {
      for (let i = 0; i < 60; i++) {
        const isBraking = i >= 28 && i <= 33;
        readings.push({
          accelerationMagnitude: isBraking ? 13 + Math.random() * 2 : 10 + Math.random() * 1.5,
          rotationMagnitude: 0.2 + Math.random() * 0.4,
          timestamp: ts(i),
        });
      }
      break;
    }
    case 'NORMAL_TURNING': {
      for (let i = 0; i < 60; i++) {
        const isTurning = i >= 28 && i <= 33;
        readings.push({
          accelerationMagnitude: 10 + Math.random() * 1.5,
          rotationMagnitude: isTurning ? 1.8 + Math.random() * 0.4 : 0.2 + Math.random() * 0.3,
          timestamp: ts(i),
        });
      }
      break;
    }
    case 'PHONE_SHAKE': {
      for (let i = 0; i < 60; i++) {
        const isShake = i >= 28 && i <= 32;
        readings.push({
          accelerationMagnitude: isShake ? 20 + Math.random() * 3 : 10 + Math.random() * 2,
          rotationMagnitude: isShake ? 2.5 + Math.random() * 0.8 : 0.3 + Math.random() * 0.5,
          timestamp: ts(i),
        });
      }
      break;
    }
    case 'STRONG_ACCIDENT_PATTERN': {
      for (let i = 0; i < 60; i++) {
        let accel: number;
        let rot: number;
        if (i < 28) {
          accel = 10 + Math.random() * 1.5;
          rot = 0.2 + Math.random() * 0.3;
        } else if (i >= 28 && i <= 32) {
          accel = 42 + Math.random() * 5;
          rot = 6.5 + Math.random() * 1.5;
        } else {
          accel = 1.5 + Math.random() * 0.8;
          rot = 0.1 + Math.random() * 0.2;
        }
        readings.push({ accelerationMagnitude: accel, rotationMagnitude: rot, timestamp: ts(i) });
      }
      break;
    }
  }

  const simState = makeInternalState();
  return analyzeSensorReadings(readings, simState, now);
}

// TEMPORARY MAC AUDIO TEST
export function testEmergencySound() {
  const AudioContextClass =
    window.AudioContext ||
    (window as typeof window & {
      webkitAudioContext?: typeof AudioContext;
    }).webkitAudioContext;

  if (!AudioContextClass) {
    console.log('AudioContext is not supported');
    return;
  }

  const audioContext = new AudioContextClass();

  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.type = 'square';

  oscillator.frequency.setValueAtTime(
    700,
    audioContext.currentTime
  );

  oscillator.frequency.linearRampToValueAtTime(
    1100,
    audioContext.currentTime + 0.5
  );

  oscillator.frequency.linearRampToValueAtTime(
    700,
    audioContext.currentTime + 1
  );

  gain.gain.setValueAtTime(
    0.2,
    audioContext.currentTime
  );

  oscillator.connect(gain);
  gain.connect(audioContext.destination);

  oscillator.start();

  setTimeout(() => {
    oscillator.stop();
    audioContext.close();
  }, 5000);
}
