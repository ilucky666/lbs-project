// 用户登录
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
  
    if (!username || !password) {
      return res.status(400).send('缺少用户名或密码');
    }
  
    const query = 'SELECT * FROM users WHERE username = ?';
    connection.query(query, [username], (err, results) => {
      if (err) {
        return res.status(500).send('数据库查询失败');
      }
      if (results.length === 0) {
        return res.status(400).send('用户名或密码错误');
      }
  
      // 比对密码
      bcrypt.compare(password, results[0].password, (err, isMatch) => {
        if (err) {
          return res.status(500).send('密码验证失败');
        }
        if (!isMatch) {
          return res.status(400).send('用户名或密码错误');
        }
  
        // 生成JWT
        const token = jwt.sign(
          { userId: results[0].id, role: results[0].role },
          'your_secret_key', // 你的密钥
          { expiresIn: '1h' } // 设置过期时间
        );
  
        res.json({ token });
      });
    });
  });
  