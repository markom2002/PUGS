//src/models/Quiz.ts
import { QuestionDto } from './Question';

export interface QuizDto {
  id: number;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  questionCount: number;
  //points: number;
  timeLimit: number; // u sekundama
}

export interface QuizDetailsDto extends QuizDto {
  questions: QuestionDto[];
}


export interface UpdateQuizDetailsDto {
  title: string;
  description: string;
  difficulty: string;
  timeLimit: number;
  category: string;
  questions: QuestionDto[];
  
}
