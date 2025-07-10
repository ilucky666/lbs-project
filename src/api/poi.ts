// src/api/poi.ts
import request from '@/utils/request';

// 1. 精确定义后端返回的 POI 对象结构
// 这个接口现在完全匹配你的 Mongoose Schema
export interface BackendPoi {
  _id: string;        // Mongoose 自动生成的 ID
  name: string;
  grade?: string;      // 等级，可能是可选的
  province?: string;   // 省份，可能是可选的
  geometry: {
    type: "Point";   // 类型固定为 "Point"
    coordinates: [number, number]; // 数组形式：[longitude, latitude]
  };
  // 根据你的 Schema，其他字段如 F1, level, region, address, location 等都不存在于原始后端对象中
}

// --- 地图交互查询接口 ---
// 这个函数将用于根据地图边界获取POI
export function getPoisInBounds(params: { 
  minLng: number; 
  minLat: number; 
  maxLng: number; 
  maxLat: number 
}): Promise<BackendPoi[]> {
  return request({
    url: '/api/poi/within-box', // 使用后端已有的拉框查询接口
    method: 'get',
    params, // 后端期望 minLng, minLat, maxLng, maxLat
  });
}

// 拉框查询
export function searchPoisByBox(params: { 
  minLng: number; 
  minLat: number; 
  maxLng: number; 
  maxLat: number 
}): Promise<BackendPoi[]> {
  return request({
    url: '/api/poi/within-box',
    method: 'get',
    params,
  });
}

// 半径查询
export function searchPoisByRadius(params: { 
  lng: number; 
  lat: number; 
  radius: number 
}): Promise<BackendPoi[]> {
  return request({
    url: '/api/poi/nearby',
    method: 'get',
    params,
  });
}

// --- 初始/全部 POI 加载 ---
export function getInitialPois(): Promise<BackendPoi[]> {
  return request({
    url: '/api/poi/all',
    method: 'get',
  });
}

// --- 管理员页面用的 POI 接口 ---

export function getPoiListAdmin(params: { name?: string; province?: string; keyword?: string }): Promise<BackendPoi[]> {
  let queryParams: { keyword?: string } = {}; // 明确类型
  if (params.name) queryParams.keyword = params.name;
  else if (params.province) queryParams.keyword = params.province;
  else if (params.keyword) queryParams.keyword = params.keyword;

  if (Object.keys(queryParams).length > 0) {
    return request({
        url: '/api/poi/search',
        method: 'get',
        params: queryParams,
    });
  } else {
    return request({
        url: '/api/poi/all', // 管理员页面无筛选时也获取全部
        method: 'get',
    });
  }
}

// 新增 POI - 后端期望: name, type (对应前端的level/grade), coordinates (在 geometry 内)
// 你的后端 /add 接口定义是： const { name, type, coordinates } = req.body;
// 然后构造 poi = new POI({ name, type, location: { type: 'Point', coordinates } })
// 注意这里后端用的是 `location`，而 Schema 定义的是 `geometry`。你需要确认后端 /add 接口实际存入数据库时用的是哪个。
// 我将假设后端 /add 接口期望的 `coordinates` 是直接的数组，并且它内部会处理 `geometry` 对象的构建。
// 或者，前端直接提交符合 Schema 的 `geometry` 对象。我们按后者来，更符合 Schema。
export function addPoiAdmin(data: {
  name: string;
  grade?: string;     // 对应后端的 grade
  province?: string;  // 对应后端的 province
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
}): Promise<any> {
  return request({
    url: '/api/poi/add',
    method: 'post',
    data, // 直接发送符合后端期望的数据结构，后端应能处理 name, grade, province, geometry
  });
}

// 更新 POI - 后端期望: name, type, coordinates (在 geometry 内)
export function updatePoiAdmin(id: string, data: {
  name: string;
  grade?: string;
  province?: string;
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
}): Promise<any> {
  return request({
    url: `/api/poi/${id}`,
    method: 'put',
    data,
  });
}

// 删除 POI
export function deletePoiAdmin(id: string): Promise<any> {
  return request({
    url: `/api/poi/${id}`,
    method: 'delete',
  });
}