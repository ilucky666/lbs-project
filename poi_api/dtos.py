from flask_restx import fields

# 基础响应模型
base_response_model = {
    'status': fields.String(required=True, description='请求状态: success 或 error'),
    'message': fields.String(description='相关消息')
}

# 用户 DTOs
user_auth_input = {
    'email': fields.String(required=True, description='用户邮箱'),
    'password': fields.String(required=True, description='用户密码')
}

user_register_input = {
    'username': fields.String(required=True, description='用户名'),
    'email': fields.String(required=True, description='用户邮箱'),
    'password': fields.String(required=True, description='用户密码')
}

user_info_dto = {
    'id': fields.Integer(description='用户ID'),
    'username': fields.String(description='用户名'),
    'email': fields.String(description='用户邮箱'),
    'role': fields.String(attribute='role.name', description='用户角色')
}

auth_success_dto = {
    **base_response_model,
    'token': fields.String(description='JWT 访问令牌'),
    'user': fields.Nested(user_info_dto)
}

apikey_dto = {
    'key': fields.String(description='API Key'),
    'created_on': fields.DateTime(description='创建时间'),
    'is_active': fields.Boolean(description='是否激活')
}

apikey_list_dto = {
    **base_response_model,
    'api_keys': fields.List(fields.Nested(apikey_dto))
}

# POI DTOs
poi_base_dto_fields = {
    'id': fields.Integer(readOnly=True, description='POI唯一标识符'),
    'name': fields.String(required=True, description='POI名称'),
    'latitude': fields.Float(required=True, description='纬度'),
    'longitude': fields.Float(required=True, description='经度'),
    'address': fields.String(description='详细地址'),
    'province': fields.String(description='省份'),
    'city': fields.String(description='城市'),
    'category': fields.String(description='POI类别'),
    'description': fields.String(description='描述信息'),
    'has_image': fields.Boolean(description='是否有图片'),
    'image_url': fields.String(description='图片链接'),
    'has_website': fields.Boolean(description='是否有官网'),
    'website_url': fields.String(description='官网主页地址'),
}

poi_output_dto = {
    **poi_base_dto_fields,
    'created_on': fields.DateTime(description='创建时间'),
    'updated_on': fields.DateTime(description='更新时间'),
}

poi_input_dto = { # 用于创建和更新
    'name': fields.String(required=True, description='POI名称', example="故宫博物院"),
    'latitude': fields.Float(required=True, description='纬度', example=39.916345),
    'longitude': fields.Float(required=True, description='经度', example=116.397155),
    'address': fields.String(description='详细地址', example="北京市东城区景山前街4号"),
    'province': fields.String(description='省份', example="北京市"),
    'city': fields.String(description='城市', example="北京市"),
    'category': fields.String(description='POI类别', example="文化古迹"),
    'description': fields.String(description='描述信息', example="中国最大的古代文化艺术博物馆"),
    'has_image': fields.Boolean(description='是否有图片', default=False),
    'image_url': fields.String(description='图片链接', example="[https://example.com/gugong.jpg](https://example.com/gugong.jpg)"),
    'has_website': fields.Boolean(description='是否有官网', default=False),
    'website_url': fields.String(description='官网主页地址', example="[https://www.dpm.org.cn/](https://www.dpm.org.cn/)")
}

poi_list_response_dto = {
    **base_response_model,
    'pois': fields.List(fields.Nested(poi_output_dto)),
    'total': fields.Integer(description='总数'),
    'page': fields.Integer(description='当前页码'),
    'pages': fields.Integer(description='总页数'),
    'per_page': fields.Integer(description='每页数量')
}

# 错误响应 DTO
error_response_dto_fields = {
    'status': fields.String(default='error'),
    'message': fields.String(description='错误描述'),
    'error_code': fields.String(description='服务平台专属业务错误代码'),
    'debug_info_link': fields.String(description='扩展调试信息链接 (可选)')
}

def create_api_models(api):
    return {
        'user_auth_input': api.model('UserAuthInput', user_auth_input),
        'user_register_input': api.model('UserRegisterInput', user_register_input),
        'auth_success_response': api.model('AuthSuccessResponse', auth_success_dto),
        'user_info_response': api.model('UserInfoResponse', {**base_response_model, 'user': fields.Nested(user_info_dto)}),
        'apikey_item': api.model('APIKeyItem', apikey_dto),
        'apikey_list_response': api.model('APIKeyListResponse', apikey_list_dto),
        'base_success_response': api.model('BaseSuccessResponse', base_response_model),

        'poi_item_response': api.model('POIItemResponse', {**base_response_model, 'poi': fields.Nested(api.model('POIOutput', poi_output_dto))}),
        'poi_input': api.model('POIInput', poi_input_dto),
        'poi_list_response': api.model('POIListResponse', poi_list_response_dto),
        
        'error_response': api.model('ErrorResponse', error_response_dto_fields)
    }
