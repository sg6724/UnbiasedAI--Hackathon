import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { UploadCloud, File, X } from 'lucide-react'

interface Props {
  onFile: (file: File) => void
}

export default function FileUpload({ onFile }: Props) {
  const [selected, setSelected] = useState<File | null>(null)
  const [error, setError] = useState('')

  const onDrop = useCallback((accepted: File[], rejected: unknown[]) => {
    setError('')
    if (rejected && (rejected as []).length > 0) {
      setError('Only CSV files under 10MB are accepted.')
      return
    }
    if (accepted[0]) {
      setSelected(accepted[0])
      onFile(accepted[0])
    }
  }, [onFile])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'], 'application/vnd.ms-excel': ['.csv'] },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
  })

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSelected(null)
    setError('')
  }

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 ${
          isDragActive
            ? 'border-indigo-400 bg-indigo-50'
            : selected
            ? 'border-green-400 bg-green-50'
            : 'border-slate-300 bg-white hover:border-indigo-300 hover:bg-indigo-50/30'
        }`}
      >
        <input {...getInputProps()} />

        {selected ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center">
              <File className="w-7 h-7 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">{selected.name}</p>
              <p className="text-sm text-slate-500 mt-0.5">{(selected.size / 1024).toFixed(1)} KB</p>
            </div>
            <button onClick={clear} className="flex items-center gap-1 text-sm text-slate-400 hover:text-red-500 transition-colors mt-1">
              <X className="w-4 h-4" /> Remove
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${isDragActive ? 'bg-indigo-100' : 'bg-slate-100'}`}>
              <UploadCloud className={`w-7 h-7 ${isDragActive ? 'text-indigo-600' : 'text-slate-400'}`} />
            </div>
            <div>
              <p className="font-semibold text-slate-700">
                {isDragActive ? 'Drop it here!' : 'Drag & drop your CSV file'}
              </p>
              <p className="text-sm text-slate-400 mt-1">or <span className="text-indigo-600 font-medium">click to browse</span> — max 10MB</p>
            </div>
          </div>
        )}
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}
