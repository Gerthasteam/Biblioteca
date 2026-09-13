"use client";

export default function StarPicker({ value, onChange }) {
  return (
    <div className="star-picker">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n === value ? 0 : n)}
          aria-label={`${n} estrellas`}
        >
          {n <= value ? "★" : "☆"}
        </button>
      ))}
    </div>
  );
}
