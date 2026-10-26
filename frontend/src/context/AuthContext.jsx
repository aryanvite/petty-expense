import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { getCurrentUser, setCurrentUser, getTokens, setTokens, clearTokens } from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(getCurrentUser());
  const [loading, setLoading] = useState(true);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  useEffect(() => {
    const tokens = getTokens();
    if (tokens?.access) {
      api.get('/auth/profile/')
        .then((res) => {
          setUser(res.data);
          setCurrentUser(res.data);
          if (res.data.must_change_password) {
            setIsPasswordModalOpen(true);
          }
        })
        .catch(() => {
          clearTokens();
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password, rememberMe = false) => {
    const res = await api.post('/auth/login/', {
      email,
      password,
      remember_me: Boolean(rememberMe)
    });
    const { tokens, user: userData } = res.data;
    setTokens(tokens, rememberMe);
    setCurrentUser(userData);
    setUser(userData);

    if (userData.must_change_password) {
      setIsPasswordModalOpen(true);
    }

    return userData;
  };

  const logout = () => {
    clearTokens();
    setUser(null);
    window.location.href = '/login';
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    setCurrentUser(updatedUser);
  };

  const openPasswordModal = () => setIsPasswordModalOpen(true);
  const closePasswordModal = () => setIsPasswordModalOpen(false);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        updateUser,
        isPasswordModalOpen,
        openPasswordModal,
        closePasswordModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

