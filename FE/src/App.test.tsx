import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Home from './pages/Home';

test('home offers a real multiplayer entry and describes six rounds', () => {
  render(<MemoryRouter><Home /></MemoryRouter>);
  expect(screen.getByRole('link', { name: /Pokreni partiju/i })).toHaveAttribute('href', '/arena');
  expect(screen.getByRole('link', { name: /Imam PIN/i })).toHaveAttribute('href', '/arena?code=');
  expect(screen.getByText('Kaladont znanja')).toBeInTheDocument();
  expect(screen.getByText('Znaš je na prvu.')).toBeInTheDocument();
});
