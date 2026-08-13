import { useEffect, useRef, useState } from 'react';

import type {
  ViewKey,
  Incident,
  SensorDetectionResult,
} from '@/types';

import {
  useStore,
  type AdminSession,
} from '@/lib/store';

import {
  getSession,
  logout as authLogout,
} from '@/lib/auth';

import {
  getAdminSession,
  adminLogout,
} from '@/lib/adminAuth';

import {
  getSensorManager,
  getOnboardingState,
} from '@/lib/sensors';

import { Layout } from '@/components/Layout';
import { EmergencyPopup } from '@/components/EmergencyPopup';
import { SensorOnboarding } from '@/components/SensorOnboarding';
import { SensorAlert } from '@/components/SensorAlert';
import { SosButtonControlled } from '@/components/SosButton';
import { CinematicIntro } from '@/components/CinematicIntro';
import { StartEmergencyPopup } from '@/components/StartEmergencyPopup';

import { HomePage } from '@/pages/HomePage';
import { ProfilePage } from '@/pages/ProfilePage';
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

function App() {
  const store = useStore();

  /* =========================================================
     VIEW
  ========================================================= */

  const [view, setView] =
    useState<ViewKey>('home');

  const [detailId, setDetailId] =
    useState<string | null>(null);

  const [adminDetailId, setAdminDetailId] =
    useState<string | null>(null);

  /* =========================================================
     RESPONDER SESSION
  ========================================================= */

  const [session, setSession] =
    useState<{
      id: string;
      email: string;
      name: string;
      unit: string;
    } | null>(() => getSession());

  /* =========================================================
     ADMIN SESSION
  ========================================================= */

  const [adminSession, setAdminSession] =
    useState<{
      id: string;
      email: string;
      name: string;
    } | null>(() => getAdminSession());

  /* =========================================================
     CINEMATIC INTRO
  ========================================================= */

  const [showIntro, setShowIntro] =
    useState(() => {
      try {
        return (
          sessionStorage.getItem(
            'alertx_intro_seen',
          ) !== '1'
        );
      } catch {
        return true;
      }
    });

  /* =========================================================
     START POPUP
  ========================================================= */

  const [showStartPopup, setShowStartPopup] =
    useState(() => {
      try {
        return (
          sessionStorage.getItem(
            'alertx_start_popup_seen',
          ) !== '1'
        );
      } catch {
        return true;
      }
    });

  /* =========================================================
     SENSOR
  ========================================================= */

  const [showOnboarding, setShowOnboarding] =
    useState(false);

  const [sensorEnabled, setSensorEnabledState] =
    useState(false);

  const [sensorDetection, setSensorDetection] =
    useState<SensorDetectionResult | null>(
      null,
    );

  /* =========================================================
     SOS
  ========================================================= */

  const [sosSuccess, setSosSuccess] =
    useState<string | null>(null);

  /* =========================================================
     RESPONDER POPUP
  ========================================================= */

  const knownIdsRef =
    useRef<Set<string>>(new Set());

  const [popupIncident, setPopupIncident] =
    useState<Incident | null>(null);

  const [wasOnDashboard, setWasOnDashboard] =
    useState(false);

  /* =========================================================
     SESSION HELPERS
  ========================================================= */

  const isAuthenticated = !!session;

  const responderSession = session
    ? {
        id: session.id,
        name: session.name,
        unit: session.unit,
      }
    : null;

  const adminSessionTyped: AdminSession | null =
    adminSession
      ? {
          id: adminSession.id,
          name: adminSession.name,
        }
      : null;

  /* =========================================================
     INTRO COMPLETE
  ========================================================= */

  function handleIntroComplete() {
    try {
      sessionStorage.setItem(
        'alertx_intro_seen',
        '1',
      );
    } catch {
      // Ignore storage errors
    }

    setShowIntro(false);

    try {
      const popupSeen =
        sessionStorage.getItem(
          'alertx_start_popup_seen',
        );

      if (popupSeen !== '1') {
        setShowStartPopup(true);
      }
    } catch {
      setShowStartPopup(true);
    }
  }

  /* =========================================================
     START POPUP
  ========================================================= */

  function closeStartPopup() {
    try {
      sessionStorage.setItem(
        'alertx_start_popup_seen',
        '1',
      );
    } catch {
      // Ignore storage errors
    }

    setShowStartPopup(false);
  }

  function handleSetupProfile() {
    closeStartPopup();

    /*
     * IMPORTANT:
     * Previously this was setView('home'),
     * which made the button appear to do nothing.
     *
     * It now opens the actual ProfilePage.
     */
    setView('profile');

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  function handleStartReportEmergency() {
    closeStartPopup();

    setView('report');

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  /* =========================================================
     SENSOR ONBOARDING
  ========================================================= */

  useEffect(() => {
    const state =
      getOnboardingState();

    if (!state.completed) {
      setShowOnboarding(true);
      return;
    }

    if (state.enabled) {
      setSensorEnabledState(true);

      const manager =
        getSensorManager();

      if (manager.isSupported()) {
        manager
          .requestPermission()
          .then((granted) => {
            if (granted) {
              manager.start();
            }
          })
          .catch(() => {
            // Ignore permission errors
          });
      }
    }
  }, []);

  /* =========================================================
     SENSOR DETECTION
  ========================================================= */

  useEffect(() => {
    if (!sensorEnabled) {
      return;
    }

    const manager =
      getSensorManager();

    if (!manager.isSupported()) {
      return;
    }

    const unsubscribe =
      manager.onDetection(
        (result) => {
          setSensorDetection(result);
        },
      );

    return unsubscribe;
  }, [sensorEnabled]);

  /* =========================================================
     SENSOR ONBOARDING COMPLETE
  ========================================================= */

  function handleOnboardingComplete(
    enabled: boolean,
  ) {
    setShowOnboarding(false);

    setSensorEnabledState(enabled);

    if (enabled) {
      const manager =
        getSensorManager();

      if (manager.isSupported()) {
        manager.start();
      }
    }
  }

  /* =========================================================
     SENSOR ALERT
  ========================================================= */

  function handleSensorAlertTimeout() {
    if (!sensorDetection) {
      return;
    }

    const incident =
      store.addIncident(
        {
          type: 'Road Accident',
          name: 'Mobile Sensor',
          phone: '0000000000',
          location:
            'Sensor-detected location',
          description:
            `Automatic sensor detection: ${sensorDetection.eventType.replace(
              'POSSIBLE_',
              'possible ',
            )}`,
          imageData: null,
          coords: null,
          sensorConfidence:
            sensorDetection.confidence,
          sensorEventType:
            sensorDetection.eventType,
        },
        'mobile_sensor',
      );

    setSensorDetection(null);

    void incident;
  }

  function handleSensorAlertCancel() {
    const manager =
      getSensorManager();

    manager.stopEmergencyAlert();

    setSensorDetection(null);
  }

  /* =========================================================
     ADDRESS
  ========================================================= */

  async function getAddressFromCoordinates(
    latitude: number,
    longitude: number,
  ): Promise<string> {
    try {
      const response =
        await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
        );

      if (!response.ok) {
        throw new Error(
          'Reverse geocoding failed',
        );
      }

      const data =
        await response.json();

      return (
        data.display_name ||
        `Lat ${latitude.toFixed(
          4,
        )}, Lng ${longitude.toFixed(4)}`
      );
    } catch {
      return `Lat ${latitude.toFixed(
        4,
      )}, Lng ${longitude.toFixed(4)}`;
    }
  }

  /* =========================================================
     FAST SOS
  ========================================================= */

  function handleSOS() {
    const showSuccess = (
      address: string,
    ) => {
      setSosSuccess(address);

      window.setTimeout(() => {
        setSosSuccess(null);
      }, 5000);
    };

    if (!navigator.geolocation) {
      store.addIncident(
        {
          type: 'Other',
          name: 'SOS User',
          phone: '0000000000',
          location:
            'Location unavailable',
          description:
            'Manual SOS trigger — emergency button pressed.',
          imageData: null,
          coords: null,
        },
        'fast_sos',
      );

      showSuccess(
        'Location unavailable',
      );

      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const {
          latitude,
          longitude,
        } = position.coords;

        let address =
          `Lat ${latitude.toFixed(
            4,
          )}, Lng ${longitude.toFixed(4)}`;

        try {
          address =
            await getAddressFromCoordinates(
              latitude,
              longitude,
            );
        } catch {
          // Keep coordinates
        }

        store.addIncident(
          {
            type: 'Other',
            name: 'SOS User',
            phone: '0000000000',
            location: address,
            description:
              'Manual SOS trigger — emergency button pressed.',
            imageData: null,
            coords: {
              lat: latitude,
              lng: longitude,
            },
          },
          'fast_sos',
        );

        showSuccess(address);
      },
      () => {
        store.addIncident(
          {
            type: 'Other',
            name: 'SOS User',
            phone: '0000000000',
            location:
              'Location permission denied',
            description:
              'Manual SOS trigger — emergency button pressed.',
            imageData: null,
            coords: null,
          },
          'fast_sos',
        );

        showSuccess(
          'Location permission denied',
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  }

  /* =========================================================
     DASHBOARD TRACKING
  ========================================================= */

  useEffect(() => {
    if (view === 'dashboard') {
      if (!wasOnDashboard) {
        knownIdsRef.current =
          new Set(
            store.incidents.map(
              (incident) =>
                incident.id,
            ),
          );

        setWasOnDashboard(true);
      }
    } else {
      setWasOnDashboard(false);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  /* =========================================================
     NEW INCIDENT POPUP
  ========================================================= */

  useEffect(() => {
    if (!wasOnDashboard) {
      return;
    }

    const newest =
      store.incidents[0];

    if (!newest) {
      return;
    }

    if (
      knownIdsRef.current.has(
        newest.id,
      )
    ) {
      return;
    }

    if (
      popupIncident?.id ===
      newest.id
    ) {
      return;
    }

    knownIdsRef.current.add(
      newest.id,
    );

    setPopupIncident(newest);
  }, [
    store.incidents,
    wasOnDashboard,
    popupIncident,
  ]);

  /* =========================================================
     NAVIGATION
  ========================================================= */

  function navigate(
    nextView: ViewKey,
  ) {
    if (
      nextView === 'dashboard' &&
      !isAuthenticated
    ) {
      setView('login');
      return;
    }

    if (
      nextView === 'admin' &&
      !adminSession
    ) {
      setView('admin_login');
      return;
    }

    setView(nextView);
  }

  /* =========================================================
     INCIDENT
  ========================================================= */

  function viewIncident(
    id: string,
  ) {
    setDetailId(id);

    setView('incidents');

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  function viewAdminIncident(
    id: string,
  ) {
    setAdminDetailId(id);

    setView('admin_incident');

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  /* =========================================================
     RESPONDER
  ========================================================= */

  function handleAccept(
    id: string,
  ) {
    if (!isAuthenticated) {
      setView('login');
      return;
    }

    store.autoAssignResponder(
      id,
      responderSession,
    );
  }

  function handleLogin(
    loggedInSession: {
      id: string;
      email: string;
      name: string;
      unit: string;
    },
  ) {
    setSession(loggedInSession);

    setView('dashboard');
  }

  function handleLogout() {
    authLogout();

    setSession(null);

    setView('home');
  }

  /* =========================================================
     ADMIN
  ========================================================= */

  function handleAdminLogin(
    loggedInSession: {
      id: string;
      email: string;
      name: string;
    },
  ) {
    setAdminSession(
      loggedInSession,
    );

    setView('admin');
  }

  function handleAdminLogout() {
    adminLogout();

    setAdminSession(null);

    setView('home');
  }

  /* =========================================================
     INCIDENT DETAILS
  ========================================================= */

  const detailIncident =
    detailId
      ? store.incidents.find(
          (incident) =>
            incident.id ===
            detailId,
        )
      : undefined;

  const adminDetailIncident =
    adminDetailId
      ? store.incidents.find(
          (incident) =>
            incident.id ===
            adminDetailId,
        )
      : undefined;

  /* =========================================================
     VIEW RENDERING
  ========================================================= */

  function renderView() {
    switch (view) {
      case 'home':
        return (
          <HomePage
            onNavigate={navigate}
          />
        );

      case 'profile':
        return (
          <ProfilePage
            onBack={() =>
              setView('home')
            }
          />
        );

      case 'report':
        return (
          <ReportEmergencyPage
            onSubmit={(data) =>
              store.addIncident(
                data,
                'user_report',
              )
            }
            onGoDashboard={() =>
              navigate('dashboard')
            }
            onViewIncident={
              viewIncident
            }
          />
        );

      case 'simulator':
        return (
          <DetectionSimulatorPage
            onCreate={
              store.addIncident
            }
            onGoDashboard={() =>
              navigate('admin')
            }
            onViewIncident={
              viewIncident
            }
          />
        );

      case 'dashboard':
        return (
          <ResponderDashboardPage
            incidents={
              store.incidents
            }
            responders={
              store.responders
            }
            isAuthenticated={
              isAuthenticated
            }
            session={
              responderSession
            }
            onAccept={
              handleAccept
            }
            onView={
              viewIncident
            }
            onGoLogin={() =>
              setView('login')
            }
          />
        );

      case 'incidents':
        if (!isAuthenticated) {
          return (
            <LoginPage
              onLogin={
                handleLogin
              }
              onGoHome={() =>
                setView('home')
              }
            />
          );
        }

        return detailIncident ? (
          <IncidentDetailPage
            incident={
              detailIncident
            }
            responders={
              store.responders
            }
            isAuthenticated={
              isAuthenticated
            }
            session={
              responderSession
            }
            onBack={() => {
              setDetailId(null);
              setView(
                'dashboard',
              );
            }}
            onAssign={(id) =>
              store.autoAssignResponder(
                id,
                responderSession,
              )
            }
            onMarkResponding={(
              id,
            ) =>
              store.markResponding(
                id,
                responderSession,
              )
            }
            onResolve={(id) =>
              store.resolveIncident(
                id,
                responderSession,
              )
            }
            onReject={(id) =>
              store.rejectIncident(
                id,
                responderSession,
              )
            }
            onMarkSafe={
              store.markReporterSafe
            }
            onGoLogin={() =>
              setView('login')
            }
          />
        ) : (
          <IncidentsPage
            incidents={
              store.incidents
            }
            onView={
              viewIncident
            }
          />
        );

      case 'responders':
        return (
          <RespondersPage
            responders={
              store.responders
            }
            onViewIncident={
              viewIncident
            }
          />
        );

      case 'about':
        return <AboutPage />;

      case 'login':
        return (
          <LoginPage
            onLogin={
              handleLogin
            }
            onGoHome={() =>
              setView('home')
            }
          />
        );

      case 'admin_login':
        return (
          <AdminLoginPage
            onLogin={
              handleAdminLogin
            }
            onGoHome={() =>
              setView('home')
            }
          />
        );

      case 'admin':
        return adminSession ? (
          <AdminDashboardPage
            incidents={
              store.incidents
            }
            responders={
              store.responders
            }
            adminSession={
              adminSessionTyped
            }
            onView={
              viewAdminIncident
            }
            onVerify={(id) => {
              if (
                adminSessionTyped
              ) {
                store.adminVerifyIncident(
                  id,
                  adminSessionTyped,
                );
              }
            }}
            onAssign={(
              id,
              responderId,
            ) => {
              if (
                adminSessionTyped
              ) {
                store.adminAssignResponder(
                  id,
                  responderId,
                  adminSessionTyped,
                );
              }
            }}
            onEscalate={(id) => {
              if (
                adminSessionTyped
              ) {
                store.adminEscalateIncident(
                  id,
                  adminSessionTyped,
                );
              }
            }}
            onClose={(id) => {
              if (
                adminSessionTyped
              ) {
                store.adminCloseIncident(
                  id,
                  adminSessionTyped,
                );
              }
            }}
          />
        ) : (
          <AdminLoginPage
            onLogin={
              handleAdminLogin
            }
            onGoHome={() =>
              setView('home')
            }
          />
        );

      case 'admin_incident':
        return adminSession ? (
          <AdminIncidentDetailPage
            incident={
              adminDetailIncident
            }
            responders={
              store.responders
            }
            adminSession={
              adminSessionTyped
            }
            onBack={() => {
              setAdminDetailId(null);
              setView('admin');
            }}
            onVerify={(id) => {
              if (
                adminSessionTyped
              ) {
                store.adminVerifyIncident(
                  id,
                  adminSessionTyped,
                );
              }
            }}
            onAssign={(
              id,
              responderId,
            ) => {
              if (
                adminSessionTyped
              ) {
                store.adminAssignResponder(
                  id,
                  responderId,
                  adminSessionTyped,
                );
              }
            }}
            onEscalate={(id) => {
              if (
                adminSessionTyped
              ) {
                store.adminEscalateIncident(
                  id,
                  adminSessionTyped,
                );
              }
            }}
            onMarkSuspicious={(
              id,
            ) => {
              if (
                adminSessionTyped
              ) {
                store.adminMarkSuspicious(
                  id,
                  adminSessionTyped,
                );
              }
            }}
            onClose={(id) => {
              if (
                adminSessionTyped
              ) {
                store.adminCloseIncident(
                  id,
                  adminSessionTyped,
                );
              }
            }}
          />
        ) : (
          <AdminLoginPage
            onLogin={
              handleAdminLogin
            }
            onGoHome={() =>
              setView('home')
            }
          />
        );

      default:
        return (
          <HomePage
            onNavigate={navigate}
          />
        );
    }
  }

  /* =========================================================
     MAIN RETURN
  ========================================================= */

  return (
    <>
      {/* CINEMATIC INTRO */}

      {showIntro && (
        <CinematicIntro
          onComplete={
            handleIntroComplete
          }
        />
      )}

      {/* MAIN WEBSITE */}

      <Layout
        current={view}
        onNavigate={navigate}
        session={
          responderSession
        }
        adminSession={
          adminSessionTyped
        }
        onLogout={
          handleLogout
        }
        onAdminLogout={
          handleAdminLogout
        }
      >
        {renderView()}
      </Layout>

      {/* STARTING POPUP */}

      {showStartPopup &&
        !showIntro && (
          <StartEmergencyPopup
            onSetupProfile={
              handleSetupProfile
            }
            onReportEmergency={
              handleStartReportEmergency
            }
            onClose={
              closeStartPopup
            }
          />
        )}

      {/* FAST SOS */}

      {view !== 'admin' &&
        view !== 'admin_login' &&
        view !== 'admin_incident' &&
        view !== 'login' && (
          <div className="fixed bottom-20 right-4 z-40 lg:bottom-6 lg:right-6">
            <SosButtonControlled
              onSend={handleSOS}
              onCancel={() => {}}
            />
          </div>
        )}

      {/* SOS SUCCESS */}

      {sosSuccess && (
        <div className="fixed left-1/2 top-6 z-[250] w-[90%] max-w-md -translate-x-1/2">
          <div className="rounded-2xl border border-green-300 bg-white p-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="text-2xl">
                🚨
              </div>

              <div className="min-w-0">
                <h3 className="font-bold text-green-700">
                  SOS Sent Successfully
                </h3>

                <p className="mt-1 text-sm text-gray-700">
                  Emergency report has been created.
                </p>

                <p className="mt-2 text-sm text-gray-600">
                  📍 {sosSuccess}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SENSOR ONBOARDING */}

      {showOnboarding && (
        <SensorOnboarding
          onComplete={
            handleOnboardingComplete
          }
        />
      )}

      {/* SENSOR ALERT */}

      <SensorAlert
        detection={
          sensorDetection
        }
        onTimeout={
          handleSensorAlertTimeout
        }
        onCancel={
          handleSensorAlertCancel
        }
      />

      {/* RESPONDER EMERGENCY POPUP */}

      <EmergencyPopup
        incident={
          popupIncident
        }
        isAuthenticated={
          isAuthenticated
        }
        onAccept={
          handleAccept
        }
        onView={
          viewIncident
        }
        onDismiss={() =>
          setPopupIncident(null)
        }
      />
    </>
  );
}

export default App;