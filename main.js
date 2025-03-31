import { createThread, runAgent, fetchThreadState } from "./nearai/api.js";
import { setupWalletSelector } from "@near-wallet-selector/core";
import { setupMyNearWallet } from "@near-wallet-selector/my-near-wallet";
import { setupModal } from "@near-wallet-selector/modal-ui-js";
import { Buffer } from "buffer";
import {
  handleNearAILoginCallback,
  nearAIlogin,
  NEAR_AI_AUTH_OBJECT_STORAGE_KEY,
} from "./nearai/login.js";

window.Buffer = Buffer;

let walletSelector = null;
let walletSelectorModal = null;

const DEFAULT_AGENT_ID = "buildagents.near/chatbot/latest";
let chatInitialized = false;

async function initApp() {
  const navButton = document.getElementById("navButton");
  navButton.textContent = "Connect Wallet";

  const walletSelectorModules = [setupMyNearWallet()];

  try {
    const ledgerModule = (await import("@near-wallet-selector/ledger")).setupLedger;
    walletSelectorModules.push(ledgerModule());
  } catch (e) {
    console.warn("Not able to setup Ledger", e);
  }

  walletSelector = await setupWalletSelector({
    network: "mainnet",
    modules: walletSelectorModules
  });

  walletSelectorModal = setupModal(walletSelector, {
    contractId: localStorage.getItem("contractId") || "ai.near"
  });

  navButton.onclick = async () => {
    try {
      const isSignedIn = walletSelector.isSignedIn();
      if (isSignedIn) {
        const wallet = await walletSelector.wallet();
        await wallet.signOut();
      } else {
        walletSelectorModal.show();
      }
    } catch (error) {
      console.error("Wallet connection error:", error);
    }
  };

  handleNearAILoginCallback();

  walletSelector.store.observable.subscribe(async (state) => {
    const signedAccount = state?.accounts.find(acc => acc.active)?.accountId;
    updateNavigation(signedAccount);

    if (signedAccount) {
      try {
        const auth = localStorage.getItem(NEAR_AI_AUTH_OBJECT_STORAGE_KEY);
        if (!auth) {
          const wallet = await walletSelector.wallet();
          await nearAIlogin(wallet, "Login to NEAR AI");
        }

        if (!chatInitialized) {
          chatInitialized = true;
          await initializeChat();
        }
      } catch (error) {
        console.error("NEAR AI login error:", error);
      }
    }
  });

  const isSignedIn = walletSelector.isSignedIn();
  const auth = getAuthFromLocalStorage();

  if (isSignedIn && auth?.account_id && auth?.signature) {
    if (!chatInitialized) {
      chatInitialized = true;
      await initializeChat();
    }
  }
}

function updateNavigation(accountId) {
  const navButton = document.getElementById("navButton");

  if (accountId) {
    navButton.textContent = `Logout (${accountId})`;
  } else {
    navButton.textContent = "Connect Wallet";
  }
}

function getAuthFromLocalStorage() {
  try {
    const raw = localStorage.getItem(NEAR_AI_AUTH_OBJECT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.warn("Invalid auth object in localStorage", e);
    return {};
  }
}

async function initializeChat() {
  console.log("Initializing chat...");

  const chatSection = document.getElementById("chatSection");
  const loginSection = document.getElementById("loginSection");
  const messageInput = document.getElementById("messageInput");
  const sendButton = document.getElementById("sendMessageButton");
  const messagesContainer = document.getElementById("messages");

  if (chatSection && loginSection && messageInput && sendButton && messagesContainer) {
    loginSection.style.display = "none";
    chatSection.style.display = "block";

    try {
      const nearSignatureAuth = getAuthFromLocalStorage();

      if (!nearSignatureAuth.signature || !nearSignatureAuth.account_id || !nearSignatureAuth.public_key) {
        throw new Error("Incomplete authentication");
      }

      const newThread = await createThread(nearSignatureAuth);

      if (newThread && newThread.id) {
        window.currentThreadId = newThread.id;
        document.getElementById("currentAgent").textContent = DEFAULT_AGENT_ID;

        messagesContainer.innerHTML = "";

        messageInput.disabled = false;
        sendButton.disabled = false;
        messageInput.focus();
      } else {
        throw new Error("Failed to create thread");
      }
    } catch (error) {
      console.error("Chat initialization error:", error);

      if (messageInput) messageInput.disabled = true;
      if (sendButton) sendButton.disabled = true;

      const errorEl = document.createElement('div');
      errorEl.className = 'error-message';
      errorEl.textContent = `Failed to initialize chat: ${error.message}`;
      messagesContainer.appendChild(errorEl);
    }
  }
}

function extractAssistantMessageContent(threadState) {
  if (!Array.isArray(threadState) || threadState.length === 0) {
    console.error('Invalid thread state', threadState);
    return "No messages found";
  }

  const assistantMessages = threadState.filter(msg => msg.role === 'assistant');
  const latestAssistantMessage = assistantMessages[0];

  if (!latestAssistantMessage) {
    console.error('No assistant messages found');
    return "No assistant response available";
  }

  try {
    let content = latestAssistantMessage.content;

    if (typeof content === 'string') {
      try {
        content = JSON.parse(content);
      } catch (parseError) {
        console.error('Error parsing content string', parseError);
      }
    }

    if (Array.isArray(content)) {
      const textItem = content.find(item =>
        item.type === 'text' &&
        item.text &&
        item.text.value
      );

      if (textItem && textItem.text && textItem.text.value) {
        return textItem.text.value;
      }
    }

    if (typeof content === 'object' && content.text && content.text.value) {
      return content.text.value;
    }

    console.error('Could not extract message content', latestAssistantMessage);
    return JSON.stringify(content, null, 2);

  } catch (error) {
    console.error('Error extracting message content:', error);
    return `Error extracting content: ${error.message}`;
  }
}

async function sendMessage() {
  const messageInput = document.getElementById("messageInput");
  const messagesContainer = document.getElementById("messages");
  const sendButton = document.getElementById("sendMessageButton");
  const message = messageInput.value.trim();

  if (!message || !window.currentThreadId) return;

  console.log("Starting message with thread ID:", window.currentThreadId);

  try {
    messageInput.disabled = true;
    sendButton.disabled = true;

    const userMessageEl = document.createElement("div");
    userMessageEl.className = "message user-message";
    userMessageEl.innerHTML = `
      <div class="message-sender">You</div>
      <div class="message-content">${message}</div>
    `;
    messagesContainer.appendChild(userMessageEl);

    messageInput.value = "";
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    const typingIndicator = document.createElement("div");
    typingIndicator.className = "message assistant-message typing";
    typingIndicator.id = "typing-indicator";
    typingIndicator.innerHTML = `
      <div class="message-sender">Assistant</div>
      <div class="message-content">Typing<span class="dot-one">.</span><span class="dot-two">.</span><span class="dot-three">.</span></div>
    `;
    messagesContainer.appendChild(typingIndicator);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    const nearSignatureAuth = getAuthFromLocalStorage();

    await runAgent(nearSignatureAuth, DEFAULT_AGENT_ID, window.currentThreadId, message);

    let attempts = 0;
    const maxAttempts = 15;
    let delay = 1000;
    let threadState;

    while (attempts < maxAttempts) {
      attempts++;

      threadState = await fetchThreadState(nearSignatureAuth, window.currentThreadId);
      console.log(`Attempt ${attempts} - Thread state:`, threadState);

      console.group('Thread State Details');
      threadState.forEach((msg, index) => {
        console.log(`Message [${index}]:`, {
          role: msg.role,
          content: JSON.stringify(msg.content),
          contentType: typeof msg.content
        });
      });
      console.groupEnd();

      const indicator = document.getElementById("typing-indicator");
      if (indicator) {
        messagesContainer.removeChild(indicator);
      }

      const content = extractAssistantMessageContent(threadState);

      const assistantMessageEl = document.createElement("div");
      assistantMessageEl.className = "message assistant-message";
      assistantMessageEl.innerHTML = `
        <div class="message-sender">Assistant</div>
        <div class="message-content"></div>
      `;
      assistantMessageEl.querySelector('.message-content').textContent = content;
      messagesContainer.appendChild(assistantMessageEl);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;

      break;
    }

  } catch (error) {
    console.error("Message sending error:", error);

    const indicator = document.getElementById("typing-indicator");
    if (indicator) {
      messagesContainer.removeChild(indicator);
    }

    const errorEl = document.createElement('div');
    errorEl.className = 'error-message';
    errorEl.textContent = `Failed to send message: ${error.message}`;
    messagesContainer.appendChild(errorEl);
  } finally {
    messageInput.disabled = false;
    sendButton.disabled = false;
    messageInput.focus();
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await initApp();

  const sendButton = document.getElementById("sendMessageButton");
  const messageInput = document.getElementById("messageInput");

  if (sendButton && messageInput) {
    sendButton.addEventListener("click", sendMessage);
    messageInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }
});
