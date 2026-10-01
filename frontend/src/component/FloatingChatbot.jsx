import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { MessageCircle, MessageSquare, Send, Sparkles, X } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { chatAPI } from '../utils/api'

const STARTER_PROMPTS = [
  'How do I submit a water complaint?',
  'Which department handles street light issues?',
  'How can I track my complaint status?',
]

function FloatingChatbot() {
  const { isDark } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! I am the Nivaran AI assistant. Ask me about complaint filing, departments, priorities, or tracking.',
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const sendMessage = async (text) => {
    const trimmed = text.trim()
    if (!trimmed || isLoading) return

    const nextMessages = [...messages, { role: 'user', content: trimmed }]
    setMessages(nextMessages)
    setInput('')
    setError('')
    setIsLoading(true)

    try {
      const response = await chatAPI.sendMessage({
        message: trimmed,
        history: nextMessages.slice(0, -1),
      })

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: response?.data?.reply || 'I could not generate a reply right now.',
        },
      ])
    } catch (err) {
      setError(
        err.status === 404
          ? 'Chat API was not found. Restart the backend server so the new /api/chat route is loaded.'
          : (err.message || 'Failed to contact the assistant.'),
      )
      setMessages((prev) => prev.slice(0, -1))
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    await sendMessage(input)
  }

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`fixed bottom-24 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-3xl border shadow-2xl sm:right-6 ${
              isDark ? 'border-cyan-900/60 bg-slate-950 text-white' : 'border-cyan-100 bg-white text-slate-900'
            }`}
          >
            <div className={`border-b px-4 py-4 ${isDark ? 'border-slate-800 bg-linear-to-r from-slate-950 via-slate-900 to-cyan-950/40' : 'border-cyan-100 bg-linear-to-r from-cyan-50 via-white to-sky-50'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`rounded-2xl p-2.5 ${isDark ? 'bg-cyan-500/10 text-cyan-300' : 'bg-cyan-100 text-cyan-700'}`}>
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold sm:text-base">Nivaran AI Assistant</h2>
                    <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      Complaint help on every page
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className={`rounded-full p-2 transition ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => sendMessage(prompt)}
                    disabled={isLoading}
                    className={`rounded-full px-3 py-1.5 text-xs transition ${
                      isDark
                        ? 'bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:opacity-50'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50'
                    }`}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            <div className={`h-80 space-y-3 overflow-y-auto px-4 py-4 ${isDark ? 'bg-slate-950/80' : 'bg-slate-50/70'}`}>
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl px-3.5 py-3 text-sm leading-6 ${
                      message.role === 'user'
                        ? 'bg-linear-to-r from-cyan-600 to-blue-700 text-white'
                        : isDark
                          ? 'border border-slate-800 bg-slate-900 text-slate-100'
                          : 'border border-slate-200 bg-white text-slate-800'
                    }`}
                  >
                    <div className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide opacity-75">
                      {message.role === 'user' ? <Send size={11} /> : <MessageSquare size={11} />}
                      {message.role}
                    </div>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className={`rounded-2xl px-3.5 py-3 text-sm ${isDark ? 'border border-slate-800 bg-slate-900 text-slate-200' : 'border border-slate-200 bg-white text-slate-700'}`}>
                    Nivaran AI is typing...
                  </div>
                </div>
              )}
            </div>

            <div className={`border-t px-4 py-4 ${isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-white'}`}>
              {error && (
                <div className={`mb-3 rounded-xl px-3 py-2 text-sm ${isDark ? 'bg-red-950/50 text-red-200' : 'bg-red-50 text-red-700'}`}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex items-end gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about complaints..."
                  rows={2}
                  className={`min-h-[52px] flex-1 rounded-2xl border px-4 py-3 outline-none transition focus:ring-2 focus:ring-cyan-500 ${
                    isDark ? 'border-slate-700 bg-slate-900 text-white placeholder:text-slate-500' : 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400'
                  }`}
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className={`flex h-[52px] w-[52px] items-center justify-center rounded-2xl text-white transition ${
                    isLoading || !input.trim()
                      ? 'cursor-not-allowed bg-slate-500 opacity-60'
                      : 'bg-linear-to-r from-cyan-600 to-blue-700 hover:from-cyan-700 hover:to-blue-800'
                  }`}
                >
                  <Send size={18} />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-4 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-r from-cyan-500 to-blue-700 text-white shadow-[0_18px_45px_rgba(8,145,178,0.45)] sm:right-6"
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={26} />}
      </motion.button>
    </>
  )
}

export default FloatingChatbot
