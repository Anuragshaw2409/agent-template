import { useEffect, useRef, useState } from "react";
import { Loader2, Send, Upload } from "lucide-react";
import axios from "axios";
import MessageContent from "../components/Formatter";

interface messageInterface {
  type: string;
  content: string;
}

const Home = () => {
  const [messages, setMessages] = useState<messageInterface[] | []>([]);
  const [input, setInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const handleFileUpload = (e: any) => {
    const file = e.target.files[0];
    if (file && file.type === "text/plain") {
      setFile(file);
      const blob = file.slice(0, file.size, file.type);
      const newFile = new File(
        [blob],
        `${file.fileName}_post.${file.fileType}`,
        { type: file.type }
      );
      const formData = new FormData();
      formData.append("file", newFile);
      axios
        .post("http://localhost:3000/api/v1/file/upload", formData, {
          headers: {
            "Content-Type": "multipart/form-data", // This header is set automatically by Axios, but you can specify it if needed
          },
        })
        .then(() => {
          setMessages([
            {
              type: "system",
              content:
                "File uploaded successfully. You can now ask questions about it.",
            },
          ]);
        })
        .catch(() => {
          setMessages([
            {
              type: "system",
              content: "There was an issue uploading the file",
            },
          ]);
        });
    }
  };

  const handleSubmit = (e: any) => {
    e.preventDefault();
    if (input.trim()) {
      setMessages(c=>[...c, { type: "user", content: input }]);
      setIsThinking(true);
      
      // Create placeholder for assistant message
      setMessages(c=>[...c, { type: "system", content: "" }]);
      
      fetch("http://localhost:3000/api/v1/chat", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: input })
      })
      .then(response => {
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No reader available');
        }

        const decoder = new TextDecoder();
        let buffer = '';

        function processChunk() {
          reader!.read().then(({done, value}) => {
            if (done) {
              setIsThinking(false);
              return;
            }

            // Decode the chunk and add it to our buffer
            buffer += decoder.decode(value, {stream: true});

            // Split on double newlines as per SSE spec
            const lines = buffer.split('\n\n');
            
            // Keep the last incomplete chunk in the buffer
            buffer = lines.pop() || '';

            lines.forEach(line => {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  if (data.content) {
                    setMessages(messages => {
                      const lastMessage = messages[messages.length - 1];
                      const updatedMessages = [...messages.slice(0, -1)];
                      updatedMessages.push({
                        type: "system",
                        content: lastMessage.content + data.content
                      });
                      return updatedMessages;
                    });
                  }
                } catch (e) {
                  // Handle JSON parse errors silently
                }
              }
            });

            processChunk();
          }).catch(error => {
            console.error('Stream reading error:', error);
            setMessages(c=>[
              ...c,
              { type: "system", content: "There was an issue processing the request" },
            ]);
            setIsThinking(false);
          });
        }

        processChunk();
      })
      .catch(() => {
        setMessages(c=>[
          ...c,
          { type: "system", content: "There was an issue processing the request" },
        ]);
        setIsThinking(false);
      });

      setInput("");
    }
};

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo(0, scrollRef.current.scrollHeight);
    }
  }, [messages]);

  return (
    <div className="w-full max-w-5xl mx-auto p-4 space-y-4 h-screen">
      {/* File Upload Card */}
      <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-200 h-[10%]">
        <div className="p-4">
          <label className="flex items-center gap-2 cursor-pointer hover:text-blue-600 transition-colors">
            <Upload className="w-5 h-5" />
            <span>Upload Text File</span>
            <input
              type="file"
              accept=".txt"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
          {file && (
            <p className="mt-2 text-sm text-gray-600">
              File: {file.name}
            </p>
          )}
        </div>
      </div>

      {/* Messages Container */}
      <div className="h-[80%] bg-white rounded-lg shadow-sm border border-gray-200">
        <div 
          ref={scrollRef}
          className="h-full overflow-y-auto p-4 scroll-smooth"
        >
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`mb-4 flex ${
                msg.type === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`inline-block max-w-[80%] px-4 py-2 rounded-2xl ${
                  msg.type === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                {msg.type === 'user' ? (
                  msg.content
                ) : (
                  <MessageContent content={msg.content} />
                )}
              </div>
            </div>
          ))}
          {isThinking && (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Thinking...</span>
            </div>
          )}
        </div>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about your document..."
          className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          type="submit"
          disabled={isThinking}
          className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};

export default Home;
