import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { presentationService } from '../services/presentationService';
import toast from 'react-hot-toast';
import { FiPlus, FiTrash2, FiDownload, FiEdit3, FiFileText, FiClock, FiGrid, FiSearch, FiFile } from 'react-icons/fi';

export default function DashboardPage() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [presentations, setPresentations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    loadPresentations();
  }, [isAuthenticated]);

  const loadPresentations = async () => {
    try {
      const data = await presentationService.getMyPresentations();
      setPresentations(data.presentations || []);
    } catch {
      // May fail if no DB connection
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this presentation?')) return;
    try {
      await presentationService.deletePresentation(id);
      setPresentations(prev => prev.filter(p => p._id !== id));
      toast.success('Presentation deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleExportPPTX = (id) => {
    window.open(presentationService.getExportPPTXUrl(id), '_blank');
  };

  const handleExportPDF = (id) => {
    window.open(presentationService.getExportPDFUrl(id), '_blank');
  };

  const templateColors = {
    'modern-gradient': ['#6C63FF', '#FF6B6B'],
    'dark-professional': ['#1a1a2e', '#e94560'],
    'ocean-breeze': ['#0077b6', '#00b4d8'],
    'sunset-warm': ['#ff6b35', '#ff9f1c'],
    'emerald-nature': ['#2d6a4f', '#52b788'],
    'minimal-clean': ['#e2e8f0', '#0d6efd'],
  };

  const filtered = presentations.filter(p => {
    const matchesSearch = !search || p.title.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || p.language === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div style={{ paddingTop: 100, paddingBottom: 80, minHeight: '100vh', background: 'var(--bg-secondary)' }}>
      <div className="container">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: 4 }}>
              Welcome back, <span className="gradient-text">{user?.firstName}</span>
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>Manage your presentations and create new ones.</p>
          </div>
          <Link to="/chatbot" className="btn btn-gradient">
            <FiPlus /> New Presentation
          </Link>
        </div>

        {/* Stats */}
        <div className="grid-4" style={{ gap: 16, marginBottom: 40 }}>
          {[
            { icon: <FiGrid />, label: 'Total Presentations', value: presentations.length, color: 'var(--primary)' },
            { icon: <FiFileText />, label: 'Total Slides', value: presentations.reduce((acc, p) => acc + (p.slides?.length || 0), 0), color: 'var(--secondary)' },
            { icon: <FiClock />, label: 'Last Created', value: presentations[0] ? new Date(presentations[0].createdAt).toLocaleDateString() : 'N/A', color: '#22c55e' },
            { icon: <FiDownload />, label: 'Languages', value: `${presentations.filter(p => p.language === 'en').length} EN / ${presentations.filter(p => p.language === 'ur').length} UR`, color: '#f97316' },
          ].map((stat, i) => (
            <div key={i} className="card-flat" style={{ textAlign: 'center', padding: 24 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 'var(--radius-md)',
                background: `${stat.color}15`, color: stat.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 12px', fontSize: '1.2rem',
              }}>{stat.icon}</div>
              <h4 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stat.value}</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Search & Filter */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <FiSearch style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="input" placeholder="Search presentations..." style={{ paddingLeft: 40 }}
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {['all', 'en', 'ur'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`btn ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
                style={{
                  padding: '8px 16px', borderRadius: 'var(--radius-full)',
                  border: filter !== f ? '1px solid var(--border-light)' : 'none',
                  fontSize: '0.85rem',
                }}>
                {f === 'all' ? 'All' : f === 'en' ? 'English' : 'اردو'}
              </button>
            ))}
          </div>
        </div>

        {/* Presentations List */}
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 16 }}>
          My Presentations {filtered.length !== presentations.length && `(${filtered.length} of ${presentations.length})`}
        </h2>

        {loading ? (
          <div className="grid-3" style={{ gap: 20 }}>
            {[1, 2, 3].map(i => (
              <div key={i} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="skeleton" style={{ height: 120 }} />
                <div style={{ padding: 16 }}>
                  <div className="skeleton" style={{ height: 16, width: '70%', marginBottom: 8 }} />
                  <div className="skeleton" style={{ height: 12, width: '50%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card-flat" style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: '3rem', marginBottom: 16, opacity: 0.3 }}>📄</div>
            <h3 style={{ fontWeight: 700, marginBottom: 8 }}>
              {search ? 'No matching presentations' : 'No presentations yet'}
            </h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
              {search ? 'Try a different search term.' : 'Create your first AI-powered presentation now!'}
            </p>
            {!search && (
              <Link to="/chatbot" className="btn btn-primary">
                <FiPlus /> Create Presentation
              </Link>
            )}
          </div>
        ) : (
          <div className="grid-3" style={{ gap: 20 }}>
            {filtered.map((pres, i) => {
              const colors = templateColors[pres.template] || ['#6C63FF', '#FF6B6B'];
              return (
                <div key={pres._id} className="card" style={{ padding: 0, overflow: 'hidden', animation: `fadeInUp 0.4s ease-out ${i * 0.1}s backwards` }}>
                  <div onClick={() => navigate(`/editor/${pres._id}`)} style={{
                    height: 120,
                    background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`,
                    padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
                    color: 'white', cursor: 'pointer', transition: 'opacity 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                    <h4 style={{ fontWeight: 700, fontSize: '1.05rem', color: 'white' }}>{pres.title}</h4>
                    <p style={{ fontSize: '0.75rem', opacity: 0.8 }}>{pres.slides?.length || 0} slides • {pres.language === 'ur' ? 'اردو' : 'English'}</p>
                  </div>
                  <div style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {new Date(pres.createdAt).toLocaleDateString()}
                    </span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => navigate(`/editor/${pres._id}`)} className="btn-icon btn-ghost" title="Edit"
                        style={{ width: 32, height: 32, fontSize: '0.85rem', color: 'var(--primary)' }}><FiEdit3 /></button>
                      <button onClick={() => handleExportPPTX(pres._id)} className="btn-icon btn-ghost" title="Download PPTX"
                        style={{ width: 32, height: 32, fontSize: '0.85rem', color: '#f97316' }}><FiDownload /></button>
                      <button onClick={() => handleExportPDF(pres._id)} className="btn-icon btn-ghost" title="Download PDF"
                        style={{ width: 32, height: 32, fontSize: '0.85rem', color: '#3b82f6' }}><FiFile /></button>
                      <button onClick={() => handleDelete(pres._id)} className="btn-icon btn-ghost" title="Delete"
                        style={{ width: 32, height: 32, fontSize: '0.85rem', color: 'var(--secondary)' }}><FiTrash2 /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
