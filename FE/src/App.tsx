// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';   // dodaj import Navbar-a
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Quizzes from './pages/Quizzes';
import TakeQuiz from './pages/TakeQuiz';
import AdminDashboard from './pages/AdminDashboard';
import QuizResult from './pages/QuizResult';
import MyResults from './pages/MyResults';
import ResultDetails from './pages/ResultDetails';
import AdminQuizManager from './pages/AdminQuizManager';
import QuizForm from './pages/QuizForm';
import AllUserResults from './pages/AllUserResults';
import Leaderboard from './pages/Leaderboard';

const App: React.FC = () => {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path='/quizzes' element={<Quizzes />} />
        <Route path="/quiz/:id" element={<TakeQuiz />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path='/results' element={<QuizResult />} />
        <Route path="/my-results" element={<MyResults />} />
        <Route path="/result-details/:id" element={<ResultDetails />} />

        <Route path="/admin/quiz-manager" element={<AdminQuizManager />} />
        <Route path="/admin/quiz-manager/create" element={<QuizForm />} />
        <Route path="/admin/quiz-manager/edit/:id" element={<QuizForm />} />
        <Route path="/admin/results" element={<AllUserResults />} />

        <Route path="/leaderboard" element={<Leaderboard />} />

      </Routes>
    </Router>
  );
};

export default App;
