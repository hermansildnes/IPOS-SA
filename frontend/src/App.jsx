import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CataloguePage from './pages/CataloguePage';
import OrdersPage from './pages/OrdersPage';
import AccountsPage from './pages/AccountsPage';
import ReportsPage from './pages/ReportsPage';



function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        {/* Simple Navigation Bar for Testing */}
        <nav className="bg-primary-600 text-white p-4 shadow-md">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <h1 className="text-xl font-bold">IPOS-SA</h1>
            <div className="flex gap-4">
              <Link to="/" className="hover:text-primary-200">Login</Link>
              <Link to="/dashboard" className="hover:text-primary-200">Dashboard</Link>
              <Link to="/catalogue" className="hover:text-primary-200">Catalogue</Link>
              <Link to="/orders" className="hover:text-primary-200">Orders</Link>
              <Link to="/accounts" className="hover:text-primary-200">Accounts</Link>
              <Link to="/reports" className="hover:text-primary-200">Reports</Link>
            </div>
          </div>
        </nav>

        {/* Routes */}
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/catalogue" element={<CataloguePage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/accounts" element={<AccountsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;