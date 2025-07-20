// src/pages/ResultDetails.tsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getResultDetails } from '../services/ResultService';
import { ResultDetailsDto } from '../models/Result';

const ResultDetails: React.FC = () => {
  const { id } = useParams();
  const [result, setResult] = useState<ResultDetailsDto | null>(null);
  const [loading, setLoading] = useState(true);

 useEffect(() => {
    const fetchResultDetails = async () => {
      try {
        const data = await getResultDetails(Number(id));
        console.log("Fetched result details:", data);
        setResult(data);
      } catch (error) {
        console.error("Greška pri dohvatanju rezultata:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchResultDetails();
  }, [id]);

  if (loading) return <div>Učitavanje...</div>;
  if (!result) return <div>Rezultat nije pronađen.</div>;

  return (
  <div className="p-6">
    <h2 className="text-xl font-bold mb-4">{result.quizTitle} - Detalji rezultata</h2>
    <p className="mb-2">Trajanje: {result.duration} sekundi</p>
    <p className="mb-4">Procenat: {result.percentage}% | Poeni: {result.points}</p>

    {result.answers.map((q, idx) => (
      <div key={q.questionId} className="mb-4 p-3 border rounded">
        <p className="font-semibold">{idx + 1}. {q.questionText}</p>
        <p className="text-sm">Tip: {q.type}</p>
        <p className={`mt-1 ${q.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
          Tvoj odgovor: {q.userAnswers.length > 0 ? q.userAnswers.join(', ') : 'Nema odgovora'}
        </p>
        {!q.isCorrect && (
          <p className="text-green-600">Tačan odgovor: {q.correctAnswers.join(', ')}</p>
        )}
      </div>
    ))}
  </div>
);

};

export default ResultDetails;
