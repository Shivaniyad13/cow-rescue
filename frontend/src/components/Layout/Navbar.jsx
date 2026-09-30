import { Link, useLocation } from 'react-router-dom';
import { Heart, Menu, X } from 'lucide-react';
import { useState } from 'react';
import './Navbar.css';

function Navbar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { path: '/', label: 'Home' },
    { path: '/report', label: 'Report Cow' },
    { path: '/track', label: 'Track Case' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-logo">
          <div className="navbar-logo-icon">
            <Heart size={20} />
          </div>
          <div className="navbar-logo-text">
            <span className="navbar-logo-title">Cow Rescue</span>
            <span className="navbar-logo-subtitle">Panchgavya Se Panchparivartan</span>
          </div>
        </Link>

        <div className="navbar-links">
          {links.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`navbar-link ${isActive(link.path) ? 'active' : ''}`}
            >
              {link.label}
            </Link>
          ))}
          <Link to="/report" className="navbar-cta">
            🚨 Report Now
          </Link>
        </div>

        <button
          className="navbar-mobile-toggle"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="navbar-mobile-menu">
          {links.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setMobileOpen(false)}
              className={`navbar-mobile-link ${isActive(link.path) ? 'active' : ''}`}
            >
              {link.label}
            </Link>
          ))}
          <Link
            to="/report"
            onClick={() => setMobileOpen(false)}
            className="navbar-mobile-cta"
          >
            🚨 Report Now
          </Link>
        </div>
      )}
    </nav>
  );
}

export default Navbar;