// src/pages/Home.tsx
import React from 'react';
import { Link } from 'react-router-dom';

const Home: React.FC = () => {
  return (
    <div style={{ textAlign: 'center' }}>
      <h1>Dobrodošli u PUGS kviz aplikaciju!</h1>
      <div style={{ marginTop: '20px' }}>
        <Link to="/login">
          <button style={{ marginRight: '10px' }}>Login</button>
        </Link>
        <Link to="/register">
          <button>Register</button>
        </Link>
      </div>
    </div>
  );
};

export default Home;
