import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  user: any;
  logout: () => void;
  loading: boolean;
  setToken: (token: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing token in localStorage
    const existingToken = localStorage.getItem('cognito_token');
    console.log('Checking existing token:', existingToken);
    
    if (existingToken) {
      setIsAuthenticated(true);
      try {
        const payload = JSON.parse(atob(existingToken.split('.')[1]));
        console.log('Token payload:', payload);
        setUser({
          sub: payload.sub,
          email: payload.email,
          username: payload['cognito:username']
        });
      } catch (error) {
        console.error('Error parsing stored Cognito token:', error);
        localStorage.removeItem('cognito_token');
        setIsAuthenticated(false);
      }
    }
    
    setLoading(false);
  }, []);

  const setToken = (token: string) => {
    localStorage.setItem('cognito_token', token);
    setIsAuthenticated(true);
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUser({
        sub: payload.sub,
        email: payload.email,
        username: payload['cognito:username']
      });
    } catch (error) {
      console.error('Error parsing Cognito token:', error);
    }
  };

  const logout = () => {
    localStorage.removeItem('cognito_token');
    setIsAuthenticated(false);
    setUser(null);
    // Redirect back to parent codelens project
    window.location.href = process.env.REACT_APP_CODELENS_URL || 'https://codelens.cloudsanalytics.ai/';
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, logout, loading, setToken }}>
      {children}
    </AuthContext.Provider>
  );
};
