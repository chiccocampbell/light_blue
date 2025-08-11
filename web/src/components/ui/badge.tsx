import React from 'react'
export const Badge = ({children, variant='default', className='' }: any) => {
  const v = {
    default:'bg-emerald-600 text-white',
    secondary:'bg-slate-200 text-slate-900',
    destructive:'bg-rose-600 text-white',
    outline:'border text-slate-700'
  }[variant] || ''
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${v} ${className}`}>{children}</span>
}