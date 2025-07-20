import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getQuizById, createQuiz, updateQuiz } from '../services/QuizService';
import { QuizDto } from '../models/Quiz';

const QuizForm: React.FC = () => {
  const { id } = useParams();
  const quizId = id ? Number(id) : undefined;
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState<Partial<QuizDto>>({
    title: '',
    description: '',
    category: '',
    difficulty: '',
    questionCount: 0,
    timeLimit: 300,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (quizId) {
      setLoading(true);
      console.log('Fetching quiz with id:', quizId);
      getQuizById(quizId)
        .then((data) => {
          console.log('Quiz data:', data);
          setQuiz({
            id: data.id,
            title: data.title,
            description: data.description,
            category: data.category,
            difficulty: data.difficulty,
            questionCount: data.questionCount,
            timeLimit: data.timeLimit,
          });
          setLoading(false);
        })
        .catch((e) => {
          console.error('Error fetching quiz:', e);
          setError('Greška pri učitavanju kviza.');
          setLoading(false);
        });
    }
  }, [quizId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setQuiz((prev) => ({
      ...prev,
      [name]: name === 'timeLimit' ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (quizId) {
        // Izmena
        await updateQuiz(quizId, quiz as QuizDto);
        alert('Kviz uspešno izmenjen');
      } else {
        // Kreiranje
        await createQuiz(quiz as QuizDto);
        alert('Kviz uspešno kreiran');
      }
      navigate('/admin/quiz-manager');
    } catch (err) {
      console.error(err);
      setError('Greška pri čuvanju kviza');
    }
  };

  if (loading) return <p>Učitavanje kviza...</p>;

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">{quizId ? 'Izmeni kviz' : 'Kreiraj novi kviz'}</h1>
      {error && <p className="text-red-600 mb-4">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1 font-semibold">Naziv</label>
          <input
            type="text"
            name="title"
            value={quiz.title || ''}
            onChange={handleChange}
            className="w-full border border-gray-400 rounded p-2"
            required
          />
        </div>

        <div>
          <label className="block mb-1 font-semibold">Opis</label>
          <textarea
            name="description"
            value={quiz.description || ''}
            onChange={handleChange}
            className="w-full border border-gray-400 rounded p-2"
            rows={3}
          />
        </div>

        <div>
          <label className="block mb-1 font-semibold">Kategorija</label>
          <input
            type="text"
            name="category"
            value={quiz.category || ''}
            onChange={handleChange}
            className="w-full border border-gray-400 rounded p-2"
          />
        </div>

        <div>
          <label className="block mb-1 font-semibold">Težina</label>
          <select
            name="difficulty"
            value={quiz.difficulty || ''}
            onChange={handleChange}
            className="w-full border border-gray-400 rounded p-2"
          >
            <option value="">Izaberi težinu</option>
            <option value="easy">Laka</option>
            <option value="medium">Srednja</option>
            <option value="hard">Teška</option>
          </select>
        </div>

        <div>
          <label className="block mb-1 font-semibold">Vremenski limit (sekundi)</label>
          <input
            type="number"
            name="timeLimit"
            value={quiz.timeLimit ?? 300}
            onChange={handleChange}
            className="w-full border border-gray-400 rounded p-2"
            min={10}
            required
          />
        </div>

        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {quizId ? 'Sačuvaj izmene' : 'Kreiraj kviz'}
        </button>
      </form>
    </div>
  );
};

export default QuizForm;
export {};
