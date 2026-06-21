export type EntityStatus = 'active' | 'in_progress' | 'completed' | 'archived'

export interface Entity {
  id: string
  entity_type: string
  title: string
  description: string | null
  status: EntityStatus
  metadata: Record<string, unknown> | null
  owner_id: string | null
  created_at: string
  updated_at: string
}

export interface Workspace extends Entity {
  entity_type: 'workspace'
}

export interface Board extends Entity {
  entity_type: 'board'
  metadata: { workspace_id: string }
}

export interface Column extends Entity {
  entity_type: 'column'
  metadata: { board_id: string; order: number }
}

export interface Comment {
  id: string
  text: string
  author_id: string
  author_name: string
  created_at: string
}

export interface Attachment {
  id: string
  name: string
  size: number
  type: string
  uploaded_by: string
  uploaded_at: string
}

export interface Card extends Entity {
  entity_type: 'card'
  metadata: {
    column_id: string
    board_id: string
    order: number
    assignee_id?: string
    assignee_name?: string
    comments?: Comment[]
    attachments?: Attachment[]
  }
}

export interface User {
  id: string
  email: string
  username: string
  role: 'admin' | 'member' | 'viewer'
  is_active: boolean
  created_at: string
}

export interface EntityListResponse {
  total: number
  items: Entity[]
}
