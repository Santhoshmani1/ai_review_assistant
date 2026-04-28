import { useState } from 'react'
import '../styles/PDFUploader.css'

interface UploadedFile {
  id: string
  name: string
  size: number
  uploadedAt: Date
  status: 'pending' | 'uploading' | 'completed' | 'error'
  errorMessage?: string
  responseData?: any // Field to store the webhook's JSON response
}

export function PDFUploader() {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [fileMap, setFileMap] = useState<{ [key: string]: File }>({})
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({})

  const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
  const N8N_WEBHOOK_URL = 'https://manicoursework.app.n8n.cloud/webhook-test/react-app'

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
    const newFileMapToMerge: { [key: string]: File } = {}

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

      newFileMapToMerge[id] = file
    })

    if (newFiles.length === 0) return

    // Use functional state updates to prevent stale closures and race conditions
    setFiles((prev) => [...prev, ...newFiles])
    setFileMap((prev) => ({ ...prev, ...newFileMapToMerge }))

    // Upload files to webhook
    newFiles.forEach((file) => {
      uploadFileToWebhook(file.id, newFileMapToMerge[file.id])
    })
  }

  const uploadFileToWebhook = async (fileId: string, file: File) => {
    let progressInterval: number | undefined;
    try {
      // Update status to uploading
      setFiles((prevFiles) =>
        prevFiles.map((f) => (f.id === fileId ? { ...f, status: 'uploading' as const } : f))
      )

      // Simulate upload progress while waiting for the LLM response
      let progress = 0
      progressInterval = window.setInterval(() => {
        progress += Math.floor(Math.random() * 10) + 5
        if (progress >= 95) {
          progress = 95
          window.clearInterval(progressInterval)
        }
        setUploadProgress((prev) => ({
          ...prev,
          [fileId]: progress,
        }))
      }, 1000)

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

      window.clearInterval(progressInterval)

      let responseData: any = null
      try {
        responseData = await response.json()
      } catch (jsonError) {
        console.warn(`Could not parse JSON response for ${file.name}:`, jsonError)
        // If response is not JSON, it might be plain text or empty.
        // We can still proceed to check response.ok and use statusText if needed.
      }

      if (!response.ok) { // Handles non-2xx responses
        let errorMsg = responseData?.message || response.statusText || 'Unknown error'
        if (response.status === 404) {
            errorMsg = 'Webhook not found (if using webhook-test, make sure n8n is actively listening)'
        }
        throw new Error(errorMsg)
      }

      // Update progress (assuming 100% on successful response)
      setUploadProgress((prev) => ({
        ...prev,
        [fileId]: 100,
      }))

      // Update status to completed and store the response data
      setFiles((prevFiles) =>
        prevFiles.map((f) =>
          f.id === fileId ? { ...f, status: 'completed' as const, responseData: responseData } : f
        )
      )
      console.log(`Successfully uploaded ${file.name}. Webhook response:`, responseData)
    } catch (error) {
      window.clearInterval(progressInterval)

      // Update status to error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setFiles((prevFiles) =>
        prevFiles.map((f) =>
          f.id === fileId ? { ...f, status: 'error' as const, errorMessage } : f
        )
      )
      // Log the full error object, which might contain the responseData if JSON parsing failed in the try block but error object is available here.
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
    // Reset the input value so the same file can be selected again
    e.target.value = ''
  }

  const deleteFile = (id: string) => {
    setFiles((prev) => prev.filter((file) => file.id !== id))
    setFileMap((prev) => {
      const newMap = { ...prev }
      delete newMap[id]
      return newMap
    })
    setUploadProgress((prev) => {
      const newProgress = { ...prev }
      delete newProgress[id]
      return newProgress
    })
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
                  
                  {file.status === 'completed' && file.responseData && (() => {
                    let revisionPlan: any[] = [];
                    let flashcards: any[] = [];
                    let quiz: any[] = [];

                    // Safely extract from the n8n JSON output format
                    if (Array.isArray(file.responseData)) {
                      file.responseData.forEach((item: any) => {
                        if (item.output?.revision_plan) revisionPlan = item.output.revision_plan;
                        if (item.output?.flashcards) flashcards = item.output.flashcards;
                        if (item.output?.quiz) quiz = item.output.quiz;
                      });
                    }

                    if (revisionPlan.length === 0 && flashcards.length === 0 && quiz.length === 0) {
                      return null;
                    }

                    return (
                      <div className="response-content-summary">
                        <h4>Generated Content:</h4>

                        {revisionPlan.length > 0 && (
                          <div className="generated-section">
                            <h5>Revision Strategy</h5>
                            {revisionPlan.map((stage: any, index: number) => (
                              <div key={index} className="revision-stage-item">
                                <p><strong>Step {stage.step_number}: {stage.module_title}</strong></p>
                                <p><em>Duration: {stage.duration_minutes} mins | Priority: {stage.priority}</em></p>
                                {stage.key_learning_objectives && stage.key_learning_objectives.length > 0 && (
                                  <ul>
                                    {stage.key_learning_objectives.map((obj: string, objIndex: number) => (
                                      <li key={objIndex}>{obj}</li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {flashcards.length > 0 && (
                          <div className="generated-section">
                            <h5>Flashcards</h5>
                            <div className="flashcards-list">
                              {flashcards.map((card: any, index: number) => (
                                <div key={index} className="flashcard-item">
                                  <p><strong>Term:</strong> {card.term}</p>
                                  <p><strong>Definition:</strong> {card.definition}</p>
                                  {card.context_hint && <p className="flashcard-context"><em>Context:</em> {card.context_hint}</p>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {quiz.length > 0 && (
                          <div className="generated-section">
                            <h5>Quiz</h5>
                            {quiz.map((q: any, index: number) => (
                              <div key={index} className="quiz-question-item">
                                <p><strong>Question {index + 1} (Difficulty {q.difficulty}):</strong> {q.question_text}</p>
                                <ul>
                                  <li><strong>✓ {q.correct_answer}</strong></li>
                                  {q.distractors?.map((distractor: string, optIndex: number) => (
                                    <li key={optIndex}>{distractor}</li>
                                  ))}
                                </ul>
                                {q.pedagogical_explanation && <p className="quiz-explanation"><em>Explanation:</em> {q.pedagogical_explanation}</p>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}

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
