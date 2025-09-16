import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  user: any;
  logout: () => void;
  loading: boolean;
  setToken: (accessToken: string, idToken?: string) => void;
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
    const storedUserInfo = localStorage.getItem('user_info');
    console.log('Checking existing token:', existingToken);
    console.log('Checking stored user info:', storedUserInfo);
    
    if (existingToken) {
      setIsAuthenticated(true);
      
      // If we have stored user info, use it
      if (storedUserInfo) {
        try {
          const userInfo = JSON.parse(storedUserInfo);
          setUser(userInfo);
        } catch (error) {
          console.error('Error parsing stored user info:', error);
        }
      } else {
        // Fall back to parsing the token
        try {
          const payload = JSON.parse(atob(existingToken.split('.')[1]));
          console.log('Token payload:', payload);
          setUser({
            sub: payload.sub,
            email: payload.email,
            username: payload['cognito:username'] || payload.username
          });
        } catch (error) {
          console.error('Error parsing stored Cognito token:', error);
          localStorage.removeItem('cognito_token');
          setIsAuthenticated(false);
        }
      }
    }
    
    setLoading(false);
  }, []);

  const setToken = (accessToken: string, idToken?: string) => {
    // Store access token as cognito_token for API authentication
    localStorage.setItem('cognito_token', accessToken);
    setIsAuthenticated(true);
    
    try {
      // Use ID token for user info if provided, otherwise fall back to access token
      const tokenToParse = idToken || accessToken;
      const payload = JSON.parse(atob(tokenToParse.split('.')[1]));
      
      setUser({
        sub: payload.sub,
        email: payload.email,
        username: payload['cognito:username'] || payload.username,
        email_verified: payload.email_verified,
        token_use: payload.token_use
      });
      
      // Store user info separately if needed
      if (idToken) {
        localStorage.setItem('user_info', JSON.stringify({
          sub: payload.sub,
          email: payload.email,
          username: payload['cognito:username'] || payload.username,
          email_verified: payload.email_verified
        }));
      }
    } catch (error) {
      console.error('Error parsing Cognito token:', error);
    }
  };

  const logout = () => {
    localStorage.removeItem('cognito_token');
    localStorage.removeItem('user_info');
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
