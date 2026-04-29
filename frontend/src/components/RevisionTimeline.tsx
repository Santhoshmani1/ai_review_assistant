export const RevisionTimeline = ({ plan }: { plan: any[] }) => {
  return (
    <div className="relative border-l-2 border-primary/20 ml-3 md:ml-6 py-2 space-y-8 mt-4">
      {plan.map((stage: any, index: number) => (
        <div key={index} className="ml-8 relative">
          <span className="absolute -left-[41px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-background border-2 border-primary shadow-sm"></span>
          <h4 className="font-bold text-lg leading-none mb-3 text-foreground">
            Step {stage.step_number}: {stage.module_title}
          </h4>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-4">
            <span className="bg-secondary text-secondary-foreground px-2.5 py-1.5 rounded-md font-medium flex items-center gap-1.5">
              ⏱ {stage.duration_minutes} mins
            </span>
            <span className={`px-2.5 py-1.5 rounded-md font-medium flex items-center gap-1.5 ${
              stage.priority === 'High' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 
              stage.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 
              'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            }`}>
              Priority: {stage.priority}
            </span>
          </div>
          {stage.key_learning_objectives && stage.key_learning_objectives.length > 0 && (
            <div className="bg-muted/30 rounded-lg p-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Learning Objectives</span>
              <ul className="list-disc ml-4 text-sm text-foreground/80 space-y-1.5">
                {stage.key_learning_objectives.map((obj: string, idx: number) => (
                  <li key={idx}>{obj}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}