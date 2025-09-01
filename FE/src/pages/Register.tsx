// src/pages/Register.tsx
import React, { useState } from 'react';
import { register } from '../services/AuthService';
import { RegisterDto } from '../models/Auth';
import './css/Register.css';

const Register: React.FC = () => {
  const [formData, setFormData] = useState<RegisterDto>({
    username: '',
    email: '',
    password: '',
    imageUrl: '',
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await register(formData);
      localStorage.setItem('token', response.token);
      setSuccess(true);
      setError(null);
      alert('Registracija uspješna!');
      // Ovde možeš dodati redirect npr. navigate('/home')
    } catch (err: any) {
      setError('Greška prilikom registracije. Provjerite podatke.');
    }
  };

  return (
    <div className='register-container'>
      <h2>Registracija</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {success && <p style={{ color: 'green' }}>Uspješna registracija!</p>}
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="username"
          placeholder="Korisničko ime"
          value={formData.username}
          onChange={handleChange}
          required
        />
        <br />
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          required
        />
        <br />
        <input
          type="password"
          name="password"
          placeholder="Lozinka"
          value={formData.password}
          onChange={handleChange}
          required
        />
        <br />
        <input
          type="text"
          name="imageUrl"
          placeholder="URL slike (opciono)"
          value={formData.imageUrl}
          onChange={handleChange}
        />
        <br />
        {formData.imageUrl && (
          <div className="image-preview">
          <img src={formData.imageUrl} alt="Preview" />
          </div>
          )}
        <button type="submit">Registruj se</button>
      </form>
    </div>
  );
};

export default Register;
