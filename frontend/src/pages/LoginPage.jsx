import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiUser, FiLock, FiAlertCircle } from 'react-icons/fi';
// Import our team logo from the assets folder

import logo from '../assets/logo.png';

function LoginPage() {


  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // isLoading controls if we show the spinning animation
 
  const [isLoading, setIsLoading] = useState(false);

  // useAuth() gives us access to our global login state
  // login = the function that checks credentials against mock users
  // error = any error message from a failed login attempt

  const { login, error } = useAuth();

  const navigate = useNavigate();

  // This runs when the user clicks the Sign In button
  

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    // Call login 
    const success = await login(username, password);

    if (success) {
      navigate('/dashboard');
    }

    setIsLoading(false);
  };

  // We use inline styles here instead of Tailwind CSS classes because i ran into PostCSS compatibility issues with Vite 8
  // TODO: Migrate back to Tailwind when the PostCSS issue is resolved

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 40%, #312e81 70%, #4338ca 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      fontFamily: "'Inter', -apple-system, sans-serif"
    }}>


      <div style={{
        position: 'fixed',
        top: '-10rem',
        right: '-10rem',
        width: '40rem',
        height: '40rem',
        borderRadius: '50%',
        background: 'rgba(99, 102, 241, 0.15)',
        filter: 'blur(60px)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'fixed',
        bottom: '-10rem',
        left: '-10rem',
        width: '40rem',
        height: '40rem',
        borderRadius: '50%',
        background: 'rgba(139, 92, 246, 0.15)',
        filter: 'blur(60px)',
        pointerEvents: 'none'
      }} />

      {/* Main content container - centered on screen */}
      <div style={{ width: '100%', maxWidth: '420px', position: 'relative' }}>

        {/* Logo and title section at the top of the card */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          {/* White circle container for the logo */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '80px',
            height: '80px',
            background: 'white',
            borderRadius: '50%',
            marginBottom: '1rem',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            overflow: 'hidden'
          }}>
            {/* Team logo loaded from src/assets/logo.png */}
            <img
              src={logo}
              alt="Company Logo"
              style={{ width: '60px', height: '60px', objectFit: 'contain' }}
            />
          </div>

          {/* App name and description */}
          <h1 style={{
            fontSize: '2rem',
            fontWeight: '700',
            color: 'white',
            marginBottom: '0.25rem',
            letterSpacing: '-0.025em'
          }}>
            IPOS-SA
          </h1>
          <p style={{ color: '#a5b4fc', fontSize: '0.875rem' }}>
            InfoPharma Ordering System
          </p>
          <p style={{ color: '#818cf8', fontSize: '0.75rem', marginTop: '0.25rem' }}>
            Server Application · Team A
          </p>
        </div>

        {/* Main login card - uses a glass morphism effect
            (semi-transparent background with blur) */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(20px)',
          borderRadius: '1.5rem',
          padding: '2rem',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 25px 50px rgba(0,0,0,0.4)'
        }}>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            color: 'white',
            marginBottom: '1.5rem'
          }}>
            Sign in to your account
          </h2>

          {/* Error message box - only renders if there's an error
              The error comes from AuthContext when login fails */}
          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#fca5a5',
              padding: '0.75rem 1rem',
              borderRadius: '0.75rem',
              marginBottom: '1.5rem',
              fontSize: '0.875rem'
            }}>
              <FiAlertCircle style={{ flexShrink: 0 }} />
              <p>{error}</p>
            </div>
          )}

          {/* Login form - onSubmit calls our handleLogin function above */}
          <form onSubmit={handleLogin} style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}>

            {/* Username input field */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#c7d2fe',
                marginBottom: '0.5rem'
              }}>
                Username
              </label>
              <div style={{ position: 'relative' }}>
                {/* User icon positioned inside the left side of the input */}
                <div style={{
                  position: 'absolute',
                  left: '0.875rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#818cf8',
                  pointerEvents: 'none'
                }}>
                  <FiUser size={16} />
                </div>
                <input
                  type="text"
                  value={username}
                  // Updates the username state every time the user types
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  required
                  style={{
                    width: '100%',
                    paddingLeft: '2.5rem',
                    paddingRight: '1rem',
                    paddingTop: '0.75rem',
                    paddingBottom: '0.75rem',
                    background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '0.75rem',
                    color: 'white',
                    fontSize: '0.875rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s'
                  }}
                  // onFocus and onBlur change the border colour when
                  // the user clicks into/out of the input field
                  // This gives visual feedback that the field is active
                  onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
                />
              </div>
            </div>

            {/* Password input field - same structure as username above */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#c7d2fe',
                marginBottom: '0.5rem'
              }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                {/* Lock icon positioned inside the left side of the input */}
                <div style={{
                  position: 'absolute',
                  left: '0.875rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#818cf8',
                  pointerEvents: 'none'
                }}>
                  <FiLock size={16} />
                </div>
                <input
                  type="password"
                  value={password}
                  // Updates the password state every time the user types
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  style={{
                    width: '100%',
                    paddingLeft: '2.5rem',
                    paddingRight: '1rem',
                    paddingTop: '0.75rem',
                    paddingBottom: '0.75rem',
                    background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '0.75rem',
                    color: 'white',
                    fontSize: '0.875rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
                />
              </div>
            </div>

            {/* Submit button - disabled while loading to prevent double clicks
                Changes appearance based on isLoading state */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '0.875rem',
                // Dimmed purple when loading, gradient purple when ready
                background: isLoading
                  ? 'rgba(99, 102, 241, 0.5)'
                  : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '0.75rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                transition: 'opacity 0.2s',
                boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)'
              }}
            >
              {/* Show spinner + text when loading, just text when ready */}
              {isLoading ? (
                <>
                  {/* CSS spinner - rotates via the spin animation at the bottom */}
                  <div style={{
                    width: '1rem',
                    height: '1rem',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                  }} />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Quick fill buttons for test credentials
              Color coding helps identify roles at a glance:
              Red = Admin, Amber = Director, Green = Manager, Indigo = Merchant
              TODO: Remove this entire section before the final demo */}
          <div style={{
            marginTop: '1.5rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid rgba(255,255,255,0.1)'
          }}>
            <p style={{
              fontSize: '0.7rem',
              fontWeight: '600',
              color: '#6b7280',
              marginBottom: '0.75rem',
              letterSpacing: '0.05em'
            }}>
              TEST CREDENTIALS (remove before final demo)
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.5rem'
            }}>
              {[
                { role: 'Admin', user: 'admin', pass: 'admin123', color: '#ef4444' },
                { role: 'Director', user: 'director', pass: 'director123', color: '#f59e0b' },
                { role: 'Manager', user: 'manager', pass: 'manager123', color: '#10b981' },
                { role: 'Merchant', user: 'merchant1', pass: 'merchant123', color: '#6366f1' },  // ← FIXED
              ].map((cred) => (
                // Clicking a credential card auto fills the form above
                // so testers don't have to type credentials manually
                <button
                  key={cred.role}
                  onClick={() => {
                    setUsername(cred.user);
                    setPassword(cred.pass);
                  }}
                  style={{
                    textAlign: 'left',
                    padding: '0.625rem 0.75rem',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '0.625rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  // Hover effect - slightly lighter background on mouse over
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                >
                  <p style={{
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: cred.color,
                    marginBottom: '0.1rem'
                  }}>
                    {cred.role}
                  </p>
                  <p style={{ fontSize: '0.7rem', color: '#9ca3af' }}>
                    {cred.user}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Page footer */}
        <p style={{
          textAlign: 'center',
          color: '#4b5563',
          fontSize: '0.75rem',
          marginTop: '1.5rem'
        }}>
          InfoPharma Ltd. © 2026 · IPOS-SA v1.0
        </p>
      </div>

      {/* Global styles injected here:
          spin = the rotation animation used by the loading spinner
          input::placeholder = makes placeholder text semi-transparent white */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        input::placeholder {
          color: rgba(255,255,255,0.25);
        }
      `}</style>
    </div>
  );
}

export default LoginPage;