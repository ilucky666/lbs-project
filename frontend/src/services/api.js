import axios from 'axios';

const API_BASE_URL = '/api'; // Proxy handles the full URL

const getApiClient = (apiKey = null) => {
  const headers = {};
  if (apiKey) {
    headers['X-API-KEY'] = apiKey;
  }
  return axios.create({
    baseURL: API_BASE_URL,
    headers: headers
  });
};

// --- Authentication --- 
export const loginUser = (credentials) => {
  return getApiClient().post('/auth/login', credentials);
};

export const registerUser = (userData) => {
  return getApiClient().post('/auth/register', userData);
};

export const generateApiKey = (token) => {
  return getApiClient().post('/auth/generate-api-key', null, {
    headers: { Authorization: `Bearer ${token}` }
  });
};

// --- User Profile ---
export const getUserProfile = (token) => {
  // Assuming backend provides GET /api/user/profile
  return getApiClient().get(`/user/profile`, {
      headers: { Authorization: `Bearer ${token}` }
  });
};

export const updateUserProfile = (updateData, token) => {
  return getApiClient().put(`/user/profile`, updateData, {
    headers: { Authorization: `Bearer ${token}` }
  });
};

// --- POI Public Search --- 
export const getPoiById = (id, apiKey) => {
  return getApiClient(apiKey).get(`/public/pois/${id}`);
};

export const searchPoiByName = (name, apiKey, pageable = {}) => {
  return getApiClient(apiKey).get(`/public/pois/search/name`, { params: { name, ...pageable } });
};

export const searchPoiByProvince = (province, apiKey, pageable = {}) => {
  return getApiClient(apiKey).get(`/public/pois/search/province`, { params: { province, ...pageable } });
};

export const searchPoiByLevel = (level, apiKey, pageable = {}) => {
  return getApiClient(apiKey).get(`/public/pois/search/level`, { params: { level, ...pageable } });
};

export const searchPoiByBoundingBox = (bbox, apiKey) => {
  const { minLat, minLon, maxLat, maxLon } = bbox;
  return getApiClient(apiKey).get(`/public/pois/search/boundingbox`, { params: { minLat, minLon, maxLat, maxLon } });
};

export const searchPoiByRadius = (center, radiusInMeters, apiKey) => {
  const { lat, lon } = center;
  return getApiClient(apiKey).get(`/public/pois/search/radius`, { params: { lat, lon, radiusInMeters } });
};

export const findPoiWithExtendedInfo = (apiKey, pageable = {}) => {
  return getApiClient(apiKey).get(`/public/pois/search/extended-info`, { params: { ...pageable } });
};

export const getProvinces = (apiKey) => {
  return getApiClient(apiKey).get(`/public/pois/provinces`);
};

// --- POI Internal Management --- 
export const createPoi = (poiData, token) => {
  return getApiClient().post(`/internal/pois`, poiData, {
    headers: { Authorization: `Bearer ${token}` }
  });
};

export const updatePoi = (id, poiData, token) => {
  return getApiClient().put(`/internal/pois/${id}`, poiData, {
    headers: { Authorization: `Bearer ${token}` }
  });
};

export const deletePoi = (id, token) => {
  return getApiClient().delete(`/internal/pois/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
};

// --- Admin Data Import --- 
export const importExcelFile = (formData, token) => {
  return getApiClient().post('/admin/import/excel', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      Authorization: `Bearer ${token}`
    }
  });
};

export const importShapefile = (formData, token) => {
  return getApiClient().post('/admin/import/shapefile', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      Authorization: `Bearer ${token}`
    }
  });
}; 