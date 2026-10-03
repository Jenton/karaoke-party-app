import { versionLabel } from '../lib/songs.js'

// Small two-way switch between a song's karaoke and original video.
export default function VersionToggle({ value = 'karaoke', onChange, size = 'md' }) {
  const pad = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
  return (
    <span className="inline-flex overflow-hidden rounded-full border border-violet-300 bg-white" role="group" aria-label="Version">
      {['karaoke', 'official'].map((v) => (
        <button
          key={v}
          type="button"
          aria-pressed={value === v}
          onClick={(e) => { e.stopPropagation(); if (value !== v) onChange(v) }}
          className={`${pad} font-semibold whitespace-nowrap ${value === v ? 'bg-violet-600 text-white' : 'text-violet-700 hover:bg-violet-100'}`}
        >
          {versionLabel(v)}
        </button>
      ))}
    </span>
  )
}
