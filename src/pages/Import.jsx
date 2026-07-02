import Sidebar from '../components/layout/Sidebar'
import Topbar from '../components/layout/Topbar'

export default function Import() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex">
      <Sidebar />
      <div className="flex-1 ml-56">
        <Topbar title="Import" />
        <main className="pt-14 p-6">
          <p className="text-zinc-500 text-sm">Coming soon.</p>
        </main>
      </div>
    </div>
  )
}
