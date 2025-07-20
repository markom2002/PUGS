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
