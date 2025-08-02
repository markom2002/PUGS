// src/models/Result.ts
export interface ResultDto {
  id: number;
  quizTitle: string;
  createdAt: string;
  totalPoints: number;
  percentage: number;
}

export interface ResultDetailsDto {
  id: number;
  quizId: number;
  quizTitle: string;
  correctAnswers: number;
  percentage: number;
  points: number;
  duration: string;
  createdAt: string;
  answers: {
    questionId: number;
    questionText: string;
    type: string;
    userAnswers: string[]; // korisnikovi odgovori
    correctAnswers: string[]; // tačni odgovori
    isCorrect: boolean;
  }[];
}

export interface QuizAttemptDto {
  percentage: number;
  points: number;
  createdAt: string;
}


