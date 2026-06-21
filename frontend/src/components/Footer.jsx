import React from 'react';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="main-footer">
      <div className="footer-content">
        <div className="footer-left">
          <span>🛡️</span>
          <div>
            <h4>TerraSecure Systems</h4>
            <p>State Land Registry & Certified Deed Authentication Platform</p>
          </div>
        </div>
        <div className="footer-right">
          <p>© {currentYear} Department of Land Records & Registry. All rights reserved.</p>
          <p>Security Hash Auditing Enabled (AES-256 / SHA-256)</p>
        </div>
      </div>
    </footer>
  );
}
