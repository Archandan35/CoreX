export default function ColorSwatches({ colors, value, onChange, className = '' }) {
  return (
    <div className={`color-swatches ${className}`}>
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          className={`color-swatch${value === color ? ' color-swatch--active' : ''}`}
          style={{ backgroundColor: color }}
          onClick={() => onChange?.(color)}
          aria-label={`Select color ${color}`}
          title={color}
        />
      ))}
    </div>
  );
}
