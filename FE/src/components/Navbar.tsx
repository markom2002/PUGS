// src/components/Navbar.tsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Navbar: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const token = localStorage.getItem('token');

  return (
    <nav style={{ padding: '10px', borderBottom: '1px solid #ccc' }}>
      <Link to="/" style={{ marginRight: '15px' }}>Početna</Link>
      {!token && (
        <>
          <Link to="/login" style={{ marginRight: '15px' }}>Login</Link>
          <Link to="/register" style={{ marginRight: '15px' }}>Register</Link>
        </>
      )}
      {token && (
        <>
          <Link to="/quizzes" style={{ marginRight: '15px' }}>Kvizovi</Link>
          
          <button onClick={handleLogout}>Logout</button>
        </>
      )}
      

    </nav>
  );
};

export default Navbar;
