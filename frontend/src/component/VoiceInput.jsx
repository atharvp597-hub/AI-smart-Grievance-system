import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Mic, Square, AlertCircle } from 'lucide-react';

export default function VoiceInput({ onTranscript, isOpen, onClose }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [language, setLanguage] = useState('en-IN'); // India English dialect
  const [error, setError] = useState('');
  const recognitionRef = useRef(null);
  const speechRecognitionCtor = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }, []);
  const isSupported = Boolean(speechRecognitionCtor);

  useEffect(() => {
    if (!speechRecognitionCtor) {
      return undefined;
    }

    const recognition = new speechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onstart = () => {
      setIsListening(true);
      setError('');
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += `${event.results[i][0].transcript} `;
        }
      }

      if (finalTranscript) {
        setTranscript((prev) => prev + finalTranscript);
      }
    };

    recognition.onerror = (event) => {
      setError(`Error: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [language, speechRecognitionCtor]);

  const supportError = !isSupported ? 'Speech Recognition not supported in your browser' : error;

  const startListening = () => {
    if (!recognitionRef.current) return;
    setTranscript('');
    recognitionRef.current.start();
  };

  const stopListening = () => {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
  };

  const handleSubmit = () => {
    if (transcript.trim()) {
      onTranscript(transcript);
      setTranscript('');
      onClose();
    }
  };

  const handleClear = () => {
    setTranscript('');
  };

  if (!isOpen) return null;

  if (!isSupported) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-md w-full"
        >
          <div className="flex items-center gap-2 mb-4 text-red-600">
            <AlertCircle size={24} />
            <h2 className="text-xl font-bold">Not Supported</h2>
          </div>
          <p className="text-gray-700 dark:text-gray-300 mb-6">
            Speech recognition is not supported in your browser. Please use Chrome, Firefox, or Edge.
          </p>
          <button
            onClick={onClose}
            className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700"
          >
            Close
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-gray-900 rounded-lg p-8 max-w-2xl w-full shadow-2xl"
      >
        <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
          🎤 Voice Complaint
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Speak your complaint in Hindi, English, or Hinglish
        </p>

        {/* Language Selection */}
        <div className="mb-6 flex gap-4">
          <button
            onClick={() => setLanguage('en-IN')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              language === 'en-IN'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
            }`}
          >
            English
          </button>
          <button
            onClick={() => setLanguage('hi-IN')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              language === 'hi-IN'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
            }`}
          >
            हिंदी
          </button>
        </div>

        {/* Microphone Button */}
        <div className="flex justify-center mb-6">
          <motion.button
            onClick={isListening ? stopListening : startListening}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`relative w-24 h-24 rounded-full flex items-center justify-center font-bold text-white transition-all ${
              isListening
                ? 'bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500'
                : 'bg-blue-600 hover:bg-blue-700 shadow-lg'
            }`}
          >
            {isListening && (
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [1, 0.7, 1],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                }}
                className="absolute inset-0 rounded-full border-4 border-red-400"
              />
            )}
            {isListening ? <Square size={32} /> : <Mic size={32} />}
          </motion.button>
        </div>

        {/* Status */}
        <div className="text-center mb-6">
          {isListening && (
            <motion.p
              animate={{ opacity: [0.5, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="text-green-600 dark:text-green-400 font-semibold flex items-center justify-center gap-2"
            >
              <span className="w-3 h-3 bg-green-600 rounded-full animate-pulse"></span>
              Listening...
            </motion.p>
          )}
          {!isListening && transcript && (
            <p className="text-green-600 dark:text-green-400 font-semibold">✓ Transcript saved</p>
          )}
          {supportError && <p className="text-red-600 font-semibold flex items-center justify-center gap-2"><AlertCircle size={18} />{supportError}</p>}
        </div>

        {/* Transcript Display */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6 min-h-24 max-h-40 overflow-y-auto">
          <p className="text-gray-900 dark:text-white text-lg leading-relaxed">
            {transcript || (
              <span className="text-gray-400 italic">Your transcript will appear here...</span>
            )}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600 font-medium transition"
          >
            Cancel
          </button>
          <button
            onClick={handleClear}
            disabled={!transcript}
            className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 font-medium transition"
          >
            Clear
          </button>
          <button
            onClick={handleSubmit}
            disabled={!transcript.trim()}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium transition"
          >
            Submit Complaint
          </button>
        </div>

        {/* Tip */}
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">
          💡 Speak naturally. Your complaint will be auto-filled in the form.
        </p>
      </motion.div>
    </div>
  );
}
