import React, { useState } from 'react';

export default function Login({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    fullName: '',
    nationalId: '',
  });

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        onLoginSuccess(data.token, data.user);
      } else {
        setError(data.message || 'Authentication failed. Please verify fields.');
      }
    } catch (err) {
      setError('Connection to auth service failed.');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to quick-fill credentials for demo testing
  const quickFill = (username, password) => {
    setIsLogin(true);
    setFormData({
      username,
      password,
      fullName: '',
      nationalId: '',
    });
  };

  return (
    <div className="login-card">
      <div className="login-header">
        <h2>{isLogin ? 'Secure Portal Access' : 'Create Citizen Account'}</h2>
        <p>
          {isLogin
            ? 'Authorized personnel and citizens sign in here.'
            : 'Register a new public title verification profile.'}
        </p>
      </div>

      <div className="login-body">
        {error && <div className="alert-box error">⚠️ {error}</div>}

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <>
              <div className="form-group">
                <label className="form-label" htmlFor="fullName">Full Name</label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  required
                  className="form-input"
                  placeholder="e.g., Jane Miller"
                  value={formData.fullName}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="nationalId">National Identity ID (NID)</label>
                <input
                  type="text"
                  id="nationalId"
                  name="nationalId"
                  required
                  className="form-input"
                  placeholder="e.g., NID-CITIZEN-051"
                  value={formData.nationalId}
                  onChange={handleInputChange}
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              required
              className="form-input"
              placeholder="Enter username"
              value={formData.username}
              onChange={handleInputChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              required
              className="form-input"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleInputChange}
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', padding: '12px', marginTop: '10px' }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : isLogin ? 'Access Registry' : 'Register Account'}
          </button>
        </form>

        <div className="login-toggle-text">
          {isLogin ? "Don't have a registry profile?" : 'Already have a profile?'}
          <button className="login-toggle-link" onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? 'Sign up (Citizen)' : 'Sign In'}
          </button>
        </div>

        {/* Demo Credentials Quick Links */}
        {isLogin && (
          <div
            style={{
              marginTop: '30px',
              paddingTop: '20px',
              borderTop: '1px solid var(--border-color)',
              fontSize: '0.85rem',
            }}
          >
            <span style={{ fontWeight: 600, color: 'var(--primary-color)', display: 'block', marginBottom: '8px' }}>
              🔑 Quick-Fill Demo Logins:
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                className="btn-secondary"
                style={{
                  fontSize: '0.75rem',
                  padding: '6px 10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
                onClick={() => quickFill('admin', 'admin123')}
              >
                <span>👤 Administrator Console</span>
                <span>admin / admin123</span>
              </button>
              <button
                type="button"
                className="btn-secondary"
                style={{
                  fontSize: '0.75rem',
                  padding: '6px 10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
                onClick={() => quickFill('officer', 'officer123')}
              >
                <span>👤 Officer / Verifier</span>
                <span>officer / officer123</span>
              </button>
              <button
                type="button"
                className="btn-secondary"
                style={{
                  fontSize: '0.75rem',
                  padding: '6px 10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
                onClick={() => quickFill('citizen', 'citizen123')}
              >
                <span>👤 Citizen / Property Owner</span>
                <span>citizen / citizen123</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
