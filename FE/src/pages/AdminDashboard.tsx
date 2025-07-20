// src/pages/AdminDashboard.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate(); // <--- OVO JE NEDOSTAJALO

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Admin Dashboard</h2>
      <p className="mb-6">Ovde će biti CRUD nad kvizovima i pitanjima.</p>

      <button
        onClick={() => navigate('/admin/quiz-manager')}
        className="mb-4 px-4 py-2 bg-blue-600 text-white rounded"
      >
        Upravljaj kvizovima
      </button>
    </div>
  );
};

export default AdminDashboard;
