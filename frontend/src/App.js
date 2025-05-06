import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/lib/locale/zh_CN';

// Components
import AppLayout from './components/layout/AppLayout';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Home from './components/Home';
import POIMap from './components/poi/POIMap';
import POISearch from './components/poi/POISearch';
import ApiKeyManagement from './components/auth/ApiKeyManagement';
import PrivateRoute from './components/auth/PrivateRoute';
import AdminRoute from './components/auth/AdminRoute';
import AdminDashboard from './components/admin/AdminDashboard';
import DataImport from './components/admin/DataImport';
import UserProfile from './components/user/UserProfile';

// Context
import { AuthProvider } from './context/AuthContext';

const App = () => {
  return (
    <ConfigProvider locale={zhCN}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            <Route path="/" element={<AppLayout />}>
              <Route index element={<Home />} />
              <Route path="map" element={<POIMap />} />
              <Route path="search" element={<POISearch />} />
              
              <Route 
                path="api-key" 
                element={
                  <PrivateRoute>
                    <ApiKeyManagement />
                  </PrivateRoute>
                } 
              />
              
              <Route 
                path="profile"
                element={
                  <PrivateRoute>
                    <UserProfile />
                  </PrivateRoute>
                } 
              />
              
              <Route 
                path="admin" 
                element={
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                } 
              />
              
              <Route 
                path="admin/import" 
                element={
                  <AdminRoute>
                    <DataImport />
                  </AdminRoute>
                } 
              />
            </Route>
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ConfigProvider>
  );
};

export default App; 