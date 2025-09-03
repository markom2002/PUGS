// src/pages/TakeQuiz.tsx
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getQuizById } from '../services/QuizService';
import { submitQuizResult } from '../services/ResultService';
import { QuizDetailsDto } from '../models/Quiz';
import { QuestionDto } from '../models/Question';
import './css/TakeQuiz.css';

const TakeQuiz: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState<QuizDetailsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<{ [questionId: number]: any }>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hasSubmittedRef = useRef(false);

  const [isSubmitted, setIsSubmitted] = useState(false);

  
  useEffect(() => {
    setQuiz(null);
    setAnswers({});
    setTimeLeft(0);
    setIsSubmitted(false);
    setCurrentQuestionIndex(0);

    const fetchQuiz = async () => {
      if (!id) return;

      try {
        const data = await getQuizById(Number(id));
        setQuiz(data);
        startTimeRef.current = Date.now();
        setTimeLeft(data.timeLimit);

        timerRef.current = setInterval(() => {
          if (startTimeRef.current === null || hasSubmittedRef.current) return;

          const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
          const remaining = data.timeLimit - elapsed;

          if (remaining <= 0) {
            clearInterval(timerRef.current!);
            setTimeLeft(0);

            if (!hasSubmittedRef.current) {
              handleSubmit();
            }
          } else {
            setTimeLeft(remaining);
          }
        }, 250);
      } catch (error) {
        console.error('Greška pri učitavanju kviza:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuiz();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isSubmitted]);

  const handleAnswerChange = (question: QuestionDto, value: number | string) => {
    setAnswers((prev) => {
      const current = prev[question.id];

      if (question.type === 'text') {
        return { ...prev, [question.id]: value };
      }

      if (question.type === 'multiple' && question.allowMultipleAnswers) {
        const currentArray = Array.isArray(current) ? current : [];
        return {
          ...prev,
          [question.id]: currentArray.includes(value)
            ? currentArray.filter((v) => v !== value)
            : [...currentArray, value],
        };
      } else {
        return {
          ...prev,
          [question.id]: [value],
        };
      }
    });
  };

  const formatDuration = (seconds: number): string => {
    const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
    const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const calculateResults = () => {
    if (!quiz) return 0;

    let correctCount = 0;

    quiz.questions.forEach((question) => {
      const userAnswer = answers[question.id];

      if (question.type === 'single' || question.type === 'truefalse') {
        const correctOption = question.options.find((o) => o.isCorrect);
        if (userAnswer?.[0] === correctOption?.id) {
          correctCount++;
        }
      } else if (question.type === 'multiple') {
        const correctOptions = question.options.filter((o) => o.isCorrect).map((o) => o.id);
        const userOptions = Array.isArray(userAnswer) ? userAnswer : [];

        if (
          correctOptions.length === userOptions.length &&
          correctOptions.every((id) => userOptions.includes(id))
        ) {
          correctCount++;
        }
      } else if (question.type === 'fill'  || question.type === 'text') {
        const correctText = question.correctTextAnswer?.trim().toLowerCase() ?? '';
        const userText = (userAnswer || '').trim().toLowerCase();
        if (userText === correctText && correctText !== '') {
          correctCount++;
        }
      }
    });

    return correctCount;
  };

  const calculatePoints = () => {
    if (!quiz) return 0;

    let totalPoints = 0;

    quiz.questions.forEach((question) => {
      const userAnswer = answers[question.id];
      let isCorrect = false;

      if (question.type === 'single' || question.type === 'truefalse') {
        const correctOption = question.options.find((o) => o.isCorrect);
        isCorrect = userAnswer?.[0] === correctOption?.id;
      } else if (question.type === 'multiple') {
        const correctOptions = question.options.filter((o) => o.isCorrect).map((o) => o.id);
        const userOptions = Array.isArray(userAnswer) ? userAnswer : [];
        isCorrect = correctOptions.length === userOptions.length && correctOptions.every((id) => userOptions.includes(id));
      } else if (question.type === 'fill' || question.type === 'text') {
        const correctText = question.correctTextAnswer?.trim().toLowerCase() ?? '';
        const userText = (userAnswer || '').trim().toLowerCase();
        isCorrect = userText === correctText && correctText !== '';
      }

      if (isCorrect) {
        totalPoints += question.points;
      }
    });

    return totalPoints;
  };

  const handleSubmit = async () => {
    if (hasSubmittedRef.current) return;

    hasSubmittedRef.current = true;

    setIsSubmitted(true);

    if (!quiz || !startTimeRef.current) {
      navigate('/results', { state: { message: 'Kviz nije dostupan' } });
      return;
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    const endTime = new Date();
    const durationSeconds = Math.floor((endTime.getTime() - startTimeRef.current) / 1000);
    const durationStr = formatDuration(durationSeconds);

    const correctAnswers = calculateResults();
    const percentage = Math.round((correctAnswers / quiz.questions.length) * 100);
    const points = calculatePoints();

    const formattedAnswers = quiz.questions.map((question) => {
      const answer = answers[question.id];
      return {
        questionId: question.id,
        selectedOptionIds: Array.isArray(answer) ? answer.map(String) : [],
        userAnswer: typeof answer === 'string' ? answer : undefined,
      };
    });

    const userId = localStorage.getItem('userId');

    const payload = {
      userId: userId ? parseInt(userId) : undefined,
      quizId: quiz.id,
      correctAnswers,
      percentage,
      points,
      answers: formattedAnswers,
      duration: durationStr,
    };

    try {
      await submitQuizResult(payload);

      const resultState = {
        quizId: quiz.id,
        quizTitle: quiz.title,
        correctAnswers,
        percentage,
        points,
        duration: durationStr,
        questions: quiz.questions.map((question) => ({
          id: question.id,
          text: question.text,
          type: question.type,
          userAnswer: (() => {
            const ans = answers[question.id];
            if (question.type === 'fill' || question.type === 'text') {
              return typeof ans === 'string' ? ans : 'Nema odgovora';
            }
            if (Array.isArray(ans)) {
              if (ans.length === 0) return 'Nema odgovora';
              return ans
                .map((optId: number) => {
                  const opt = question.options.find((o) => o.id === optId);
                  return opt ? opt.text : '';
                })
                .filter((t) => t)
                .join(', ');
            }
            return 'Nema odgovora';
          })(),
          correctAnswer: (() => {
            if (question.type === 'text' || question.type === 'fill') {
    
            return question.correctTextAnswer ?? 'Nema odgovora';
            }
          const correctOpts = question.options.filter((o) => o.isCorrect && o.text?.trim()).map((o) => o.text!.trim());
          return correctOpts.length > 0 ? correctOpts.join(', ') : 'Nema odgovora';
          })(),

          isCorrect: (() => {
            if (!quiz) return false;
            if (question.type === 'fill' || question.type === 'text') {
              const userAns = answers[question.id];
              const correctText = question.correctTextAnswer?.trim().toLowerCase() ?? '';
              return typeof userAns === 'string' && userAns.trim().toLowerCase() === correctText && correctText !== '';
            }
            if (question.type === 'single' || question.type === 'truefalse') {
              const userAns = answers[question.id];
              const correctOpt = question.options.find((o) => o.isCorrect);
              return userAns?.[0] === correctOpt?.id;
            }
            if (question.type === 'multiple') {
              const userAns = answers[question.id];
              const correctOpts = question.options.filter((o) => o.isCorrect).map((o) => o.id);
              if (!Array.isArray(userAns)) return false;
              return correctOpts.length === userAns.length && correctOpts.every((id) => userAns.includes(id));
            }
            return false;
          })(),
        })),
      };

      navigate('/results', { state: resultState, replace: true });
    } catch (error) {
      console.error('Greška prilikom slanja odgovora:', error);
      alert('Greška prilikom slanja odgovora!');
    }
  };

  if (loading) return <div>Učitavanje kviza...</div>;
  if (!quiz) return <div>Kviz nije pronađen.</div>;

  const currentQuestion = quiz.questions[currentQuestionIndex];

  return (
    <div className="take-quiz-container">
      <h2 className="take-quiz-title">{quiz.title}</h2>
      <p className="take-quiz-timer">
        Preostalo vreme: <span className="font-semibold">{timeLeft} sekundi</span>
      </p>

      <div key={currentQuestion.id} className="question-block">
        <h3 className="question-text">{currentQuestion.text}</h3>

        {(currentQuestion.type === 'single' || currentQuestion.type === 'truefalse') && (
          <div className="flex flex-col space-y-3">
            {currentQuestion.options.map((opt) => (
              <label key={opt.id} className="option-label">
                <input
                  type="radio"
                  name={`q_${currentQuestion.id}`}
                  value={opt.id}
                  checked={Array.isArray(answers[currentQuestion.id]) && answers[currentQuestion.id][0] === opt.id}
                  onChange={() => handleAnswerChange(currentQuestion, opt.id)}
                  className="w-6 h-6"
                />
                <span className="text-lg">{opt.text}</span>
              </label>
            ))}
          </div>
        )}

        {currentQuestion.type === 'multiple' && (
          <div className="flex flex-col space-y-3">
            {currentQuestion.options.map((opt) => (
              <label key={opt.id} className="option-label">
                <input
                  type="checkbox"
                  value={opt.id}
                  checked={Array.isArray(answers[currentQuestion.id]) && answers[currentQuestion.id].includes(opt.id)}
                  onChange={() => handleAnswerChange(currentQuestion, opt.id)}
                  className="w-6 h-6"
                />
                <span className="text-lg">{opt.text}</span>
              </label>
            ))}
          </div>
        )}

        {currentQuestion.type === 'text' && (
          <input
            type="text"
            className="fill-input"
            placeholder="Unesite odgovor"
            value={typeof answers[currentQuestion.id] === 'string' ? answers[currentQuestion.id] : ''}
            onChange={(e) => handleAnswerChange(currentQuestion, e.target.value)}
          />
        )}
      </div>

      <div className="flex justify-between mt-6">
        <button
          onClick={() => setCurrentQuestionIndex((idx) => Math.max(0, idx - 1))}
          disabled={currentQuestionIndex === 0}
          className="quiz-button next"
        >
          Nazad
        </button>

        {currentQuestionIndex < quiz.questions.length - 1 ? (
          <button
            onClick={() => setCurrentQuestionIndex((idx) => Math.min(quiz.questions.length - 1, idx + 1))}
            className="quiz-button next"
          >
            Napred
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            className="quiz-button next"
          >
            Završi kviz
          </button>
        )}
      </div>
    </div>
  );
};

export default TakeQuiz;
