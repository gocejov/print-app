import { Link } from 'react-router-dom'
import { ArrowUpRight, Blocks, Layers3 } from 'lucide-react'
import { useSpaces } from './use-spaces'
export function PluginsPage() {
  const { plugins, spaces } = useSpaces()
  return (
    <>
      <header className='page-heading'>
        <div>
          <div className='eyebrow'>BUILD ONCE. CREATE YOUR OWN SPACES.</div>
          <h1>
            Plugins<span className='heading-dot'>.</span>
          </h1>
          <p>
            Choose what your QR can do. Each plugin powers independent spaces with their own
            settings and participants.
          </p>
        </div>
        <Link className='btn btn-secondary' to='/spaces'>
          My spaces <Layers3 size={17} />
        </Link>
      </header>
      {plugins.isPending && <p role='status'>Loading plugins…</p>}
      {plugins.error && (
        <div role='alert'>
          <p>{plugins.error.message}</p>
          <button className='btn btn-secondary' onClick={() => plugins.refetch()}>
            Try again
          </button>
        </div>
      )}
      <div className='games-grid'>
        {plugins.data?.map((plugin) => (
          <article className='game-admin-card plugin-definition-card' key={plugin.id}>
            <div className='game-admin-card-top'>
              <Blocks size={24} />
              <span className='pill'>{plugin.category}</span>
            </div>
            <h2>{plugin.name}</h2>
            <p>{plugin.description}</p>
            <div className='game-admin-meta'>
              <Layers3 size={16} />
              {spaces.data?.filter((space) => space.pluginId === plugin.id).length || 0} spaces
              <span>· Version {plugin.version}</span>
            </div>
            <div className='game-admin-actions'>
              <Link
                className='btn btn-primary'
                to={`/spaces?create=${encodeURIComponent(plugin.id)}`}
              >
                Create space <ArrowUpRight size={16} />
              </Link>
              <Link
                className='btn btn-secondary'
                to={`/spaces?plugin=${encodeURIComponent(plugin.id)}`}
              >
                View spaces
              </Link>
            </div>
          </article>
        ))}
      </div>
    </>
  )
}
