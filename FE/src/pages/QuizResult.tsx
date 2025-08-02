// src/pages/QuizResult.tsx
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './css/QuizResult.css';

interface QuestionResult {
  id: number;
  text: string;
  type: string;
  userAnswer: string | string[];
  correctAnswer: string | string[];
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

  if (!result) {
    return <div className="quiz-result-container">Nema podataka o rezultatu.</div>;
  }

  const formatAnswer = (answer: string | string[], type: string) => {
    if (type === 'text') {
      return Array.isArray(answer) ? answer[0] || 'Nema odgovora' : answer || 'Nema odgovora';
    }
    if (type === 'multiple') {
      return Array.isArray(answer) ? (answer.length ? answer.join(', ') : 'Nema odgovora') : answer || 'Nema odgovora';
    }
    return Array.isArray(answer) ? answer[0] || 'Nema odgovora' : answer || 'Nema odgovora';
  };

  return (
    <div className="quiz-result-container">
      <h1 className="quiz-result-title">Rezultat kviza</h1>

      {result.quizTitle && (
        <p className="result-info"><strong>Naziv kviza:</strong> {result.quizTitle}</p>
      )}
      <p className="result-info"><strong>Tačnih odgovora:</strong> {result.correctAnswers}</p>
      <p className="result-info"><strong>Procenat:</strong> {result.percentage}%</p>
      {result.points !== undefined && (
        <p className="result-info"><strong>Poeni:</strong> {result.points}</p>
      )}
      <p className="result-info"><strong>Vreme:</strong> {result.duration}</p>

      {result.questions && result.questions.length > 0 && (
        <>
          <hr style={{ margin: '24px 0' }} />
          <h2 className="quiz-result-subtitle">Pitanja i odgovori</h2>
          <div>
            {result.questions.map((q, idx) => (
              <div
                key={q.id}
                className={`question-block ${q.isCorrect ? 'correct-answer' : 'incorrect-answer'}`}
              >
                <p className="question-text"><strong>{idx + 1}. {q.text}</strong></p>
                <p><strong>Tip:</strong> {q.type}</p>

                <p>
                  <strong>Tvoj odgovor:</strong>{' '}
                  {formatAnswer(q.userAnswer, q.type)}
                </p>

                {(!q.isCorrect || (q.correctAnswer && (Array.isArray(q.correctAnswer) ? q.correctAnswer.length > 0 : q.correctAnswer !== ''))) && (
                  <p>
                    <strong>Tačan odgovor:</strong>{' '}
                    {formatAnswer(q.correctAnswer, q.type)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <button onClick={() => navigate('/quizzes')} className="back-button">
        Nazad na kvizove
      </button>
    </div>
  );
};

export default QuizResult;
