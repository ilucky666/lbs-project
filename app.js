const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const port=3000;
dotenv.config();
const app = express();

app.listen(port,()=>{
  console.log("30000");
})

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1分钟
  max: 10, // 每分钟最多请求10次
  message: '请求过于频繁，请稍后再试。',
  standardHeaders: true, // 返回 RateLimit-* 头
  legacyHeaders: false,  // 禁用 X-RateLimit-* 头
});

// 中间件
app.use(cors());
app.use(express.json());
app.use(limiter); // 全局应用限速

// 路由
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const poiRoutes = require('./routes/poi');
app.use('/api/poi', poiRoutes);

// 数据库连接
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log("MongoDB connected");
  app.listen(process.env.PORT || 3000, () => {
    console.log(`Server running on port ${process.env.PORT || 3000}`);
  });
}).catch(err => {
  console.error("MongoDB connection error:", err);
});
