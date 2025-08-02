// src/services/QuizService.ts
import api from '../api/api';
import { QuizDto, QuizDetailsDto, UpdateQuizDetailsDto } from '../models/Quiz';
import { QuestionDto } from '../models/Question';


export interface SubmitAnswerDto {
  questionId: number;
  selectedOptionIds?: string[];
  textAnswer?: string;
}

/**
 * Dohvata sve kvizove uz mogućnost filtriranja po kategoriji, težini i pretrazi.
 */
export const getAllQuizzes = async (
  category?: string,
  difficulty?: string,
  search?: string
): Promise<QuizDto[]> => {
  const params: Record<string, string> = {};
  if (category) params.category = category;
  if (difficulty) params.difficulty = difficulty;
  if (search) params.search = search;

  const response = await api.get('/api/quizzes', { params });
  return response.data;
};

/**
 * Dohvata detalje kviza po ID-u (pitanja, opcije, itd.)
 */
export const getQuizById = async (quizId: number): Promise<QuizDetailsDto> => {
  const response = await api.get<QuizDetailsDto>(`/api/quizzes/${quizId}`);
  // Koristi type assertion da TS ne kuka
  const questions = response.data.questions as QuestionDto[];
  console.log('API odgovor getQuizById:', response.data);
  console.log('Points u pitanjima:', questions.map(q => q.points ?? 0));
  return response.data;
};

/**
 * Šalje korisničke odgovore na kviz i dobija rezultat nazad.
 */
export const submitQuizAnswers = async (
  quizId: number,
  answers: any[],
  duration: number
): Promise<void> => {
  const response = await fetch(`/api/results`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quizId, answers, duration }),
  });

  if (!response.ok) {
    throw new Error('Neuspešno slanje rezultata');
  }
};

export const deleteQuiz = async (quizId: number): Promise<void> => {
  const response = await api.delete(`/api/quizzes/${quizId}`);
  if (!response.status.toString().startsWith('2')) {
    throw new Error('Neuspešno brisanje kviza');
  }
};


/**
 * Kreira novi kviz
 */
export const createQuiz = async (quiz: QuizDto): Promise<QuizDto> => {
  const response = await api.post('/api/quizzes', quiz);
  return response.data;
};

/**
 * Ažurira postojeći kviz
 */
export const updateQuiz = async (id: number, quiz: QuizDetailsDto): Promise<QuizDetailsDto> => {
  const response = await api.put(`/api/quizzes/${id}`, quiz);
  return response.data;
};



export const getQuizzesByCategory = async (category: string): Promise<QuizDto[]> => {
  const response = await api.get(`/api/quizzes/category/${category}`);
  return response.data;
};



export const updateQuizWithDetails = async (id: number, quiz: UpdateQuizDetailsDto): Promise<void> => {
  const dto = {
    title: quiz.title,
    description: quiz.description,
    difficulty: quiz.difficulty,
    timeLimit: quiz.timeLimit,
    category: quiz.category,
    questions: quiz.questions.map(q => ({
      id: q.id ?? 0,
      text: q.text,
      type: q.type,
      points: q.points,
      allowMultipleAnswers: q.allowMultipleAnswers,
      correctTextAnswer: q.correctTextAnswer ?? '',
      options: q.options.map(o => ({
        id: o.id ?? 0,
        text: o.text,
        isCorrect: o.isCorrect,
      })),
    }))
    
  };

  await api.put(`/api/quizzes/full/${id}`, dto);
};

export const deleteQuestionById = async (questionId: number): Promise<void> => {
  const response = await api.delete(`/api/quizzes/questions/${questionId}`);
  if (!response.status.toString().startsWith('2')) {
    throw new Error('Neuspešno brisanje pitanja');
  }
};


// Kreira novi kviz sa pitanjima i opcijama (POST /api/quizzes/full)
export const createQuizWithDetails = async (quiz: {
  title: string;
  description: string;
  difficulty: string;
  timeLimit: number;
  category: string;
  questions: {
    text: string;
    type: string;
    points: number;
    allowMultipleAnswers: boolean;
    correctTextAnswer?: string;
    options: {
      text: string;
      isCorrect: boolean;
    }[];
  }[];
}): Promise<QuizDetailsDto> => {
  const response = await api.post('/api/quizzes/full', quiz);
  return response.data;
};
