import type {
  SensorReading,
  SensorDetectionResult,
  LiveSensorValues,
  DetectionState,
} from '@/types';

/**
 * ALERTX SENSOR ENGINE
 *
 * Strict automatic accident detection.
 *
 * Design goal:
 * Prevent false positives from:
 * - walking
 * - running
 * - phone movement
 * - phone drops
 * - normal road vibration
 * - speed breakers
 * - small bumps
 * - normal braking
 * - normal turning
 * - brief phone shaking
 *
 * A real automatic detection requires a strong multi-signal
 * accident pattern rather than a single sensor spike.
 */

// ============================================================
// SENSOR CONFIGURATION
// ============================================================

export const SENSOR_CONFIG = {
  /*
   * Small movements below these values are treated as noise.
   */
  ACCEL_DEAD_ZONE: 20,
  ROTATION_DEAD_ZONE: 4,

  /*
   * STRICT IMPACT THRESHOLDS
   *
   * These are intentionally high to reduce false positives.
   */
  IMPACT_ACCEL_THRESHOLD: 42,
  SIGNIFICANT_ROTATION_THRESHOLD: 7,

  /*
   * After a possible impact, the device should become
   * relatively still.
   */
  POST_IMPACT_STILL_THRESHOLD: 12,

  /*
   * Detection window.
   */
  WINDOW_SIZE: 45,

  /*
   * Number of abnormal samples required.
   */
  MIN_CONSECUTIVE_ABNORMAL: 5,

  /*
   * Stronger confidence gate.
   */
  MIN_CONFIDENCE: 0.85,

  /*
   * High confidence requires an extremely strong pattern.
   */
  HIGH_CONFIDENCE_THRESHOLD: 0.95,

  /*
   * Confidence behaviour.
   */
  CONFIDENCE_DECAY_RATE: 0.75,

  /*
   * These are retained for compatibility with the rest
   * of the AlertX application.
   */
  CONFIDENCE_BOOST_IMPACT: 0.4,
  CONFIDENCE_BOOST_ROTATION: 0.3,
  CONFIDENCE_BOOST_STILLNESS: 0.3,

  CONFIDENCE_PENALTY_NO_ROTATION: 0.12,
  CONFIDENCE_PENALTY_CONTINUED_MOVEMENT: 0.2,

  /*
   * Detection cooldowns.
   */
  COOLDOWN_MS: 15000,
  REJECT_COOLDOWN_MS: 4000,

  /*
   * Sensor calibration.
   */
  BASELINE_SAMPLES: 30,
  BASELINE_ADAPT_RATE: 0.02,

  /*
   * Maximum sampling frequency.
   */
  MIN_SAMPLE_INTERVAL_MS: 16,
} as const;

// ============================================================
// INTERNAL STATE
// ============================================================

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

// ============================================================
// SENSOR ANALYSIS
// ============================================================

export function analyzeSensorReadings(
  readings: SensorReading[],
  state: InternalState = makeInternalState(),
  now: number = Date.now(),
): SensorDetectionResult {
  // ----------------------------------------------------------
  // NOT ENOUGH DATA
  // ----------------------------------------------------------

  if (
    readings.length <
    SENSOR_CONFIG.WINDOW_SIZE
  ) {
    return {
      detected: false,
      confidence: 0,
      eventType: 'NONE',
      reason: 'Collecting sensor data',
      highConfidence: false,
      detectionState: 'MONITORING',
    };
  }

  const window = readings.slice(
    -SENSOR_CONFIG.WINDOW_SIZE,
  );

  // ==========================================================
  // CALIBRATION
  // ==========================================================

  const calibrationSamples = Math.min(
    window.length,
    SENSOR_CONFIG.BASELINE_SAMPLES,
  );

  const calibrationWindow = window.slice(
    -calibrationSamples,
  );

  const avgAccel =
    calibrationWindow.reduce(
      (sum, reading) =>
        sum + reading.accelerationMagnitude,
      0,
    ) / calibrationWindow.length;

  const avgRotation =
    calibrationWindow.reduce(
      (sum, reading) =>
        sum + reading.rotationMagnitude,
      0,
    ) / calibrationWindow.length;

  if (
    state.baselineSamples <
    SENSOR_CONFIG.BASELINE_SAMPLES
  ) {
    state.baselineAccelSum += avgAccel;
    state.baselineRotationSum += avgRotation;

    state.baselineSamples += 1;

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
      reason:
        'Calibrating sensors — normal movement ignored',
      highConfidence: false,
      detectionState: 'MONITORING',
    };
  }

  // ==========================================================
  // STRICT DETECTION THRESHOLDS
  // ==========================================================

  /*
   * A normal bump may create a short acceleration spike.
   *
   * Therefore:
   *
   * 20-30 m/s²  -> normal / suspicious movement
   * 30-42 m/s²  -> strong movement but not enough
   * 42+ m/s²    -> possible severe impact
   */

  const RAPID_ACCEL_THRESHOLD = 42;

  /*
   * Extreme acceleration is intentionally very high.
   */
  const EXTREME_ACCEL_THRESHOLD = 50;

  /*
   * Rotation must also be significant.
   */
  const RAPID_ROTATION_THRESHOLD = 7;

  /*
   * Very strong rotation.
   */
  const EXTREME_ROTATION_THRESHOLD = 10;

  /*
   * Acceleration must change rapidly.
   */
  const RAPID_CHANGE_THRESHOLD = 18;

  /*
   * Require at least five abnormal samples.
   */
  const REQUIRED_ABNORMAL_READINGS = 5;

  /*
   * Require multiple consecutive abnormal readings.
   */
  const REQUIRED_CONSECUTIVE_READINGS = 5;

  // ==========================================================
  // FIND PEAK ACCELERATION
  // ==========================================================

  let peakAccel = 0;
  let peakIndex = 0;

  for (
    let i = 0;
    i < window.length;
    i += 1
  ) {
    const value =
      window[i].accelerationMagnitude;

    if (value > peakAccel) {
      peakAccel = value;
      peakIndex = i;
    }
  }

  // ==========================================================
  // FIND ROTATION AROUND IMPACT
  // ==========================================================

  const rotationStart = Math.max(
    0,
    peakIndex - 6,
  );

  const rotationEnd = Math.min(
    window.length,
    peakIndex + 8,
  );

  let peakRotation = 0;

  for (
    let i = rotationStart;
    i < rotationEnd;
    i += 1
  ) {
    const value =
      window[i].rotationMagnitude;

    if (value > peakRotation) {
      peakRotation = value;
    }
  }

  // ==========================================================
  // ACCELERATION CHECK
  // ==========================================================

  const rapidAcceleration =
    peakAccel >=
    RAPID_ACCEL_THRESHOLD;

  const extremeAcceleration =
    peakAccel >=
    EXTREME_ACCEL_THRESHOLD;

  // ==========================================================
  // ROTATION CHECK
  // ==========================================================

  const rapidRotation =
    peakRotation >=
    RAPID_ROTATION_THRESHOLD;

  const extremeRotation =
    peakRotation >=
    EXTREME_ROTATION_THRESHOLD;

  // ==========================================================
  // ABNORMAL SAMPLE COUNT
  // ==========================================================

  let abnormalCount = 0;

  for (const reading of window) {
    const abnormal =
      reading.accelerationMagnitude >=
        RAPID_ACCEL_THRESHOLD &&
      reading.rotationMagnitude >=
        RAPID_ROTATION_THRESHOLD;

    if (abnormal) {
      abnormalCount += 1;
    }
  }

  const sustainedEvent =
    abnormalCount >=
    REQUIRED_ABNORMAL_READINGS;

  // ==========================================================
  // CONSECUTIVE ABNORMAL READINGS
  // ==========================================================

  let longestConsecutive = 0;
  let currentConsecutive = 0;

  for (const reading of window) {
    const abnormal =
      reading.accelerationMagnitude >=
        RAPID_ACCEL_THRESHOLD &&
      reading.rotationMagnitude >=
        RAPID_ROTATION_THRESHOLD;

    if (abnormal) {
      currentConsecutive += 1;

      if (
        currentConsecutive >
        longestConsecutive
      ) {
        longestConsecutive =
          currentConsecutive;
      }
    } else {
      currentConsecutive = 0;
    }
  }

  const sustainedConsecutive =
    longestConsecutive >=
    REQUIRED_CONSECUTIVE_READINGS;

  // ==========================================================
  // RAPID ACCELERATION CHANGE
  // ==========================================================

  let rapidChange = false;

  if (peakIndex > 0) {
    const beforeIndex =
      Math.max(
        0,
        peakIndex - 4,
      );

    const before =
      window[beforeIndex]
        .accelerationMagnitude;

    const increase =
      peakAccel - before;

    rapidChange =
      increase >=
      RAPID_CHANGE_THRESHOLD;
  }

  // ==========================================================
  // POST-IMPACT STILLNESS
  // ==========================================================

  /*
   * Look at the samples after the peak.
   *
   * A real accident pattern should generally be followed
   * by a strong reduction in movement.
   */

  const postImpact = window.slice(
    peakIndex + 1,
  );

  let postImpactStillness = false;

  if (postImpact.length >= 8) {
    const stillWindow =
      postImpact.slice(0, 12);

    const postAverage =
      stillWindow.reduce(
        (sum, reading) =>
          sum +
          reading.accelerationMagnitude,
        0,
      ) /
      stillWindow.length;

    const postRotationAverage =
      stillWindow.reduce(
        (sum, reading) =>
          sum +
          reading.rotationMagnitude,
        0,
      ) /
      stillWindow.length;

    postImpactStillness =
      postAverage <=
        SENSOR_CONFIG.POST_IMPACT_STILL_THRESHOLD &&
      postRotationAverage <= 3;
  }

  // ==========================================================
  // COOLDOWN
  // ==========================================================

  const inRejectCooldown =
    now -
      state.lastRejectTime <
    SENSOR_CONFIG.REJECT_COOLDOWN_MS;

  const inDetectionCooldown =
    now -
      state.lastDetectionTime <
    SENSOR_CONFIG.COOLDOWN_MS;

  if (
    inRejectCooldown ||
    inDetectionCooldown
  ) {
    return {
      detected: false,
      confidence:
        state.confidence,
      eventType: 'NONE',
      reason:
        'Detection cooldown active',
      highConfidence: false,
      detectionState:
        state.detectionState,
    };
  }

  // ==========================================================
  // NORMAL MOVEMENT
  // ==========================================================

  if (
    !rapidAcceleration &&
    !rapidRotation
  ) {
    state.confidence *=
      SENSOR_CONFIG.CONFIDENCE_DECAY_RATE;

    if (
      state.confidence < 0.02
    ) {
      state.confidence = 0;

      state.detectionState =
        'NORMAL_MOVEMENT';
    }

    state.consecutiveAbnormal = 0;

    return {
      detected: false,
      confidence:
        state.confidence,
      eventType: 'NONE',
      reason:
        'Normal movement — no severe impact detected',
      highConfidence: false,
      detectionState:
        state.confidence > 0
          ? state.detectionState
          : 'NORMAL_MOVEMENT',
    };
  }

  // ==========================================================
  // STRONG MOVEMENT BUT NOT ENOUGH FOR ACCIDENT
  // ==========================================================

  /*
   * This catches:
   *
   * - phone shaking
   * - running
   * - road bumps
   * - speed breakers
   * - phone drops
   * - hard braking
   */

  if (
    !rapidAcceleration ||
    !rapidRotation
  ) {
    state.confidence *= 0.35;

    state.consecutiveAbnormal = 0;
    state.lastRejectTime = now;

    state.detectionState =
      'NORMAL_MOVEMENT';

    return {
      detected: false,
      confidence:
        state.confidence,
      eventType:
        rapidAcceleration
          ? 'TRANSIENT_MOTION'
          : 'NONE',
      reason:
        'Strong movement detected, but acceleration + rotation combination is insufficient',
      highConfidence: false,
      detectionState:
        'NORMAL_MOVEMENT',
    };
  }

  // ==========================================================
  // SINGLE SPIKE FILTER
  // ==========================================================

  if (
    !sustainedEvent ||
    !sustainedConsecutive
  ) {
    state.confidence *= 0.25;

    state.consecutiveAbnormal = 0;
    state.lastRejectTime = now;

    state.detectionState =
      'NORMAL_MOVEMENT';

    return {
      detected: false,
      confidence:
        state.confidence,
      eventType:
        'TRANSIENT_MOTION',
      reason:
        'Short impact spike rejected — insufficient sustained abnormal motion',
      highConfidence: false,
      detectionState:
        'NORMAL_MOVEMENT',
    };
  }

  // ==========================================================
  // ACCIDENT SIGNAL SCORING
  // ==========================================================

  /*
   * Instead of trusting a single condition, AlertX requires
   * multiple independent accident signals.
   */

  let accidentSignals = 0;

  // Signal 1: strong acceleration
  if (rapidAcceleration) {
    accidentSignals += 1;
  }

  // Signal 2: extreme acceleration
  if (extremeAcceleration) {
    accidentSignals += 1;
  }

  // Signal 3: strong rotation
  if (rapidRotation) {
    accidentSignals += 1;
  }

  // Signal 4: extreme rotation
  if (extremeRotation) {
    accidentSignals += 1;
  }

  // Signal 5: rapid acceleration change
  if (rapidChange) {
    accidentSignals += 1;
  }

  // Signal 6: sustained event
  if (sustainedEvent) {
    accidentSignals += 1;
  }

  // Signal 7: post-impact stillness
  if (postImpactStillness) {
    accidentSignals += 1;
  }

  // ==========================================================
  // STRICT ACCIDENT GATE
  // ==========================================================

  /*
   * Require at least FIVE independent signals.
   *
   * This is deliberately strict.
   */

  const accidentPattern =
    accidentSignals >= 5 &&
    rapidAcceleration &&
    rapidRotation &&
    sustainedEvent &&
    sustainedConsecutive &&
    rapidChange &&
    postImpactStillness;

  if (!accidentPattern) {
    state.confidence =
      Math.min(
        state.confidence * 0.35,
        0.4,
      );

    state.consecutiveAbnormal = 0;
    state.detectionState =
      'ANALYZING';

    return {
      detected: false,
      confidence:
        state.confidence,
      eventType: 'NONE',
      reason:
        `Strong motion detected, but only ${accidentSignals}/7 accident signals confirmed`,
      highConfidence: false,
      detectionState:
        'ANALYZING',
    };
  }

  // ==========================================================
  // CONFIDENCE CALCULATION
  // ==========================================================

  let confidence = 0;

  // Acceleration
  if (extremeAcceleration) {
    confidence += 0.22;
  } else {
    confidence += 0.16;
  }

  // Rotation
  if (extremeRotation) {
    confidence += 0.18;
  } else {
    confidence += 0.14;
  }

  // Rapid change
  if (rapidChange) {
    confidence += 0.16;
  }

  // Sustained acceleration
  if (sustainedEvent) {
    confidence += 0.12;
  }

  // Sustained consecutive readings
  if (sustainedConsecutive) {
    confidence += 0.08;
  }

  // Post-impact stillness
  if (postImpactStillness) {
    confidence += 0.12;
  }

  // Additional strength for extreme events
  if (
    extremeAcceleration &&
    extremeRotation
  ) {
    confidence += 0.08;
  }

  confidence =
    Math.max(
      0,
      Math.min(
        1,
        confidence,
      ),
    );

  state.confidence =
    confidence;

  // ==========================================================
  // FINAL CONFIDENCE GATE
  // ==========================================================

  if (
    confidence <
    SENSOR_CONFIG.MIN_CONFIDENCE
  ) {
    state.detectionState =
      'ANALYZING';

    state.lastRejectTime = now;

    return {
      detected: false,
      confidence,
      eventType: 'NONE',
      reason:
        `Accident-like pattern detected, but confidence is only ${Math.round(
          confidence * 100,
        )}% — automatic report rejected`,
      highConfidence: false,
      detectionState:
        'ANALYZING',
    };
  }

  // ==========================================================
  // ACCIDENT CONFIRMED
  // ==========================================================

  const eventType =
    peakRotation >=
    SENSOR_CONFIG.SIGNIFICANT_ROTATION_THRESHOLD
      ? 'POSSIBLE_COLLISION'
      : 'POSSIBLE_IMPACT';

  state.detectionState =
    'POSSIBLE_ACCIDENT';

  state.lastDetectionTime =
    now;

  state.consecutiveAbnormal = 0;

  const highConfidence =
    confidence >=
    SENSOR_CONFIG.HIGH_CONFIDENCE_THRESHOLD;

  return {
    detected: true,
    confidence,

    eventType,

    reason:
      `Severe accident pattern confirmed — ${peakAccel.toFixed(
        1,
      )} m/s² acceleration + ${peakRotation.toFixed(
        1,
      )} rad/s rotation + sustained impact + post-impact stillness`,

    highConfidence,

    detectionState:
      'POSSIBLE_ACCIDENT',
  };
}

// ============================================================
// SENSOR MANAGER
// ============================================================

export class SensorManager {
  private readings: SensorReading[] = [];

  private listeners: Array<
    (
      result: SensorDetectionResult,
    ) => void
  > = [];

  private stateListeners: Array<
    (
      state: DetectionState,
      confidence: number,
    ) => void
  > = [];

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

  private internalState: InternalState =
    makeInternalState();

  private emergencyAudioContext:
    AudioContext | null = null;

  private emergencyOscillator:
    OscillatorNode | null = null;

  private emergencyAlertTimer:
    ReturnType<typeof setTimeout> | null = null;

  // ==========================================================
  // SUPPORT
  // ==========================================================

  isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'DeviceMotionEvent' in window
    );
  }

  // ==========================================================
  // PERMISSION
  // ==========================================================

  async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) {
      return false;
    }

    const motionEvent =
      window.DeviceMotionEvent as typeof DeviceMotionEvent & {
        requestPermission?: () => Promise<
          'granted' | 'denied' | 'default'
        >;
      };

    if (
      typeof motionEvent.requestPermission ===
      'function'
    ) {
      try {
        const permission =
          await motionEvent.requestPermission();

        if (
          permission !== 'granted'
        ) {
          return false;
        }
      } catch {
        return false;
      }
    }

    const orientationEvent =
      window.DeviceOrientationEvent as typeof DeviceOrientationEvent & {
        requestPermission?: () => Promise<
          'granted' | 'denied' | 'default'
        >;
      };

    if (
      typeof orientationEvent.requestPermission ===
      'function'
    ) {
      try {
        await orientationEvent.requestPermission();
      } catch {
        // Orientation permission is optional.
      }
    }

    this.start();

    this.notifyMonitoringStarted();

    return true;
  }

  // ==========================================================
  // MONITORING START SOUND
  // ==========================================================

  private notifyMonitoringStarted(): void {
    if (
      typeof navigator !== 'undefined' &&
      'vibrate' in navigator
    ) {
      navigator.vibrate([
        150,
        80,
        150,
      ]);
    }

    if (
      typeof window === 'undefined'
    ) {
      return;
    }

    try {
      const AudioContextClass =
        window.AudioContext ||
        (
          window as typeof window & {
            webkitAudioContext?: typeof AudioContext;
          }
        ).webkitAudioContext;

      if (!AudioContextClass) {
        return;
      }

      const audioContext =
        new AudioContextClass();

      const oscillator =
        audioContext.createOscillator();

      const gain =
        audioContext.createGain();

      oscillator.type = 'sine';

      oscillator.frequency.setValueAtTime(
        880,
        audioContext.currentTime,
      );

      gain.gain.setValueAtTime(
        0.0001,
        audioContext.currentTime,
      );

      gain.gain.exponentialRampToValueAtTime(
        0.12,
        audioContext.currentTime + 0.02,
      );

      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        audioContext.currentTime + 0.18,
      );

      oscillator.connect(gain);

      gain.connect(
        audioContext.destination,
      );

      oscillator.start();

      oscillator.stop(
        audioContext.currentTime + 0.2,
      );

      oscillator.onended = () => {
        audioContext
          .close()
          .catch(() => {});
      };
    } catch {
      // Audio is optional.
    }
  }

  // ==========================================================
  // EMERGENCY ALERT
  // ==========================================================

  startEmergencyAlert(): void {
    if (
      typeof navigator !== 'undefined' &&
      'vibrate' in navigator
    ) {
      navigator.vibrate([
        500,
        200,
        500,
        200,
        500,
        400,
        500,
        200,
        500,
        200,
        500,
      ]);
    }

    if (
      typeof window === 'undefined'
    ) {
      return;
    }

    try {
      this.stopEmergencyAlert();

      const AudioContextClass =
        window.AudioContext ||
        (
          window as typeof window & {
            webkitAudioContext?: typeof AudioContext;
          }
        ).webkitAudioContext;

      if (!AudioContextClass) {
        return;
      }

      const audioContext =
        new AudioContextClass();

      audioContext
        .resume()
        .catch(() => {});

      const oscillator =
        audioContext.createOscillator();

      const gain =
        audioContext.createGain();

      oscillator.type = 'square';

      oscillator.frequency.setValueAtTime(
        700,
        audioContext.currentTime,
      );

      oscillator.frequency.linearRampToValueAtTime(
        1100,
        audioContext.currentTime + 0.5,
      );

      oscillator.frequency.linearRampToValueAtTime(
        700,
        audioContext.currentTime + 1,
      );

      gain.gain.setValueAtTime(
        0.0001,
        audioContext.currentTime,
      );

      gain.gain.exponentialRampToValueAtTime(
        0.25,
        audioContext.currentTime + 0.05,
      );

      oscillator.connect(gain);

      gain.connect(
        audioContext.destination,
      );

      oscillator.start();

      this.emergencyAudioContext =
        audioContext;

      this.emergencyOscillator =
        oscillator;

      this.emergencyAlertTimer =
        setTimeout(() => {
          this.stopEmergencyAlert();
        }, 10000);
    } catch {
      // Continue without audio.
    }
  }

  // ==========================================================
  // STOP EMERGENCY ALERT
  // ==========================================================

  stopEmergencyAlert(): void {
    if (
      this.emergencyAlertTimer !== null
    ) {
      clearTimeout(
        this.emergencyAlertTimer,
      );

      this.emergencyAlertTimer = null;
    }

    if (
      typeof navigator !== 'undefined' &&
      'vibrate' in navigator
    ) {
      navigator.vibrate(0);
    }

    try {
      if (
        this.emergencyOscillator
      ) {
        this.emergencyOscillator.stop();
      }
    } catch {
      // Already stopped.
    }

    this.emergencyOscillator =
      null;

    if (
      this.emergencyAudioContext
    ) {
      this.emergencyAudioContext
        .close()
        .catch(() => {});

      this.emergencyAudioContext =
        null;
    }
  }

  // ==========================================================
  // START SENSOR
  // ==========================================================

  start(): void {
    if (
      this.active ||
      !this.isSupported()
    ) {
      return;
    }

    this.active = true;

    this.readings = [];

    this.internalState =
      makeInternalState();

    window.addEventListener(
      'devicemotion',
      this.handleMotion,
      {
        passive: true,
      },
    );
  }

  // ==========================================================
  // STOP SENSOR
  // ==========================================================

  stop(): void {
    if (!this.active) {
      return;
    }

    this.active = false;

    window.removeEventListener(
      'devicemotion',
      this.handleMotion,
    );

    this.readings = [];

    this.internalState =
      makeInternalState();

    this.stopEmergencyAlert();
  }

  // ==========================================================
  // ACTIVE STATE
  // ==========================================================

  isActive(): boolean {
    return this.active;
  }

  // ==========================================================
  // LIVE SENSOR VALUES
  // ==========================================================

  getLiveValues(): LiveSensorValues {
    return {
      ax: this.liveAx,
      ay: this.liveAy,
      az: this.liveAz,

      rx: this.liveRx,
      ry: this.liveRy,
      rz: this.liveRz,

      accelerationMagnitude:
        this.liveAccelMag,

      rotationMagnitude:
        this.liveRotMag,

      active: this.active,
    };
  }

  // ==========================================================
  // DETECTION STATE
  // ==========================================================

  getDetectionState(): DetectionState {
    return this.internalState
      .detectionState;
  }

  // ==========================================================
  // CONFIDENCE
  // ==========================================================

  getConfidence(): number {
    return this.internalState
      .confidence;
  }

  // ==========================================================
  // DETECTION LISTENER
  // ==========================================================

  onDetection(
    callback: (
      result: SensorDetectionResult,
    ) => void,
  ): () => void {
    this.listeners.push(
      callback,
    );

    return () => {
      this.listeners =
        this.listeners.filter(
          (listener) =>
            listener !== callback,
        );
    };
  }

  // ==========================================================
  // STATE LISTENER
  // ==========================================================

  onStateChange(
    callback: (
      state: DetectionState,
      confidence: number,
    ) => void,
  ): () => void {
    this.stateListeners.push(
      callback,
    );

    return () => {
      this.stateListeners =
        this.stateListeners.filter(
          (listener) =>
            listener !== callback,
        );
    };
  }

  // ==========================================================
  // CLEAR READINGS
  // ==========================================================

  clearReadings(): void {
    this.readings = [];

    this.internalState =
      makeInternalState();
  }

  // ==========================================================
  // DEVICE MOTION HANDLER
  // ==========================================================

  private handleMotion = (
    event: DeviceMotionEvent,
  ): void => {
    const now = Date.now();

    if (
      now -
        this.lastSampleTime <
      SENSOR_CONFIG.MIN_SAMPLE_INTERVAL_MS
    ) {
      return;
    }

    this.lastSampleTime =
      now;

    const acceleration =
      event.accelerationIncludingGravity ??
      event.acceleration;

    if (!acceleration) {
      return;
    }

    const ax =
      acceleration.x ?? 0;

    const ay =
      acceleration.y ?? 0;

    const az =
      acceleration.z ?? 0;

    const accelerationMagnitude =
      Math.sqrt(
        ax * ax +
          ay * ay +
          az * az,
      );

    const rotation =
      event.rotationRate;

    let rx = 0;
    let ry = 0;
    let rz = 0;

    if (rotation) {
      rx =
        rotation.alpha ?? 0;

      ry =
        rotation.beta ?? 0;

      rz =
        rotation.gamma ?? 0;
    }

    const rotationMagnitude =
      Math.sqrt(
        rx * rx +
          ry * ry +
          rz * rz,
      );

    // --------------------------------------------------------
    // LIVE VALUES
    // --------------------------------------------------------

    this.liveAx = ax;
    this.liveAy = ay;
    this.liveAz = az;

    this.liveRx = rx;
    this.liveRy = ry;
    this.liveRz = rz;

    this.liveAccelMag =
      accelerationMagnitude;

    this.liveRotMag =
      rotationMagnitude;

    // --------------------------------------------------------
    // READING
    // --------------------------------------------------------

    const reading: SensorReading = {
      accelerationMagnitude,
      rotationMagnitude,

      timestamp: now,

      ax,
      ay,
      az,

      rx,
      ry,
      rz,
    };

    this.readings.push(
      reading,
    );

    // --------------------------------------------------------
    // LIMIT MEMORY
    // --------------------------------------------------------

    if (
      this.readings.length >
      200
    ) {
      this.readings =
        this.readings.slice(
          -200,
        );
    }

    // --------------------------------------------------------
    // WAIT FOR WINDOW
    // --------------------------------------------------------

    if (
      this.readings.length <
      SENSOR_CONFIG.WINDOW_SIZE
    ) {
      return;
    }

    // --------------------------------------------------------
    // ANALYZE
    // --------------------------------------------------------

    const result =
      analyzeSensorReadings(
        this.readings,
        this.internalState,
        now,
      );

    // --------------------------------------------------------
    // STATE LISTENERS
    // --------------------------------------------------------

    this.stateListeners.forEach(
      (listener) => {
        try {
          listener(
            result.detectionState,
            result.confidence,
          );
        } catch (error) {
          console.error(
            'Sensor state listener error:',
            error,
          );
        }
      },
    );

    // --------------------------------------------------------
    // DETECTION
    // --------------------------------------------------------

    if (result.detected) {
      this.startEmergencyAlert();

      this.listeners.forEach(
        (listener) => {
          try {
            listener(result);
          } catch (error) {
            console.error(
              'Sensor detection listener error:',
              error,
            );
          }
        },
      );

      /*
       * Start a completely new window after a confirmed
       * detection.
       */
      this.readings = [];
    }
  };
}

// ============================================================
// GLOBAL SENSOR MANAGER
// ============================================================

let globalSensorManager:
  SensorManager | null = null;

export function getSensorManager(): SensorManager {
  if (
    !globalSensorManager
  ) {
    globalSensorManager =
      new SensorManager();
  }

  return globalSensorManager;
}

// ============================================================
// ONBOARDING
// ============================================================

const ONBOARDING_KEY =
  'alertx_sensor_onboarding_v1';

const SENSOR_ENABLED_KEY =
  'alertx_sensor_enabled_v1';

export function getOnboardingState(): {
  completed: boolean;
  enabled: boolean;
} {
  try {
    const onboarding =
      localStorage.getItem(
        ONBOARDING_KEY,
      );

    const enabled =
      localStorage.getItem(
        SENSOR_ENABLED_KEY,
      );

    return {
      completed:
        onboarding === 'done',

      enabled:
        enabled === 'true',
    };
  } catch {
    return {
      completed: false,
      enabled: false,
    };
  }
}

export function setOnboardingCompleted(
  enabled: boolean,
): void {
  try {
    localStorage.setItem(
      ONBOARDING_KEY,
      'done',
    );

    localStorage.setItem(
      SENSOR_ENABLED_KEY,
      enabled
        ? 'true'
        : 'false',
    );
  } catch {
    // Ignore storage errors.
  }
}

export function setSensorEnabled(
  enabled: boolean,
): void {
  try {
    localStorage.setItem(
      SENSOR_ENABLED_KEY,
      enabled
        ? 'true'
        : 'false',
    );
  } catch {
    // Ignore storage errors.
  }
}

// ============================================================
// SENSOR TEST TYPES
// ============================================================

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

export const SENSOR_TESTS: {
  type: SensorTestType;
  label: string;
  desc: string;
}[] = [
  {
    type: 'TINY_MOVEMENT',
    label: 'Tiny Phone Movement',
    desc: 'Minimal motion — must NOT trigger',
  },
  {
    type: 'HAND_MOVEMENT',
    label: 'Small Hand Movement',
    desc: 'Picking up / placing down — must NOT trigger',
  },
  {
    type: 'NORMAL_WALKING',
    label: 'Normal Walking',
    desc: 'Pocket walking motion — must NOT trigger',
  },
  {
    type: 'ROAD_VIBRATION',
    label: 'Normal Road Vibration',
    desc: 'Engine + road noise — must NOT trigger',
  },
  {
    type: 'SMALL_ROAD_BUMP',
    label: 'Small Road Bump',
    desc: 'Isolated low spike — must NOT trigger',
  },
  {
    type: 'SPEED_BREAKER',
    label: 'Speed Breaker',
    desc: 'Brief vertical jolt — must NOT trigger',
  },
  {
    type: 'NORMAL_BRAKING',
    label: 'Normal Braking',
    desc: 'Deceleration without rotation — must NOT trigger',
  },
  {
    type: 'NORMAL_TURNING',
    label: 'Normal Turning',
    desc: 'Rotation without impact — must NOT trigger',
  },
  {
    type: 'PHONE_SHAKE',
    label: 'Brief Phone Shake',
    desc: 'Short shake, motion resumes — must NOT trigger',
  },
  {
    type: 'STRONG_ACCIDENT_PATTERN',
    label: 'Strong Accident Pattern',
    desc: 'Impact + rotation + stillness — SHOULD trigger',
  },
];

// ============================================================
// TEST READING
// ============================================================

function createTestReading(
  accelerationMagnitude: number,
  rotationMagnitude: number,
  timestamp: number,
): SensorReading {
  return {
    accelerationMagnitude,
    rotationMagnitude,
    timestamp,

    ax: 0,
    ay: 0,
    az: accelerationMagnitude,

    rx: 0,
    ry: 0,
    rz: rotationMagnitude,
  };
}

// ============================================================
// SIMULATE SENSOR EVENT
// ============================================================

export function simulateSensorEvent(
  _manager: SensorManager,
  type: SensorTestType,
): SensorDetectionResult {
  const readings: SensorReading[] = [];

  const now = Date.now();

  const timestamp = (
    index: number,
  ): number =>
    now -
    (60 - index) * 16;

  for (
    let i = 0;
    i < 60;
    i += 1
  ) {
    let acceleration = 10;
    let rotation = 0.3;

    switch (type) {
      // ------------------------------------------------------
      // TINY MOVEMENT
      // ------------------------------------------------------

      case 'TINY_MOVEMENT':
        acceleration =
          9.8 +
          (Math.random() - 0.5) *
            1.5;

        rotation =
          0.1 +
          Math.random() *
            0.3;
        break;

      // ------------------------------------------------------
      // HAND MOVEMENT
      // ------------------------------------------------------

      case 'HAND_MOVEMENT':
        acceleration =
          9.5 +
          Math.random() * 3;

        rotation =
          0.2 +
          Math.random() *
            0.8;
        break;

      // ------------------------------------------------------
      // WALKING
      // ------------------------------------------------------

      case 'NORMAL_WALKING': {
        const step =
          Math.sin(i * 0.5) * 2;

        acceleration =
          10 +
          step +
          Math.random() * 2;

        rotation =
          0.3 +
          Math.random() * 0.6;

        break;
      }

      // ------------------------------------------------------
      // ROAD VIBRATION
      // ------------------------------------------------------

      case 'ROAD_VIBRATION':
        acceleration =
          9.8 +
          Math.random() * 2;

        rotation =
          0.1 +
          Math.random() * 0.4;

        break;

      // ------------------------------------------------------
      // SMALL BUMP
      // ------------------------------------------------------

      case 'SMALL_ROAD_BUMP': {
        const bump =
          i === 30;

        acceleration =
          bump
            ? 16 +
              Math.random() * 2
            : 9.8 +
              Math.random() * 1.5;

        rotation =
          bump
            ? 0.8
            : 0.2 +
              Math.random() * 0.3;

        break;
      }

      // ------------------------------------------------------
      // SPEED BREAKER
      // ------------------------------------------------------

      case 'SPEED_BREAKER': {
        const breaker =
          i >= 29 &&
          i <= 31;

        acceleration =
          breaker
            ? 18 +
              Math.random() * 2
            : 10 +
              Math.random() * 1.5;

        rotation =
          breaker
            ? 1
            : 0.2 +
              Math.random() * 0.3;

        break;
      }

      // ------------------------------------------------------
      // NORMAL BRAKING
      // ------------------------------------------------------

      case 'NORMAL_BRAKING': {
        const braking =
          i >= 28 &&
          i <= 33;

        acceleration =
          braking
            ? 13 +
              Math.random() * 2
            : 10 +
              Math.random() * 1.5;

        rotation =
          0.2 +
          Math.random() * 0.4;

        break;
      }

      // ------------------------------------------------------
      // NORMAL TURNING
      // ------------------------------------------------------

      case 'NORMAL_TURNING': {
        const turning =
          i >= 28 &&
          i <= 33;

        acceleration =
          10 +
          Math.random() * 1.5;

        rotation =
          turning
            ? 1.8 +
              Math.random() * 0.4
            : 0.2 +
              Math.random() * 0.3;

        break;
      }

      // ------------------------------------------------------
      // PHONE SHAKE
      // ------------------------------------------------------

      case 'PHONE_SHAKE': {
        const shaking =
          i >= 28 &&
          i <= 32;

        acceleration =
          shaking
            ? 20 +
              Math.random() * 3
            : 10 +
              Math.random() * 2;

        rotation =
          shaking
            ? 2.5 +
              Math.random() * 0.8
            : 0.3 +
              Math.random() * 0.5;

        break;
      }

      // ------------------------------------------------------
      // STRONG ACCIDENT PATTERN
      // ------------------------------------------------------

      case 'STRONG_ACCIDENT_PATTERN':
        /*
         * This test is deliberately stronger than the
         * real-world threshold so it should pass the strict
         * detection engine.
         */

        if (
          i >= 27 &&
          i <= 33
        ) {
          acceleration =
            55 +
            Math.random() * 8;

          rotation =
            10 +
            Math.random() * 2;
        } else if (
          i > 33
        ) {
          /*
           * Strong post-impact stillness.
           */
          acceleration =
            1.5 +
            Math.random() * 0.8;

          rotation =
            0.1 +
            Math.random() * 0.2;
        } else {
          acceleration =
            10 +
            Math.random() * 1.5;

          rotation =
            0.2 +
            Math.random() * 0.3;
        }

        break;

      default:
        break;
    }

    readings.push(
      createTestReading(
        acceleration,
        rotation,
        timestamp(i),
      ),
    );
  }

  // ==========================================================
  // SIMULATION STATE
  // ==========================================================

  const simulationState =
    makeInternalState();

  simulationState.baselineSamples =
    SENSOR_CONFIG.BASELINE_SAMPLES;

  simulationState.baselineAccel =
    9.8;

  simulationState.baselineRotation =
    0;

  return analyzeSensorReadings(
    readings,
    simulationState,
    now,
  );
}

// ============================================================
// EMERGENCY SOUND TEST
// ============================================================

export function testEmergencySound(): void {
  if (
    typeof window === 'undefined'
  ) {
    return;
  }

  const AudioContextClass =
    window.AudioContext ||
    (
      window as typeof window & {
        webkitAudioContext?: typeof AudioContext;
      }
    ).webkitAudioContext;

  if (!AudioContextClass) {
    console.log(
      'AudioContext is not supported',
    );

    return;
  }

  try {
    const audioContext =
      new AudioContextClass();

    const oscillator =
      audioContext.createOscillator();

    const gain =
      audioContext.createGain();

    oscillator.type =
      'square';

    oscillator.frequency.setValueAtTime(
      700,
      audioContext.currentTime,
    );

    oscillator.frequency.linearRampToValueAtTime(
      1100,
      audioContext.currentTime +
        0.5,
    );

    oscillator.frequency.linearRampToValueAtTime(
      700,
      audioContext.currentTime +
        1,
    );

    gain.gain.setValueAtTime(
      0.2,
      audioContext.currentTime,
    );

    oscillator.connect(gain);

    gain.connect(
      audioContext.destination,
    );

    oscillator.start();

    setTimeout(() => {
      try {
        oscillator.stop();
      } catch {
        // Already stopped.
      }

      audioContext
        .close()
        .catch(() => {});
    }, 5000);
  } catch (error) {
    console.error(
      'Unable to play emergency sound:',
      error,
    );
  }
}