import { useState } from "react";
import Parrot from "react-partyparrot";

export function ParrotApp() {
  const [msg, setMsg] = useState("Hello!");
  const messages = ["Hello!", "I am a parrot!", "This is the noCoder canvas app!"];

  const handleClick = () => {
    const nextIndex = (messages.indexOf(msg) + 1) % messages.length;
    setMsg(messages[nextIndex]);
  };

  return (
    <div id="parrot-app-container" style={{ position: "fixed", bottom: "100px", right: "24px", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", background: "white", padding: "10px", borderRadius: "8px", border: "1px solid #ccc", zIndex: 999999 }} onClick={handleClick}>
      <Parrot />
      <span>{msg}</span>
    </div>
  );
}
