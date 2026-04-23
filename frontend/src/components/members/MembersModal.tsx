import { useEffect, useState } from 'react'
import { UserPlus, Trash2, Shield } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Spinner from '../ui/Spinner'
import { membersApi, type Member, type MemberRole } from '../../api/members'
import { useAuthStore } from '../../store/authStore'

interface Props {
  entityId: string
  entityTitle: string
  isOpen: boolean
  onClose: () => void
  /** ID of the entity owner — used to hide remove button for owner */
  ownerId?: string
}

export default function MembersModal({ entityId, entityTitle, isOpen, onClose, ownerId }: Props) {
  const currentUser = useAuthStore((s) => s.user)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<MemberRole>('viewer')
  const [inviting, setInviting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isOwnerOrAdmin = currentUser?.role === 'admin' || currentUser?.id === ownerId

  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    setError(null)
    membersApi
      .list(entityId)
      .then(setMembers)
      .catch(() => setError('Failed to load members'))
      .finally(() => setLoading(false))
  }, [entityId, isOpen])

  const handleInvite = async () => {
    const email = inviteEmail.trim()
    if (!email) return
    setInviting(true)
    setError(null)
    try {
      const member = await membersApi.invite(entityId, email, inviteRole)
      setMembers((prev) => [...prev, member])
      setInviteEmail('')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg ?? 'Failed to invite member')
    } finally {
      setInviting(false)
    }
  }

  const handleRoleChange = async (member: Member, role: MemberRole) => {
    try {
      const updated = await membersApi.updateRole(entityId, member.user_id, role)
      setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
    } catch {
      setError('Failed to update role')
    }
  }

  const handleRemove = async (member: Member) => {
    try {
      await membersApi.remove(entityId, member.user_id)
      setMembers((prev) => prev.filter((m) => m.id !== member.id))
    } catch {
      setError('Failed to remove member')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Members — ${entityTitle}`} size="lg">
      <div className="space-y-5">
        {/* Invite form — only owners and admins */}
        {isOwnerOrAdmin && (
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <p className="mb-3 text-sm font-medium text-gray-700">Invite by email</p>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder="colleague@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleInvite() }}
                />
              </div>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as MemberRole)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
              </select>
              <Button loading={inviting} onClick={handleInvite}>
                <UserPlus size={15} className="mr-1" /> Invite
              </Button>
            </div>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        {/* Member list */}
        {loading ? (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ) : members.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-400">No members yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-3 py-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold uppercase text-indigo-700">
                  {m.username.slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{m.username}</p>
                  <p className="text-xs text-gray-400 truncate">{m.email}</p>
                </div>

                {isOwnerOrAdmin ? (
                  <select
                    value={m.role}
                    onChange={(e) => handleRoleChange(m, e.target.value as MemberRole)}
                    className="rounded border border-gray-200 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                  </select>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                    <Shield size={11} /> {m.role}
                  </span>
                )}

                {(isOwnerOrAdmin || currentUser?.id === m.user_id) && (
                  <button
                    onClick={() => handleRemove(m)}
                    title="Remove member"
                    className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  )
}
