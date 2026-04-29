import { useState } from 'react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import '../styles/PDFUploader.css'

import { InteractiveFlashcard } from './InteractiveFlashcard'
import { InteractiveQuiz } from './InteractiveQuiz'
import { RevisionTimeline } from './RevisionTimeline'
import { AIProcessingStatus } from './AIProcessingStatus'

interface UploadedFile {
  id: string
  name: string
  size: number
  uploadedAt: Date
  status: 'pending' | 'uploading' | 'completed' | 'error'
  errorMessage?: string
  responseData?: any
}

export function PDFUploader() {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [_, setFileMap] = useState<{ [key: string]: File }>({})
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({})

  const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
  const N8N_WEBHOOK_URL = 'https://poornishat.app.n8n.cloud/webhook/react-app'

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
    <div className="pdf-uploader max-w-5xl mx-auto p-4 md:p-8">
      <div className="uploader-container space-y-8">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground mb-2">Upload Documents</h1>
          <p className="text-muted-foreground">Upload your PDF notes and study materials to generate resources</p>
        </div>

        {/* Drag and Drop Area */}
        <div
          className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-200 flex flex-col items-center justify-center cursor-pointer ${isDragging ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/10'}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-upload')?.click()}
        >
          <div className="bg-primary/10 p-4 rounded-full mb-4">
             <svg className="w-8 h-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
               <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
               <polyline points="17 8 12 3 7 8"></polyline>
               <line x1="12" y1="3" x2="12" y2="15"></line>
             </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2 text-foreground">Drag & drop files here</h2>
          <p className="text-sm text-muted-foreground mb-6">or</p>
          <Button variant="default" className="pointer-events-none">Browse Files</Button>
          <input
            id="file-upload"
            type="file"
            multiple
            accept=".pdf"
            onChange={handleFileInput}
            className="hidden"
          />
          <p className="text-xs text-muted-foreground mt-4 font-medium">PDF files only • Maximum 10MB per file</p>
        </div>

        {/* Uploaded Files List */}
        {files.length > 0 && (
          <div className="uploaded-files mt-8">
            <h2 className="text-xl font-bold mb-4 text-foreground flex items-center justify-between">
              <span>Uploaded Files <span className="text-muted-foreground text-base font-normal ml-2">({files.length})</span></span>
            </h2>
            <div className="files-list space-y-6">
              {files.map((file) => (
                <div key={file.id} className="file-item bg-card border rounded-xl shadow-sm overflow-hidden flex flex-col">
                  <div className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-muted/20">
                    <div className="flex items-center gap-3 overflow-hidden w-full md:w-auto">
                      <div className="p-2.5 bg-primary/10 text-primary rounded-lg shrink-0">
                        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate max-w-[200px] sm:max-w-[300px] md:max-w-[400px] lg:max-w-[500px]" title={file.name}>
                          {file.name}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <span className="font-medium">{formatFileSize(file.size)}</span>
                          <span className="text-muted-foreground/50">•</span>
                          <span>{formatDate(file.uploadedAt)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status & Actions */}
                    <div className="flex items-center gap-4 shrink-0 w-full md:w-auto justify-end">
                      {file.status === 'pending' && (
                        <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse"></span>
                          Preparing...
                        </span>
                      )}

                      {file.status === 'uploading' && (
                        <AIProcessingStatus progress={uploadProgress[file.id] || 0} />
                      )}

                      {file.status === 'completed' && (
                        <span className="text-sm font-medium text-green-600 dark:text-green-400 flex items-center gap-1.5 bg-green-100 dark:bg-green-900/30 px-2.5 py-1 rounded-md">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          Uploaded
                        </span>
                      )}

                      {file.status === 'error' && (
                        <span className="text-sm font-medium text-red-600 dark:text-red-400 flex items-center gap-1.5 bg-red-100 dark:bg-red-900/30 px-2.5 py-1 rounded-md max-w-xs truncate" title={file.errorMessage}>
                          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                          </svg>
                          <span className="truncate">{file.errorMessage || 'Upload failed'}</span>
                        </span>
                      )}

                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 -mr-2"
                        onClick={() => deleteFile(file.id)}
                        title="Delete file"
                      >
                        ✕
                      </Button>
                    </div>
                  </div>
                  
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
                      <div className="p-4 md:p-6 border-t border-border bg-background">
                        <h4 className="text-lg md:text-xl font-bold mb-4 text-foreground flex items-center gap-2">✨ Generated Study Materials</h4>
                        
                        <Accordion type="multiple" className="w-full space-y-3">
                          {revisionPlan.length > 0 && (
                            <AccordionItem value="revision" className="border rounded-lg bg-card shadow-sm px-2 md:px-4">
                              <AccordionTrigger className="text-base md:text-lg font-semibold hover:no-underline hover:text-primary py-4">
                                <span className="flex items-center gap-2">📅 Revision Strategy</span>
                              </AccordionTrigger>
                              <AccordionContent className="pt-2 pb-6 border-t mt-2">
                                <RevisionTimeline plan={revisionPlan} />
                              </AccordionContent>
                            </AccordionItem>
                          )}

                          {flashcards.length > 0 && (
                            <AccordionItem value="flashcards" className="border rounded-lg bg-card shadow-sm px-2 md:px-4">
                              <AccordionTrigger className="text-base md:text-lg font-semibold hover:no-underline hover:text-primary py-4">
                                <span className="flex items-center gap-2">🗂️ Interactive Flashcards</span>
                              </AccordionTrigger>
                              <AccordionContent className="pt-4 pb-6 border-t mt-2">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {flashcards.map((card: any, index: number) => (
                                    <InteractiveFlashcard key={index} card={card} />
                                  ))}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          )}

                          {quiz.length > 0 && (
                            <AccordionItem value="quiz" className="border rounded-lg bg-card shadow-sm px-2 md:px-4">
                              <AccordionTrigger className="text-base md:text-lg font-semibold hover:no-underline hover:text-primary py-4">
                                <span className="flex items-center gap-2">📝 Practice Quiz</span>
                              </AccordionTrigger>
                              <AccordionContent className="pt-4 pb-6 border-t mt-2">
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
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {files.length === 0 && (
          <div className="text-center py-12 px-4 border-2 border-dashed border-border rounded-2xl bg-muted/5 mt-8">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-foreground">No files uploaded yet</h3>
            <p className="text-muted-foreground mt-1">Upload your first PDF to generate study materials.</p>
          </div>
        )}
      </div>
    </div>
  )
}
