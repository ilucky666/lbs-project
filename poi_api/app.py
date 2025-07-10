# C:\Users\asus\Desktop\lbs_project\poi_api\app.py

import os # 确保 os 被导入，如果下面用到了 os.getenv
import logging # 确保 logging 被导入

from flask import Flask, Blueprint ,jsonify
from flask_cors import CORS
import logging 
# --- 修改以下所有同包导入为相对导入 ---
from .config import config_by_name
from .extensions import db, bcrypt, limiter
from .models import User, Role, POI, APIKey # 确保 models.py 中没有其他导入问题
from .resources.auth import auth_ns         # 假设 auth_ns 是在 resources/auth.py 中定义的
from .resources.poi import poi_ns           # 假设 poi_ns 是在 resources/poi.py 中定义的
from .errors import register_error_handlers, register_app_error_handlers # 确保 errors.py 内部导入也正确

def create_app(config_name='dev'):
    # ---- 在函数最开始添加打印语句 ----
    print("--- DEBUG: create_app 函数开始执行 ---")
    logging.basicConfig(level=logging.DEBUG) # 确保日志尽早配置
    # ---- 打印语句结束 ----
    app = Flask(__name__)
    # 从 .config 模块加载配置
    app.config.from_object(config_by_name[config_name])

    app.logger.info(f"--- DEBUG: 应用配置已加载，模式: {config_name} ---")
    app.logger.debug(f"--- DEBUG: 应用配置详情: {app.config}")

    # ---- 临时的、最宽松的 CORS 配置用于调试 ----
    CORS(app, origins="*", methods="*", allow_headers="*") 
    app.logger.info("--- DEBUG: 全局宽松 CORS 配置已应用 ---")
    # ---- 临时 CORS 配置结束 ----

    if not app.debug and not app.testing:
        # 在生产环境中可以配置更复杂的日志记录
        pass
    app.logger.info(f"Starting app in {config_name} mode.") # 使用 app.logger
    
    # 初始化扩展
    db.init_app(app)
    bcrypt.init_app(app)
    limiter.init_app(app)

    # API 定义
    # ... (这部分代码应该没问题，但如果它也从本地模块导入，确保那些导入也遵循规则)
    api_bp = Blueprint('api', __name__, url_prefix='/api/v1') # 示例
    # 假设 Api 类来自 flask_restx，这是一个外部包，所以导入方式不变
    from flask_restx import Api # 外部包导入不变
    api = Api(api_bp,
              title='POI Web API',
              version='1.0',
              description='一个用于管理和查询兴趣点(POI)信息的Web API。',
              doc='/doc/',
              authorizations={
                  'jsonWebToken': {
                      'type': 'apiKey',
                      'in': 'header',
                      'name': 'Authorization',
                      'description': "JWT Token, 前缀为 'Bearer '. 例如: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  },
                  'apiKey': {
                      'type': 'apiKey',
                      'in': 'header',
                      'name': 'X-API-KEY',
                      'description': "公众用户访问POI查询接口所需的API Key."
                  }
              },
             )
    
    # 注册 Namespaces
    api.add_namespace(auth_ns, path='/auth')
    api.add_namespace(poi_ns, path='/pois')

    app.register_blueprint(api_bp)

    app.logger.info(f"--- DEBUG: API 蓝图已注册到 {api_bp.url_prefix} ---")
    app.logger.debug(f"--- DEBUG: 当前已注册路由规则: {list(app.url_map.iter_rules())} ---")

    # 注册错误处理器
    register_error_handlers(api)
    register_app_error_handlers(app)
    app.logger.info("--- DEBUG: 错误处理器已注册 ---")

    # 添加一个简单的测试路由，不受蓝图影响，直接在 app 对象上
    @app.route('/test-cors-debug', methods=['GET', 'OPTIONS'])
    def test_cors_debug_route():
        app.logger.info("--- DEBUG: /test-cors-debug 路由被访问 ---")
        # 由于我们设置了全局 CORS(app, ...)，Flask-CORS 应该会自动为这个响应添加 CORS 头部
        return jsonify(message="CORS debug test successful!")
    
    # 创建数据库表和初始数据
    with app.app_context():
        db.create_all()
        if Role.query.filter_by(name='admin').first() is None:
            db.session.add(Role(name='admin'))
            app.logger.info("Created 'admin' role.")
        if Role.query.filter_by(name='public_user').first() is None:
            db.session.add(Role(name='public_user'))
            app.logger.info("Created 'public_user' role.")
        db.session.commit()
        
        if User.query.filter_by(email='admin@example.com').first() is None:
            admin_role = Role.query.filter_by(name='admin').first()
            if admin_role:
                # 确保 User 构造函数与 models.py 中的定义一致
                admin_user = User(username='admin', email='admin@example.com', password='adminpassword', role_id=admin_role.id)
                db.session.add(admin_user)
                db.session.commit()
                app.logger.info("Created default admin user: admin@example.com / adminpassword")
                app.logger.info("--- DEBUG: create_app 函数即将返回 app 实例 ---")
    return app

# 如果你打算直接运行 app.py (例如 python poi_api/app.py)，则需要以下代码块
# 但通常我们通过工厂模式和 flask run / gunicorn 运行
# if __name__ == '__main__':
#     config_name = os.getenv('FLASK_ENV', 'dev')
#     app = create_app(config_name)
#     app.run(debug=app.config['DEBUG'])