import React, { createContext, useContext, useState } from 'react'

const Ctx = createContext<any>(null)

export const Dialog: React.FC<any> = ({open, onOpenChange, children}) => {
  const [internal, setInternal] = useState(false)
  const isOpen = open ?? internal
  const setOpen = (v:boolean)=> { onOpenChange? onOpenChange(v): setInternal(v) }
  return <Ctx.Provider value={{isOpen, setOpen}}>{children}</Ctx.Provider>
}
export const DialogTrigger: React.FC<any> = ({asChild, children}) => {
  const { setOpen } = useContext(Ctx)
  const child = React.Children.only(children)
  const props = { onClick: (e:any)=>{ (child as any).props?.onClick?.(e); setOpen(true) } }
  // @ts-ignore
  return asChild && React.isValidElement(child) ? React.cloneElement(child, props) : <button onClick={()=>setOpen(true)}>{children}</button>
}
export const DialogContent: React.FC<any> = ({className='', children}) => {
  const { isOpen, setOpen } = useContext(Ctx)
  if(!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={()=>setOpen(false)}></div>
      <div className={`relative bg-white rounded-2xl shadow-xl w-[95%] max-w-xl ${className}`}>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}
export const DialogHeader: React.FC<any> = ({children}) => <div className="mb-2">{children}</div>
export const DialogTitle: React.FC<any> = ({children}) => <div className="text-lg font-semibold">{children}</div>