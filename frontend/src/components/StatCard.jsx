import React from 'react';

export default function StatCard({ label, value, icon, hoverText }) {
  return (
    <div className="metric-card" title={hoverText}>
      <div className="metric-info">
        <h3>{label}</h3>
        <div className="metric-value">{value}</div>
      </div>
      <div className="metric-icon">{icon}</div>
    </div>
  );
}
