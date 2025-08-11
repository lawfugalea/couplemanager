import dynamic from "next/dynamic";
const SavingsProjection = dynamic(() => import("../components/SavingsProjection"), { ssr: false });

export default function SavingsProjectionPage() {
  return (
    <main style={{minHeight:'100vh', padding:24, fontFamily:'sans-serif'}}>
      <h1 style={{fontSize:24, fontWeight:700, marginBottom:16}}>Savings Projection</h1>
      <div style={{maxWidth:1100}}>
        <SavingsProjection />
      </div>
    </main>
  );
}
