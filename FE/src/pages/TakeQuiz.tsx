//src/pages/TaskQuiz.tsx
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getQuizById } from '../services/QuizService';
import { submitQuizResult } from '../services/ResultService';
import { QuizDetailsDto } from '../models/Quiz';
import { QuestionDto } from '../models/Question';

const TakeQuiz: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  

  const [quiz, setQuiz] = useState<QuizDetailsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<{ [questionId: number]: any }>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);

  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hasSubmittedRef = useRef(false);


  const [isSubmitted, setIsSubmitted] = useState(false);
  

  // Precizni timer sa Date.now()
  useEffect(() => {
    //Restartujemo sve prije ucitavanja novog kviza
    setQuiz(null);
    setAnswers({});
    setTimeLeft(0);
    setIsSubmitted(false);
    

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

      if (question.type === 'fill') {
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

      } else if (question.type === 'fill') {
        const correctText = question.options[0]?.text?.trim().toLowerCase();
        const userText = (userAnswer || '').trim().toLowerCase();
        if (userText === correctText) {
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
        const correctOptions = question.options.filter((o) => o.isCorrect).map(o => o.id);
        const userOptions = Array.isArray(userAnswer) ? userAnswer : [];
        isCorrect = correctOptions.length === userOptions.length && correctOptions.every(id => userOptions.includes(id));

      } else if (question.type === 'fill') {
        const correctText = question.options[0]?.text?.trim().toLowerCase();
        const userText = (userAnswer || '').trim().toLowerCase();
        isCorrect = userText === correctText;
      }

      if (isCorrect) {
        totalPoints += question.points;
      }
    });

    return totalPoints;
  };

  const handleSubmit = async () => {
    if (hasSubmittedRef.current) return;

        hasSubmittedRef.current = true; // Obeleži da je submit pozvan


      setIsSubmitted(true);
      

    if (!quiz || !startTimeRef.current) {
      navigate('/results', { state: { message: 'Kviz nije dostupan' } });
      return;
    }

    setIsSubmitted(true);

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
        textAnswer: typeof answer === 'string' ? answer : undefined,
      };
    });

    const userId = localStorage.getItem("userId");


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

      // Pripremi kompletan objekat za navigaciju sa svim detaljima
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
            if (question.type === 'fill') {
              return typeof ans === 'string' ? ans : 'Nema odgovora';
            }
            if (Array.isArray(ans)) {
              if (ans.length === 0) return 'Nema odgovora';
              // map option ids to option text
              return ans
                .map((optId: number) => {
                  const opt = question.options.find(o => o.id === String(optId));



                  return opt ? opt.text : '';
                })
                .filter(t => t)
                .join(', ');
            }
            return 'Nema odgovora';
          })(),
          correctAnswer: (() => {
            const correctOpts = question.options.filter(o => o.isCorrect).map(o => o.text);
            return correctOpts.join(', ');
          })(),
          isCorrect: (() => {
            if (!quiz) return false;
            if (question.type === 'fill') {
              const userAns = answers[question.id];
              const correctText = question.options[0]?.text?.trim().toLowerCase();
              return (typeof userAns === 'string' && userAns.trim().toLowerCase() === correctText);
            }
            if (question.type === 'single' || question.type === 'truefalse') {
              const userAns = answers[question.id];
              const correctOpt = question.options.find(o => o.isCorrect);
              return userAns?.[0] === correctOpt?.id;
            }
            if (question.type === 'multiple') {
              const userAns = answers[question.id];
              const correctOpts = question.options.filter(o => o.isCorrect).map(o => o.id);
              if (!Array.isArray(userAns)) return false;
              return correctOpts.length === userAns.length && correctOpts.every(id => userAns.includes(id));
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

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">{quiz.title}</h2>
      <p className="mb-6 text-gray-600 font-medium">
        Preostalo vreme: <span className="font-semibold">{timeLeft} sekundi</span>
      </p>

      {quiz.questions.map((question) => (
        <div key={question.id} className="mb-10">
          <h3 className="text-xl font-semibold mb-4">{question.text}</h3>

          {(question.type === 'single' || question.type === 'truefalse') && (
            <div className="flex flex-col space-y-3">
              {question.options.map((opt) => (
                <label key={opt.id} className="flex items-center space-x-3 cursor-pointer text-gray-800">
                  <input
                    type="radio"
                    name={`q_${question.id}`}
                    value={opt.id}
                    checked={Array.isArray(answers[question.id]) && answers[question.id][0] === opt.id}
                    onChange={() => handleAnswerChange(question, opt.id)}
                    className="w-6 h-6"
                  />
                  <span className="text-lg">{opt.text}</span>
                </label>
              ))}
            </div>
          )}

          {question.type === 'multiple' && (
            <div className="flex flex-col space-y-3">
              {question.options.map((opt) => (
                <label key={opt.id} className="flex items-center space-x-3 cursor-pointer text-gray-800">
                  <input
                    type="checkbox"
                    value={opt.id}
                    checked={Array.isArray(answers[question.id]) && answers[question.id].includes(opt.id)}
                    onChange={() => handleAnswerChange(question, opt.id)}
                    className="w-6 h-6"
                  />
                  <span className="text-lg">{opt.text}</span>
                </label>
              ))}
            </div>
          )}

          {question.type === 'fill' && (
            <input
              type="text"
              className="border border-gray-400 p-3 rounded w-full text-lg"
              placeholder="Unesite odgovor"
              value={typeof answers[question.id] === 'string' ? answers[question.id] : ''}
              onChange={(e) => handleAnswerChange(question, e.target.value)}
            />
          )}
        </div>
      ))}

      <button
        onClick={handleSubmit}
        className="bg-blue-700 text-white px-6 py-3 rounded hover:bg-blue-800 transition"
      >
        Završi kviz
      </button>
    </div>
  );
};

export default TakeQuiz;
