import { useState } from 'react'
import { MethodBadge } from './MethodBadge'
import { groupEndpointsByTag } from '../types/openapi'
import type { OpenAPISpec, Endpoint } from '../types/openapi'

interface SidebarProps {
  spec: OpenAPISpec | null
  selectedEndpoint: Endpoint | null
  onSelectEndpoint: (endpoint: Endpoint | null) => void
}

export function Sidebar({ 
  spec, 
  selectedEndpoint, 
  onSelectEndpoint
}: SidebarProps) {
  const [expandedTags, setExpandedTags] = useState<Set<string>>(new Set(['Getting Started', 'KLSI']))

  if (!spec) return null

  const tagGroups = groupEndpointsByTag(spec)

  const toggleTag = (tagName: string) => {
    const newExpanded = new Set(expandedTags)
    if (newExpanded.has(tagName)) {
      newExpanded.delete(tagName)
    } else {
      newExpanded.add(tagName)
    }
    setExpandedTags(newExpanded)
  }

  const isSelected = (endpoint: Endpoint) => 
    selectedEndpoint?.path === endpoint.path && 
    selectedEndpoint?.method === endpoint.method

  return (
    <aside className="w-80 flex flex-col h-full bg-[#050a14] overflow-hidden shadow-2xl border-r border-white/10">
      {/* Logo at top */}
      <button 
        onClick={() => onSelectEndpoint(null)}
        className="p-6 flex items-center justify-center border-b border-white/10 w-full hover:bg-white/[0.05] transition-colors cursor-pointer"
      >
        <img src="./logo.png" alt="Delphi" className="h-12" />
      </button>

      {/* Endpoint List */}
      <nav className="flex-1 overflow-y-auto smooth-scroll px-3 py-2">
        {tagGroups.map(group => (
          <div key={group.name} className="mb-1">
            {/* Tag Header */}
            <button
              onClick={() => toggleTag(group.name)}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-[#cbd5e1] hover:text-[#00ffcc] transition-colors rounded-xl hover:bg-white/[0.03]"
            >
              <svg 
                className={`w-3 h-3 transition-transform duration-200 ${expandedTags.has(group.name) ? 'rotate-90' : ''}`}
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-bold uppercase tracking-wider">{group.name}</span>
            </button>

            {/* Endpoints */}
            {expandedTags.has(group.name) && (
              <div className="ml-2 mt-1 space-y-0.5">
                {group.endpoints.map(endpoint => (
                  <button
                    key={`${endpoint.method}-${endpoint.path}`}
                    onClick={() => onSelectEndpoint(endpoint)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 text-base rounded-xl transition-all
                      ${isSelected(endpoint) 
                        ? 'text-white bg-white/[0.08] font-bold' 
                        : 'text-[#cbd5e1] hover:text-[#00ffcc] hover:bg-white/[0.03] font-semibold'
                      }
                    `}
                  >
                    <MethodBadge method={endpoint.method} />
                    <span className="text-left text-[14px] leading-tight">
                      {endpoint.operation.summary || endpoint.path}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-5 flex justify-center">
        <a 
          href="https://delphiterminal.co" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-sm text-[#cbd5e1] hover:text-[#00ffcc] transition-colors font-bold"
        >
          delphiterminal.co
        </a>
      </div>
    </aside>
  )
}
