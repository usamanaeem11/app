import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { ScrollArea } from '../components/ui/scroll-area';
import { Separator } from '../components/ui/separator';
import {
  MessageSquare,
  Send,
  Bot,
  Users,
  Hash,
  Plus,
  Search,
  MoreVertical,
  Smile,
  Paperclip,
  Loader2,
  Sparkles,
} from 'lucide-react';
import api from '../lib/api';

const TeamChat = () => {
  const { user } = useAuth();
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [aiMode, setAiMode] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchChannels();
  }, []);

  useEffect(() => {
    if (selectedChannel) {
      fetchMessages(selectedChannel.channel_id);
    }
  }, [selectedChannel]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchChannels = async () => {
    try {
      const res = await api.get(`/chat/channels?company_id=${user?.company_id}`);
      setChannels(res.data.channels);
      
      // Select AI Support channel by default
      const supportChannel = res.data.channels.find(c => c.type === 'support');
      if (supportChannel) {
        setSelectedChannel(supportChannel);
        setAiMode(true);
      }
    } catch (error) {
      console.error('Failed to fetch channels:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (channelId) => {
    try {
      const res = await api.get(`/chat/channels/${channelId}/messages`);
      setMessages(res.data.messages);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const messageContent = newMessage;
    setNewMessage('');
    setSending(true);

    try {
      if (aiMode || selectedChannel?.type === 'support') {
        // Send to AI chatbot
        const userMsg = {
          message_id: `temp_${Date.now()}`,
          content: messageContent,
          sender_type: 'user',
          sender_name: user?.name,
          created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, userMsg]);

        const res = await api.post('/chat/ai/query', {
          query: messageContent,
          context: `User: ${user?.name}, Company: ${user?.company_id}`
        });

        const aiMsg = {
          message_id: `ai_${Date.now()}`,
          content: res.data.response,
          sender_type: 'ai',
          sender_name: 'WorkMonitor AI',
          created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, aiMsg]);
      } else {
        // Send to team channel
        await api.post('/chat/messages', {
          channel_id: selectedChannel.channel_id,
          content: messageContent
        });
        fetchMessages(selectedChannel.channel_id);
      }
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleCreateChannel = async () => {
    const name = prompt('Enter channel name:');
    if (!name) return;

    try {
      const res = await api.post('/chat/channels', {
        name,
        channel_type: 'team',
        company_id: user?.company_id
      });
      toast.success('Channel created');
      fetchChannels();
    } catch (error) {
      toast.error('Failed to create channel');
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96" data-testid="chat-loading">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)] flex" data-testid="team-chat-page">
      {/* Sidebar */}
      <div className="w-64 bg-zinc-900/50 border-r border-zinc-800 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-500" />
            Team Chat
          </h2>
        </div>

        {/* Channel List */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {/* AI Support */}
            <div className="mb-4">
              <p className="text-xs text-zinc-500 uppercase px-2 mb-2">AI Support</p>
              {channels.filter(c => c.type === 'support').map(channel => (
                <button
                  key={channel.channel_id}
                  onClick={() => {
                    setSelectedChannel(channel);
                    setAiMode(true);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                    selectedChannel?.channel_id === channel.channel_id
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'text-zinc-400 hover:bg-zinc-800'
                  }`}
                >
                  <Bot className="w-4 h-4" />
                  <span className="text-sm">{channel.name}</span>
                  <Badge className="ml-auto bg-purple-500/20 text-purple-400 text-xs">AI</Badge>
                </button>
              ))}
            </div>

            {/* Team Channels */}
            <div className="mb-4">
              <div className="flex items-center justify-between px-2 mb-2">
                <p className="text-xs text-zinc-500 uppercase">Channels</p>
                <button 
                  onClick={handleCreateChannel}
                  className="text-zinc-500 hover:text-zinc-300"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {channels.filter(c => c.type === 'team').map(channel => (
                <button
                  key={channel.channel_id}
                  onClick={() => {
                    setSelectedChannel(channel);
                    setAiMode(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                    selectedChannel?.channel_id === channel.channel_id
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'text-zinc-400 hover:bg-zinc-800'
                  }`}
                >
                  <Hash className="w-4 h-4" />
                  <span className="text-sm">{channel.name}</span>
                </button>
              ))}
            </div>

            {/* Direct Messages */}
            <div>
              <p className="text-xs text-zinc-500 uppercase px-2 mb-2">Direct Messages</p>
              {channels.filter(c => c.type === 'direct').map(channel => (
                <button
                  key={channel.channel_id}
                  onClick={() => {
                    setSelectedChannel(channel);
                    setAiMode(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                    selectedChannel?.channel_id === channel.channel_id
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'text-zinc-400 hover:bg-zinc-800'
                  }`}
                >
                  <Avatar className="w-5 h-5">
                    <AvatarFallback className="text-xs">{getInitials(channel.name)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{channel.name}</span>
                </button>
              ))}
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedChannel ? (
          <>
            {/* Chat Header */}
            <div className="h-14 px-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/30">
              <div className="flex items-center gap-3">
                {aiMode ? (
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Bot className="w-5 h-5 text-purple-400" />
                  </div>
                ) : (
                  <Hash className="w-5 h-5 text-zinc-400" />
                )}
                <div>
                  <h3 className="font-medium text-zinc-100">{selectedChannel.name}</h3>
                  {aiMode && (
                    <p className="text-xs text-zinc-500">AI-powered support assistant</p>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.length === 0 && (
                  <div className="text-center py-12">
                    {aiMode ? (
                      <>
                        <Sparkles className="w-12 h-12 text-purple-500 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-zinc-100 mb-2">WorkMonitor AI Assistant</h3>
                        <p className="text-zinc-500 max-w-md mx-auto">
                          I'm here to help you with any questions about WorkMonitor. 
                          Ask me about time tracking, screenshots, reports, or any feature!
                        </p>
                      </>
                    ) : (
                      <>
                        <MessageSquare className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                        <p className="text-zinc-500">No messages yet. Start the conversation!</p>
                      </>
                    )}
                  </div>
                )}

                {messages.map((msg) => (
                  <div
                    key={msg.message_id}
                    className={`flex gap-3 ${
                      msg.sender_type === 'user' || msg.user_id === user?.user_id ? 'flex-row-reverse' : ''
                    }`}
                  >
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      {msg.sender_type === 'ai' ? (
                        <AvatarFallback className="bg-purple-500/20 text-purple-400">
                          <Bot className="w-4 h-4" />
                        </AvatarFallback>
                      ) : (
                        <AvatarFallback className="bg-zinc-700">
                          {getInitials(msg.sender_name || msg.user_name)}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className={`max-w-[70%] ${
                      msg.sender_type === 'user' || msg.user_id === user?.user_id ? 'items-end' : ''
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-zinc-300">
                          {msg.sender_name || msg.user_name || 'User'}
                        </span>
                        <span className="text-xs text-zinc-600">
                          {formatTime(msg.created_at)}
                        </span>
                      </div>
                      <div className={`rounded-lg px-4 py-2 ${
                        msg.sender_type === 'ai' 
                          ? 'bg-purple-500/10 border border-purple-500/30'
                          : msg.sender_type === 'user' || msg.user_id === user?.user_id
                          ? 'bg-emerald-500/10 border border-emerald-500/30'
                          : 'bg-zinc-800'
                      }`}>
                        <p className="text-sm text-zinc-300 whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-zinc-800">
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" size="icon" className="text-zinc-500">
                  <Paperclip className="w-4 h-4" />
                </Button>
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={aiMode ? "Ask me anything about WorkMonitor..." : "Type a message..."}
                  className="flex-1 bg-zinc-800 border-zinc-700"
                  disabled={sending}
                />
                <Button type="button" variant="ghost" size="icon" className="text-zinc-500">
                  <Smile className="w-4 h-4" />
                </Button>
                <Button 
                  type="submit" 
                  size="icon"
                  disabled={!newMessage.trim() || sending}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-zinc-500">Select a channel to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamChat;
