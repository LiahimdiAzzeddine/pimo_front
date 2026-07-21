import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import type { PaginatedResponse, Projet } from '@/types'

export function useProjectOptions() {
  return useQuery({ queryKey: ['project-options'], queryFn: async () => {
    const projects = (await api.get<PaginatedResponse<Projet>>('/projets?limit=100')).data.data
    return projects.map((project) => ({ value: String(project.id), label: project.nom }))
  }}).data ?? []
}
