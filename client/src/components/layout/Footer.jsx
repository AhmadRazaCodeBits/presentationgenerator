import { Link } from 'react-router-dom';
import { FiTwitter, FiLinkedin, FiGithub } from 'react-icons/fi';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '40px', marginBottom: '48px' }}>
          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontWeight: 800,
              }}>S</div>
              <span style={{ fontSize: '1.2rem', fontWeight: 800 }}>SlideEdge AI</span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.7 }}>
              Turn ideas into professional presentations instantly with AI. Supports English & Urdu.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 style={{ fontWeight: 700, marginBottom: 16, color: 'white' }}>Product</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Link to="/chatbot">Chatbot</Link>
              <Link to="/templates">Templates</Link>
              <Link to="/features">Features</Link>
            </div>
          </div>

          {/* Resources */}
          <div>
            <h4 style={{ fontWeight: 700, marginBottom: 16, color: 'white' }}>Resources</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Link to="/how-it-works">How It Works</Link>
              <a href="#">Help Center</a>
              <a href="#">Tutorials</a>
            </div>
          </div>

          {/* Company */}
          <div>
            <h4 style={{ fontWeight: 700, marginBottom: 16, color: 'white' }}>Company</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <a href="#">About</a>
              <Link to="/contact">Contact</Link>
              <a href="#">Careers</a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 24,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16,
        }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>© 2026 SlideEdge AI – All Rights Reserved</p>
          <div style={{ display: 'flex', gap: 16 }}>
            <a href="#" style={{ color: 'var(--text-muted)' }}><FiTwitter size={18} /></a>
            <a href="#" style={{ color: 'var(--text-muted)' }}><FiLinkedin size={18} /></a>
            <a href="#" style={{ color: 'var(--text-muted)' }}><FiGithub size={18} /></a>
          </div>
        </div>
      </div>
    </footer>
  );
}
