from .extensions import db, bcrypt 
import datetime
import uuid

# 角色模型
class Role(db.Model):
    __tablename__ = "roles"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False) # e.g., 'admin', 'public_user'
    users = db.relationship('User', backref='role', lazy=True)

    def __repr__(self):
        return f"<Role {self.name}>"

# 用户模型
class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    registered_on = db.Column(db.DateTime, nullable=False, default=datetime.datetime.utcnow)
    role_id = db.Column(db.Integer, db.ForeignKey('roles.id'), nullable=False)
    api_keys = db.relationship('APIKey', backref='user', lazy='dynamic', cascade="all, delete-orphan")

    def __init__(self, username, email, password, role_id):
        self.username = username
        self.email = email
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
        self.role_id = role_id

    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f"<User {self.username}>"

# APIKey 模型
class APIKey(db.Model):
    __tablename__ = "api_keys"
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(128), unique=True, nullable=False, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_on = db.Column(db.DateTime, nullable=False, default=datetime.datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    # 可以添加 last_used, usage_count 等字段用于统计和管理

    def __repr__(self):
        return f"<APIKey for User {self.user_id}>"

# POI (Point of Interest) 模型
class POI(db.Model):
    __tablename__ = "pois"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(255), nullable=False, index=True)
    latitude = db.Column(db.Float, nullable=False) # 纬度
    longitude = db.Column(db.Float, nullable=False) # 经度
    address = db.Column(db.String(500))
    province = db.Column(db.String(100), index=True)
    city = db.Column(db.String(100))
    category = db.Column(db.String(100), index=True) # POI 类别
    description = db.Column(db.Text)
    # 扩展信息
    has_image = db.Column(db.Boolean, default=False, index=True)
    image_url = db.Column(db.String(500))
    has_website = db.Column(db.Boolean, default=False, index=True)
    website_url = db.Column(db.String(500))
    
    created_by = db.Column(db.Integer, db.ForeignKey('users.id')) # 记录创建者
    created_on = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    updated_on = db.Column(db.DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # 如果使用 PostGIS, 可以这样定义地理位置字段:
    # from geoalchemy2 import Geometry
    # location = db.Column(Geometry(geometry_type='POINT', srid=4326)) # SRID 4326 for WGS84

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'address': self.address,
            'province': self.province,
            'city': self.city,
            'category': self.category,
            'description': self.description,
            'has_image': self.has_image,
            'image_url': self.image_url,
            'has_website': self.has_website,
            'website_url': self.website_url,
            'created_on': self.created_on.isoformat() if self.created_on else None,
            'updated_on': self.updated_on.isoformat() if self.updated_on else None,
        }

    def __repr__(self):
        return f"<POI {self.name}>"