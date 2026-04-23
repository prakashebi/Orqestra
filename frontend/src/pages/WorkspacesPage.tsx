import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Layers, Users } from 'lucide-react'
import { useBoardStore } from '../store/boardStore'
import { useAuthStore } from '../store/authStore'
import Navbar from '../components/layout/Navbar'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import MembersModal from '../components/members/MembersModal'
import type { Entity } from '../types'

const BG_COLORS = [
  'from-indigo-500 to-purple-600',
  'from-blue-500 to-cyan-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-red-500',
  'from-pink-500 to-rose-600',
  'from-violet-500 to-indigo-600',
]

export default function WorkspacesPage() {
  const navigate = useNavigate()
  const { workspaces, loading, error, fetchWorkspaces, createWorkspace } = useBoardStore()
  const currentUser = useAuthStore((s) => s.user)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [membersTarget, setMembersTarget] = useState<Entity | null>(null)

  useEffect(() => { fetchWorkspaces() }, [fetchWorkspaces])

  const handleCreate = async () => {
    const name = newName.trim()
    if (!name) return
    setCreating(true)
    await createWorkspace(name)
    setNewName('')
    setShowCreate(false)
    setCreating(false)
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />

      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Workspaces</h1>
            <p className="mt-1 text-sm text-gray-500">Select a workspace or create a new one</p>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={16} className="mr-1.5" /> New workspace
          </Button>
        </div>

        {loading && (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
        )}

        {!loading && workspaces.length === 0 && (
          <div className="flex flex-col items-center py-24 text-center">
            <Layers size={48} className="mb-4 text-gray-300" />
            <p className="text-gray-500">No workspaces yet.</p>
            <p className="mt-1 text-sm text-gray-400">Create your first workspace to get started.</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {workspaces.map((ws, i) => (
            <div
              key={ws.id}
              className="group relative overflow-hidden rounded-2xl shadow-sm hover:shadow-md transition-shadow"
            >
              <button
                onClick={() => navigate(`/workspace/${ws.id}`)}
                className={`w-full bg-gradient-to-br ${BG_COLORS[i % BG_COLORS.length]} h-24 p-5 text-left`}
              >
                <h3 className="text-lg font-bold text-white group-hover:underline">{ws.title}</h3>
              </button>
              <div className="flex items-center justify-between bg-white px-5 py-3">
                <p className="text-xs text-gray-400">
                  Created {new Date(ws.created_at).toLocaleDateString()}
                </p>
                {(currentUser?.role === 'admin' || ws.owner_id === currentUser?.id) && (
                  <button
                    onClick={() => setMembersTarget(ws)}
                    title="Manage members"
                    className="flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
                  >
                    <Users size={13} /> Members
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New workspace">
        <div className="space-y-4">
          <Input
            label="Workspace name"
            placeholder="e.g. Product Team"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button loading={creating} onClick={handleCreate}>Create</Button>
          </div>
        </div>
      </Modal>

      {membersTarget && (
        <MembersModal
          entityId={membersTarget.id}
          entityTitle={membersTarget.title}
          ownerId={membersTarget.owner_id ?? undefined}
          isOpen={!!membersTarget}
          onClose={() => setMembersTarget(null)}
        />
      )}
    </div>
  )
}
