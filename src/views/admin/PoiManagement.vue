<template>
  <div>
    <el-card>
      <template #header>
        <div class="card-header">
          <span>POI 数据列表</span>
          <el-button type="primary" :icon="Plus" @click="handleOpenAddDialog">新增 POI</el-button>
        </div>
      </template>

      <el-form :inline="true" :model="searchForm" @submit.prevent="handleSearch">
        <el-form-item label="名称">
          <el-input v-model="searchForm.name" placeholder="按名称查询"></el-input>
        </el-form-item>
        <el-form-item label="省份">
          <el-input v-model="searchForm.province" placeholder="按省份查询"></el-input>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" native-type="submit">查询</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="paginatedTableData" stripe style="width: 100%" v-loading="loading">
        <el-table-column prop="F1" label="ID" width="80" />
        <el-table-column prop="name" label="景区名称" />
        <el-table-column prop="region" label="地区" />
        <el-table-column prop="level" label="景区等级" />
        <el-table-column prop="longitude" label="经度" />
        <el-table-column prop="latitude" label="纬度" />
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click="handleOpenEditDialog(row)"
              >编辑</el-button
            >
            <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-container" v-if="tableData.length > 0">
        <el-pagination
          background
          layout="prev, pager, next, total"
          :total="tableData.length"
          :page-size="adminPageSize"
          :current-page="adminCurrentPage"
          @current-change="handleAdminPageChange"
        />
      </div>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="600px" @close="resetForm">
      <el-form ref="poiFormRef" :model="poiForm" :rules="poiFormRules" label-width="120px">
        <el-form-item label="景区名称" prop="name">
          <el-input v-model="poiForm.name" />
        </el-form-item>
        <el-form-item label="地区" prop="region">
          <el-input v-model="poiForm.region" />
        </el-form-item>
        <el-form-item label="景区等级" prop="level">
          <el-input v-model="poiForm.level" />
        </el-form-item>
        <el-form-item label="经度" prop="longitude">
          <el-input v-model.number="poiForm.longitude" type="number" />
        </el-form-item>
        <el-form-item label="纬度" prop="latitude">
          <el-input v-model.number="poiForm.latitude" type="number" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取 消</el-button>
        <el-button type="primary" @click="handleSubmitForm">确 定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
// src/views/admin/PoiManagement.vue

import { ref, onMounted, reactive, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { FormInstance, FormItemRule } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
// 导入精确的 BackendPoi 和新的 PoiDataForMutation 接口
import { getPoiListAdmin, addPoiAdmin, updatePoiAdmin, deletePoiAdmin } from '@/api/poi';
import type { BackendPoi, PoiDataForMutation } from '@/api/poi';

// 1. 定义后端返回的单个 POI 对象结构 (原始结构)
interface BackendPoiAdmin {
  _id: string;
  name: string;
  province: string; // 后端是 province
  grade: string;    // 后端是 grade
  geometry: {
    type: string;
    coordinates: [number, number]; // [经度, 纬度]
  };
  // 根据实际情况添加后端可能返回的其他字段
}

// 前端表格和表单使用的结构
interface PoiItem {
  F1: string; // 对应 _id
  name: string;
  region: string; // 对应 province
  level: string;  // 对应 grade
  longitude: number | null;
  latitude: number | null;
}

// 为新增/编辑表单定义一个可能不包含 F1 的类型
type PoiFormData = Omit<PoiItem, 'F1'> & { F1?: string | null };


const loading = ref(false);
const tableData = ref<PoiItem[]>([]); // 表格数据使用转换后的 PoiItem 结构
const searchForm = reactive({ name: '', province: '' });

// --- Admin Table Pagination --- (这部分保持不变)
const adminCurrentPage = ref(1);
const adminPageSize = ref(10);
const paginatedTableData = computed(() => {
  const start = (adminCurrentPage.value - 1) * adminPageSize.value;
  const end = start + adminPageSize.value;
  return tableData.value.slice(start, end);
});
const handleAdminPageChange = (page: number) => {
  adminCurrentPage.value = page;
};

// --- Dialog and Form State --- (poiForm 也应使用 PoiItem 结构)
const dialogVisible = ref(false);
const dialogTitle = ref('');
const poiFormRef = ref<FormInstance | null>(null);
const poiForm = reactive<PoiItem>({ // 表单数据也使用转换后的 PoiItem 结构
  F1: null,
  name: '',
  region: '',
  level: '',
  longitude: null, // 注意：这里需要确保 number 或 null
  latitude: null,  // 注意：这里需要确保 number 或 null
});

// 表单验证规则，键名应与 poiForm 中的字段匹配
const poiFormRules: Partial<Record<keyof Omit<PoiItem, 'F1' | 'address'>, FormItemRule[]>> = {
  name: [{ required: true, message: '请输入景区名称', trigger: 'blur' }],
  region: [{ required: true, message: '请输入地区', trigger: 'blur' }],
  level: [{ required: true, message: '请输入景区等级', trigger: 'blur' }],
  longitude: [
    { required: true, message: '请输入经度', trigger: 'blur' },
    { type: 'number' as const, message: '经度必须为数字' },
  ],
  latitude: [
    { required: true, message: '请输入纬度', trigger: 'blur' },
    { type: 'number' as const, message: '纬度必须为数字' },
  ],
};

// --- API 调用封装 ---
// fetchPoiListForAdmin 函数 (数据映射部分保持不变，确保与 BackendPoi 接口精确对应)
const fetchPoiListForAdmin = async () => {
  loading.value = true;
  try {
    const backendResponseData: BackendPoi[] = await getPoiListAdmin(searchForm);
    if (backendResponseData && Array.isArray(backendResponseData)) {
      const mappedData: PoiItem[] = backendResponseData.map(bp => {
        const coords = bp.geometry?.coordinates; // 确认后端是 geometry
        return {
          F1: bp._id,
          name: bp.name,
          region: bp.province || '未知地区',
          level: bp.grade || '未定级',
          longitude: coords && typeof coords[0] === 'number' ? coords[0] : null,
          latitude: coords && typeof coords[1] === 'number' ? coords[1] : null,
        };
      });
      tableData.value = mappedData;
      adminCurrentPage.value = 1;
    } else {
      tableData.value = [];
    }
  } catch (e: unknown) {
    ElMessage.error(`获取列表失败: ${(e as Error).message || '未知错误'}`);
    tableData.value = [];
  }
  finally { loading.value = false; }
};


// --- Event Handlers --- (onMounted, handleSearch 保持不变)
onMounted(() => {
  fetchPoiListForAdmin();
});

const handleSearch = () => {
  fetchPoiListForAdmin();
};

const resetForm = () => {
  poiForm.F1 = null;
  poiForm.name = '';
  poiForm.region = '';
  poiForm.level = '';
  poiForm.longitude = null;
  poiForm.latitude = null;
  poiFormRef.value?.clearValidate();
};

const handleOpenAddDialog = () => {
  resetForm();
  dialogTitle.value = '新增 POI';
  dialogVisible.value = true;
};

const handleOpenEditDialog = (row: PoiItem) => {
  resetForm();
  // row 已经是转换后的 PoiItem 格式，可以直接赋值
  Object.assign(poiForm, row);
  dialogTitle.value = '编辑 POI';
  dialogVisible.value = true;
};

const handleSubmitForm = async () => {
  if (!poiFormRef.value) return;
  await poiFormRef.value.validate(async (valid: boolean) => {
    if (valid) {
      try {
        // 1. 检查经纬度是否有效 (基本检查)
        if (poiForm.longitude === null || poiForm.latitude === null ||
            isNaN(poiForm.longitude) || isNaN(poiForm.latitude)) {
          ElMessage.error('经纬度不能为空且必须是有效数字！');
          return;
        }

        // 2. 构造符合 API 期望的数据结构
        const payload = {
          name: poiForm.name,
          grade: poiForm.level,     // 前端的 level 对应 API 的 grade
          province: poiForm.region, // 前端的 region 对应 API 的 province
          geometry: {
            type: "Point" as const, // 使用 'as const' 确保字面量类型
            coordinates: [poiForm.longitude, poiForm.latitude] as [number, number],
          },
          // 如果你的 addPoiAdmin API 或后端模型还期望其他来自 poiForm 的字段，
          // 例如 F1 (用于更新), address 等，你可以在这里添加它们
          // F1: poiForm.F1, // 对于新增，通常不传递 F1
          // address: poiForm.address,
        };

        if (poiForm.F1 !== null) { // 有 F1 (ID) 则为编辑
          // 对于更新，你可能需要传递 F1，并确保 updatePoiAdmin 也期望这个结构
          // 或者 updatePoiAdmin 的 data 参数只包含需要更新的字段
          await updatePoiAdmin(poiForm.F1, {
            // 对于更新，你可能只想发送变化的字段，或者后端能处理完整对象
            // 这里假设发送与新增类似的结构，但包含 F1 用于识别
            ...payload,
            F1: poiForm.F1 // 确保 F1 被包含用于更新的识别
          });
          ElMessage.success('修改成功！');
        } else { // 无 F1 (ID) 则为新增
          await addPoiAdmin(payload); // 现在 payload 的结构与 addPoiAdmin 的类型定义匹配
          ElMessage.success('新增成功！');
        }
        dialogVisible.value = false;
        await fetchPoiListForAdmin(); // 重新加载列表
      } catch (e: unknown) {
         ElMessage.error(`操作失败: ${(e as Error).message || '请重试'}`);
         console.error("操作失败详情:", e); // 打印更详细的错误
      }
    }
  });
};

const handleDelete = (row: PoiItem) => {
  ElMessageBox.confirm(`确定要删除景区 "${row.name}" 吗？`, '警告', {
    confirmButtonText: '确定删除',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(async () => {
      if (row.F1 !== null) {
        await deletePoiAdmin(row.F1); // F1 就是后端的 _id
        ElMessage.success('删除成功！');
        await fetchPoiListForAdmin();
      } else {
        ElMessage.error('无法删除：POI ID 不存在');
      }
    })
    .catch(() => {
      ElMessage.info('已取消删除');
    });
};
</script>
