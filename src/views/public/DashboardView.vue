<template>
  <div class="dashboard-page">
    <el-card class="control-panel">
      <template #header><div class="panel-header">地图交互操作</div></template>
      <div class="control-items-wrapper">
        <div class="control-item">
          <el-button type="primary" @click="activateBoxSelect" :disabled="!isMapActuallyReady || loading">
            <el-icon style="margin-right: 4px;"><Crop /></el-icon>拉框查询
          </el-button>
        </div>
        <div class="control-item radius-query">
          <el-button type="primary" @click="activatePointSelect" :disabled="!isMapActuallyReady || loading">
            <el-icon style="margin-right: 4px;"><Aim /></el-icon>半径查询
          </el-button>
          <el-input-number v-model="radius" :min="100" :max="50000" :step="100" controls-position="right" style="width: 120px;" />
          <span>米</span>
        </div>
        <div class="control-item" v-if="loading">
          <el-icon class="is-loading" style="margin-right: 4px;"><Loading /></el-icon>
          <el-text type="primary">查询中...</el-text>
        </div>
      </div>
    </el-card>

    <div class="main-content">
      <div class="map-wrapper" :style="{ width: showResultsPanel && totalPoiList.length > 0 ? '65%' : '100%' }">
        <MapContainer
          ref="mapContainerRef"
          @box-select-finished="handleBoxSelectFinished"
          @point-select-finished="handlePointSelectFinished"
          @map-ready="handleMapReady"
          @map-bounds-change="handleMapBoundsChange"
        />
      </div>

      <el-card class="results-panel" v-if="showResultsPanel && totalPoiList.length > 0 && !loading">
        <template #header>
          <div class="results-header">
            <span>查询结果 (共 {{ totalPoiList.length }} 条)</span>
            <el-button type="danger" link @click="closeResultsPanel">关闭</el-button>
          </div>
        </template>
        <div class="results-body">
          <el-scrollbar>
            <ul class="poi-list">
              <li v-for="poi in paginatedPoiList" :key="poi.F1" class="poi-item">
                <div class="poi-name">{{ poi.name }}</div>
                <div class="poi-detail">地区: {{ poi.region }}</div>
                <div class="poi-detail">等级: {{ poi.level }}</div>
                <div class="poi-detail" v-if="poi.address">地址: {{ poi.address }}</div>
              </li>
            </ul>
          </el-scrollbar>
        </div>
        <div class="pagination-container" v-if="totalPoiList.length > pageSize">
          <el-pagination background small layout="prev, pager, next"
            :total="totalPoiList.length" :page-size="pageSize"
            :current-page="currentPage" @current-change="handlePageChange"
          />
        </div>
      </el-card>

      <el-card class="results-panel" v-if="showResultsPanel && totalPoiList.length === 0 && !loading">
         <template #header>
          <div class="results-header"><span>查询结果</span><el-button type="danger" link @click="closeResultsPanel">关闭</el-button></div>
        </template>
        <el-empty description="当前视野或查询条件下未找到相关POI数据" />
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import MapContainer from '@/components/MapContainer.vue';
import { ElMessage } from 'element-plus';
import { Crop, Aim, Loading } from '@element-plus/icons-vue';
import { getPoisInBounds, searchPoisByBox, searchPoisByRadius } from '@/api/poi';
import type { BackendPoi } from '@/api/poi';

interface FrontendPoi {
  F1: string; name: string; region: string; level: string;
  longitude: number; latitude: number; address?: string;
}

const mapContainerRef = ref<InstanceType<typeof MapContainer> | null>(null);
const isMapActuallyReady = ref(false);

const radius = ref(1000);
const loading = ref(false);
const showResultsPanel = ref(false);

const totalPoiList = ref<FrontendPoi[]>([]);
const currentPage = ref(1);
const pageSize = ref(5);

const paginatedPoiList = computed(() => {
  // 计算起始索引
  // 例如：第1页: (1 - 1) * 10 = 0
  //       第2页: (2 - 1) * 10 = 10
  const start = (currentPage.value - 1) * pageSize.value;

  // 计算结束索引
  // 例如：第1页: 0 + 10 = 10
  //       第2页: 10 + 10 = 20
  const end = start + pageSize.value;

  // 使用 Array.prototype.slice() 从总列表中提取当前页的数据
  // slice(start, end) 提取从 start 索引开始，到 end 索引之前（不包括 end）的元素
  return totalPoiList.value.slice(start, end);
});


const processAndRenderPois = (poiDataFromApi: BackendPoi[] | null, fitViewAfterQuery = false) => {
  console.log('DashboardView: processAndRenderPois - 原始数据:', poiDataFromApi ? poiDataFromApi.length : 'null/undefined', '条');
  if (!mapContainerRef.value) { console.error("DashboardView: mapContainerRef 为空!"); return; }

  if (poiDataFromApi && Array.isArray(poiDataFromApi)) {
    const validPoisForMapping: BackendPoi[] = []; /* ...过滤逻辑不变... */
    poiDataFromApi.forEach((bp) => {
      const coords = bp.geometry?.coordinates;
      if (bp && coords && Array.isArray(coords) && coords.length >= 2 && typeof coords[0] === 'number' && !isNaN(coords[0]) && typeof coords[1] === 'number' && !isNaN(coords[1]) && coords[0] >= -180 && coords[0] <= 180 && coords[1] >= -90 && coords[1] <= 90) {
        validPoisForMapping.push(bp);
      }
    });

    const mappedResults: FrontendPoi[] = validPoisForMapping.map(bp => ({
      F1: bp._id, name: bp.name, region: bp.province || '未知', level: bp.grade || '未知',
      longitude: bp.geometry.coordinates[0], latitude: bp.geometry.coordinates[1],
      address: `${bp.province || ''} ${bp.name}`,
    }));

    totalPoiList.value = mappedResults;
    mapContainerRef.value.renderMarkers(totalPoiList.value);
    if (totalPoiList.value.length > 0 && fitViewAfterQuery) {
      setTimeout(() => mapContainerRef.value?.fitMapViewToMarkers(), 100);
    }
  } else {
    totalPoiList.value = [];
    mapContainerRef.value.clearMap();
  }
};

// 由 MapContainer 的 map-bounds-change 事件触发
const handleMapBoundsChange = async (bounds: { minLng: number; minLat: number; maxLng: number; maxLat: number }) => {
  if (!isMapActuallyReady.value) return;
  console.log('DashboardView: 地图边界改变，请求新数据。边界:', bounds);
  loading.value = true;
  try {
    const poisInBounds = await getPoisInBounds(bounds);
    processAndRenderPois(poisInBounds, false); // 视野变化不主动fitView
    // showResultsPanel.value = totalPoiList.value.length > 0; // 按视野加载时，不主动打开结果面板
  } catch (error: any) { /* ... */ }
  finally { loading.value = false; }
};

// 处理用户主动的拉框/半径查询
const executeQuery = async (queryType: 'box' | 'radius', queryParams: any) => {
  if (!isMapActuallyReady.value) { ElMessage.warning('地图尚未准备好'); return; }

  mapContainerRef.value?.clearMap(); // 执行新查询前，清除地图上的旧标记和拉框

  loading.value = true;
  showResultsPanel.value = true;
  currentPage.value = 1;
  console.log(`[DashboardView] executeQuery: Type=${queryType}, Params=`, queryParams);
  try {
    let backendResponseData: BackendPoi[];
    if (queryType === 'box') {
      backendResponseData = await getPoisInBounds({ // 拉框查询复用 getPoisInBounds
        minLng: queryParams.sw.lng, minLat: queryParams.sw.lat,
        maxLng: queryParams.ne.lng, maxLat: queryParams.ne.lat,
      });
    } else if (queryType === 'radius') {
      backendResponseData = await searchPoisByRadius({
        lng: queryParams.center.lng, lat: queryParams.center.lat,
        radius: radius.value,
      });
    } else { console.error('未知查询类型'); loading.value = false; return; }

    processAndRenderPois(backendResponseData, true); // 主动查询后，进行 fitView

    if (totalPoiList.value.length === 0 && !loading.value) {
      ElMessage.info('在您选择的区域未查询到相关POI数据。');
    } else if (totalPoiList.value.length > 0 && !loading.value) {
      ElMessage.success(`查询到 ${totalPoiList.value.length} 条POI数据。`);
    }
  } catch (error: any) { /* ... */ }
  finally { loading.value = false; }
};

const handleMapReady = () => {
  console.log('DashboardView: MapContainer 发出了 map-ready 事件！');
  isMapActuallyReady.value = true;
  // 初始加载将由 MapContainer 首次触发 map-bounds-change 自动进行
};

onMounted(() => { console.log('DashboardView: 组件已挂载。等待地图就绪...'); });

const activateBoxSelect = () => {
  if (!isMapActuallyReady.value) { ElMessage.warning('地图未就绪'); return; }
  mapContainerRef.value?.clearMap(); // 清除旧结果，准备拉框
  mapContainerRef.value?.startBoxSelect();
};
const activatePointSelect = () => {
  if (!isMapActuallyReady.value) { ElMessage.warning('地图未就绪'); return; }
  mapContainerRef.value?.clearMap(); // 清除旧结果，准备点选
  mapContainerRef.value?.startPointSelect();
};

const handleBoxSelectFinished = (bounds: any) => {
  console.log('[DashboardView] "box-select-finished" event received. Bounds SW:', bounds.getSouthWest(), 'NE:', bounds.getNorthEast());
  executeQuery('box', {
    sw: { lng: bounds.getSouthWest().lng, lat: bounds.getSouthWest().lat },
    ne: { lng: bounds.getNorthEast().lng, lat: bounds.getNorthEast().lat }
  });
};
const handlePointSelectFinished = (lnglat: any) => {
  executeQuery('radius', {
    center: { lng: lnglat.lng, lat: lnglat.lat },
  });
};
const handlePageChange = (page: number) => { currentPage.value = page; };
const closeResultsPanel = () => {
  showResultsPanel.value = false;
  // 可选：关闭面板时是否清除地图上的点
  // mapContainerRef.value?.clearMap();
  // totalPoiList.value = [];
};
</script>

<style scoped>
.dashboard-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  box-sizing: border-box;
  padding: 20px;
  overflow: hidden;
}

.control-panel {
  flex-shrink: 0;
  margin-bottom: 15px;
  z-index: 10;
}
:deep(.control-panel .el-card__body) {
  display: flex;
  align-items: center;
  gap: 15px;
  flex-wrap: wrap;
}
.control-item {
  display: flex;
  align-items: center;
}
.radius-query {
  gap: 8px;
}
.radius-query .el-input-number {
    width: 100px;
}

.main-content {
  flex-grow: 1;
  display: flex;
  gap: 15px;
  overflow: hidden;
}

.map-wrapper {
  flex-grow: 1;
  height: 100%;
  transition: width 0.3s ease-in-out;
  border: 1px solid #dcdfe6;
  box-sizing: border-box;
}

.results-panel {
  width: 35%;
  min-width: 380px;
  max-width: 500px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
  border: 1px solid #dcdfe6;
  box-sizing: border-box;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.results-body {
  flex-grow: 1;
  overflow-y: hidden;
}
.results-body .el-scrollbar {
    height: 100%;
}

.poi-list { list-style: none; padding: 0; margin: 0; }
.poi-item { padding: 8px 10px; border-bottom: 1px solid #f0f0f0; }
.poi-item:hover { background-color: #f9f9f9; }
.poi-name { font-weight: bold; margin-bottom: 4px; font-size: 14px; }
.poi-detail { font-size: 12px; color: #606266; line-height: 1.5; }

.pagination-container {
  display: flex;
  justify-content: center;
  padding-top: 10px;
  border-top: 1px solid #f0f0f0;
  flex-shrink: 0;
}
</style>
