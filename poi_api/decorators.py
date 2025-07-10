from functools import wraps
from flask import request, current_app, g
from .utils import decode_token, get_user_from_payload, get_user_by_apikey
from .errors import BusinessException
from .extensions import limiter

# 装饰器：验证 JWT Token
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1] # Bearer <token>
            except IndexError:
                raise BusinessException("Bearer token malformed.", status_code=401, error_code="AUTH_INVALID_HEADER")

        if not token:
            raise BusinessException("Token is missing.", status_code=401, error_code="AUTH_TOKEN_MISSING")

        payload = decode_token(token)
        if isinstance(payload, str): # 解码失败，payload是错误信息
            raise BusinessException(payload, status_code=401, error_code="AUTH_TOKEN_INVALID")
        
        current_user = get_user_from_payload(payload)
        if not current_user:
            raise BusinessException("User not found or token invalid.", status_code=401, error_code="AUTH_USER_NOT_FOUND")
        
        g.current_user = current_user # 将当前用户存储在g对象中，方便后续使用
        return f(*args, **kwargs)
    return decorated

# 装饰器：验证用户角色
def role_required(role_name):
    def decorator(f):
        @wraps(f)
        @token_required # 角色验证前必须先验证token
        def decorated_function(*args, **kwargs):
            if not g.current_user or g.current_user.role.name != role_name:
                raise BusinessException(f"Access denied. '{role_name}' role required.", status_code=403, error_code="AUTH_INSUFFICIENT_ROLE")
            return f(*args, **kwargs)
        return decorated_function
    return decorator

# 装饰器：验证 API Key
def apikey_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        api_key_value = request.headers.get('X-API-KEY')
        if not api_key_value:
            raise BusinessException("API Key is missing in X-API-KEY header.", status_code=401, error_code="AUTH_APIKEY_MISSING")

        user = get_user_by_apikey(api_key_value)
        if not user:
            raise BusinessException("Invalid or inactive API Key.", status_code=401, error_code="AUTH_APIKEY_INVALID")
        
        g.current_user_from_apikey = user # 可以通过g对象获取通过apikey认证的用户
        g.current_apikey = api_key_value # 存储当前apikey，用于限流
        return f(*args, **kwargs)
    return decorated

# 装饰器：API 限流 (可以根据 API Key 或 IP)
# rate_limit_string: e.g., "5/minute", "100/hour"
# key_func: a callable that returns the identifier for the rate limit (e.g., lambda: g.current_apikey)
def rate_limit_decorator(rate_limit_string, key_prefix="rl_"):
    def decorator(f):
        # 将限流应用到函数上
        # 注意：limiter.limit 返回的是一个装饰器工厂
        # 我们需要直接调用它来获取实际的装饰器，然后应用到函数 f
        # key_func 必须在请求上下文中才能正确获取 g.current_apikey
        
        @wraps(f)
        @limiter.limit(rate_limit_string, key_func=lambda: g.get('current_apikey', get_remote_address()),
                       error_message="Rate limit exceeded. Please try again later.")
        def rate_limited_function(*args, **kwargs):
            # 如果限流检查通过，limiter 会自动调用被装饰的函数 f
            # 如果超限，limiter 会抛出 RateLimitExceeded 异常，会被全局错误处理器捕获或显示默认信息
            # 这里我们确保 g.current_apikey 存在，如果不存在则回退到 IP 地址
            # 实际的限流逻辑由 Flask-Limiter 处理
            return f(*args, **kwargs)
        return rate_limited_function
    return decorator

# 示例：管理员角色
admin_required = role_required('admin')
# 示例：公众用户角色 (如果需要区分已登录的公众用户和纯APIKey用户)
# public_user_required = role_required('public_user')