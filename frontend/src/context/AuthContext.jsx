import React, { createContext, useContext, useState } from 'react';
import { useToast } from './ToastContext';

const defaultUser = {
  id: 'usr_reachinbox_default',
  name: 'Niketan Sharma',
  email: 'niketan@reachinbox.ai',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=faces',
  role: 'Growth Engineer',
};

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(defaultUser);
  const [isLoading] = useState(false);
  const { info } = useToast();

  const updateUser = (updates) => {
    setUser((prev) => ({ ...prev, ...updates }));
    info('User profile updated');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: true,
        isLoading,
        updateUser,
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
