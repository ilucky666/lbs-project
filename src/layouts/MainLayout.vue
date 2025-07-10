<template>
  <el-container class="main-layout">
    <el-aside width="200px">
      <div class="logo">全国A级景区信息系统</div>
      <el-menu :default-active="$route.path" router>
        <el-menu-item index="/dashboard">
          <el-icon><Monitor /></el-icon>
          <span>首页大屏</span>
        </el-menu-item>
        <el-menu-item index="/admin/poi-management" v-if="isAdmin">
          <el-icon><Location /></el-icon>
          <span>POI数据维护</span>
        </el-menu-item>
        <el-menu-item index="/profile">
          <el-icon><User /></el-icon>
          <span>个人信息</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header>
        <div class="header-left">by_lyd</div>
        <div class="header-right">
          <el-dropdown>
            <span class="el-dropdown-link">
              {{ userStore.userInfo?.name }}
              <el-icon class="el-icon--right"><arrow-down /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      <el-main>
        <RouterView />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterView } from 'vue-router'
import { useUserStore } from '@/store/user'
import { Monitor, Location, User, ArrowDown } from '@element-plus/icons-vue'

const userStore = useUserStore()
const isAdmin = computed(() => userStore.userInfo?.role === 'admin')

const logout = () => {
  userStore.logout()
}
</script>

<style scoped>
.main-layout {
  height: 100vh;
}

.logo {
  height: 60px;
  line-height: 60px;
  text-align: center;
  font-size: 20px;
  font-weight: bold;
  color: #fff;
  background-color: #409eff;
}

.el-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e6e6e6;
}

.el-main {
  /* 让 el-main 内部有自己的内边距 */
  padding: 20px;
}
</style>
