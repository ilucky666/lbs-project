POI 信息服务平台与WebGIS客户端
本项目是一个功能完备的基于位置服务 (LBS) 的全栈应用，旨在提供专题兴趣点 (POI) 数据的管理、查询和地图可视化功能。它包含一个基于 Node.js 的 RESTful API 后端和一个使用 Vue 3 构建的现代化 Web 前端。

✨ 主要功能 (Features)
分角色权限管理: 系统定义了“管理员”和“公众用户”两种角色，具有不同的操作权限。

用户认证: 基于 JWT (JSON Web Token) 的注册和登录系统。

POI 数据管理 (管理员): 管理员可以对 POI 数据进行增、删、改、查 (CRUD) 操作，并支持通过 GeoJSON 文件批量导入数据。

POI 数据查询 (公众用户):

支持按名称、地区、类别等多种条件进行筛选。

地图交互式查询: 用户可以直接在地图上进行拉框范围查询和中心点半径查询。

API KEY 管理: 公众用户可以获取和管理自己的 API KEY (后端功能已规划)。

地图可视化: 查询到的 POI 数据会在高德地图上以标记点 (Marker) 的形式进行可视化展示。

前端界面: 提供了数据列表展示、分页、表单操作等丰富的 UI 交互。

🛠️ 技术栈 (Tech Stack)
类别

技术

前端

Vue 3 (Composition API, <script setup>), Vite, TypeScript, Element Plus, Pinia, Axios, Vue Router, 高德地图JSAPI v2.0

后端

Node.js, Express.js, MongoDB, Mongoose

认证

JSON Web Tokens (JWT), bcryptjs

数据处理

mongoimport 命令行工具, Python (pymongo) 脚本

开发工具

VS Code, Postman, Git, Gitee/GitHub

🚀 快速开始 (Getting Started)
本项目分为 backend (后端) 和 frontend (前端，在你的项目中是 vueproject) 两个部分，需要分别启动。

📋 前提条件
已安装 Node.js (推荐 LTS 版本)

已安装并运行 MongoDB 数据库服务

已安装 MongoDB Database Tools (用于 mongoimport)

📦 安装与启动
1. 后端 (Backend)
进入后端项目目录:

cd backend

安装依赖:

npm install

配置环境变量:

在 backend 目录下创建一个 .env 文件。

在文件中添加以下变量：

# 你的 MongoDB 连接字符串
MONGO_URI=mongodb://localhost:27017/poi-system

# 用于 JWT 加密的密钥，请使用一个更复杂的随机字符串
JWT_SECRET=your_super_secret_key_for_jwt

导入初始数据 (可选但推荐):

确保你的 全国A级景区.geojson 文件经过预处理（提取 features 数组到一个纯 JSON 数组文件，例如 pois_for_import.json）。

运行 mongoimport 命令导入数据：

mongoimport --db poi-system --collection pois --file pois_for_import.json --jsonArray

启动后端服务:

node app.js

看到 "Server running on port 3000" 和 "MongoDB connected" 的日志即表示后端启动成功。

2. 前端 (Frontend / vueproject)
进入前端项目目录:

cd vueproject

安装依赖:

npm install

配置环境变量:

在 vueproject 目录下创建一个 .env.development 文件。

在文件中添加以下变量，并确保 VITE_API_BASE_URL 指向你正在运行的后端服务：

# 后端服务的根地址
VITE_API_BASE_URL=http://localhost:3000

# 你申请的高德地图 Web JS API Key
VITE_AMAP_KEY=你的高德地图Key

检查配置:

Vite 配置: 打开 vite.config.ts 文件，确保 server.proxy 部分已被注释掉或删除，因为我们直接连接后端地址。

Mock 服务: 打开 src/main.ts 文件，确保文件末尾启动 Mock 服务的代码块 (if (import.meta.env.DEV) { ... }) 已被注释掉，以确保所有 API 请求都发往真实后端。

启动前端开发服务器:

npm run dev

看到 Vite 的启动信息和本地访问 URL（如 http://localhost:5173/）即表示前端启动成功。

📖 API 端点概览
POST /api/auth/register - 用户注册

POST /api/auth/login - 用户登录

GET /api/poi/list - 获取POI列表（支持 name, province 等查询参数）

POST /api/poi/add - 新增POI (需要管理员权限)

PUT /api/poi/update/:id - 修改指定ID的POI (需要管理员权限)

DELETE /api/poi/delete/:id - 删除指定ID的POI (需要管理员权限)

POST /api/poi/search/box - 拉框范围查询

POST /api/poi/search/radius - 中心点半径查询

⚠️ 注意: 为了便于开发和测试，后端路由中的 Token 和角色验证可能已被临时移除。在部署到生产环境前务必恢复这些安全设置。
