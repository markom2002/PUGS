import React, { useEffect, useState } from 'react';
import { getAllQuizzes, deleteQuiz } from '../services/QuizService';
import { useNavigate } from 'react-router-dom';
import { QuizDto } from '../models/Quiz';

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
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Upravljanje kvizovima</h1>

      <button
        onClick={handleCreate}
        className="mb-4 px-4 py-2 bg-green-600 text-white rounded"
      >
        Kreiraj novi kviz
      </button>

      <div className="mb-4">
        <label htmlFor="categoryFilter" className="mr-2 font-semibold">Filter po kategoriji:</label>
        <select
          id="categoryFilter"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="p-2 border rounded"
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
        <p>Nema kvizova za izabranu kategoriju.</p>
      ) : (
        filteredQuizzes.map((quiz) => (
          <div key={quiz.id} className="p-4 mb-4 border rounded shadow">
            <p><strong>{quiz.title}</strong> - {quiz.description}</p>
            <button
              onClick={() => handleEdit(quiz.id)}
              className="mr-2 px-3 py-1 bg-yellow-500 text-white rounded"
            >
              Izmeni
            </button>
            <button
              onClick={() => handleDelete(quiz.id)}
              className="px-3 py-1 bg-red-600 text-white rounded"
            >
              Obriši
            </button>
          </div>
        ))
      )}
    </div>
  );
};

export default AdminQuizManager;
