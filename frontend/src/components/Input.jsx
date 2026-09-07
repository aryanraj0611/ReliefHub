/**
 * Reusable labelled input/select/textarea.
 * Pass `as="select"` or `as="textarea"` to switch element type.
 */
export default function Input({
  id,
  label,
  hint,
  error,
  as: Tag = 'input',
  className = '',
  children,   // for <select> options
  ...props
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm text-slate-400 select-none">
          {label}
          {hint && <span className="text-slate-600 ml-1">{hint}</span>}
        </label>
      )}

      {Tag === 'select' ? (
        <select id={id} className={`input ${className}`} {...props}>
          {children}
        </select>
      ) : Tag === 'textarea' ? (
        <textarea id={id} className={`input resize-none ${className}`} {...props} />
      ) : (
        <input id={id} className={`input ${className}`} {...props} />
      )}

      {error && (
        <p className="text-xs text-red-400 mt-0.5">{error}</p>
      )}
    </div>
  );
}
