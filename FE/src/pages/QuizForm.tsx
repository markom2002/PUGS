// src/pages/QuizForm.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getQuizById, deleteQuestionById, updateQuizWithDetails, createQuizWithDetails } from '../services/QuizService';
import { QuizDetailsDto } from '../models/Quiz';
import { QuestionDto } from '../models/Question';
import QuestionForm from './QuestionForm';
import './css/QuizForm.css';

const QuizForm: React.FC = () => {
  const { id } = useParams();
  const quizId = id ? Number(id) : undefined;
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState<Partial<QuizDetailsDto>>({
    title: '',
    description: '',
    category: '',
    difficulty: '',
    questionCount: 0,
    timeLimit: 300,
    questions: [] as QuestionDto[],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stanje za trenutno pitanje koje se edituje
  const [editingQuestion, setEditingQuestion] = useState<QuestionDto | null>(null);

  useEffect(() => {
    if (quizId) {
      setLoading(true);
      getQuizById(quizId)
        .then((data) => {
          setQuiz({
            id: data.id,
            title: data.title,
            description: data.description,
            category: data.category,
            difficulty: data.difficulty,
            questionCount: data.questionCount,
            timeLimit: data.timeLimit,
            questions: data.questions || [],
          });
          setLoading(false);
        })
        .catch(() => {
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

  // Dodavanje novog praznog pitanja za editovanje
  const handleAddQuestion = () => {
    const newQuestion: QuestionDto = {
      id: Math.floor(Math.random() * -1000000), // negativan ID privremeno
      text: '',
      type: 'single',
      points: 1,
      quizId: quiz?.id || 0,
      allowMultipleAnswers: false,
      options: [],
    };
    setEditingQuestion(newQuestion);
  };

  // Čuvanje pitanja iz QuestionForm
 const handleSaveQuestion = async (question: QuestionDto) => {
  let updatedQuestions = quiz.questions ? [...quiz.questions] : [];
  const index = updatedQuestions.findIndex(q => q.id === question.id);
  if (index >= 0) {
    updatedQuestions[index] = question;
  } else {
    updatedQuestions.push(question);
  }

  setQuiz((prev) => ({
    ...prev,
    questions: updatedQuestions,
    questionCount: updatedQuestions.length,
  }));

  setEditingQuestion(null);
};



  const handleCancelQuestion = () => {
    setEditingQuestion(null);
  };

  const handleEditQuestion = (id: number) => {
    if (!quiz.questions) return;
    const q = quiz.questions.find((q) => q.id === id);
    if (q) setEditingQuestion(q);
  };

  const handleDeleteQuestion = async (id: number) => {
    if (!quiz.questions) return;
    if (window.confirm('Da li ste sigurni da želite da obrišete pitanje?')) {
      await deleteQuestionById(id);
      setQuiz((prev) => {
        const questions = prev.questions ? prev.questions.filter((q) => q.id !== id) : [];
        return {
          ...prev,
          questions,
          questionCount: questions.length,
        };
      });
      
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError(null);

  if (!quiz.title || !quiz.difficulty) {
    setError('Naziv i težina kviza su obavezni.');
    return;
  }

  try {
    if (quizId) {
      // Ako postoji ID - update kviza sa detaljima
      await updateQuizWithDetails(quizId, quiz as QuizDetailsDto);
      alert('Kviz uspešno izmenjen');
    } else {
      // Kreiranje novog kviza sa detaljima
      const createDto = {
        title: quiz.title!,
        description: quiz.description ?? '',
        difficulty: quiz.difficulty!,
        timeLimit: quiz.timeLimit ?? 300,
        category: quiz.category ?? '',
        questions: (quiz.questions ?? []).map(q => ({
          text: q.text,
          type: q.type,
          points: q.points,
          allowMultipleAnswers: q.allowMultipleAnswers,
          correctTextAnswer: q.correctTextAnswer ?? '',
          options: (q.options ?? []).map(o => ({
            text: o.text,
            isCorrect: o.isCorrect,
          })),
        })),
      };

      await createQuizWithDetails(createDto);
      alert('Kviz uspešno kreiran');
    }

    navigate('/admin/quiz-manager');
  } catch (err) {
    setError('Greška pri čuvanju kviza');
  }
};


  if (loading) return <p>Učitavanje kviza...</p>;

   if (loading) return <p>Učitavanje kviza...</p>;

  return (
    <div className="quiz-form-container">
      <h1>{quizId ? 'Izmeni kviz' : 'Kreiraj novi kviz'}</h1>
      {error && <p className="error-msg">{error}</p>}

      <form onSubmit={handleSubmit}>
        <div>
          <label>Naziv</label>
          <input
            type="text"
            name="title"
            value={quiz.title || ''}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label>Opis</label>
          <textarea
            name="description"
            value={quiz.description || ''}
            onChange={handleChange}
            rows={3}
          />
        </div>

        <div>
          <label>Kategorija</label>
          <input
            type="text"
            name="category"
            value={quiz.category || ''}
            onChange={handleChange}
          />
        </div>

        <div>
          <label>Težina</label>
          <select
            name="difficulty"
            value={quiz.difficulty || ''}
            onChange={handleChange}
            required
          >
            <option value="">Izaberi težinu</option>
            <option value="easy">Laka</option>
            <option value="medium">Srednja</option>
            <option value="hard">Teška</option>
          </select>
        </div>

        <div>
          <label>Vremenski limit (sekundi)</label>
          <input
            type="number"
            name="timeLimit"
            value={quiz.timeLimit ?? 300}
            onChange={handleChange}
            min={10}
            required
          />
        </div>

        <hr />

        <div>
          <h2>Pitanja ({quiz.questionCount || 0})</h2>

          {quiz.questions && quiz.questions.length > 0 ? (
            <ul className="question-list">
              {quiz.questions.map((q) => (
                <li key={q.id}>
                  <span>{q.text || <i>(bez teksta)</i>}</span>
                  <div>
                    <button
                      type="button"
                      onClick={() => handleEditQuestion(q.id)}
                      className="edit-btn"
                    >
                      Izmeni
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteQuestion(q.id)}
                      className="delete-btn"
                    >
                      Obriši
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p>Nema pitanja u kvizu.</p>
          )}

          <button
            type="button"
            onClick={handleAddQuestion}
            className="add-question-btn"
          >
            Dodaj pitanje
          </button>
        </div>

       

        <div className="submit-btn-container">
          <button type="submit" className="submit-btn">
            {quizId ? 'Sačuvaj izmene' : 'Kreiraj kviz'}
          </button>
        </div>
      </form>
       {editingQuestion && (
          <div className="editing-question-container">
            <h3>Uređivanje pitanja</h3>
            <QuestionForm
              initialData={editingQuestion}
              onSave={handleSaveQuestion}
              onCancel={handleCancelQuestion}
            />
          </div>
        )}
    </div>
  );
};

export default QuizForm;
