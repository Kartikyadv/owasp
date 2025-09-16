# Cognito Authentication Integration

This document explains how to integrate AWS Cognito authentication with the OWASP ZAP project.

## Overview

The OWASP project now uses centralized authentication through the parent CodeLens project. Users authenticate once in CodeLens and are automatically authenticated in the OWASP project.

## Setup Instructions

### 1. Environment Variables

Create a `.env` file in the `backend/` directory with the following variables:

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/owasp_zap_db

# ZAP Configuration
ZAP_API_URL=http://zap:8090

# AWS Cognito Configuration
COGNITO_REGION=us-east-1
COGNITO_USER_POOL_ID=your-user-pool-id
COGNITO_CLIENT_ID=your-client-id

# Frontend Configuration
FRONTEND_URL=http://localhost:3001

# Codelens Configuration
CODELENS_URL=https://wfsdcxtics.ai
```

### 2. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 3. Update CodeLens Redirect Logic

In your CodeLens project, update the redirect buttons to pass the Cognito token:

```javascript
// In your CodeLens sidebar component
const handleRedirectToOWASP = () => {
  const cognitoToken = localStorage.getItem('cognito_token'); // or however you store the token
  const owaspUrl = process.env.REACT_APP_API_OWASP_REDIRECT;
  window.open(`${owaspUrl}?token=${cognitoToken}`, "_blank");
};

<Button
  variant="text"
  onClick={handleRedirectToOWASP}
  fullWidth
  className="sidebar-btn neutral-link"
  startIcon={<SecurityIcon />}
>
  OWASP
</Button>
```

### 4. Update CodeLens Backend Redirect

Update your CodeLens backend redirect endpoint:

```javascript
// In your CodeLens backend
async function redirectToOwasp(req, res, next) {
  try {
    const cognitoToken = req.headers.authorization?.replace('Bearer ', '');
    if (!cognitoToken) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const owaspUrl = `https://ca-urlscan.cloudsanalytics.ai/auth/redirect?token=${cognitoToken}`;
    res.redirect(owaspUrl);
  } catch (error) {
    next(error);
  }
}
```

## How It Works

1. **User Authentication**: User logs in through CodeLens using Cognito
2. **Token Storage**: Cognito token is stored in CodeLens
3. **Redirect with Token**: When user clicks OWASP button, token is passed as URL parameter
4. **Token Verification**: OWASP backend verifies the Cognito token
5. **Frontend Authentication**: OWASP frontend receives token and stores it
6. **API Requests**: All API requests include the Cognito token in Authorization header

## Security Considerations

- Tokens are passed via URL parameters (consider using POST for production)
- Tokens are verified using AWS Cognito public keys
- Tokens are stored in localStorage (consider using httpOnly cookies for production)
- All API endpoints require valid Cognito tokens

## Testing

1. Start the OWASP backend: `cd backend && python main.py`
2. Start the OWASP frontend: `cd frontend && npm start`
3. Test the redirect flow from CodeLens
4. Verify authentication works in OWASP

## Troubleshooting

- Check that all environment variables are set correctly
- Verify Cognito User Pool ID and Client ID are correct
- Ensure the redirect URL includes the token parameter
- Check browser console for any authentication errors
