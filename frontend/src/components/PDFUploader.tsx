import { useState, useMemo } from 'react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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

const InteractiveFlashcard = ({ card }: { card: any }) => {
  const [isFlipped, setIsFlipped] = useState(false)
  return (
    <Card 
      className="w-full h-48 cursor-pointer hover:shadow-md transition-all flex flex-col justify-center" 
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <CardContent className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        {!isFlipped ? (
          <>
            <h3 className="font-bold text-lg mb-2 text-foreground">{card.term}</h3>
            {card.context_hint && <p className="text-sm text-muted-foreground italic">Hint: {card.context_hint}</p>}
            <p className="text-xs text-muted-foreground mt-auto pt-4">Click to reveal definition</p>
          </>
        ) : (
          <>
            <p className="text-md font-medium text-foreground">{card.definition}</p>
            <p className="text-xs text-muted-foreground mt-auto pt-4">Click to show term</p>
          </>
        )}
      </CardContent>
    </Card>
  )
}

const InteractiveQuiz = ({ q, index }: { q: any, index: number }) => {
  const [selected, setSelected] = useState<string | null>(null)
  const options = useMemo(() => {
    const opts = [...(q.distractors || []), q.correct_answer]
    return opts.sort(() => Math.random() - 0.5)
  }, [q])

  return (
    <Card className="mb-4 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex justify-between items-start leading-snug">
          <span>{index + 1}. {q.question_text}</span>
          <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-full whitespace-nowrap ml-4">
            Level {q.difficulty}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2">
          {options.map((opt) => {
            const isSelected = selected === opt
            const isCorrect = opt === q.correct_answer
            const showResult = selected !== null
            
            let btnVariant = "outline"
            let extraClass = "justify-start text-left h-auto py-3 px-4 font-normal whitespace-normal "
            
            if (showResult) {
              if (isCorrect) {
                extraClass += "bg-green-600 hover:bg-green-700 text-white border-green-600 "
              } else if (isSelected) {
                extraClass += "bg-red-600 hover:bg-red-700 text-white border-red-600 "
              } else {
                extraClass += "opacity-50 "
              }
            } else if (isSelected) {
              btnVariant = "secondary"
            }

            return (
              <Button 
                key={opt}
                variant={btnVariant as any} 
                className={extraClass}
                disabled={showResult}
                onClick={() => setSelected(opt)}
              >
                {opt}
              </Button>
            )
          })}
        </div>
        {selected && q.pedagogical_explanation && (
          <div className="mt-4 p-4 bg-muted text-muted-foreground rounded-md text-sm border-l-4 border-primary">
            <strong className="text-foreground">Explanation: </strong> 
            {q.pedagogical_explanation}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

const RevisionTimeline = ({ plan }: { plan: any[] }) => {
  return (
    <div className="relative border-l-2 border-muted ml-4 py-2">
      {plan.map((stage: any, index: number) => (
        <div key={index} className="mb-8 ml-6 relative">
          <span className="absolute -left-[33px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary ring-4 ring-background"></span>
          <h4 className="font-semibold text-base leading-none mb-2 text-foreground">
            Step {stage.step_number}: {stage.module_title}
          </h4>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-3">
            <span className="bg-secondary px-2 py-1 rounded-md font-medium">⏱ {stage.duration_minutes} mins</span>
            <span className={`px-2 py-1 rounded-md font-medium ${
              stage.priority === 'High' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 
              stage.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 
              'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            }`}>Priority: {stage.priority}</span>
          </div>
          {stage.key_learning_objectives && stage.key_learning_objectives.length > 0 && (
            <ul className="list-disc ml-4 text-sm text-muted-foreground space-y-1">
              {stage.key_learning_objectives.map((obj: string, idx: number) => (
                <li key={idx}>{obj}</li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  )
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
                      <div className="response-content-summary mt-6 pt-4 border-t border-border w-full text-left">
                        <h4 className="text-xl font-bold mb-4 text-foreground">Generated Study Materials</h4>
                        
                        <Accordion type="multiple" className="w-full">
                          {revisionPlan.length > 0 && (
                            <AccordionItem value="revision">
                              <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                                Revision Strategy
                              </AccordionTrigger>
                              <AccordionContent className="pt-4 pb-2">
                                <RevisionTimeline plan={revisionPlan} />
                              </AccordionContent>
                            </AccordionItem>
                          )}

                          {flashcards.length > 0 && (
                            <AccordionItem value="flashcards">
                              <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                                Interactive Flashcards
                              </AccordionTrigger>
                              <AccordionContent className="pt-4 pb-2">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {flashcards.map((card: any, index: number) => (
                                    <InteractiveFlashcard key={index} card={card} />
                                  ))}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          )}

                          {quiz.length > 0 && (
                            <AccordionItem value="quiz">
                              <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                                Practice Quiz
                              </AccordionTrigger>
                              <AccordionContent className="pt-4 pb-2">
                                <div className="max-w-3xl mx-auto">
                                  {quiz.map((q: any, index: number) => (
                                    <InteractiveQuiz key={index} q={q} index={index} />
                                  ))}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          )}
                        </Accordion>
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
