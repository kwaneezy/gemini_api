// Grab button and response container
const btn = document.getElementById('submit');
const geminiResponseContainer = document.getElementById('geminiResponse');

// Conversation history stack - stored in memory
let conversationHistory = [];

// Current user information
let currentUser = null;

// Initialize Google Sign-In when the page loads
window.onload = function() {
  // Check if Google Sign-In library loaded successfully
  if (typeof google !== 'undefined' && google.accounts) {
    try {
      google.accounts.id.initialize({
        client_id: '1012442382121-q24vag68db02t9nocjh1pns4kkhs3uga.apps.googleusercontent.com',
        callback: handleCredentialResponse
      });
      
      google.accounts.id.renderButton(
        document.getElementById('google-signin-button'),
        { 
          theme: 'filled_blue', 
          size: 'medium',
          text: 'signin_with',
          shape: 'rectangular'
        }
      );
      
      // Check if user is already signed in (optional - for auto sign-in)
      google.accounts.id.prompt();
    } catch (error) {
      console.warn('Google Sign-In not configured:', error);
      document.getElementById('auth-container').innerHTML = '<span style="color: #6b7280; font-size: 12px;">Sign-In not configured</span>';
    }
  } else {
    console.warn('Google Sign-In library not loaded');
    document.getElementById('auth-container').innerHTML = '<span style="color: #6b7280; font-size: 12px;">Sign-In unavailable</span>';
  }
};

// Handle successful Google Sign-In
function handleCredentialResponse(response) {
  try {
    // Decode the JWT token to get user info
    const userObject = parseJwt(response.credential);
    
    currentUser = {
      id: userObject.sub,
      email: userObject.email,
      name: userObject.name,
      picture: userObject.picture
    };
    
    console.log('Signed in as:', currentUser);
    
    // Update UI to show user info
    document.getElementById('google-signin-button').style.display = 'none';
    document.getElementById('user-info').style.display = 'flex';
    document.getElementById('user-avatar').src = currentUser.picture;
    document.getElementById('user-name').textContent = currentUser.name;
    
    // Load user's conversation history from server
    loadUserConversationHistory();
  } catch (error) {
    console.error('Error handling sign-in:', error);
  }
}

// Parse JWT token to extract user info
function parseJwt(token) {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));
  return JSON.parse(jsonPayload);
}

// Sign out function
const signoutButton = document.getElementById('signout-button');
if (signoutButton) {
  signoutButton.addEventListener('click', () => {
    if (typeof google !== 'undefined' && google.accounts) {
      google.accounts.id.disableAutoSelect();
    }
    currentUser = null;
    conversationHistory = [];
    
    // Clear UI
    document.getElementById('google-signin-button').style.display = 'block';
    document.getElementById('user-info').style.display = 'none';
    geminiResponseContainer.innerHTML = '';
    
    console.log('Signed out');
  });
}

// Load user's conversation history from server
async function loadUserConversationHistory() {
  if (!currentUser) return;
  
  try {
    const response = await fetch('/load-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id })
    });
    
    if (response.ok) {
      const data = await response.json();
      conversationHistory = data.history || [];
      
      // Display loaded conversation
      if (data.history && data.history.length > 0) {
        data.history.forEach(msg => {
          if (msg.role === 'user') {
            addMessage(msg.parts[0].text, 'user');
          } else if (msg.role === 'model') {
            addMessage(msg.parts[0].text, 'assistant');
          }
        });
        console.log(`Loaded ${data.history.length} messages from history`);
      }
    }
  } catch (error) {
    console.error('Error loading history:', error);
  }
}

// Save conversation history to server
async function saveConversationHistory() {
  if (!currentUser) return;
  
  try {
    await fetch('/save-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        userId: currentUser.id,
        history: conversationHistory 
      })
    });
  } catch (error) {
    console.error('Error saving history:', error);
  }
}

// Function to format Gemini's response to be human-readable
function formatGeminiResponse(text) {
  // Split into paragraphs (double line breaks)
  let formatted = text
    // Convert markdown-style bold **text** to HTML
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Convert markdown-style italic *text* to HTML
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Convert markdown-style code `code` to HTML
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Convert numbered lists
    .replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>')
    // Convert bullet points
    .replace(/^[\-\*]\s+(.+)$/gm, '<li>$1</li>')
    // Convert double line breaks to paragraph breaks
    .replace(/\n\n+/g, '</p><p>')
    // Convert single line breaks to <br>
    .replace(/\n/g, '<br>');

  // Wrap in paragraph tags
  formatted = '<p>' + formatted + '</p>';

  // Wrap consecutive <li> items in <ul>
  formatted = formatted.replace(/(<li>.*?<\/li>)(\s*<li>.*?<\/li>)*/g, (match) => {
    return '<ul>' + match + '</ul>';
  });

  return formatted;
}

// Function to display a message (user or assistant)
function addMessage(content, type) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${type}`;
  
  if (type === 'user') {
    messageDiv.innerHTML = `<div class="message-content">${content}</div>`;
  } else {
    messageDiv.innerHTML = `<div class="message-content">${formatGeminiResponse(content)}</div>`;
  }
  
  geminiResponseContainer.appendChild(messageDiv);
  
  // Scroll to bottom
  geminiResponseContainer.scrollTop = geminiResponseContainer.scrollHeight;
}

// Run when the user clicks "Send to Gemini!"
btn.addEventListener('click', async () => {
  const inputText = document.getElementById('userInput');
  const userQuery = inputText.value.trim();
  console.log("User query:", userQuery);

  // Prevent empty requests
  if (!userQuery) {
    alert("Please type something before sending!");
    return;
  }

  // Display user's question
  addMessage(userQuery, 'user');

  // Add user message to conversation history
  conversationHistory.push({
    role: 'user',
    parts: [{ text: userQuery }]
  });

  // Clear the input immediately
  inputText.value = '';

  // Show loading state
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'message assistant loading-message';
  loadingDiv.innerHTML = '<div class="message-content"><em style="color: #6b7280;">Thinking...</em></div>';
  geminiResponseContainer.appendChild(loadingDiv);
  geminiResponseContainer.scrollTop = geminiResponseContainer.scrollHeight;

  try {
    // Send the query AND conversation history to your backend /gemini endpoint
    const response = await fetch('/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        userQuery,
        conversationHistory // Send the entire conversation history
      }),
    });

    // Remove loading message
    loadingDiv.remove();

    // Check for HTTP errors
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server responded ${response.status}: ${errorText}`);
    }

    // Read server reply (backend sends plain text)
    const text = await response.text();

    // Check if response is empty or just whitespace
    if (!text || text.trim() === '') {
      throw new Error('Received empty response from server');
    }

    // Add assistant response to conversation history
    conversationHistory.push({
      role: 'model',
      parts: [{ text: text }]
    });

    // Display Gemini's response
    addMessage(text, 'assistant');

    // Save conversation history to server if user is logged in
    if (currentUser) {
      saveConversationHistory();
    }

  } catch (error) {
    // Remove loading message if still there
    if (loadingDiv.parentNode) {
      loadingDiv.remove();
    }
    
    // Catch and display any network / parsing errors
    console.error('Error during fetch:', error);
    const errorDiv = document.createElement('div');
    errorDiv.className = 'message assistant error-message';
    errorDiv.innerHTML = `<div class="message-content" style="color: #ef4444;"><strong>Error:</strong> ${error.message}</div>`;
    geminiResponseContainer.appendChild(errorDiv);
  }
});

// Allow Enter key to send (Shift+Enter for new line)
const userInput = document.getElementById('userInput');
if (userInput) {
  userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      btn.click();
    }
  });
}