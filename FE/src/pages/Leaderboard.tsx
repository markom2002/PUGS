import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { getAllQuizzes } from '../services/QuizService';
import { QuizDto } from '../models/Quiz';
import './css/Leaderboard.css';

const apiUrl = process.env.REACT_APP_API_URL || '';
axios.defaults.baseURL = apiUrl;

interface LeaderboardEntry {
  position: number;
  userName: string;
  points: number;
  createdAt: string;
}

const Leaderboard: React.FC = () => {
  const [quizId, setQuizId] = useState<number | null>(null);
  const [timePeriod, setTimePeriod] = useState('all');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [quizzes, setQuizzes] = useState<QuizDto[]>([]);

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const data = await getAllQuizzes();
        setQuizzes(data);
      } catch (error) {
        console.error('Greška prilikom učitavanja kvizova:', error);
      }
    };

    fetchQuizzes();
  }, []);

  useEffect(() => {
    const loadLeaderboard = () => {
      axios
        .post('/api/results/leaderboard', { quizId, timePeriod })
        .then(res => setEntries(res.data))
        .catch(err => console.error('Greška prilikom učitavanja rang liste:', err));
    };

    loadLeaderboard();
  }, [quizId, timePeriod]);

  return (
    <div className="leaderboard-container">
      <h1 className="leaderboard-title">Rang lista</h1>

      <div className="leaderboard-filters">
        <select
          value={quizId ?? ''}
          onChange={e => setQuizId(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">Svi kvizovi</option>
          {quizzes.map(q => (
            <option key={q.id} value={q.id}>
              {q.title}
            </option>
          ))}
        </select>

        <select value={timePeriod} onChange={e => setTimePeriod(e.target.value)}>
          <option value="all">Svi rezultati</option>
          <option value="weekly">Nedeljni</option>
          <option value="monthly">Mesečni</option>
        </select>
      </div>

      <div className="leaderboard-table-container">
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th>Pozicija</th>
              <th>Korisnik</th>
              <th>Poeni</th>
              <th>Vreme</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e, index) => (
              <tr key={index}>
                <td>{e.position}</td>
                <td>{e.userName}</td>
                <td>{e.points}</td>
                <td>{new Date(e.createdAt).toLocaleString('sr-RS')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Leaderboard;
