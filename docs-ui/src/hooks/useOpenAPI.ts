import { useState, useEffect } from 'react'
import type { OpenAPISpec } from '../types/openapi'

interface UseOpenAPIResult {
  spec: OpenAPISpec | null
  loading: boolean
  error: string | null
}

export function useOpenAPI(): UseOpenAPIResult {
  const [spec, setSpec] = useState<OpenAPISpec | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSpec() {
      try {
        // Fetch from the public directory (relative path for static hosting)
        const response = await fetch('./openapi.json')
        
        if (!response.ok) {
          throw new Error(`Failed to fetch OpenAPI spec: ${response.status}`)
        }
        
        const data = await response.json()
        setSpec(data)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load API specification')
      } finally {
        setLoading(false)
      }
    }

    fetchSpec()
  }, [])

  return { spec, loading, error }
}
