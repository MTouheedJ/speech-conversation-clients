"use client";
import React, { useEffect, useState } from "react";
import ChatBox from "./components/ChatBox/ChatBox";
import SpeechToText from "./components/SpeechToText/SpeechToText";
import NewChatBox from "./components/ChatBox/NewChatBox";

function App() {
  const [data, setData] = useState(null);

  return (
    <>
    {/* <SpeechToText /> */}
     {/* <ChatBox /> */}
     <NewChatBox />
</>
  );
}

export default App;
