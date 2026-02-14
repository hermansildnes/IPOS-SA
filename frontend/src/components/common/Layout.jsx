import Sidebar from './Sidebar';

// this wraps every page that requires a login
// it adds the sidebar on the left and pushes the page content to the right

// Usage: <Layout><YourPage /></Layout>
function Layout({ children }) {
  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: '#f8fafc',
    }}>
      {/* Fixed sidebar on the left - always visible */}
      <Sidebar />

      {/* main content area - offset by sidebar width (240px) */}
      <div style={{
        marginLeft: '240px',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
      }}>
        {/* Top header bar */}
        <header style={{
          height: '60px',
          background: 'white',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          padding: '0 1.5rem',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}>
          <p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
            InfoPharma Ordering System · Server Application
          </p>
        </header>

        {/* The actual page content gets rendered here */}
        <main style={{
          flex: 1,
          padding: '2rem',
          overflow: 'auto',
        }}>
          {children}
        </main>
      </div>
    </div>
  );
}

export default Layout;