// Production serves the app and Arena API from the same origin. A build-time
// localhost URL points at the phone itself and must never override that origin.
export function arenaApiBase(configured:string|undefined,isDevelopment:boolean):string {
  return isDevelopment?(configured||'').replace(/\/$/,''):'';
}
export const ARENA_API=arenaApiBase(process.env.REACT_APP_API_URL,process.env.NODE_ENV==='development');
export const connectionMessage='Veza sa serverom nije dostupna. Otvori najnoviju pozivnicu ili skeniraj QR kod sa računara. Za lokalnu igru telefon i računar moraju biti na istoj Wi-Fi mreži.';

export async function arenaFetch(path:string,init:RequestInit={},timeoutMs=15000):Promise<Response>{
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  const abort=()=>controller.abort();
  if(init.signal?.aborted)controller.abort();else init.signal?.addEventListener('abort',abort,{once:true});
  try{return await fetch(`${ARENA_API}/api/arena/${path}`,{...init,signal:controller.signal,cache:'no-store'});}
  catch(e){
    if(init.signal?.aborted)throw e;
    throw Object.assign(new Error(connectionMessage),{status:0,cause:e});
  }finally{clearTimeout(timer);init.signal?.removeEventListener('abort',abort);}
}
