import { defineStore } from 'pinia'
import { ref } from 'vue'
import { login as loginApi } from '@/api/auth'
import router from '@/router'

export const useUserStore = defineStore('user', () => {
  const token = ref<string | null>(localStorage.getItem('token'))
  const userInfo = ref<any>(null) // 存储用户信息，包括角色

  async function login(loginData: any) {
    console.log("参数",loginData)
    // 调用登录 API
    // 假设登录成功后返回 { token: '...', user: { name: '...', role: 'admin' } }
    const response = await loginApi(loginData)
    token.value = response.token
    userInfo.value = response.user
    localStorage.setItem('token', response.token)

    // 登录成功后跳转到对应的主页
    if (userInfo.value.role === 'admin') {
      router.push('/admin/poi-management')
    } else {
      router.push('/dashboard')
    }
  }

  function logout() {
    token.value = null
    userInfo.value = null
    localStorage.removeItem('token')
    router.push('/login')
  }

  // (通常在应用初始化时调用) 获取用户信息
  async function getUserInfo() {
    // 模拟API获取用户信息
    // const res = await getInfoApi();
    // userInfo.value = res.user;
    // 这里为了演示，我们直接用一个模拟数据
    if (token.value) {
      // 在真实项目中，这里应该有一个通过 token 获取用户信息的 API 调用
      // 为了演示，我们假设角色是 admin
      userInfo.value = { name: '数据维护员', role: 'admin' }
    }
  }

  return { token, userInfo, login, logout, getUserInfo }
})

// 在组件外部使用 store
export function useUserStoreHook() {
  return useUserStore()
}
