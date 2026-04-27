import { Link } from 'react-router-dom';
import { FiHome, FiArrowLeft } from 'react-icons/fi';

export default function NotFoundPage() {
  return (
    <div style={{
      paddingTop: 80, minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg-primary)', textAlign: 'center',
    }}>
      <div style={{ maxWidth: 520, padding: 40, animation: 'fadeInUp 0.6s ease-out' }}>
        {/* Animated 404 */}
        <div style={{
          fontSize: '8rem', fontWeight: 900, lineHeight: 1,
          background: 'linear-gradient(135deg, var(--primary), var(--secondary), #a855f7)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          backgroundClip: 'text', marginBottom: 8, animation: 'float 6s ease-in-out infinite',
        }}>
          404
        </div>

        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 12 }}>
          Page Not Found
        </h1>

        <p style={{
          color: 'var(--text-secondary)', fontSize: '1.1rem',
          marginBottom: 32, lineHeight: 1.6,
        }}>
          The page you're looking for doesn't exist or has been moved.
          Let's get you back on track.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/" className="btn btn-primary btn-lg" style={{ borderRadius: 'var(--radius-full)' }}>
            <FiHome /> Go Home
          </Link>
          <button onClick={() => window.history.back()} className="btn btn-ghost btn-lg"
            style={{ border: '1px solid var(--border-light)', borderRadius: 'var(--radius-full)' }}>
            <FiArrowLeft /> Go Back
          </button>
        </div>

        {/* Decorative blobs */}
        <div style={{
          position: 'fixed', top: '10%', left: '10%', width: 200, height: 200,
          borderRadius: '50%', background: 'rgba(108,99,255,0.08)', filter: 'blur(80px)',
          animation: 'blob 7s infinite', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'fixed', bottom: '10%', right: '10%', width: 250, height: 250,
          borderRadius: '50%', background: 'rgba(255,107,107,0.08)', filter: 'blur(80px)',
          animation: 'blob 7s infinite 3s', pointerEvents: 'none',
        }} />
      </div>
    </div>
  );
}
