// src/pages/QuizResult.tsx
import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface QuestionResult {
  id: number;
  text: string;
  type: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
}

interface QuizResultState {
  quizId: number;
  quizTitle?: string;
  correctAnswers: number;
  percentage: number;
  duration: string;
  userId?: number;
  points?: number;
  questions?: QuestionResult[];
}

const QuizResult: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const result = location.state as QuizResultState | null;

  useEffect(() => {
    if (result?.userId) {
      localStorage.setItem('userId', result.userId.toString());
    }
  }, [result]);

  if (!result) {
    return <div className="p-6">Nema podataka o rezultatu.</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Rezultat kviza</h1>

      {result.quizTitle && (
        <p><strong>Naziv kviza:</strong> {result.quizTitle}</p>
      )}

      <p><strong>Tačnih odgovora:</strong> {result.correctAnswers}</p>
      <p><strong>Procenat:</strong> {result.percentage}%</p>
      {result.points !== undefined && (
        <p><strong>Poeni:</strong> {result.points}</p>
      )}
      <p><strong>Vreme:</strong> {result.duration}</p>

      {/* Prikaz pitanja sa odgovorima */}
      {result.questions && result.questions.length > 0 && (
        <>
          <hr className="my-6" />
          <h2 className="text-xl font-semibold mb-4">Pitanja i odgovori</h2>
          <div className="space-y-4">
            {result.questions.map((q, idx) => (
              <div
                key={q.id}
                className={`p-4 rounded border-l-4 ${
                  q.isCorrect ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'
                }`}
              >
                <p className="font-semibold">{idx + 1}. {q.text}</p>
                <p><strong>Tip:</strong> {q.type}</p>
                <p><strong>Tvoj odgovor:</strong> {q.userAnswer || 'Nema odgovora'}</p>
                {!q.isCorrect && (
                  <p><strong>Tačan odgovor:</strong> {q.correctAnswer || 'Nema odgovora'}</p>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <button
        onClick={() => navigate('/quizzes')}
        className="mt-6 px-4 py-2 bg-blue-600 text-white rounded"
      >
        Nazad na kvizove
      </button>
    </div>
  );
};

export default QuizResult;
