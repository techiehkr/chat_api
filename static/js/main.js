// Main initialization script for RM Assistant
document.addEventListener('DOMContentLoaded', () => {
  // Auto-resize the textarea on load
  const userInput = document.getElementById('user-input');
  if (userInput) {
    userInput.style.height = 'auto';
    userInput.style.height = Math.min(120, userInput.scrollHeight) + 'px';
    
    // Focus the input field on load
    userInput.focus();
  }
  
  // Check for dark mode preference
  const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.body.classList.toggle('dark-mode', prefersDarkMode);
  
  // Set up mobile menu toggle if needed
  const menuToggle = document.querySelector('.menu-toggle');
  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      document.querySelector('.sidebar').classList.toggle('open');
    });
  }
  
  // Initialize tooltips if any
  const tooltips = document.querySelectorAll('[data-tooltip]');
  tooltips.forEach(tooltip => {
    tooltip.addEventListener('mouseenter', (e) => {
      const tooltipText = e.target.getAttribute('data-tooltip');
      const tooltipEl = document.createElement('div');
      tooltipEl.className = 'tooltip';
      tooltipEl.textContent = tooltipText;
      document.body.appendChild(tooltipEl);
      
      const rect = e.target.getBoundingClientRect();
      tooltipEl.style.top = `${rect.top - tooltipEl.offsetHeight - 10}px`;
      tooltipEl.style.left = `${rect.left + (rect.width / 2) - (tooltipEl.offsetWidth / 2)}px`;
      
      e.target.addEventListener('mouseleave', () => {
        tooltipEl.remove();
      }, { once: true });
    });
  });
  
  // Logo click should go to homepage
  const logo = document.querySelector('.app-title');
  if (logo) {
    logo.addEventListener('click', () => {
      window.location.href = '/';
    });
  }
  
  // Enhanced category URL parameter handling
  if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
    const urlParams = new URLSearchParams(window.location.search);
    const categoryParam = urlParams.get('category');
    
    if (categoryParam && ['general', 'math', 'coding', 'philosophy'].includes(categoryParam)) {
      // If we have a valid category in URL, update select element
      const categorySelect = document.getElementById('category-select');
      if (categorySelect) {
        categorySelect.value = categoryParam;
        
        // Trigger change event to update UI
        const event = new Event('change');
        categorySelect.dispatchEvent(event);
      }
    }
  }
  
  // Check for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    document.body.classList.toggle('dark-mode', e.matches);
  });
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    // When page becomes visible again, refresh conversations list
    if (typeof chatManager !== 'undefined') {
      chatManager.loadConversations().catch(err => {
        console.error('Failed to refresh conversations:', err);
      });
    }
  }
});

// Enhance keyboard navigation
document.addEventListener('keydown', (e) => {
  // Implement keyboard shortcuts
  if (e.ctrlKey && e.key === '/') {
    // Focus on input
    const userInput = document.getElementById('user-input');
    if (userInput) {
      e.preventDefault();
      userInput.focus();
    }
  }
  
  if (e.ctrlKey && e.key === 'n') {
    // New chat
    const newChatBtn = document.getElementById('new-chat-btn');
    if (newChatBtn) {
      e.preventDefault();
      newChatBtn.click();
    }
  }
});

// Add category-specific styles dynamically
const addCategoryStyles = () => {
  // These styles complement what's already in the CSS file
  const styleEl = document.createElement('style');
  styleEl.innerHTML = `
    /* Category-specific hover effects for conversation items */
    .conversation-item:hover.category-general {
      border-left: 3px solid var(--general-color);
    }
    
    .conversation-item:hover.category-math {
      border-left: 3px solid var(--math-color);
    }
    
    .conversation-item:hover.category-coding {
      border-left: 3px solid var(--coding-color);
    }
    
    .conversation-item:hover.category-philosophy {
      border-left: 3px solid var(--philosophy-color);
    }
    
    /* Category-specific active states */
    body.category-general .new-chat-btn {
      background-color: var(--general-color);
    }
    
    body.category-math .new-chat-btn {
      background-color: var(--math-color);
    }
    
    body.category-coding .new-chat-btn {
      background-color: var(--coding-color);
    }
    
    body.category-philosophy .new-chat-btn {
      background-color: var(--philosophy-color);
    }
    
    /* Category-specific label colors */
    body.category-general .category-selector label i {
      color: var(--general-color);
    }
    
    body.category-math .category-selector label i {
      color: var(--math-color);
    }
    
    body.category-coding .category-selector label i {
      color: var(--coding-color);
    }
    
    body.category-philosophy .category-selector label i {
      color: var(--philosophy-color);
    }
  `;
  document.head.appendChild(styleEl);
};

// Add loading state animation for send button
const enhanceSendButton = () => {
  const sendBtn = document.getElementById('send-btn');
  if (sendBtn) {
    const originalHTML = sendBtn.innerHTML;
    
    // Create a loading animation
    const setLoading = (isLoading) => {
      if (isLoading) {
        sendBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i>';
        sendBtn.setAttribute('disabled', 'disabled');
      } else {
        sendBtn.innerHTML = originalHTML;
        sendBtn.removeAttribute('disabled');
      }
    };
    
    // Add to window so chat.js can access it
    window.setSendButtonLoading = setLoading;
  }
};

// Add the styles and enhancements when the page loads
document.addEventListener('DOMContentLoaded', () => {
  addCategoryStyles();
  enhanceSendButton();
});