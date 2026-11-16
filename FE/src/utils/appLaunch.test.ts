import {openHomeOnAppLaunch} from './appLaunch';
const media=window.matchMedia;
afterEach(()=>{window.history.replaceState(null,'','/');window.matchMedia=media;});
test('installed legacy arena shortcut opens homepage',()=>{window.matchMedia=jest.fn().mockReturnValue({matches:true});window.history.replaceState(null,'','/arena?source=app');openHomeOnAppLaunch();expect(window.location.pathname).toBe('/');});
test('explicit room invitation remains intact in installed app',()=>{window.matchMedia=jest.fn().mockReturnValue({matches:true});window.history.replaceState(null,'','/arena?code=123456');openHomeOnAppLaunch();expect(window.location.pathname+window.location.search).toBe('/arena?code=123456');});
test('regular browser arena entry is unchanged',()=>{window.matchMedia=jest.fn().mockReturnValue({matches:false});window.history.replaceState(null,'','/arena');openHomeOnAppLaunch();expect(window.location.pathname).toBe('/arena');});
