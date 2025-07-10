// src/api/auth.ts
import request from '@/utils/request'

interface LoginData {
  username: string
  password: string
}

// 定义注册数据接口
interface RegisterData {
  username: string
  password: string
  // 你可以根据需要添加其他字段，如 email
}

export function login(data: LoginData) {
  return request({
    url: '/api/auth/login',
    method: 'post',
    data,
  })
}

// 新增注册 API 函数
export function register(data: RegisterData) {
  return request({
    url: '/api/auth/register', // 指向新的后端注册接口
    method: 'post',
    data,
  })
}
