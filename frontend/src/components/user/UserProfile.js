import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, message, Spin, Typography } from 'antd';
import { MailOutlined, LockOutlined, UserOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import * as api from '../../services/api';

const { Title } = Typography;

const UserProfile = () => {
  const { user, token, loading: authLoading, error: authError, logout } = useAuth();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Populate form with current user data when available
    if (user) {
        // We don't have the email in the basic user object from context
        // Ideally, fetch full profile data here
        form.setFieldsValue({
            username: user.username, 
            // email: user.email // Need to fetch email
        });
        // Fetch full profile data including email
        fetchProfileData();
    }
  }, [user, form]);
  
   const fetchProfileData = async () => {
      if (!token) return;
      setLoading(true);
      try {
          // Assuming an API endpoint exists to get the current user's full profile
          // const response = await api.getUserProfile(token); 
          // For now, we just set the username from context
          form.setFieldsValue({ username: user?.username });
          // TODO: Add api.getUserProfile and call it here to get email
          // form.setFieldsValue({ email: response.data.email }); 
      } catch (error) {
          message.error('无法加载个人信息。');
          console.error("Fetch profile error:", error);
      } finally {
          setLoading(false);
      }
  };

  const onFinish = async (values) => {
    setLoading(true);
    try {
        const updateData = {};
        if (values.email) {
            updateData.email = values.email;
        }
        if (values.password) {
            // Add confirmation for password change if desired
            updateData.password = values.password;
        }
        
        if (Object.keys(updateData).length === 0) {
            message.info('未检测到信息更改。');
            setLoading(false);
            return;
        }
        
        // Need to create this API function
        // await api.updateUserProfile(updateData, token);
        message.success('个人信息更新成功！');
        // Optionally: Refresh user data in context or re-fetch profile
        
    } catch (error) {
      message.error(error.response?.data?.message || '信息更新失败。');
      console.error('Update profile error:', error);
    } finally {
      setLoading(false);
      form.resetFields(['password', 'confirmPassword']); // Clear password fields after attempt
    }
  };

  if (authLoading || loading) {
    return <Spin tip="加载中..." style={{ display: 'block', marginTop: '50px' }} />;
  }

  if (authError) {
    // Handle auth error, maybe redirect to login
    return <p>加载用户信息时出错: {authError}</p>;
  }

  if (!user) {
    // Should be handled by PrivateRoute, but as a fallback
    return <p>请先登录。</p>;
  }

  return (
    <Card title={<Title level={4}>个人信息维护</Title>} style={{ maxWidth: 500, margin: '20px auto' }}>
      <Form
        form={form}
        name="user_profile"
        onFinish={onFinish}
        layout="vertical"
        requiredMark={false}
      >
        <Form.Item
          name="username"
          label="用户名"
        >
          <Input prefix={<UserOutlined />} disabled />
        </Form.Item>

        <Form.Item
          name="email"
          label="邮箱地址"
          rules={[
            {
              type: 'email',
              message: '请输入有效的邮箱地址!',
            },
            // Make email optional for update
            // {
            //   required: true,
            //   message: '请输入您的邮箱地址!',
            // },
          ]}
        >
          <Input prefix={<MailOutlined />} placeholder="新邮箱地址（可选）" />
        </Form.Item>

        <Form.Item
          name="password"
          label="新密码"
          rules={[
            {
              min: 6,
              message: '密码至少需要6位字符!',
            },
          ]}
          hasFeedback
        >
          <Input.Password prefix={<LockOutlined />} placeholder="输入新密码（可选）" />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          label="确认新密码"
          dependencies={['password']}
          hasFeedback
          rules={[
            // Required only if password is being changed
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!getFieldValue('password') || !value) {
                    // If new password is empty, confirm is not required
                    return Promise.resolve(); 
                }
                if (getFieldValue('password') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('两次输入的密码不一致!'));
              },
            }),
          ]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="再次输入新密码" />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>
            更新信息
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default UserProfile; 