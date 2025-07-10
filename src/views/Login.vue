<template>
  <div class="login-container">
    <el-card class="login-card">
      <template #header>
        <div class="card-header">
          <span>POI 信息服务平台</span>
        </div>
      </template>
      <el-form ref="loginFormRef" :model="loginForm" :rules="loginRules" label-width="80px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="loginForm.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            type="password"
            v-model="loginForm.password"
            show-password
            placeholder="请输入密码"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleLogin" :loading="loading" style="width: 100%">
            登 录
          </el-button>
        </el-form-item>
      </el-form>
      <div class="register-link">
        还没有账号？
        <a href="#" @click.prevent="goToRegisterPage">立即注册</a>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useUserStore } from '@/store/user'
// 1. 从 vue-router 导入 RouterLink (虽然通常 app.use(router) 会全局注册)
// 为了确保在 <script setup> 环境下 PascalCase 写法被正确识别，显式导入更稳妥
import { RouterLink, useRouter } from 'vue-router' // 如果你还需要 $router, 也可导入 useRouter
import type { FormInstance, FormRules } from 'element-plus' // 假设你可能需要这些类型
const router = useRouter() // 确保已导入 useRouter
const goToRegisterPage = () => {
  console.log('尝试跳转到 /register')
  router.push('/register')
}
const userStore = useUserStore()
const loginFormRef = ref<FormInstance | null>(null) // 为 ref 添加类型
const loading = ref(false)

const loginForm = reactive({
  username: 'admin',
  password: 'password123',
})

const loginRules = reactive<FormRules>({
  // 为 rules 添加类型
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
})

// 如果需要编程式导航，可以取消注释下一行
// const router = useRouter();

const handleLogin = async () => {
  
  if (!loginFormRef.value) return
  await loginFormRef.value.validate(async (valid: boolean) => {
    if (valid) {
      loading.value = true
      try {

        await userStore.login(loginForm)
        // 登录成功后的跳转逻辑已在 userStore.login 中处理
      } catch (error) {
        console.error('登录组件捕获错误:', error)
        // ElMessage 通常在 store 或 request 拦截器中处理了，这里可以不重复提示
      } finally {
        loading.value = false
      }
    }
  })
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #f0f2f5;
}
.login-card {
  width: 400px;
}
.card-header {
  text-align: center;
  font-size: 20px;
  font-weight: bold;
}
.register-link {
  text-align: center;
  margin-top: 10px;
}
/* 为 RouterLink 添加类似 el-link 的样式 */
.register-link a {
  color: var(--el-color-primary);
  text-decoration: none;
  margin-left: 5px; /* 添加一点左边距 */
}
.register-link a:hover {
  text-decoration: underline;
}
</style>
