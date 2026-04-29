import { useState } from 'react'
import { Card, CardContent } from "@/components/ui/card"

export const InteractiveFlashcard = ({ card }: { card: any }) => {
  const [isFlipped, setIsFlipped] = useState(false)
  return (
    <Card 
      className={`w-full wh-56 cursor-pointer transition-all duration-300 flex flex-col justify-center border-2 ${isFlipped ? 'bg-primary/5 border-primary/40' : 'bg-card hover:border-primary/30 shadow-sm hover:shadow-md'}`}
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <CardContent className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        {!isFlipped ? (
          <>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Term</span>
            <h3 className="font-bold text-xl mb-2 text-foreground">{card.term}</h3>
            {card.context_hint && <p className="text-sm text-muted-foreground/80 italic mt-2">💡 {card.context_hint}</p>}
            <p className="text-xs text-primary/60 mt-auto pt-4 font-medium">Click to reveal definition</p>
          </>
        ) : (
          <>
            <span className="text-xs font-semibold uppercase tracking-wider text-primary/80 mb-4">Definition</span>
            <p className="text-base font-medium text-foreground leading-relaxed">{card.definition}</p>
            <p className="text-xs text-muted-foreground mt-auto pt-4 font-medium">Click to show term</p>
          </>
        )}
      </CardContent>
    </Card>
  )
}