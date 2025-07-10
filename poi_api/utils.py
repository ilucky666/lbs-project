import jwt
import datetime
from flask import current_app
from .models import User, APIKey as APIKeyModel

def generate_token(user_id, username, role_name):
    """生成JWT Token"""
    try:
        payload = {
            'exp': datetime.datetime.utcnow() + datetime.timedelta(days=current_app.config.get('JWT_ACCESS_TOKEN_EXPIRES_DAYS', 1)),
            'iat': datetime.datetime.utcnow(),
            'sub': user_id,
            'username': username,
            'role': role_name
        }
        return jwt.encode(
            payload,
            current_app.config.get('JWT_SECRET_KEY'),
            algorithm='HS256'
        )
    except Exception as e:
        current_app.logger.error(f"Error generating token: {e}")
        return None

def decode_token(token):
    """解码JWT Token"""
    try:
        payload = jwt.decode(token, current_app.config.get('JWT_SECRET_KEY'), algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        current_app.logger.warning("Token expired.")
        return 'Token expired. Please log in again.'
    except jwt.InvalidTokenError:
        current_app.logger.warning("Invalid token.")
        return 'Invalid token. Please log in again.'
    except Exception as e:
        current_app.logger.error(f"Error decoding token: {e}")
        return 'Token decoding error.'

def get_user_from_payload(payload):
    if isinstance(payload, str): # Error message from decode_token
        return None
    user_id = payload.get('sub')
    return User.query.filter_by(id=user_id).first()

def get_user_by_apikey(api_key_value):
    """通过API Key获取用户"""
    api_key_obj = APIKeyModel.query.filter_by(key=api_key_value, is_active=True).first()
    if api_key_obj:
        return api_key_obj.user
    return None