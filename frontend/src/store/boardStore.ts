import { create } from 'zustand'
import { attachmentsApi, entitiesApi } from '../api/entities'
import type { Board, Card, Column, Comment, Workspace } from '../types'

interface BoardState {
  workspaces: Workspace[]
  boards: Board[]
  columns: Column[]
  cards: Card[]
  loading: boolean
  error: string | null

  fetchWorkspaces: () => Promise<void>
  createWorkspace: (title: string) => Promise<void>
  fetchBoards: (workspaceId: string) => Promise<void>
  createBoard: (workspaceId: string, title: string) => Promise<void>
  fetchBoardData: (boardId: string) => Promise<void>
  createColumn: (boardId: string, title: string) => Promise<void>
  createCard: (columnId: string, boardId: string, title: string) => Promise<void>
  moveCard: (cardId: string, targetColumnId: string, targetIndex: number) => Promise<void>
  updateCard: (cardId: string, updates: Partial<Pick<Card, 'title' | 'description' | 'status' | 'metadata'>>) => Promise<void>
  deleteCard: (cardId: string) => Promise<void>
  addComment: (cardId: string, comment: Comment) => Promise<void>
  uploadAttachment: (cardId: string, file: File) => Promise<void>
  removeAttachment: (cardId: string, attachmentId: string) => Promise<void>
  clearError: () => void
}

export const useBoardStore = create<BoardState>((set, get) => ({
  workspaces: [],
  boards: [],
  columns: [],
  cards: [],
  loading: false,
  error: null,

  fetchWorkspaces: async () => {
    set({ loading: true, error: null })
    try {
      const res = await entitiesApi.list({ entity_type: 'workspace', limit: 200 })
      set({ workspaces: res.items as Workspace[], loading: false })
    } catch {
      set({ error: 'Failed to load workspaces', loading: false })
    }
  },

  createWorkspace: async (title) => {
    const entity = await entitiesApi.create({ entity_type: 'workspace', title })
    set((s) => ({ workspaces: [...s.workspaces, entity as Workspace] }))
  },

  fetchBoards: async (workspaceId) => {
    set({ loading: true, error: null })
    try {
      const res = await entitiesApi.list({ entity_type: 'board', limit: 200 })
      const boards = (res.items as Board[]).filter(
        (b) => b.metadata?.workspace_id === workspaceId
      )
      set({ boards, loading: false })
    } catch {
      set({ error: 'Failed to load boards', loading: false })
    }
  },

  createBoard: async (workspaceId, title) => {
    const entity = await entitiesApi.create({
      entity_type: 'board',
      title,
      metadata: { workspace_id: workspaceId },
    })
    set((s) => ({ boards: [...s.boards, entity as Board] }))
  },

  fetchBoardData: async (boardId) => {
    set({ loading: true, error: null })
    try {
      const [colRes, cardRes] = await Promise.all([
        entitiesApi.list({ entity_type: 'column', limit: 200 }),
        entitiesApi.list({ entity_type: 'card', limit: 200 }),
      ])
      const columns = (colRes.items as Column[])
        .filter((c) => c.metadata?.board_id === boardId)
        .sort((a, b) => (a.metadata?.order ?? 0) - (b.metadata?.order ?? 0))
      const cards = (cardRes.items as Card[])
        .filter((c) => c.metadata?.board_id === boardId)
        .sort((a, b) => (a.metadata?.order ?? 0) - (b.metadata?.order ?? 0))
      set({ columns, cards, loading: false })
    } catch {
      set({ error: 'Failed to load board data', loading: false })
    }
  },

  createColumn: async (boardId, title) => {
    const order = get().columns.filter((c) => c.metadata?.board_id === boardId).length
    const entity = await entitiesApi.create({
      entity_type: 'column',
      title,
      metadata: { board_id: boardId, order },
    })
    set((s) => ({ columns: [...s.columns, entity as Column] }))
  },

  createCard: async (columnId, boardId, title) => {
    const order = get().cards.filter((c) => c.metadata?.column_id === columnId).length
    const entity = await entitiesApi.create({
      entity_type: 'card',
      title,
      metadata: { column_id: columnId, board_id: boardId, order, comments: [] },
    })
    set((s) => ({ cards: [...s.cards, entity as Card] }))
  },

  moveCard: async (cardId, targetColumnId, targetIndex) => {
    // Optimistic update
    set((s) => {
      const cards = s.cards.map((c) => {
        if (c.id !== cardId) return c
        return {
          ...c,
          metadata: { ...c.metadata, column_id: targetColumnId, order: targetIndex },
        } as Card
      })
      return { cards }
    })
    const card = get().cards.find((c) => c.id === cardId)
    if (!card) return
    await entitiesApi.update(cardId, {
      metadata: { ...card.metadata, column_id: targetColumnId, order: targetIndex },
    })
  },

  updateCard: async (cardId, updates) => {
    const updated = await entitiesApi.update(cardId, updates as Record<string, unknown>)
    set((s) => ({
      cards: s.cards.map((c) => (c.id === cardId ? (updated as Card) : c)),
    }))
  },

  deleteCard: async (cardId) => {
    await entitiesApi.delete(cardId)
    set((s) => ({ cards: s.cards.filter((c) => c.id !== cardId) }))
  },

  addComment: async (cardId, comment) => {
    const card = get().cards.find((c) => c.id === cardId)
    if (!card) return
    const existing = (card.metadata?.comments as Comment[]) ?? []
    const updated = await entitiesApi.update(cardId, {
      metadata: { ...card.metadata, comments: [...existing, comment] },
    })
    set((s) => ({
      cards: s.cards.map((c) => (c.id === cardId ? (updated as Card) : c)),
    }))
  },

  uploadAttachment: async (cardId, file) => {
    const updated = await attachmentsApi.upload(cardId, file)
    set((s) => ({
      cards: s.cards.map((c) => (c.id === cardId ? (updated as Card) : c)),
    }))
  },

  removeAttachment: async (cardId, attachmentId) => {
    const updated = await attachmentsApi.remove(cardId, attachmentId)
    set((s) => ({
      cards: s.cards.map((c) => (c.id === cardId ? (updated as Card) : c)),
    }))
  },

  clearError: () => set({ error: null }),
}))
