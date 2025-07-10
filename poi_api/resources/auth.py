from flask import request, current_app, g
from flask_restx import Namespace, Resource, fields
from ..models import User, Role, APIKey as APIKeyModel
from ..extensions import db, bcrypt
from ..utils import generate_token
from ..dtos import create_api_models
from ..decorators import token_required
from ..errors import BusinessException
import uuid

# 创建 Namespace
auth_ns = Namespace('auth', description='用户认证和API Key管理')
# 从 DTOs 获取模型定义
models = create_api_models(auth_ns)

@auth_ns.route('/register')
class UserRegistration(Resource):
    @auth_ns.expect(models['user_register_input'], validate=True)
    @auth_ns.marshal_with(models['auth_success_response'], code=201)
    @auth_ns.response(400, '输入无效或用户已存在', models['error_response'])
    @auth_ns.response(500, '服务器内部错误', models['error_response'])
    def post(self):
        """用户注册"""
        data = auth_ns.payload
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')

        if User.query.filter((User.username == username) | (User.email == email)).first():
            raise BusinessException("用户已存在 (用户名或邮箱已被注册)", status_code=400, error_code="AUTH_USER_EXISTS")

        # 默认分配 'public_user' 角色，需确保该角色已在数据库中创建
        public_role = Role.query.filter_by(name='public_user').first()
        if not public_role:
            # 如果角色不存在，可以创建它或返回错误
            # For setup, you should pre-populate roles. Here, we'll try to create it.
            current_app.logger.info("Role 'public_user' not found, creating it.")
            public_role = Role(name='public_user')
            db.session.add(public_role)
            # Try to add an admin role too for testing, if it doesn't exist
            admin_role_check = Role.query.filter_by(name='admin').first()
            if not admin_role_check:
                admin_role = Role(name='admin')
                db.session.add(admin_role)
            db.session.commit() # Commit roles first
            public_role = Role.query.filter_by(name='public_user').first() # Re-fetch


        if not public_role: # Still not found after trying to create
             raise BusinessException("Public user role configuration error.", status_code=500, error_code="CONFIG_ROLE_MISSING")


        new_user = User(username=username, email=email, password=password, role_id=public_role.id)
        db.session.add(new_user)
        db.session.commit()

        token = generate_token(new_user.id, new_user.username, new_user.role.name)
        if not token:
            raise BusinessException("无法生成Token", status_code=500, error_code="AUTH_TOKEN_GENERATION_FAILED")
        
        return {
            'status': 'success',
            'message': '用户注册成功',
            'token': token,
            'user': new_user
        }, 201

@auth_ns.route('/login')
class UserLogin(Resource):
    @auth_ns.expect(models['user_auth_input'], validate=True)
    @auth_ns.marshal_with(models['auth_success_response'])
    @auth_ns.response(400, '输入无效', models['error_response'])
    @auth_ns.response(401, '认证失败 (邮箱或密码错误)', models['error_response'])
    @auth_ns.response(500, '服务器内部错误', models['error_response'])
    def post(self):
        """用户登录获取JWT"""
        data = auth_ns.payload
        email = data.get('email')
        password = data.get('password')

        user = User.query.filter_by(email=email).first()
        if user and user.check_password(password):
            token = generate_token(user.id, user.username, user.role.name)
            if not token:
                raise BusinessException("无法生成Token", status_code=500, error_code="AUTH_TOKEN_GENERATION_FAILED")
            return {
                'status': 'success',
                'message': '登录成功',
                'token': token,
                'user': user
            }, 200
        else:
            raise BusinessException("邮箱或密码错误", status_code=401, error_code="AUTH_INVALID_CREDENTIALS")

@auth_ns.route('/me')
class UserProfile(Resource):
    @auth_ns.doc(security='jsonWebToken') # 指示此接口需要JWT
    @token_required
    @auth_ns.marshal_with(models['user_info_response'])
    @auth_ns.response(401, 'Token无效或缺失', models['error_response'])
    def get(self):
        """获取当前用户信息 (需要JWT)"""
        current_user = g.current_user
        return {'status': 'success', 'user': current_user}, 200
    
    # 可以在这里添加 PUT /me 用于用户更新个人信息

@auth_ns.route('/apikey')
class APIKeyResource(Resource):
    @auth_ns.doc(security='jsonWebToken')
    @token_required # 必须登录才能操作API Key
    @auth_ns.marshal_with(models['apikey_list_response'])
    @auth_ns.response(401, 'Token无效或缺失', models['error_response'])
    def get(self):
        """获取当前用户的所有API Keys (需要JWT)"""
        current_user = g.current_user
        keys = APIKeyModel.query.filter_by(user_id=current_user.id).all()
        return {'status': 'success', 'api_keys': keys}, 200

    @auth_ns.doc(security='jsonWebToken')
    @token_required
    @auth_ns.marshal_with(models['apikey_list_response'], code=201) # 返回包含新key的列表
    @auth_ns.response(401, 'Token无效或缺失', models['error_response'])
    @auth_ns.response(400, '已达到API Key数量上限', models['error_response'])
    def post(self):
        """为当前用户生成一个新的API Key (需要JWT)"""
        current_user = g.current_user
        # 可以限制每个用户的API Key数量，例如最多3个
        if APIKeyModel.query.filter_by(user_id=current_user.id).count() >= 3:
            raise BusinessException("已达到API Key数量上限 (最多3个)", status_code=400, error_code="APIKEY_LIMIT_REACHED")

        new_api_key = APIKeyModel(user_id=current_user.id) # key 会自动生成
        db.session.add(new_api_key)
        db.session.commit()
        
        keys = APIKeyModel.query.filter_by(user_id=current_user.id).all()
        return {'status': 'success', 'message': 'API Key生成成功', 'api_keys': keys}, 201

@auth_ns.route('/apikey/<string:key_value>')
class APIKeyDetailResource(Resource):
    @auth_ns.doc(security='jsonWebToken', params={'key_value': '要操作的API Key值'})
    @token_required
    @auth_ns.response(204, 'API Key删除成功')
    @auth_ns.response(401, 'Token无效或缺失', models['error_response'])
    @auth_ns.response(403, '无权操作此API Key', models['error_response'])
    @auth_ns.response(404, 'API Key未找到', models['error_response'])
    def delete(self, key_value):
        """删除指定的API Key (需要JWT，且Key属于当前用户)"""
        current_user = g.current_user
        api_key_obj = APIKeyModel.query.filter_by(key=key_value, user_id=current_user.id).first()

        if not api_key_obj:
            raise BusinessException("API Key未找到或不属于当前用户", status_code=404, error_code="APIKEY_NOT_FOUND_OR_FORBIDDEN")

        db.session.delete(api_key_obj)
        db.session.commit()
        return "", 204 # No Content