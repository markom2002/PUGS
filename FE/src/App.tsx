import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PwaProvider } from './components/Pwa';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Arena from './pages/Arena';
import Offline from './pages/Offline';
export default function App() {
  return <PwaProvider><BrowserRouter><Navbar /><Routes>
    <Route path='/' element={<Home />} />
    <Route path='/arena' element={<Arena />} />
    <Route path='/offline' element={<Offline />} />
    <Route path='*' element={<Navigate to='/' replace />} />
  </Routes></BrowserRouter></PwaProvider>;
}
