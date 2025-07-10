import axios from 'axios'
// import type { AxiosInstance, AxiosRequestConfig } from 'axios'
import { ElMessage } from 'element-plus'
import { useUserStoreHook } from '@/store/user'
const baseURL = "http://localhost:3000/";



const request = axios.create({
  baseURL: baseURL,
  timeout: 10000,
})
// / request 拦截器
// 可以自请求发送前对请求做一些处理
// 比如统一加token，对请求参数统一加密
request.interceptors.request.use(config => {
  //这里你自己处理请求

  return config
}, error => {
  console.error('request error: ' + error) // for debug
  return Promise.reject(error)
});

// response 拦截器
// 可以在接口响应后统一处理结果
// response 拦截器 (修正版)
request.interceptors.response.use(
  response => {
    const res = response.data; // res 是后端返回的完整响应体
    
    console.log('步骤1 - Axios拦截器收到的原始后端响应 (response.data):', JSON.parse(JSON.stringify(res)));

    // 检查 res 是否是数组。如果是，直接认为是成功的数据并返回。
    if (Array.isArray(res)) {
      console.log('步骤2 - Axios拦截器准备返回的数据 (res 是数组，直接返回):', JSON.parse(JSON.stringify(res)));
      return res; // 后端直接返回了数据数组
    }

    // 如果 res 是一个对象，并且包含 code 字段 (用于其他接口，如登录、或者错误信息包装)
    if (res && typeof res.code !== 'undefined') {
      if (res.code !== 200) {
        ElMessage({
          message: res.msg || 'Error from backend',
          type: 'error',
          duration: 5 * 1000,
        });
        if (res.code === 401) {
          useUserStoreHook().logout();
        }
        return Promise.reject(new Error(res.msg || 'Error from backend with code'));
      } else {
        // 后端使用了 { code: 200, data: ... } 包装，且 code 是 200
        console.log('步骤2 - Axios拦截器准备返回的数据 (res.data from wrapper):', JSON.parse(JSON.stringify(res.data)));
        return res.data; // 返回包装器内的 data 字段
      }
    }
    
    // 如果 res 不是数组，也不是带有 code 字段的对象，
    // 这可能是一个未预期的响应结构，或者是一个直接返回的单个对象（非列表查询）
    // 为了通用性，我们先假设这种也是成功数据并直接返回。
    // 如果特定接口有不同处理，可以在该接口的调用处再处理。
    console.log('步骤2 - Axios拦截器准备返回的数据 (res 是未知结构对象，直接返回):', JSON.parse(JSON.stringify(res)));
    return res;
  },
  error => {
    console.error('response error (interceptor): ' + error.message); // 输出更详细的错误
    ElMessage({
      message: error.response?.data?.msg || error.message || 'Network Error or Unhandled Exception',
      type: 'error',
      duration: 5 * 1000,
    });
    return Promise.reject(error);
  }
)




// const service: AxiosInstance = axios.create({
//   baseURL: import.meta.env.VITE_API_BASE_URL,
//   timeout: 10000,
// })


// // 请求拦截器
// service.interceptors.request.use(
//   (config: AxiosRequestConfig) => {
//     const userStore = useUserStoreHook()
//     if (userStore.token && config.headers) {
//       config.headers.Authorization = `Bearer ${userStore.token}`
//     }
//     return config
//   },
//   (error) => {
//     return Promise.reject(error)
//   },
// )

// // 响应拦截器
// service.interceptors.response.use(
//   (response) => {
//     console.log("response",response)
//     const res = response.data
//     // 假设后端返回的 code !== 200 即为错误
//     if (res.code !== 200) {
//       ElMessage({
//         message: res.msg || 'Error',
//         type: 'error',
//         duration: 5 * 1000,
//       })
//       // 可以根据不同的业务错误代码进行特定处理
//       // 例如 token 过期，强制登出
//       if (res.code === 401) {
//         useUserStoreHook().logout()
//       }
//       return Promise.reject(new Error(res.msg || 'Error'))
//     } else {
//       // 成功则直接返回数据实体
//       return res.data
//     }
//   },
//   (error) => {
//     ElMessage({
//       message: error.message,
//       type: 'error',
//       duration: 5 * 1000,
//     })
//     return Promise.reject(error)
//   },
// )

// export default service

export default request;
