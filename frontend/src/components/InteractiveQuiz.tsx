import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export const InteractiveQuiz = ({ q, index }: { q: any, index: number }) => {
  const [selected, setSelected] = useState<string | null>(null)
  const options = useMemo(() => {
    const opts = [...(q.distractors || []), q.correct_answer]
    return opts.sort(() => Math.random() - 0.5)
  }, [q])

  return (
    <Card className="mb-6 shadow-sm border-border/50 hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-4 bg-muted/20 border-b border-border/50">
        <CardTitle className="text-lg flex justify-between items-start leading-snug">
          <span className="font-semibold text-foreground/90 leading-relaxed">{index + 1}. {q.question_text}</span>
          <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full whitespace-nowrap ml-4 border border-primary/20 font-medium">
            Level {q.difficulty}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="flex flex-col gap-3">
          {options.map((opt) => {
            const isSelected = selected === opt
            const isCorrect = opt === q.correct_answer
            const showResult = selected !== null
            
            let btnVariant = "outline"
            let extraClass = "justify-start text-left h-auto py-3.5 px-5 font-normal whitespace-normal transition-all duration-200 "
            
            if (showResult) {
              if (isCorrect) {
                extraClass += "bg-green-600 hover:bg-green-700 text-white border-green-600 shadow-sm ring-2 ring-green-600/20 "
              } else if (isSelected) {
                extraClass += "bg-red-600 hover:bg-red-700 text-white border-red-600 shadow-sm "
              } else {
                extraClass += "opacity-50 bg-background "
              }
            } else if (isSelected) {
              btnVariant = "secondary"
              extraClass += "ring-2 ring-primary "
            } else {
              extraClass += "hover:bg-muted/50 hover:border-primary/50 "
            }

            return (
              <Button 
                key={opt}
                variant={btnVariant as any} 
                className={extraClass}
                disabled={showResult}
                onClick={() => setSelected(opt)}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border shrink-0 flex items-center justify-center ${showResult && isCorrect ? 'border-white' : showResult && isSelected ? 'border-white' : 'border-muted-foreground'}`}>
                    {showResult && isCorrect && <div className="w-2 h-2 rounded-full bg-white" />}
                    {showResult && isSelected && !isCorrect && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <span>{opt}</span>
                </div>
              </Button>
            )
          })}
        </div>
        {selected && q.pedagogical_explanation && (
          <div className="mt-6 p-4 bg-primary/5 text-foreground/90 rounded-lg text-sm border border-primary/20 animate-in fade-in slide-in-from-top-2">
            <strong className="text-primary font-semibold flex items-center gap-2 mb-1">
              💡 Explanation 
            </strong> 
            <p className="leading-relaxed">{q.pedagogical_explanation}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}