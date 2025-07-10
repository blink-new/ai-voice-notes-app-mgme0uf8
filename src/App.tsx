import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

import { Textarea } from '@/components/ui/textarea'
import { 
  Mic, 
  MicOff, 
  Copy, 
  Trash2, 
  BookOpen, 
  Plus,
  Clock,
  Check,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { blink } from './blink/client'

interface VoiceNote {
  id: string
  transcript: string
  audioUrl?: string
  createdAt: string
  durationSeconds?: number
}

interface DictionaryWord {
  id: string
  word: string
  pronunciation?: string
  definition?: string
  createdAt: string
}

function App() {
  const [isRecording, setIsRecording] = useState(false)
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>([])
  const [dictionaryWords, setDictionaryWords] = useState<DictionaryWord[]>([])
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [currentTranscript, setCurrentTranscript] = useState('')
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [audioChunks, setAudioChunks] = useState<Blob[]>([])
  const [newWord, setNewWord] = useState('')
  const [newDefinition, setNewDefinition] = useState('')
  const [newPronunciation, setNewPronunciation] = useState('')
  const [isAddingWord, setIsAddingWord] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Initialize audio recording
  const initializeRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setAudioChunks(prev => [...prev, event.data])
        }
      }
      
      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' })
        await transcribeAudio(audioBlob)
        setAudioChunks([])
      }
      
      setMediaRecorder(recorder)
      return recorder
    } catch (error) {
      console.error('Error accessing microphone:', error)
      toast.error('Could not access microphone')
      return null
    }
  }

  // Start recording
  const startRecording = async () => {
    let recorder = mediaRecorder
    if (!recorder) {
      recorder = await initializeRecording()
      if (!recorder) return
    }

    setIsRecording(true)
    setCurrentTranscript('')
    setAudioChunks([])
    recorder.start()
    toast.success('Recording started')
  }

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      setIsRecording(false)
      setIsTranscribing(true)
      mediaRecorder.stop()
      toast.success('Recording stopped, transcribing...')
    }
  }

  // Transcribe audio using Blink AI
  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      // Convert blob to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const dataUrl = reader.result as string
          const base64Data = dataUrl.split(',')[1]
          resolve(base64Data)
        }
        reader.onerror = reject
        reader.readAsDataURL(audioBlob)
      })

      // Transcribe using Blink AI
      const { text } = await blink.ai.transcribeAudio({
        audio: base64,
        language: 'en'
      })

      setCurrentTranscript(text)
      
      // Save to voice notes
      const newNote: VoiceNote = {
        id: Date.now().toString(),
        transcript: text,
        createdAt: new Date().toISOString(),
        durationSeconds: Math.floor(audioBlob.size / 1000) // Rough estimate
      }
      
      setVoiceNotes(prev => [newNote, ...prev])
      toast.success('Transcription completed!')
      
    } catch (error) {
      console.error('Transcription error:', error)
      toast.error('Transcription failed')
    } finally {
      setIsTranscribing(false)
    }
  }

  // Copy text to clipboard
  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      toast.success('Copied to clipboard!')
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      toast.error('Failed to copy')
    }
  }

  // Delete voice note
  const deleteVoiceNote = (id: string) => {
    setVoiceNotes(prev => prev.filter(note => note.id !== id))
    toast.success('Note deleted')
  }

  // Add dictionary word
  const addDictionaryWord = () => {
    if (!newWord.trim()) return
    
    const word: DictionaryWord = {
      id: Date.now().toString(),
      word: newWord.trim(),
      pronunciation: newPronunciation.trim() || undefined,
      definition: newDefinition.trim() || undefined,
      createdAt: new Date().toISOString()
    }
    
    setDictionaryWords(prev => [word, ...prev])
    setNewWord('')
    setNewDefinition('')
    setNewPronunciation('')
    setIsAddingWord(false)
    toast.success('Word added to dictionary')
  }

  // Delete dictionary word
  const deleteDictionaryWord = (id: string) => {
    setDictionaryWords(prev => prev.filter(word => word.id !== id))
    toast.success('Word removed from dictionary')
  }

  // Format time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  // Format duration
  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white/70 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Mic className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">AI Voice Notes</h1>
                <p className="text-slate-600 text-sm">Smart voice transcription with custom dictionary</p>
              </div>
            </div>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center space-x-2">
                  <BookOpen className="w-4 h-4" />
                  <span>Dictionary ({dictionaryWords.length})</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Custom Dictionary</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Input
                      placeholder="Add new word..."
                      value={newWord}
                      onChange={(e) => setNewWord(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addDictionaryWord()}
                    />
                    <Button onClick={addDictionaryWord} size="sm">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {isAddingWord && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2"
                    >
                      <Input
                        placeholder="Pronunciation (optional)"
                        value={newPronunciation}
                        onChange={(e) => setNewPronunciation(e.target.value)}
                      />
                      <Textarea
                        placeholder="Definition (optional)"
                        value={newDefinition}
                        onChange={(e) => setNewDefinition(e.target.value)}
                        rows={2}
                      />
                    </motion.div>
                  )}
                  
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {dictionaryWords.map((word) => (
                        <div
                          key={word.id}
                          className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="font-medium">{word.word}</div>
                            {word.pronunciation && (
                              <div className="text-sm text-slate-600">/{word.pronunciation}/</div>
                            )}
                            {word.definition && (
                              <div className="text-sm text-slate-600">{word.definition}</div>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteDictionaryWord(word.id)}
                            className="text-slate-400 hover:text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recording Section */}
          <div className="lg:col-span-1">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader className="text-center">
                <CardTitle className="text-xl">Voice Recording</CardTitle>
                <CardDescription>
                  Press and hold to record, release to transcribe
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center space-y-6">
                <div className="relative">
                  <motion.div
                    className={`inline-flex items-center justify-center w-24 h-24 rounded-full cursor-pointer select-none ${
                      isRecording 
                        ? 'bg-red-500 text-white' 
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    animate={isRecording ? { scale: [1, 1.1, 1] } : {}}
                    transition={{ repeat: isRecording ? Infinity : 0, duration: 1 }}
                    onMouseDown={startRecording}
                    onMouseUp={stopRecording}
                    onMouseLeave={stopRecording}
                    onTouchStart={startRecording}
                    onTouchEnd={stopRecording}
                  >
                    {isRecording ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
                  </motion.div>
                  
                  <AnimatePresence>
                    {isRecording && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="absolute -bottom-2 left-1/2 transform -translate-x-1/2"
                      >
                        <Badge variant="destructive" className="text-xs">
                          Recording...
                        </Badge>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                <div className="text-sm text-slate-600">
                  {isRecording ? 'Recording in progress...' : 
                   isTranscribing ? 'Transcribing...' : 
                   'Ready to record'}
                </div>
                
                {isTranscribing && (
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full animate-pulse" style={{ width: '60%' }} />
                  </div>
                )}
                
                {currentTranscript && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-green-50 rounded-lg border border-green-200"
                  >
                    <div className="text-sm font-medium text-green-800 mb-2">Latest Transcription:</div>
                    <div className="text-sm text-green-700">{currentTranscript}</div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Voice Notes History */}
          <div className="lg:col-span-2">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Voice Notes History</span>
                  <Badge variant="secondary">{voiceNotes.length} notes</Badge>
                </CardTitle>
                <CardDescription>
                  Your transcribed voice notes with one-click copy
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    <AnimatePresence>
                      {voiceNotes.map((note) => (
                        <motion.div
                          key={note.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          className="p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center space-x-2 text-sm text-slate-600">
                              <Clock className="w-4 h-4" />
                              <span>{formatTime(note.createdAt)}</span>
                              {note.durationSeconds && (
                                <Badge variant="outline" className="text-xs">
                                  {formatDuration(note.durationSeconds)}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(note.transcript, note.id)}
                                className="text-slate-400 hover:text-blue-500"
                              >
                                {copiedId === note.id ? (
                                  <Check className="w-4 h-4 text-green-500" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteVoiceNote(note.id)}
                                className="text-slate-400 hover:text-red-500"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-slate-700 leading-relaxed">{note.transcript}</p>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    
                    {voiceNotes.length === 0 && (
                      <div className="text-center py-12 text-slate-500">
                        <Mic className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                        <p>No voice notes yet</p>
                        <p className="text-sm">Press and hold the microphone to start recording</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App