import React from 'react'
export const Progress = ({value=0}: {value?: number}) => (
  <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
    <div className="h-2 bg-emerald-500" style={{width:`${Math.min(100, Math.max(0, value||0))}%`}}></div>
  </div>
)