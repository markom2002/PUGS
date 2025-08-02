// src/pages/Login.tsx
import React, { useState } from 'react';
import { login } from '../services/AuthService';
import { LoginDto } from '../models/Auth';
import { useNavigate } from 'react-router-dom';
import { parseJwt } from '../utils/token';
import './css/Login.css'; // ✅ Dodato

const Login: React.FC = () => {
  const [formData, setFormData] = useState<LoginDto>({
    usernameOrEmail: '',
    password: '',
  });

  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await login(formData);
      localStorage.setItem('token', response.token);
      setError(null);

      const payload = parseJwt(response.token);
      const role = payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
      const userId = payload["id"];
      localStorage.setItem("userId", userId); 

      if (role === 'Admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/quizzes');
      }
    } catch (err: any) {
      setError('Invalid credentials or server error');
    }
  };

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleSubmit}>
        <h2>Login</h2>
        {error && <p>{error}</p>}
        <input
          type="text"
          name="usernameOrEmail"
          placeholder="Username or Email"
          value={formData.usernameOrEmail}
          onChange={handleChange}
          required
          autoComplete="username"
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          required
          autoComplete="current-password"
        />
        <button type="submit">Login</button>
      </form>
    </div>
  );
};

export default Login;
