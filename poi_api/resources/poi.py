from flask import request, current_app, g
from flask_restx import Namespace, Resource, reqparse, fields
from ..models import POI, User
from ..extensions import db, limiter
from ..dtos import create_api_models
from ..decorators import admin_required, apikey_required, rate_limit_decorator
from ..errors import BusinessException
from sqlalchemy import or_, and_ # 用于复杂查询

# 创建 Namespace
poi_ns = Namespace('pois', description='POI数据管理')
# 从 DTOs 获取模型定义
models = create_api_models(poi_ns)

# --- Admin Routes (需要JWT和admin角色) ---
@poi_ns.route('')
@poi_ns.doc(security='jsonWebToken') # 表明此路径下的接口可能需要JWT
class POIListAdmin(Resource):
    @admin_required # 只有管理员可以创建POI
    @poi_ns.expect(models['poi_input'], validate=True)
    @poi_ns.marshal_with(models['poi_item_response'], code=201)
    @poi_ns.response(400, '输入无效', models['error_response'])
    @poi_ns.response(401, 'Token无效或缺失', models['error_response'])
    @poi_ns.response(403, '无管理员权限', models['error_response'])
    def post(self):
        """[管理员] 创建一个新的POI"""
        data = poi_ns.payload
        current_user_id = g.current_user.id

        new_poi = POI(
            name=data.get('name'),
            latitude=data.get('latitude'),
            longitude=data.get('longitude'),
            address=data.get('address'),
            province=data.get('province'),
            city=data.get('city'),
            category=data.get('category'),
            description=data.get('description'),
            has_image=data.get('has_image', False),
            image_url=data.get('image_url'),
            has_website=data.get('has_website', False),
            website_url=data.get('website_url'),
            created_by=current_user_id
        )
        db.session.add(new_poi)
        db.session.commit()
        return {'status': 'success', 'message': 'POI创建成功', 'poi': new_poi}, 201

@poi_ns.route('/<int:poi_id>')
@poi_ns.doc(security='jsonWebToken', params={'poi_id': 'POI的ID'})
class POIDetailAdmin(Resource):
    @admin_required # 只有管理员可以修改
    @poi_ns.expect(models['poi_input'], validate=True)
    @poi_ns.marshal_with(models['poi_item_response'])
    @poi_ns.response(400, '输入无效', models['error_response'])
    @poi_ns.response(401, 'Token无效或缺失', models['error_response'])
    @poi_ns.response(403, '无管理员权限', models['error_response'])
    @poi_ns.response(404, 'POI未找到', models['error_response'])
    def put(self, poi_id):
        """[管理员] 更新指定ID的POI信息"""
        poi = POI.query.get_or_404(poi_id, description=f"ID为 {poi_id} 的POI未找到")
        data = poi_ns.payload
        
        # 更新字段
        for key, value in data.items():
            if hasattr(poi, key):
                setattr(poi, key, value)
        
        db.session.commit()
        return {'status': 'success', 'message': 'POI更新成功', 'poi': poi}, 200

    @admin_required # 只有管理员可以删除
    @poi_ns.response(204, 'POI删除成功')
    @poi_ns.response(401, 'Token无效或缺失', models['error_response'])
    @poi_ns.response(403, '无管理员权限', models['error_response'])
    @poi_ns.response(404, 'POI未找到', models['error_response'])
    def delete(self, poi_id):
        """[管理员] 删除指定ID的POI"""
        poi = POI.query.get_or_404(poi_id, description=f"ID为 {poi_id} 的POI未找到")
        db.session.delete(poi)
        db.session.commit()
        return "", 204


# --- Public Routes (需要API Key, 并进行限流) ---
# 定义查询参数
query_parser = reqparse.RequestParser()
query_parser.add_argument('name', type=str, help='按名称查询 (模糊匹配)', location='args')
query_parser.add_argument('province', type=str, help='按省份查询', location='args')
query_parser.add_argument('category', type=str, help='按类别查询', location='args')
query_parser.add_argument('has_image', type=fields.Boolean, help='是否包含图片 (true/false)', location='args')
query_parser.add_argument('has_website', type=fields.Boolean, help='是否包含官网 (true/false)', location='args')
# 拉框查询参数 (min_lat, min_lon, max_lat, max_lon)
query_parser.add_argument('min_lat', type=float, help='最小纬度 (用于拉框查询)', location='args')
query_parser.add_argument('min_lon', type=float, help='最小经度 (用于拉框查询)', location='args')
query_parser.add_argument('max_lat', type=float, help='最大纬度 (用于拉框查询)', location='args')
query_parser.add_argument('max_lon', type=float, help='最大经度 (用于拉框查询)', location='args')
# 中心半径查询参数 (center_lat, center_lon, radius_km)
query_parser.add_argument('center_lat', type=float, help='中心点纬度 (用于圆形查询)', location='args')
query_parser.add_argument('center_lon', type=float, help='中心点经度 (用于圆形查询)', location='args')
query_parser.add_argument('radius_km', type=float, help='半径 (公里, 用于圆形查询)', location='args')
# 分页参数
query_parser.add_argument('page', type=int, default=1, help='页码', location='args')
query_parser.add_argument('per_page', type=int, default=10, help='每页数量 (最大100)', location='args')


@poi_ns.route('/search')
@poi_ns.doc(security='apiKey') # 表明此接口需要API Key (在 app.py 中定义 'apiKey' security scheme)
class POISearchPublic(Resource):
    # 应用限流装饰器，例如每分钟10次
    # 注意：确保 g.current_apikey 在 apikey_required 装饰器中被设置
    method_decorators = [apikey_required, rate_limit_decorator("10/minute")] 

    @poi_ns.expect(query_parser)
    @poi_ns.marshal_with(models['poi_list_response'])
    @poi_ns.response(401, 'API Key无效或缺失', models['error_response'])
    @poi_ns.response(429, '请求频率过高', models['error_response']) # Rate limit exceeded
    def get(self):
        """
        [公众] 查询POI列表 (需要X-API-KEY头)
        支持多种查询条件和分页。
        - 拉框查询: 提供 min_lat, min_lon, max_lat, max_lon
        - 圆形查询: 提供 center_lat, center_lon, radius_km (此示例中未完整实现，需要空间数据库支持)
        """
        args = query_parser.parse_args()
        page = args.get('page', 1)
        per_page = min(args.get('per_page', 10), 100) # 每页最多100条

        query = POI.query

        # 构建查询条件
        filters = []
        if args.get('name'):
            filters.append(POI.name.ilike(f"%{args['name']}%")) # 模糊查询
        if args.get('province'):
            filters.append(POI.province == args['province'])
        if args.get('category'):
            filters.append(POI.category == args['category'])
        
        if args.get('has_image') is not None:
            filters.append(POI.has_image == args['has_image'])
        if args.get('has_website') is not None:
            filters.append(POI.has_website == args['has_website'])

        # 拉框查询 (Bounding Box)
        min_lat, min_lon, max_lat, max_lon = args.get('min_lat'), args.get('min_lon'), args.get('max_lat'), args.get('max_lon')
        if all(v is not None for v in [min_lat, min_lon, max_lat, max_lon]):
            if min_lat > max_lat or min_lon > max_lon:
                 raise BusinessException("拉框查询参数无效：最小纬度/经度不能大于最大纬度/经度", status_code=400, error_code="QUERY_INVALID_BBOX")
            filters.append(POI.latitude >= min_lat)
            filters.append(POI.latitude <= max_lat)
            filters.append(POI.longitude >= min_lon)
            filters.append(POI.longitude <= max_lon)
        
        # 中心半径查询 (Center Radius)
        # 注意: 这是一个简化的、不精确的基于经纬度的近似计算。
        # 实际应用中，应使用数据库的空间函数 (如 PostGIS 的 ST_DWithin) 来进行精确的地理半径查询。
        center_lat, center_lon, radius_km = args.get('center_lat'), args.get('center_lon'), args.get('radius_km')
        if all(v is not None for v in [center_lat, center_lon, radius_km]):
            if radius_km <= 0:
                raise BusinessException("圆形查询半径必须大于0", status_code=400, error_code="QUERY_INVALID_RADIUS")
            # 粗略的边界框近似，实际应使用球面距离计算或数据库空间函数
            # 1度纬度约等于111km
            # 1度经度约等于111km * cos(纬度)
            # 这里为了简化，不进行精确的边界框计算，而是提示用户这部分需要后端空间能力
            current_app.logger.warning("中心半径查询在此示例中为简化版，生产环境请使用PostGIS等空间数据库功能。")
            # 示例性的粗略过滤 (非常不精确)
            lat_diff = radius_km / 111.0
            lon_diff = radius_km / (111.0 * math.cos(math.radians(center_lat)) if center_lat != 0 else 111.0)
            filters.append(POI.latitude.between(center_lat - lat_diff, center_lat + lat_diff))
            filters.append(POI.longitude.between(center_lon - lon_diff, center_lon + lon_diff))
            # 更好的做法是，如果数据库不支持，就在应用层面获取一个更大的 BBox 内的数据，然后再用精确的 Haversine 公式过滤
            # 此处仅作为提示，不添加不精确的过滤器
            pass # 提示：此处应有空间查询逻辑

        if filters:
            query = query.filter(and_(*filters))

        pagination = query.order_by(POI.name).paginate(page=page, per_page=per_page, error_out=False)
        pois = pagination.items
        
        return {
            'status': 'success',
            'pois': [p.to_dict() for p in pois], # 使用 to_dict() 确保与 DTO 定义一致
            'total': pagination.total,
            'page': pagination.page,
            'pages': pagination.pages,
            'per_page': pagination.per_page
        }, 200

@poi_ns.route('/<int:poi_id>/public') # 与管理员的 /<int:poi_id> 区分开
@poi_ns.doc(security='apiKey', params={'poi_id': 'POI的ID'})
class POIDetailPublic(Resource):
    method_decorators = [apikey_required, rate_limit_decorator("20/minute")]

    @poi_ns.marshal_with(models['poi_item_response'])
    @poi_ns.response(401, 'API Key无效或缺失', models['error_response'])
    @poi_ns.response(404, 'POI未找到', models['error_response'])
    @poi_ns.response(429, '请求频率过高', models['error_response'])
    def get(self, poi_id):
        """[公众] 获取指定ID的POI详情 (需要X-API-KEY头)"""
        # 使用 get_or_404 会自动处理未找到的情况并返回404，但错误信息是 Werkzeug 默认的
        # 为了统一错误格式，我们手动查询并抛出自定义异常
        poi = POI.query.filter_by(id=poi_id).first()
        if not poi:
            raise BusinessException(f"ID为 {poi_id} 的POI未找到", status_code=404, error_code="POI_NOT_FOUND")
        
        return {'status': 'success', 'poi': poi.to_dict()}, 200