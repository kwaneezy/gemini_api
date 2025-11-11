// Grab button and response container
const btn = document.getElementById('submit');
const geminiResponseContainer = document.getElementById('geminiResponse');

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

  // Clear the input immediately
  inputText.value = '';

  // Show loading state
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'message assistant loading-message';
  loadingDiv.innerHTML = '<div class="message-content"><em style="color: #6b7280;">Thinking...</em></div>';
  geminiResponseContainer.appendChild(loadingDiv);
  geminiResponseContainer.scrollTop = geminiResponseContainer.scrollHeight;

  try {
    // Send the query to your backend /gemini endpoint
    const response = await fetch('/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userQuery }),
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

    // Display Gemini's response
    addMessage(text, 'assistant');

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

// Optional: Allow Enter key to send (Shift+Enter for new line)
document.getElementById('userInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    btn.click();
  }
});