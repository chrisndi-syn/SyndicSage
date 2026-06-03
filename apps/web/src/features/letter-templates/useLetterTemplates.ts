import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../shared/auth/AuthContext'
import {
  fetchLetterTemplates, apiCreateTemplate, apiUpdateTemplate, apiDeleteTemplate,
  type CreateTemplateBody, type LetterTemplate,
} from './letterTemplates.api'

const qk = (organizationId: string, buildingId?: string) =>
  ['letter_templates', organizationId, buildingId ?? 'all']

export function useLetterTemplates(organizationId: string | null | undefined, buildingId?: string) {
  return useQuery({
    queryKey: qk(organizationId ?? '', buildingId),
    queryFn:  () => fetchLetterTemplates(organizationId!, buildingId),
    enabled:  !!organizationId,
  })
}

export function useCreateLetterTemplate(organizationId: string) {
  const { session } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateTemplateBody) => {
      if (!session) throw new Error('Not authenticated')
      return apiCreateTemplate(session.access_token, organizationId, body)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk(organizationId) }),
  })
}

export function useUpdateLetterTemplate(organizationId: string) {
  const { session } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<CreateTemplateBody> }) => {
      if (!session) throw new Error('Not authenticated')
      return apiUpdateTemplate(session.access_token, organizationId, id, body)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk(organizationId) }),
  })
}

export function useDeleteLetterTemplate(organizationId: string) {
  const { session } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => {
      if (!session) throw new Error('Not authenticated')
      return apiDeleteTemplate(session.access_token, organizationId, id)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk(organizationId) }),
  })
}

export type { LetterTemplate }
