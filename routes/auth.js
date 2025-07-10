const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// 注册
router.post('/register', async (req, res) => {
  const { username, password, role } = req.body;
  try {
    const existing = await User.findOne({ username });
    if (existing) return res.status(400).json({ message: "用户已存在" });

    const hash = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hash, role });
    await user.save();
    res.status(201).json({ message: "注册成功" });
  } catch (err) {
    res.status(500).json({ message: "注册失败", error: err.message });
  }
});

// 登录
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.json({
        code: 401,
        msg: '用户名或密码错误'
      });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.json({
        code: 401,
        msg: '用户名或密码错误'
      });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '1d' }
    );

    res.json({
      code: 200,
      msg: '登录成功',
      data: {
        token,
        user: {
          name: user.username,
          role: user.role
        }
      }
    });
  } catch (err) {
    res.json({
      code: 500,
      msg: '服务器错误',
      error: err.message
    });
  }
});


// 测试接口
router.get('/test', (req, res) => {
  res.json({ message: '测试成功！' });
});

// 受保护接口
router.get('/secure-data', authMiddleware, (req, res) => {
  res.json({
    message: "这是一个受保护的接口，仅限登录用户访问。",
    user: req.user
  });
});

module.exports = router;
