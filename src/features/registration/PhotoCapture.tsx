import { useState, useRef, useEffect, useCallback } from 'react'

interface PhotoCaptureProps {
  value: string
  onChange: (base64: string) => void
  error?: string
}

/**
 * Webcam capture with canvas snapshot → base64 JPEG.
 * Falls back to <input type="file"> if getUserMedia is denied or unavailable.
 */
export function PhotoCapture({ value, onChange, error }: PhotoCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [cameraActive, setCameraActive] = useState(false)
  const [fallback, setFallback] = useState(false)
  const [fallbackReason, setFallbackReason] = useState('')
  const [starting, setStarting] = useState(false)

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setCameraActive(false)
  }, [])

  // Stop camera on unmount
  useEffect(() => stopStream, [stopStream])

  // Attach the stream to the <video> element AFTER it mounts.
  // startCamera sets cameraActive=true which renders the <video>,
  // then this effect wires up srcObject on the next render.
  useEffect(() => {
    const video = videoRef.current
    const stream = streamRef.current
    if (cameraActive && video && stream) {
      video.srcObject = stream
      video.play().catch(() => {/* AbortError on rapid re-render is safe to ignore */})
    }
  }, [cameraActive])

  const startCamera = async () => {
    setStarting(true)
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera API not available in this browser')
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      })
      streamRef.current = stream
      // Set active first so the <video> element renders; the useEffect above wires srcObject
      setCameraActive(true)
    } catch (err) {
      const msg =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Camera access was denied. You can upload a photo instead.'
          : err instanceof Error
            ? `Camera unavailable: ${err.message}. You can upload a photo instead.`
            : 'Camera unavailable. You can upload a photo instead.'
      setFallbackReason(msg)
      setFallback(true)
    } finally {
      setStarting(false)
    }
  }

  const capture = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
    onChange(dataUrl)
    stopStream()
  }

  const retake = () => {
    onChange('')
    startCamera()
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onChange(reader.result)
      }
    }
    reader.readAsDataURL(file)
  }

  // If we have a captured photo, show preview
  if (value) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Photo <span className="text-red-500">*</span>
        </label>
        <div className="relative w-40 h-40 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          <img src={value} alt="Captured visitor" className="w-full h-full object-cover" />
        </div>
        <button
          type="button"
          onClick={retake}
          className="mt-2 text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          Retake
        </button>
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>
    )
  }

  // Fallback: file upload
  if (fallback) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Photo <span className="text-red-500">*</span>
        </label>
        <div className="p-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg mb-2">
          <p className="text-sm text-amber-700 dark:text-amber-300">{fallbackReason}</p>
        </div>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-900 dark:file:text-indigo-300"
        />
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>
    )
  }

  // Camera view
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Photo <span className="text-red-500">*</span>
      </label>

      {!cameraActive ? (
        <div className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
          <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
          </svg>
          <button
            type="button"
            onClick={startCamera}
            disabled={starting}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {starting ? 'Starting camera…' : 'Open Camera'}
          </button>
          <button
            type="button"
            onClick={() => { setFallbackReason('You chose to upload a photo instead.'); setFallback(true) }}
            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            or upload a file
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="relative w-full max-w-sm rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full"
            />
          </div>
          <button
            type="button"
            onClick={capture}
            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
          >
            📸 Capture
          </button>
        </div>
      )}

      {/* Hidden canvas for snapshotting */}
      <canvas ref={canvasRef} className="hidden" />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}
