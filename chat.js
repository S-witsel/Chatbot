import { AzureChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage, AIMessage } from '@langchain/core/messages';

const model = new AzureChatOpenAI();

let currentDoor = null;
let truthGuardId = null;
let messages1 = [];
let messages2 = [];

function makeSystemPrompt(guardId, truthful, correctDoor) {
  const truthText = truthful ? 'a truth-teller' : 'a liar';
  return [
    `You are Guard ${guardId}, a mysterious figure standing before five ancient doors in a dimly lit castle corridor.`,
    `The correct door is door ${correctDoor}.`,
    `One guard always tells the truth and the other always lies. You must not tell the player whether you are the truthful guard or the liar.`,
    `Answer only questions about the location of the correct door.`,
    `Do not directly say which door is correct.`,
    `If the player asks a location question such as "Is the correct door left of door 3?", answer with "Yes." or "No." only. Keep in mind whether you need to lie or be truthful in your answer.`,
    `If the player asks to directly identify the correct door, reply "I cannot directly tell you which door is correct."`,
    `If the question is not about the location of the correct door, reply "I only answer questions about the location of the correct door."`,
    `You are ${truthText}. Speak in a cryptic, medieval tone, as if guarding a secret treasure.`
  ].join(' ');
}

export function resetGuards(correctDoor, truthGuard) {
  currentDoor = correctDoor;
  truthGuardId = truthGuard;
  messages1 = [new SystemMessage(makeSystemPrompt(1, truthGuardId === 1, currentDoor))];
  messages2 = [new SystemMessage(makeSystemPrompt(2, truthGuardId === 2, currentDoor))];
}

export async function callAssistant(prompt, guardId) {
  let messages = guardId === 1 ? messages1 : messages2;
  const startingSystem = messages[0];

  if (messages.length > 30) {
    messages.push(new HumanMessage("The conversation is getting too long, please summarize the conversation so far in a few sentences."));
    const summaryResponse = await model.invoke(messages);
    messages = [startingSystem, new AIMessage(summaryResponse.content)];
    if (guardId === 1) messages1 = messages;
    else messages2 = messages;
  }

  messages.push(new HumanMessage(prompt));
  const result = await model.invoke(messages);
  messages.push(new AIMessage(result.content));

  if (guardId === 1) messages1 = messages;
  else messages2 = messages;

  console.log(result.content);
  console.log(`Tokens used: ${result.usage_metadata?.total_tokens}`);
  return {
    response: result.content,
    tokens: result?.usage_metadata.total_tokens ?? 0
  };
}