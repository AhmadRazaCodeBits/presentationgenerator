import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { FiMail, FiShield, FiSend } from 'react-icons/fi';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) return toast.error('Please fill all fields');
    setLoading(true);
    try {
      await api.post('/contact', form);
      toast.success('Message sent successfully!');
      setForm({ name: '', email: '', message: '' });
    } catch (error) {
      toast.error('Failed to send. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ paddingTop: 100, paddingBottom: 80, background: 'var(--surface)' }}>
      <div className="container" style={{ maxWidth: 900 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'flex-start' }} className="contact-grid">
          {/* Info Side */}
          <div style={{ animation: 'fadeInUp 0.6s ease-out' }}>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: 8 }}>
              Contact <span className="gradient-text">SlideEdge</span>
            </h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 40 }}>Have questions or feedback? Our team is here to help.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: 'rgba(108,99,255,0.1)', color: 'var(--primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}><FiMail size={20} /></div>
                <div>
                  <h4 style={{ fontWeight: 700, marginBottom: 2 }}>Email Us</h4>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>support@slideedge.ai</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: 'rgba(108,99,255,0.1)', color: 'var(--primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}><FiShield size={20} /></div>
                <div>
                  <h4 style={{ fontWeight: 700, marginBottom: 2 }}>Security</h4>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Your data is encrypted and secure.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Form Side */}
          <form onSubmit={handleSubmit} style={{
            background: 'var(--bg-secondary)', padding: 32, borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--border-light)', animation: 'fadeInUp 0.6s ease-out 0.2s backwards',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="label">Name</label>
                <input className="input" placeholder="Your name"
                  value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="label">Email</label>
                <input type="email" className="input" placeholder="you@example.com"
                  value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <label className="label">Message</label>
                <textarea className="input" rows={4} placeholder="Your message..."
                  style={{ resize: 'vertical' }}
                  value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                {loading ? <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> : <><FiSend /> Send Message</>}
              </button>
            </div>
          </form>
        </div>
      </div>
      <style>{`@media(max-width:768px){.contact-grid{grid-template-columns:1fr!important;}}`}</style>
    </div>
  );
}
