export default function ProgressBar({ currentIndex, playerResults, total = 5 }) {
  return (
    <div className="flex items-center gap-3 w-full max-w-md mx-auto">
      <span className="text-xs font-mono text-chalk/40 whitespace-nowrap tracking-widest uppercase">
        Player {currentIndex + 1} of {total}
      </span>
      <div className="flex gap-1.5 flex-1">
        {Array.from({ length: total }).map((_, i) => {
          const result = playerResults[i]
          let state = 'default'
          if (result?.correct) state = 'correct'
          else if (result && !result.correct) state = 'wrong'
          else if (i === currentIndex) state = 'active'
          return <div key={i} className={`pip ${state}`} />
        })}
      </div>
    </div>
  )
}
