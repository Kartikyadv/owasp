import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Shield, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const AuthRedirect: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setToken } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying authentication...');

  useEffect(() => {
    const accessToken = searchParams.get('accesstoken');
    const idToken = searchParams.get('idtoken');
    
    if (!accessToken) {
      setStatus('error');
      setMessage('No access token provided');
      return;
    }

    // Store the tokens and redirect to dashboard
    try {
      // Verify access token format (basic check)
      const accessTokenParts = accessToken.split('.');
      if (accessTokenParts.length !== 3) {
        throw new Error('Invalid access token format');
      }
      
      // Verify ID token format if provided (basic check)
      if (idToken) {
        const idTokenParts = idToken.split('.');
        if (idTokenParts.length !== 3) {
          throw new Error('Invalid ID token format');
        }
      }
      
      // Use the setToken method from AuthContext with both tokens
      setToken(accessToken, idToken || undefined);
      
      setStatus('success');
      setMessage('Authentication successful! Redirecting...');
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        navigate('/');
      }, 1500);
      
    } catch (error) {
      console.error('Token validation error:', error);
      setStatus('error');
      setMessage('Invalid authentication tokens');
      
      // Redirect to login after error
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    }
  }, [searchParams, navigate, setToken]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="mx-auto mb-4 p-3 bg-primary rounded-full w-fit"
            >
              {status === 'loading' && (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-foreground"></div>
              )}
              {status === 'success' && (
                <CheckCircle className="h-8 w-8 text-green-500" />
              )}
              {status === 'error' && (
                <XCircle className="h-8 w-8 text-red-500" />
              )}
            </motion.div>
            <CardTitle className="text-2xl font-bold">
              {status === 'loading' && 'Authenticating...'}
              {status === 'success' && 'Authentication Successful'}
              {status === 'error' && 'Authentication Failed'}
            </CardTitle>
            <CardDescription>
              {message}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {status === 'loading' && (
              <div className="text-center">
                <div className="animate-pulse text-sm text-muted-foreground">
                  Please wait while we verify your credentials...
                </div>
              </div>
            )}
            {status === 'success' && (
              <div className="text-center">
                <div className="text-sm text-green-600">
                  You will be redirected to the dashboard shortly.
                </div>
              </div>
            )}
            {status === 'error' && (
              <div className="text-center">
                <div className="text-sm text-red-600">
                  Please try logging in again through the main application.
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default AuthRedirect;
