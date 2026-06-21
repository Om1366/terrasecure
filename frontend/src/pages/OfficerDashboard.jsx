import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal.jsx';

export default function OfficerDashboard({ token }) {
  const [properties, setProperties] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modals Toggles
  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  // Form States
  const [newProperty, setNewProperty] = useState({
    address: '',
    area: '',
    propertyType: 'Residential',
    currentOwner: '',
    boundaryCoordinates: '',
  });

  const [newTransfer, setNewTransfer] = useState({
    propertyId: '',
    fromOwner: '',
    toOwner: '',
    saleValue: '',
  });

  // Fetch Dashboard Data
  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      const propertiesRes = await fetch('/api/properties', { headers });
      const propertiesData = await propertiesRes.json();

      const transfersRes = await fetch('/api/transfers', { headers });
      const transfersData = await transfersRes.json();

      if (propertiesRes.ok && transfersRes.ok) {
        setProperties(propertiesData);
        setTransfers(transfersData);
      } else {
        setError('Failed to fetch registry data. Please re-authenticate.');
      }
    } catch (err) {
      setError('Connection to registry server failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  // Handle Property Registration
  const handleRegisterProperty = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/properties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newProperty),
      });

      const data = await response.json();
      if (response.ok) {
        setSuccess(`Property ${data.propertyId} registered successfully.`);
        setIsPropertyModalOpen(false);
        setNewProperty({
          address: '',
          area: '',
          propertyType: 'Residential',
          currentOwner: '',
          boundaryCoordinates: '',
        });
        fetchData();
      } else {
        setError(data.message || 'Failed to register property.');
      }
    } catch (err) {
      setError('Connection failed. Could not register property.');
    }
  };

  // Pre-fill "fromOwner" when Property ID is entered/selected
  const handlePropertyIdChange = (propertyId) => {
    const prop = properties.find((p) => p.propertyId === propertyId);
    setNewTransfer({
      ...newTransfer,
      propertyId,
      fromOwner: prop ? prop.currentOwner : '',
    });
  };

  // Handle Transfer Initiation
  const handleInitiateTransfer = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/transfers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newTransfer),
      });

      const data = await response.json();
      if (response.ok) {
        setSuccess(`Transfer transaction ${data.transferId} initiated and queued.`);
        setIsTransferModalOpen(false);
        setNewTransfer({
          propertyId: '',
          fromOwner: '',
          toOwner: '',
          saleValue: '',
        });
        fetchData();
      } else {
        setError(data.message || 'Failed to initiate transfer.');
      }
    } catch (err) {
      setError('Connection failed. Could not initiate transfer.');
    }
  };

  // Handle Transfer Approval/Rejection
  const handleProcessTransfer = async (transferId, action) => {
    setError('');
    setSuccess('');
    try {
      const response = await fetch(`/api/transfers/${transferId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      });

      const data = await response.json();
      if (response.ok) {
        setSuccess(
          action === 'Approve'
            ? `Transfer approved successfully. Record verified and sealed.`
            : `Transfer rejected. Property hold released.`
        );
        fetchData();
      } else {
        setError(data.message || 'Failed to process transaction.');
      }
    } catch (err) {
      setError('Connection failed. Could not process transaction.');
    }
  };

  // Filter transfers pending approval
  const pendingTransfers = transfers.filter((t) => t.status === 'Pending Approval');

  return (
    <div className="officer-dashboard">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
        <div>
          <h2>Officer Operations Panel</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Verify, modify, and authorize title deeds.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="panel-action-btn" onClick={() => setIsPropertyModalOpen(true)}>
            ➕ Register Land Plot
          </button>
          <button
            className="panel-action-btn"
            style={{ background: 'var(--accent-color)' }}
            onClick={() => setIsTransferModalOpen(true)}
          >
            🔄 Transfer Ownership
          </button>
        </div>
      </div>

      {success && <div className="alert-box success">✔ {success}</div>}
      {error && <div className="alert-box error">⚠️ {error}</div>}

      {/* Grid of Sections */}
      <div className="dashboard-sections">
        {/* Left Column: Properties List */}
        <div className="section-panel">
          <div className="panel-header">
            <h2>📜 State Land Registry Book</h2>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Total records: {properties.length}
            </span>
          </div>

          {loading && <div style={{ textAlign: 'center', padding: '20px' }}>Loading registry...</div>}

          {!loading && properties.length === 0 && (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
              No properties registered in the system database. Click "Register Land Plot" above.
            </div>
          )}

          {!loading && properties.length > 0 && (
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Plot ID</th>
                    <th>Owner</th>
                    <th>Address</th>
                    <th>Area (sqm)</th>
                    <th>Classification</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {properties.map((prop) => (
                    <tr key={prop._id}>
                      <td className="monospace" style={{ fontWeight: 600, color: 'var(--secondary-color)' }}>
                        {prop.propertyId}
                      </td>
                      <td style={{ fontWeight: 500 }}>{prop.currentOwner}</td>
                      <td>{prop.address}</td>
                      <td>{prop.area}</td>
                      <td>{prop.propertyType}</td>
                      <td>
                        <span className={`status-badge ${prop.status.toLowerCase().replace(' ', '-')}`}>
                          {prop.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column: Approvals Queue */}
        <div className="section-panel">
          <div className="panel-header">
            <h2>⏳ Pending Verification</h2>
            <span className="status-badge pending" style={{ fontSize: '0.8rem' }}>
              {pendingTransfers.length} Action(s)
            </span>
          </div>

          {pendingTransfers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              ✓ All clear! There are no pending land transfer applications in the verification queue.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {pendingTransfers.map((tx) => (
                <div
                  key={tx._id}
                  style={{
                    background: 'var(--bg-color)',
                    padding: '16px',
                    borderRadius: 'var(--border-radius-sm)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span className="monospace" style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                      {tx.transferId}
                    </span>
                    <span className="status-badge pending">Transfer Pending</span>
                  </div>

                  <div style={{ fontSize: '0.85rem', marginBottom: '12px' }}>
                    <div>
                      <strong>Plot:</strong> {tx.propertyId}
                    </div>
                    <div>
                      <strong>Seller:</strong> {tx.fromOwner}
                    </div>
                    <div>
                      <strong>Buyer:</strong> {tx.toOwner}
                    </div>
                    <div>
                      <strong>Value:</strong> ${tx.saleValue?.toLocaleString()}
                    </div>
                    <div style={{ color: 'var(--text-muted)', marginTop: '4px', fontSize: '0.75rem' }}>
                      <strong>Deed Signature:</strong>
                      <span className="monospace" style={{ display: 'block', wordBreak: 'break-all' }}>
                        {tx.deedHash?.substring(0, 30)}...
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      className="btn-action-sm btn-approve"
                      style={{ flexGrow: 1 }}
                      onClick={() => handleProcessTransfer(tx._id, 'Approve')}
                    >
                      ✓ Approve Title
                    </button>
                    <button
                      className="btn-action-sm btn-reject"
                      style={{ flexGrow: 1 }}
                      onClick={() => handleProcessTransfer(tx._id, 'Reject')}
                    >
                      ✗ Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Register Property Modal */}
      <Modal
        isOpen={isPropertyModalOpen}
        onClose={() => setIsPropertyModalOpen(false)}
        title="Register New Land Record"
      >
        <form onSubmit={handleRegisterProperty}>
          <div className="form-group">
            <label className="form-label">Owner Name</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="e.g., John Miller"
              value={newProperty.currentOwner}
              onChange={(e) => setNewProperty({ ...newProperty, currentOwner: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Property Address</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="e.g., 405 Pine Street, Sector 2"
              value={newProperty.address}
              onChange={(e) => setNewProperty({ ...newProperty, address: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div className="form-group">
              <label className="form-label">Area (Sq Meters)</label>
              <input
                type="number"
                required
                className="form-input"
                placeholder="e.g., 850"
                value={newProperty.area}
                onChange={(e) => setNewProperty({ ...newProperty, area: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Classification</label>
              <select
                className="form-input"
                value={newProperty.propertyType}
                onChange={(e) => setNewProperty({ ...newProperty, propertyType: e.target.value })}
              >
                <option value="Residential">Residential</option>
                <option value="Commercial">Commercial</option>
                <option value="Agricultural">Agricultural</option>
                <option value="Industrial">Industrial</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Boundary Coordinates (GIS Polygon)</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="Polygon((0 0, 0 10, 10 10, 10 0, 0 0))"
              value={newProperty.boundaryCoordinates}
              onChange={(e) => setNewProperty({ ...newProperty, boundaryCoordinates: e.target.value })}
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setIsPropertyModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Register Plot
            </button>
          </div>
        </form>
      </Modal>

      {/* Initiate Transfer Modal */}
      <Modal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        title="Propose Ownership Transfer"
      >
        <form onSubmit={handleInitiateTransfer}>
          <div className="form-group">
            <label className="form-label">Property ID</label>
            <select
              required
              className="form-input"
              value={newTransfer.propertyId}
              onChange={(e) => handlePropertyIdChange(e.target.value)}
            >
              <option value="">-- Select Registered Plot --</option>
              {properties
                .filter((p) => p.status === 'Registered')
                .map((p) => (
                  <option key={p._id} value={p.propertyId}>
                    {p.propertyId} - {p.address} ({p.currentOwner})
                  </option>
                ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Current Owner (Seller)</label>
            <input type="text" readOnly className="form-input" style={{ background: '#e2e8f0' }} value={newTransfer.fromOwner} />
          </div>

          <div className="form-group">
            <label className="form-label">New Owner (Buyer)</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="e.g., Elizabeth Vance"
              value={newTransfer.toOwner}
              onChange={(e) => setNewTransfer({ ...newTransfer, toOwner: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Sale/Deed Value ($)</label>
            <input
              type="number"
              required
              className="form-input"
              placeholder="e.g., 250000"
              value={newTransfer.saleValue}
              onChange={(e) => setNewTransfer({ ...newTransfer, saleValue: e.target.value })}
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setIsTransferModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Initiate Transfer
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
