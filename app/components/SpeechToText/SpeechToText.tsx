"use client";
import { FC } from "react";
import "regenerator-runtime/runtime";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";

interface SpeechToTextProps {}

const SpeechToText: FC<SpeechToTextProps> = ({}) => {
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  if (!browserSupportsSpeechRecognition) {
    return <p>Your browser does not support speech to text</p>;
  }
 
  const startListening = () => {
    SpeechRecognition.startListening({
      continuous: true,
      interimResults: true,
    });
  };

  return (
    <div>
      <div>
        <p>Microphone: {listening ? "on" : "off"}</p>
        <div className="flex items-center gap-3 text-sm">
          <button
            onMouseDown={startListening}
            onMouseUp={SpeechRecognition.stopListening}
            className="rounded text-white bg-gray-700 py-1 px-4"
          >
            Speech
          </button>
          <button
            onClick={resetTranscript}
            className="rounded text-white bg-teal-700 py-1 px-4"
          >
            Reset
          </button> 
        </div>
        <div>{transcript}</div>
      </div>
    </div>
  );
};

export default SpeechToText;
