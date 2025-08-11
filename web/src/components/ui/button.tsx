import React from 'react'
type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default'|'secondary'|'outline'|'ghost'|'destructive', size?: 'sm'|'md'|'icon' }
export const Button: React.FC<Props> = ({variant='default', size='md', className='', children, ...rest}) => {
  const v = {
    default: 'bg-emerald-600 text-white hover:bg-emerald-700',
    secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200',
    outline: 'border bg-white hover:bg-slate-50',
    ghost: 'bg-transparent hover:bg-slate-100',
    destructive: 'bg-rose-600 text-white hover:bg-rose-700'
  }[variant]
  const s = {
    sm: 'px-2 py-1 text-sm rounded-lg',
    md: 'px-3 py-2 text-sm rounded-xl',
    icon: 'p-2 rounded-xl'
  }[size]
  return <button className={`${v} ${s} ${className}`} {...rest}>{children}</button>
}