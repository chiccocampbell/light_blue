import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Smartphone } from 'lucide-react'

export default function App(){
  const install = ()=>{
    // prompt happens via browser when eligible; this is a placeholder
    alert('On Android/Chrome, use the menu to Install app. On iOS Safari: Share → Add to Home Screen.')
  }
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="text-3xl font-semibold mb-2">TwoNest Budget</h1>
        <p className="text-slate-600 mb-6">PWA skeleton is live. Replace this with your app content (see README).</p>
        <Card><CardHeader><CardTitle>Install</CardTitle></CardHeader><CardContent><Button onClick={install}><Smartphone className="w-4 h-4 mr-2" />Install app</Button></CardContent></Card>
      </div>
    </div>
  )
}