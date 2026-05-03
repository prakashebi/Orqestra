import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import {
  Search, X, LayoutGrid, KanbanSquare, FileText, Columns3,
  ArrowRight, Loader2, AlertCircle,
} from 'lucide-react'
import Navbar from '../components/layout/Navbar'
import { entitiesApi } from '../api/entities'
import type { Entity } from '../types'

const TYPE_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  workspace: {
    label: 'Workspace',
    icon: <LayoutGrid size={16} />,
    color: 'bg-violet-100 text-violet-700',
  },
  board: {
    label: 'Board',
    icon: <KanbanSquare size={16} />,
    color: 'bg-blue-100 text-blue-700',
  },
  card: {
    label: 'Card',
    icon: <FileText size={16} />,
    color: 'bg-emerald-100 text-emerald-700',
  },
  column: {
    label: 'Column',
    icon: <Columns3 size={16} />,
    color: 'bg-amber-100 text-amber-700',
  },
}

const TYPE_ORDER = ['workspace', 'board', 'card', 'column']

function entityHref(entity: Entity): string {
  const meta = entity.metadata as Record<string, unknown> | null
  switch (entity.entity_type) {
    case 'workspace':
      return `/workspace/${entity.id}`
    case 'board':
      return `/board/${entity.id}`
    case 'card':
    case 'column':
      return meta?.board_id ? `/board/${meta.board_id}` : '/'
    default:
      return '/'
  }
}

function groupByType(items: Entity[]): Record<string, Entity[]> {
  return items.reduce<Record<string, Entity[]>>((acc, item) => {
    const key = item.entity_type
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})
}

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)

  const initialQuery = searchParams.get('q') ?? ''
  const [inputValue, setInputValue] = useState(initialQuery)
  const [results, setResults] = useState<Entity[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)

  // Run search whenever the URL `q` param changes
  useEffect(() => {
    const q = searchParams.get('q') ?? ''
    setInputValue(q)
    if (!q.trim()) {
      setResults([])
      setTotal(0)
      setSearched(false)
      return
    }
    setLoading(true)
    setError(null)
    entitiesApi
      .list({ q: q.trim(), limit: 100 })
      .then((data) => {
        setResults(data.items)
        setTotal(data.total)
        setSearched(true)
      })
      .catch(() => setError('Search failed. Please try again.'))
      .finally(() => setLoading(false))
  }, [searchParams])

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const q = inputValue.trim()
    if (q) {
      setSearchParams({ q })
    } else {
      setSearchParams({})
    }
  }

  const handleClear = () => {
    setInputValue('')
    setSearchParams({})
    inputRef.current?.focus()
  }

  const grouped = groupByType(results)
  const orderedTypes = TYPE_ORDER.filter((t) => grouped[t]?.length)
  const otherTypes = Object.keys(grouped).filter((t) => !TYPE_ORDER.includes(t))

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <Navbar breadcrumbs={[{ label: 'Search' }]} />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-4 py-10">
          {/* Search input */}
          <form onSubmit={handleSubmit} className="relative mb-8">
            <Search
              size={20}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Search workspaces, boards, cards…"
              className="w-full rounded-xl border border-gray-200 bg-white py-3.5 pl-11 pr-12 text-sm shadow-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
            {inputValue && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-12 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
            <button
              type="submit"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
            >
              Go
            </button>
          </form>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center gap-2 py-16 text-gray-400">
              <Loader2 size={20} className="animate-spin" />
              <span className="text-sm">Searching…</span>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* No results */}
          {!loading && !error && searched && results.length === 0 && (
            <div className="py-16 text-center text-gray-400">
              <Search size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No results for <strong className="text-gray-600">"{searchParams.get('q')}"</strong></p>
              <p className="mt-1 text-xs">Try different keywords or check your spelling.</p>
            </div>
          )}

          {/* Empty state before first search */}
          {!loading && !error && !searched && (
            <div className="py-16 text-center text-gray-400">
              <Search size={36} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">Type something above to search across all your workspaces, boards and cards.</p>
            </div>
          )}

          {/* Results */}
          {!loading && !error && results.length > 0 && (
            <>
              <p className="mb-5 text-xs text-gray-400">
                {total} result{total !== 1 ? 's' : ''} for{' '}
                <span className="font-medium text-gray-600">"{searchParams.get('q')}"</span>
              </p>

              <div className="space-y-7">
                {[...orderedTypes, ...otherTypes].map((type) => {
                  const meta = TYPE_META[type]
                  const items = grouped[type]
                  return (
                    <section key={type}>
                      <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
                        {meta?.icon}
                        {meta?.label ?? type}s
                        <span className="ml-1 font-normal normal-case tracking-normal">({items.length})</span>
                      </h2>
                      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                        {items.map((entity, idx) => (
                          <Link
                            key={entity.id}
                            to={entityHref(entity)}
                            className={`group flex items-start gap-3 px-4 py-3.5 hover:bg-indigo-50 ${
                              idx < items.length - 1 ? 'border-b border-gray-100' : ''
                            }`}
                          >
                            {/* Type icon */}
                            <span
                              className={`mt-0.5 flex shrink-0 items-center justify-center rounded-md p-1.5 ${
                                meta?.color ?? 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              {meta?.icon ?? <FileText size={14} />}
                            </span>

                            {/* Content */}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-gray-800 group-hover:text-indigo-700">
                                {entity.title}
                              </p>
                              {entity.description && (
                                <p className="mt-0.5 line-clamp-1 text-xs text-gray-400">
                                  {entity.description}
                                </p>
                              )}
                            </div>

                            {/* Status badge + arrow */}
                            <div className="flex shrink-0 items-center gap-2">
                              <StatusBadge status={entity.status} />
                              <ArrowRight
                                size={14}
                                className="text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-400"
                              />
                            </div>
                          </Link>
                        ))}
                      </div>
                    </section>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active:      'bg-green-100 text-green-700',
    in_progress: 'bg-blue-100 text-blue-700',
    completed:   'bg-gray-100 text-gray-500',
    archived:    'bg-yellow-100 text-yellow-700',
  }
  const labels: Record<string, string> = {
    active:      'Active',
    in_progress: 'In progress',
    completed:   'Completed',
    archived:    'Archived',
  }
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {labels[status] ?? status}
    </span>
  )
}
