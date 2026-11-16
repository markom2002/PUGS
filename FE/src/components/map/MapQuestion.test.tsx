import React from 'react';
import {render,screen,fireEvent} from '@testing-library/react';
import '@testing-library/jest-dom';
import MapQuestion from './MapQuestion';

test('keyboard selection is required, can be submitted, and a locked answer cannot be changed',()=>{
  const submit=jest.fn();const props={submitted:false,revealed:false,me:'Ana',onSubmit:submit};
  const {rerender}=render(<MapQuestion {...props}/>);
  expect(screen.getByRole('button',{name:/Zaključaj lokaciju/})).toBeDisabled();
  fireEvent.keyDown(screen.getByRole('application'),{key:'ArrowRight'});
  fireEvent.click(screen.getByRole('button',{name:/Zaključaj lokaciju/}));
  expect(submit).toHaveBeenCalledWith({latitude:0,longitude:2});
  rerender(<MapQuestion {...props} submitted snapshot={{guess:{latitude:0,longitude:2},target:null,distanceKm:null,guesses:null}}/>);
  expect(screen.getByRole('button',{name:/Poslato/})).toBeDisabled();
  fireEvent.keyDown(screen.getByRole('application'),{key:'Enter'});
  expect(submit).toHaveBeenCalledTimes(1);
  expect(screen.queryByTestId('map-target')).not.toBeInTheDocument();
});

test('reveal shows target, distance, score and opponents ordered by precision',()=>{
  render(<MapQuestion submitted revealed me="Ana" points={70} onSubmit={()=>{}} snapshot={{
    guess:{latitude:40,longitude:10},target:{label:'Petra',country:'Jordan',latitude:30.3285,longitude:35.4444},distanceKm:900,
    guesses:[{name:'Ana',latitude:40,longitude:10,distanceKm:900,points:70},{name:'Boris',latitude:30.3,longitude:35.4,distanceKm:5,points:150}]
  }}/>);
  expect(screen.getByTestId('map-target')).toBeInTheDocument();
  expect(screen.getByTestId('map-result')).toHaveTextContent('Petra');
  expect(screen.getAllByRole('listitem')[0]).toHaveTextContent('Boris');
  expect(screen.getByTestId('map-result')).toHaveTextContent('900 km');
  expect(screen.getByTestId('map-result')).toHaveTextContent('+70 poena');
});
