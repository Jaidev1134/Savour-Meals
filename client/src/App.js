import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import ProtectedRoute from './components/common/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import LandingPage from './pages/LandingPage';
import GlobalLogo from './components/GlobalLogo';
import PageTransition from './components/PageTransition';
import './App.css';

/* Only show GlobalLogo on non-landing pages */
const ConditionalLogo = () => {
  const location = useLocation();
  if (location.pathname === '/') return null;
  return <GlobalLogo />;
};

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <PageTransition>
            <ConditionalLogo />
            <div className="App">
              <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              </Routes>
            </div>
          </PageTransition>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;

