import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function SettingsView() {
  const navigate = useNavigate()

  return (
    <div className="h-screen flex flex-col items-center justify-center font-sans text-[#1E2532]">
      <button
        onClick={() => navigate('/')}
        className="absolute top-4 left-4 p-2 rounded-lg hover:bg-[#EEEEEE] transition-colors"
      >
        <ArrowLeft className="w-4 h-4 text-[#6B7C93]" />
      </button>
      <h1 className="text-lg font-semibold mb-2">Settings</h1>
      <p className="text-sm text-[#6B7C93]">Settings page placeholder.</p>
    </div>
  )
}