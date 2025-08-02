// src/pages/AllUserResults.tsx
import React, { useEffect, useState } from 'react';
import { getAllUserResults } from '../services/ResultService';
import { UserResult } from '../models/UserResult';
import './css/AllUserResults.css';

const AllUserResults: React.FC = () => {
  const [results, setResults] = useState<UserResult[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const data = await getAllUserResults();
      setResults(data);
    };
    fetchData();
  }, []);

  return (
    <div className="results-page-container">
      <h2 className="results-title">Rezultati svih korisnika</h2>

      <div className="results-table-container">
        <table className="results-table">
          <thead>
            <tr>
              <th>Korisnik</th>
              <th>Kviz</th>
              <th>Datum</th>
              <th>Tačni odgovori</th>
              <th>Procenat</th>
              <th>Trajanje</th>
              <th>Poeni</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result) => (
              <tr key={result.id}>
                <td className="px-4 py-2 border">{result.username ?? 'Nepoznato'}</td>
                <td className="px-4 py-2 border">{result.quizTitle}</td>
                <td className="px-4 py-2 border">{new Date(result.createdAt).toLocaleString()}</td>
                <td className="px-4 py-2 border">{result.correctAnswers}</td>
                <td className="px-4 py-2 border">{result.percentage.toFixed(2)}%</td>
                <td className="px-4 py-2 border">{result.duration}</td>
                <td className="px-4 py-2 border">{result.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AllUserResults;
