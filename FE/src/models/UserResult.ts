export interface UserResult {
  id: number;
  quizTitle: string;
  username?: string;
  correctAnswers: number;
  percentage: number;
  duration: string;
  createdAt: string;
  points: number;
}
