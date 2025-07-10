<template>
  <div ref="mapContainerRef" style="width: 100%; height: 100%"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import AMapLoader from '@amap/amap-jsapi-loader';
import { ElMessage } from 'element-plus';

interface Poi {
  F1: string;
  name: string;
  region: string;
  level: string;
  longitude: number;
  latitude: number;
  address?: string;
}

const emit = defineEmits(['box-select-finished', 'point-select-finished', 'map-ready', 'map-bounds-change']);

const mapContainerRef = ref<HTMLDivElement | null>(null);
const mapReady = ref(false);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AMapInstance = ref<any>(null); // Stores the loaded AMap API object
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const map = ref<any>(null); // Stores the AMap.Map instance
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mouseTool: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let currentMarkers: any[] = [];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let currentDrawnOverlay: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let drawEventHandlerFunction: ((event: any) => void) | null = null; // Renamed to avoid conflict

const clearMap = () => {
  if (map.value) {
    if (currentMarkers.length > 0) {
      map.value.remove(currentMarkers);
      currentMarkers = [];
    }
    if (currentDrawnOverlay) {
      map.value.remove(currentDrawnOverlay);
      currentDrawnOverlay = null;
    }
    console.log('[MapContainer] clearMap: Overlays cleared.');
  } else {
    console.warn('[MapContainer] clearMap: Map instance not ready.');
  }
};

const renderMarkers = (poiList: Poi[]) => {
  console.log(`[MapContainer] renderMarkers: Called with ${poiList ? poiList.length : 0} POIs.`);

  if (map.value && currentMarkers.length > 0) {
    map.value.remove(currentMarkers);
    currentMarkers = [];
  }

  if (!mapReady.value || !AMapInstance.value || !map.value) {
    console.error('[MapContainer] renderMarkers: Map or AMap API not truly ready! mapReady.value:', mapReady.value);
    ElMessage.error('地图服务尚未完全加载，无法渲染标记点。');
    return;
  }

  if (!poiList || poiList.length === 0) {
    console.log('[MapContainer] renderMarkers: poiList is empty, no new markers to render.');
    return;
  }

  const CurrentAMap = AMapInstance.value; // Use the stored AMap API object
  const currentMapInstance = map.value; // Use the stored map instance
  let problematicPoisCount = 0;
  const newMarkersBatch: any[] = [];

  for (let i = 0; i < poiList.length; i++) {
    const poi = poiList[i];
    let position: any = null;

    if (
      poi &&
      typeof poi.longitude === 'number' && !isNaN(poi.longitude) &&
      typeof poi.latitude === 'number' && !isNaN(poi.latitude) &&
      poi.longitude >= -180 && poi.longitude <= 180 &&
      poi.latitude >= -90 && poi.latitude <= 90
    ) {
      try {
        position = new CurrentAMap.LngLat(poi.longitude, poi.latitude);
        if (isNaN(position.getLng()) || isNaN(position.getLat())) {
          console.warn(`[MapContainer] POI ID ${poi.F1} ("${poi.name}") LngLat resulted in NaN. Raw: [${poi.longitude}, ${poi.latitude}]. Skipping.`);
          problematicPoisCount++;
          continue;
        }
        const markerInstance = new CurrentAMap.Marker({ position, title: poi.name });
        newMarkersBatch.push(markerInstance);
      } catch (e: any) {
        console.error(`[MapContainer] Error creating LngLat/Marker for POI ID ${poi.F1} ("${poi.name}"):`, e.message, poi);
        problematicPoisCount++;
      }
    } else {
      console.warn(`[MapContainer] Invalid/out-of-range coords for POI ID ${poi?.F1} ("${poi?.name}"). Skipping.`);
      problematicPoisCount++;
    }
  }

  if (newMarkersBatch.length > 0) {
    try {
      currentMapInstance.add(newMarkersBatch);
      currentMarkers = newMarkersBatch;
      console.log(`[MapContainer] ${newMarkersBatch.length} markers successfully added.`);
      // ** crucial: Ensure map view fits the new markers **

    } catch (e: any) {
      console.error('[MapContainer] Error during map.add(newMarkersBatch):', e.message);
      currentMarkers = [];
    }
  } else {
    console.log('[MapContainer] No valid new markers to add to the map.');
  }

  if (problematicPoisCount > 0) {
    ElMessage.warning(`${problematicPoisCount} 个POI点因数据无效或API错误未能渲染。`);
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let boundsChangeTimeoutId: any = null;
const handleMapStateChange = () => {
  if (!map.value || !mapReady.value) return;
  if (boundsChangeTimeoutId) window.clearTimeout(boundsChangeTimeoutId);

  boundsChangeTimeoutId = window.setTimeout(() => {
    const currentMapBounds = map.value.getBounds();
    if (currentMapBounds) {
      const sw = currentMapBounds.getSouthWest();
      const ne = currentMapBounds.getNorthEast();
      const boundsPayload = {
        minLng: sw.getLng(), minLat: sw.getLat(),
        maxLng: ne.getLng(), maxLat: ne.getLat(),
      };
      emit('map-bounds-change', boundsPayload);
    }
  }, 800);
};

const initializeMouseTool = () => {
  if (map.value && AMapInstance.value) { // Ensure AMapInstance.value is also ready
    if (!mouseTool) {
      mouseTool = new AMapInstance.value.MouseTool(map.value);
      console.log('[MapContainer] MouseTool instance created.');
    }

    // MINIMAL CHANGE for single listener: remove old before adding new
    if (drawEventHandlerFunction && mouseTool) {
      mouseTool.off('draw', drawEventHandlerFunction);
    }

   drawEventHandlerFunction = (event: any) => {
      const obj = event.obj;
      // 日志A: 确认事件对象和绘制的类型
      console.log('[MapContainer] DRAW EVENT HANDLER: event.obj received. ClassName:', obj.CLASS_NAME, 'Object:', obj);

      if (currentDrawnOverlay && map.value) {
        map.value.remove(currentDrawnOverlay);
      }
      currentDrawnOverlay = obj;

      if (obj.CLASS_NAME === 'Overlay.Rectangle') {
        // 日志B: 确认进入了矩形处理逻辑
        console.log('[MapContainer] DRAW EVENT HANDLER: Detected AMap.Rectangle.');
        const bounds = obj.getBounds();

        if (bounds) {
          // 日志C: 确认获取到了 bounds 对象
          console.log('[MapContainer] DRAW EVENT HANDLER: Bounds object obtained:', bounds);
          emit('box-select-finished', bounds);
          // 日志D: 确认 emit 被调用
          console.log('[MapContainer] DRAW EVENT HANDLER: "box-select-finished" event emitted.');
        } else {
          console.error('[MapContainer] DRAW EVENT HANDLER: Failed to getBounds() from rectangle object.');
        }
      } else {
        console.warn('[MapContainer] DRAW EVENT HANDLER: Drawn object is not a Rectangle. ClassName:', obj.CLASS_NAME);
      }

      mouseTool.close(false);
      console.log('[MapContainer] DRAW EVENT HANDLER: MouseTool closed (overlay kept).');
    };

    mouseTool.on('draw', drawEventHandlerFunction);
    console.log('[MapContainer] MouseTool "draw" event handler attached.');
  } else {
    console.error("[MapContainer] Cannot initialize MouseTool: map or AMapInstance not ready.");
  }
};

const startBoxSelect = () => {
  if (!mapReady.value || !AMapInstance.value || !map.value ) { // Added AMapInstance check
    ElMessage.error('地图或鼠标工具尚未初始化完成！'); return;
  }
  // Per your code, clearMap is called by parent. Here we clear just the drawn overlay.
  if (currentDrawnOverlay && map.value) {
      map.value.remove(currentDrawnOverlay);
      currentDrawnOverlay = null;
  }

  initializeMouseTool(); // Ensure tool and listener are ready

  if (mouseTool) {
    console.log('[MapContainer] Activating box select.');
    mouseTool.rectangle({ strokeColor: '#0099FF', fillColor: '#0099FF', fillOpacity: 0.1 });
  } else {
     ElMessage.error('鼠标工具未能初始化，无法拉框！');
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pointSelectClickListener: ((e: any) => void) | null = null;
const startPointSelect = () => {
  if (!mapReady.value || !map.value || !AMapInstance.value) {
    ElMessage.error('地图尚未初始化完成！'); return;
  }
   if (currentDrawnOverlay && map.value) {
      map.value.remove(currentDrawnOverlay);
      currentDrawnOverlay = null;
  }
  console.log('[MapContainer] Activating point select.');
  ElMessage.info('请在地图上点击一个点。');

  if (pointSelectClickListener && map.value) map.value.off('click', pointSelectClickListener);

  pointSelectClickListener = (e: any) => {
    console.log('MapContainer: Point selected at:', e.lnglat);
    emit('point-select-finished', e.lnglat);

    if (map.value && AMapInstance.value) { // Added AMapInstance check
        const tempMarker = new AMapInstance.value.Marker({position: e.lnglat});
        map.value.add(tempMarker);
        if(currentDrawnOverlay) map.value.remove(currentDrawnOverlay);
        currentDrawnOverlay = tempMarker;
    }

    if (map.value && pointSelectClickListener) {
      map.value.off('click', pointSelectClickListener);
      pointSelectClickListener = null;
    }
  };
  map.value.on('click', pointSelectClickListener);
};

defineExpose({
  startBoxSelect,
  startPointSelect,
  renderMarkers,
  clearMap,
  fitMapViewToMarkers: (markersToFit?: any[]) => {
    if (map.value && mapReady.value) {
      const targetMarkers = markersToFit && markersToFit.length > 0 ? markersToFit : currentMarkers;
      if (targetMarkers.length > 0) {
        map.value.setFitView(targetMarkers.length === 1 ? targetMarkers[0] : targetMarkers, false, [120,120,120,120], 16);
      }
    }
  }
});

onMounted(async () => {
  console.log('[MapContainer] onMounted');
  try {
    // Ensure all AMap classes used are in plugins
    const LoadedAMap = await AMapLoader.load({
      key: import.meta.env.VITE_AMAP_KEY, version: '2.0',
      plugins: ['AMap.MouseTool', 'AMap.ToolBar', 'AMap.Scale', 'AMap.LngLat', 'AMap.Marker', 'AMap.Bounds'],
    });
    AMapInstance.value = LoadedAMap; // Store the AMap object
    // window.AMap = LoadedAMap; // Keep if other non-module scripts might use it

    if (mapContainerRef.value) {
      map.value = new LoadedAMap.Map(mapContainerRef.value, {
        viewMode: '3D', zoom: 10, center: [116.397428, 39.90923],
      });
      map.value.on('complete', () => {
        console.log('[MapContainer] Map "complete" event.');
        initializeMouseTool();
        mapReady.value = true;
        emit('map-ready');
        handleMapStateChange();
      });
      map.value.addControl(new LoadedAMap.ToolBar());
      map.value.addControl(new LoadedAMap.Scale());
      map.value.on('moveend', handleMapStateChange);
      map.value.on('zoomend', handleMapStateChange);
    }
  } catch (e) { console.error('[MapContainer] AMap load error:', e); ElMessage.error('地图加载失败'); }
});

onUnmounted(() => {
  console.log('[MapContainer] onUnmounted');
  if (boundsChangeTimeoutId) window.clearTimeout(boundsChangeTimeoutId);
  if (map.value) {
    map.value.off('moveend', handleMapStateChange);
    map.value.off('zoomend', handleMapStateChange);
    if (pointSelectClickListener) map.value.off('click', pointSelectClickListener);
    // It's good practice to remove specific listeners before destroying
    if (mouseTool && drawEventHandlerFunction) mouseTool.off('draw', drawEventHandlerFunction);

    map.value.destroy(); map.value = null;
  }
  mouseTool = null; // Also nullify mouseTool
  AMapInstance.value = null; mapReady.value = false; currentMarkers = [];
});
</script>
