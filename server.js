import { callAssistant, resetGuards } from './chat.js'
import express from 'express'
import cors from 'cors';

const app = express()
app.use(cors());
app.use(express.json())

const gameState = {
  currentDoor: 1,
  truthGuardId: 1,
  totalTokens: 0
};

function getRandomDoor() {
  return Math.floor(Math.random() * 5) + 1;
}

function getRandomTruthGuardId() {
  return Math.random() < 0.5 ? 1 : 2;
}

function startNewGame() {
  gameState.currentDoor = getRandomDoor();
  gameState.truthGuardId = getRandomTruthGuardId();
  gameState.totalTokens = 0;
  resetGuards(gameState.currentDoor, gameState.truthGuardId);
  console.log(`New game started. Correct door=${gameState.currentDoor}, truth guard=${gameState.truthGuardId}`);
}

app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile("public/index.html", { root: "." });
});

app.post('/api/reset', (req, res) => {
  startNewGame();
  res.json({ message: 'Game reset' });
});

app.post('/api/chat', async (req, res) => {
  const { message, guardId } = req.body;
  if (![1, 2].includes(guardId)) {
    return res.status(400).json({ error: 'guardId must be 1 or 2' });
  }
  const response = await callAssistant(message, guardId);
  gameState.totalTokens += response.tokens;
  res.json({ ...response, totalTokens: gameState.totalTokens });
});

app.post('/api/guess', (req, res) => {
  const chosenDoor = Number(req.body.door);
  const correct = chosenDoor === gameState.currentDoor;
  const message = correct
    ? `Correct! You found the right door (${chosenDoor}). A new game has started.`
    : `Wrong. The correct door was door ${gameState.currentDoor}. A new game has started.`;
  startNewGame();
  res.json({ correct, message });
});

const port = process.env.EXPRESS_PORT || 3000;
startNewGame();
app.listen(port, () => console.log(`Server on http://localhost:${port}`))