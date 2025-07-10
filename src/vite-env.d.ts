// src/vite-env.d.ts (或者 src/global.d.ts)

/// <reference types="vite/client" />

// 在这里添加下面的代码
interface Window {
  AMap: any // 或者更具体的类型，但 any 能快速解决编译问题
  // 如果你知道 AMap 的具体类型或者安装了高德地图的类型定义包，可以替换这里的 any
}
