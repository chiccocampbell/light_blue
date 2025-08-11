import React from 'react'
export const Label: React.FC<React.LabelHTMLAttributes<HTMLLabelElement>> = ({className='', ...rest}) => (<label className={`text-sm font-medium ${className}`} {...rest} />)
