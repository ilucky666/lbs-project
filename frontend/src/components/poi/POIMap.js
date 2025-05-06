import React, { useState, useEffect, useRef, useContext } from 'react';
import AMapLoader from '@amap/amap-jsapi-loader';
import { Card, Select, Slider, Input, Button, message, Spin, Row, Col, Tooltip, Switch } from 'antd';
import { SearchOutlined, EnvironmentOutlined, BorderOutlined, AimOutlined, ClearOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext'; // Import useAuth hook
import * as api from '../../services/api'; // Import API service

// --- 配置项 --- 
// 替换为您自己的高德地图API Key和安全密钥
const AMAP_KEY = 'your_amap_api_key_here'; 
const AMAP_SECRET = 'your_amap_jsapi_secret_here'; // 用于JS API安全凭证
// ----------------

// 地图初始中心点（北京）
const INITIAL_CENTER = [116.397428, 39.90923];
const INITIAL_ZOOM = 5;

const POIMap = () => {
  const { apiKey } = useAuth(); // 从 AuthContext 获取 API Key
  const [loading, setLoading] = useState(true);
  const [map, setMap] = useState(null);
  const [AMapInstance, setAMapInstance] = useState(null); // 存储AMap对象实例
  const [pois, setPois] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [searchParams, setSearchParams] = useState({
    name: '',
    province: null,
    level: null,
    radius: 5, // km
    searchType: 'text' // 'text', 'bbox', 'radius'
  });
  const [drawTool, setDrawTool] = useState(null); // 地图绘制工具实例 (矩形、圆形)
  const [markerCluster, setMarkerCluster] = useState(null); // 点聚合实例
  const [isClusteringEnabled, setIsClusteringEnabled] = useState(true);
  const [currentSearchArea, setCurrentSearchArea] = useState(null); // 用于存储绘制的图形

  const mapContainer = useRef(null);
  const infoWindowRef = useRef(null);

  // 初始化地图
  useEffect(() => {
    // 设置安全密钥
    window._AMapSecurityConfig = { securityJsCode: '7f48b8fbee2c7c95d00e399e25ee8894' };
  
    setLoading(true);
    AMapLoader.load({
      key: 'a0eecdc7167323f42d82c1ec68762226',
      version: '2.0',
      plugins: [
        'AMap.ToolBar', 'AMap.Scale', 'AMap.MapType',
        'AMap.GeometryUtil', 'AMap.MouseTool', 'AMap.RectangleEditor',
        'AMap.CircleEditor', 'AMap.MarkerCluster' // 加载点聚合插件
      ]
    }).then((AMap) => {
      setAMapInstance(AMap); // 保存 AMap 实例
      const mapInstance = new AMap.Map(mapContainer.current, {
        zoom: INITIAL_ZOOM,
        center: INITIAL_CENTER,
        viewMode: '3D'
      });

      // 添加控件
      mapInstance.addControl(new AMap.ToolBar());
      mapInstance.addControl(new AMap.Scale());
      mapInstance.addControl(new AMap.MapType({ defaultType: 0 }));
      
      // 创建信息窗体实例
      infoWindowRef.current = new AMap.InfoWindow({
        offset: new AMap.Pixel(0, -30)
      });
      
      // 创建绘制工具实例
      const mouseTool = new AMap.MouseTool(mapInstance);
      setDrawTool(mouseTool);
      
      // 监听绘制完成事件
      mouseTool.on('draw', handleDrawComplete);

      // 初始化点聚合
      if (isClusteringEnabled) {
          const cluster = new AMap.MarkerCluster(mapInstance, [], {
            gridSize: 80, // 聚合网格像素大小
            minClusterSize: 5, // 最小聚合点数
            maxZoom: 15 // 最大聚合缩放级别
          });
          setMarkerCluster(cluster);
      }

      setMap(mapInstance);
      setLoading(false);
      fetchProvinces();
      
    }).catch(e => {
      console.error('高德地图加载失败:', e);
      message.error('地图加载失败，请检查您的网络和API Key设置，然后重试。');
      setLoading(false);
    });

    // 组件卸载时销毁地图
    return () => {
      drawTool?.close(true); // 关闭并清除绘制图形
      map?.destroy();
      setMap(null);
    };
  }, []); // 依赖为空数组，仅在挂载时运行

  // API Key 变化时提示用户
  useEffect(() => {
    if (!apiKey) {
      message.info('请先在 "API密钥管理" 页面获取或设置您的API密钥才能进行查询。');
    }
  }, [apiKey]);
  
  // 点聚合状态切换
  useEffect(() => {
    if (!map || !AMapInstance) return;
    
    if (isClusteringEnabled && !markerCluster) {
        const cluster = new AMap.MarkerCluster(map, [], {
            gridSize: 80, minClusterSize: 5, maxZoom: 15
        });
        setMarkerCluster(cluster);
        updateMarkers(pois); // 更新聚合
    } else if (!isClusteringEnabled && markerCluster) {
        markerCluster.setMap(null); // 移除聚合
        setMarkerCluster(null);
        updateMarkers(pois); // 重新绘制普通点
    }
  }, [isClusteringEnabled, map, AMapInstance]);

  // 获取省份列表
  const fetchProvinces = async () => {
    if (!apiKey) return;
    try {
      const response = await api.getProvinces(apiKey);
      setProvinces(response.data || []);
    } catch (error) {
      console.error('获取省份列表失败:', error);
      // message.error('无法加载省份列表');
    }
  };

  // 处理查询参数变化
  const handleParamChange = (key, value) => {
    setSearchParams(prev => ({ ...prev, [key]: value, searchType: 'text' })); // 文本搜索优先
  };

  // 清除搜索条件
  const clearSearch = () => {
      setSearchParams({ name: '', province: null, level: null, radius: 5, searchType: 'text' });
      setPois([]);
      updateMarkers([]);
      clearDrawings();
      map?.setZoomAndCenter(INITIAL_ZOOM, INITIAL_CENTER);
  };
  
  // 执行POI搜索
  const executeSearch = async () => {
    if (!apiKey) {
      message.warning('请先设置API密钥。');
      return;
    }
    if (!map) {
        message.error('地图实例尚未加载完成。');
        return;
    }

    setLoading(true);
    setPois([]); // 清空现有结果
    updateMarkers([]); // 清空地图标记
    
    try {
      let response;
      const { name, province, level, radius, searchType } = searchParams;
      
      if (searchType === 'bbox' && currentSearchArea) {
         const bounds = currentSearchArea.getBounds();
         const bbox = {
            minLon: bounds.getSouthWest().getLng(),
            minLat: bounds.getSouthWest().getLat(),
            maxLon: bounds.getNorthEast().getLng(),
            maxLat: bounds.getNorthEast().getLat()
         };
         response = await api.searchPoiByBoundingBox(bbox, apiKey);
      } else if (searchType === 'radius' && currentSearchArea) {
          const center = currentSearchArea.getCenter();
          const radiusInMeters = currentSearchArea.getRadius();
          response = await api.searchPoiByRadius({ lat: center.getLat(), lon: center.getLng() }, radiusInMeters, apiKey);
      } else {
          // 文本条件搜索
          if (name) {
            response = await api.searchPoiByName(name, apiKey);
          } else if (province) {
            response = await api.searchPoiByProvince(province, apiKey);
          } else if (level) {
            response = await api.searchPoiByLevel(level, apiKey);
          } else {
            // 如果没有文本条件，可以默认按地图中心和半径搜索，或提示用户输入条件
             message.info('请输入搜索条件或在地图上绘制区域进行搜索。');
             setLoading(false);
             return;
            // const center = map.getCenter();
            // response = await api.searchPoiByRadius({ lat: center.getLat(), lon: center.getLng() }, radius * 1000, apiKey);
          }
      }

      // 处理响应数据 (分页或列表)
      const poiData = response.data?.content || response.data || [];
      setPois(poiData);
      updateMarkers(poiData); // 更新地图标记/聚合
      fitMapToPOIs(poiData); // 调整地图视野
      message.success(`查询到 ${poiData.length} 个景区。`);

    } catch (error) {
      console.error('POI搜索失败:', error);
      message.error(error.response?.data?.message || '搜索失败，请稍后重试。');
    } finally {
      setLoading(false);
    }
  };

  // ---- 地图绘制与交互 ----
  
  // 开始绘制矩形
  const startDrawRectangle = () => {
      if (!drawTool) return;
      clearDrawings();
      setSearchParams(prev => ({ ...prev, searchType: 'bbox' }));
      drawTool.rectangle({
          strokeColor: "#FF33FF", 
          strokeOpacity: 1,
          strokeWeight: 2,
          fillColor: "#FFAA00", 
          fillOpacity: 0.3
      });
      message.info('请在地图上拖拽绘制矩形搜索区域。');
  };
  
  // 开始绘制圆形
  const startDrawCircle = () => {
      if (!drawTool) return;
      clearDrawings();
      setSearchParams(prev => ({ ...prev, searchType: 'radius' }));
      drawTool.circle({
          strokeColor: "#0000FF",
          strokeOpacity: 1,
          strokeWeight: 2,
          fillColor: "#0000FF",
          fillOpacity: 0.3
      });
       message.info('请在地图上点击并拖拽绘制圆形搜索区域。');
  };

  // 处理绘制完成
  const handleDrawComplete = (event) => {
      if (!drawTool) return;
      setLoading(true);
      drawTool.close(); // 结束绘制状态
      const drawnOverlay = event.obj; // 获取绘制的图形
      setCurrentSearchArea(drawnOverlay);
      // 可以在这里直接触发搜索，或者让用户点击搜索按钮
      executeSearch(); // 绘制完成后立即搜索
      setLoading(false);
  };
  
  // 清除地图上的绘制图形
  const clearDrawings = () => {
      if (currentSearchArea) {
          map?.remove(currentSearchArea);
          setCurrentSearchArea(null);
      }
       // 如果绘制工具处于活动状态，也关闭它
      drawTool?.close(false); // false表示不清除已绘制的图形，但上面已经清除了
  };
  
  // ---- 地图标记 ----

  // 更新地图上的标记（普通或聚合）
  const updateMarkers = (poiData) => {
      if (!map || !AMapInstance) return;
      
      // 清除旧标记/聚合数据
      map.clearMap(); // 更彻底的清除方式
      markerCluster?.clearMarkers();

      if (!poiData || poiData.length === 0) return;

      const markers = poiData.map(createMarker);
      
      if (isClusteringEnabled && markerCluster) {
          markerCluster.setMarkers(markers);
      } else {
          map.add(markers); // 直接添加普通标记
      }
  };
  
  // 创建单个标记
  const createMarker = (poi) => {
      if (!poi || !poi.location?.coordinates) {
          console.warn("无效的POI数据，无法创建标记:", poi);
          return null;
      }
      const position = [poi.location.coordinates[0], poi.location.coordinates[1]];
      const markerColor = getLevelColor(poi.level);

      const marker = new AMapInstance.Marker({
          position,
          title: poi.name,
          content: `<div class="poi-marker" style="background-color: ${markerColor}"><span>${getScenicLevelLabel(poi.level)}</span></div>`,
          offset: new AMapInstance.Pixel(-15, -30),
          extData: poi // 将POI数据附加到标记上
      });

      // 点击标记显示信息窗体
      marker.on('click', (e) => {
          const clickedPoi = e.target.getExtData();
          const infoContent = `
            <div class="poi-info" style="min-width: 250px;">
              <h4>${clickedPoi.name} (${getScenicLevelLabel(clickedPoi.level)})</h4>
              <p>省份: ${clickedPoi.province}</p>
              ${clickedPoi.description ? `<p>描述: ${clickedPoi.description}</p>` : ''}
              ${clickedPoi.websiteUrl ? `<p><a href="${clickedPoi.websiteUrl}" target="_blank">官方网站</a></p>` : ''}
              ${clickedPoi.imageUrl ? `<img src="${clickedPoi.imageUrl}" alt="${clickedPoi.name}" style="max-width:200px; margin-top: 5px;" />` : ''}
            </div>`;
          infoWindowRef.current.setContent(infoContent);
          infoWindowRef.current.open(map, e.target.getPosition());
      });

      return marker;
  };

  // 调整地图视野以适应所有POI
  const fitMapToPOIs = (poiData) => {
    if (!map || !poiData || poiData.length === 0) return;
    map.setFitView(null, false, [60, 60, 60, 60]); // 添加边距
  };

  // --- 辅助函数 ---
  const getLevelColor = (level) => {
      // ... (与之前相同)
    switch (level) {
      case 'A5': return '#FF4500'; // 5A - Orange red
      case 'A4': return '#4169E1'; // 4A - Royal blue
      case 'A3': return '#32CD32'; // 3A - Lime green
      case 'A2': return '#9932CC'; // 2A - Purple
      case 'A1': return '#FFD700'; // 1A - Gold
      default: return '#808080'; // Grey for unknown
    }
  };
  const getScenicLevelLabel = (level) => {
      // ... (与之前相同)
    switch (level) {
      case 'A5': return '5A';
      case 'A4': return '4A';
      case 'A3': return '3A';
      case 'A2': return '2A';
      case 'A1': return '1A';
      default: return level;
    }
  };

  // --- 渲染 --- 
  return (
    <div style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      <Card title="A级景区地图查询与交互" style={{ marginBottom: '10px' }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6} lg={5}>
            <Input 
              placeholder="搜索景区名称" 
              value={searchParams.name}
              onChange={(e) => handleParamChange('name', e.target.value)}
              prefix={<SearchOutlined />}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={6} lg={4}>
            <Select
              placeholder="选择省份"
              style={{ width: '100%' }}
              onChange={value => handleParamChange('province', value)}
              value={searchParams.province}
              allowClear
              showSearch // 允许搜索省份
              filterOption={(input, option) => 
                 option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
            >
              {provinces.map(province => (
                <Select.Option key={province} value={province}>{province}</Select.Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6} lg={3}>
            <Select
              placeholder="景区级别"
              style={{ width: '100%' }}
              onChange={value => handleParamChange('level', value)}
              value={searchParams.level}
              allowClear
            >
              <Select.Option value="5">5A</Select.Option>
              <Select.Option value="4">4A</Select.Option>
              <Select.Option value="3">3A</Select.Option>
              <Select.Option value="2">2A</Select.Option>
              <Select.Option value="1">1A</Select.Option>
            </Select>
          </Col>
          {/* 移除了半径滑块，因为现在通过地图绘制实现 */}
          <Col xs={24} sm={12} md={6} lg={12} style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
             <Tooltip title="按文本条件搜索">
                <Button 
                  type={searchParams.searchType === 'text' ? "primary" : "default"}
                  icon={<SearchOutlined />} 
                  onClick={executeSearch} 
                  loading={loading && searchParams.searchType === 'text'}
                 >文本搜索</Button>
             </Tooltip>
             <Tooltip title="绘制矩形区域搜索">
                <Button 
                  icon={<BorderOutlined />} 
                  onClick={startDrawRectangle}
                  disabled={!map || loading}
                >拉框搜索</Button>
             </Tooltip>
             <Tooltip title="绘制圆形区域搜索">
                <Button 
                  icon={<AimOutlined />} 
                  onClick={startDrawCircle}
                  disabled={!map || loading}
                 >半径搜索</Button>
            </Tooltip>
            <Tooltip title="清除搜索条件与结果">
                <Button 
                 icon={<ClearOutlined />} 
                 onClick={clearSearch}
                 danger
                >清除</Button>
            </Tooltip>
            <Tooltip title="重置地图视野">
                <Button 
                  icon={<EnvironmentOutlined />} 
                  onClick={() => map?.setZoomAndCenter(INITIAL_ZOOM, INITIAL_CENTER)}
                  disabled={!map}
                >重置视野</Button>
            </Tooltip>
             <Tooltip title="启用/禁用点聚合">
                  <Switch 
                      checkedChildren="聚合开" 
                      unCheckedChildren="聚合关" 
                      checked={isClusteringEnabled} 
                      onChange={setIsClusteringEnabled} 
                      style={{ marginLeft: '10px' }}
                  />
             </Tooltip>
          </Col>
        </Row>
      </Card>
      
      <div style={{ flex: 1, position: 'relative' }}>
        <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
        {(loading || (!map && !AMapInstance)) && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(255,255,255,0.7)', display: 'flex',
            justifyContent: 'center', alignItems: 'center', zIndex: 10
          }}>
            <Spin size="large" tip={!map && !AMapInstance ? "正在加载地图资源..." : "正在查询数据..."} />
          </div>
        )}
      </div>
      
      <style jsx="true">{`
        .poi-marker {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          text-align: center;
          line-height: 28px;
          color: white;
          font-size: 12px;
          font-weight: bold;
          box-shadow: 0 2px 5px rgba(0,0,0,0.4);
          border: 1px solid rgba(255, 255, 255, 0.5);
        }
        .poi-info h4 {
            margin-bottom: 5px;
            font-size: 16px;
        }
        .poi-info p {
            margin: 3px 0;
            font-size: 13px;
            color: #333;
        }
      `}</style>
    </div>
  );
};

export default POIMap; 