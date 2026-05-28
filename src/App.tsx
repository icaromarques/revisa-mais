import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { SessionModalProvider } from './contexts/SessionModalContext';
import { AuthProvider } from './contexts/AuthContext';
import { StudyTimerProvider } from './contexts/StudyTimerContext';
import { ConfirmProvider } from './contexts/ConfirmContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PublicOnlyRoute } from './components/PublicOnlyRoute';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Cadastro } from './pages/Cadastro';
import { Dashboard } from './pages/Dashboard';
import { Materias } from './pages/Materias';
import { MateriaDetalhe } from './pages/MateriaDetalhe';
import { GradePage } from './pages/grade/GradePage';
import { Planner } from './pages/Planner';
import { Revisoes } from './pages/Revisoes';
import { Flashcards } from './pages/Flashcards';
import { Questoes } from './pages/Questoes';
import { Calendario } from './pages/Calendario';
import { Resumos } from './pages/Resumos';
import { Historico } from './pages/Historico';
import { Perfil } from './pages/Perfil';
import { FaltasPage } from './pages/FaltasPage';
import { Configuracoes } from './pages/Configuracoes';
import { Notificacoes } from './pages/Notificacoes';
import { AulaFormPage } from './pages/aulas/AulaFormPage';
import { AulaDetalhePage } from './pages/aulas/AulaDetalhePage';
import { PomodoroSettingsModal } from './components/PomodoroSettingsModal';
import { SessionModal } from './components/SessionModal';
import { StudyTimerWidget } from './components/StudyTimerWidget';
import { StudyTimerInitialModal } from './components/StudyTimerInitialModal';

import { GlobalErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  return (
    <GlobalErrorBoundary>
      <BrowserRouter>
      <AuthProvider>
        <ConfirmProvider>
          <SessionModalProvider>
            <StudyTimerProvider>
            <Routes>
              <Route path="/" element={<Home />} />
              
              <Route element={<PublicOnlyRoute />}>
                <Route path="/login" element={<Login />} />
                <Route path="/cadastro" element={<Cadastro />} />
              </Route>
              
              <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/materias" element={<Materias />} />
                <Route path="/materias/:id" element={<MateriaDetalhe />} />
                <Route path="/materias/:id/aulas/nova" element={<AulaFormPage />} />
                <Route path="/materias/:id/aulas/:aulaId" element={<AulaDetalhePage />} />
                <Route path="/materias/:id/aulas/:aulaId/editar" element={<AulaFormPage />} />
                <Route path="/grade" element={<GradePage />} />
                <Route path="/planner" element={<Planner />} />
                <Route path="/revisoes" element={<Revisoes />} />
                <Route path="/flashcards" element={<Flashcards />} />
                <Route path="/questoes" element={<Questoes />} />
                <Route path="/calendario" element={<Calendario />} />
                <Route path="/resumos" element={<Resumos />} />
                <Route path="/historico" element={<Historico />} />
                <Route path="/faltas" element={<FaltasPage />} />
                <Route path="/notificacoes" element={<Notificacoes />} />
                <Route path="/perfil" element={<Perfil />} />
                <Route path="/configuracoes" element={<Configuracoes />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Route>
            </Routes>
            <PomodoroSettingsModal />
            <SessionModal />
            <StudyTimerWidget />
            <StudyTimerInitialModal />
            <Toaster 
              position="top-right" 
              theme="dark" 
              richColors 
              duration={3000} 
              visibleToasts={3}
              closeButton
              expand={false}
            />
          </StudyTimerProvider>
        </SessionModalProvider>
        </ConfirmProvider>
      </AuthProvider>
    </BrowserRouter>
    </GlobalErrorBoundary>
  );
}
