import React from 'react';
import { useNavigate } from 'react-router-dom';
import './css/AdminDashboard.css';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="admin-dashboard-container">
      <h2 className="admin-dashboard-title">Admin Dashboard</h2>
      <p className="admin-dashboard-description">
        Ovde će biti CRUD nad kvizovima i pitanjima.
      </p>

      <div className="admin-dashboard-buttons">
        <button
          className="btn btn-blue"
          onClick={() => navigate('/admin/quiz-manager')}
        >
          Upravljaj kvizovima
        </button>

        <button
          className="btn btn-green"
          onClick={() => navigate('/admin/results')}
        >
          Pregled rezultata korisnika
        </button>
      </div>
    </div>
  );
};

export default AdminDashboard;
