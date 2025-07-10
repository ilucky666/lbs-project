# POI 信息服务平台与 WebGIS 客户端

本项目是一个基于位置服务（LBS）的全栈应用，提供兴趣点（POI）数据的管理、查询和地图可视化功能，包含 Node.js 的 RESTful API 后端和 Vue 3 构建的 Web 前端。
![项目演示 ](https://github.com/user-attachments/assets/aabcdd20-881b-49cd-90e9-916a5081dfea)



## 🚀 核心功能

### 🔐 权限管理与认证

* 分角色权限：管理员 / 公众用户
* JWT 用户认证系统（注册 / 登录）

### 📦 POI 数据管理（管理员）

* 增删改查（CRUD）操作
* 支持 GeoJSON 文件批量导入

### 🔍 POI 查询功能（公众用户）

* 支持按名称、地区、类别筛选
* 地图交互式查询：拉框、中心点 + 半径查询
* API KEY 申请与管理（已规划）

### 🗺️ 地图可视化与前端交互

* 查询结果在高德地图中以标记点展示
* 数据列表、分页、表单操作、Marker 弹窗

---

## 🧱 技术栈

| 类别   | 技术                                                                                                      |
| ---- | ------------------------------------------------------------------------------------------------------- |
| 前端   | Vue 3 (Composition API + `<script setup>`), Vite, Element Plus, Pinia, Vue Router, Axios, 高德 JSAPI v2.0 |
| 后端   | Node.js, Express.js, MongoDB, Mongoose                                                                  |
| 认证   | JWT (jsonwebtoken), bcryptjs                                                                            |
| 数据处理 | mongoimport, Python (pymongo) 脚本                                                                        |
| 开发工具 | VS Code, Git, Postman, Gitee/GitHub                                                                     |

---

## 📦 项目启动指南

项目分为两个部分：`backend/`（后端）和 `vueproject/`（前端），需分别运行。

### ✅ 后端启动

#### 环境准备

* 安装 Node.js（建议 LTS）
* 安装并启动 MongoDB 数据库服务
* 安装 MongoDB Database Tools（用于 `mongoimport`）

#### 安装依赖

```bash
cd backend
npm install
```

#### 配置环境变量

在 `backend/.env` 中设置以下内容：

```env
MONGO_URI=mongodb://localhost:27017/poi-system
JWT_SECRET=your_super_secret_key
```

#### 导入初始 POI 数据（可选）

确保你有一个处理好的纯 JSON 数组文件，例如：`pois_for_import.json`

```bash
mongoimport --db poi-system --collection pois --file pois_for_import.json --jsonArray
```

#### 启动后端服务

```bash
node app.js
```

你应看到：`Server running on port 3000` 与 `MongoDB connected`

---

### ✅ 前端启动

#### 安装依赖

```bash
cd vueproject
npm install
```

#### 配置环境变量

在 `vueproject/.env.development` 中添加：

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_AMAP_KEY=你的高德地图 API Key
```

#### 检查配置

* 确保 `vite.config.ts` 中未使用代理（或已注释）
* `src/main.ts` 中 Mock 数据部分已禁用

#### 启动开发服务器

```bash
npm run dev
```

访问：`http://localhost:5173/`

---

## 📚 API 端点示例

| 方法   | 路径                    | 功能描述              |
| ---- | --------------------- | ----------------- |
| POST | `/api/auth/register`  | 用户注册              |
| POST | `/api/auth/login`     | 用户登录              |
| GET  | `/api/poi/list`       | 获取 POI 列表（支持查询参数） |
| POST | `/api/poi/add`        | 新增 POI（管理员）       |
| PUT  | `/api/poi/update/:id` | 修改 POI（管理员）       |

---

## 📌 TODO（规划中）

* [ ] API KEY 管理系统（每用户唯一 Key）
* [ ] POI 点分类图层管理
* [ ] 地图可达性分析与路径规划
* [ ] 支持 GeoServer / PostGIS 后端扩展

---

## 📖 许可

本项目遵循 MIT License，可自由使用与修改。

---

> 如果你觉得本项目有帮助，欢迎 Star ⭐、Fork 🍴，或提交 Issue 🛠️！
