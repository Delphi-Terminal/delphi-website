import { useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { EndpointView } from './components/EndpointView'
import { useOpenAPI } from './hooks/useOpenAPI'
import type { Endpoint } from './types/openapi'

// Demo API key - baked in so users can test immediately without setup
const DEMO_API_KEY = 'dphi_live_d2c1c154f945a1fd703868354f14a784e4d13827d58c4d354842dba6b5c72f22'

function App() {
  const { spec, loading, error } = useOpenAPI()
  const [selectedEndpoint, setSelectedEndpoint] = useState<Endpoint | null>(null)
  const apiKey = DEMO_API_KEY // Always use demo key

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#050a14]">
        <div className="text-[#666] animate-pulse">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#050a14]">
        <div className="text-red-400/80 bg-red-500/10 px-6 py-4 rounded-2xl">Error: {error}</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-[#050a14]">
      {/* Main */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          spec={spec} 
          selectedEndpoint={selectedEndpoint}
          onSelectEndpoint={setSelectedEndpoint}
        />
        <main className="flex-1 overflow-auto smooth-scroll">
          {selectedEndpoint ? (
            <EndpointView 
              endpoint={selectedEndpoint} 
              apiKey={apiKey}
              spec={spec}
            />
          ) : (
            <WelcomeView spec={spec} />
          )}
        </main>
      </div>
    </div>
  )
}

function WelcomeView({ spec }: { spec: any }) {
  return (
    <div className="p-12 md:p-16 lg:p-20 max-w-5xl mx-auto">
      {/* Hero */}
      <div className="mb-16 flex flex-col items-center text-center">
        <img src="./logo.png" alt="Delphi" className="h-24 md:h-32 mb-8" />
        <p className="text-[#888] text-xl md:text-2xl leading-relaxed max-w-3xl">
          Unified historical and live data feed from Kalshi, Polymarket, Limitless, and Predict.Fun.
        </p>
      </div>

      {/* Cards */}
      <div className="grid md:grid-cols-1 gap-6 mb-16 max-w-md mx-auto">
        <div className="bg-white/[0.03] rounded-3xl p-8 hover:bg-white/[0.05] transition-all">
          <span className="text-[#4a90d9] text-xs font-semibold uppercase tracking-wider">Exchanges</span>
          <h2 className="text-2xl text-white mt-4 mb-5">Supported Markets</h2>
          <div className="space-y-3 text-[15px]">
            <p className="flex items-center gap-3">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              <span className="text-white">Kalshi</span>
            </p>
            <p className="flex items-center gap-3">
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
              <span className="text-white">Polymarket</span>
            </p>
            <p className="flex items-center gap-3">
              <span className="w-2 h-2 bg-teal-500 rounded-full"></span>
              <span className="text-white">Limitless</span>
            </p>
            <p className="flex items-center gap-3">
              <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
              <span className="text-white">Pfun</span>
            </p>
          </div>
        </div>
      </div>

      {/* API Info */}
      <div className="bg-white/[0.03] rounded-3xl p-8">
        <span className="text-[#4a90d9] text-xs font-semibold uppercase tracking-wider">API Info</span>
        <div className="mt-6 space-y-4">
          <div className="flex items-center">
            <span className="text-[#666] w-28 text-sm">Base URL</span>
            <span className="text-[#00ffcc] text-sm font-mono bg-white/5 px-3 py-1.5 rounded-lg">{spec?.servers?.[0]?.url}</span>
          </div>
          <div className="flex items-center">
            <span className="text-[#666] w-28 text-sm">Version</span>
            <span className="text-[#00ffcc] text-sm font-mono bg-white/5 px-3 py-1.5 rounded-lg">{spec?.info?.version}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
