import React, { useState, useEffect } from 'react';
import StatCard from '../components/StatCard.jsx';
import ActivityList from '../components/ActivityList.jsx';
import Modal from '../components/Modal.jsx';

export default function AdminDashboard({ token, currentUser }) {
  const [metrics, setMetrics] = useState({
    totalProperties: 0,
    totalTransfers: 0,
    pendingApprovals: 0,
    totalUsers: 0,
  });
  const [activities, setActivities] = useState([]);
  const [charts, setCharts] = useState({
    propertiesByType: [],
    propertiesByStatus: [],
    monthlyTransfers: [],
  });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modals
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);

  // Form State
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    fullName: '',
    nationalId: '',
    role: 'officer',
  });

  const fetchSummary = async () => {
    setLoading(true);
    setError('');
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      const statsRes = await fetch('/api/stats/summary', { headers });
      const statsData = await statsRes.json();

      const usersRes = await fetch('/api/users', { headers });
      const usersData = await usersRes.json();

      if (statsRes.ok && usersRes.ok) {
        setMetrics(statsData.metrics);
        setActivities(statsData.recentActivities);
        setCharts(statsData.charts);
        setUsers(usersData);
      } else {
        setError('Error fetching administrative data.');
      }
    } catch (err) {
      setError('Connection to security server failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [token]);

  // Create User
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newUser),
      });

      const data = await response.json();
      if (response.ok) {
        setSuccess(`User Account '${data.username}' created successfully.`);
        setIsAddUserOpen(false);
        setNewUser({
          username: '',
          password: '',
          fullName: '',
          nationalId: '',
          role: 'officer',
        });
        fetchSummary();
      } else {
        setError(data.message || 'Failed to create user.');
      }
    } catch (err) {
      setError('Connection failed. Could not create user account.');
    }
  };

  // Delete User
  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to revoke system access for this user?')) return;
    
    setError('');
    setSuccess('');
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (response.ok) {
        setSuccess('Access revoked and user deleted successfully.');
        fetchSummary();
      } else {
        setError(data.message || 'Failed to delete user.');
      }
    } catch (err) {
      setError('Connection failed. Could not delete user.');
    }
  };

  // Calculate maximum values for relative CSS bar widths
  const maxTypeValue = charts.propertiesByType?.length 
    ? Math.max(...charts.propertiesByType.map(c => c.value), 1)
    : 1;

  const maxTransferValue = charts.monthlyTransfers?.length
    ? Math.max(...charts.monthlyTransfers.map(c => c.count), 1)
    : 1;

  return (
    <div className="admin-dashboard">
      <div style={{ marginBottom: '25px' }}>
        <h2>System Administrator Console</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Registry statistics, user management, and security audit logs.
        </p>
      </div>

      {success && <div className="alert-box success">✔ {success}</div>}
      {error && <div className="alert-box error">⚠️ {error}</div>}

      {/* Metrics Card Grid */}
      <div className="dashboard-grid">
        <StatCard
          label="Total Properties"
          value={metrics.totalProperties}
          icon="📜"
          hoverText="Total surveyed land parcels registered in the state database"
        />
        <StatCard
          label="Total Transfers"
          value={metrics.totalTransfers}
          icon="🔄"
          hoverText="Total number of ownership deeds processed"
        />
        <StatCard
          label="Pending Verifications"
          value={metrics.pendingApprovals}
          icon="⏳"
          hoverText="Actions currently locked in the officer approval queue"
        />
        <StatCard
          label="Authorized Staff Users"
          value={metrics.totalUsers}
          icon="👥"
          hoverText="Total registered admin, officer, and citizen portal logins"
        />
      </div>

      <div className="dashboard-sections">
        {/* Left Column: Charts + Users List */}
        <div>
          {/* Chart Panel */}
          <div className="section-panel" style={{ marginBottom: '30px' }}>
            <div className="panel-header">
              <h2>📊 Registry Analytics</h2>
            </div>
            
            <div className="analytics-chart-panel">
              <div className="chart-card">
                <h4>Land Classification Distribution</h4>
                {charts.propertiesByType?.length === 0 ? (
                  <div className="text-muted" style={{ fontSize: '0.85rem' }}>No classification data.</div>
                ) : (
                  <div className="bar-chart-container">
                    {charts.propertiesByType.map((type) => (
                      <div className="bar-chart-row" key={type.name}>
                        <div className="chart-row-label">{type.name}</div>
                        <div className="chart-row-bar-wrapper">
                          <div
                            className="chart-row-bar-fill"
                            style={{ width: `${(type.value / maxTypeValue) * 100}%` }}
                          ></div>
                        </div>
                        <div className="chart-row-value">{type.value}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="chart-card">
                <h4>Deed Transfers Volume (Last 6 Months)</h4>
                {charts.monthlyTransfers?.length === 0 ? (
                  <div className="text-muted" style={{ fontSize: '0.85rem' }}>No transfer volumes recorded.</div>
                ) : (
                  <div className="bar-chart-container">
                    {charts.monthlyTransfers.map((m) => (
                      <div className="bar-chart-row" key={m.month}>
                        <div className="chart-row-label">{m.month}</div>
                        <div className="chart-row-bar-wrapper">
                          <div
                            className="chart-row-bar-fill gold"
                            style={{ width: `${(m.count / maxTransferValue) * 100}%` }}
                          ></div>
                        </div>
                        <div className="chart-row-value">{m.count}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* User Management Panel */}
          <div className="section-panel">
            <div className="panel-header">
              <h2>👥 System Access Credentials</h2>
              <button className="panel-action-btn" onClick={() => setIsAddUserOpen(true)}>
                🔑 Create Staff Credentials
              </button>
            </div>

            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Full Name</th>
                    <th>National ID</th>
                    <th>Role Badge</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u._id}>
                      <td className="monospace" style={{ fontWeight: 600 }}>{u.username}</td>
                      <td>{u.fullName}</td>
                      <td className="monospace">{u.nationalId}</td>
                      <td>
                        <span className={`user-role-badge ${u.role}`}>{u.role}</span>
                      </td>
                      <td>
                        <button
                          className="btn-action-sm btn-delete"
                          disabled={u.username === currentUser?.username}
                          style={{
                            opacity: u.username === currentUser?.username ? 0.4 : 1,
                            cursor: u.username === currentUser?.username ? 'not-allowed' : 'pointer',
                          }}
                          onClick={() => handleDeleteUser(u._id)}
                        >
                          Revoke Access
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Recent Activities Log */}
        <div className="section-panel">
          <div className="panel-header">
            <h2>📜 Certified Audit Logs</h2>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Realtime ledger</span>
          </div>
          <ActivityList activities={activities} />
        </div>
      </div>

      {/* Add User Modal */}
      <Modal isOpen={isAddUserOpen} onClose={() => setIsAddUserOpen(false)} title="Create Secure Credentials">
        <form onSubmit={handleCreateUser}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="e.g., Samuel Drake"
              value={newUser.fullName}
              onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">National Identity ID (NID)</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="e.g., NID-OFFICER-005"
              value={newUser.nationalId}
              onChange={(e) => setNewUser({ ...newUser, nationalId: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                type="text"
                required
                className="form-input"
                placeholder="e.g., samdrake"
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Role Privilege</label>
              <select
                className="form-input"
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
              >
                <option value="officer">Officer (Verifier)</option>
                <option value="admin">Administrator (Full Audit)</option>
                <option value="citizen">Citizen (Verification Only)</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Default Access Password</label>
            <input
              type="password"
              required
              className="form-input"
              placeholder="••••••••"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setIsAddUserOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Generate Account
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
