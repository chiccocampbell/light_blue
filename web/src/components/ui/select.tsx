import React from 'react'

type Item = { value: string, label: string }

function flattenItems(children: any): Item[] {
  const items: Item[] = []
  React.Children.forEach(children, (child: any) => {
    if (!child) return
    if (child.type?.displayName === 'SelectContent') {
      React.Children.forEach(child.props.children, (item: any) => {
        if (item?.type?.displayName === 'SelectItem') {
          items.push({ value: item.props.value, label: item.props.children })
        }
      })
    }
  })
  return items
}

export const Select: React.FC<any> = ({value, onValueChange, children}) => {
  const items = flattenItems(children)
  return (
    <select className="w-full border rounded-xl px-3 py-2 text-sm bg-white"
      value={value} onChange={e=>onValueChange?.(e.target.value)}>
      {items.map(it => <option key={it.value} value={it.value}>{it.label}</option>)}
    </select>
  )
}
export const SelectTrigger: React.FC<any> = ({children}) => <>{children}</>
SelectTrigger.displayName='SelectTrigger'
export const SelectValue: React.FC<any> = () => null
SelectValue.displayName='SelectValue'
export const SelectContent: React.FC<any> = ({children}) => <>{children}</>
SelectContent.displayName='SelectContent'
export const SelectItem: React.FC<any> = ({children}) => <>{children}</>
SelectItem.displayName='SelectItem'