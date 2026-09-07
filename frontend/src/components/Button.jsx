/**
 * Reusable button.
 * variant: 'primary' (default) | 'ghost' | 'danger'
 */
const VARIANTS = {
  primary: 'btn-primary',
  ghost:   'btn-ghost',
  danger:  'bg-red-700 hover:bg-red-600 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-navy-900 disabled:opacity-50 disabled:cursor-not-allowed',
};

export default function Button({
  variant = 'primary',
  loading = false,
  loadingText = 'Loading…',
  children,
  className = '',
  ...props
}) {
  return (
    <button
      disabled={loading || props.disabled}
      className={`${VARIANTS[variant] ?? VARIANTS.primary} ${className}`}
      {...props}
    >
      {loading ? loadingText : children}
    </button>
  );
}
