import { useState, useEffect } from 'react'
import { MethodBadge } from './MethodBadge'
import { resolveParameters } from '../types/openapi'
import type { Endpoint, OpenAPISpec, Parameter } from '../types/openapi'

interface PlaygroundProps {
  endpoint: Endpoint
  apiKey: string
  spec: OpenAPISpec | null
}

interface ApiResponse {
  status: number
  statusText: string
  headers: Record<string, string>
  body: any
  duration: number
}

export function Playground({ endpoint, apiKey, spec }: PlaygroundProps) {
  const { path, method, operation } = endpoint
  
  // Resolve parameters from $ref
  const allParams = spec ? resolveParameters(spec, operation) : []
  const pathParams = allParams.filter(p => p.in === 'path')
  const queryParams = allParams.filter(p => p.in === 'query')
  
  // Initialize params with examples
  const getInitialParams = () => {
    const initial: Record<string, string> = {}
    for (const param of allParams) {
      initial[param.name] = param.example?.toString() || param.schema?.example?.toString() || param.schema?.default?.toString() || ''
    }
    return initial
  }
  
  const [params, setParams] = useState<Record<string, string>>(getInitialParams)
  
  // Reset params when endpoint changes
  useEffect(() => {
    setParams(getInitialParams())
    setResponse(null)
    setError(null)
  }, [path, method])
  
  const [requestBody, setRequestBody] = useState('')
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<ApiResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const updateParam = (name: string, value: string) => {
    setParams(prev => ({ ...prev, [name]: value }))
  }

  const buildUrl = () => {
    const baseUrl = spec?.servers?.[0]?.url || ''
    let builtPath = path
    for (const param of pathParams) {
      builtPath = builtPath.replace(`{${param.name}}`, params[param.name] || `{${param.name}}`)
    }
    const queryParts: string[] = []
    for (const param of queryParams) {
      if (params[param.name]) {
        queryParts.push(`${param.name}=${encodeURIComponent(params[param.name])}`)
      }
    }
    const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : ''
    return `${baseUrl}${builtPath}${queryString}`
  }

  const executeRequest = async () => {
    setLoading(true)
    setError(null)
    setResponse(null)

    const url = buildUrl()
    const startTime = performance.now()

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (apiKey) headers['X-API-Key'] = apiKey

      const options: RequestInit = { method: method.toUpperCase(), headers }
      if (requestBody && ['post', 'put', 'patch'].includes(method)) {
        options.body = requestBody
      }

      const res = await fetch(url, options)
      const duration = performance.now() - startTime

      const responseHeaders: Record<string, string> = {}
      res.headers.forEach((value, key) => { responseHeaders[key] = value })

      let body: any
      const contentType = res.headers.get('content-type')
      if (contentType?.includes('application/json')) {
        body = await res.json()
      } else {
        body = await res.text()
      }

      setResponse({ status: res.status, statusText: res.statusText, headers: responseHeaders, body, duration })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  const generateCurl = () => {
    const url = buildUrl()
    let curl = `curl -X ${method.toUpperCase()} \\\n  '${url}'`
    if (apiKey) curl += ` \\\n  -H 'X-API-Key: ${apiKey}'`
    if (requestBody && ['post', 'put', 'patch'].includes(method)) {
      curl += ` \\\n  -H 'Content-Type: application/json'`
      curl += ` \\\n  -d '${requestBody}'`
    }
    return curl
  }

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <MethodBadge method={method} size="sm" />
          <span className="text-white text-sm font-medium truncate max-w-[200px]">
            {operation.summary || path}
          </span>
        </div>
      </div>

      {/* cURL Preview */}
      <div className="bg-[#0f1419] rounded-xl p-4 mb-5 overflow-x-auto">
        <pre className="text-xs text-[#8899a6] whitespace-pre-wrap leading-relaxed">
          <code>{generateCurl()}</code>
        </pre>
      </div>

      {/* Try It Button */}
      <button
        onClick={executeRequest}
        disabled={loading}
        className={`
          w-full py-3 rounded-xl font-medium text-sm transition-all mb-5
          ${loading 
            ? 'bg-[#192734] text-[#657786] cursor-not-allowed' 
            : 'bg-[#00ba7c] text-white hover:bg-[#00ba7c]/90 shadow-lg shadow-[#00ba7c]/20'
          }
        `}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Sending...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            Try it
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </span>
        )}
      </button>

      {/* Parameters */}
      {(pathParams.length > 0 || queryParams.length > 0) && (
        <div className="mb-5 space-y-3">
          <span className="text-xs text-[#657786] uppercase tracking-wider">Parameters</span>
          {[...pathParams, ...queryParams].map(param => (
            <ParameterInput
              key={param.name}
              param={param}
              value={params[param.name] || ''}
              onChange={(value) => updateParam(param.name, value)}
            />
          ))}
        </div>
      )}

      {/* Request Body */}
      {operation.requestBody && (
        <div className="mb-5">
          <span className="text-xs text-[#657786] uppercase tracking-wider block mb-2">Request Body</span>
          <textarea
            value={requestBody}
            onChange={(e) => setRequestBody(e.target.value)}
            placeholder='{"key": "value"}'
            className="w-full h-28 bg-[#0f1419] rounded-xl px-4 py-3 text-sm text-white font-mono placeholder-[#657786] focus:outline-none focus:ring-2 focus:ring-[#1d9bf0]/50 resize-none transition-all"
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-5 p-4 bg-[#f4212e]/10 rounded-xl">
          <p className="text-sm text-[#f4212e]">{error}</p>
        </div>
      )}

      {/* Response */}
      {response && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-[#657786] uppercase tracking-wider">Response</span>
            <div className="flex items-center gap-3">
              <span className={`
                px-2.5 py-1 rounded-lg text-xs font-medium
                ${response.status >= 200 && response.status < 300 
                  ? 'bg-[#00ba7c]/15 text-[#00ba7c]' 
                  : response.status >= 400 
                    ? 'bg-[#f4212e]/15 text-[#f4212e]'
                    : 'bg-[#ff7a00]/15 text-[#ff7a00]'
                }
              `}>
                {response.status}
              </span>
              <span className="text-[#657786] text-xs">
                {response.duration.toFixed(0)}ms
              </span>
            </div>
          </div>

          <div className="flex-1 bg-[#0f1419] rounded-xl p-4 overflow-auto">
            <pre className="text-xs text-[#8899a6] leading-relaxed">
              <code>
                {typeof response.body === 'string' 
                  ? response.body 
                  : JSON.stringify(response.body, null, 2)
                }
              </code>
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}

function ParameterInput({ param, value, onChange }: { param: Parameter; value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-sm text-white">{param.name}</span>
        <span className="text-[#657786] text-xs">{param.schema?.type || 'string'}</span>
        {param.required && <span className="text-[#f4212e] text-xs">*</span>}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={param.schema?.example?.toString() || param.name}
        className="w-full bg-[#0f1419] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#657786] focus:outline-none focus:ring-2 focus:ring-[#1d9bf0]/50 transition-all"
      />
    </div>
  )
}
