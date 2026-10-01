import { Download, ExternalLink } from 'lucide-react'

async function downloadImage(src, filename) {
  const response = await fetch(src)
  if (!response.ok) {
    throw new Error('Failed to download image')
  }

  const blob = await response.blob()
  const blobUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = blobUrl
  link.download = filename || 'image'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(blobUrl)
}

function ImageAttachment({
  src,
  alt,
  filename,
  isDark,
  imageClassName = 'w-full rounded-lg border object-cover',
}) {
  if (!src) return null

  const handleOpen = (event) => {
    event.stopPropagation()
    window.open(src, '_blank', 'noopener,noreferrer')
  }

  const handleDownload = async (event) => {
    event.stopPropagation()
    try {
      await downloadImage(src, filename)
    } catch (error) {
      window.open(src, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div className="mt-2">
      <img
        src={src}
        alt={alt || filename || 'Attachment'}
        className={imageClassName}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleOpen}
          className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
            isDark
              ? 'bg-blue-900/60 text-blue-100 hover:bg-blue-800'
              : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
          }`}
        >
          <ExternalLink size={16} />
          Open
        </button>
        <button
          type="button"
          onClick={handleDownload}
          className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
            isDark
              ? 'bg-emerald-900/60 text-emerald-100 hover:bg-emerald-800'
              : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
          }`}
        >
          <Download size={16} />
          Download
        </button>
      </div>
    </div>
  )
}

export default ImageAttachment
