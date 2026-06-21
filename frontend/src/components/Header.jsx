import React from 'react';

export default function Header({ currentTab, setCurrentTab, user, onLogout }) {
  return (
    <header className="app-header">
      <div className="official-banner">
        <span>🏛️ Official State Government Portal • Authorized Secure Registry</span>
      </div>
      <div className="main-header">
        <div className="header-content">
          <div className="brand-section">
            <span className="logo-icon">🛡️</span>
            <div className="brand-text">
              <h1>TerraSecure</h1>
              <span>State Land Registry System</span>
            </div>
          </div>

          <nav className="main-nav">
            <button
              className={`nav-link ${currentTab === 'citizen' ? 'active' : ''}`}
              onClick={() => setCurrentTab('citizen')}
            >
              🔍 Citizen Search Portal
            </button>

            {user && (user.role === 'officer' || user.role === 'admin') && (
              <button
                className={`nav-link ${currentTab === 'officer' ? 'active' : ''}`}
                onClick={() => setCurrentTab('officer')}
              >
                📋 Officer Dashboard
              </button>
            )}

            {user && user.role === 'admin' && (
              <button
                className={`nav-link ${currentTab === 'admin' ? 'active' : ''}`}
                onClick={() => setCurrentTab('admin')}
              >
                ⚙️ Admin Panel
              </button>
            )}

            {!user ? (
              <button
                className={`nav-link ${currentTab === 'login' ? 'active' : ''}`}
                onClick={() => setCurrentTab('login')}
              >
                🔑 Portal Access Login
              </button>
            ) : (
              <div className="user-badge-container">
                <span className="user-role-badge officer">{user.fullName}</span>
                <span className={`user-role-badge ${user.role}`}>{user.role}</span>
                <button className="logout-btn" onClick={onLogout}>
                  Log Out
                </button>
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
