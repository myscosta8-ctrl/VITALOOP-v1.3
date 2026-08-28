/**
 * Roteamento mínimo por hash (sem dependência de roteador pesado — Doc 4 §39,
 * esta fase é exclusivamente identidade/segurança, sem telas clínicas).
 *
 * Rotas protegidas usam requireSession: se não há identidade autenticada,
 * mostra AccessDeniedPage(reason: 'unauthenticated') em vez do conteúdo.
 */

import { useEffect, useState } from 'react';
import { SessionProvider, useSession } from './context/session-context.js';
import { LoginPage } from './pages/LoginPage.js';
import { ProfilePage } from './pages/ProfilePage.js';
import { PasswordRecoveryPage } from './pages/PasswordRecoveryPage.js';
import { ChangePasswordPage } from './pages/ChangePasswordPage.js';
import { BreakGlassPage } from './pages/BreakGlassPage.js';
import { AccessDeniedPage } from './pages/AccessDeniedPage.js';
import { PatientSearchPage } from './pages/PatientSearchPage.js';
import { PatientRegisterPage } from './pages/PatientRegisterPage.js';
import { PatientDetailPage } from './pages/PatientDetailPage.js';
import { EncounterListPage } from './pages/EncounterListPage.js';
import { EncounterOpenPage } from './pages/EncounterOpenPage.js';
import { TriageOpenPage } from './pages/TriageOpenPage.js';
import { QueueDashboardPage } from './pages/QueueDashboardPage.js';
import { MedicalConsultationPage } from './pages/MedicalConsultationPage.js';

const currentHash = (): string => window.location.hash.replace(/^#/, '') || '/';

const useHashRoute = (): string => {
  const [route, setRoute] = useState<string>(currentHash());
  useEffect(() => {
    const onHashChange = (): void => setRoute(currentHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  return route;
};

const RequireSession = ({ children }: { children: JSX.Element }): JSX.Element => {
  const { identity, status } = useSession();
  if (status === 'authenticating' || status === 'idle') {
    return <p role="status">Carregando…</p>;
  }
  if (!identity) {
    return <AccessDeniedPage reason="unauthenticated" />;
  }
  return children;
};

const Shell = (): JSX.Element => {
  const route = useHashRoute();

  switch (route) {
    case '/recuperar-senha':
      return <PasswordRecoveryPage />;
    case '/perfil':
      return (
        <RequireSession>
          <ProfilePage />
        </RequireSession>
      );
    case '/alterar-senha':
      return (
        <RequireSession>
          <ChangePasswordPage />
        </RequireSession>
      );
    case '/break-glass':
      return (
        <RequireSession>
          <BreakGlassPage />
        </RequireSession>
      );
    case '/pacientes':
      return (
        <RequireSession>
          <PatientSearchPage />
        </RequireSession>
      );
    case '/pacientes/novo':
      return (
        <RequireSession>
          <PatientRegisterPage />
        </RequireSession>
      );
    case '/atendimentos':
      return (
        <RequireSession>
          <EncounterListPage />
        </RequireSession>
      );
    case '/atendimentos/novo':
      return (
        <RequireSession>
          <EncounterOpenPage />
        </RequireSession>
      );
    case '/filas':
      return (
        <RequireSession>
          <QueueDashboardPage />
        </RequireSession>
      );
    case '/login':
    case '/':
      return <LoginPage />;
    default: {
      const triageMatch = /^\/atendimentos\/([^/]+)\/triagem$/.exec(route);
      if (triageMatch) {
        return (
          <RequireSession>
            <TriageOpenPage encounterId={triageMatch[1]!} />
          </RequireSession>
        );
      }
      const consultationMatch = /^\/atendimentos\/([^/]+)\/consulta$/.exec(route);
      if (consultationMatch) {
        return (
          <RequireSession>
            <MedicalConsultationPage encounterId={consultationMatch[1]!} />
          </RequireSession>
        );
      }
      const patientMatch = /^\/pacientes\/([^/]+)$/.exec(route);
      if (patientMatch) {
        return (
          <RequireSession>
            <PatientDetailPage patientId={patientMatch[1]!} />
          </RequireSession>
        );
      }
      return <LoginPage />;
    }
  }
};

export const App = (): JSX.Element => (
  <SessionProvider>
    <Shell />
  </SessionProvider>
);
