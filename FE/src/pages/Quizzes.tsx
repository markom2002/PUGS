// src/pages/Quizzes.tsx
import React, { useEffect, useState } from 'react';
import { getAllQuizzes } from '../services/QuizService';
import { QuizDto } from '../models/Quiz';
import { useNavigate } from 'react-router-dom';

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

        // Izvuci sve unikatne kategorije za dropdown
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
    <div style={{ padding: '20px' }}>
      <h2>Dostupni kvizovi</h2>

      <button
        onClick={handleViewMyResults}
        style={{
          marginBottom: '20px',
          padding: '10px 18px',
          backgroundColor: '#1976d2',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontWeight: 'bold',
          cursor: 'pointer'
        }}
      >
        Pogledaj moje rezultate
      </button>

      {/* Filteri */}
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Pretraži po nazivu/opisu"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ marginRight: '10px', padding: '6px' }}
        />

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{ marginRight: '10px', padding: '6px' }}
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
          style={{ marginRight: '10px', padding: '6px' }}
        >
          <option value="">Sve težine</option>
          <option value="easy">Lako</option>
          <option value="medium">Srednje</option>
          <option value="hard">Teško</option>
        </select>

        <button
          onClick={handleFilter}
          style={{
            padding: '8px 16px',
            backgroundColor: '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Filtriraj
        </button>
      </div>

      {quizzes.length === 0 ? (
        <p>Nema dostupnih kvizova.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {quizzes.map((quiz) => (
            <li
              key={quiz.id}
              style={{
                marginBottom: '20px',
                padding: '16px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                backgroundColor: '#f9f9f9'
              }}
            >
              <h3>{quiz.title}</h3>
              <p><strong>Kategorija:</strong> {quiz.category}</p>
              <p><strong>Opis:</strong> {quiz.description}</p>
              <p><strong>Težina:</strong> {quiz.difficulty}</p>
              <p><strong>Broj pitanja:</strong> {quiz.questionCount}</p>
              <p><strong>Vremensko ograničenje:</strong> {quiz.timeLimit} sekundi</p>
              <button
                onClick={() => handleStartQuiz(quiz.id)}
                style={{
                  marginTop: '10px',
                  padding: '10px 18px',
                  backgroundColor: '#388e3c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Pokreni kviz
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Quizzes;
