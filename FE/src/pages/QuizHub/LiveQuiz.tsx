// src/pages/LiveQuiz.tsx
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import liveQuizHubService from "../../services/QuizHub/LiveQuizHubService";
import "../css/QuizHub/LiveQuiz.css";


interface Question {
  id: number;
  text: string;
  options: { id: number; text: string }[];
  allowMultipleAnswers: boolean;
  type: string;
}

interface LeaderboardEntry {
  username: string;
  score: number;
  correctAnswers: number;
  totalTime: number;
}

const LiveQuiz: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const storedRoomCode = localStorage.getItem("roomCode");
  const storedUserName = localStorage.getItem("userName");

  const storedUserId = localStorage.getItem("userId");
  const userId = storedUserId ? parseInt(storedUserId) : null;

  const roomCode = storedRoomCode || location.state?.roomCode;
  const userName = storedUserName || location.state?.userName;

  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selectedOptionIds, setSelectedOptionIds] = useState<number[]>([]);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizEnded, setQuizEnded] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [questionStartTime, setQuestionStartTime] = useState<number | null>(null);
  const [textAnswer, setTextAnswer] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [answerSubmitted, setAnswerSubmitted] = useState(false);

  useEffect(() => {
    if (!roomCode || !userName) {
      navigate("/");
      return;
    }

    localStorage.setItem("userName", userName);
    localStorage.setItem("roomCode", roomCode);

    


    liveQuizHubService.onQuizStarted(() => {
      console.log("🎯 QuizStarted primljen");
      setQuizStarted(true);
      setQuizEnded(false);
      setCurrentQuestion(null);
      setAnswerSubmitted(false);
      setLeaderboard([]);
    });

    liveQuizHubService.onReceiveQuestion((question) => {
      console.log("📥 Primljeno pitanje:", question);
      setCurrentQuestion(question);
      setSelectedOptionIds([]);
      setTextAnswer("");
      setAnswerSubmitted(false);
      setQuestionStartTime(Date.now());
      setTimeLeft(9); // 9 sekundi po pitanju
    });

    liveQuizHubService.onUpdateLeaderboard((data: LeaderboardEntry[]) => {
  console.log("📊 Leaderboard update:", data);
  setLeaderboard(data);
});

    liveQuizHubService.onQuizEnded(() => {
      console.log("🏁 Kviz završen");
      setQuizEnded(true);
      setCurrentQuestion(null);
      setQuizStarted(false);
      setAnswerSubmitted(false);
      setTimeLeft(0);
    });

  

    const connect = async () => {
      await liveQuizHubService.startConnection(roomCode, userName);
    };

    connect();

    // Odbrojavanje vremena po pitanju
    if (currentQuestion && timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);

      if (timeLeft === 0 && !answerSubmitted) {
        handleSubmitAnswer();
      }

      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode, userName, navigate, timeLeft, currentQuestion]);

  const handleOptionToggle = (optionId: number) => {
    if (!currentQuestion) return;
    if (answerSubmitted) return;
    if (currentQuestion.allowMultipleAnswers) {
      setSelectedOptionIds((prev) =>
        prev.includes(optionId)
          ? prev.filter((id) => id !== optionId)
          : [...prev, optionId]
      );
    } else {
      setSelectedOptionIds([optionId]);
    }
  };

  

const handleSubmitAnswer = () => {
  if (!currentQuestion || questionStartTime === null || answerSubmitted) return;
  const durationMs = Date.now() - questionStartTime;
  if (userId === null) {
    console.error("User ID nije definisan!");
    return;
  }

  // Za tekstualno pitanje ne šalji selectedOptionIds
  const optionsToSend = currentQuestion.type === "text" ? [] : selectedOptionIds;

  liveQuizHubService.sendAnswer(
    roomCode!,
    userId,
    currentQuestion.id,
    optionsToSend,
    textAnswer,
    durationMs
  );
  setAnswerSubmitted(true);
  setCurrentQuestion(null);
  setTimeLeft(0);
};




  return (
    <div className="live-quiz-container">
      {!quizStarted && !quizEnded && <p>Čeka se početak kviza...</p>}

      {quizStarted && currentQuestion && (
        <div>
          <h2>{currentQuestion.text}</h2>
          <div className="live-quiz-timer">Vreme za odgovor: {timeLeft}s</div>
          <div className="options-list">
            {currentQuestion.type === "text" ? (
              <input
                type="text"
                className="text-answer-input"
                placeholder="Unesite odgovor..."
                value={textAnswer}
                disabled={answerSubmitted}
                onChange={(e) => setTextAnswer(e.target.value)}
              />
            ) : (
              currentQuestion.options.map((opt) => (
                <div key={opt.id}>
                  <label>
                    <input
                      type={currentQuestion.allowMultipleAnswers ? "checkbox" : "radio"}
                      name="option"
                      checked={selectedOptionIds.includes(opt.id)}
                      disabled={answerSubmitted}
                      onChange={() => handleOptionToggle(opt.id)}
                    />
                    <span>{opt.text}</span>
                  </label>
                </div>
              ))
            )}
          </div>
          <button
            className="submit-answer-button"
            disabled={answerSubmitted}
            onClick={handleSubmitAnswer}
          >
            Pošalji odgovor
          </button>
        </div>
      )}

      {quizStarted && !currentQuestion && !quizEnded && (
        <p>⏳ Čekanje na sledeće pitanje...</p>
      )}

      {quizEnded && (
  <div className="results-container">
    <h2 className="results-title">🎉 Kviz je završen!</h2>
    <h3 className="results-subtitle">Rezultati:</h3>
    {leaderboard.length === 0 ? (
      <p className="no-results">Nema rezultata za prikaz.</p>
    ) : (
      <ul className="results-list">
        {leaderboard.map((entry, index) => (
          <li key={index} className="result-card">
            <div className="result-user">
              <span className="result-rank">#{index + 1}</span> {entry.username}
            </div>
            <div className="result-details">
              <div className="result-score">🏆 <strong>{entry.score}</strong> poena</div>
              <div className="result-correct">✔️ {entry.correctAnswers} tačnih odgovora</div>
              <div className="result-time">⏱️ {entry.totalTime.toFixed(2)} s</div>
            </div>
          </li>
        ))}
      </ul>
    )}
  </div>
)}


    </div>
  );
};

export default LiveQuiz;