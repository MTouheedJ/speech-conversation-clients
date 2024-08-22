import { FC, useState, useRef } from "react";
import { FaMicrophone } from "react-icons/fa";
import "regenerator-runtime/runtime";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import axios from "axios";
import TypingAnimation from "../TypingAnimation/TypingAnimation";

type ChatMessage = {
  type: "openAIResponse" | "text" | "transcript";
  text: string;
};

const BACKEND_BASE_URL_LOCAL = "http://localhost:3001";
const BACKEND_BASE_URL_LIVE = "https://mendel.mindrind.live";

interface NewChatBoxProps {}

const NewChatBox: FC<NewChatBoxProps> = () => {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [stopTypingAnimation, setStopTypingAnimation] =
    useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null); // Reference for audio element
  const eventSourceRef = useRef<EventSource | null>(null); // Reference for EventSource
  const isRecordingRef = useRef<boolean>(false); // Track recording state

  const startStream = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    eventSourceRef.current = new EventSource(
      `${BACKEND_BASE_URL_LIVE}/transcribe`
    );

    eventSourceRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type !== "end") {
        console.log(data);

        const cleanedText = data.text.replace("[write]:", "").trim(); // Clean the text

        if (data.type === "text") {
          setStopTypingAnimation(false); // Reset stopTypingAnimation when new text is added
          setChatMessages((prevMessages) => [
            ...prevMessages,
            { type: data.type, text: cleanedText }, // Use cleaned text here
          ]);
        } else if (data.type === "audio") {
          const audioBlob = new Blob(
            [Uint8Array.from(atob(data.text), (c) => c.charCodeAt(0))],
            { type: "audio/mpeg" }
          );
          const audioUrl = URL.createObjectURL(audioBlob);
          console.log(audioUrl);
          if (audioRef.current) {
            audioRef.current.src = audioUrl;
            audioRef.current.play().catch((error) => {
              console.error("Failed to play audio:", error);
            });
          }
        }
      }
    };

    eventSourceRef.current.onerror = (err) => {
      console.error("EventSource failed:", err);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  };

  const sendData = async (transcript: string) => {
    const formData = new FormData();
    formData.append("transcript", transcript);
    console.log("Sending transcript to backend:", transcript);
    try {
      const res = await axios.post(
        `${BACKEND_BASE_URL_LIVE}/transcribe`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (res.data.audio) {
        playAudio(res.data.audio); // Play audio if available in response
      }

      startStream();
    } catch (error) {
      console.error("Error sending text:", error);
    }
  };

  const playAudio = (audioData: string) => {
    const audioBlob = new Blob(
      [Uint8Array.from(atob(audioData), (c) => c.charCodeAt(0))],
      { type: "audio/mpeg" }
    );
    const audioUrl = URL.createObjectURL(audioBlob);
    if (audioRef.current) {
      audioRef.current.src = audioUrl;
      console.log("Playing audio:", audioUrl);
      audioRef.current.play().catch((error) => {
        console.error("Failed to play audio:", error);
      });
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      console.log("here");
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      // return
    }
  };

  const stopTyping = () => {
    setStopTypingAnimation(true); // Stop the typing animation
  };

  const { transcript, resetTranscript, browserSupportsSpeechRecognition } =
    useSpeechRecognition();

  if (!browserSupportsSpeechRecognition) {
    return <p>Your browser does not support speech to text</p>;
  }

  const startListening = () => {
    stopAudio(); // Stop any playing audio before starting a new transcription
    stopTyping(); // Stop any ongoing typing animation
    SpeechRecognition.startListening({
      continuous: true,
      interimResults: true,
    });
    isRecordingRef.current = true;
  };

  const stopListening = () => {
    SpeechRecognition.stopListening();
    isRecordingRef.current = false;

    // Delay processing by 2 seconds to capture the final transcript
    setTimeout(() => {
      const finalTranscript = transcript.trim();
      if (finalTranscript) {
        // Immediately add the transcript to chat messages
        setChatMessages((prevMessages) => [
          ...prevMessages,
          { type: "transcript", text: finalTranscript }, // Add final transcript to chat messages
        ]);
        // Send the data to the backend
        sendData(finalTranscript);
      }
      resetTranscript(); // Reset the transcript for the next session
    }, 2000); // 2 seconds delay
  };

  return (
    <div className="py-20 bg-gradient-to-br from-[#0F172B] via-[#18314C] to-[#0F172B]">
      <div className="container relative mx-auto space-y-4">
        <div className="bg-amber-100 rounded-md p-2 absolute -top-10 left-[50%] w-fit">
          {transcript}
        </div>
        <div className="w-[70%] mx-auto border border-gray-600 rounded-xl flex flex-col justify-between h-[450px]">
          {/* Display real-time transcript */}
          <div className="flex flex-col gap-2 p-3 overflow-y-auto">
            {/* Display chat messages */}
            {chatMessages.map((message, index) => (
              <div key={index}>
                {message.type === "text" ? (
                  <TypingAnimation
                    className="whitespace-pre-wrap py-4 px-[14px] rounded-lg bg-slate-600 text-white text-start mr-10 w-fit"
                    text={message.text.replace("[write]:", "")}
                    shouldStop={stopTypingAnimation}
                  />
                ) : (
                  <div className="flex justify-end">
                    <p className="whitespace-pre-wrap py-4 px-[14px] rounded-lg bg-teal-300 text-start w-fit">
                      {message.text.replace("[write]:", "")}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="border-t border-gray-600 p-3 flex justify-center text-4xl text-gray-400">
            <div
              onMouseDown={startListening}
              onMouseUp={stopListening} // Use stopListening on mouse up
              className="cursor-pointer"
            >
              <FaMicrophone />
            </div>
          </div>
        </div>
        <audio ref={audioRef} />{" "}
        {/* Audio element to play the received audio */}
      </div>
    </div>
  );
};

export default NewChatBox;
