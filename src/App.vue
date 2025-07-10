<template>
  <RouterView />
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<style>
/* 为了一个干净的开始，我们只保留最基础的全局样式。
  默认模板里的很多样式都可以删除。
*/
@import '@/assets/base.css';

/* 你可以保留这个 #app 的基本样式，也可以清空它 */
#app {
  max-width: 100%; /* 撑满全屏 */
  margin: 0;
  padding: 0;
  font-weight: normal;
}
</style>
