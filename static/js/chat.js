// Chat functionality for RM Assistant
class ChatManager {
  constructor() {
    this.chatContainer = document.getElementById('chat-container');
    this.userInput = document.getElementById('user-input');
    this.sendBtn = document.getElementById('send-btn');
    this.categorySelect = document.getElementById('category-select');
    this.conversationsList = document.getElementById('conversations-list');
    this.welcomeMessage = document.getElementById('welcome-message');
    
    this.userMessageTemplate = document.getElementById('user-message-template');
    this.botMessageTemplate = document.getElementById('bot-message-template');
    this.loadingTemplate = document.getElementById('loading-template');
    
    this.currentCategory = 'general';
    this.markdownParser = window.markdownit({
      highlight: function(code, language) {
        if (language && hljs.getLanguage(language)) {
          try {
            return hljs.highlight(code, { language }).value;
          } catch (error) {}
        }
        return hljs.highlightAuto(code).value;
      },
      linkify: true,
      breaks: true
    });
    
    this.isProcessing = false;
    
    this.initialize();
  }
  
  async initialize() {
    // Check for category in URL
    const urlParams = new URLSearchParams(window.location.search);
    const categoryParam = urlParams.get('category');
    if (categoryParam && ['general', 'math', 'coding', 'philosophy'].includes(categoryParam)) {
      this.currentCategory = categoryParam;
    } else {
      // Check local storage for previously selected category
      const storedCategory = localStorage.getItem('selectedCategory');
      if (storedCategory) {
        this.currentCategory = storedCategory;
      }
    }
    
    // Set the category selector
    this.categorySelect.value = this.currentCategory;
    
    // Load available categories
    await this.loadCategories();
    
    // Load chat history if available
    await this.loadChatHistory();
    
    // Load conversation list
    await this.loadConversations();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Initialize UI state
    this.updateUIState();
  }
  
  async loadCategories() {
    try {
      // Update current category on select change
      this.categorySelect.addEventListener('change', () => {
        this.currentCategory = this.categorySelect.value;
        localStorage.setItem('selectedCategory', this.currentCategory);
        this.updateUIForCategory(this.currentCategory);
      });
      
      // Initialize UI with current category
      this.updateUIForCategory(this.currentCategory);
    } catch (error) {
      console.error('Failed to set up categories:', error);
    }
  }
  
  updateUIForCategory(category) {
    // Remove all category classes
    document.body.classList.remove('category-general', 'category-math', 'category-coding', 'category-philosophy');
    
    // Add the current category class
    document.body.classList.add(`category-${category}`);
    
    // Update input placeholder based on category
    const categoryName = apiService.getCategoryName(category);
    this.userInput.placeholder = `Ask the ${categoryName || 'Assistant'}...`;
    
    // Update icon in chat header
    const categoryIcon = this.getCategoryIcon(category);
    const iconElement = document.querySelector('.category-selector label i');
    if (iconElement) {
      iconElement.className = categoryIcon;
    }
  }
  
  getCategoryIcon(category) {
    switch(category) {
      case 'math': return 'fas fa-calculator';
      case 'coding': return 'fas fa-code';
      case 'philosophy': return 'fas fa-brain';
      default: return 'fas fa-robot';
    }
  }
  
  async loadChatHistory() {
    try {
      const chatHistory = await apiService.getChatHistory();
      
      if (chatHistory.messages && chatHistory.messages.length > 0) {
        // Hide welcome message
        this.welcomeMessage.style.display = 'none';
        
        // Set current category if available
        if (chatHistory.category) {
          this.currentCategory = chatHistory.category;
          this.categorySelect.value = this.currentCategory;
          this.updateUIForCategory(this.currentCategory);
        }
        
        // Display messages
        chatHistory.messages.forEach(message => {
          if (message.role === 'user') {
            this.addUserMessage(message.content);
          } else {
            this.addBotMessage(message.content, message.category || this.currentCategory);
          }
        });
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  }
  
  async loadConversations() {
    try {
      const conversations = await apiService.getAllChats();
      
      // Clear list
      this.conversationsList.innerHTML = '';
      
      // Add conversations to list
      conversations.forEach(chat => {
        const li = document.createElement('li');
        li.className = 'conversation-item';
        if (chat.id === apiService.sessionId) {
          li.classList.add('active');
        }
        
        // Get the icon for this conversation's category
        const categoryIcon = this.getCategoryIcon(chat.category || 'general');
        
        li.innerHTML = `
          <div class="conversation-title">
            <i class="${categoryIcon}"></i> ${chat.title}
          </div>
          <div class="conversation-meta">
            ${apiService.getCategoryName(chat.category || 'general') || "Assistant"}
          </div>
          <button class="delete-chat-btn" data-id="${chat.id}">
            <i class="fas fa-trash"></i>
          </button>
        `;
        
        // Add click event to switch to this chat
        li.addEventListener('click', (e) => {
          if (!e.target.closest('.delete-chat-btn')) {
            this.switchConversation(chat.id);
          }
        });
        
        // Add delete button event
        const deleteBtn = li.querySelector('.delete-chat-btn');
        deleteBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          await this.deleteConversation(chat.id);
        });
        
        this.conversationsList.appendChild(li);
      });
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  }
  
  setupEventListeners() {
    // Send button click
    this.sendBtn.addEventListener('click', () => {
      this.sendMessage();
    });
    
    // Enter key in textarea
    this.userInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
    
    // Auto-resize textarea
    this.userInput.addEventListener('input', () => {
      this.userInput.style.height = 'auto';
      this.userInput.style.height = Math.min(120, this.userInput.scrollHeight) + 'px';
      this.updateUIState();
    });
    
    // New chat button
    document.getElementById('new-chat-btn').addEventListener('click', async () => {
      await this.startNewChat();
    });
  }
  
  updateUIState() {
    // Enable/disable send button based on input
    this.sendBtn.disabled = this.userInput.value.trim() === '' || this.isProcessing;
    
    // Adjust input container based on processing state
    if (this.isProcessing) {
      this.userInput.setAttribute('disabled', 'disabled');
    } else {
      this.userInput.removeAttribute('disabled');
      this.userInput.focus();
    }
  }
  
  addUserMessage(message) {
    // Clone template
    const messageNode = this.userMessageTemplate.content.cloneNode(true);
    const messageElement = messageNode.querySelector('.message');
    const messageText = messageNode.querySelector('.message-text');
    
    // Set message content
    messageText.textContent = message;
    
    // Add to chat container
    this.chatContainer.appendChild(messageNode);
    
    // Scroll to bottom
    this.scrollToBottom();
  }
  
  addBotMessage(message, category = 'general') {
    // Remove loading indicator if exists
    const loadingIndicator = document.querySelector('.message.loading');
    if (loadingIndicator) {
      loadingIndicator.remove();
    }
    
    // Clone template
    const messageNode = this.botMessageTemplate.content.cloneNode(true);
    const messageElement = messageNode.querySelector('.message');
    const messageAvatar = messageNode.querySelector('.message-avatar i');
    const messageText = messageNode.querySelector('.message-text');
    const messageSource = messageNode.querySelector('.message-source');
    
    // Add category-specific class
    messageElement.classList.add(`category-${category}`);
    
    // Set category-specific icon
    messageAvatar.className = this.getCategoryIcon(category);
    
    // Process markdown
    messageText.innerHTML = this.markdownParser.render(message);
    
    // Hide sources section (not used in this version)
    messageSource.style.display = 'none';
    
    // Add to chat container
    this.chatContainer.appendChild(messageNode);
    
    // Initialize code highlighting
    document.querySelectorAll('pre code').forEach((block) => {
      hljs.highlightElement(block);
    });
    
    // Scroll to bottom
    this.scrollToBottom();
  }
  
  addLoadingIndicator() {
    // Clone template
    const loadingNode = this.loadingTemplate.content.cloneNode(true);
    const loadingElement = loadingNode.querySelector('.message');
    const loadingAvatar = loadingNode.querySelector('.message-avatar i');
    
    // Add category-specific class
    loadingElement.classList.add(`category-${this.currentCategory}`);
    
    // Set category-specific icon
    loadingAvatar.className = this.getCategoryIcon(this.currentCategory);
    
    // Add to chat container
    this.chatContainer.appendChild(loadingNode);
    
    // Scroll to bottom
    this.scrollToBottom();
  }
  
  scrollToBottom() {
    this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
  }
  
  async sendMessage() {
    const message = this.userInput.value.trim();
    if (message === '' || this.isProcessing) return;
    
    // Update UI
    this.isProcessing = true;
    this.updateUIState();
    
    // Add user message to UI
    this.addUserMessage(message);
    
    // Clear input
    this.userInput.value = '';
    this.userInput.style.height = 'auto';
    
    // Add loading indicator
    this.addLoadingIndicator();
    
    try {
      // Send message to API
      const response = await apiService.sendMessage(
        message, 
        this.currentCategory
      );
      
      // Add bot response to UI
      this.addBotMessage(
        response.message.content, 
        response.message.category || this.currentCategory
      );
      
      // Reload conversations list (in case this was a new chat)
      await this.loadConversations();
    } catch (error) {
      console.error('Failed to send message:', error);
      this.addBotMessage(`I'm sorry, but I encountered an error while processing your request. Please try again later.`);
    } finally {
      // Update UI state
      this.isProcessing = false;
      this.updateUIState();
    }
  }
  
  async startNewChat() {
    try {
      // Create new chat with current category
      await apiService.createNewChat(this.currentCategory);
      
      // Clear chat container
      this.chatContainer.innerHTML = '';
      
      // Show welcome message
      this.welcomeMessage.style.display = 'block';
      
      // Reset input
      this.userInput.value = '';
      this.userInput.style.height = 'auto';
      
      // Reload conversations list
      await this.loadConversations();
      
      // Update UI state
      this.isProcessing = false;
      this.updateUIState();
    } catch (error) {
      console.error('Failed to start new chat:', error);
    }
  }
  
  async switchConversation(chatId) {
    try {
      // Switch to selected chat
      apiService.switchChat(chatId);
      
      // Clear chat container
      this.chatContainer.innerHTML = '';
      
      // Hide welcome message
      this.welcomeMessage.style.display = 'none';
      
      // Load chat history
      await this.loadChatHistory();
      
      // Reload conversations list
      await this.loadConversations();
      
      // Update UI state
      this.isProcessing = false;
      this.updateUIState();
    } catch (error) {
      console.error('Failed to switch conversation:', error);
    }
  }
  
  async deleteConversation(chatId) {
    if (!confirm('Are you sure you want to delete this conversation?')) {
      return;
    }
    
    try {
      // Delete chat
      await apiService.deleteChat(chatId);
      
      // Check if current chat was deleted
      if (chatId === apiService.sessionId) {
        // Clear chat container
        this.chatContainer.innerHTML = '';
        
        // Show welcome message
        this.welcomeMessage.style.display = 'block';
      }
      
      // Reload conversations list
      await this.loadConversations();
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  }
}

// Initialize chat manager
const chatManager = new ChatManager();
