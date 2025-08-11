import SavingsProjection from "../components/SavingsProjection";
export default function ProjectionsPage() {
  return (
    <main style={{minHeight:'100vh', padding:24}}>
      <h1 style={{fontSize:24, fontWeight:700, marginBottom:16}}>Savings Projections</h1>
      <div style={{maxWidth:1100}}>
        <SavingsProjection />
      </div>
    </main>
  );
}
