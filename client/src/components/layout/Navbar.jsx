import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { FiMenu, FiX, FiMoon, FiSun, FiUser, FiLogOut, FiGrid, FiSettings } from 'react-icons/fi';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setDropdownOpen(false);
  }, [location]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e) => {
      if (!e.target.closest('.user-dropdown')) setDropdownOpen(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [dropdownOpen]);

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/chatbot', label: 'Chatbot' },
    { to: '/templates', label: 'Templates' },
    { to: '/features', label: 'Features' },
    { to: '/how-it-works', label: 'How It Works' },
    { to: '/contact', label: 'Contact' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`} id="navbar">
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 800, fontSize: '1.1rem',
            transition: 'transform 0.3s',
          }}>S</div>
          <span className="gradient-text" style={{ fontSize: '1.3rem', fontWeight: 800 }}>SlideEdge AI</span>
        </Link>

        {/* Desktop Nav Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }} className="desktop-nav">
          {navLinks.map(link => (
            <Link key={link.to} to={link.to} className={`nav-link ${isActive(link.to) ? 'active' : ''}`}>
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }} className="desktop-nav">
          <button onClick={toggleTheme} className="btn-icon btn-ghost" style={{ borderRadius: '50%' }} aria-label="Toggle theme">
            {theme === 'dark' ? <FiSun size={18} /> : <FiMoon size={18} />}
          </button>
          
          {isAuthenticated ? (
            <div style={{ position: 'relative' }} className="user-dropdown">
              <button onClick={() => setDropdownOpen(!dropdownOpen)} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '6px 12px', borderRadius: 'var(--radius-full)',
                background: 'var(--surface-hover)', border: '1px solid var(--border-light)',
                color: 'var(--text-primary)', fontWeight: 500, fontSize: '0.9rem',
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.75rem',
                }}>
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
                {user?.firstName}
              </button>
              {dropdownOpen && (
                <div style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: 8,
                  background: 'var(--surface)', border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)',
                  minWidth: 200, padding: 8, zIndex: 200,
                  animation: 'fadeIn 0.2s ease-out',
                }}>
                  <div style={{
                    padding: '10px 12px', borderBottom: '1px solid var(--border-light)',
                    marginBottom: 4,
                  }}>
                    <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{user?.firstName} {user?.lastName}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user?.email}</p>
                  </div>
                  <Link to="/dashboard" style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 12px', borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)', fontSize: '0.9rem',
                    transition: 'background 0.2s',
                  }} onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-hover)'}
                     onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <FiGrid size={16} /> Dashboard
                  </Link>
                  <Link to="/profile" style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 12px', borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)', fontSize: '0.9rem',
                    transition: 'background 0.2s',
                  }} onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-hover)'}
                     onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <FiSettings size={16} /> Settings
                  </Link>
                  <div style={{ height: 1, background: 'var(--border-light)', margin: '4px 0' }} />
                  <button onClick={logout} style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                    padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: 'transparent',
                    color: 'var(--secondary)', fontSize: '0.9rem', textAlign: 'left',
                    transition: 'background 0.2s',
                  }} onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-hover)'}
                     onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <FiLogOut size={16} /> Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost" style={{ color: 'var(--primary)' }}>Login</Link>
              <Link to="/signup" className="btn btn-gradient">Start Free</Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button className="mobile-menu-btn" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu" style={{
          display: 'none', background: 'transparent', color: 'var(--text-primary)', fontSize: '1.5rem',
        }}>
          {mobileOpen ? <FiX /> : <FiMenu />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0,
          background: 'var(--surface)', boxShadow: 'var(--shadow-lg)',
          padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '8px',
          animation: 'fadeInUp 0.3s ease-out',
        }}>
          {navLinks.map(link => (
            <Link key={link.to} to={link.to} style={{
              padding: '12px 16px', borderRadius: 'var(--radius-sm)',
              color: isActive(link.to) ? 'var(--primary)' : 'var(--text-primary)',
              fontWeight: isActive(link.to) ? 600 : 400, background: isActive(link.to) ? 'var(--surface-hover)' : 'transparent',
            }}>
              {link.label}
            </Link>
          ))}
          <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)', margin: '8px 0' }} />
          {!isAuthenticated ? (
            <>
              <Link to="/login" style={{ padding: '12px 16px', color: 'var(--primary)', fontWeight: 600 }}>Login</Link>
              <Link to="/signup" className="btn btn-gradient" style={{ textAlign: 'center' }}>Start Free</Link>
            </>
          ) : (
            <>
              <Link to="/dashboard" style={{ padding: '12px 16px', color: 'var(--text-primary)' }}>Dashboard</Link>
              <Link to="/profile" style={{ padding: '12px 16px', color: 'var(--text-primary)' }}>Settings</Link>
              <button onClick={logout} style={{ padding: '12px 16px', color: 'var(--secondary)', textAlign: 'left', background: 'transparent' }}>Logout</button>
            </>
          )}
        </div>
      )}

      <style>{`
        @media (max-width: 1024px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: block !important; }
        }
      `}</style>
    </nav>
  );
}
