import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Home from './pages/Home';
import Chat from './pages/Chat';
import WordHistory from './pages/WordHistory';
import LanguageSelect from './pages/LanguageSelect';
import LearnLanguageSelect from './pages/LearnLanguageSelect';
import Dictionary from './pages/Dictionary';
import Feedback from './pages/Feedback';
import Settings from './pages/Settings';
import Translator from './pages/Translator';
import Login from './pages/Login';
import ShadowPractice from './pages/ShadowPractice';
import LevelSelect from './pages/LevelSelect';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '16px',
      }}>
        <div style={{ fontSize: '40px' }}>🐾</div>
        <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-display)' }}>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '16px',
      }}>
        <div style={{ fontSize: '40px' }}>🐾</div>
        <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-display)' }}>Loading...</p>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public route */}
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <Login />}
      />

      {/* Protected routes */}
      <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
      <Route path="/select-language" element={<ProtectedRoute><LanguageSelect /></ProtectedRoute>} />
      <Route path="/learn-language" element={<ProtectedRoute><LearnLanguageSelect /></ProtectedRoute>} />
      <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
      <Route path="/history" element={<ProtectedRoute><WordHistory /></ProtectedRoute>} />
      <Route path="/dictionary" element={<ProtectedRoute><Dictionary /></ProtectedRoute>} />
      <Route path="/feedback" element={<ProtectedRoute><Feedback /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/translator" element={<ProtectedRoute><Translator /></ProtectedRoute>} />
      <Route path="/shadow" element={<ProtectedRoute><ShadowPractice /></ProtectedRoute>} />
      <Route path="/level-select" element={<ProtectedRoute><LevelSelect /></ProtectedRoute>} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <GoogleOAuthProvider clientId={CLIENT_ID}>
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
