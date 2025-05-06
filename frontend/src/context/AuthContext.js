import React, { createContext, useState, useContext, useEffect } from 'react';
import jwtDecode from 'jwt-decode';
import * as api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [apiKey, setApiKey] = useState(localStorage.getItem('apiKey'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (token) {
      try {
        const decodedUser = jwtDecode(token);
        // Optionally: check token expiration
        if (decodedUser.exp * 1000 > Date.now()) {
             setUser({ 
                 username: decodedUser.sub, 
                 roles: decodedUser.roles || [] // Ensure roles are parsed
             });
        } else {
          logout(); // Token expired
        }
      } catch (e) {
        console.error("Invalid token:", e);
        logout(); // Clear invalid token
      }
    } else {
         setUser(null);
    }
    
    // Sync apiKey from localStorage on initial load
    const storedApiKey = localStorage.getItem('apiKey');
    if (storedApiKey) {
      setApiKey(storedApiKey);
    }
    
  }, [token]);

  const login = async (username, password) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.loginUser({ username, password });
      const newToken = response.data.token;
      setToken(newToken);
      localStorage.setItem('token', newToken);
      // Fetch or generate API key after login
      await fetchOrGenerateApiKey(newToken);
      return true;
    } catch (err) { 
      setError(err.response?.data?.message || 'Login failed');
      console.error('Login error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const register = async (username, password, email) => {
    setLoading(true);
    setError(null);
    try {
      await api.registerUser({ username, password, email });
      return true;
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
      console.error('Register error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setApiKey(null);
    localStorage.removeItem('token');
    localStorage.removeItem('apiKey');
  };

  const fetchOrGenerateApiKey = async (currentToken) => {
    setError(null);
    // Attempt to get existing key or generate a new one
    // You might need a backend endpoint to just GET the current user's API key
    // For now, let's assume we always try to generate/regenerate it
    if (!currentToken) return;
    
    try {
      const response = await api.generateApiKey(currentToken);
      const newApiKey = response.data.apiKey;
      setApiKey(newApiKey);
      localStorage.setItem('apiKey', newApiKey);
    } catch (err) {
       setError('Failed to fetch or generate API key');
       console.error('API Key error:', err);
    }
  };

  const value = {
    user,
    token,
    apiKey,
    isAuthenticated: !!token,
    isAdmin: user?.roles?.includes('ROLE_ADMIN'),
    isInternal: user?.roles?.includes('ROLE_INTERNAL'),
    loading,
    error,
    login,
    register,
    logout,
    fetchOrGenerateApiKey
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
}; 