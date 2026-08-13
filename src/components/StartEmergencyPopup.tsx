import {
  UserRound,
  Siren,
  X,
  ShieldCheck,
} from 'lucide-react';

interface Props {
  onSetupProfile: () => void;
  onReportEmergency: () => void;
  onClose: () => void;
}

export function StartEmergencyPopup({
  onSetupProfile,
  onReportEmergency,
  onClose,
}: Props) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-navy-700 bg-navy-950 shadow-2xl">

        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-secondary-300 transition hover:bg-white/20 hover:text-white"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="px-6 pb-5 pt-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emergency-500/10">
            <ShieldCheck className="h-8 w-8 text-emergency-400" />
          </div>

          <h2 className="mt-4 text-2xl font-black text-white">
            Welcome to AlertX
          </h2>

          <p className="mt-2 text-sm leading-relaxed text-secondary-400">
            Set up your profile for faster emergency
            assistance, or report an emergency immediately.
          </p>
        </div>

        {/* Options */}
        <div className="space-y-3 px-6 pb-6">

          {/* Setup profile */}
          <button
            type="button"
            onClick={onSetupProfile}
            className="flex w-full items-center gap-4 rounded-2xl border border-navy-700 bg-navy-900 p-4 text-left transition hover:border-cyan-500 hover:bg-navy-800"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10">
              <UserRound className="h-6 w-6 text-cyan-400" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="font-bold text-white">
                Set Up My Profile
              </div>

              <div className="mt-1 text-xs leading-relaxed text-secondary-400">
                Add your name, phone number and emergency
                contacts.
              </div>
            </div>
          </button>

          {/* Report emergency */}
          <button
            type="button"
            onClick={onReportEmergency}
            className="flex w-full items-center gap-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-left transition hover:border-red-400 hover:bg-red-500/20"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-500/10">
              <Siren className="h-6 w-6 text-red-400" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="font-bold text-white">
                Report Emergency
              </div>

              <div className="mt-1 text-xs leading-relaxed text-secondary-400">
                Skip profile setup and report an emergency
                right now.
              </div>
            </div>
          </button>

          {/* Continue */}
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-secondary-400 transition hover:bg-navy-900 hover:text-white"
          >
            Continue to AlertX
          </button>
        </div>
      </div>
    </div>
  );
}