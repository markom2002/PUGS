// src/models/Question.ts
import { OptionDto } from './Option';

export interface QuestionDto {
  id: number;
  text: string;
  type: string;
  quizId: number;
  points: number;
  allowMultipleAnswers: boolean;
  options: OptionDto[];
  correctTextAnswer?: string;
}
