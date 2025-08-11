import { useState } from "react";
import Avatar from "@/components/Avatar";

export default function Settings() {
  const [profiles, setProfiles] = useState({
    ryan: { name: "Ryan Galea" },
    steff: { name: "Steff" }
  });

  const update = (key, name) =>
    setProfiles(prev => ({ ...prev, [key]: { ...prev[key], name } }));

  return (
    <>
      <h1>Settings</h1>
      <div className="card">
        <h3>Profiles</h3>
        <div className="row">
          <div>
            <label>Ryan’s name</label>
            <div className="space" />
            <div style={{display:'flex', gap:10, alignItems:'center'}}>
              <Avatar name={profiles.ryan.name} />
              <input className="input" value={profiles.ryan.name}
                     onChange={e => update("ryan", e.target.value)} />
            </div>
          </div>
          <div>
            <label>Steff’s name</label>
            <div className="space" />
            <div style={{display:'flex', gap:10, alignItems:'center'}}>
              <Avatar name={profiles.steff.name} />
              <input className="input" value={profiles.steff.name}
                     onChange={e => update("steff", e.target.value)} />
            </div>
          </div>
        </div>
        <p className="muted">Names are local to your device for now.</p>
      </div>
    </>
  );
}
