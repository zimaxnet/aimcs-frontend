import React from 'react';
import { Mic, MicOff, Square } from 'lucide-react';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';

const VoiceRecorder = ({ onRecordingComplete, isProcessing = false }) => {
  const {
    isRecording,
    audioBlob,
    audioUrl,
    error,
    startRecording,
    stopRecording,
    clearRecording
  } = useVoiceRecorder();

  const handleRecordingToggle = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  };

  const handleSendRecording = async () => {
    if (audioBlob && onRecordingComplete) {
      try {
        await onRecordingComplete(audioBlob);
        clearRecording();
      } catch (error) {
        console.error('Error processing recording:', error);
      }
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Recording Button */}
      <div className="relative">
        <button
          onClick={handleRecordingToggle}
          disabled={isProcessing}
          className={`
            w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200
            ${isRecording 
              ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
              : 'bg-blue-500 hover:bg-blue-600'
            }
            ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            text-white shadow-lg hover:shadow-xl
          `}
        >
          {isRecording ? (
            <Square className="w-6 h-6" />
          ) : (
            <Mic className="w-6 h-6" />
          )}
        </button>
        
        {/* Recording indicator */}
        {isRecording && (
          <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full animate-ping" />
        )}
      </div>

      {/* Status Text */}
      <div className="text-center">
        {error && (
          <p className="text-red-500 text-sm mb-2">{error}</p>
        )}
        
        {isProcessing && (
          <p className="text-blue-500 text-sm">Processing your voice...</p>
        )}
        
        {!isRecording && !isProcessing && !audioBlob && (
          <p className="text-gray-600 text-sm">Click to start recording</p>
        )}
        
        {audioBlob && !isProcessing && (
          <p className="text-green-600 text-sm">Recording complete!</p>
        )}
      </div>

      {/* Audio Preview */}
      {audioUrl && (
        <div className="flex flex-col items-center space-y-2">
          <audio controls className="w-full max-w-xs">
            <source src={audioUrl} type="audio/webm" />
            Your browser does not support the audio element.
          </audio>
          
          <div className="flex space-x-2">
            <button
              onClick={handleSendRecording}
              disabled={isProcessing}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white rounded-lg text-sm"
            >
              Send to AI
            </button>
            
            <button
              onClick={clearRecording}
              disabled={isProcessing}
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 disabled:opacity-50 text-white rounded-lg text-sm"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceRecorder; 