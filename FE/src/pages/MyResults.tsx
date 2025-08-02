import React, { useEffect, useState } from 'react';
import { getUserResults } from '../services/ResultService';
import { UserResult } from '../models/UserResult';
import { Link } from 'react-router-dom';
import './css/MyResults.css'; // 👈 dodaj ovo

const MyResults: React.FC = () => {
  const [results, setResults] = useState<UserResult[]>([]);
  const userId = Number(localStorage.getItem('userId'));

  useEffect(() => {
    if (userId) {
      getUserResults(userId).then(data => {
        setResults(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      }).catch(err => {
        console.error('Greška prilikom dobijanja rezultata:', err);
      });
    }
  }, [userId]);

  const totalPoints = results.reduce((sum, r) => sum + r.points, 0);

  return (
    <div className="results-container">
      <h2 className="results-title">Moji rezultati</h2>
      {results.length === 0 ? (
        <p>Nemate nijedan rezultat.</p>
      ) : (
        <>
          <table className="results-table">
            <thead>
              <tr>
                <th>Naziv kviza</th>
                <th>Tačni odgovori</th>
                <th>Procenat</th>
                <th>Poeni</th>
                <th>Vreme</th>
                <th>Datum</th>
                <th>Detalji</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, index) => (
                <tr key={index}>
                  <td>{r.quizTitle}</td>
                  <td>{r.correctAnswers}</td>
                  <td>{r.percentage}%</td>
                  <td>{r.points}</td>
                  <td>{r.duration} s</td>
                  <td>
                    {new Date(r.createdAt).toLocaleString('sr-Latn-RS', {
                      timeZone: 'Europe/Belgrade',
                      hour12: false,
                    })}
                  </td>
                  <td>
                    <Link to={`/result-details/${r.id}`} className="results-link">
                      Detalji
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="total-points">Ukupan broj poena: {totalPoints}</div>
        </>
      )}
    </div>
  );
};

export default MyResults;
