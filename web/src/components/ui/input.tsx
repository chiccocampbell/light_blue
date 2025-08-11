import React from 'react'
export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({className='', ...rest}) => (
  <input className={`w-full border rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 ${className}`} {...rest} />
)