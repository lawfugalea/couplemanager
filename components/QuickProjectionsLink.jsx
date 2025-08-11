export default function QuickProjectionsLink(){
  return (
    <a href="/projections"
       style={{
         position:'fixed', right:16, top:16, zIndex:50,
         padding:'8px 12px', borderRadius:12,
         border:'1px solid rgba(255,255,255,0.15)',
         background:'rgba(0,0,0,0.5)', backdropFilter:'blur(6px)',
         color:'#fff', textDecoration:'none', fontSize:14
       }}>
      Projections
    </a>
  );
}
