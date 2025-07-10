<template>
  <div class="profile-container">
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <span>基本信息</span>
        </div>
      </template>
      <el-form ref="profileFormRef" :model="profileForm" label-width="100px">
        <el-form-item label="用户名">
          <el-input v-model="profileForm.username" disabled />
        </el-form-item>
        <el-form-item label="用户角色">
          <el-input :value="roleText" disabled />
        </el-form-item>
        <el-form-item label="昵称" prop="nickname">
          <el-input v-model="profileForm.nickname" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleUpdateProfile" :loading="loading"
            >保存修改</el-button
          >
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <span>API KEY 管理</span>
        </div>
      </template>
      <el-descriptions :column="1" border>
        <el-descriptions-item label="您的 API Key">
          <template v-if="apiKey">
            <code>{{ apiKey }}</code>
          </template>
          <template v-else>
            <el-text type="info">您还没有生成 API Key</el-text>
          </template>
        </el-descriptions-item>
      </el-descriptions>
      <div class="api-key-actions">
        <el-button type="success" @click="handleGenerateKey">生成 / 重新生成</el-button>
        <el-button @click="handleCopyKey" :disabled="!apiKey">复制 Key</el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useUserStore } from '@/store/user'
import { ElMessage, ElMessageBox } from 'element-plus'
// 假设你已经在 api 目录下创建了 user.ts 来处理用户相关的 API 请求
// import { getProfile, updateProfile, generateApiKey } from '@/api/user'

const userStore = useUserStore()
const loading = ref(false)
const apiKey = ref('')

const profileForm = reactive({
  username: '',
  role: '',
  nickname: '',
})

const roleText = computed(() => {
  if (profileForm.role === 'admin') return '内部数据维护人员'
  if (profileForm.role === 'public') return '公众用户'
  return '未知角色'
})

// 组件加载时获取完整的用户信息和 API Key
onMounted(() => {

  if (userStore.userInfo) {
    profileForm.username = userStore.userInfo.name // 假设 store 里的 name 是 username
    profileForm.role = userStore.userInfo.role
    profileForm.nickname = '我的昵称' // 假设从API获取
  }
  apiKey.value = 'MOCK_API_KEY_ajk123n_askjdna9812enasd' // 模拟一个已存在的 Key
  // --- END MOCK DATA ---
})

// 处理更新个人信息
const handleUpdateProfile = async () => {
  loading.value = true
  try {
    // 真实项目中调用更新 API
    // await updateProfile({ nickname: profileForm.nickname })

    // 模拟API调用
    await new Promise((resolve) => setTimeout(resolve, 500))

    ElMessage.success('个人信息更新成功！')
  } catch (error) {
    ElMessage.error('更新失败，请重试。')
    console.error(error)
  } finally {
    loading.value = false
  }
}

// 处理生成/重新生成 API Key
const handleGenerateKey = () => {
  ElMessageBox.confirm('重新生成将会使您之前的 API Key 失效，确定要继续吗？', '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(async () => {
      // 真实项目中调用生成 Key 的 API
      // const res = await generateApiKey()
      // apiKey.value = res.data.newKey

      // 模拟API调用
      const newMockKey = `NEW_KEY_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`
      apiKey.value = newMockKey

      ElMessage.success('新的 API Key 已生成！')
    })
    .catch(() => {
      ElMessage.info('操作已取消')
    })
}

// 处理复制 API Key
const handleCopyKey = () => {
  if (!apiKey.value) return
  navigator.clipboard
    .writeText(apiKey.value)
    .then(() => {
      ElMessage.success('API Key 已成功复制到剪贴板！')
    })
    .catch((err) => {
      ElMessage.error('复制失败，请手动复制。')
      console.error('Could not copy text: ', err)
    })
}
</script>

<style scoped>
.profile-container {
  display: flex;
  flex-direction: column;
  gap: 20px; /* 卡片之间的间距 */
}

.box-card {
  width: 100%;
}

.card-header {
  font-weight: bold;
}

.api-key-actions {
  margin-top: 20px;
}

code {
  background-color: #f4f4f5;
  padding: 2px 6px;
  border-radius: 4px;
  color: #e6a23c;
  font-family: 'Courier New', Courier, monospace;
}
</style>
