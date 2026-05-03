import { marked } from 'https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js';

let selectedDoor = null;
let totalTokens = 0;
const chatContainer1 = document.getElementById('chatContainer1');
const chatContainer2 = document.getElementById('chatContainer2');
const statusMessage = document.getElementById('statusMessage');
const selectedDoorText = document.getElementById('selectedDoorText');
const totalTokensDisplay = document.getElementById('totalTokens');
const messageInput = document.getElementById('messageInput');
const confirmButton = document.getElementById('confirmButton');
const restartButton = document.getElementById('restartButton');

function setStatus(text, isError = false) {
  statusMessage.textContent = text;
  statusMessage.classList.toggle('text-red-600', isError);
  statusMessage.classList.toggle('text-gray-700', !isError);
}

function updateSelectedDoorText() {
  selectedDoorText.textContent = selectedDoor ? `Selected door ${selectedDoor}.` : 'No door selected yet.';
}

function clearDoorSelection() {
  selectedDoor = null;
  updateSelectedDoorText();
  for (let i = 1; i <= 5; i += 1) {
    document.getElementById(`door${i}`).classList.remove('ring-4', 'ring-yellow-400');
  }
}

function clearChat() {
  chatContainer1.innerHTML = '';
  chatContainer2.innerHTML = '';
}

function selectDoor(doorId) {
  clearDoorSelection();
  selectedDoor = doorId;
  updateSelectedDoorText();
  const doorEl = document.getElementById(`door${doorId}`);
  doorEl.classList.add('ring-4', 'ring-yellow-400');
  setStatus(`Door ${doorId} selected. Confirm your guess or keep asking the guards.`);
}

async function restartGame() {
  setStatus('Starting a new game...');
  clearChat();
  clearDoorSelection();
  totalTokens = 0;
  totalTokensDisplay.textContent = totalTokens;

  try {
    await fetch('/api/reset', { method: 'POST' });
    setStatus('New game started. Ask a guard about the correct door location.');
  } catch (error) {
    console.error(error);
    setStatus('Unable to start a new game. Please refresh the page.', true);
  }
}

async function sendMessage(guardId) {
  const message = messageInput.value.trim();
  if (!message) {
    setStatus('Type a question before sending it to a guard.', true);
    return;
  }

  document.getElementById('sendButton1').disabled = true;
  document.getElementById('sendButton2').disabled = true;

  const chatContainer = guardId === 1 ? chatContainer1 : chatContainer2;
  const userMessageElement = createUserChatElement(message);
  chatContainer.appendChild(userMessageElement);

  const loadingResponseElement = document.createElement('div');
  loadingResponseElement.classList.add('bg-gray-100', 'text-gray-800', 'p-2', 'rounded', 'mb-2', 'text-right');
  loadingResponseElement.textContent = 'Loading...';
  chatContainer.appendChild(loadingResponseElement);

  setStatus(`Asking Guard ${guardId}...`);

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, guardId })
    });
    const data = await response.json();

    chatContainer.removeChild(loadingResponseElement);
    const responseMessageElement = createResponseChatElement(data.response, data.tokens);
    chatContainer.appendChild(responseMessageElement);

    if (data.totalTokens !== undefined) {
      totalTokens = data.totalTokens;
      totalTokensDisplay.textContent = totalTokens;
    }

    setStatus(`Guard ${guardId} replied. You can keep asking or select a door.`);
  } catch (error) {
    console.error(error);
    chatContainer.removeChild(loadingResponseElement);
    setStatus('There was an error contacting the guard. Try again.', true);
  } finally {
    messageInput.value = '';
    document.getElementById('sendButton1').disabled = false;
    document.getElementById('sendButton2').disabled = false;
  }
}

function createUserChatElement(message, tokens) {
  const messageElement = document.createElement('div');
  messageElement.classList.add('bg-blue-100', 'text-blue-800', 'p-2', 'rounded', 'mb-2', 'text-left');
  messageElement.textContent = `${message}` + (tokens ? ` (Tokens used: ${tokens})` : '');
  return messageElement;
}

function createResponseChatElement(response, tokens) {
  const responseElement = document.createElement('div');
  responseElement.classList.add('bg-green-100', 'text-green-800', 'p-2', 'rounded', 'mb-2', 'text-right');
  responseElement.innerHTML = marked.parse(response) + (tokens ? ` <small>(Tokens used: ${tokens})</small>` : '');
  return responseElement;
}

async function confirmGuess() {
  if (!selectedDoor) {
    setStatus('Select a door before confirming your guess.', true);
    return;
  }

  confirmButton.disabled = true;
  setStatus(`Submitting guess for door ${selectedDoor}...`);

  try {
    const response = await fetch('/api/guess', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ door: selectedDoor })
    });
    const data = await response.json();
    clearChat();
    clearDoorSelection();
    setStatus(data.message);
  } catch (error) {
    console.error(error);
    setStatus('Could not submit your guess. Please try again.', true);
  } finally {
    confirmButton.disabled = false;
  }
}

for (let i = 1; i <= 5; i += 1) {
  document.getElementById(`door${i}`).addEventListener('click', () => selectDoor(i));
}

document.getElementById('sendButton1').addEventListener('click', () => sendMessage(1));
document.getElementById('sendButton2').addEventListener('click', () => sendMessage(2));
confirmButton.addEventListener('click', confirmGuess);
restartButton.addEventListener('click', restartGame);

restartGame();