export function openHomeOnAppLaunch() {
 const standalone=window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & {standalone?:boolean}).standalone;
 const url=new URL(window.location.href);
 // Migrate old installed shortcuts without breaking explicit room invitations.
 if(standalone && url.pathname==='/arena' && !url.searchParams.has('code')) window.history.replaceState(null,'','/?source=app');
}
