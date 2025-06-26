import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation, Navigate, Link } from 'react-router-dom';
import HomePage from './components/HomePage';
import ModelTest from './components/ModelTest';
import BackendTest from './components/BackendTest';
import Dashboard from './components/Dashboard';
import AISimpleTest from './components/AISimpleTest';

const VIEW_LABELS = {
  '/': 'Home',
  '/dashboard': 'Dashboard',
  '/demo': 'AI Demo',
  '/backend': 'Backend Test',
};

function Breadcrumbs() {
  const location = useLocation();
  const crumbs = [];
  if (location.pathname !== '/') {
    crumbs.push({ label: 'Home', path: '/' });
  }
  if (location.pathname !== '/' && VIEW_LABELS[location.pathname]) {
    crumbs.push({ label: VIEW_LABELS[location.pathname], path: location.pathname });
  }
  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-4" aria-label="Breadcrumb">
      {crumbs.map((crumb, idx) => (
        <span key={crumb.path} className="flex items-center">
          {idx > 0 && <span className="mx-2">/</span>}
          <Link
            to={crumb.path}
            className={`hover:underline ${crumb.path === location.pathname ? 'text-indigo-700 font-semibold' : ''}`}
          >
            {crumb.label}
          </Link>
        </span>
      ))}
    </nav>
  );
}

function ViewSwitcher() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <div className="flex justify-center gap-2 mb-8">
      <button
        onClick={() => navigate('/')}
        className={`px-4 py-2 rounded-md font-medium transition-colors ${
          location.pathname === '/'
            ? 'bg-indigo-600 text-white shadow'
            : 'bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50'
        }`}
      >
        Home
      </button>
      <button
        onClick={() => navigate('/demo')}
        className={`px-4 py-2 rounded-md font-medium transition-colors ${
          location.pathname === '/demo'
            ? 'bg-indigo-600 text-white shadow'
            : 'bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50'
        }`}
      >
        AI Demo
      </button>
      <button
        onClick={() => navigate('/backend')}
        className={`px-4 py-2 rounded-md font-medium transition-colors ${
          location.pathname === '/backend'
            ? 'bg-indigo-600 text-white shadow'
            : 'bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50'
        }`}
      >
        Backend Test
      </button>
    </div>
  );
}

function getIdTokenFromUrl() {
  let params = new URLSearchParams(window.location.search);
  if (params.get('id_token')) return params.get('id_token');
  if (window.location.hash) {
    params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    if (params.get('id_token')) return params.get('id_token');
  }
  return null;
}

function decodeIdToken(idToken) {
  try {
    const base64Url = idToken.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(decodeURIComponent(escape(window.atob(base64))));
  } catch {
    return null;
  }
}

function AppRoutes({ isAuthenticated, user, setIsAuthenticated, setUser }) {
  const navigate = useNavigate();
  useEffect(() => {
    const idToken = getIdTokenFromUrl();
    if (idToken) {
      const claims = decodeIdToken(idToken);
      if (claims && (claims.email || (claims.emails && claims.emails[0]))) {
        setUser(claims);
        setIsAuthenticated(true);
        window.history.replaceState({}, document.title, window.location.pathname);
        navigate('/dashboard', { replace: true });
      }
    }
    // eslint-disable-next-line
  }, []);

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/ai-test" element={<AISimpleTest />} />
      <Route path="/demo" element={<ModelTest />} />
      <Route path="/backend" element={<BackendTest />} />
      <Route
        path="/dashboard"
        element={
          isAuthenticated && user ? (
            <Dashboard user={user} onNavigate={navigate} />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  return (
    <Router>
      <div className="App min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 pt-8">
          <Breadcrumbs />
          <ViewSwitcher />
          <div className="mt-4">
            <AppRoutes
              isAuthenticated={isAuthenticated}
              user={user}
              setIsAuthenticated={setIsAuthenticated}
              setUser={setUser}
            />
          </div>
        </main>
      </div>
    </Router>
  );
} 