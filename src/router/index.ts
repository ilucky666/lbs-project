import { createRouter, createWebHistory } from 'vue-router'
import { useUserStoreHook } from '@/store/user'
import MainLayout from '@/layouts/MainLayout.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/Login.vue'),
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/RegisterView.vue'), // 指向我们新创建的组件
    },
    {
      path: '/',
      component: MainLayout, // 使用主布局的页面
      redirect: '/dashboard',
      children: [
        {
          path: 'dashboard',
          name: 'dashboard',
          component: () => import('@/views/public/DashboardView.vue'),
          meta: { title: '首页大屏', roles: ['admin', 'public'] },
        },
        {
          path: 'profile',
          name: 'profile',
          component: () => import('@/views/public/Profile.vue'),
          meta: { title: '个人信息', roles: ['admin', 'public'] },
        },
        // 管理员专属路由
        {
          path: '/admin/poi-management',
          name: 'poi-management',
          component: () => import('@/views/admin/PoiManagement.vue'),
          meta: { title: 'POI数据维护', roles: ['admin'] },
        },
      ],
    },
    // 捕获所有未匹配的路由
    {
      path: '/:pathMatch(.*)*',
      redirect: '/dashboard',
    },
  ],
})

// 全局路由守卫
router.beforeEach(async (to, from, next) => {
  const userStore = useUserStoreHook()
  const token = userStore.token

  if (token) {
    // 用户已登录 (有 token)
    if (to.path === '/login' || to.path === '/register') {
      // 如果已登录，还想去登录页或注册页，则直接跳转到首页
      next({ path: '/dashboard' })
    } else {
      // 如果用户信息尚未加载，则尝试加载
      if (!userStore.userInfo) {
        try {
          await userStore.getUserInfo() // 确保这个函数会根据 token 正确获取用户信息
        } catch (_error) {
          // 获取用户信息失败（可能 token 失效）
          userStore.logout() // 清除无效 token 和用户信息
          next('/login') // 重定向到登录页
          return
        }
      }

      // 检查角色权限 (如果路由定义了 meta.roles)
      const userRole = userStore.userInfo?.role
      if (to.meta.roles && Array.isArray(to.meta.roles) && !to.meta.roles.includes(userRole)) {
        // 如果用户角色不符合页面要求，可以跳转到无权限页或首页
        console.warn(
          `权限不足：用户角色 ${userRole} 尝试访问需要 ${to.meta.roles.join(', ')} 角色的页面 ${to.path}`,
        )
        next('/dashboard') // 或者 next({ name: 'Error403Page' });
      } else {
        next() // 权限满足，或页面不需要特定角色，放行
      }
    }
  } else {
    // 用户未登录 (没有 token)
    if (to.path === '/login' || to.path === '/register') {
      // 如果未登录，且目标是登录页或注册页，则直接放行
      next()
    } else {
      // 其他所有未登录情况，都重定向到登录页
      next('/login')
    }
  }
})

export default router
