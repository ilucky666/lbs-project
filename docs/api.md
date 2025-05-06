# POI Web API 文档

本文档详细描述了中国A级景区POI (Points of Interest) REST风格Web API的使用方法。

## API基本信息

- **基础URL**: `http://localhost:8080/api`
- **认证方式**: JWT令牌（Bearer Token）和API密钥（X-API-KEY）
- **响应格式**: JSON
- **编码**: UTF-8

## 认证与授权

API采用两种认证方式：

1. **JWT令牌认证**: 用于用户登录后的身份验证，适用于内部管理接口
2. **API密钥认证**: 用于公共查询接口

### 用户角色

- **ROLE_ADMIN**: 系统管理员，拥有所有权限
- **ROLE_INTERNAL**: 内部数据维护人员，可进行数据管理
- **ROLE_PUBLIC**: 公众用户，仅可查询数据

## 鉴权接口

### 用户注册

```
POST /api/auth/register
```

**请求体**:

```json
{
  "username": "用户名",
  "password": "密码",
  "email": "邮箱地址"
}
```

**响应**:

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": 1  // 用户ID
}
```

### 用户登录

```
POST /api/auth/login
```

**请求体**:

```json
{
  "username": "用户名",
  "password": "密码"
}
```

**响应**:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenType": "Bearer"
}
```

### 生成API密钥

```
POST /api/auth/generate-api-key
```

**请求头**:

```
Authorization: Bearer {JWT令牌}
```

**响应**:

```json
{
  "apiKey": "d8e8fca2-dc0f-4c9e-a722-9cebe5afca3f"
}
```

## POI数据接口

### 公共查询接口

所有公共查询接口都需要在请求头中包含API密钥:

```
X-API-KEY: {API密钥}
```

#### 1. 根据ID查询POI

```
GET /api/public/pois/{id}
```

**响应**:

```json
{
  "id": 1,
  "name": "故宫博物院",
  "province": "北京",
  "level": "A5",
  "location": {
    "type": "Point",
    "coordinates": [116.397, 39.918]
  },
  "description": "故宫博物院藏品主要来源于清代宫中旧藏，是中国第一批全国重点文物保护单位。",
  "websiteUrl": "https://www.dpm.org.cn/",
  "imageUrl": "https://example.com/gugong.jpg",
  "createdAt": "2023-01-01T12:00:00Z",
  "updatedAt": "2023-01-01T12:00:00Z"
}
```

#### 2. 根据名称搜索POI

```
GET /api/public/pois/search/name?name={name}&page={page}&size={size}&sortBy={field}&sortDir={asc|desc}
```

**参数**:
- `name`: 景区名称（模糊匹配）
- `page`: 页码，从0开始（可选，默认0）
- `size`: 每页大小（可选，默认20）
- `sortBy`: 排序字段（可选，默认name）
- `sortDir`: 排序方向（可选，默认asc）

**响应**:

```json
{
  "content": [
    {
      "id": 1,
      "name": "故宫博物院",
      "province": "北京",
      "level": "A5",
      "location": {
        "type": "Point",
        "coordinates": [116.397, 39.918]
      },
      "description": "故宫博物院藏品主要来源于清代宫中旧藏，是中国第一批全国重点文物保护单位。",
      "websiteUrl": "https://www.dpm.org.cn/",
      "imageUrl": "https://example.com/gugong.jpg"
    }
  ],
  "pageable": {
    "pageNumber": 0,
    "pageSize": 20,
    "sort": {
      "sorted": true,
      "unsorted": false,
      "empty": false
    },
    "offset": 0,
    "paged": true,
    "unpaged": false
  },
  "totalElements": 1,
  "totalPages": 1,
  "last": true,
  "size": 20,
  "number": 0,
  "sort": {
    "sorted": true,
    "unsorted": false,
    "empty": false
  },
  "numberOfElements": 1,
  "first": true,
  "empty": false
}
```

#### 3. 根据省份搜索POI

```
GET /api/public/pois/search/province?province={province}&page={page}&size={size}
```

**参数**:
- `province`: 省份名称
- `page`: 页码，从0开始（可选，默认0）
- `size`: 每页大小（可选，默认20）

#### 4. 根据等级搜索POI

```
GET /api/public/pois/search/level?level={level}&page={page}&size={size}
```

**参数**:
- `level`: 景区等级（1-5）
- `page`: 页码，从0开始（可选，默认0）
- `size`: 每页大小（可选，默认20）

#### 5. 根据边界框搜索POI

```
GET /api/public/pois/search/boundingbox?minLat={minLat}&minLon={minLon}&maxLat={maxLat}&maxLon={maxLon}
```

**参数**:
- `minLat`: 最小纬度
- `minLon`: 最小经度
- `maxLat`: 最大纬度
- `maxLon`: 最大经度

#### 6. 根据半径搜索POI

```
GET /api/public/pois/search/radius?lat={lat}&lon={lon}&radiusInMeters={radius}
```

**参数**:
- `lat`: 中心点纬度
- `lon`: 中心点经度
- `radiusInMeters`: 搜索半径（米）

#### 7. 查询有扩展信息的POI

```
GET /api/public/pois/search/extended-info?page={page}&size={size}
```

**参数**:
- `page`: 页码，从0开始（可选，默认0）
- `size`: 每页大小（可选，默认20）

### 内部管理接口

所有内部管理接口都需要在请求头中包含JWT令牌，并且用户角色必须是ROLE_ADMIN或ROLE_INTERNAL:

```
Authorization: Bearer {JWT令牌}
```

#### 1. 创建POI

```
POST /api/internal/pois
```

**请求体**:

```json
{
  "name": "故宫博物院",
  "province": "北京",
  "level": "A5",
  "latitude": 39.918,
  "longitude": 116.397,
  "description": "故宫博物院藏品主要来源于清代宫中旧藏，是中国第一批全国重点文物保护单位。",
  "websiteUrl": "https://www.dpm.org.cn/",
  "imageUrl": "https://example.com/gugong.jpg"
}
```

#### 2. 更新POI

```
PUT /api/internal/pois/{id}
```

**请求体**:

```json
{
  "name": "故宫博物院",
  "province": "北京",
  "level": "A5",
  "latitude": 39.918,
  "longitude": 116.397,
  "description": "故宫博物院藏品主要来源于清代宫中旧藏，是中国第一批全国重点文物保护单位。",
  "websiteUrl": "https://www.dpm.org.cn/",
  "imageUrl": "https://example.com/gugong.jpg"
}
```

#### 3. 删除POI

```
DELETE /api/internal/pois/{id}
```

## 数据导入接口

这些接口仅限ROLE_ADMIN角色使用:

```
Authorization: Bearer {JWT令牌}
```

#### 1. 导入Excel数据

```
POST /api/admin/import/excel
```

**请求体**:

使用`multipart/form-data`格式上传Excel文件(.xlsx或.xls)，字段名为`file`。

#### 2. 导入Shapefile数据

```
POST /api/admin/import/shapefile
```

**请求体**:

使用`multipart/form-data`格式上传Shapefile文件(.shp或打包成.zip)，字段名为`file`。

## 数据格式

### POI数据结构

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | Long | POI唯一标识 |
| name | String | 景区名称 |
| province | String | 所在省份 |
| level | String | 景区等级（A1、A2、A3、A4、A5） |
| location | Point | 地理位置（WGS84坐标系） |
| description | String | 景区描述 |
| websiteUrl | String | 景区网站URL |
| imageUrl | String | 景区图片URL |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

## 错误处理

API使用HTTP状态码表示请求结果:

- 200: 请求成功
- 201: 创建成功
- 400: 请求参数错误
- 401: 认证失败
- 403: 权限不足
- 404: 资源不存在
- 429: 请求频率超限
- 500: 服务器内部错误

### 错误响应格式

```json
{
  "success": false,
  "message": "错误信息",
  "errorCode": "POI-001"
}
```

### 错误代码

| 错误代码 | 描述 |
| --- | --- |
| POI-001 | POI不存在 |
| POI-002 | 无效的坐标 |
| POI-003 | 无效的等级格式 |
| POI-004 | 缺少必填字段 |
| POI-005 | 请求频率超限 |

## 速率限制

为了保护API不被滥用，公共查询接口有以下限制:

- 每个API密钥每小时最多100个请求
- 超出限制后会返回429状态码

## API使用示例

### 使用cURL进行用户注册

```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"password123","email":"test@example.com"}'
```

### 使用cURL进行用户登录

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"password123"}'
```

### 使用cURL生成API密钥

```bash
curl -X POST http://localhost:8080/api/auth/generate-api-key \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### 使用cURL搜索POI

```bash
curl -X GET "http://localhost:8080/api/public/pois/search/name?name=故宫" \
  -H "X-API-KEY: d8e8fca2-dc0f-4c9e-a722-9cebe5afca3f"
``` 