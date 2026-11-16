import React from 'react';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import WinnerCelebration from './WinnerCelebration';
const base={players:[{name:'Ana',score:950,rank:1,correct:12},{name:'Boris',score:800,rank:2,correct:10}],me:'Ana',host:false,code:'123456',token:'secret',onAgain:jest.fn()};
test('announces the winner and handles a game without correct music guesses',()=>{
 render(<WinnerCelebration {...base} victory={{winnerNames:['Ana'],score:950,song:null}}/>);
 expect(screen.getByRole('heading',{name:'Ana'})).toBeInTheDocument();
 expect(screen.getByText(/Nema zabilježenog tačnog muzičkog pogotka/)).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:/Još jedna runda/}));expect(base.onAgain).toHaveBeenCalled();
});
test('autoplay denial offers a working play button and audio is stopped on leaving',async()=>{
 const play=jest.fn().mockRejectedValueOnce(new Error('Autoplay blocked')).mockResolvedValue(undefined);
 const pause=jest.fn();const player={play,pause,volume:.35,ended:false,currentTime:0,onended:null};
 jest.spyOn(window,'Audio').mockImplementation(()=>player as unknown as HTMLAudioElement);
 Object.defineProperty(URL,'createObjectURL',{configurable:true,value:jest.fn(()=> 'blob:test-victory')});
 Object.defineProperty(URL,'revokeObjectURL',{configurable:true,value:jest.fn()});
 global.fetch=jest.fn().mockResolvedValue({ok:true,blob:async()=>new Blob(['audio'])});
 const view=render(<WinnerCelebration {...base} victory={{winnerNames:['Ana'],score:950,song:{index:27,title:'Pobjednička pjesma',artist:'Izvođač',responseMs:2000,player:'Ana'}}}/>);
 expect(await screen.findByText(/Klikni „Pusti slavlje”/)).toBeInTheDocument();
 expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/victory-audio'),expect.objectContaining({headers:{'X-Player-Token':'secret'}}));
 fireEvent.click(screen.getByRole('button',{name:/Pusti slavlje/}));
 await waitFor(()=>expect(screen.getByRole('button',{name:/Pauziraj/})).toBeInTheDocument());
 fireEvent.change(screen.getByRole('slider'),{target:{value:'0.1'}});expect(player.volume).toBe(.1);
 view.unmount();expect(pause).toHaveBeenCalled();expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-victory');
 jest.restoreAllMocks();
});
test('equal winners are announced together',()=>{
 render(<WinnerCelebration {...base} victory={{winnerNames:['Ana','Boris'],score:950,song:null}}/>);
 expect(screen.getByRole('heading',{name:'Ana & Boris'})).toBeInTheDocument();expect(screen.getByText('POBJEDNICI PARTIJE')).toBeInTheDocument();
});
