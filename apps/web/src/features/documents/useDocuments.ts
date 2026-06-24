import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import {
  fetchDocuments, apiUploadDocument, apiGetDownloadUrl, apiDeleteDocument,
} from './documents.api'

export function useDocuments(buildingId?: string) {
  return useQuery({
    queryKey: ['documents', buildingId],
    queryFn:  () => fetchDocuments(buildingId!),
    enabled:  !!buildingId,
  })
}

export function useUploadDocument(buildingId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (vars: {
      file:       File
      name:       string
      category:   string
      visibility: string
    }) => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')
      return apiUploadDocument(session.access_token, buildingId, vars.file, vars.name, vars.category, vars.visibility)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents', buildingId] }),
  })
}

export function useDownloadDocument(buildingId: string) {
  return useMutation({
    mutationFn: async (documentId: string) => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')
      return apiGetDownloadUrl(session.access_token, buildingId, documentId)
    },
  })
}

export function useDeleteDocument(buildingId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (documentId: string) => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')
      return apiDeleteDocument(session.access_token, buildingId, documentId)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents', buildingId] }),
  })
}
