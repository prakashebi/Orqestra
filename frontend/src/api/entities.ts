import client from './client'
import type { Entity, EntityListResponse, EntityStatus } from '../types'

export const attachmentsApi = {
  upload: async (entityId: string, file: File): Promise<Entity> => {
    const form = new FormData()
    form.append('file', file)
    const res = await client.post<Entity>(`/entities/${entityId}/attachments`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data
  },

  downloadUrl: (entityId: string, attachmentId: string): string =>
    `/api/v1/attachments/${entityId}/${attachmentId}`,

  remove: async (entityId: string, attachmentId: string): Promise<Entity> => {
    const res = await client.delete<Entity>(`/entities/${entityId}/attachments/${attachmentId}`)
    return res.data
  },
}

interface ListParams {
  entity_type?: string
  status?: EntityStatus
  q?: string
  skip?: number
  limit?: number
}

interface CreateParams {
  entity_type: string
  title: string
  description?: string
  status?: EntityStatus
  metadata?: Record<string, unknown>
}

interface UpdateParams {
  title?: string
  description?: string
  status?: EntityStatus
  metadata?: Record<string, unknown>
}

export const entitiesApi = {
  list: async (params: ListParams = {}) => {
    const res = await client.get<EntityListResponse>('/entities', { params })
    return res.data
  },

  getById: async (id: string) => {
    const res = await client.get<Entity>(`/entities/${id}`)
    return res.data
  },

  create: async (params: CreateParams) => {
    const res = await client.post<Entity>('/entities', params)
    return res.data
  },

  update: async (id: string, params: UpdateParams) => {
    const res = await client.patch<Entity>(`/entities/${id}`, params)
    return res.data
  },

  delete: async (id: string) => {
    await client.delete(`/entities/${id}`)
  },
}
