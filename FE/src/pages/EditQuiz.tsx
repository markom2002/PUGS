import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getQuizById, updateQuizWithDetails, deleteQuestionById } from '../services/QuizService';
import { QuizDetailsDto, UpdateQuizDetailsDto } from '../models/Quiz';
import { QuestionDto } from '../models/Question';
import { OptionDto } from '../models/Option';


const EditQuiz = () => {
  const { id } = useParams();
  const [quiz, setQuiz] = useState<QuizDetailsDto | null>(null);

  const [newQuestion, setNewQuestion] = useState<QuestionDto>({
    id: 0,
    text: '',
    type: 'single',
    points: 1,
    quizId: Number(id),
    allowMultipleAnswers: false,
    options: [],
    correctTextAnswer: '',
  });

  const [newOptionText, setNewOptionText] = useState('');

  
  useEffect(() => {
    const fetchQuiz = async () => {
      if (!id) return;
      const data = await getQuizById(Number(id));
      if (!data.questions) data.questions = [];
      setQuiz(data);
      
    };
    fetchQuiz();
  }, [id]);

  const handleAddOption = () => {
    if (!newOptionText.trim()) return;

    const option: OptionDto = {
      id: 0,
      text: newOptionText,
      isCorrect: false,
    };

    setNewQuestion(prev => ({
      ...prev,
      options: [...prev.options, option],
    }));
    setNewOptionText('');
  };

  const handleAddQuestion = async () => {
  if (!newQuestion.text.trim()) {
    alert('Tekst pitanja je obavezan.');
    return;
  }

  if (newQuestion.type !== 'text') {
    if (newQuestion.options.length < 2) {
      alert('Morate uneti barem dve opcije za izbor.');
      return;
    }

    if (!newQuestion.options.some(o => o.isCorrect)) {
      alert('Bar jedna opcija mora biti označena kao tačna.');
      return;
    }

    if (newQuestion.options.some(o => !o.text.trim())) {
      alert('Tekst svake opcije mora biti unet.');
      return;
    }
  }

  if (!quiz) return;

  const questionToAdd: QuestionDto = {
    ...newQuestion,
    id: 0,
    quizId: quiz.id,
    options: newQuestion.options.map(o => ({ ...o, id: 0 })),
    correctTextAnswer: newQuestion.correctTextAnswer,

  };

  const updatedQuiz: QuizDetailsDto = {
    ...quiz,
    questions: [...quiz.questions, questionToAdd],
  };

  try {
    // Pozovi backend da sačuva ceo kviz sa novim pitanjem
    await updateQuizWithDetails(updatedQuiz.id, {
      title: updatedQuiz.title,
      description: updatedQuiz.description,
      difficulty: mapDifficultyToBackend(updatedQuiz.difficulty),
      timeLimit: updatedQuiz.timeLimit,
      category: updatedQuiz.category,
      questions: updatedQuiz.questions.map(q => ({
        ...q,
        quizId: updatedQuiz.id,
        id: q.id ?? 0,
        correctTextAnswer: q.correctTextAnswer ?? '',
        options: q.options.map(o => ({ ...o, id: o.id ?? 0 })),
      })),
    });

    // Osveži kviz sa servera
    const freshQuiz = await getQuizById(updatedQuiz.id);
    setQuiz(freshQuiz);

    // Resetuj formu za novo pitanje
    setNewQuestion({
      id: 0,
      text: '',
      type: 'single',
      points: 1,
      quizId: updatedQuiz.id,
      allowMultipleAnswers: false,
      options: [],
      correctTextAnswer: '',
    });

    alert('Pitanje uspešno dodato i sačuvano.');
  } catch (error) {
    console.error('Greška pri čuvanju pitanja:', error);
    alert('Greška pri čuvanju pitanja.');
  }
};





  const handleDeleteQuestion = async (index: number) => {
  if (!quiz) return;

  const questionToDelete = quiz.questions[index];

  const confirm = window.confirm('Da li ste sigurni da želite da obrišete pitanje?');
  if (!confirm) return;

  try {
    // Ako pitanje već postoji u bazi, pošalji DELETE
    if (questionToDelete.id !== 0) {
      await deleteQuestionById(questionToDelete.id);
    }

    // Ažuriraj lokalno stanje da skloniš pitanje iz prikaza
    const updatedQuestions = [...quiz.questions];
    updatedQuestions.splice(index, 1);
    setQuiz({ ...quiz, questions: updatedQuestions });
  } catch (error) {
    console.error('Greška pri brisanju pitanja:', error);
    alert('Greška pri brisanju pitanja.');
  }
};

  const mapDifficultyToBackend = (diff: string) => {
    switch (diff) {
      case 'Laka': return 'easy';
      case 'Srednja': return 'medium';
      case 'Teška': return 'hard';
      default: return diff;
    }
  };

  // Izmenjen handleSubmit koji šalje i obrisane ID-jeve pitanja
  const handleSubmit = async () => {
    if (!quiz) return;
    console.log({quiz});
    const dto: UpdateQuizDetailsDto = {
      title: quiz.title,
      description: quiz.description,
      difficulty: mapDifficultyToBackend(quiz.difficulty),
      timeLimit: quiz.timeLimit,
      category: quiz.category,
      questions: quiz.questions.map(q => ({
        ...q,
        quizId: quiz.id,
        id: q.id ?? 0,
        correctTextAnswer: q.correctTextAnswer ?? '',
        options: q.options.map(o => ({
          ...o,
          id: o.id ?? 0,
        })),
      }))
      
    };

    try {
      await updateQuizWithDetails(quiz.id, dto);
      const freshQuiz = await getQuizById(quiz.id);
      setQuiz(freshQuiz);
      alert('Kviz uspešno sačuvan');
    } catch (error) {
      console.error('Greška pri ažuriranju kviza:', error);
    }
  };

  if (!quiz) return <div>Učitavanje...</div>;

  return (
    <div>
      <h2>Izmeni kviz</h2>

      <label>Naziv</label>
      <input
        value={quiz.title}
        onChange={e => setQuiz({ ...quiz, title: e.target.value })}
      />
      <br />

      <label>Opis</label>
      <input
        value={quiz.description}
        onChange={e => setQuiz({ ...quiz, description: e.target.value })}
      />
      <br />

      <label>Kategorija</label>
      <input
        value={quiz.category}
        onChange={e => setQuiz({ ...quiz, category: e.target.value })}
      />
      <br />

      <label>Težina</label>
      <select
        value={quiz.difficulty}
        onChange={e => setQuiz({ ...quiz, difficulty: e.target.value })}
      >
        <option value="Laka">Laka</option>
        <option value="Srednja">Srednja</option>
        <option value="Teška">Teška</option>
      </select>
      <br />

      <label>Vremenski limit (sekundi)</label>
      <input
        type="number"
        value={quiz.timeLimit}
        onChange={e => setQuiz({ ...quiz, timeLimit: Number(e.target.value) })}
      />
      <br />

      <h3>Pitanja ({quiz.questions.length})</h3>
      {quiz.questions.length === 0 ? (
        <div>Nema pitanja u kvizu.</div>
      ) : (
        quiz.questions.map((q, index) => (
          <div key={q.id || q.text} style={{ marginBottom: '10px' }}>
            <strong>
              {q.text} ({q.type}, {q.points} poena)
              {q.id === 0 && <span style={{ color: 'green' }}> (novo)</span>}
            </strong>
            <button onClick={() => handleDeleteQuestion(index)} style={{ marginLeft: '10px' }}>
              Obriši
            </button>
          </div>
        ))
      )}

      <h3>Dodaj pitanje</h3>

      <label>Tekst pitanja</label>
      <input
        value={newQuestion.text}
        onChange={e => setNewQuestion({ ...newQuestion, text: e.target.value })}
      />
      <br />

      <label>Tip pitanja</label>
      <select
        value={newQuestion.type}
        onChange={e => {
          const type = e.target.value;
          setNewQuestion({
            ...newQuestion,
            type,
            allowMultipleAnswers: type === 'multiple',
          });
        }}
      >
        <option value="single">Single choice (jedan odgovor)</option>
        <option value="multiple">Multiple choice (više odgovora)</option>
        <option value="text">Slobodan tekst</option>
      </select>
      <br />

      <label>Težina (poeni)</label>
      <input
        type="number"
        value={newQuestion.points}
        onChange={e => setNewQuestion({ ...newQuestion, points: Number(e.target.value) })}
      />
      <br />

      {newQuestion.type === 'text' && (
  <>
    <label>Tačan odgovor</label>
    <input
      type="text"
      value={newQuestion.correctTextAnswer}
      onChange={e => setNewQuestion({ ...newQuestion, correctTextAnswer: e.target.value })}
      placeholder="Unesi tačan odgovor"
    />
    <br />
  </>
)}


      <label>Opcije</label>
      <ul>
        {newQuestion.options.map((opt, idx) => (
          <li key={idx}>
            <input
              type="checkbox"
              checked={opt.isCorrect}
              onChange={e => {
                const updated = [...newQuestion.options];
                updated[idx].isCorrect = e.target.checked;
                setNewQuestion({ ...newQuestion, options: updated });
              }}
            />
            {opt.text}
          </li>
        ))}
      </ul>

      <input
        type="text"
        value={newOptionText}
        onChange={e => setNewOptionText(e.target.value)}
        placeholder="Nova opcija"
      />
      <button onClick={handleAddOption}>Dodaj opciju</button>
      <br />

      <button  onClick={handleAddQuestion}>Sačuvaj pitanje</button>
      <br /><br />

      <button  onClick={handleSubmit}>Sačuvaj izmene</button>
    </div>
  );
};

export default EditQuiz;
