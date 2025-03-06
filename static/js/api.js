// API service for RM Assistant
const API_URL = window.location.origin;

class ApiService {
  constructor() {
    this.sessionId = localStorage.getItem('currentSessionId') || null;
    this.categoryDetails = {};
    this.loadCategories();
  }

  // Load available categories
  async loadCategories() {
    try {
      const response = await fetch(`${API_URL}/api/categories`);
      if (!response.ok) throw new Error('Failed to fetch categories');
      const data = await response.json();
      this.categoryDetails = data.details || {};
      return data;
    } catch (error) {
      console.error('Error fetching categories:', error);
      return {
        categories: ["general", "math", "coding", "philosophy"],
        details: {
          "general": { name: "General Assistant" },
          "math": { name: "Math Expert" },
          "coding": { name: "Code Assistant" },
          "philosophy": { name: "Deep Thinker" }
        }
      };
    }
  }

  // Create a new chat session
  async createNewChat(category = 'general') {
    try {
      const response = await fetch(`${API_URL}/api/chat/new`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ category })
      });
      
      if (!response.ok) throw new Error('Failed to create new chat');
      
      const data = await response.json();
      this.sessionId = data.session_id;
      localStorage.setItem('currentSessionId', this.sessionId);
      return data;
    } catch (error) {
      console.error('Error creating new chat:', error);
      throw error;
    }
  }

  // Send a message to the AI
  async sendMessage(message, category = 'general') {
    try {
      // Make sure we have a session
      if (!this.sessionId) {
        await this.createNewChat(category);
      }
      
      const response = await fetch(`${API_URL}/api/chat/${this.sessionId}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message,
          category
        })
      });
      
      if (!response.ok) throw new Error('Failed to send message');
      
      return await response.json();
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  // Get chat history
  async getChatHistory() {
    if (!this.sessionId) return { messages: [] };
    
    try {
      const response = await fetch(`${API_URL}/api/chat/${this.sessionId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          // Session not found, create a new one
          localStorage.removeItem('currentSessionId');
          this.sessionId = null;
          return { messages: [] };
        }
        throw new Error('Failed to fetch chat history');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching chat history:', error);
      return { messages: [] };
    }
  }

  // Get all chats
  async getAllChats() {
    try {
      const response = await fetch(`${API_URL}/api/chats`);
      
      if (!response.ok) throw new Error('Failed to fetch chats');
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching all chats:', error);
      return [];
    }
  }

  // Delete a chat
  async deleteChat(chatId) {
    try {
      const response = await fetch(`${API_URL}/api/chat/${chatId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete chat');
      
      if (this.sessionId === chatId) {
        localStorage.removeItem('currentSessionId');
        this.sessionId = null;
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error deleting chat:', error);
      throw error;
    }
  }

  // Switch to a different chat
  switchChat(chatId) {
    this.sessionId = chatId;
    localStorage.setItem('currentSessionId', chatId);
  }
  
  // Get category name by id
  getCategoryName(categoryId) {
    return this.categoryDetails[categoryId]?.name || "Assistant";
  }
}

// Export the API service
const apiService = new ApiService();
