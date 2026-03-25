import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/common/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CataloguePage from './pages/CataloguePage';
import OrdersPage from './pages/OrdersPage';
import AccountsPage from './pages/AccountsPage';
import AccountDetailPage from './pages/AccountDetailPage';
import CreateAccountPage from './pages/CreateAccountPage';
import ReportsPage from './pages/ReportsPage';
import PlaceOrderPage from './pages/PlaceOrderPage';
import OrderDetailPage from './pages/OrderDetailPage';
import ApplicationsPage from './pages/ApplicationsPage';

// Guards any route that requires the user to be logged in
// If not logged in, redirects back to the login page
function ProtectedRoute({ children }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Wrap the page in Layout so every protected page
  // automatically gets the sidebar and header
  return <Layout>{children}</Layout>;
}

// Extra guard for routes that only certain roles should be able to access
// If the user has the wrong role, send them back to the dashboard
function RoleRoute({ children, allowedRoles }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/" replace />;
  }

  // normalise the current user's role so comparisons are case-safe
  const userRole = user.role?.toLowerCase();

  // only allow access if the user's role is in the allowed list
  if (!allowedRoles.map(role => role.toLowerCase()).includes(userRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Layout>{children}</Layout>;
}

function App() {
  return (
    <Router>
      <Routes>
        {/* Public - no layout, just the login page */}
        <Route path="/" element={<LoginPage />} />

        {/* Dashboard - every authenticated user gets their own role-specific dashboard */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        {/* Catalogue - available to admin, manager, and merchant */}
        <Route
          path="/catalogue"
          element={
            <RoleRoute allowedRoles={['admin', 'manager', 'merchant']}>
              <CataloguePage />
            </RoleRoute>
          }
        />

        {/* Orders list - available to admin, manager, and merchant */}
        <Route
          path="/orders"
          element={
            <RoleRoute allowedRoles={['admin', 'manager', 'merchant']}>
              <OrdersPage />
            </RoleRoute>
          }
        />

        {/* Only merchants should be able to place new orders */}
        <Route
          path="/orders/new"
          element={
            <RoleRoute allowedRoles={['merchant']}>
              <PlaceOrderPage />
            </RoleRoute>
          }
        />

        {/* Individual order detail - admin, manager, and merchant can view */}
        <Route
          path="/orders/:orderId"
          element={
            <RoleRoute allowedRoles={['admin', 'manager', 'merchant']}>
              <OrderDetailPage />
            </RoleRoute>
          }
        />

        {/* Accounts list - management roles only, not merchants */}
        <Route
          path="/accounts"
          element={
            <RoleRoute allowedRoles={['admin', 'manager', 'director']}>
              <AccountsPage />
            </RoleRoute>
          }
        />

        {/* Merchant self-service page so merchants can view their own account details */}
        <Route
          path="/my-account"
          element={
            <RoleRoute allowedRoles={['merchant']}>
              <AccountDetailPage />
            </RoleRoute>
          }
        />

        {/* Only admin can create new merchant accounts */}
        <Route
          path="/accounts/new"
          element={
            <RoleRoute allowedRoles={['admin']}>
              <CreateAccountPage />
            </RoleRoute>
          }
        />

        {/* Account detail for management roles viewing specific merchant accounts */}
        <Route
          path="/accounts/:id"
          element={
            <RoleRoute allowedRoles={['admin', 'manager', 'director']}>
              <AccountDetailPage />
            </RoleRoute>
          }
        />

        {/* Reports - available to management roles only */}
        <Route
          path="/reports"
          element={
            <RoleRoute allowedRoles={['admin', 'manager', 'director']}>
              <ReportsPage />
            </RoleRoute>
          }
        />

        {/* Applications page - currently restricted to admin only */}
        <Route
          path="/applications"
          element={
            <RoleRoute allowedRoles={['admin']}>
              <ApplicationsPage />
            </RoleRoute>
          }
        />

        {/* Catch any unknown URLs and send the user back to login */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;