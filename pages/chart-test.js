import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

const data = [{m:'M1',v:100},{m:'M2',v:200},{m:'M3',v:150}];

export default function ChartTest(){
  return (
    <main style={{padding:24,fontFamily:'sans-serif'}}>
      <h1 style={{fontSize:24,marginBottom:12}}>Chart Test</h1>
      <div style={{border:'1px solid #e5e7eb', borderRadius:12, padding:12, display:'inline-block'}}>
        {/* FIXED width/height to avoid zero-size container issues */}
        <LineChart width={600} height={320} data={data}>
          <CartesianGrid strokeDasharray="4 4" />
          <XAxis dataKey="m" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="v" strokeWidth={3} dot={false} />
        </LineChart>
      </div>
    </main>
  );
}
