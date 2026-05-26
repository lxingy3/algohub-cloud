import React, { createContext, useState, useContext } from 'react';

/**
 * Simplified AuthContext for AlgoHub (no Base44)
 * No authentication required - app is always accessible.
 */
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user] = useState(null);
  const isAuthenticated = true;
  const isLoadingAuth = false;
  const isLoadingPublicSettings = false;
  const authError = null;
  const appPublicSettings = null;

  const logout = () => {
    // No-op: no auth in this version
  };

  const navigateToLogin = () => {
    // No-op: no auth in this version
  };

  const checkAppState = () => {
    // No-op: no backend to check
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings,
        authError,
        appPublicSettings,
        logout,
        navigateToLogin,
        checkAppState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
