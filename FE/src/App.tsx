// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { PwaProvider } from './components/Pwa';
import Navbar from './components/Navbar';   // dodaj import Navbar-a
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';

import TakeQuiz from './pages/TakeQuiz';
import AdminDashboard from './pages/AdminDashboard';
import QuizResult from './pages/QuizResult';

import ResultDetails from './pages/ResultDetails';
import AdminQuizManager from './pages/AdminQuizManager';
import QuizForm from './pages/QuizForm';
import AllUserResults from './pages/AllUserResults';
import Leaderboard from './pages/Leaderboard';
import CreateLiveQuizRoom from './pages/QuizHub/CreateLiveQuizRoom';
import LiveHostRoom from './pages/QuizHub/LiveHostRoom';
import JoinLiveQuiz from './pages/QuizHub/JoinLiveQuiz';
import LiveQuiz from './pages/QuizHub/LiveQuiz';
import Arena from './pages/Arena';
import Offline from './pages/Offline';


const App: React.FC = () => {
  return (
    <PwaProvider><Router>
      <Navbar />
      <Routes>
        <Route path='/offline' element={<Offline />} />
        <Route path='/arena' element={<Arena />} />
        <Route path='/' element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path='/quizzes' element={<Navigate to="/arena" replace />} />
        <Route path="/quiz/:id" element={<TakeQuiz />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path='/results' element={<QuizResult />} />
        <Route path="/my-results" element={<Navigate to="/arena" replace />} />
        <Route path="/result-details/:id" element={<ResultDetails />} />

        <Route path="/admin/quiz-manager" element={<AdminQuizManager />} />
        <Route path="/admin/quiz-manager/create" element={<QuizForm />} />
        <Route path="/admin/quiz-manager/edit/:id" element={<QuizForm />} />
        <Route path="/admin/results" element={<AllUserResults />} />

        <Route path="/leaderboard" element={<Leaderboard />} />

        <Route path="/admin/live-quiz" element={<CreateLiveQuizRoom />} /> 
        <Route path="/live-host/:roomCode" element={<LiveHostRoom />} />
        <Route path="/join-live" element={<JoinLiveQuiz />} />
        <Route path="/live-quiz" element={<LiveQuiz />} />
      </Routes>
    </Router></PwaProvider>
  );
};

export default App;

