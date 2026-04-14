import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { Toaster } from './components/ui/sonner';
import { lazy, Suspense } from 'react';

import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword, ResetPassword } from './pages/PasswordReset';
import { Feed } from './pages/Feed';
import Footer from "./components/Footer";

import './App.css';

// Lazy load less-used pages
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));
const Events = lazy(() => import('./pages/Events').then(m => ({ default: m.Events })));
const Wallet = lazy(() => import('./pages/Wallet').then(m => ({ default: m.Wallet })));
const AdminPanel = lazy(() => import('./pages/AdminPanel').then(m => ({ default: m.AdminPanel })));
const Messages = lazy(() => import('./pages/Messages').then(m => ({ default: m.Messages })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const TermsOfService = lazy(() => import('./pages/TermsOfService').then(m => ({ default: m.TermsOfService })));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy').then(m => ({ default: m.PrivacyPolicy })));
const Marketplace = lazy(() => import('./pages/Marketplace').then(m => ({ default: m.Marketplace })));
const Clubs = lazy(() => import('./pages/Clubs').then(m => ({ default: m.Clubs })));
const ClubDetail = lazy(() => import('./pages/ClubDetail').then(m => ({ default: m.ClubDetail })));

const LazyFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Betöltés...</p>
        </div>
      </div>
    );
  }

  return user ? children : <Navigate to="/" replace />;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Betöltés...</p>
        </div>
      </div>
    );
  }

  return !user ? children : <Navigate to="/feed" replace />;
};

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
<BrowserRouter>

  <Toaster position="top-right" />

  <div className="min-h-screen flex flex-col">

    <div className="flex-1">

      <Routes>
        <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
        <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />

        <Route path="/feed" element={<PrivateRoute><Feed /></PrivateRoute>} />
        <Route path="/profile/:userId" element={<PrivateRoute><Suspense fallback={<LazyFallback />}><Profile /></Suspense></PrivateRoute>} />
        <Route path="/events" element={<PrivateRoute><Suspense fallback={<LazyFallback />}><Events /></Suspense></PrivateRoute>} />
        <Route path="/wallet" element={<PrivateRoute><Suspense fallback={<LazyFallback />}><Wallet /></Suspense></PrivateRoute>} />
        <Route path="/marketplace" element={<PrivateRoute><Suspense fallback={<LazyFallback />}><Marketplace /></Suspense></PrivateRoute>} />
        <Route path="/clubs" element={<PrivateRoute><Suspense fallback={<LazyFallback />}><Clubs /></Suspense></PrivateRoute>} />
        <Route path="/clubs/:clubId" element={<PrivateRoute><Suspense fallback={<LazyFallback />}><ClubDetail /></Suspense></PrivateRoute>} />
        <Route path="/settings" element={<PrivateRoute><Suspense fallback={<LazyFallback />}><Settings /></Suspense></PrivateRoute>} />

        {/* CHAT PAGE */}
        <Route path="/messages" element={<PrivateRoute><Suspense fallback={<LazyFallback />}><Messages /></Suspense></PrivateRoute>} />

        <Route path="/admin" element={<PrivateRoute><Suspense fallback={<LazyFallback />}><AdminPanel /></Suspense></PrivateRoute>} />
        
        {/* Jogi oldalak - publikus */}
        <Route path="/aszf" element={<Suspense fallback={<LazyFallback />}><TermsOfService /></Suspense>} />
        <Route path="/adatvedelem" element={<Suspense fallback={<LazyFallback />}><PrivacyPolicy /></Suspense>} />
      </Routes>

    </div>

    <Footer />

  </div>

</BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;