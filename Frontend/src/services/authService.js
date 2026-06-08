import api from './api';

export const loginUser = async (data) => {
  const response = await api.post('/auth/login', data);
  return response;
};

export const registerUser = async (data) => {
  const response = await api.post('/auth/register', data);
  return response;
};

export const getUsers = async () => {
  const response = await api.get('/api/users');
  return response.data.data ?? [];
};

export const createUser = async (data) => {
  const response = await api.post('/api/users', data);
  return response.data.data;
};

export const updateUser = async (id, data) => {
  const response = await api.put(`/api/users/${id}`, data);
  return response.data.data;
};

export const deleteUser = async (id) => {
  const response = await api.delete(`/api/users/${id}`);
  return response.data;
};
