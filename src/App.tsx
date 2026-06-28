import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Clients } from './pages/Clients';
import { Templates } from './pages/Templates';
import { TemplateMetaGuide } from './components/TemplateMetaGuide';
import { Campaigns } from './pages/Campaigns';
import { CampaignDetail } from './pages/CampaignDetail';
import { Conversations } from './pages/Conversations';
import { Bot } from './pages/Bot';
import { Personas } from './pages/Personas';
import { Pagos } from './pages/Pagos';
import { Users } from './pages/Users';
import { Simulator } from './pages/Simulator';
import { Help } from './pages/Help';
import { Register } from './pages/Register';
import { ReactNode } from 'react';

function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="center-screen">Cargando…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/personas" element={<Personas />} />
        <Route path="/pagos" element={<Pagos />} />
        <Route path="/templates" element={<Templates />} />
        <Route path="/templates/guia" element={<TemplateMetaGuide />} />
        <Route path="/campaigns" element={<Campaigns />} />
        <Route path="/campaigns/:id" element={<CampaignDetail />} />
        <Route path="/conversations" element={<Conversations />} />
        <Route path="/bot" element={<Bot />} />
        <Route path="/simulator" element={<Simulator />} />
        <Route path="/users" element={<Users />} />
        <Route path="/help" element={<Help />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
