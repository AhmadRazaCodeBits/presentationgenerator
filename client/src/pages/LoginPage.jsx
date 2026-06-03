import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return toast.error('Please fill all fields');
    const result = await login(form.email, form.password);
    if (result.success) {
      toast.success('Welcome back!');
      navigate('/chatbot');
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="auth-page-wrapper" style={{ minHeight: '100vh', background: 'var(--bg-secondary)' }}>
      <div className="container" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center', maxWidth: 1100 }}>
        {/* Form Side */}
        <div className="auth-form-wrapper" style={{ animation: 'fadeInUp 0.6s ease-out' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: 8 }}>
            Login to <span className="gradient-text">SlideEdge</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 32 }}>Welcome back! Login to continue creating AI presentations.</p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label className="label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <FiMail style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input type="email" className="input" style={{ paddingLeft: 40 }}
                  placeholder="you@example.com"
                  value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="label">Password</label>
              <div style={{ position: 'relative' }}>
                <FiLock style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input type={showPw ? 'text' : 'password'} className="input" style={{ paddingLeft: 40, paddingRight: 40 }}
                  placeholder="••••••••"
                  value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{
                  position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                  background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer',
                }}>
                  {showPw ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <input type="checkbox" style={{ accentColor: 'var(--primary)' }} /> Remember me
              </label>
            </div>

            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
              {loading ? <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> : 'Login'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 24, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Don't have an account? <Link to="/signup" style={{ color: 'var(--primary)', fontWeight: 700 }}>Sign Up Free</Link>
          </p>
        </div>

        {/* Visual Side */}
        <div style={{ textAlign: 'center', animation: 'fadeInUp 0.6s ease-out 0.2s backwards' }} className="auth-visual">
          <div style={{
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
            borderRadius: 'var(--radius-xl)', padding: 48, color: 'white',
          }}>
            <div style={{ fontSize: '4rem', marginBottom: 20 }}>🎨</div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 12, color: 'white' }}>AI-Powered Presentations</h3>
            <p style={{ opacity: 0.9 }}>Create beautiful slides in seconds with the power of artificial intelligence.</p>
            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center', gap: 12 }}>
              {['Fast', 'Beautiful', 'Bilingual'].map(tag => (
                <span key={tag} style={{
                  padding: '6px 14px', borderRadius: 'var(--radius-full)',
                  background: 'rgba(255,255,255,0.15)', fontSize: '0.8rem', fontWeight: 600,
                }}>{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
      <style>{`@media(max-width:1024px){.auth-visual{display:none!important;}.container{grid-template-columns:1fr!important;}}`}</style>
    </div>
  );
}
