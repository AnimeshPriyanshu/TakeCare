function renderLine(line, lineIndex) {
  const parts = line.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <span key={lineIndex}>
      {parts.map((part, index) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={index} className="font-semibold text-slate-900">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </span>
  );
}

export default function FormattedText({ text, className = "" }) {
  const lines = String(text ?? "").split("\n");
  return (
    <div className={`space-y-1.5 ${className}`}>
      {lines.map((line, index) =>
        line.trim() === "" ? (
          <div key={index} className="h-1.5" />
        ) : (
          <p key={index} className="leading-relaxed">
            {renderLine(line, index)}
          </p>
        ),
      )}
    </div>
  );
}
