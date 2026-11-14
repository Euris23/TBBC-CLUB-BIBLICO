import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('tbbc_token') || null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  // Verify stored token on initial load
  useEffect(() => {
    async function verifyStoredSession() {
      const storedToken = localStorage.getItem('tbbc_token');
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/verify', {
          headers: { 'x-session-token': storedToken }
        });
        const data = await res.json();
        if (data.valid) {
          setToken(storedToken);
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem('tbbc_token');
          setToken(null);
          setIsAuthenticated(false);
        }
      } catch (err) {
        console.error('Error al verificar sesión:', err);
        // Fallback: keep offline session if token exists
        setIsAuthenticated(true);
      } finally {
        setLoading(false);
      }
    }

    verifyStoredSession();
  }, []);

  // Login with PIN
  const login = async (pin) => {
    setAuthError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem('tbbc_token', data.token);
        setToken(data.token);
        setIsAuthenticated(true);
        return { success: true, message: data.message };
      } else {
        setAuthError(data.message || 'PIN incorrecto.');
        return { success: false, message: data.message || 'PIN incorrecto.' };
      }
    } catch (err) {
      const errorMsg = 'Error al comunicarse con el servidor. Verifica tu conexión.';
      setAuthError(errorMsg);
      return { success: false, message: errorMsg };
    }
  };

  // Logout / Lock application
  const logout = async () => {
    try {
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'x-session-token': token }
        });
      }
    } catch (err) {
      console.warn('Error al cerrar sesión:', err);
    } finally {
      localStorage.removeItem('tbbc_token');
      setToken(null);
      setIsAuthenticated(false);
    }
  };

  // Change general PIN
  const changeGeneralPin = async (currentPin, newPin) => {
    try {
      const res = await fetch('/api/auth/change-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': token || ''
        },
        body: JSON.stringify({ currentPin, newPin })
      });

      const data = await res.json();
      return data;
    } catch (err) {
      return { success: false, message: 'Error al cambiar PIN. Intenta nuevamente.' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        isAuthenticated,
        loading,
        authError,
        setAuthError,
        login,
        logout,
        changeGeneralPin
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
}

