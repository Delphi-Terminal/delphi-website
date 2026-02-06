// OpenAPI 3.0 Types (simplified for our use case)

export interface OpenAPISpec {
  openapi: string
  info: {
    title: string
    description?: string
    version: string
    contact?: {
      name?: string
      url?: string
    }
  }
  servers?: Array<{
    url: string
    description?: string
  }>
  tags?: Tag[]
  paths: Record<string, PathItem>
  components?: {
    schemas?: Record<string, Schema>
    parameters?: Record<string, Parameter>
    securitySchemes?: Record<string, SecurityScheme>
  }
  security?: Array<Record<string, string[]>>
}

export interface Tag {
  name: string
  description?: string
}

export interface PathItem {
  get?: Operation
  post?: Operation
  put?: Operation
  delete?: Operation
  patch?: Operation
}

export interface Operation {
  tags?: string[]
  summary?: string
  description?: string
  operationId?: string
  parameters?: Parameter[]
  requestBody?: RequestBody
  responses?: Record<string, Response>
  security?: Array<Record<string, string[]>>
}

export interface Parameter {
  name: string
  in: 'path' | 'query' | 'header' | 'cookie'
  description?: string
  required?: boolean
  schema?: Schema
  example?: any
  $ref?: string
}

export interface RequestBody {
  description?: string
  required?: boolean
  content?: Record<string, MediaType>
}

export interface MediaType {
  schema?: Schema
  example?: any
}

export interface Response {
  description?: string
  content?: Record<string, MediaType>
}

export interface Schema {
  type?: string
  format?: string
  description?: string
  properties?: Record<string, Schema>
  items?: Schema
  required?: string[]
  example?: any
  enum?: any[]
  default?: any
  $ref?: string
}

export interface SecurityScheme {
  type: string
  name?: string
  in?: string
  description?: string
}

// Derived types for our UI
export interface Endpoint {
  path: string
  method: 'get' | 'post' | 'put' | 'delete' | 'patch'
  operation: Operation
}

export interface TagGroup {
  name: string
  description?: string
  endpoints: Endpoint[]
}

// Endpoints to hide from docs UI (internal/demo use only)
const HIDDEN_ENDPOINTS = ['/api/v1/test-key']

// Helper to extract endpoints from spec
export function extractEndpoints(spec: OpenAPISpec): Endpoint[] {
  const endpoints: Endpoint[] = []
  
  for (const [path, pathItem] of Object.entries(spec.paths)) {
    // Skip hidden endpoints
    if (HIDDEN_ENDPOINTS.includes(path)) continue
    
    const methods = ['get', 'post', 'put', 'delete', 'patch'] as const
    for (const method of methods) {
      const operation = pathItem[method]
      if (operation) {
        endpoints.push({ path, method, operation })
      }
    }
  }
  
  return endpoints
}

// Helper to group endpoints by tag
export function groupEndpointsByTag(spec: OpenAPISpec): TagGroup[] {
  const endpoints = extractEndpoints(spec)
  const tagMap = new Map<string, Endpoint[]>()
  const tagDescriptions = new Map<string, string>()
  
  // Get tag descriptions from spec
  if (spec.tags) {
    for (const tag of spec.tags) {
      tagDescriptions.set(tag.name, tag.description || '')
    }
  }
  
  // Group endpoints by their first tag
  for (const endpoint of endpoints) {
    const tag = endpoint.operation.tags?.[0] || 'Other'
    if (!tagMap.has(tag)) {
      tagMap.set(tag, [])
    }
    tagMap.get(tag)!.push(endpoint)
  }
  
  // Convert to array and sort by tag order in spec
  const tagOrder = spec.tags?.map(t => t.name) || []
  const groups: TagGroup[] = []
  
  for (const [name, endpoints] of tagMap.entries()) {
    groups.push({
      name,
      description: tagDescriptions.get(name),
      endpoints
    })
  }
  
  // Sort by tag order, unknown tags go to end
  groups.sort((a, b) => {
    const aIndex = tagOrder.indexOf(a.name)
    const bIndex = tagOrder.indexOf(b.name)
    if (aIndex === -1 && bIndex === -1) return 0
    if (aIndex === -1) return 1
    if (bIndex === -1) return -1
    return aIndex - bIndex
  })
  
  // Filter out empty groups (e.g., when all endpoints in a tag are hidden)
  return groups.filter(g => g.endpoints.length > 0)
}

// Helper to resolve schema $ref
export function resolveRef(spec: OpenAPISpec, ref: string): Schema | undefined {
  if (!ref.startsWith('#/components/schemas/')) {
    return undefined
  }
  const schemaName = ref.replace('#/components/schemas/', '')
  return spec.components?.schemas?.[schemaName]
}

// Helper to resolve parameter $ref
export function resolveParameter(spec: OpenAPISpec, param: Parameter | { $ref: string }): Parameter | undefined {
  if ('$ref' in param && param.$ref) {
    if (!param.$ref.startsWith('#/components/parameters/')) {
      return undefined
    }
    const paramName = param.$ref.replace('#/components/parameters/', '')
    return spec.components?.parameters?.[paramName]
  }
  return param as Parameter
}

// Helper to resolve all parameters for an operation
export function resolveParameters(spec: OpenAPISpec, operation: Operation): Parameter[] {
  if (!operation.parameters) return []
  
  return operation.parameters
    .map(p => resolveParameter(spec, p))
    .filter((p): p is Parameter => p !== undefined)
}
