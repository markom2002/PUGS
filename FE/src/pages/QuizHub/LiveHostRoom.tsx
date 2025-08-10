import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import liveQuizHubService from "../../services/QuizHub/LiveQuizHubService";
import "../css/QuizHub/LiveHostRoom.css";

const LiveHostRoom: React.FC = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const [players, setPlayers] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [countdown, setCountdown] = useState(60);  // 60 sec countdown timer
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const [quizStarted, setQuizStarted] = useState(false);

  const handleStartQuiz = async () => {
    if (!roomCode) return;
    try {
      const token = localStorage.getItem("token") || "";
      await axios.post(`/api/livequiz/start?roomCode=${roomCode}`, null, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setQuizStarted(true);
      console.log("✅ Kviz pokrenut");
      if (countdownRef.current) clearInterval(countdownRef.current);
    } catch (err) {
      console.error("❌ Greška pri pokretanju kviza:", err);
    }
  };

  useEffect(() => {
    if (quizStarted) return; // Kad je kviz startovan, ne odbrojavamo dalje

    // Countdown interval - svake sekunde smanji countdown za 1
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          handleStartQuiz();  // Kad istekne 0, startuj kviz automatski
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, [quizStarted, roomCode]);

  useEffect(() => {
    const userName = localStorage.getItem("userName") || "Host";

    const fetchParticipants = async () => {
      if (!roomCode) return;
      try {
        const token = localStorage.getItem("token") || "";
        const res = await axios.get<string[]>(`/api/livequiz/participants/${roomCode}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPlayers(res.data);
        setLoaded(true);
      } catch (err) {
        console.error("Greška pri učitavanju učesnika:", err);
        setLoaded(true);
      }
    };

    const connect = async () => {
      if (!roomCode) return;

      await fetchParticipants();

      liveQuizHubService.onUserJoined((newUser) => {
        setPlayers((prev) => {
          if (prev.includes(newUser)) return prev;
          return [...prev, newUser];
        });
      });

      liveQuizHubService.onUsersUpdated((usernames) => {
        setPlayers(usernames);
      });

      await liveQuizHubService.startConnection(roomCode, userName);
    };

    connect();

    return () => {
      liveQuizHubService.stopConnection();
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [roomCode]);

  return (
    <div className="live-host-container">
      <h2>Soba kreirana!</h2>
      <p>
        <strong>Room Code:</strong> {roomCode}
      </p>
      <p>Čekanje da se igrači priključe...</p>

      <div className="players-list">
        <h3>Priključeni igrači:</h3>
        {loaded && players.length > 0 && (
          <ul>
            {players
              .filter((player) => player.toLowerCase() !== "admin")
              .map((player, idx) => (
                <li key={idx}>{player}</li>
              ))}
          </ul>
        )}
      </div>

      <p><strong>Početak kviza za: {countdown}s</strong></p>

      {players.length > 0 && !quizStarted && (
        <button onClick={handleStartQuiz} className="start-quiz-button">
          Pokreni kviz ranije
        </button>
      )}
    </div>
  );
};

export default LiveHostRoom;
