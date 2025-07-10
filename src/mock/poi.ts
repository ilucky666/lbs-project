// src/mock/poi.ts
import Mock from 'mockjs'
import type { MockAdapter } from 'axios-mock-adapter'

// 你提供的真实 POI 数据样本
const initialPoiData = [
  {
    F1: 0.0,
    name: '石景山游乐园',
    region: '北京',
    level: '4A',
    longitude: 116.215518,
    latitude: 39.917811,
    longitude_wgs: 116.202847,
    latitude_wgs: 39.910862,
    address: '北京市石景山区石景山路25号',
  },
  {
    F1: 1.0,
    name: '首钢工业文化旅游区',
    region: '北京',
    level: '3A',
    longitude: 116.170035,
    latitude: 39.915904,
    longitude_wgs: 116.157462,
    latitude_wgs: 39.908241,
    address: '北京市石景山区石景山路68号',
  },
  {
    F1: 2.0,
    name: '八大处公园',
    region: '北京',
    level: '4A',
    longitude: 116.190196,
    latitude: 39.968527,
    longitude_wgs: 116.177581,
    latitude_wgs: 39.961125,
    address: '北京市石景山区八大处路3号',
  },
  {
    F1: 3.0,
    name: '北京龙徽葡萄酒博物馆',
    region: '北京',
    level: '3A',
    longitude: 116.260184,
    latitude: 39.932663,
    longitude_wgs: 116.247695,
    latitude_wgs: 39.925386,
    address: '北京市海淀区玉泉路2号',
  },
  {
    F1: 4.0,
    name: '北京西山国家森林公园',
    region: '北京',
    level: '3A',
    longitude: 116.209193,
    latitude: 39.978535,
    longitude_wgs: 116.196504,
    latitude_wgs: 39.97149,
    address: '北京市海淀区闵庄路与香山南路交叉口西行100米',
  },
  {
    F1: 5.0,
    name: '阳台山自然风景区',
    region: '北京',
    level: '2A',
    longitude: 116.105479,
    latitude: 40.07526,
    longitude_wgs: 116.092524,
    latitude_wgs: 40.068207,
    address: '北京市海淀区北安河乡阳台山风景管理处',
  },
  {
    F1: 6.0,
    name: '玉渊潭公园',
    region: '北京',
    level: '4A',
    longitude: 116.326526,
    latitude: 39.922467,
    longitude_wgs: 116.313863,
    latitude_wgs: 39.91535,
    address: '北京市海淀区西三环中路10号',
  },
  {
    F1: 7.0,
    name: '圆明园遗址公园',
    region: '北京',
    level: '4A',
    longitude: 116.309804,
    latitude: 40.012658,
    longitude_wgs: 116.29724,
    latitude_wgs: 40.005264,
    address: '北京市海淀区清华西路28号',
  },
  {
    F1: 8.0,
    name: '香山公园',
    region: '北京',
    level: '4A',
    longitude: 116.195044,
    latitude: 39.996194,
    longitude_wgs: 116.182393,
    latitude_wgs: 39.98888,
    address: '北京市海淀区买卖街40号',
  },
]

// --- 内存中的“数据库” ---
let mockPoiDatabase = [...initialPoiData] // 初始数据
// 为了测试分页，补充一些随机数据
const additionalDataNeeded = Math.max(0, 50 - mockPoiDatabase.length) // 确保总数至少50条
if (additionalDataNeeded > 0) {
  const additionalMockData = Mock.mock({
    [`list|${additionalDataNeeded}`]: [
      {
        'F1|+1':
          mockPoiDatabase.length > 0 ? mockPoiDatabase[mockPoiDatabase.length - 1].F1 + 1 : 100,
        name: '@ctitle(5, 15)',
        region: () => Mock.Random.pick(['北京', '上海', '广州', '深圳', '杭州']),
        level: () => Mock.Random.pick(['5A', '4A', '3A', '2A', 'A', '未定级']),
        address: '@county(true)',
        longitude: () => Mock.Random.float(73, 135, 6, 6), // 中国范围经度
        latitude: () => Mock.Random.float(3, 54, 6, 6), // 中国范围纬度
        longitude_wgs: () => Mock.Random.float(73, 135, 6, 6),
        latitude_wgs: () => Mock.Random.float(3, 54, 6, 6),
      },
    ],
  }).list
  mockPoiDatabase = mockPoiDatabase.concat(additionalMockData)
}
let nextId = mockPoiDatabase.reduce((max, item) => Math.max(max, item.F1), 0) + 1

export default function setupPoiMock(mockAdapter: MockAdapter) {
  // --- 地图查询处理器 ---
  const handleMapQuery = (config: any) => {
    console.log(`Mock API ${config.url} 被调用 (MapQuery), 参数:`, config.data)
    const params = JSON.parse(config.data || '{}')
    let results = [...mockPoiDatabase] // 从完整数据库开始

    // 模拟筛选逻辑 (非常简化，真实后端会做精确地理空间查询)
    if (config.url?.includes('box') && params.sw && params.ne) {
      // 简单筛选：经纬度在矩形范围内
      results = results.filter(
        (poi) =>
          poi.longitude >= params.sw.lng &&
          poi.longitude <= params.ne.lng &&
          poi.latitude >= params.sw.lat &&
          poi.latitude <= params.ne.lat,
      )
    } else if (config.url?.includes('radius') && params.center && params.radius) {
      // 简单筛选：距离中心点一定范围内 (简化为矩形)
      const radiusInDegree = params.radius / 111000 // 粗略换算米到度
      results = results.filter(
        (poi) =>
          Math.abs(poi.longitude - params.center.lng) < radiusInDegree &&
          Math.abs(poi.latitude - params.center.lat) < radiusInDegree,
      )
    }

    // 如果没有筛选出数据，随机返回几条，确保有数据，以便前端演示
    if (results.length === 0 && mockPoiDatabase.length > 0) {
      results = Mock.Random.pick(mockPoiDatabase, Math.min(5, mockPoiDatabase.length))
    }

    return [200, { code: 200, msg: '查询成功', data: results }]
  }

  mockAdapter.onPost('/api/poi/search/box').reply(handleMapQuery)
  mockAdapter.onPost('/api/poi/search/radius').reply(handleMapQuery)

  // --- 管理员POI列表查询处理器 ---
  const handleAdminPoiList = (config: any) => {
    console.log(`Mock API /api/poi/list (admin) 被调用, 参数:`, config.params)
    const params = config.params || {}
    let dataToReturn = [...mockPoiDatabase] // 从完整数据库开始

    if (params.name) {
      dataToReturn = dataToReturn.filter((poi) => poi.name && poi.name.includes(params.name))
    }
    if (params.province) {
      // 假设前端传的是 province，我们数据里是 region
      dataToReturn = dataToReturn.filter(
        (poi) => poi.region && poi.region.includes(params.province),
      )
    }

    return [200, { code: 200, msg: '获取成功', data: dataToReturn }]
  }

  mockAdapter.onGet('/api/poi/list').reply(handleAdminPoiList)

  // --- 新增 POI ---
  mockAdapter.onPost('/api/poi/add').reply((config) => {
    const newPoiData = JSON.parse(config.data)
    const newPoi = {
      ...newPoiData,
      F1: nextId++, // 分配新 ID
    }
    mockPoiDatabase.unshift(newPoi) // 添加到数据库顶部
    console.log(
      'Mock API /api/poi/add, 新增后数据:',
      newPoi,
      '当前数据库大小:',
      mockPoiDatabase.length,
    )
    return [200, { code: 200, msg: '新增成功', data: newPoi }]
  })

  // --- 修改 POI ---
  mockAdapter.onPut(/\/api\/poi\/update\/\d+/).reply((config) => {
    const updatedPoiData = JSON.parse(config.data)
    const idToUpdate = parseFloat(config.url?.split('/').pop() || '0')
    const index = mockPoiDatabase.findIndex((poi) => poi.F1 === idToUpdate)

    if (index !== -1) {
      mockPoiDatabase[index] = { ...mockPoiDatabase[index], ...updatedPoiData }
      console.log('Mock API /api/poi/update, 修改后POI:', mockPoiDatabase[index])
      return [200, { code: 200, msg: '修改成功', data: mockPoiDatabase[index] }]
    }
    return [404, { code: 404, msg: '未找到要修改的POI' }]
  })

  // --- 删除 POI ---
  mockAdapter.onDelete(/\/api\/poi\/delete\/\d+/).reply((config) => {
    const idToDelete = parseFloat(config.url?.split('/').pop() || '0')
    const initialLength = mockPoiDatabase.length
    mockPoiDatabase = mockPoiDatabase.filter((poi) => poi.F1 !== idToDelete)

    if (mockPoiDatabase.length < initialLength) {
      console.log(`Mock API /api/poi/delete,删除了ID为 ${idToDelete} 的POI`)
      return [200, { code: 200, msg: '删除成功', data: { id: idToDelete } }]
    }
    return [404, { code: 404, msg: '未找到要删除的POI' }]
  })
}
