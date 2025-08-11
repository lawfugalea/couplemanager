export default function Avatar({ name }) {
  const initials = (name || "?")
    .split(" ")
    .map(s => s[0]?.toUpperCase())
    .slice(0,2)
    .join("");
  return <span className="avatar" title={name}>{initials}</span>;
}
