import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getResultDetails, getUserQuizAttempts } from '../services/ResultService';
import { ResultDetailsDto, QuizAttemptDto } from '../models/Result';
import ProgressChart from './ProgressChart';
import { UserAttempt } from "./ProgressChart";
import './css/ResultDetails.css';



const ResultDetails: React.FC = () => {
  const { id } = useParams();
  const [result, setResult] = useState<ResultDetailsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState<QuizAttemptDto[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const resultData = await getResultDetails(Number(id));
        setResult(resultData);

        const attemptsData = await getUserQuizAttempts(resultData.quizId);
        setAttempts(attemptsData);
      } catch (error) {
        console.error("Greška pri dohvatanju podataka:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) return <div>Učitavanje...</div>;
  if (!result) return <div>Rezultat nije pronađen.</div>;

  // Mapiranje u tip koji ProgressChart očekuje
  const formattedAttempts: UserAttempt[] = attempts.map(a => ({
    attemptDate: a.createdAt,   // proveri da li je 'createdAt' ili 'attemptDate' u QuizAttemptDto
    points: a.points,
    percentage: a.percentage,
  }));

  return (
    <div className="result-container">
      <h2 className="result-title">{result.quizTitle} - Detalji rezultata</h2>
      <p className="result-info">Trajanje: {result.duration} sekundi</p>
      <p className="result-info">Procenat: {result.percentage}% | Poeni: {result.points}</p>

      {result.answers.map((q, idx) => (
        <div key={q.questionId} className="answer-box">
          <p className="question-text">{idx + 1}. {q.questionText}</p>
          <p className="question-type">Tip: {q.type}</p>
          <p className={q.isCorrect ? 'correct' : 'incorrect'}>
            Tvoj odgovor: {q.userAnswers.length > 0 ? q.userAnswers.join(', ') : 'Nema odgovora'}
          </p>
          {!q.isCorrect && (
            <p className="correct">Tačan odgovor: {q.correctAnswers.join(', ')}</p>
          )}
        </div>
      ))}

      {formattedAttempts.length > 0 && (
        <div className="chart-section" style={{ marginTop: '40px' }}>
          <h3>Grafikon napretka</h3>
          <ProgressChart attempts={formattedAttempts} />
        </div>
      )}
    </div>
  );
};

export default ResultDetails;
