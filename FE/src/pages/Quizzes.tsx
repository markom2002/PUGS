// src/pages/Quizzes.tsx
import React, { useEffect, useState } from 'react';
import { getAllQuizzes } from '../services/QuizService';
import { QuizDto } from '../models/Quiz';
import { useNavigate } from 'react-router-dom';
import './css/Quizzes.css'; // ✅ dodato

const Quizzes: React.FC = () => {
  const [quizzes, setQuizzes] = useState<QuizDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [allQuizzes, setAllQuizzes] = useState<QuizDto[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const data = await getAllQuizzes();
        setAllQuizzes(data);
        setQuizzes(data);
        const uniqueCategories = [...new Set(data.map(q => q.category))];
        setCategories(uniqueCategories);
      } catch (error) {
        console.error('Greška pri učitavanju kvizova:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuizzes();
  }, []);

  const handleFilter = () => {
    let filtered = allQuizzes;

    if (categoryFilter) {
      filtered = filtered.filter(q =>
        q.category.toLowerCase().includes(categoryFilter.toLowerCase())
      );
    }

    if (difficultyFilter) {
      filtered = filtered.filter(q =>
        q.difficulty.toLowerCase() === difficultyFilter.toLowerCase()
      );
    }

    if (searchTerm) {
      filtered = filtered.filter(q =>
        q.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setQuizzes(filtered);
  };

  const handleStartQuiz = (quizId: number) => {
    navigate(`/quiz/${quizId}`);
  };

  const handleViewMyResults = () => {
    navigate('/my-results');
  };

  if (loading) return <p>Učitavanje kvizova...</p>;

  return (
    <div className="quizzes-container">
      <h2 className="quizzes-header">Dostupni kvizovi</h2>

      <button className="results-button" onClick={handleViewMyResults}>
        Pogledaj moje rezultate
      </button>

      <div className="filter-controls">
        <input
          type="text"
          placeholder="Pretraži po nazivu/opisu"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">Sve kategorije</option>
          {categories.map((cat, index) => (
            <option key={index} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        <select
          value={difficultyFilter}
          onChange={(e) => setDifficultyFilter(e.target.value)}
        >
          <option value="">Sve težine</option>
          <option value="easy">Lako</option>
          <option value="medium">Srednje</option>
          <option value="hard">Teško</option>
        </select>

        <button onClick={handleFilter}>Filtriraj</button>
      </div>

      {quizzes.length === 0 ? (
        <p>Nema dostupnih kvizova.</p>
      ) : (
        <ul className="quiz-list">
          {quizzes.map((quiz) => (
            <li key={quiz.id} className="quiz-item">
              <h3>{quiz.title}</h3>
              <p><strong>Kategorija:</strong> {quiz.category}</p>
              <p><strong>Opis:</strong> {quiz.description}</p>
              <p><strong>Težina:</strong> {quiz.difficulty}</p>
              <p><strong>Broj pitanja:</strong> {quiz.questionCount}</p>
              <p><strong>Vremensko ograničenje:</strong> {quiz.timeLimit} sekundi</p>
              <button onClick={() => handleStartQuiz(quiz.id)}>Pokreni kviz</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Quizzes;
