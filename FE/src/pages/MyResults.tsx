// src/pages/MyResults.tsx
import React, { useEffect, useState } from 'react';
import { getUserResults } from '../services/ResultService';
import { UserResult } from '../models/UserResult';
import { Link } from 'react-router-dom';

const MyResults: React.FC = () => {
  const [results, setResults] = useState<UserResult[]>([]);
  const userId = Number(localStorage.getItem('userId'));

  useEffect(() => {
    if (userId) {
      getUserResults(userId).then(data => {
        console.log('Dobijeni rezultati:', data);
        setResults(data);
      }).catch(err => {
        console.error('Greška prilikom dobijanja rezultata:', err);
      });
    } else {
      console.log('Nema userId u localStorage');
    }
  }, [userId]);

  const totalPoints = results.reduce((sum, r) => sum + r.points, 0);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-semibold mb-4">Moji rezultati</h2>
      {results.length === 0 ? (
        <p>Nemate nijedan rezultat.</p>
      ) : (
        <>
          <table className="min-w-full bg-white shadow rounded-lg">
            <thead>
              <tr>
                <th className="py-2 px-4 border">Naziv kviza</th>
                <th className="py-2 px-4 border">Tačni odgovori</th>
                <th className="py-2 px-4 border">Procenat</th>
                <th className="py-2 px-4 border">Poeni</th>
                <th className="py-2 px-4 border">Vreme</th>
                <th className="py-2 px-4 border">Datum</th>
                <th className="py-2 px-4 border">Detalji</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, index) => (
                <tr key={index}>
                  <td className="py-2 px-4 border">{r.quizTitle}</td>
                  <td className="py-2 px-4 border">{r.correctAnswers}</td>
                  <td className="py-2 px-4 border">{r.percentage}%</td>
                  <td className="py-2 px-4 border">{r.points}</td>
                  <td className="py-2 px-4 border">{r.duration}</td>
                  <td className="border px-4 py-2">
                    {new Date(r.createdAt).toLocaleString('sr-Latn-RS', {
                      timeZone: 'Europe/Belgrade',
                      hour12: false,
                    })}
                  </td>
                  <td className="py-2 px-4 border">
                    <Link
                      to={`/result-details/${r.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      Detalji
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 font-semibold text-lg">
            Ukupan broj poena: {totalPoints}
          </div>
        </>
      )}
    </div>
  );
};

export default MyResults;
