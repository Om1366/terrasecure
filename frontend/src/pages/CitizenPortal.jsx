import React, { useState } from 'react';

export default function CitizenPortal() {
  const [searchQuery, setSearchQuery] = useState('');
  const [property, setProperty] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError('');
    setProperty(null);

    try {
      const response = await fetch(`/api/properties/search/${searchQuery.trim().toUpperCase()}`);
      const data = await response.json();

      if (response.ok) {
        setProperty(data);
      } else {
        setError(data.message || 'Property not found. Please double-check the ID.');
      }
    } catch (err) {
      setError('Connection to registry server failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="citizen-portal">
      <div className="hero-section">
        <h2>National Property Verification Portal</h2>
        <p>
          Verify land deeds, boundary registrations, ownership statuses, and cryptographic integrity hashes
          directly from the official state land registry database.
        </p>
      </div>

      <form className="search-container" onSubmit={handleSearch}>
        <div className="search-input-wrapper">
          <span className="search-icon-prefix">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="Enter Property ID (e.g., PROP-2026-1001)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button type="submit" className="search-button" disabled={loading}>
          {loading ? 'Searching...' : 'Verify Record'}
        </button>
      </form>

      {error && (
        <div className="alert-box error" style={{ maxWidth: '650px', margin: '0 auto 30px' }}>
          ⚠️ {error}
        </div>
      )}

      {property && (
        <div className="certificate-card">
          <div className="certificate-border-line"></div>
          
          <div className="certificate-header">
            <span className="cert-subtitle">Official State Land Registry</span>
            <h2 className="cert-title">Land Title Certificate</h2>
          </div>

          <div className="certificate-body">
            <div className="cert-details-grid">
              <div className="cert-field">
                <span className="cert-label">Property Registration ID</span>
                <div className="cert-value monospace" style={{ color: 'var(--accent-color)' }}>
                  {property.propertyId}
                </div>
              </div>

              <div className="cert-field">
                <span className="cert-label">Registered Property Address</span>
                <div className="cert-value">{property.address}</div>
              </div>

              <div className="cert-field" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <span className="cert-label">Total Surveyed Area</span>
                  <div className="cert-value">{property.area} Sq Meters</div>
                </div>
                <div>
                  <span className="cert-label">Land Classification</span>
                  <div className="cert-value">{property.propertyType}</div>
                </div>
              </div>

              <div className="cert-field">
                <span className="cert-label">Primary Title Deed Owner</span>
                <div className="cert-value" style={{ textTransform: 'uppercase' }}>
                  {property.currentOwner}
                </div>
              </div>

              <div className="cert-field">
                <span className="cert-label">Survey boundary coordinates</span>
                <div className="cert-value monospace" style={{ fontSize: '0.8rem', wordBreak: 'break-all' }}>
                  {property.boundaryCoordinates}
                </div>
              </div>

              <div className="cert-field">
                <span className="cert-label">Database Registry SHA-256 Hash</span>
                <div className="cert-value monospace" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {property.securityHash}
                </div>
              </div>
            </div>

            <div className="cert-right-panel">
              <div className="security-seal">
                <span className="seal-emblem">🛡️</span>
                <span className="seal-text">Official Seal<br />Verified</span>
              </div>

              <div style={{ textAlign: 'center', width: '100%' }}>
                <span className="cert-label">Registry Status</span>
                <div style={{ marginTop: '8px' }}>
                  <span className={`cert-status ${property.status.toLowerCase().replace(' ', '-')}`}>
                    {property.status}
                  </span>
                </div>
              </div>

              <div className="digital-signature-box">
                <div className="signature-line">
                  Registrar General Signature
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!property && !error && !loading && (
        <div style={{ maxWidth: '650px', margin: '40px auto', textAlign: 'center', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: '0.95rem', fontStyle: 'italic' }}>
            Note: All certified ownership deeds contain a cryptographic SHA-256 security code printed at the footer.
            Use this search portal to verify that the digital registry database matches the details on your physical deed.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', marginTop: '30px', opacity: 0.7 }}>
            <div>🏢 <strong>100%</strong> Online Records</div>
            <div>⚡ <strong>Instant</strong> Verification</div>
            <div>🔐 <strong>SHA-256</strong> Sealed Deeds</div>
          </div>
        </div>
      )}
    </div>
  );
}
