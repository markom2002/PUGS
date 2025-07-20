// src/services/QuestionService.ts
import api from '../api/api';
import { QuestionDto } from '../models/Question';

export const getQuestionsByQuizId = async (quizId: number): Promise<QuestionDto[]> => {
  const res = await api.get(`/api/quizzes/${quizId}/questions`);
  return res.data;
};
