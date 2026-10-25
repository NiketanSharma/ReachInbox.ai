import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { useToast } from './ToastContext';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { success, error } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('reachinbox_token');
      if (token) {
        try {
          const currentUser = await api.getCurrentUser();
          setUser(currentUser);
        } catch (err) {
          console.warn('Session expired or invalid, logging out:', err);
          api.logout();
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const loginWithGoogleCredential = async (credential) => {
    setIsLoading(true);
    try {
      const data = await api.loginWithGoogle(credential);
      setUser(data.user);
      success(`Welcome back, ${data.user.name || 'ReachInbox Lead'}!`);
    } catch (err) {
      error(err.message || 'Failed to authenticate with Google');
    } finally {
      setIsLoading(false);
    }
  };

  const loginDemoUser = async (name = 'Niketan Sharma', email = 'niketan@reachinbox.ai') => {
    setIsLoading(true);
    try {
      const data = await api.loginWithGoogle(undefined, {
        name,
        email,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=faces',
      });
      setUser(data.user);
      success(`Logged in as demo user: ${name}`);
    } catch (err) {
      error(err.message || 'Failed to login as demo user');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    api.logout();
    setUser(null);
    success('Logged out successfully');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        loginWithGoogleCredential,
        loginDemoUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
