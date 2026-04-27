import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ChatbotPage from './pages/ChatbotPage';
import TemplatesPage from './pages/TemplatesPage';
import FeaturesPage from './pages/FeaturesPage';
import HowItWorksPage from './pages/HowItWorksPage';
import ContactPage from './pages/ContactPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import PresentationEditorPage from './pages/PresentationEditorPage';
import NotFoundPage from './pages/NotFoundPage';

function AppContent() {
  const location = useLocation();
  const noFooterPages = ['/chatbot', '/dashboard', '/profile', '/editor'];
  const showFooter = !noFooterPages.some(p => location.pathname.startsWith(p));

  return (
    <>
      <Navbar />
      <main style={{ minHeight: '100vh' }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/chatbot" element={<ChatbotPage />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="/how-it-works" element={<HowItWorksPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/dashboard" element={
            <ProtectedRoute><DashboardPage /></ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute><ProfilePage /></ProtectedRoute>
          } />
          <Route path="/editor/:id" element={
            <ProtectedRoute><PresentationEditorPage /></ProtectedRoute>
          } />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      {showFooter && <Footer />}
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Toaster position="top-right" toastOptions={{
            style: { borderRadius: '12px', padding: '14px 20px', fontFamily: 'Inter, sans-serif' },
            success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }} />
          <AppContent />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}
