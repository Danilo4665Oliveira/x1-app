// =============================================================
// frontend/src/App.tsx — Versão completa com todas as rotas
// =============================================================
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Alunos } from './pages/Alunos';
import { Planos } from './pages/Planos';
import { Financeiro } from './pages/Financeiro';
import { LoginPage } from './pages/Login';

// ── Guard de autenticação ─────────────────────────────────────
function PrivateLayout({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto max-w-full">
        {children}
      </main>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Pública */}
        <Route path="/login" element={<LoginPage />} />

        {/* Privadas */}
        <Route path="/"           element={<PrivateLayout><Dashboard /></PrivateLayout>} />
        <Route path="/alunos"     element={<PrivateLayout><Alunos /></PrivateLayout>} />
        <Route path="/planos"     element={<PrivateLayout><Planos /></PrivateLayout>} />
        <Route path="/financeiro" element={<PrivateLayout><Financeiro /></PrivateLayout>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

// =============================================================
// frontend/src/main.tsx — Entry point do Vite
// =============================================================
/*
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
*/

// =============================================================
// frontend/src/index.css — Tailwind base
// =============================================================
/*
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  @apply bg-gray-50 text-gray-900 antialiased;
}
*/
