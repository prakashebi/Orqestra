import { useRef, useState } from 'react'
import { Download, FileText, Paperclip, Send, Trash2, User, X } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useBoardStore } from '../../store/boardStore'
import { attachmentsApi } from '../../api/entities'
import type { Attachment, Card, Comment } from '../../types'
import Button from '../ui/Button'

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
]

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-gray-100 text-gray-600',
  archived: 'bg-red-100 text-red-600',
}

interface Props {
  card: Card
  onClose: () => void
}

export default function CardModal({ card, onClose }: Props) {
  const { user } = useAuthStore()
  const { updateCard, deleteCard, addComment, uploadAttachment, removeAttachment } = useBoardStore()

  const [title, setTitle] = useState(card.title)
  const [description, setDescription] = useState(card.description ?? '')
  const [status, setStatus] = useState(card.status)
  const [commentText, setCommentText] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const comments: Comment[] = (card.metadata?.comments as Comment[]) ?? []
  const attachments: Attachment[] = (card.metadata?.attachments as Attachment[]) ?? []

  const handleSave = async () => {
    setSaving(true)
    await updateCard(card.id, { title, description: description || null, status })
    setSaving(false)
    onClose()
  }

  const handleDelete = async () => {
    if (!confirm('Delete this card?')) return
    setDeleting(true)
    await deleteCard(card.id)
    onClose()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setUploadError(null)
    setUploading(true)
    try {
      await uploadAttachment(card.id, file)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setUploadError(msg ?? 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveAttachment = async (attachmentId: string) => {
    await removeAttachment(card.id, attachmentId)
  }

  const handleDownload = async (attachment: Attachment) => {
    const token = localStorage.getItem('token')
    const url = attachmentsApi.downloadUrl(card.id, attachment.id)
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = attachment.name
    a.click()
    URL.revokeObjectURL(blobUrl)
  }

  const handleAddComment = async () => {
    const text = commentText.trim()
    if (!text || !user) return
    const comment: Comment = {
      id: crypto.randomUUID(),
      text,
      author_id: user.id,
      author_name: user.username,
      created_at: new Date().toISOString(),
    }
    await addComment(card.id, comment)
    setCommentText('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-16">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="border-b px-6 pt-6 pb-4">
          <input
            className="w-full text-xl font-semibold text-gray-900 focus:outline-none"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-3 gap-6 p-6">
          {/* Main content */}
          <div className="col-span-2 space-y-5">
            {/* Description */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Description
              </label>
              <textarea
                rows={4}
                placeholder="Add a more detailed description…"
                className="w-full rounded-lg border border-gray-200 p-3 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-300 resize-none"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Comments */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Comments
              </label>
              <div className="space-y-3 mb-3">
                {comments.length === 0 && (
                  <p className="text-xs text-gray-400">No comments yet.</p>
                )}
                {comments.map((c) => (
                  <div key={c.id} className="flex gap-2">
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                      {c.author_name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 rounded-lg bg-gray-50 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-700">{c.author_name}</span>
                        <span className="text-xs text-gray-400">
                          {new Date(c.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="mt-0.5 text-sm text-gray-600">{c.text}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
                  placeholder="Write a comment…"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddComment() }}
                />
                <button
                  onClick={handleAddComment}
                  disabled={!commentText.trim()}
                  className="rounded-lg bg-indigo-600 p-2 text-white hover:bg-indigo-700 disabled:opacity-40"
                >
                  <Send size={15} />
                </button>
              </div>
            </div>

            {/* Attachments */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Attachments
              </label>

              {attachments.length > 0 && (
                <ul className="mb-2 space-y-1.5">
                  {attachments.map((a) => (
                    <li key={a.id} className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm">
                      <FileText size={14} className="flex-shrink-0 text-gray-400" />
                      <span className="flex-1 truncate text-gray-700">{a.name}</span>
                      <span className="flex-shrink-0 text-xs text-gray-400">
                        {(a.size / 1024).toFixed(0)} KB
                      </span>
                      <button
                        onClick={() => handleDownload(a)}
                        className="flex-shrink-0 text-indigo-500 hover:text-indigo-700"
                        title="Download"
                      >
                        <Download size={14} />
                      </button>
                      <button
                        onClick={() => handleRemoveAttachment(a.id)}
                        className="flex-shrink-0 text-gray-400 hover:text-red-500"
                        title="Remove"
                      >
                        <X size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex w-full items-center gap-2 rounded-lg border-2 border-dashed border-gray-200 px-4 py-3 text-sm text-gray-400 hover:border-indigo-300 hover:text-indigo-500 disabled:opacity-50 transition-colors"
              >
                <Paperclip size={15} />
                <span>{uploading ? 'Uploading…' : 'Attach a file'}</span>
              </button>
              {uploadError && (
                <p className="mt-1 text-xs text-red-500">{uploadError}</p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Status */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Card['status'])}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status]}`}>
                {STATUS_OPTIONS.find((o) => o.value === status)?.label}
              </span>
            </div>

            {/* Assignee */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Assignee
              </label>
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-400">
                <User size={14} />
                {card.metadata?.assignee_name
                  ? <span className="text-gray-700">{card.metadata.assignee_name as string}</span>
                  : <span>Unassigned</span>
                }
              </div>
            </div>

            {/* Dates */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Created
              </label>
              <p className="text-xs text-gray-500">
                {new Date(card.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t px-6 py-4">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 disabled:opacity-50"
          >
            <Trash2 size={15} /> Delete card
          </button>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" loading={saving} onClick={handleSave}>Save changes</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
