import React, { useState, useRef, useEffect } from 'react';
import './Chatbot.css';

const API_URL = 'http://localhost:3000';

function Chatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [history, setHistory] = useState([]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [history]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (input.trim() === '' || isThinking) return;

        const newUserMessage = { role: 'user', text: input.trim() };
        
        const newHistory = [...history, newUserMessage];
        setHistory(newHistory);
        setInput('');
        setIsThinking(true);

        try {
            console.log('Sending to backend:', newUserMessage.text); // Debug log
            
            const response = await fetch(`${API_URL}/api/chatbot`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    message: newUserMessage.text,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'LLM API failed to respond.');
            }

            const result = await response.json();
            console.log('Received from backend:', result); // Debug log
            
            // ✅ FIXED: Use result.reply instead of result.text
            const newModelMessage = { 
                role: 'model', 
                text: result.reply || result.text || 'No response received' 
            };
            setHistory(prevHistory => [...prevHistory, newModelMessage]);

        } catch (error) {
            console.error('Chatbot error:', error);
            const errorMessage = { 
                role: 'model', 
                text: `Error: ${error.message}. Please try again.` 
            };
            setHistory(prevHistory => [...prevHistory, errorMessage]);
        } finally {
            setIsThinking(false);
        }
    };

    const initialMessage = {
        role: 'model',
        text: "Hi! I'm your Hydraulic Maintenance Assistant. Ask me about components (pump, cooler, valve), data interpretation, or general troubleshooting advice!",
    };

    useEffect(() => {
        if (isOpen && history.length === 0) {
            setHistory([initialMessage]);
        }
    }, [isOpen]);

    return (
        <div className={`chatbot-container ${isOpen ? 'open' : 'closed'}`}>
            <button className="chatbot-toggle-button" onClick={() => setIsOpen(!isOpen)}>
                {isOpen ? 'Close Chat ✖' : 'Hydraulics Chatbot 🤖'}
            </button>
            {isOpen && (
                <div className="chatbot-window">
                    <div className="chatbot-messages">
                        {history.map((msg, index) => (
                            <div key={index} className={`message message-${msg.role}`}>
                                <span className="message-text">{msg.text}</span>
                            </div>
                        ))}
                        {isThinking && (
                            <div className="message message-model thinking">
                                <span className="message-text">Thinking...</span>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                    <form className="chatbot-input-area" onSubmit={handleSend}>
                        <input
                            type="text"
                            placeholder="Ask about components or data..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={isThinking}
                        />
                        <button type="submit" disabled={isThinking}>
                            Send
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}

export default Chatbot; 