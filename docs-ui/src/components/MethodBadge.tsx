interface MethodBadgeProps {
  method: 'get' | 'post' | 'put' | 'delete' | 'patch'
  size?: 'sm' | 'md'
}

const methodStyles: Record<string, { bg: string; text: string }> = {
  get: { bg: 'bg-[#16a34a]/20', text: 'text-[#16a34a]' },
  post: { bg: 'bg-[#1e40af]/20', text: 'text-[#1e40af]' },
  put: { bg: 'bg-amber-500/15', text: 'text-amber-400' },
  patch: { bg: 'bg-amber-500/15', text: 'text-amber-400' },
  delete: { bg: 'bg-red-500/15', text: 'text-red-400' },
}

export function MethodBadge({ method, size = 'sm' }: MethodBadgeProps) {
  const styles = methodStyles[method] || methodStyles.get
  const sizeClass = size === 'sm' 
    ? 'text-[10px] px-2 py-1' 
    : 'text-xs px-2.5 py-1'
  
  return (
    <span className={`font-mono font-bold uppercase tracking-wider rounded-lg ${styles.bg} ${styles.text} ${sizeClass}`}>
      {method}
    </span>
  )
}
