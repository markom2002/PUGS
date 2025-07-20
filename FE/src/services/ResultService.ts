import axios from 'axios';
import { UserResult } from '../models/UserResult';
import { ResultDto, ResultDetailsDto } from '../models/Result';



export interface SubmitResultDto {
  quizId: number;
  answers: {
    questionId: number;
    selectedOptionIds: string[];
    userAnswer?: string;
  }[];
  duration: string;
}

export interface ResultResponseDto {
  correctAnswers: number;
  percentage: number;
  duration: string;
}

const API_URL = process.env.REACT_APP_API_URL;

export const submitQuizResult = async (data: SubmitResultDto): Promise<ResultResponseDto> => {
  const token = localStorage.getItem('token');

  const response = await axios.post(`${API_URL}/api/results`, data, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
};

export const getUserResults = async (userId: number): Promise<UserResult[]> => {
  const token = localStorage.getItem('token');
  const response = await axios.get(`${API_URL}/api/Results/user`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};


export const saveResult = (result: {
  userId: number;
  quizId: number;
  correctAnswers: number;
  percentage: number;
  duration: string;
}) => {
  return axios.post(`${API_URL}/api/results`, result, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });
};

export const getMyResults = async (): Promise<ResultDto[]> => {
  const token = localStorage.getItem('token');
  const response = await axios.get(`${API_URL}/api/results`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

export const getResultDetails = async (id: number): Promise<ResultDetailsDto> => {
  const token = localStorage.getItem('token');
  const response = await axios.get(`${API_URL}/api/results/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};
