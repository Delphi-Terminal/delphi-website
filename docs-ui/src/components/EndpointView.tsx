import { ReactNode } from 'react'
import { MethodBadge } from './MethodBadge'
import { resolveParameters } from '../types/openapi'
import type { Endpoint, OpenAPISpec, Schema } from '../types/openapi'

interface EndpointViewProps {
  endpoint: Endpoint
  apiKey: string
  spec: OpenAPISpec | null
}

export function EndpointView({ endpoint, apiKey, spec }: EndpointViewProps) {
  const { path, method, operation } = endpoint

  const allParams = spec ? resolveParameters(spec, operation) : []
  const pathParams = allParams.filter(p => p.in === 'path')
  const queryParams = allParams.filter(p => p.in === 'query')

  const successResponse = operation.responses?.['200'] || operation.responses?.['201']
  const responseSchema = successResponse?.content?.['application/json']?.schema

  const buildUrl = () => {
    const baseUrl = spec?.servers?.[0]?.url || ''
    let builtPath = path
    for (const param of pathParams) {
      builtPath = builtPath.replace(`{${param.name}}`, `{${param.name}}`)
    }
    const queryParts: string[] = []
    for (const param of queryParams) {
      queryParts.push(`${param.name}={${param.name}}`)
    }
    const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : ''
    return `${baseUrl}${builtPath}${queryString}`
  }

  const tag = operation.tags?.[0] || ''

  return (
    <div className="flex h-full">
      {/* Left Panel */}
      <div className="flex-1 overflow-auto smooth-scroll p-10 md:p-14 lg:p-16">
        <div className="max-w-2xl">
          {/* Breadcrumb */}
          <span className="text-[#4a90d9] text-xs font-semibold uppercase tracking-wider">{tag}</span>
          
          {/* Title */}
          <h1 className="text-3xl md:text-4xl text-white mt-4 mb-5 leading-tight">
            {operation.summary || 'Endpoint'}
          </h1>
          
          {/* Description */}
          {operation.description && (
            <p className="text-[#888] text-lg leading-relaxed mb-10">
              {operation.description.split('\n')[0]}
            </p>
          )}

          {/* Endpoint Card */}
          <div className="bg-white/[0.03] rounded-2xl p-5 mb-8 flex items-center gap-4">
            <MethodBadge method={method} size="md" />
            <code className="text-white text-sm font-mono">{path}</code>
          </div>

          {/* Parameters */}
          {allParams.length > 0 && (
            <div className="bg-white/[0.03] rounded-2xl p-6 mb-8">
              <span className="text-[#4a90d9] text-xs font-semibold uppercase tracking-wider">Parameters</span>
              <div className="mt-5 space-y-4">
                {allParams.map(param => (
                  <div key={param.name} className="flex items-center gap-3">
                    <span className="text-white text-sm font-medium">{param.name}</span>
                    <span className="text-[#555] text-xs bg-white/5 px-2 py-0.5 rounded-md">{param.schema?.type || 'string'}</span>
                    {param.required && <span className="text-orange-400/80 text-xs">required</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Response Schema */}
          <div className="mb-10">
            <span className="text-[#4a90d9] text-xs font-semibold uppercase tracking-wider">Response</span>
            <div className="mt-4 flex items-center gap-3">
              <span className="text-[#22c55e] text-sm font-mono bg-[#22c55e]/10 px-3 py-1 rounded-lg">200</span>
              <span className="text-[#888] text-sm">{successResponse?.description || 'Success'}</span>
            </div>
            
            {responseSchema && (
              <div className="mt-6 bg-white/[0.03] rounded-2xl p-6">
                <SchemaFields schema={responseSchema} spec={spec} />
              </div>
            )}
          </div>

          {/* Details */}
          {operation.description && operation.description.includes('\n') && (
            <div>
              <span className="text-[#4a90d9] text-xs font-semibold uppercase tracking-wider">Details</span>
              <div className="mt-4 text-[#888] leading-relaxed">
                <DescriptionView description={operation.description} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Code */}
      <div className="w-[420px] bg-white/[0.02] flex flex-col overflow-hidden">
        <div className="p-6 flex items-center justify-between">
          <span className="text-xs font-semibold text-[#666] uppercase tracking-wider">cURL</span>
          <button 
            onClick={() => navigator.clipboard.writeText(`curl --request ${method.toUpperCase()} --url '${buildUrl()}'${apiKey ? ` --header 'X-API-Key: ${apiKey}'` : ''}`)}
            className="text-[#555] hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>

        <div className="px-6 pb-6">
          <div className="bg-black/30 rounded-xl p-5">
            <pre className="text-sm overflow-x-auto whitespace-pre-wrap">
              <code>
                <span className="text-[#4a90d9]">curl</span>
                <span className="text-[#888]"> --request </span>
                <span className="text-white">{method.toUpperCase()}</span>
                <span className="text-[#888]"> \</span>{'\n'}
                <span className="text-[#888]">{'  '}--url </span>
                <span className="text-[#60a5fa]">'{buildUrl()}'</span>
                {apiKey && (
                  <>
                    <span className="text-[#888]"> \</span>{'\n'}
                    <span className="text-[#888]">{'  '}--header </span>
                    <span className="text-[#60a5fa]">'X-API-Key: ...'</span>
                  </>
                )}
              </code>
            </pre>
          </div>
        </div>

        {/* Response Example */}
        <div className="flex-1 overflow-auto smooth-scroll px-6 pb-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-semibold text-[#666] uppercase tracking-wider">Example Response</span>
          </div>
          <div className="bg-black/30 rounded-xl p-5">
            <pre className="text-sm text-[#888] overflow-x-auto">
              <code>
                {generateExampleResponse(responseSchema, spec)}
              </code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}

function SchemaFields({ schema, spec, depth = 0 }: { schema: Schema; spec: OpenAPISpec | null; depth?: number }) {
  if (schema.$ref && spec) {
    const refName = schema.$ref.replace('#/components/schemas/', '')
    const resolved = spec.components?.schemas?.[refName]
    if (resolved) {
      return <SchemaFields schema={resolved} spec={spec} depth={depth} />
    }
  }

  if (schema.type === 'array' && schema.items) {
    return (
      <div className="text-[#888] text-sm">
        <span className="text-[#666]">Array of:</span>
        <div className="ml-4 mt-3">
          <SchemaFields schema={schema.items} spec={spec} depth={depth + 1} />
        </div>
      </div>
    )
  }

  if (schema.type === 'object' && schema.properties) {
    return (
      <div className="space-y-4">
        {Object.entries(schema.properties).map(([name, prop]) => (
          <div key={name}>
            <div className="flex items-center gap-3">
              <code className="text-[#60a5fa] text-sm font-medium">{name}</code>
              <span className="text-[#555] text-xs bg-white/5 px-2 py-0.5 rounded-md">{prop.type || 'object'}</span>
            </div>
            {prop.description && (
              <p className="text-[#666] text-sm mt-1">{prop.description}</p>
            )}
          </div>
        ))}
      </div>
    )
  }

  return <span className="text-[#666] text-sm">{schema.type || 'any'}</span>
}

function generateExampleResponse(schema: Schema | undefined, spec: OpenAPISpec | null): string {
  if (!schema) return '{}'
  
  if (schema.$ref && spec) {
    const refName = schema.$ref.replace('#/components/schemas/', '')
    const resolved = spec.components?.schemas?.[refName]
    if (resolved) {
      return generateExampleResponse(resolved, spec)
    }
  }

  if (schema.example) {
    return JSON.stringify(schema.example, null, 2)
  }

  if (schema.type === 'array') {
    const itemExample = schema.items ? generateExampleResponse(schema.items, spec) : '{}'
    return `[\n  ${itemExample}\n]`
  }

  if (schema.type === 'object' && schema.properties) {
    const obj: Record<string, any> = {}
    for (const [name, prop] of Object.entries(schema.properties)) {
      if (prop.example !== undefined) {
        obj[name] = prop.example
      } else if (prop.type === 'string') {
        obj[name] = prop.format === 'date-time' ? '2024-01-01T00:00:00Z' : 'string'
      } else if (prop.type === 'number' || prop.type === 'integer') {
        obj[name] = 0
      } else if (prop.type === 'boolean') {
        obj[name] = true
      } else if (prop.type === 'array') {
        obj[name] = []
      } else {
        obj[name] = null
      }
    }
    return JSON.stringify(obj, null, 2)
  }

  return '{}'
}

function DescriptionView({ description }: { description: string }) {
  const blocks = description.split('\n\n').slice(1)
  
  return (
    <div className="space-y-5">
      {blocks.map((block, i) => {
        if (block.startsWith('**') && block.endsWith('**')) {
          return <h3 key={i} className="text-white font-semibold mt-8 text-lg">{block.replace(/\*\*/g, '')}</h3>
        }
        
        if (block.includes('\n- ')) {
          const lines = block.split('\n')
          const title = lines[0]
          const items = lines.slice(1).filter(l => l.startsWith('- '))
          return (
            <div key={i}>
              {title && <p className="text-white mb-3">{formatInline(title)}</p>}
              <ul className="space-y-2 ml-1">
                {items.map((item, j) => (
                  <li key={j} className="text-[#888] flex gap-3">
                    <span className="text-[#4a90d9]">•</span>
                    {formatInline(item.replace(/^- /, ''))}
                  </li>
                ))}
              </ul>
            </div>
          )
        }
        
        if (block.startsWith('```')) {
          const code = block.split('\n').slice(1, -1).join('\n')
          return (
            <pre key={i} className="bg-black/30 rounded-xl p-5 overflow-x-auto text-sm">
              <code>{code}</code>
            </pre>
          )
        }
        
        return <p key={i}>{formatInline(block)}</p>
      })}
    </div>
  )
}

function formatInline(text: string): ReactNode {
  const parts: ReactNode[] = []
  let remaining = text
  let key = 0
  
  while (remaining.length > 0) {
    const codeMatch = remaining.match(/`([^`]+)`/)
    const boldMatch = remaining.match(/\*\*([^*]+)\*\*/)
    
    const codeIndex = codeMatch ? remaining.indexOf(codeMatch[0]) : Infinity
    const boldIndex = boldMatch ? remaining.indexOf(boldMatch[0]) : Infinity
    
    if (codeIndex === Infinity && boldIndex === Infinity) {
      parts.push(remaining)
      break
    }
    
    if (codeIndex < boldIndex) {
      if (codeIndex > 0) parts.push(remaining.slice(0, codeIndex))
      parts.push(<code key={key++} className="text-[#60a5fa] text-sm font-mono bg-white/5 px-1.5 py-0.5 rounded-md">{codeMatch![1]}</code>)
      remaining = remaining.slice(codeIndex + codeMatch![0].length)
    } else {
      if (boldIndex > 0) parts.push(remaining.slice(0, boldIndex))
      parts.push(<strong key={key++} className="text-white font-medium">{boldMatch![1]}</strong>)
      remaining = remaining.slice(boldIndex + boldMatch![0].length)
    }
  }
  
  return <>{parts}</>
}
