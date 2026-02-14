import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/common/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CataloguePage from './pages/CataloguePage';
import OrdersPage from './pages/OrdersPage';
import AccountsPage from './pages/AccountsPage';
import ReportsPage from './pages/ReportsPage';

// guards any route that requires the user to be logged in
// if not logged in, redirects back to the login page
function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/" replace />;
  }
  // Wrap the page in Layout so every protected page
  // automatically gets the sidebar and header
  return <Layout>{children}</Layout>;
}

function App() {
  return (
    <Router>
      <Routes>
        {/* Public - no layout, just the login page */}
        <Route path="/" element={<LoginPage />} />

        {/* Protected - all these pages get the sidebar/header via Layout */}
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

        {/* Catch any unknown URLs and send to login */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;