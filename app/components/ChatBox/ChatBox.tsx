"use client";
import React, { useState, useRef, useEffect, FC } from "react";
import { FaMicrophone } from "react-icons/fa";
import axios from "axios";
import TypingAnimation from "../TypingAnimation/TypingAnimation";

interface ChatMessage {
  type: "openAIResponse" | "transcription" ;
  text: string;
}

const ChatBox: FC = () => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const mediaChunksRef = useRef<Blob[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const typingAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [stopTypingAnimation, setStopTypingAnimation] =
    useState<boolean>(false);
  const [isTyping, setIsTyping] = useState<boolean>(false); // New state to track typing status

  useEffect(() => {
    typingAudioRef.current = new Audio("/audio/typingKeyboard.mp3");

    if (typingAudioRef.current) {
      typingAudioRef.current.load();
      console.log("Typing sound loaded");
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const playTypingSound = () => {
    if (typingAudioRef.current && !isTyping) {
      // Ensure sound only plays if not already typing
      typingAudioRef.current.loop = true;
      typingAudioRef.current.currentTime = 0;
      typingAudioRef.current
        .play()
        .then(() => {
          console.log("Typing sound is playing");
          setIsTyping(true); // Mark that typing has started
        })
        .catch((error) => {
          console.error("Failed to play audio:", error);
        });
    }
  };

  const stopTypingSound = () => {
    if (typingAudioRef.current && isTyping) {
      // Ensure sound only stops if typing is in progress
      typingAudioRef.current.pause();
      typingAudioRef.current.currentTime = 0;
      console.log("Typing sound stopped");
      setIsTyping(false); // Mark that typing has stopped
    }
  };

  const startRecording = () => {
    setStopTypingAnimation(true); // Set flag to stop typing animation
    stopTypingSound(); // Stop typing sound when recording starts

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    if (utteranceRef.current) {
      window.speechSynthesis.cancel();
      utteranceRef.current = null;
    }

    setIsRecording(true);

    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      const mediaRecorder = new MediaRecorder(stream);
      mediaChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          mediaChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(mediaChunksRef.current, { type: "audio/webm" });
        setIsRecording(false);
        await sendData(blob);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
    });
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
  };

  const sendData = async (blob: Blob) => {
    const formData = new FormData();
    formData.append("audio", blob, "audio/webm");

    try {
      const res = await axios.post(
        `http://localhost:3000/transcribe`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setChatMessages((prevMessages) => [
        ...prevMessages,
        { type: "transcription", text: res.data.text },
      ]);

      startStream();
    } catch (error) {
      console.error("Error sending file:", error);
    }
  };

  const startStream = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    eventSourceRef.current = new EventSource(
      `http://localhost:3000/transcribe`
    );

    eventSourceRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type !== "end") {
        if (data.type === "text") {
          playTypingSound();
          setChatMessages((prevMessages) => [
            ...prevMessages,
            { type: data.type, text: data.text },
          ]);
        } else if (data.type === "audio") {
          const audioBlob = new Blob(
            [Uint8Array.from(atob(data.text), (c) => c.charCodeAt(0))],
            { type: "audio/mpeg" }
          );
          const audioUrl = URL.createObjectURL(audioBlob);
          console.log(audioUrl);
          audioRef.current = new Audio(audioUrl);
          audioRef.current.play();
        }
      } else {
        stopTypingSound(); // Stop typing sound only when "end" is received
        setStopTypingAnimation(false); // Reset flag to allow future animations
      }
    };

    eventSourceRef.current.onerror = (err) => {
      console.error("EventSource failed:", err);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  };

  return (
    <div className="py-20 bg-gradient-to-br from-[#0F172B] via-[#18314C] to-[#0F172B]">
      <div className="container mx-auto space-y-4">
        <div className="w-[70%] mx-auto border border-gray-600 rounded-xl flex flex-col justify-between h-[450px]">
          <div className="flex flex-col gap-2 p-3 overflow-y-auto">
            {chatMessages.map((message, index) => (
              <div key={index}>
                {message.type === "transcription" ? (
                  <div className="flex justify-end">
                    <p className="whitespace-pre-wrap py-4 px-[14px] rounded-lg bg-teal-300 text-start ml-10 w-fit">
                      {message.text.replace("[write]:", "")}
                    </p>
                  </div>
                ) : (
                  <div>
                    <TypingAnimation
                      className="whitespace-pre-wrap py-4 px-[14px] rounded-lg bg-slate-600 text-white text-start mr-10 w-fit"
                      text={message.text.replace("[write]:", "")}
                      onTypingStart={playTypingSound}
                      onTypingEnd={stopTypingSound}
                      shouldStop={stopTypingAnimation} // Pass the stop flag
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="border-t border-gray-600 p-3 flex justify-center text-4xl text-gray-400">
            <div
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              className="cursor-pointer"
            >
              <FaMicrophone />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatBox;
