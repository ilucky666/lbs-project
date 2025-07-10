import json
from pymongo import MongoClient

# 修正后的文件路径
geojson_path = r'C:\Users\asus\Desktop\lbs242502\backend\全国A级景区.geojson'

# 连接 MongoDB
client = MongoClient('mongodb://localhost:27017/') # 确保 MongoDB 服务正在此地址运行
db = client['poi-system'] # 数据库名
collection = db['pois']   # 集合名

def are_coordinates_valid(lon, lat):
    """检查经纬度是否在有效范围内"""
    if lon is None or lat is None:
        return False
    try:
        # 尝试将坐标转换为浮点数
        lon_f = float(lon)
        lat_f = float(lat)
        
        # 检查基本范围
        if not (-180 <= lon_f <= 180 and -90 <= lat_f <= 90):
            return False
        
        # 检查是否为非常极端的值 (类似你遇到的 -1.797e+308)
        # 正常的地理坐标不会有这么大的数量级
        if abs(lon_f) > 1000 or abs(lat_f) > 1000: # 这个阈值可以根据情况调整
            return False
            
        return True
    except (ValueError, TypeError): # 如果无法转换为浮点数，则无效
        return False

try:
    # 加载 GeoJSON 文件
    with open(geojson_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    if 'features' in data and isinstance(data['features'], list):
        pois_to_insert = []
        skipped_due_to_invalid_coords = 0

        for feature in data['features']:
            props = feature.get('properties', {})
            geometry_data = feature.get('geometry', {})

            # 构建基础 POI 文档 (不含 geometry)
            poi_document = {
                'F1': props.get('F1'),
                'name': props.get('景区名称'),
                'grade': props.get('景区等级'),
                'province': props.get('地区'), # 对应你之前 mock 的 'region'
                # 直接从 properties 中获取经纬度，如果这些字段是主要的、清洁的坐标
                'longitude': props.get('经度BD'), 
                'latitude': props.get('纬度BD'),
                'longitude_wgs': props.get('经度BD_wgs'),
                'latitude_wgs': props.get('纬度BD_wgs'),
                # 你可以根据需要添加其他 properties 中的字段
            }

            # 处理 geometry 字段
            if geometry_data and geometry_data.get('type') == 'Point' and 'coordinates' in geometry_data:
                coords = geometry_data['coordinates']
                if isinstance(coords, list) and len(coords) == 2:
                    lon, lat = coords[0], coords[1]
                    if are_coordinates_valid(lon, lat):
                        # 只有当坐标有效时，才添加 GeoJSON geometry 对象
                        poi_document['geometry'] = geometry_data 
                    else:
                        print(f"警告: POI '{props.get('景区名称')}' 的 geometry.coordinates 无效: [{lon}, {lat}]. 将不包含 geometry 字段。")
                        skipped_due_to_invalid_coords += 1
                else:
                    print(f"警告: POI '{props.get('景区名称')}' 的 geometry.coordinates 格式不正确。将不包含 geometry 字段。")
                    skipped_due_to_invalid_coords += 1
            else:
                print(f"警告: POI '{props.get('景区名称')}' 缺少有效的 geometry 信息。将不包含 geometry 字段。")
                skipped_due_to_invalid_coords += 1
            
            pois_to_insert.append(poi_document)
        
        if pois_to_insert:
            # 在插入前，清空集合是一个好习惯，如果你想每次都重新导入的话
            # collection.delete_many({}) 
            # print("旧数据已清空。")

            collection.insert_many(pois_to_insert)
            print(f"导入完成，共处理 {len(data['features'])} 条记录。")
            print(f"成功导入 {len(pois_to_insert)} 条 POI 数据到集合 '{collection.name}'。")
            if skipped_due_to_invalid_coords > 0:
                print(f"其中 {skipped_due_to_invalid_coords} 条记录因坐标无效而未包含 geometry 字段。")
        else:
            print("在 GeoJSON 文件中没有找到可供导入的 feature 数据。")

    else:
        print(f"错误: GeoJSON 文件 '{geojson_path}' 格式不正确，未找到 'features' 数组。")

except FileNotFoundError:
    print(f"错误: 文件未找到，请检查路径 '{geojson_path}' 是否正确。")
except json.JSONDecodeError:
    print(f"错误: 文件 '{geojson_path}' 不是有效的 JSON 格式。")
except Exception as e:
    print(f"导入过程中发生其他错误: {e}")
finally:
    client.close()
    print("MongoDB 连接已关闭。")