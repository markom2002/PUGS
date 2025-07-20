// src/services/AuthService.ts
import api from '../api/api';
import { LoginDto, RegisterDto, AuthResponse } from '../models/Auth';

export const login = async (data: LoginDto): Promise<AuthResponse> => {
  const response = await api.post('/api/Auth/login', data);
  return response.data;
};

export const register = async (data: RegisterDto): Promise<AuthResponse> => {
  const response = await api.post('/api/Auth/register', data);
  return response.data;
};
