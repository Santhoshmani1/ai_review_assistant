import { useState } from 'react'
import '../styles/PDFUploader.css'

interface UploadedFile {
  id: string
  name: string
  size: number
  uploadedAt: Date
  status: 'pending' | 'uploading' | 'completed' | 'error'
  errorMessage?: string
}

export function PDFUploader() {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [fileMap, setFileMap] = useState<{ [key: string]: File }>({})
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({})

  const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
  const N8N_WEBHOOK_URL = 'https://santhoshmanipidaka.app.n8n.cloud/webhook-test/react-app'

  const validateFile = (file: File): string | null => {
    if (file.type !== 'application/pdf') {
      return 'Only PDF files are allowed'
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File size must be less than 10MB (Your file: ${(file.size / 1024 / 1024).toFixed(2)}MB)`
    }
    return null
  }

  const handleFiles = (fileList: FileList) => {
    const newFiles: UploadedFile[] = []
    const newFileMap = { ...fileMap }

    Array.from(fileList).forEach((file) => {
      const error = validateFile(file)
      if (error) {
        alert(`Error with ${file.name}: ${error}`)
        return
      }

      const id = `${file.name}-${Date.now()}`
      newFiles.push({
        id,
        name: file.name,
        size: file.size,
        uploadedAt: new Date(),
        status: 'pending',
      })

      newFileMap[id] = file
    })

    setFiles([...files, ...newFiles])
    setFileMap(newFileMap)

    // Upload files to webhook
    newFiles.forEach((file) => {
      uploadFileToWebhook(file.id, newFileMap[file.id])
    })
  }

  const uploadFileToWebhook = async (fileId: string, file: File) => {
    try {
      // Update status to uploading
      setFiles((prevFiles) =>
        prevFiles.map((f) => (f.id === fileId ? { ...f, status: 'uploading' as const } : f))
      )

      // Create FormData
      const formData = new FormData()
      formData.append('file', file)
      formData.append('fileName', file.name)
      formData.append('fileSize', file.size.toString())
      formData.append('uploadedAt', new Date().toISOString())

      // Upload to webhook
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`)
      }

      // Update progress
      setUploadProgress((prev) => ({
        ...prev,
        [fileId]: 100,
      }))

      // Update status to completed
      setFiles((prevFiles) =>
        prevFiles.map((f) =>
          f.id === fileId ? { ...f, status: 'completed' as const } : f
        )
      )
    } catch (error) {
      // Update status to error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setFiles((prevFiles) =>
        prevFiles.map((f) =>
          f.id === fileId ? { ...f, status: 'error' as const, errorMessage } : f
        )
      )
      console.error(`Error uploading ${file.name}:`, error)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files)
    }
  }

  const deleteFile = (id: string) => {
    setFiles(files.filter((file) => file.id !== id))
    const newFileMap = { ...fileMap }
    delete newFileMap[id]
    setFileMap(newFileMap)
    const newProgress = { ...uploadProgress }
    delete newProgress[id]
    setUploadProgress(newProgress)
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
  }

  return (
    <div className="pdf-uploader">
      <div className="uploader-container">
        <h1 className="uploader-title">Upload Documents</h1>
        <p className="uploader-subtitle">Upload your PDF notes and study materials</p>

        {/* Drag and Drop Area */}
        <div
          className={`drag-drop-area ${isDragging ? 'dragging' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="drag-drop-content">
            <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            <h2>Drag and drop files here</h2>
            <p>or</p>
            <label className="file-input-label">
              <span className="browse-button">Browse Files</span>
              <input
                type="file"
                multiple
                accept=".pdf"
                onChange={handleFileInput}
                className="file-input"
              />
            </label>
            <p className="file-info">PDF files only • Maximum 10MB per file</p>
          </div>
        </div>

        {/* Uploaded Files List */}
        {files.length > 0 && (
          <div className="uploaded-files">
            <h2 className="files-title">
              Uploaded Files <span className="file-count">({files.length})</span>
            </h2>
            <div className="files-list">
              {files.map((file) => (
                <div key={file.id} className="file-item">
                  <div className="file-info-section">
                    <svg className="pdf-icon" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                    <div className="file-details">
                      <p className="file-name">{file.name}</p>
                      <div className="file-meta">
                        <span className="file-size">{formatFileSize(file.size)}</span>
                        <span className="file-date">{formatDate(file.uploadedAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  {file.status === 'pending' && (
                    <div className="upload-status pending">
                      <span>Preparing...</span>
                    </div>
                  )}

                  {file.status === 'uploading' && (
                    <div className="progress-container">
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{ width: `${uploadProgress[file.id] || 0}%` }}
                        ></div>
                      </div>
                      <span className="progress-text">{Math.round(uploadProgress[file.id] || 0)}%</span>
                    </div>
                  )}

                  {file.status === 'completed' && (
                    <div className="upload-complete">
                      <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      <span>Uploaded</span>
                    </div>
                  )}

                  {file.status === 'error' && (
                    <div className="upload-error">
                      <svg className="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                      </svg>
                      <span>{file.errorMessage || 'Upload failed'}</span>
                    </div>
                  )}

                  {/* Delete Button */}
                  <button
                    className="delete-button"
                    onClick={() => deleteFile(file.id)}
                    title="Delete file"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {files.length === 0 && (
          <div className="empty-state">
            <p>No files uploaded. Start by adding documents.</p>
          </div>
        )}
      </div>
    </div>
  )
}
