import { useState, useEffect } from 'react'

export const AIProcessingStatus = ({ progress }: { progress: number }) => {
  const [step, setStep] = useState(0)
  const steps = [
    { icon: '📄', text: 'Analyzing document...' },
    { icon: '🧠', text: 'Extracting concepts...' },
    { icon: '📅', text: 'Designing revision plan...' },
    { icon: '🗂️', text: 'Generating flashcards...' },
    { icon: '📝', text: 'Creating quizzes...' },
    { icon: '✨', text: 'Finalizing materials...' }
  ]

  useEffect(() => {
    const timer = setInterval(() => {
      setStep((s) => (s + 1) % steps.length)
    }, 10000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="flex flex-col gap-2 w-48 sm:w-64">
      <div className="flex items-center justify-between text-xs font-semibold text-primary">
        <div className="flex items-center gap-2 overflow-hidden relative w-full">
          <svg className="animate-spin h-3.5 w-3.5 text-primary shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <div key={step} className="flex items-center gap-1.5 animate-in fade-in slide-in-from-bottom-2 duration-500 absolute left-6">
            <span className="text-sm">{steps[step].icon}</span>
            <span className="truncate whitespace-nowrap bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">{steps[step].text}</span>
          </div>
        </div>
        <span className="tabular-nums shrink-0 ml-2">{Math.round(progress)}%</span>
      </div>
      <div className="h-1.5 w-full bg-primary/10 rounded-full overflow-hidden shadow-inner mt-1">
        <div
          className="h-full bg-gradient-to-r from-primary/80 via-primary to-primary/80 transition-all duration-500 ease-out relative"
          style={{ width: `${progress}%` }}
        >
          <div className="absolute inset-0 bg-white/20 text-white animate-pulse"></div>
        </div>
      </div>
    </div>
  )
}