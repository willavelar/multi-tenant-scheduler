type Props = {
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
}

export function EmptyState({ title, description, action }: Props) {
  return (
    <div className="px-8 py-16 text-center">
      <p className="text-sm font-semibold text-gray-700 m-0 mb-1">{title}</p>
      {description && (
        <p className="text-[13px] text-gray-400 m-0 mb-4">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-500 text-white text-[13.5px] font-semibold rounded-lg border-0 cursor-pointer hover:bg-indigo-600 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
