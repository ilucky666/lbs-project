from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

db = SQLAlchemy()
bcrypt = Bcrypt()
# 限流器，key_func 可以根据需求调整，例如基于 API Key 或用户 ID
limiter = Limiter(key_func=get_remote_address)