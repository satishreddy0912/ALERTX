import { useState } from 'react';
import { ShieldAlert, Smartphone, MapPin, Bell, Check, X } from 'lucide-react';
import { getSensorManager, setOnboardingCompleted } from '@/lib/sensors';

interface Props {
  onComplete: (enabled: boolean) => void;
}

export function SensorOnboarding({ onComplete }: Props) {
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState('');

  async function handleEnable() {
    setRequesting(true);
    setError('');
    try {
      const manager = getSensorManager();
      if (!manager.isSupported()) {
        // Not supported — mark onboarding done, sensors disabled
        setOnboardingCompleted(false);
        onComplete(false);
        return;
      }
      const granted = await manager.requestPermission();
      setOnboardingCompleted(granted);
      onComplete(granted);
    } catch {
      setError('Unable to access motion sensors. You can enable this later.');
      setOnboardingCompleted(false);
      onComplete(false);
    } finally {
      setRequesting(false);
    }
  }

  function handleSkip() {
    setOnboardingCompleted(false);
    onComplete(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-fade-in">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-navy-700 bg-navy-800 shadow-2xl animate-pop-in">
        <div className="flex items-center justify-between bg-gradient-to-r from-accent-600 to-accent-800 px-4 py-3">
          <div className="flex items-center gap-2 text-white">
            <ShieldAlert className="h-5 w-5" />
            <span className="text-sm font-bold uppercase tracking-wide">Welcome to AlertX</span>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm leading-relaxed text-secondary-400">
            AlertX can use your phone's motion sensors to detect possible accidents while the app is open.
          </p>

          <div className="space-y-2.5">
            <PermissionRow icon={Smartphone} label="Motion & orientation sensors" desc="Detect sudden impact and rotation" />
            <PermissionRow icon={MapPin} label="Location" desc="Include your location in emergency reports" />
            <PermissionRow icon={Bell} label="Notifications" desc="Alert you about active emergencies" />
          </div>

          <p className="text-xs text-secondary-400">
            Sensor detection works only while this webpage is active in your browser. It does not work when the browser is closed or in the background.
          </p>

          {error && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-2 pt-1">
            <button onClick={handleEnable} disabled={requesting} className="btn-danger w-full py-3.5 text-sm">
              <Check className="h-4 w-4" /> {requesting ? 'Requesting permission...' : 'Enable Protection'}
            </button>
            <button onClick={handleSkip} className="btn-ghost w-full py-3 text-sm text-secondary-400">
              <X className="h-4 w-4" /> Not Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PermissionRow({ icon: Icon, label, desc }: { icon: typeof Smartphone; label: string; desc: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-navy-700 bg-navy-800 p-3">
      <Icon className="h-5 w-5 shrink-0 text-secondary-400" />
      <div className="min-w-0">
        <div className="text-sm font-semibold text-secondary-400">{label}</div>
        <div className="text-xs text-secondary-400">{desc}</div>
      </div>
    </div>
  );
}
