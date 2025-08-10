// src/pages/JoinLiveQuiz.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../css/QuizHub/JoinLiveQuiz.css";


const JoinLiveQuiz: React.FC = () => {
  const [roomCode, setRoomCode] = useState("");
  const [userName, setUserName] = useState("");
  const navigate = useNavigate();

  const handleJoin = () => {
  if (!roomCode || !userName) {
    alert("Unesite i kod sobe i korisničko ime.");
    return;
  }

  localStorage.setItem("roomCode", roomCode);
  localStorage.setItem("userName", userName);
  const token = localStorage.getItem("token");
if (!token) {
  alert("Morate biti ulogovani da biste se pridružili kvizu.");
  return;
}


  navigate("/live-quiz");
};

  return (
    <div className="join-live-quiz-container">
      <h2>Pridruži se Live Kvizu</h2>

      <div className="input-group">
        <label>Kod sobe:</label>
        <input
          type="text"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
        />
      </div>

      <div className="input-group">
        <label>Korisničko ime:</label>
        <input
          type="text"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
        />
      </div>

      <button className="join-button" onClick={handleJoin}>
        Pridruži se
      </button>
    </div>
  );
};

export default JoinLiveQuiz;
