from flask import current_app, jsonify
from werkzeug.exceptions import HTTPException

# 自定义业务异常
class BusinessException(Exception):
    def __init__(self, message, status_code=400, error_code=None, debug_info_link=None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_code = error_code or f"{current_app.config.get('SERVICE_ERROR_CODE_PREFIX', 'APP_')}GENERIC_ERROR"
        self.debug_info_link = debug_info_link

    def to_dict(self):
        return {
            "status": "error",
            "message": self.message,
            "error_code": self.error_code,
            "debug_info_link": self.debug_info_link
        }

# 针对 flask-restx 的错误处理
def register_error_handlers(api):
    @api.errorhandler(BusinessException)
    def handle_business_exception(error):
        """自定义业务异常处理器"""
        current_app.logger.error(f"BusinessException: {error.message} (Code: {error.error_code})")
        return error.to_dict(), error.status_code

    @api.errorhandler(HTTPException)
    def handle_http_exception(error):
        """处理 Werkzeug HTTP 异常"""
        current_app.logger.error(f"HTTPException: {error.code} {error.name} - {error.description}")
        response = {
            "status": "error",
            "message": error.name, # 使用HTTP标准名称作为消息
            "error_code": f"{current_app.config.get('SERVICE_ERROR_CODE_PREFIX', 'HTTP_')}{error.code}",
            "details": error.description # 有时description会更详细
        }
        return response, error.code

    @api.errorhandler(Exception)
    def handle_generic_exception(error):
        """处理所有其他未捕获的异常"""
        current_app.logger.error(f"Unhandled Exception: {str(error)}", exc_info=True)
        # 在生产环境中，避免暴露过多内部错误细节
        if current_app.config['DEBUG']:
            message = str(error)
        else:
            message = "An unexpected error occurred on the server."
        
        response = {
            "status": "error",
            "message": message,
            "error_code": f"{current_app.config.get('SERVICE_ERROR_CODE_PREFIX', 'APP_')}UNHANDLED_ERROR"
        }
        return response, 500

# 也可以为 Flask app 级别注册错误处理器 (如果某些错误未被 restx 捕获)
def register_app_error_handlers(app):
    @app.errorhandler(404) # Werkzeug NotFound
    def not_found_error(error):
        return jsonify({
            "status": "error",
            "message": "Resource not found.",
            "error_code": f"{app.config.get('SERVICE_ERROR_CODE_PREFIX', 'HTTP_')}404"
        }), 404

    @app.errorhandler(500) # Werkzeug InternalServerError
    def internal_error(error):
        # db.session.rollback() # 如果有数据库会话，可能需要回滚
        app.logger.error(f"App Internal Server Error: {error}", exc_info=True)
        return jsonify({
            "status": "error",
            "message": "An internal server error occurred.",
            "error_code": f"{app.config.get('SERVICE_ERROR_CODE_PREFIX', 'APP_')}INTERNAL_SERVER_ERROR"
        }), 500