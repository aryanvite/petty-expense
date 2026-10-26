import jwt
from datetime import datetime, timedelta, timezone
from django.conf import settings
from rest_framework.authentication import BaseAuthentication, get_authorization_header
from rest_framework import exceptions
from django.contrib.auth import get_user_model

User = get_user_model()

def generate_tokens_for_user(user, remember_me=False):
    now = datetime.now(timezone.utc)
    
    # Session duration: 7 days if remember_me is True, 1 day (24 hours) if False
    session_days = 7 if remember_me else 1
    expires_at = now + timedelta(days=session_days)
    
    access_payload = {
        'user_id': user.id,
        'email': user.email,
        'role': user.role,
        'token_version': user.token_version,
        'token_type': 'access',
        'remember_me': bool(remember_me),
        'iat': now,
        'exp': expires_at
    }
    
    refresh_payload = {
        'user_id': user.id,
        'email': user.email,
        'role': user.role,
        'token_version': user.token_version,
        'token_type': 'refresh',
        'remember_me': bool(remember_me),
        'iat': now,
        'exp': expires_at
    }
    
    access_token = jwt.encode(access_payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    refresh_token = jwt.encode(refresh_payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    
    return {
        'access': access_token,
        'refresh': refresh_token,
        'remember_me': bool(remember_me),
        'expires_in_days': session_days,
        'expires_at': expires_at.isoformat()
    }

def decode_token(token):
    try:
        return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise exceptions.AuthenticationFailed('Token has expired.')
    except jwt.InvalidTokenError:
        raise exceptions.AuthenticationFailed('Invalid token.')

class JWTAuthentication(BaseAuthentication):
    def authenticate_header(self, request):
        return 'Bearer'

    def authenticate(self, request):
        auth_header = get_authorization_header(request).split()
        if not auth_header or auth_header[0].lower() != b'bearer':
            return None

        if len(auth_header) == 1:
            raise exceptions.AuthenticationFailed('Invalid token header. No credentials provided.')
        elif len(auth_header) > 2:
            raise exceptions.AuthenticationFailed('Invalid token header. Token string should not contain spaces.')

        token = auth_header[1].decode('utf-8')
        payload = decode_token(token)

        if payload.get('token_type') != 'access':
            raise exceptions.AuthenticationFailed('Invalid token type. Access token required.')

        user_id = payload.get('user_id')
        token_version = payload.get('token_version', 0)

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            raise exceptions.AuthenticationFailed('User not found.')

        if not user.is_active:
            raise exceptions.AuthenticationFailed('User account is disabled.')

        if user.token_version != token_version:
            raise exceptions.AuthenticationFailed('Token has been revoked. Please sign in again.')

        return (user, token)

