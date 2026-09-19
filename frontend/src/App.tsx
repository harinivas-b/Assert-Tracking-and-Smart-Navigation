import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { DemoProvider } from './contexts/DemoContext';
import { RealtimeProvider } from './contexts/RealtimeContext';
import AuthLayout from './layouts/AuthLayout';
import MainLayout from './layouts/MainLayout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Assets from './pages/Assets';
import Tracking from './pages/Tracking';
import Locations from './pages/Locations';
import Gateways from './pages/Gateways';
import Tags from './pages/Tags';
import HardwareDebug from './pages/HardwareDebug';
import Movements from './pages/Movements';
import Alerts from './pages/Alerts';
import IndoorNavigation from './pages/IndoorNavigation';
import VoiceNavigationModule from './pages/VoiceNavigationModule';

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DemoProvider>
          <RealtimeProvider>
            <Routes>
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
            </Route>

            
            <Route element={<MainLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/assets" element={<Assets />} />
              <Route path="/tracking" element={<Tracking />} />
              <Route path="/locations" element={<Locations />} />
              <Route path="/gateways" element={<Gateways />} />
              <Route path="/tags" element={<Tags />} />
              <Route path="/debug" element={<HardwareDebug />} />
              <Route path="/movements" element={<Movements />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/navigation" element={<IndoorNavigation />} />
              <Route path="/voice-navigation" element={<VoiceNavigationModule />} />
              
              {/* Catch all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
            </Routes>
          </RealtimeProvider>
        </DemoProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
