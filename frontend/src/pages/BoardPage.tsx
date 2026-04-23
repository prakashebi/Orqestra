import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { DragDropContext, DropResult } from '@hello-pangea/dnd'
import { Users } from 'lucide-react'
import { useBoardStore } from '../store/boardStore'
import { useAuthStore } from '../store/authStore'
import Navbar from '../components/layout/Navbar'
import BoardColumn from '../components/board/BoardColumn'
import AddColumnForm from '../components/board/AddColumnForm'
import CardModal from '../components/board/CardModal'
import Spinner from '../components/ui/Spinner'
import MembersModal from '../components/members/MembersModal'
import type { Card } from '../types'
import { entitiesApi } from '../api/entities'

export default function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>()
  const { workspaces, boards, columns, cards, loading, fetchBoardData, moveCard } = useBoardStore()
  const currentUser = useAuthStore((s) => s.user)

  const [selectedCard, setSelectedCard] = useState<Card | null>(null)
  const [boardTitle, setBoardTitle] = useState('')
  const [showMembers, setShowMembers] = useState(false)
  const [boardOwnerId, setBoardOwnerId] = useState<string | undefined>()

  const board = boards.find((b) => b.id === boardId)
  const workspace = workspaces.find((w) => w.id === board?.metadata?.workspace_id)

  useEffect(() => {
    if (!boardId) return
    fetchBoardData(boardId)
    if (!board) {
      entitiesApi.getById(boardId).then((e) => {
        setBoardTitle(e.title)
        setBoardOwnerId(e.owner_id ?? undefined)
      })
    }
  }, [boardId, fetchBoardData])

  useEffect(() => {
    if (board) {
      setBoardTitle(board.title)
      setBoardOwnerId(board.owner_id ?? undefined)
    }
  }, [board])

  const cardsForColumn = (columnId: string) =>
    cards
      .filter((c) => c.metadata?.column_id === columnId)
      .sort((a, b) => (a.metadata?.order ?? 0) - (b.metadata?.order ?? 0))

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return
    const { draggableId, destination } = result
    await moveCard(draggableId, destination.droppableId, destination.index)
  }

  const currentCard = selectedCard
    ? (cards.find((c) => c.id === selectedCard.id) ?? selectedCard)
    : null

  const canManageMembers =
    currentUser?.role === 'admin' || (boardOwnerId && currentUser?.id === boardOwnerId)

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Navbar
        breadcrumbs={[
          { label: 'Workspaces', href: '/' },
          ...(workspace ? [{ label: workspace.title, href: `/workspace/${workspace.id}` }] : []),
          { label: boardTitle },
        ]}
        actions={
          canManageMembers && boardId ? (
            <button
              onClick={() => setShowMembers(true)}
              className="flex items-center gap-1.5 rounded-lg bg-white/20 px-3 py-1.5 text-sm text-white hover:bg-white/30 transition-colors"
            >
              <Users size={15} /> Members
            </button>
          ) : null
        }
      />

      {loading && columns.length === 0 ? (
        <div className="flex flex-1 items-center justify-center bg-indigo-600">
          <Spinner size="lg" className="border-white border-t-transparent" />
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex flex-1 gap-4 overflow-x-auto bg-indigo-600 p-4 items-start">
            {columns.map((col) => (
              <BoardColumn
                key={col.id}
                column={col}
                cards={cardsForColumn(col.id)}
                boardId={boardId!}
                onCardClick={setSelectedCard}
              />
            ))}
            {boardId && <AddColumnForm boardId={boardId} />}
          </div>
        </DragDropContext>
      )}

      {currentCard && (
        <CardModal card={currentCard} onClose={() => setSelectedCard(null)} />
      )}

      {boardId && (
        <MembersModal
          entityId={boardId}
          entityTitle={boardTitle}
          ownerId={boardOwnerId}
          isOpen={showMembers}
          onClose={() => setShowMembers(false)}
        />
      )}
    </div>
  )
}
