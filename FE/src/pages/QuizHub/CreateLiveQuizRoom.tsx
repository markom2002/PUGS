import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

import "../css/QuizHub/CreateLiveQuizRoom.css";

interface Quiz {
  id: number;
  title: string;
}

const CreateLiveQuizRoom: React.FC = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState<number | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const res = await axios.get("/api/quizzes"); 
        setQuizzes(res.data);
      } catch (err) {
        console.error("Greška pri dohvatanju kvizova", err);
      }
    };
    fetchQuizzes();
  }, []);

  const handleCreateRoom = async () => {
    console.log("Kliknuto na Kreiraj sobu");
    if (selectedQuizId === null || selectedQuizId <= 0) {
      alert("Molimo odaberite kviz pre kreiranja sobe.");
      return;
    }

    try {
      const token = localStorage.getItem("token"); 

      const res = await axios.post(
        "/api/livequiz/create",
        { quizId: selectedQuizId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("Soba kreirana:", res.data);
      setRoomCode(res.data.roomCode);
      navigate(`/live-host/${res.data.roomCode}`);
    } catch (err) {
      console.error("Greška pri kreiranju sobe", err);
    }
  };

  const handleStartQuiz = async () => {
    if (!roomCode) return;

    try {
      await axios.post(`/api/livequiz/start?roomCode=${roomCode}`);
      alert("Kviz je pokrenut!");
    } catch (err) {
      console.error("Greška pri pokretanju kviza", err);
    }
  };

  return (
    <div className="create-live-quiz-container">
      <h2 className="create-live-quiz-title">Kreiraj Live Quiz Sobu</h2>

      <div className="form-group">
        <label className="form-label">Odaberi kviz:</label>
        <select
          className="quiz-select"
          onChange={(e) => setSelectedQuizId(Number(e.target.value))}
          value={selectedQuizId ?? ""}
        >
          <option value="">-- Odaberi kviz --</option>
          {quizzes.map((quiz) => (
            <option key={quiz.id} value={quiz.id}>
              {quiz.title}
            </option>
          ))}
        </select>
      </div>

      <button className="button button-create" onClick={handleCreateRoom}>
        Kreiraj sobu
      </button>

      {roomCode && (
        <div className="room-code-container">
          <p>
            <strong>Room code:</strong> {roomCode}
          </p>
          <button className="button button-start" onClick={handleStartQuiz}>
            Pokreni kviz
          </button>
        </div>
      )}
    </div>
  );
};

export default CreateLiveQuizRoom;
