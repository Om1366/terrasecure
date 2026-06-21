import React from 'react';

export default function ActivityList({ activities = [] }) {
  if (activities.length === 0) {
    return <div className="text-muted">No recent activity logged.</div>;
  }

  const getStyleClass = (action) => {
    if (!action) return '';
    const act = action.toLowerCase();
    if (act.includes('created')) return 'user-created';
    if (act.includes('approved')) return 'transfer-approved';
    if (act.includes('initiated')) return 'transfer-initiated';
    return '';
  };

  return (
    <div className="activity-feed">
      {activities.map((item) => (
        <div
          key={item._id || item.timestamp}
          className={`activity-item ${getStyleClass(item.action)}`}
        >
          <div className="activity-header">
            <span className="activity-title">{item.action}</span>
            <span className="activity-time">
              {item.timestamp ? new Date(item.timestamp).toLocaleString() : 'Just now'}
            </span>
          </div>
          <p className="activity-details">{item.details}</p>
          <span className="activity-user">👤 Performed by: {item.performedBy}</span>
        </div>
      ))}
    </div>
  );
}
