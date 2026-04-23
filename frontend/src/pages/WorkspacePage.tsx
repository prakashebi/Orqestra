import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, LayoutDashboard, Users } from 'lucide-react'
import { useBoardStore } from '../store/boardStore'
import { useAuthStore } from '../store/authStore'
import Navbar from '../components/layout/Navbar'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import MembersModal from '../components/members/MembersModal'
import type { Entity } from '../types'

const BOARD_COLORS = [
  'bg-gradient-to-br from-sky-500 to-blue-600',
  'bg-gradient-to-br from-violet-500 to-purple-700',
  'bg-gradient-to-br from-teal-500 to-emerald-600',
  'bg-gradient-to-br from-rose-500 to-pink-700',
  'bg-gradient-to-br from-amber-500 to-orange-600',
  'bg-gradient-to-br from-lime-500 to-green-600',
]

export default function WorkspacePage() {
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const navigate = useNavigate()
  const { workspaces, boards, loading, fetchBoards, createBoard } = useBoardStore()
  const currentUser = useAuthStore((s) => s.user)

  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [membersTarget, setMembersTarget] = useState<Entity | null>(null)

  const workspace = workspaces.find((w) => w.id === workspaceId)

  useEffect(() => {
    if (workspaceId) fetchBoards(workspaceId)
  }, [workspaceId, fetchBoards])

  const handleCreate = async () => {
    const name = newName.trim()
    if (!name || !workspaceId) return
    setCreating(true)
    await createBoard(workspaceId, name)
    setNewName('')
    setShowCreate(false)
    setCreating(false)
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar
        breadcrumbs={[
          { label: 'Workspaces', href: '/' },
          { label: workspace?.title ?? 'Workspace' },
        ]}
      />

      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{workspace?.title ?? 'Workspace'}</h1>
            <p className="mt-1 text-sm text-gray-500">Your boards</p>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={16} className="mr-1.5" /> New board
          </Button>
        </div>

        {loading && (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        )}

        {!loading && boards.length === 0 && (
          <div className="flex flex-col items-center py-24 text-center">
            <LayoutDashboard size={48} className="mb-4 text-gray-300" />
            <p className="text-gray-500">No boards yet.</p>
            <p className="mt-1 text-sm text-gray-400">Create your first board to start organising work.</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {boards.map((board, i) => (
            <div key={board.id} className="group relative rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <button
                onClick={() => navigate(`/board/${board.id}`)}
                className={`w-full ${BOARD_COLORS[i % BOARD_COLORS.length]} flex h-28 items-end p-4 text-left`}
              >
                <span className="text-base font-bold text-white drop-shadow group-hover:underline">
                  {board.title}
                </span>
              </button>
              {(currentUser?.role === 'admin' || board.owner_id === currentUser?.id) && (
                <div className="flex justify-end bg-white px-3 py-1.5">
                  <button
                    onClick={() => setMembersTarget(board)}
                    title="Manage members"
                    className="flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
                  >
                    <Users size={13} /> Members
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New board">
        <div className="space-y-4">
          <Input
            label="Board name"
            placeholder="e.g. Sprint 12"
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
