import axios from 'axios'
import { supabase } from '@/lib/supabase'
import type { UploadResponse, AnalyzeResponse, MitigateResponse, ModelType, MitigationTechnique } from '@/types/fairlens'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  timeout: 120000,
})

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return {}
  return { Authorization: `Bearer ${session.access_token}` }
}

export async function uploadDataset(file: File): Promise<UploadResponse> {
  const headers = await getAuthHeaders()
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post<UploadResponse>('/upload', form, {
    headers: { ...headers, 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function analyzeDataset(
  fileId: string,
  sensitiveCol: string,
  targetCol: string,
  modelType: ModelType,
  fileName: string,
): Promise<AnalyzeResponse> {
  const headers = await getAuthHeaders()
  const { data } = await api.post<AnalyzeResponse>('/analyze', {
    file_id: fileId,
    sensitive_col: sensitiveCol,
    target_col: targetCol,
    model_type: modelType,
    file_name: fileName,
  }, { headers })
  return data
}

export async function mitigateDataset(
  fileId: string,
  sensitiveCol: string,
  targetCol: string,
  modelType: ModelType,
  technique: MitigationTechnique
): Promise<MitigateResponse> {
  const { data } = await api.post<MitigateResponse>('/mitigate', {
    file_id: fileId,
    sensitive_col: sensitiveCol,
    target_col: targetCol,
    model_type: modelType,
    technique,
  })
  return data
}
