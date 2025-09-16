import boto3
import json
import requests
from typing import Optional, Dict, Any
import os
from dotenv import load_dotenv

load_dotenv()

# AWS Cognito configuration
COGNITO_REGION = os.getenv("COGNITO_REGION", "us-east-1")
COGNITO_USER_POOL_ID = os.getenv("COGNITO_USER_POOL_ID")
COGNITO_CLIENT_ID = os.getenv("COGNITO_CLIENT_ID")

def get_cognito_public_keys():
    """Get Cognito public keys for token verification"""
    try:
        url = f"https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{COGNITO_USER_POOL_ID}/.well-known/jwks.json"
        response = requests.get(url)
        response.raise_for_status()
        print(response.json())
        return response.json()
    except Exception as e:
        print(f"Error fetching Cognito public keys: {e}")
        return None

def verify_cognito_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Verify a Cognito JWT token (access or id token) and return the payload if valid
    """
    try:
        # Get Cognito public keys
        jwks = get_cognito_public_keys()
        if not jwks:
            print("Failed to get Cognito public keys")
            return None

        # Split token into parts
        token_parts = token.split('.')
        if len(token_parts) != 3:
            print("Invalid token format")
            return None

        # Decode header
        import base64, json, jwt
        from cryptography.hazmat.primitives import serialization
        from cryptography.hazmat.primitives.asymmetric import rsa

        header_data = base64.urlsafe_b64decode(token_parts[0] + '==')
        header = json.loads(header_data)
        kid = header.get('kid')

        if not kid:
            print("No key ID in token header")
            return None

        # Find the matching public key
        public_key = None
        for key in jwks.get('keys', []):
            if key.get('kid') == kid:
                public_key = key
                break

        if not public_key:
            print(f"No matching public key found for kid: {kid}")
            return None

        # Convert JWK to PEM
        n = int.from_bytes(base64.urlsafe_b64decode(public_key['n'] + '=='), 'big')
        e = int.from_bytes(base64.urlsafe_b64decode(public_key['e'] + '=='), 'big')
        public_key_obj = rsa.RSAPublicNumbers(e, n).public_key()
        pem_key = public_key_obj.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        )

        # Decode WITHOUT forcing audience first
        unverified = jwt.decode(
            token,
            pem_key,
            algorithms=['RS256'],
            options={"verify_aud": False},  # don't require aud for access tokens
            issuer=f"https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{COGNITO_USER_POOL_ID}"
        )

        # If it's an ID token, validate audience
        if unverified.get("token_use") == "id":
            jwt.decode(
                token,
                pem_key,
                algorithms=['RS256'],
                audience=COGNITO_CLIENT_ID,
                issuer=f"https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{COGNITO_USER_POOL_ID}"
            )

        # If it's an access token, validate client_id instead
        elif unverified.get("token_use") == "access":
            if unverified.get("client_id") != COGNITO_CLIENT_ID:
                print("Access token client_id mismatch")
                return None

        else:
            print("Unknown token_use in token")
            return None

        return unverified

    except Exception as e:
        print(f"Error verifying Cognito token: {e}")
        return None


def get_user_info_from_cognito_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Extract user information from a valid Cognito token
    """
    payload = verify_cognito_token(token)
    if not payload:
        return None
        
    return {
        "sub": payload.get("sub"),  # User ID
        "email": payload.get("email"),
        "username": payload.get("cognito:username"),
        "email_verified": payload.get("email_verified", False),
        "token_use": payload.get("token_use"),
        "exp": payload.get("exp")
    }
