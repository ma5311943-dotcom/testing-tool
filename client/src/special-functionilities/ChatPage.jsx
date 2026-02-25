import React, { useState, useEffect, useRef } from "react";
import { useUser } from "@clerk/clerk-react";
import { Send, MessageSquare, User, Search, ArrowLeft } from "lucide-react";
import "./ChatPage.css";

const ChatPage = ({ role }) => {
    const { user } = useUser();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [contacts, setContacts] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const messagesEndRef = useRef(null);

    const email = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses[0]?.emailAddress;
    const API_URL = import.meta.env.VITE_API_BASE_URL;

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Fetch contacts (Admin only)
    useEffect(() => {
        if (role === 'admin') {
            const fetchContacts = async () => {
                try {
                    const res = await fetch(`${API_URL}/messages/contacts/list`);
                    const data = await res.json();
                    setContacts(data);
                } catch (e) { console.error(e); }
            };
            fetchContacts();
            const interval = setInterval(fetchContacts, 10000);
            return () => clearInterval(interval);
        } else {
            setSelectedUser('admin');
        }
    }, [role]);

    // Fetch messages
    const fetchMessages = async () => {
        const target = role === 'admin' ? selectedUser : email;
        if (!target || (role === 'admin' && target === 'admin')) return;

        try {
            const res = await fetch(`${API_URL}/messages/${target}`);
            const data = await res.json();
            setMessages(data);
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        if (!selectedUser) return;
        fetchMessages();
        const interval = setInterval(fetchMessages, 3000);
        return () => clearInterval(interval);
    }, [selectedUser, email]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedUser) return;

        try {
            const res = await fetch(`${API_URL}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    senderEmail: role === 'admin' ? 'admin' : email,
                    receiverEmail: role === 'admin' ? selectedUser : 'admin',
                    content: newMessage,
                    role: role
                })
            });
            if (res.ok) {
                setNewMessage("");
                fetchMessages();
            }
        } catch (e) { console.error(e); }
    };

    const filteredContacts = contacts.filter(c => c.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="chat-page-container glass">
            <div className="chat-layout">
                {/* Sidebar - Contacts (Admin only) */}
                {role === 'admin' && (
                    <div className={`chat-sidebar ${selectedUser ? 'hidden-mobile' : ''}`}>
                        <div className="sidebar-header">
                            <h2>Messages</h2>
                            <div className="search-bar">
                                <Search size={18} />
                                <input
                                    type="text"
                                    placeholder="Search users..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="contacts-list">
                            {filteredContacts.length > 0 ? filteredContacts.map((contact, i) => (
                                <div
                                    key={i}
                                    className={`contact-item ${selectedUser === contact ? 'active' : ''}`}
                                    onClick={() => setSelectedUser(contact)}
                                >
                                    <div className="avatar">{contact[0].toUpperCase()}</div>
                                    <div className="contact-info">
                                        <span className="email">{contact}</span>
                                        <span className="status">Online</span>
                                    </div>
                                </div>
                            )) : (
                                <div className="no-contacts">No conversations found</div>
                            )}
                        </div>
                    </div>
                )}

                {/* Main Chat Area */}
                <div className={`chat-main ${role === 'admin' && !selectedUser ? 'no-selection' : ''} ${role === 'admin' && selectedUser ? 'active-mobile' : ''}`}>
                    {selectedUser ? (
                        <>
                            <div className="chat-header">
                                {role === 'admin' && (
                                    <button className="back-btn" onClick={() => setSelectedUser(null)}>
                                        <ArrowLeft size={20} />
                                    </button>
                                )}
                                <div className="user-profile">
                                    <div className="avatar">
                                        {role === 'admin' ? selectedUser[0].toUpperCase() : 'A'}
                                    </div>
                                    <div className="details">
                                        <h3>{role === 'admin' ? selectedUser : 'Admin Support'}</h3>
                                        <span>Typically replies in minutes</span>
                                    </div>
                                </div>
                            </div>

                            <div className="messages-container">
                                {messages.length > 0 ? messages.map((m, i) => (
                                    <div
                                        key={i}
                                        className={`message-bubble ${(role === 'admin' && m.senderEmail === 'admin') ||
                                            (role !== 'admin' && m.senderEmail === email) ? 'sent' : 'received'
                                            }`}
                                    >
                                        <div className="bubble-content">
                                            <p>{m.content}</p>
                                            <span className="time">
                                                {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="empty-chat">
                                        <MessageSquare size={48} />
                                        <p>No messages yet. Start the conversation!</p>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            <form className="chat-input-wrapper" onSubmit={handleSendMessage}>
                                <input
                                    type="text"
                                    placeholder="Type your message..."
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                />
                                <button type="submit" disabled={!newMessage.trim()}>
                                    <Send size={20} />
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="select-prompt">
                            <MessageSquare size={64} />
                            <h2>Your Messages</h2>
                            <p>Select a user from the sidebar to start chatting</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChatPage;
