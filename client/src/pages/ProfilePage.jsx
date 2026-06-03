import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { FiUser, FiMail, FiLock, FiSave, FiShield, FiClock, FiGrid } from 'react-icons/fi';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
  });
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName) return toast.error('Name fields are required');
    setSaving(true);
    try {
      const res = await api.put('/auth/profile', form);
      updateUser(res.data.user);
      toast.success('Profile updated!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!pwForm.current || !pwForm.newPw) return toast.error('Please fill all fields');
    if (pwForm.newPw !== pwForm.confirm) return toast.error('Passwords do not match');
    if (pwForm.newPw.length < 6) return toast.error('Password must be at least 6 characters');
    setSaving(true);
    try {
      await api.put('/auth/password', { currentPassword: pwForm.current, newPassword: pwForm.newPw });
      toast.success('Password changed successfully!');
      setPwForm({ current: '', newPw: '', confirm: '' });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: <FiUser /> },
    { id: 'security', label: 'Security', icon: <FiShield /> },
  ];

  return (
    <div style={{ paddingTop: 100, paddingBottom: 80, minHeight: '100vh', background: 'var(--bg-secondary)' }}>
      <div className="container" style={{ maxWidth: 900 }}>
        {/* Header */}
        <div style={{ marginBottom: 40, animation: 'fadeInUp 0.6s ease-out' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: 4 }}>
            Account <span className="gradient-text">Settings</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage your profile and security settings.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24 }} className="profile-grid">
          {/* Profile Card */}
          <div>
            <div className="card-flat" style={{ textAlign: 'center', padding: 32 }}>
              <div style={{
                width: 80, height: 80, borderRadius: '50%', margin: '0 auto 16px',
                background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: '1.8rem', fontWeight: 800,
              }}>
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
              <h3 style={{ fontWeight: 700, marginBottom: 4 }}>{user?.firstName} {user?.lastName}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{user?.email}</p>
              <div style={{
                marginTop: 12, padding: '4px 12px', borderRadius: 'var(--radius-full)',
                background: 'rgba(34,197,94,0.1)', color: '#22c55e',
                fontSize: '0.75rem', fontWeight: 600, display: 'inline-block',
              }}>
                {user?.role === 'admin' ? '👑 Admin' : '✨ Member'}
              </div>
            </div>

            {/* Tabs */}
            <div className="profile-tabs-sidebar" style={{ display: 'flex', gap: 4, marginTop: 16 }}>
              {tabs.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '12px 16px', borderRadius: 'var(--radius-md)',
                    background: activeTab === tab.id ? 'var(--surface)' : 'transparent',
                    color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-secondary)',
                    fontWeight: activeTab === tab.id ? 600 : 400,
                    fontSize: '0.9rem', textAlign: 'left', border: 'none',
                    boxShadow: activeTab === tab.id ? 'var(--shadow-sm)' : 'none',
                    transition: 'all 0.2s',
                  }}>
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="card-flat profile-content-card" style={{ padding: 32 }}>
            {activeTab === 'profile' && (
              <form onSubmit={handleProfileUpdate}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 24 }}>
                  <FiUser style={{ marginRight: 8, color: 'var(--primary)' }} /> Profile Information
                </h2>

                <div className="grid-2" style={{ gap: 16, marginBottom: 20 }}>
                  <div>
                    <label className="label">First Name</label>
                    <input className="input" value={form.firstName}
                      onChange={e => setForm({ ...form, firstName: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Last Name</label>
                    <input className="input" value={form.lastName}
                      onChange={e => setForm({ ...form, lastName: e.target.value })} />
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label className="label">Email Address</label>
                  <div style={{ position: 'relative' }}>
                    <FiMail style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input className="input" style={{ paddingLeft: 40, opacity: 0.7 }}
                      value={user?.email || ''} disabled />
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Email cannot be changed.</p>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label className="label">Account Info</label>
                  <div className="grid-2" style={{ gap: 12 }}>
                    <div style={{
                      padding: '12px 16px', borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                      <FiClock style={{ color: 'var(--text-muted)' }} />
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Joined</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                          {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                        </div>
                      </div>
                    </div>
                    <div style={{
                      padding: '12px 16px', borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                      <FiGrid style={{ color: 'var(--text-muted)' }} />
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Provider</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'capitalize' }}>
                          {user?.provider || 'local'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : <><FiSave /> Save Changes</>}
                </button>
              </form>
            )}

            {activeTab === 'security' && (
              <form onSubmit={handlePasswordChange}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 24 }}>
                  <FiLock style={{ marginRight: 8, color: 'var(--primary)' }} /> Change Password
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label className="label">Current Password</label>
                    <input type="password" className="input" placeholder="Enter current password"
                      value={pwForm.current} onChange={e => setPwForm({ ...pwForm, current: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">New Password</label>
                    <input type="password" className="input" placeholder="Enter new password (min 6 chars)"
                      value={pwForm.newPw} onChange={e => setPwForm({ ...pwForm, newPw: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Confirm New Password</label>
                    <input type="password" className="input" placeholder="Confirm new password"
                      value={pwForm.confirm} onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })} />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" style={{ marginTop: 24 }} disabled={saving}>
                  {saving ? <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : <><FiShield /> Update Password</>}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .profile-tabs-sidebar {
          flex-direction: column;
        }
        @media (max-width: 992px) {
          .profile-grid { grid-template-columns: 1fr !important; }
          .profile-tabs-sidebar {
            flex-direction: row !important;
            margin-bottom: 16px;
          }
          .profile-tabs-sidebar button {
            flex: 1;
            justify-content: center;
          }
        }
        @media (max-width: 768px) {
          .profile-content-card {
            padding: 20px !important;
          }
        }
      `}</style>
    </div>
  );
}
