// src/mock/user.ts
import Mock from 'mockjs'
// 修正1：MockAdapter 是默认导出，需要这样导入
import MockAdapter from 'axios-mock-adapter'
// 如果只需要类型，可以是: import type RealMockAdapter from 'axios-mock-adapter';
// 然后使用: mockAdapter: InstanceType<typeof RealMockAdapter>

// --- 内存中的用户“数据库” ---
const mockUsers: any[] = [
  // ESLint 可能会警告这里的 any，可以定义一个 User 接口
  {
    F1: 1,
    username: 'admin',
    password: 'password123',
    role: 'admin',
    name: '超级管理员',
    nickname: 'Administrator_01',
    apiKey: 'initial_admin_api_key_abc123',
  },
  {
    F1: 2,
    username: 'user',
    password: 'password123',
    role: 'public',
    name: '普通用户张三',
    nickname: 'PublicUser_Zhang',
    apiKey: 'initial_public_user_api_xyz789',
  },
]
let nextUserId = mockUsers.reduce((max, u) => Math.max(max, u.F1 || 0), 0) + 1

// 确保这个函数是模块的顶层导出
export default function setupUserMock(mockAdapter: InstanceType<typeof MockAdapter>) {
  // 修正2：使用 InstanceType 获取类型
  // --- 模拟注册接口 (/api/auth/register) ---
  mockAdapter.onPost('/api/auth/register').reply((config) => {
    // 修正3：为 config 添加隐式 any 或具体类型
    const data = JSON.parse(config.data || '{}') // 添加 || '{}' 防止 config.data 为 undefined
    const { username, password } = data

    if (!username || !password) {
      return [200, { code: 400, msg: '用户名和密码不能为空 (mock)' }]
    }
    if (username.length < 3 || username.length > 15) {
      return [200, { code: 400, msg: '用户名长度需在3到15个字符之间 (mock)' }]
    }
    if (password.length < 6 || password.length > 20) {
      return [200, { code: 400, msg: '密码长度需在6到20个字符之间 (mock)' }]
    }

    if (mockUsers.find((u) => u.username === username)) {
      return [200, { code: 409, msg: '用户名已存在 (mock)' }]
    }

    const newUser = {
      F1: nextUserId++,
      username,
      password,
      role: 'public',
      name: username,
      nickname: username,
      apiKey: Mock.Random.guid(),
    }
    mockUsers.push(newUser)
    console.log('[Mock API] /api/auth/register: 新用户注册成功:', newUser)
    return [
      200,
      {
        code: 200,
        msg: '注册成功！请登录。 (mock)',
        data: { id: newUser.F1, username: newUser.username },
      },
    ]
  })

  // --- 模拟登录接口 (/api/auth/login) ---
  mockAdapter.onPost('/api/auth/login').reply((config) => {
   
    // 修正3
    const data = JSON.parse(config.data || '{}')
    const { username, password } = data
    const foundUser = mockUsers.find((u) => u.username === username && u.password === password)

    if (foundUser) {
      console.log('[Mock API] /api/auth/login: 用户登录成功:', foundUser.username)
      return [
        200,
        {
          code: 200,
          msg: '登录成功 (mock)',
          data: {
            token: `MOCK_TOKEN_FOR_${foundUser.username}_${Date.now()}`,
            user: {
              name: foundUser.name,
              role: foundUser.role,
              username: foundUser.username,
            },
          },
        },
      ]
    } else {
      console.log('[Mock API] /api/auth/login: 用户登录失败:', username)
      return [200, { code: 401, msg: '用户名或密码错误 (mock)' }]
    }
  })

  // --- 模拟获取当前登录用户信息的接口 (/api/user/profile) ---
  mockAdapter.onGet('/api/user/profile').reply((config) => {
    // 修正3
    const token = config.headers?.Authorization?.split(' ')[1]
    let usernameFromToken = null
    if (token && token.startsWith('MOCK_TOKEN_FOR_')) {
      usernameFromToken = token.split('_')[3]
    }
    const currentUser = mockUsers.find((u) => u.username === usernameFromToken)
    if (currentUser) {
      return [
        200,
        {
          code: 200,
          msg: '获取用户信息成功 (mock)',
          data: {
            username: currentUser.username,
            nickname: currentUser.nickname,
            role: currentUser.role,
            apiKey: currentUser.apiKey || Mock.Random.guid(),
          },
        },
      ]
    }
    return [200, { code: 401, msg: '未授权或用户不存在 (mock)' }]
  })

  // --- 模拟更新用户Profile的接口 (/api/user/profile) ---
  mockAdapter.onPut('/api/user/profile').reply((config) => {
    // 修正3
    const newProfileData = JSON.parse(config.data || '{}')
    const token = config.headers?.Authorization?.split(' ')[1]
    let usernameFromToken = null
    if (token && token.startsWith('MOCK_TOKEN_FOR_')) {
      usernameFromToken = token.split('_')[3]
    }
    const userIndex = mockUsers.findIndex((u) => u.username === usernameFromToken)
    if (userIndex !== -1) {
      if (newProfileData.nickname !== undefined) {
        mockUsers[userIndex].nickname = newProfileData.nickname
      }
      return [
        200,
        {
          code: 200,
          msg: '用户信息更新成功 (mock)',
          data: { nickname: mockUsers[userIndex].nickname },
        },
      ]
    }
    return [200, { code: 401, msg: '更新失败，用户不存在或Token无效 (mock)' }]
  })

  // --- 模拟生成/重新生成 API Key 的接口 (/api/user/generate-key) ---
  mockAdapter.onPost('/api/user/generate-key').reply((config) => {
    // 修正3
    const token = config.headers?.Authorization?.split(' ')[1]
    let usernameFromToken = null
    if (token && token.startsWith('MOCK_TOKEN_FOR_')) {
      usernameFromToken = token.split('_')[3]
    }
    const userIndex = mockUsers.findIndex((u) => u.username === usernameFromToken)
    if (userIndex !== -1) {
      const newApiKey = `MOCK_API_KEY_FOR_${mockUsers[userIndex].username}_${Mock.Random.guid()}`
      mockUsers[userIndex].apiKey = newApiKey
      return [200, { code: 200, msg: 'API Key 生成成功 (mock)', data: { newKey: newApiKey } }]
    }
    return [200, { code: 404, msg: '用户未找到，无法生成Key (mock)' }]
  })

  console.log('[Mock Service] User mocks initialized.')
}
