// backend/routes/poi.js (最小化修改版 - 仅移除Token和角色检查)
const express = require('express');
const router = express.Router();
const POI = require('../models/poi');
const verifyToken = require('../middleware/verifyToken'); // 导入仍然保留，但部分路由不再使用它
const multer = require('multer'); // 确保 multer 已正确导入和配置
const fs = require('fs');
const path = require('path'); // 引入 path 模块

// 配置 multer 用于文件上传 (如果你的原始代码中已有，请保留或适配)
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
}
const upload = multer({ dest: uploadDir });


/**
 * 获取所有 POI (保持原样，此接口原本就是公开的)
 */
router.get('/all', async (req, res) => {
  try {
    const pois = await POI.find();
    res.json(pois); // 保持原始返回格式
  } catch (err) {
    res.status(500).json({ message: '获取失败', error: err.message });
  }
});

/**
 * 添加 POI（移除了 Token 和管理员角色验证）
 */
router.post('/add', /* verifyToken, */ async (req, res) => { // 1. verifyToken 被注释掉
  // 2. 管理员角色检查被注释掉
  // if (req.user.role !== 'admin') { 
  //   return res.status(403).json({ message: '无权限，管理员专属功能' });
  // }

    // 前端实际发送的五个字段
  const {
    name,     // 景区名称
    grade,    // 景区等级 (我们约定用它填充后端的 type 字段)
    province, // 地区 (我们约定用它填充后端的 province 字段)
    geometry  // GeoJSON geometry 对象，由前端的 longitude 和 latitude 构造而来
  } = req.body;

  // 1. 必要字段检查
  if (
    !name ||
    !geometry || // 确保 geometry 对象存在
    geometry.type !== 'Point' || // 确保 geometry.type 是 "Point"
    !geometry.coordinates ||
    !Array.isArray(geometry.coordinates) ||
    geometry.coordinates.length !== 2
  ) {
    console.error("[BACKEND /api/poi/add] 验证错误: 缺少 name 或 geometry 格式不正确。收到的 req.body:", req.body);
    return res.status(400).json({ message: '名称和有效的点几何对象 (geometry: {type: "Point", coordinates: [lon,lat]}) 都是必需的' });
  }

  const [lon, lat] = geometry.coordinates;
  // 2. 检查经纬度是否是有效数字和范围
  if (typeof lon !== 'number' || typeof lat !== 'number' || 
      isNaN(lon) || isNaN(lat) || 
      lon < -180 || lon > 180 || 
      lat < -90 || lat > 90) {
    console.error("[BACKEND /api/poi/add] 验证错误: geometry 中的经纬度值无效或超出范围。Coordinates:", geometry.coordinates);
    return res.status(400).json({ message: '几何对象中的经纬度值无效或超出范围' });
  }

  try {
    // 3. 构建要存入数据库的 POI 对象
    // 字段名要与你的 Mongoose Schema 对应
    const newPoiData = {
      name: name,
      type: grade,        // 假设 Schema 中有一个 'type' 字段来存储等级
      province: province,   // 假设 Schema 中有一个 'province' 字段来存储地区
      
      // 关键修改：确保这里使用的字段名与你的 POISchema 中定义的一致
      // 根据 Mongoose 报错，你的 Schema 中地理空间字段很可能名为 'geometry'
      geometry: {         
        type: "Point", 
        coordinates: [lon, lat] // 使用经过验证和解析的坐标
      },

      // 如果你的前端 poiForm 还发送了 F1, address, level(如果type不用level) 等字段，
      // 并且你的 POI Schema 中也定义了这些字段，你可以在这里添加它们:
      // F1: req.body.F1, // 假设前端 addPoiAdmin 的 payload 中也传了 F1 (通常新增时后端生成)
      // level: req.body.grade, // 如果你的 schema 中单独有 level 字段
      // address: req.body.address, // 如果前端传了 address
    };

    const poi = new POI(newPoiData);
    await poi.save();
    
    res.status(201).json({ code: 200, message: 'POI 添加成功 (无Token测试)', data: poi });
  } catch (err) {
    console.error("Error in POST /api/poi/add (during save):", err); 
    res.status(500).json({ message: '添加失败，服务器内部错误', error: err.message });
  }
});
/**
 * 删除 POI（移除了 Token 和管理员角色验证）
 */
router.delete('/:id', /* verifyToken, */ async (req, res) => { // 1. verifyToken 被注释掉
  // 2. 管理员角色检查被注释掉
  // if (req.user.role !== 'admin') {
  //   return res.status(403).json({ message: '无权限，管理员专属功能' });
  // }

  // 以下代码严格保持你原始的逻辑
  try {
    const deletedPoi = await POI.findByIdAndDelete(req.params.id); // 添加变量接收结果以便检查
    if (!deletedPoi) {                                          // 添加未找到的检查
        return res.status(404).json({ message: '未找到要删除的POI' });
    }
    res.json({ message: 'POI 删除成功 ' }); // 消息稍作修改
  } catch (err) {
    res.status(500).json({ message: '删除失败', error: err.message });
  }
});

/**
 * 编辑 POI（移除了 Token 和管理员角色验证）
 */
router.put('/:id', /* verifyToken, */ async (req, res) => { // 1. verifyToken 被注释掉
  // 2. 管理员角色检查被注释掉
  // if (req.user.role !== 'admin') {
  //   return res.status(403).json({ message: '无权限，管理员专属功能' });
  // }

  // 以下代码严格保持你原始的逻辑
  const { name, type, coordinates } = req.body;
  // 你原始代码中没有对编辑接口的 body 做校验，这里也保持一致
  // 但通常建议添加，例如：
  // if (!name && !type && !coordinates) {
  //    return res.status(400).json({ message: '至少提供一个要更新的字段' });
  // }

  try {
    // 构建更新对象，只包含实际从 req.body 接收到的字段
    // 你的原始代码直接将它们全部放入，如果某些字段是可选的，这没有问题
    const updateData = {
        name,
        type,
        location: coordinates ? { type: 'Point', coordinates } : undefined,
    };
    // 移除 undefined 的字段，避免更新时尝试设置空 location
    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);
    if (updateData.location === undefined && name === undefined && type === undefined) {
        return res.status(400).json({ message: '没有提供可更新的字段' });
    }


    const updatedPOI = await POI.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    if (!updatedPOI) {                                            // 添加未找到的检查
        return res.status(404).json({ message: '未找到要更新的POI' });
    }
    res.json({ message: 'POI 更新成功 (无Token测试)', poi: updatedPOI }); // 消息稍作修改
  } catch (err) {
    res.status(500).json({ message: '更新失败', error: err.message });
  }
});

/**
 * 导入 GeoJSON 文件（移除了 Token 和管理员角色验证）
 */
router.post('/import', /* verifyToken, */ upload.single('file'), async (req, res) => { // 1. verifyToken 被注释掉
  // 2. 管理员角色检查被注释掉
  // if (req.user.role !== 'admin') {
  //   return res.status(403).json({ message: '无权限，管理员专属功能' });
  // }

  if (!req.file) { // 添加了对 req.file 的检查
    return res.status(400).json({ message: '没有上传文件' });
  }
  const filePath = req.file.path;
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    const geojson = JSON.parse(data);

    if (!geojson.features || !Array.isArray(geojson.features)) {
      fs.unlinkSync(filePath); // 确保在出错时也清理文件
      return res.status(400).json({ message: '无效的 GeoJSON 格式' });
    }

    const pois = geojson.features.map(f => ({
      name: f.properties.name || '未命名',
      type: f.properties.type || '未知',
      location: {
        type: 'Point',
        coordinates: f.geometry.coordinates,
      },
    }));

    await POI.insertMany(pois);
    fs.unlinkSync(filePath); // 删除上传的文件

    res.json({ message: '导入成功 (无Token测试)', count: pois.length }); // 消息稍作修改
  } catch (err) {
    if (fs.existsSync(filePath)) { // 确保在出错时也清理文件
        fs.unlinkSync(filePath);
    }
    res.status(500).json({ message: '导入失败', error: err.message });
  }
});

// --- 以下查询接口保持你原始代码的状态 (原本就是公开的) ---
// 关键词查询（支持 name / province / grade）
router.get('/search', async (req, res) => {
  try {
    const { keyword } = req.query;
    const regex = new RegExp(keyword, 'i'); // 模糊匹配
    const results = await POI.find({
      $or: [
        { name: regex },
        { province: regex }, // 假设你的 POI 模型中有 province 字段
        { grade: regex }     // 假设你的 POI 模型中有 grade 字段
      ]
    });
    res.json(results); // 保持原始返回格式
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 拉框查询（矩形范围）
router.get('/within-box', async (req, res) => {
  try {
    const { minLng, minLat, maxLng, maxLat } = req.query;
    if (!minLng || !minLat || !maxLng || !maxLat ) { // 添加参数校验
        return res.status(400).json({ message: '拉框查询参数不完整' });
    }
    const results = await POI.find({
      geometry: { // 假设你的 POI 模型中地理位置信息存储在 'geometry' 字段，并且是 GeoJSON 格式
        $geoWithin: {
          $box: [
            [parseFloat(minLng), parseFloat(minLat)],
            [parseFloat(maxLng), parseFloat(maxLat)]
          ]
        }
      }
    });
    res.json(results); // 保持原始返回格式
  } catch (err) {
    console.error("[Backend POI /within-box] Error:", err); // 添加日志
    res.status(500).json({ error: err.message });
  }
});

// 半径查询（距离查询）
router.get('/nearby', async (req, res) => {
  try {
    const { lng, lat, radius } = req.query;
    if (!lng || !lat || !radius) { // 添加参数校验
        return res.status(400).json({ message: '半径查询参数不完整' });
    }
    const results = await POI.find({
      geometry: { // 假设你的 POI 模型中地理位置信息存储在 'geometry' 字段
        $near: { // 或者 $nearSphere，取决于你的索引和需求
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: parseFloat(radius) // 单位：米 (如果使用 $nearSphere)
                                            // 对于 $near，单位是弧度，需要转换
        }
      }
    });
    res.json(results); // 保持原始返回格式
  } catch (err) {
    console.error("[Backend POI /nearby] Error:", err); // 添加日志
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;