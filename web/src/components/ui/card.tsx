import React from 'react'
export const Card = ({ className='', children }: any) => (
  <div className={`rounded-2xl border bg-white shadow-sm ${className}`}>{children}</div>
)
export const CardHeader = ({ className='', children }: any) => (
  <div className={`p-4 border-b ${className}`}>{children}</div>
)
export const CardTitle = ({ className='', children }: any) => (
  <div className={`font-semibold text-lg ${className}`}>{children}</div>
)
export const CardContent = ({ className='', children }: any) => (
  <div className={`p-4 ${className}`}>{children}</div>
)