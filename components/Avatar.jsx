export default function Avatar({ name, size = "md" }) {
  const initials = (name || "?")
    .split(" ")
    .map(s => s[0]?.toUpperCase())
    .slice(0, 2)
    .join("");

  const sizeClasses = {
    sm: "w-6 h-6 text-xs",
    md: "w-10 h-10 text-sm", 
    lg: "w-12 h-12 text-base",
    xl: "w-16 h-16 text-lg"
  };

  return (
    <div 
      className={`avatar ${sizeClasses[size]} inline-flex items-center justify-center rounded-full font-bold`}
      title={name}
      style={{
        background: 'var(--gradient-secondary)',
        color: 'white',
        border: '2px solid var(--bg-primary)',
        boxShadow: 'var(--shadow-md)'
      }}
    >
      {initials}
    </div>
  );
}