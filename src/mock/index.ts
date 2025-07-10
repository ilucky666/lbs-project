// src/mock/index.ts
import axiosInstance from '@/utils/request'; // 导入你封装的 axios 实例
import MockAdapter from 'axios-mock-adapter';

import setupUserMock from './user'; // 导入用户认证相关的 mock 设置
// import setupPoiMock from './poi'; // 我们不再需要 poi.ts 来模拟 POI 数据了

// 1. 创建 Mock Adapter 实例，绑定到你的 axios 实例上
const mockAdapter = new MockAdapter(axiosInstance, { delayResponse: 200 }); // 可以设置少量延迟

// 2. 设置用户认证相关的 Mock
// setupUserMock 会定义 /api/auth/login, /api/auth/register 等接口的模拟行为
setupUserMock(mockAdapter);
console.log('[Mock Service] User authentication mocks (login, register, profile, etc.) are active.');

// 3. 设置所有 /api/poi/... 路径的请求“穿透”到真实后端
// 这意味着任何匹配这些路径的请求都不会被 mockAdapter 处理，而是会正常发送出去
// 使用正则表达式匹配所有以 /api/poi/ 开头的路径
mockAdapter.onGet(/\/api\/poi\/.*/).passThrough();
mockAdapter.onPost(/\/api\/poi\/.*/).passThrough();
mockAdapter.onPut(/\/api\/poi\/.*/).passThrough();
mockAdapter.onDelete(/\/api\/poi\/.*/).passThrough();
console.log('[Mock Service] Requests to /api/poi/... will pass through to the real backend.');

// 4. （可选）如果你还有其他模块的 API 也需要穿透，可以在这里添加：
// mockAdapter.onGet(/\/api\/other-module\/.*/).passThrough();
// mockAdapter.onPost(/\/api\/other-module\/.*/).passThrough();

// 5. 重要提示: 任何未被上面显式 mock (如 setupUserMock) 或显式 passThrough 
//    的请求，如果被 axiosInstance 调用，mockAdapter 默认会报错 (404)。
//    如果你希望所有未明确处理的请求都默认穿透，可以在最后添加一个通配的 passThrough：
//    mockAdapter.onAny().passThrough(); // 这会让所有未匹配的请求都尝试访问真实后端
//    但是，更推荐为需要穿透的路径组显式设置 passThrough，如此处的 /api/poi/。

console.log('Mock API service is running with selective pass-through for POI data.');