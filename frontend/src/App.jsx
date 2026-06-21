import React, { useState, useEffect } from 'react';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import CitizenPortal from './pages/CitizenPortal.jsx';
import OfficerDashboard from './pages/OfficerDashboard.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import Login from './pages/Login.jsx';

export default function App() {
  const [currentTab, setCurrentTab] = useState('citizen');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  // Restore session from localStorage on load
  useEffect(() => {
    const savedToken = localStorage.getItem('terrasecure_token');
    const savedUser = localStorage.getItem('terrasecure_user');

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        
        // Auto-redirect authenticated users to their corresponding view on reload
        const parsedUser = JSON.parse(savedUser);
        if (parsedUser.role === 'admin') {
          setCurrentTab('admin');
        } else if (parsedUser.role === 'officer') {
          setCurrentTab('officer');
        }
      } catch (err) {
        localStorage.removeItem('terrasecure_token');
        localStorage.removeItem('terrasecure_user');
      }
    }
  }, []);

  const handleLoginSuccess = (userToken, userData) => {
    setToken(userToken);
    setUser(userData);
    localStorage.setItem('terrasecure_token', userToken);
    localStorage.setItem('terrasecure_user', JSON.stringify(userData));

    // Redirect depending on user privilege role
    if (userData.role === 'admin') {
      setCurrentTab('admin');
    } else if (userData.role === 'officer') {
      setCurrentTab('officer');
    } else {
      setCurrentTab('citizen');
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('terrasecure_token');
    localStorage.removeItem('terrasecure_user');
    setCurrentTab('citizen');
  };

  // Safe Guard checks for dashboard access
  const renderTabContent = () => {
    switch (currentTab) {
      case 'citizen':
        return <CitizenPortal />;
      case 'login':
        return <Login onLoginSuccess={handleLoginSuccess} />;
      case 'officer':
        if (user && (user.role === 'officer' || user.role === 'admin')) {
          return <OfficerDashboard token={token} />;
        }
        return <CitizenPortal />;
      case 'admin':
        if (user && user.role === 'admin') {
          return <AdminDashboard token={token} currentUser={user} />;
        }
        return <CitizenPortal />;
      default:
        return <CitizenPortal />;
    }
  };

  return (
    <div className="app-container">
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        user={user}
        onLogout={handleLogout}
      />
      <main className="content-wrapper">
        {renderTabContent()}
      </main>
      <Footer />
    </div>
  );
}
