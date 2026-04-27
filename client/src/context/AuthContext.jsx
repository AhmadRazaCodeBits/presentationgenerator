import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(authService.getUser());
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Verify token on app startup
  useEffect(() => {
    const verifyAuth = async () => {
      const token = authService.getToken();
      if (token) {
        try {
          const data = await authService.getProfile();
          setUser(data.user);
          localStorage.setItem('slideedge_user', JSON.stringify(data.user));
        } catch (error) {
          // Token invalid or expired
          authService.logout();
          setUser(null);
        }
      }
      setInitialLoading(false);
    };
    verifyAuth();
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const data = await authService.login({ email, password });
      setUser(data.user);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Login failed' };
    } finally {
      setLoading(false);
    }
  };

  const register = async (firstName, lastName, email, password) => {
    setLoading(true);
    try {
      const data = await authService.register({ firstName, lastName, email, password });
      setUser(data.user);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Registration failed' };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('slideedge_user', JSON.stringify(updatedUser));
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, loading, initialLoading, login, register, logout, updateUser, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
