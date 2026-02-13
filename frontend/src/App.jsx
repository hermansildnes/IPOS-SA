import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CataloguePage from './pages/CataloguePage';
import OrdersPage from './pages/OrdersPage';
import AccountsPage from './pages/AccountsPage';
import ReportsPage from './pages/ReportsPage';

// If someone tries to visit a protected page without being logged in,
// they get sent back to the login page automatically

function ProtectedRoute({ children }) {
  const { user } = useAuth();

  // No user logged in? Send them back to login page
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // User is logged in, let them through
  return children;
}

function App() {
  return (
    <Router>
      <Routes>
        {/* Login page - anyone can visit this */}

        <Route path="/" element={<LoginPage />} />

        {/* These pages are protected - you must be logged in to see them */}
        {/* If you're not logged in, ProtectedRoute sends you back to login */}

        <Route path="/dashboard" element={
          <ProtectedRoute><DashboardPage /></ProtectedRoute>
        } />
        <Route path="/catalogue" element={
          <ProtectedRoute><CataloguePage /></ProtectedRoute>
        } />
        <Route path="/orders" element={
          <ProtectedRoute><OrdersPage /></ProtectedRoute>
        } />
        <Route path="/accounts" element={
          <ProtectedRoute><AccountsPage /></ProtectedRoute>
        } />
        <Route path="/reports" element={
          <ProtectedRoute><ReportsPage /></ProtectedRoute>
        } />

        {/* If someone types a random URL, send them to login */}
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;