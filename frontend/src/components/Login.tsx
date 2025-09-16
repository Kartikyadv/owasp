import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Shield, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Login: React.FC = () => {
  const { logout } = useAuth();

  const handleRedirectToParent = () => {
    // Redirect to parent codelens project for authentication
    window.location.href = process.env.REACT_APP_CODELENS_URL || 'https://codelens.cloudsanalytics.ai/';
  };

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
              <Shield className="h-8 w-8 text-primary-foreground" />
            </motion.div>
            <CardTitle className="text-2xl font-bold">
              Authentication Required
            </CardTitle>
            <CardDescription>
              Please authenticate through the main CodeLens application to access the OWASP security dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center text-sm text-muted-foreground">
              This application uses centralized authentication. You need to be logged in through the main CodeLens platform to access this security dashboard.
            </div>

            <Button
              onClick={handleRedirectToParent}
              className="w-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go to CodeLens Authentication
            </Button>

            <div className="text-center">
              <button
                onClick={logout}
                className="text-sm text-muted-foreground hover:underline"
              >
                Clear session and try again
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Login;
