import { setupWalletSelector } from "@near-wallet-selector/core";
import { setupMyNearWallet } from "@near-wallet-selector/my-near-wallet";
import { setupModal } from "@near-wallet-selector/modal-ui-js";
import { Buffer } from "buffer";
import { InMemorySigner, keyStores } from "near-api-js";

window.Buffer = Buffer;

let walletSelector;
let connectedAccount = null;

async function initializeWallet() {
  try {
    const walletSelectorModules = [setupMyNearWallet()];

    walletSelector = await setupWalletSelector({
      network: "mainnet",
      modules: walletSelectorModules,
    });

    window.walletSelector = walletSelector;

    const modal = setupModal(walletSelector, {
      contractId: "webforge.near",
      description: "Please connect your wallet to create Web4 pages",
      theme: "light"
    });

    document.getElementById("connectWallet").addEventListener("click", () => {
      modal.show();
    });

    walletSelector.on("signedIn", handleSignedIn);
    walletSelector.on("signedOut", handleSignedOut);

    if (walletSelector.isSignedIn()) {
      await handleSignedIn();
    } else {
      handleSignedOut();
    }

    console.log("Wallet initialization complete");
  } catch (error) {
    console.error("Failed to initialize wallet selector:", error);
    document.getElementById("status").innerText = "Failed to initialize wallet: " + error.message;
  }
}

async function handleSignedIn() {
  try {
    const wallet = await walletSelector.wallet();
    const accounts = await wallet.getAccounts();

    if (accounts.length > 0) {
      connectedAccount = accounts[0].accountId;
      document.getElementById("accountInfo").innerText = "Connected as: " + connectedAccount;
      document.getElementById("createButton").disabled = false;
      console.log("Signed in with account:", connectedAccount);
    }
  } catch (error) {
    console.error("Error handling signed in state:", error);
  }
}

function handleSignedOut() {
  connectedAccount = null;
  document.getElementById("accountInfo").innerText = "❌ NOT CONNECTED";
  document.getElementById("createButton").disabled = true;
  console.log("Signed out");
}

function isValidAccountId(accountId) {
  const pattern = /^[a-z0-9-_]{2,}\.near$/;
  return pattern.test(accountId);
}

async function accountExists(accountId) {
  try {
    const wallet = await walletSelector.wallet();
    const provider = wallet.provider;

    await provider.query({
      request_type: "view_account",
      finality: "final",
      account_id: accountId
    });

    return true;
  } catch (error) {
    if (error.message && error.message.includes("does not exist")) {
      return false;
    }
    console.error("Error checking account existence:", error);
    return false;
  }
}

async function createWeb4Contract() {
  if (!connectedAccount) {
    document.getElementById("status").innerText = "Please connect your NEAR wallet first.";
    return;
  }

  const newAccountId = document.getElementById("accountInput").value.trim();

  if (!newAccountId) {
    document.getElementById("status").innerText = "Please enter a valid account ID.";
    return;
  }

  if (!isValidAccountId(newAccountId)) {
    document.getElementById("status").innerText = "Invalid account ID format. It should be lowercase letters, numbers, - or _, at least 2 characters, and end with .near";
    return;
  }

  document.getElementById("status").innerText = "Checking if account exists...";
  const exists = await accountExists(newAccountId);

  if (exists) {
    document.getElementById("status").innerText = "This account already exists. Please choose a different name.";
    return;
  }

  document.getElementById("status").innerText = "Creating Web4 contract...";

  try {
    const wallet = await walletSelector.wallet();

    // Create a browser local storage key store
    const keyStore = new keyStores.BrowserLocalStorageKeyStore();
    const signer = new InMemorySigner(keyStore);

    // Check for existing public key
    const existingPublicKey = await signer.getPublicKey(
      newAccountId,
      'mainnet'
    );

    if (existingPublicKey) {
      document.getElementById("status").innerText = `Cannot create account. Public key already exists: ${existingPublicKey.toString()}`;
      return;
    }

    // Create a new key
    const publicKey = await signer.createKey(newAccountId, 'mainnet');

    console.log("Creating Web4 contract with account ID:", newAccountId);
    console.log("Public Key:", publicKey.toString());

    const createResult = await wallet.signAndSendTransaction({
      receiverId: "web4factory.near",
      actions: [
        {
          type: "FunctionCall",
          params: {
            methodName: "create",
            args: { 
              new_account_id: newAccountId, 
              full_access_key: publicKey.toString()
            },
            gas: "300000000000000",
            deposit: "9000000000000000000000000",
          },
        },
      ],
    });

    console.log("Contract creation result:", createResult);

    if (createResult && createResult.status && createResult.status.SuccessValue !== undefined) {
      document.getElementById("status").innerHTML = `✅ Success! Your Web4 page has been created. Visit it at: 
        <a href="https://${newAccountId}.page" target="_blank">${newAccountId}.page</a>`;
    } else {
      document.getElementById("status").innerText = "Failed to create Web4 contract.";
    }
  } catch (error) {
    console.error("Contract creation error:", error);
    document.getElementById("status").innerText = `Error: ${error.message || "Failed to create contract"}`;
  }
}

document.getElementById("createButton").addEventListener("click", createWeb4Contract);

initializeWallet();