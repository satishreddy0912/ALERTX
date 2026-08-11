import { useEffect, useRef, useState } from 'react';
import type { ViewKey, Incident, SensorDetectionResult } from '@/types';
import { useStore, type AdminSession } from '@/lib/store';
import { getSession, logout as authLogout } from '@/lib/auth';
import { getAdminSession, adminLogout } from '@/lib/adminAuth';
import { getSensorManager, getOnboardingState } from '@/lib/sensors';
import { Layout } from '@/components/Layout';
import { EmergencyPopup } from '@/components/EmergencyPopup';
import { SensorOnboarding } from '@/components/SensorOnboarding';
import { SensorAlert } from '@/components/SensorAlert';
import { SosButtonControlled } from '@/components/SosButton';
import { HomePage } from '@/pages/HomePage';
import { ReportEmergencyPage } from '@/pages/ReportEmergencyPage';
import { DetectionSimulatorPage } from '@/pages/DetectionSimulatorPage';
import { ResponderDashboardPage } from '@/pages/ResponderDashboardPage';
import { IncidentsPage } from '@/pages/IncidentsPage';
import { IncidentDetailPage } from '@/pages/IncidentDetailPage';
import { RespondersPage } from '@/pages/RespondersPage';
import { AboutPage } from '@/pages/AboutPage';
import { LoginPage } from '@/pages/LoginPage';
import { AdminLoginPage } from '@/pages/AdminLoginPage';
import { AdminDashboardPage } from '@/pages/AdminDashboardPage';
import { AdminIncidentDetailPage } from '@/pages/AdminIncidentDetailPage';
import { CinematicIntro } from '@/components/CinematicIntro';

function App() {
  const store = useStore();
  const [view, setView] = useState<ViewKey>('home');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [adminDetailId, setAdminDetailId] = useState<string | null>(null);
  const [session, setSession] = useState<{ id: string; email: string; name: string; unit: string } | null>(() => getSession());
  const [showIntro, setShowIntro] = useState(() => {
    try {
      return sessionStorage.getItem('alertx_intro_seen') !== '1';
    } catch {
      return true;
    }
  });

  function handleIntroComplete() {
    try {
      sessionStorage.setItem('alertx_intro_seen', '1');
    } catch {
      /* ignore */
    }
    setShowIntro(false);
  }
  const [adminSession, setAdminSession] = useState<{ id: string; email: string; name: string } | null>(() => getAdminSession());

  // Sensor onboarding
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [sensorEnabled, setSensorEnabledState] = useState(false);

  // Sensor detection alert
  const [sensorDetection, setSensorDetection] = useState<SensorDetectionResult | null>(null);

  // Emergency popup (responder)
  const knownIdsRef = useRef<Set<string>>(new Set());
  const [popupIncident, setPopupIncident] = useState<Incident | null>(null);
  const [wasOnDashboard, setWasOnDashboard] = useState(false);

  const isAuthenticated = !!session;
  const responderSession = session ? { id: session.id, name: session.name, unit: session.unit } : null;
  const adminSessionTyped: AdminSession | null = adminSession ? { id: adminSession.id, name: adminSession.name } : null;

  // --- First-time sensor onboarding ---
  useEffect(() => {
    const state = getOnboardingState();
    if (!state.completed) {
      setShowOnboarding(true);
    } else if (state.enabled) {
      setSensorEnabledState(true);
      const manager = getSensorManager();
      if (manager.isSupported()) {
        manager.requestPermission().then((granted) => {
          if (granted) manager.start();
        });
      }
    }
  }, []);

  // --- Sensor detection subscription ---
  useEffect(() => {
    if (!sensorEnabled) return;
    const manager = getSensorManager();
    if (!manager.isSupported()) return;
    const unsub = manager.onDetection((result) => {
      setSensorDetection(result);
    });
    return unsub;
  }, [sensorEnabled]);

  function handleOnboardingComplete(enabled: boolean) {
    setShowOnboarding(false);
    setSensorEnabledState(enabled);
    if (enabled) {
      const manager = getSensorManager();
      if (manager.isSupported()) {
        manager.start();
      }
    }
  }

  function handleSensorAlertTimeout() {
    if (!sensorDetection) return;
    // Create emergency from sensor detection
    const isHighConf = sensorDetection.highConfidence;
    const location = 'Sensor-detected location';
    const coords = null;
    const incident = store.addIncident({
      type: 'Road Accident',
      name: 'Mobile Sensor',
      phone: '0000000000',
      location,
      description: `Automatic sensor detection: ${sensorDetection.eventType.replace('POSSIBLE_', 'possible ')}`,
      imageData: null,
      coords,
      sensorConfidence: sensorDetection.confidence,
      sensorEventType: sensorDetection.eventType,
    }, 'mobile_sensor');
    setSensorDetection(null);
    // For high-confidence, also mark urgent (handled in store via sensorConfidence)
    void incident;
    void isHighConf;
  }

  function handleSensorAlertCancel() {
    setSensorDetection(null);
    // Record cancellation (could add audit entry, but no incident exists yet)
  }
  async function getAddressFromCoordinates(
  latitude: number,
  longitude: number
): Promise<string> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
    );

    if (!response.ok) {
      throw new Error('Reverse geocoding failed');
    }

    const data = await response.json();

    return data.display_name ||
      `Lat ${latitude.toFixed(4)}, Lng ${longitude.toFixed(4)}`;
  } catch {
    return `Lat ${latitude.toFixed(4)}, Lng ${longitude.toFixed(4)}`;
  }
}

  function handleSOS() {
    console.log('SOS triggered');
    // Try to get location
    const location = 'SOS trigger — location unavailable';
    const coords = null;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
         const { latitude, longitude } = pos.coords;

store.addIncident({
  type: 'Other',
  name: 'SOS User',
  phone: '0000000000',
  location: 'Getting location...',
  description: 'Manual SOS trigger — emergency button pressed.',
  imageData: null,
  coords: { lat: latitude, lng: longitude },
}, 'fast_sos');

getAddressFromCoordinates(latitude, longitude).then((address) => {
  console.log('Address received:', address);
});
        },
        () => {
          store.addIncident({
            type: 'Other',
            name: 'SOS User',
            phone: '0000000000',
            location,
            description: 'Manual SOS trigger — emergency button pressed.',
            imageData: null,
            coords,
          }, 'fast_sos');
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      store.addIncident({
        type: 'Other',
        name: 'SOS User',
        phone: '0000000000',
        location,
        description: 'Manual SOS trigger — emergency button pressed.',
        imageData: null,
        coords,
      }, 'fast_sos');
    }
  }

  // When entering the dashboard view, snapshot existing incident IDs
  useEffect(() => {
    if (view === 'dashboard') {
      if (!wasOnDashboard) {
        knownIdsRef.current = new Set(store.incidents.map((i) => i.id));
        setWasOnDashboard(true);
      }
    } else {
      setWasOnDashboard(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  // Watch for new incidents while on the dashboard -> trigger popup
  useEffect(() => {
    if (!wasOnDashboard) return;
    const newest = store.incidents[0];
    if (!newest) return;
    if (knownIdsRef.current.has(newest.id)) return;
    if (popupIncident?.id === newest.id) return;
    knownIdsRef.current.add(newest.id);
    setPopupIncident(newest);
  }, [store.incidents, wasOnDashboard, popupIncident]);

  function navigate(v: ViewKey) {
    // Auth guard: responder dashboard requires responder login
    if (v === 'dashboard' && !isAuthenticated) {
      setView('login');
      return;
    }
    // Auth guard: admin dashboard requires admin login
    if (v === 'admin' && !adminSession) {
      setView('admin_login');
      return;
    }
    setView(v);
  }

  function viewIncident(id: string) {
    setDetailId(id);
    setView('incidents');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function viewAdminIncident(id: string) {
    setAdminDetailId(id);
    setView('admin_incident');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleAccept(id: string) {
    if (!isAuthenticated) {
      setView('login');
      return;
    }
    store.autoAssignResponder(id, responderSession);
  }

  function handleLogin(s: { id: string; email: string; name: string; unit: string }) {
    setSession(s);
    setView('dashboard');
  }

  function handleLogout() {
    authLogout();
    setSession(null);
    setView('home');
  }

  function handleAdminLogin(s: { id: string; email: string; name: string }) {
    setAdminSession(s);
    setView('admin');
  }

  function handleAdminLogout() {
    adminLogout();
    setAdminSession(null);
    setView('home');
  }

  const activeCount = store.incidents.filter((i) => i.status !== 'RESOLVED').length;
  const resolvedCount = store.incidents.filter((i) => i.status === 'RESOLVED').length;

  const detailIncident = detailId ? store.incidents.find((i) => i.id === detailId) : undefined;
  const adminDetailIncident = adminDetailId ? store.incidents.find((i) => i.id === adminDetailId) : undefined;

  function renderView() {
    switch (view) {
      case 'home':
        return <HomePage onNavigate={navigate} activeCount={activeCount} resolvedCount={resolvedCount} responderCount={store.responders.length} />;
      case 'report':
        return (
          <ReportEmergencyPage
            onSubmit={(data) => store.addIncident(data, 'user_report')}
            onGoDashboard={() => navigate('dashboard')}
            onViewIncident={viewIncident}
          />
        );
      case 'simulator':
        return (
          <DetectionSimulatorPage
            onCreate={store.addIncident}
            onGoDashboard={() => navigate('admin')}
            onViewIncident={viewIncident}
          />
        );
      case 'dashboard':
        return (
          <ResponderDashboardPage
            incidents={store.incidents}
            responders={store.responders}
            isAuthenticated={isAuthenticated}
            session={responderSession}
            onAccept={handleAccept}
            onView={viewIncident}
            onGoLogin={() => setView('login')}
          />
        );
      case 'incidents':
        return detailIncident ? (
          <IncidentDetailPage
            incident={detailIncident}
            responders={store.responders}
            isAuthenticated={isAuthenticated}
            session={responderSession}
            onBack={() => setDetailId(null)}
            onAssign={(id) => store.autoAssignResponder(id, responderSession)}
            onMarkResponding={(id) => store.markResponding(id, responderSession)}
            onResolve={(id) => store.resolveIncident(id, responderSession)}
            onReject={(id) => store.rejectIncident(id, responderSession)}
            onMarkSafe={store.markReporterSafe}
            onGoLogin={() => setView('login')}
          />
        ) : (
          <IncidentsPage incidents={store.incidents} onView={viewIncident} />
        );
      case 'responders':
        return <RespondersPage responders={store.responders} onViewIncident={viewIncident} />;
      case 'about':
        return <AboutPage />;
      case 'login':
        return <LoginPage onLogin={handleLogin} onGoHome={() => setView('home')} />;
      case 'admin_login':
        return <AdminLoginPage onLogin={handleAdminLogin} onGoHome={() => setView('home')} />;
      case 'admin':
        return adminSession ? (
          <AdminDashboardPage
            incidents={store.incidents}
            responders={store.responders}
            adminSession={adminSessionTyped}
            onView={viewAdminIncident}
            onVerify={(id) => adminSessionTyped && store.adminVerifyIncident(id, adminSessionTyped)}
            onAssign={(id, rid) => adminSessionTyped && store.adminAssignResponder(id, rid, adminSessionTyped)}
            onEscalate={(id) => adminSessionTyped && store.adminEscalateIncident(id, adminSessionTyped)}
            onClose={(id) => adminSessionTyped && store.adminCloseIncident(id, adminSessionTyped)}
          />
        ) : (
          <AdminLoginPage onLogin={handleAdminLogin} onGoHome={() => setView('home')} />
        );
      case 'admin_incident':
        return adminSession ? (
          <AdminIncidentDetailPage
            incident={adminDetailIncident}
            responders={store.responders}
            adminSession={adminSessionTyped}
            onBack={() => { setAdminDetailId(null); setView('admin'); }}
            onVerify={(id) => adminSessionTyped && store.adminVerifyIncident(id, adminSessionTyped)}
            onAssign={(id, rid) => adminSessionTyped && store.adminAssignResponder(id, rid, adminSessionTyped)}
            onEscalate={(id) => adminSessionTyped && store.adminEscalateIncident(id, adminSessionTyped)}
            onMarkSuspicious={(id) => adminSessionTyped && store.adminMarkSuspicious(id, adminSessionTyped)}
            onClose={(id) => adminSessionTyped && store.adminCloseIncident(id, adminSessionTyped)}
          />
        ) : (
          <AdminLoginPage onLogin={handleAdminLogin} onGoHome={() => setView('home')} />
        );
      default:
        return null;
    }
  }

  return (
    <>
      {showIntro && <CinematicIntro onComplete={handleIntroComplete} />}
      <Layout current={view} onNavigate={navigate} session={responderSession} adminSession={adminSessionTyped} onLogout={handleLogout} onAdminLogout={handleAdminLogout}>
        {renderView()}
      </Layout>

      {/* SOS button — visible on all public views, not on admin/login screens */}
      {view !== 'admin' && view !== 'admin_login' && view !== 'admin_incident' && view !== 'login' && (
        <div className="fixed bottom-20 right-4 z-40 lg:bottom-6 lg:right-6">
          <SosButtonControlled onSend={handleSOS} onCancel={() => {}} />
        </div>
      )}

      {/* Sensor onboarding modal */}
      {showOnboarding && <SensorOnboarding onComplete={handleOnboardingComplete} />}

      {/* Sensor detection alert (30s normal / 5s fast) */}
      <SensorAlert
        detection={sensorDetection}
        onTimeout={handleSensorAlertTimeout}
        onCancel={handleSensorAlertCancel}
      />

      {/* Responder emergency popup */}
      <EmergencyPopup
        incident={popupIncident}
        isAuthenticated={isAuthenticated}
        onAccept={handleAccept}
        onView={viewIncident}
        onDismiss={() => setPopupIncident(null)}
      />
    </>
  );
}

export default App;
