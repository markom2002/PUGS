// src/services/QuizService.ts
import api from '../api/api';
import { QuizDto, QuizDetailsDto } from '../models/Quiz';
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
export const updateQuiz = async (id: number, quiz: QuizDto): Promise<QuizDto> => {
  const response = await api.put(`/api/quizzes/${id}`, quiz);
  return response.data;
};



export const getQuizzesByCategory = async (category: string): Promise<QuizDto[]> => {
  const response = await api.get(`/api/quizzes/category/${category}`);
  return response.data;
};