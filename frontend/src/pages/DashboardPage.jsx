import { useAuth } from '../context/AuthContext';
import MerchantDashboard from '../components/accounts/MerchantDashboard';
import AdminDashboard from '../components/accounts/AdminDashboard';
import DirectorDashboard from '../components/accounts/DirectorDashboard';
import ManagerDashboard from '../components/accounts/ManagerDashboard';

function DashboardPage() {
  const { user } = useAuth();

  // render a different dashboard based on who is logged in
  // each role has different priorities and needs different information upfront
  const renderDashboard = () => {
    switch (user?.role) {
      case 'merchant':
        return <MerchantDashboard />;
      case 'admin':
        return <AdminDashboard />;
      case 'director':
        return <DirectorDashboard />;
      case 'manager':
        return <ManagerDashboard />;
      default:
        return <p>Unknown role - please contact your administrator</p>;
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
          Welcome back, {user?.name} 👋
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
          Here's what's happening at InfoPharma today
        </p>
      </div>

      {/* shows the correct dashboard for the logged in role */}
      {renderDashboard()}
    </div>
  );
}

export default DashboardPage;