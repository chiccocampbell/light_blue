import React from 'react'
export const Switch = ({id, checked, onCheckedChange, disabled}: any) => (
  <label htmlFor={id} className={`inline-flex items-center cursor-pointer ${disabled?'opacity-50': ''}`}>
    <input id={id} type="checkbox" checked={checked} onChange={e=>onCheckedChange?.(e.target.checked)} className="hidden"/>
    <span className={`w-10 h-6 rounded-full transition ${checked?'bg-emerald-500':'bg-slate-300'} relative`}>
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition ${checked?'translate-x-4':''}`}></span>
    </span>
  </label>
)