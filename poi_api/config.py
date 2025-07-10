import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'your-very-secret-key-please-change'
    # PostgreSQL 数据库连接 URI
    # 格式: postgresql://username:password@host:port/database_name
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        'postgresql://postgres:1@localhost:5432/poi_db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'your-jwt-secret-key-please-change'
    JWT_ACCESS_TOKEN_EXPIRES_DAYS = 1 # JWT 有效期
    
    # API 限流配置 (示例: 每分钟5次针对特定接口)
    RATELIMIT_STORAGE_URI = "memory://" # 或者使用 redis: "redis://localhost:6379/0"
    
    # 业务错误代码前缀
    SERVICE_ERROR_CODE_PREFIX = "POI_API_"

class DevelopmentConfig(Config):
    DEBUG = True

class ProductionConfig(Config):
    DEBUG = False
    # 生产环境可以覆盖一些配置，例如从环境变量读取更安全的密钥
    SECRET_KEY = os.environ.get('SECRET_KEY')
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY')

# 根据环境变量选择配置
config_by_name = dict(
    dev=DevelopmentConfig,
    prod=ProductionConfig
)

key = Config.SECRET_KEY
jwt_key = Config.JWT_SECRET_KEY
