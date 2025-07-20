// src/models/Auth.ts

export interface LoginDto {
  usernameOrEmail: string;
  password: string;
}

export interface RegisterDto {
  username: string;
  email: string;
  password: string;
  imageUrl?: string;
}

export interface AuthResponse {
  token: string;
  userId: number;
  username: string;
  email: string;
  role: string; // npr. 'User' ili 'Admin'
}
