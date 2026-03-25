import { useAuth } from '../context/AuthContext';
import MerchantDashboard from '../components/accounts/MerchantDashboard';
import AdminDashboard from '../components/accounts/AdminDashboard';
import DirectorDashboard from '../components/accounts/DirectorDashboard';
import ManagerDashboard from '../components/accounts/ManagerDashboard';

function DashboardPage() {
  const { user } = useAuth();

  // Render a different dashboard based on who is logged in
  const renderDashboard = () => {
    if (!user || !user.role) {
      return (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
          <p>Loading dashboard...</p>
        </div>
      );
    }

    // Match exact role values from backend
    switch (user.role.toLowerCase()) {
      case 'merchant':
        return <MerchantDashboard />;
      case 'admin':
        return <AdminDashboard />;
      case 'director':
        return <DirectorDashboard />;
      case 'manager':
        return <ManagerDashboard />;
      default:
        return (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <p style={{ color: '#ef4444', fontWeight: '600', marginBottom: '0.5rem' }}>
              Unknown role: {user.role}
            </p>
            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
              Please contact your administrator
            </p>
          </div>
        );
    }
  };

  return (
    <div>
      {/* Page header - shows personalised greeting */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{
          fontSize: '1.5rem',
          fontWeight: '700',
          color: '#0f172a',
          marginBottom: '0.25rem',
        }}>
          Welcome back, {user?.username || 'User'} 👋
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
          Here's what's happening at InfoPharma today
        </p>
      </div>

      {/* Shows the correct dashboard for the logged in role */}
      {renderDashboard()}
    </div>
  );
}

export default DashboardPage;