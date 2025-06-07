// LYLA - Your Digital Ride or Die
"use client";

import React, { useState, useCallback } from "react";

function MainComponent({ initialMessages = [], onMessageSend }) {
  const [messages, setMessages] = useState(initialMessages);
  const [inputMessage, setInputMessage] = useState("");
  const [streamingMessage, setStreamingMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [lylaExpression, setLylaExpression] = useState("neutral");

  const moodColors = {
    playful: "bg-pink-500",
    sassy: "bg-purple-600",
    caring: "bg-rose-400",
    confident: "bg-indigo-700",
    happy: "bg-emerald-500",
    neutral: "bg-gray-700",
  };

  const handleFinish = useCallback((message) => {
    setMessages((prev) => [...prev, { role: "assistant", content: message }]);
    setStreamingMessage("");
    setIsLoading(false);
    setLylaExpression("neutral");
  }, []);

  const copyToClipboard = (text) => navigator.clipboard.writeText(text);
  const readAloud = (text) => {
    const speech = new SpeechSynthesisUtterance(text);
    speechSynthesis.speak(speech);
  };

  const handleStreamResponse = async (response) => {
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let chunk = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunk += decoder.decode(value, { stream: true });
      setStreamingMessage(chunk);
    }
    handleFinish(chunk);
  };

  const startListening = () => {
    if ("webkitSpeechRecognition" in window) {
      const recognition = new window.webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputMessage(transcript);
        sendMessage(transcript);
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognition.start();
    } else {
      alert("Speech recognition not supported");
    }
  };

  const sendMessage = async (voiceMessage = null) => {
    const messageToSend = voiceMessage || inputMessage;
    if (!messageToSend.trim()) return;
    const userMessage = { role: "user", content: messageToSend };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    if (onMessageSend) onMessageSend(userMessage);

    try {
      const response = await fetch("/api/lyla", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      });
      handleStreamResponse(response);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Oops! Something glitched. Wanna try again? 💁‍♀️" },
      ]);
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen text-white ${moodColors[lylaExpression] || "bg-gray-800"}`}>
      <header className="p-4 text-2xl font-bold text-center">🤖 LYLA - Your Digital Ride or Die</header>
      <main className="h-[500px] overflow-y-auto p-6 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[70%] px-4 py-2 rounded-2xl ${msg.role === "user" ? "bg-blue-600" : "bg-purple-400/30 text-white"}`}>
              <p>{msg.content}</p>
              {msg.role !== "user" && (
                <div className="mt-1 text-sm opacity-60 flex space-x-2">
                  <button onClick={() => copyToClipboard(msg.content)}>📋</button>
                  <button onClick={() => readAloud(msg.content)}>🔊</button>
                </div>
              )}
            </div>
          </div>
        ))}
        {streamingMessage && (
          <div className="flex justify-start">
            <div className="max-w-[70%] px-4 py-2 rounded-2xl bg-purple-400/30 text-white animate-pulse">
              {streamingMessage}
            </div>
          </div>
        )}
      </main>
      <footer className="p-4 bg-black/20 border-t border-white/10">
        <div className="flex items-center space-x-2">
          <input
            className="flex-1 p-2 rounded-xl bg-white/20 text-white placeholder-white/50 focus:outline-none"
            placeholder="Type to LYLA..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button onClick={startListening} className={`p-3 rounded-full ${isListening ? "bg-red-600" : "bg-green-500"}`}>
            <i className={`fas ${isListening ? "fa-stop" : "fa-microphone"}`}></i>
          </button>
          <button onClick={() => sendMessage()} disabled={isLoading || !inputMessage.trim()} className="bg-blue-700 px-4 py-2 rounded-xl disabled:opacity-50">
            <i className="fas fa-paper-plane"></i>
          </button>
        </div>
      </footer>
    </div>
  );
}

export default MainComponent;
