import client from './client'

export type MemberRole = 'editor' | 'viewer'

export interface Member {
  id: string
  entity_id: string
  user_id: string
  username: string
  email: string
  role: MemberRole
  invited_by: string | null
  created_at: string
}

export const membersApi = {
  list: async (entityId: string): Promise<Member[]> => {
    const res = await client.get<Member[]>(`/entities/${entityId}/members`)
    return res.data
  },

  invite: async (entityId: string, email: string, role: MemberRole): Promise<Member> => {
    const res = await client.post<Member>(`/entities/${entityId}/members`, { email, role })
    return res.data
  },

  updateRole: async (entityId: string, userId: string, role: MemberRole): Promise<Member> => {
    const res = await client.patch<Member>(`/entities/${entityId}/members/${userId}`, { role })
    return res.data
  },

  remove: async (entityId: string, userId: string): Promise<void> => {
    await client.delete(`/entities/${entityId}/members/${userId}`)
  },
}
