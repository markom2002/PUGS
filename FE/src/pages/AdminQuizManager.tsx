import React, { useEffect, useState } from 'react';
import { getAllQuizzes, deleteQuiz } from '../services/QuizService';
import { useNavigate } from 'react-router-dom';
import { QuizDto } from '../models/Quiz';
import './css/AdminQuizManager.css'; // importuj novi css

const AdminQuizManager: React.FC = () => {
  const [categoryFilter, setCategoryFilter] = useState('');
  const [allQuizzes, setAllQuizzes] = useState<QuizDto[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    const data = await getAllQuizzes();
    setAllQuizzes(data);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Da li ste sigurni da želite da obrišete kviz?')) {
      await deleteQuiz(id);
      fetchQuizzes();
    }
  };

  const handleEdit = (id: number) => {
    navigate(`/admin/quiz-manager/edit/${id}`);
  };

  const handleCreate = () => {
    navigate('/admin/quiz-manager/create');
  };

  const filteredQuizzes = categoryFilter
    ? allQuizzes.filter(q => q.category.toLowerCase() === categoryFilter.toLowerCase())
    : allQuizzes;

  const uniqueCategories = Array.from(new Set(allQuizzes.map(q => q.category))).sort();

  return (
    <div className="admin-quiz-manager-container">
      <h1 className="admin-quiz-manager-title">Upravljanje kvizovima</h1>

      <button
        onClick={handleCreate}
        className="btn btn-green"
      >
        Kreiraj novi kviz
      </button>

      <div className="category-filter">
        <label htmlFor="categoryFilter" className="category-filter-label">Filter po kategoriji:</label>
        <select
          id="categoryFilter"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="category-filter-select"
        >
          <option value="">Sve kategorije</option>
          {uniqueCategories.map(cat => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {filteredQuizzes.length === 0 ? (
        <p className="no-quizzes-message">Nema kvizova za izabranu kategoriju.</p>
      ) : (
        filteredQuizzes.map((quiz) => (
          <div key={quiz.id} className="quiz-item">
            <div className="quiz-info">
              <strong>{quiz.title}</strong> - {quiz.description}
            </div>
            <div className="quiz-actions">
              <button
                onClick={() => handleEdit(quiz.id)}
                className="btn btn-yellow"
              >
                Izmeni
              </button>
              <button
                onClick={() => handleDelete(quiz.id)}
                className="btn btn-red"
              >
                Obriši
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default AdminQuizManager;
