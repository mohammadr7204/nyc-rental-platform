'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Send, MessageCircle, ArrowLeft, Phone, Video, MoreVertical, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { messageService, propertyService } from '@/services/api';
import { formatRelativeTime } from '@/lib/utils';

interface Conversation {
  id: string;
  partnerId: string;
  partnerName: string;
  partnerImage?: string;
  lastMessage: {
    content: string;
    timestamp: string;
    senderId: string;
  };
  unreadCount: number;
  property?: {
    id: string;
    title: string;
    address: string;
  };
}

interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  timestamp: string;
  messageType: string;
  attachments?: string[];
  property?: {
    id: string;
    title: string;
  };
}

export default function MessagesPage() {
  const { user, isAuthenticated } = useAuth();
  const searchParams = useSearchParams();
  const recipientId = searchParams.get('recipient');
  const propertyId = searchParams.get('property');
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(recipientId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAuthenticated) {
      loadConversations();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation);
      markAsRead(selectedConversation);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = async () => {
    try {
      const response = await messageService.getConversations();
      setConversations(response.data);
      
      // If we have a recipient from URL params, set it as selected
      if (recipientId && !selectedConversation) {
        setSelectedConversation(recipientId);
      } else if (response.data.length > 0 && !selectedConversation) {
        setSelectedConversation(response.data[0].partnerId);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      // Mock data for development
      setConversations([
        {
          id: '1',
          partnerId: 'user123',
          partnerName: 'John Smith',
          lastMessage: {
            content: 'Is this property still available?',
            timestamp: new Date().toISOString(),
            senderId: 'user123'
          },
          unreadCount: 2,
          property: {
            id: 'prop1',
            title: 'Beautiful 2BR in Manhattan',
            address: '123 Main St, Manhattan'
          }
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (partnerId: string) => {
    try {
      const response = await messageService.getConversationMessages(partnerId);
      setMessages(response.data);
    } catch (error) {
      console.error('Error loading messages:', error);
      // Mock data for development
      setMessages([
        {
          id: '1',
          content: 'Hi! I\'m interested in your property listing.',
          senderId: 'user123',
          receiverId: user?.id || '',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          messageType: 'text',
          property: {
            id: propertyId || 'prop1',
            title: 'Beautiful 2BR in Manhattan'
          }
        },
        {
          id: '2',
          content: 'Hello! Thank you for your interest. The property is still available. Would you like to schedule a viewing?',
          senderId: user?.id || '',
          receiverId: 'user123',
          timestamp: new Date(Date.now() - 1800000).toISOString(),
          messageType: 'text'
        }
      ]);
    }
  };

  const markAsRead = async (partnerId: string) => {
    try {
      await messageService.markAsRead(partnerId);
      setConversations(prev =>
        prev.map(conv =>
          conv.partnerId === partnerId
            ? { ...conv, unreadCount: 0 }
            : conv
        )
      );
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sending) return;

    setSending(true);
    try {
      const messageData = {
        receiverId: selectedConversation,
        content: newMessage.trim(),
        messageType: 'text',
        propertyId: propertyId || undefined
      };

      const response = await messageService.sendMessage(messageData);
      
      const newMsg: Message = {
        id: response.data.id || Date.now().toString(),
        content: newMessage.trim(),
        senderId: user?.id || '',
        receiverId: selectedConversation,
        timestamp: new Date().toISOString(),
        messageType: 'text'
      };

      setMessages(prev => [...prev, newMsg]);
      setNewMessage('');

      // Update conversation list
      setConversations(prev =>
        prev.map(conv =>
          conv.partnerId === selectedConversation
            ? {
                ...conv,
                lastMessage: {
                  content: newMessage.trim(),
                  timestamp: new Date().toISOString(),
                  senderId: user?.id || ''
                }
              }
            : conv
        )
      );
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.partnerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.property?.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedConversationData = conversations.find(c => c.partnerId === selectedConversation);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Sign in to access messages</h1>
            <p className="text-gray-600 mb-8">Connect with landlords and tenants through our secure messaging system.</p>
            <Button asChild>
              <a href="/login">Sign In</a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden h-[calc(100vh-200px)]">
          <div className="flex h-full">
            {/* Conversations Sidebar */}
            <div className="w-1/3 border-r border-gray-200 flex flex-col">
              {/* Header */}
              <div className="p-4 border-b border-gray-200">
                <h1 className="text-xl font-semibold text-gray-900 mb-4">Messages</h1>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search conversations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Conversations List */}
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="p-4 space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                          <div className="flex-1">
                            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredConversations.length > 0 ? (
                  filteredConversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      onClick={() => setSelectedConversation(conversation.partnerId)}
                      className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                        selectedConversation === conversation.partnerId ? 'bg-blue-50 border-blue-200' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                          {conversation.partnerImage ? (
                            <img
                              src={conversation.partnerImage}
                              alt={conversation.partnerName}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-sm font-medium text-gray-600">
                              {conversation.partnerName.split(' ').map(n => n[0]).join('')}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {conversation.partnerName}
                            </p>
                            {conversation.unreadCount > 0 && (
                              <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-blue-600 rounded-full">
                                {conversation.unreadCount}
                              </span>
                            )}
                          </div>
                          {conversation.property && (
                            <p className="text-xs text-blue-600 truncate mb-1">
                              Re: {conversation.property.title}
                            </p>
                          )}
                          <p className="text-sm text-gray-500 truncate">
                            {conversation.lastMessage.content}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {formatRelativeTime(conversation.lastMessage.timestamp)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center">
                    <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No conversations yet</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Start messaging landlords or tenants to see conversations here.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col">
              {selectedConversation && selectedConversationData ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        {selectedConversationData.partnerImage ? (
                          <img
                            src={selectedConversationData.partnerImage}
                            alt={selectedConversationData.partnerName}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-medium text-gray-600">
                            {selectedConversationData.partnerName.split(' ').map(n => n[0]).join('')}
                          </span>
                        )}
                      </div>
                      <div>
                        <h2 className="text-lg font-medium text-gray-900">
                          {selectedConversationData.partnerName}
                        </h2>
                        {selectedConversationData.property && (
                          <p className="text-sm text-blue-600">
                            Re: {selectedConversationData.property.title}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm">
                        <Phone className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Video className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.senderId === user?.id ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            message.senderId === user?.id
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 text-gray-900'
                          }`}
                        >
                          {message.property && (
                            <div className="text-xs opacity-75 mb-1">
                              Property: {message.property.title}
                            </div>
                          )}
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          <p
                            className={`text-xs mt-1 ${
                              message.senderId === user?.id ? 'text-blue-100' : 'text-gray-500'
                            }`}
                          >
                            {formatRelativeTime(message.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Message Input */}
                  <div className="p-4 border-t border-gray-200">
                    <div className="flex space-x-2">
                      <Input
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        className="flex-1"
                      />
                      <Button onClick={sendMessage} disabled={sending || !newMessage.trim()}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Select a conversation
                    </h3>
                    <p className="text-gray-600">
                      Choose a conversation from the list to start messaging.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}