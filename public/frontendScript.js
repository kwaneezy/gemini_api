// Grab button and response container
const btn = document.getElementById('submit');
const geminiResponseContainer = document.getElementById('geminiResponse');

// Run when the user clicks “Send to Gemini!”
btn.addEventListener('click', async () => {
  const inputText = document.getElementById('userInput');
  const userQuery = inputText.value.trim();        // 1️⃣ get user input text
  console.log("User query:", userQuery);

  // 2️⃣ prevent empty requests
  if (!userQuery) {
    alert("Please type something before sending!");
    return;
  }

  try {
    // 3️⃣ send the query to your backend /gemini endpoint
    const response = await fetch('/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userQuery }),          // must be {userQuery:<text>}
    });

    // 4️⃣ check for HTTP errors (like 500)
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server responded ${response.status}: ${errorText}`);
    }

    // 5️⃣ read server reply (backend sends plain text)
    const text = await response.text();

    // 6️⃣ show Gemini’s reply on page
    geminiResponseContainer.textContent = text;

  } catch (error) {
    // 7️⃣ catch and display any network / parsing errors
    console.error('Error during fetch:', error);
    alert('Error: ' + error.message);
  }
});
