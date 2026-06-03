import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';

export default function SignupPage() {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '' });
  const [showPw, setShowPw] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const { register, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.email || !form.password) return toast.error('Please fill all fields');
    if (form.password !== form.confirmPassword) return toast.error('Passwords do not match');
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    if (!agreed) return toast.error('Please agree to the terms');

    const result = await register(form.firstName, form.lastName, form.email, form.password);
    if (result.success) {
      toast.success('Account created! Welcome to SlideEdge!');
      navigate('/chatbot');
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="auth-page-wrapper" style={{ minHeight: '100vh', background: 'var(--bg-secondary)' }}>
      <div className="container" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center', maxWidth: 1100 }}>
        {/* Visual Side */}
        <div style={{ textAlign: 'center', animation: 'fadeInUp 0.6s ease-out' }} className="auth-visual">
          <div style={{
            background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
            borderRadius: 'var(--radius-xl)', padding: 48, color: 'white',
          }}>
            <div style={{ fontSize: '4rem', marginBottom: 20 }}>🚀</div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 12, color: 'white' }}>Join SlideEdge</h3>
            <p style={{ opacity: 0.9 }}>Start creating professional presentations for free with AI assistance.</p>
            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center', gap: 12 }}>
              {['10k+ Users', '4.9★ Rating', 'Free Plan'].map(stat => (
                <div key={stat} style={{
                  background: 'rgba(255,255,255,0.15)', padding: '8px 16px',
                  borderRadius: 'var(--radius-full)', fontSize: '0.8rem', fontWeight: 600,
                }}>{stat}</div>
              ))}
            </div>
          </div>
        </div>

        {/* Form Side */}
        <div className="auth-form-wrapper" style={{ animation: 'fadeInUp 0.6s ease-out 0.2s backwards' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: 8 }}>
            Create Your <span className="gradient-text">Free Account</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 32 }}>Join thousands of students and professionals using SlideEdge AI.</p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="grid-2" style={{ gap: 12 }}>
              <div>
                <label className="label">First Name</label>
                <div style={{ position: 'relative' }}>
                  <FiUser style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input className="input" style={{ paddingLeft: 40 }} placeholder="First Name"
                    value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">Last Name</label>
                <div style={{ position: 'relative' }}>
                  <FiUser style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input className="input" style={{ paddingLeft: 40 }} placeholder="Last Name"
                    value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} />
                </div>
              </div>
            </div>

            <div>
              <label className="label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <FiMail style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input type="email" className="input" style={{ paddingLeft: 40 }} placeholder="you@example.com"
                  value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>

            <div>
              <label className="label">Password</label>
              <div style={{ position: 'relative' }}>
                <FiLock style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input type={showPw ? 'text' : 'password'} className="input" style={{ paddingLeft: 40, paddingRight: 40 }}
                  placeholder="••••••••" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{
                  position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                  background: 'transparent', color: 'var(--text-muted)',
                }}>{showPw ? <FiEyeOff /> : <FiEye />}</button>
              </div>
            </div>

            <div>
              <label className="label">Confirm Password</label>
              <input type="password" className="input" placeholder="••••••••"
                value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} />
            </div>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input type="checkbox" style={{ marginTop: 2, accentColor: 'var(--primary)' }} checked={agreed} onChange={e => setAgreed(e.target.checked)} />
              I agree to the Terms of Service and Privacy Policy.
            </label>

            <button type="submit" className="btn btn-gradient btn-lg" style={{ width: '100%' }} disabled={loading}>
              {loading ? <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> : 'Create Account'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Already have an account? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 700 }}>Login</Link>
          </p>
        </div>
      </div>
      <style>{`@media(max-width:1024px){.auth-visual{display:none!important;}.container{grid-template-columns:1fr!important;}}`}</style>
    </div>
  );
}
