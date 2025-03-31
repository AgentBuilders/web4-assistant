const BASE_URL = "https://api.near.ai";

/**
 * @typedef {Object} NearAuthData
 * @property {any} message
 * @property {String} nonce
 * @property {string} recipient
 * @property {string} callback_url
 * @property {string} signature
 * @property {string} account_id
 * @property {string} public_key
 */

/**
 * Creates a new thread
 * @param {NearAuthData|null} auth - Authentication data
 * @returns {Promise<Object>} The newly created thread
 */
export const createThread = async (auth) => {
    const URL = `${BASE_URL}/v1/threads`;

    const headers = {
      Accept: "application/json",
      Authorization: `Bearer ${JSON.stringify(auth)}`,
      "Content-Type": "application/json",
    };

    const body = {
      metadata: {
        created_at: new Date().toISOString()
      }
    };

    try {
      const response = await fetch(URL, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Thread creation failed:", errorText);
        throw new Error(`Failed to create thread: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error creating thread:", error);
      throw error;
    }
  };

/**
 * Runs an agent on a thread with a message
 * @param {NearAuthData} auth - Authentication data
 * @param {string} agent - The agent ID
 * @param {string} thread - The thread ID
 * @param {string} message - The message to send
 * @param {Object} [options={}] - Additional options for running the agent
 * @returns {Promise<string>} The thread ID resulting from the agent run
 */
export const runAgent = async (auth, agent, thread, message, options = {}) => {
    console.log("Running agent with thread:", thread);

    const URL = `${BASE_URL}/v1/agent/runs`;

    const headers = {
      Accept: "application/json",
      Authorization: `Bearer ${JSON.stringify(auth)}`,
      "Content-Type": "application/json",
    };

    const defaultOptions = {
      agent_id: agent,
      thread_id: thread,
      new_message: message,
      max_iterations: 1,
      record_run: true,
      tool_resources: {},
      user_env_vars: {},
    };

    const body = { ...defaultOptions, ...options };

    console.log("Request body:", JSON.stringify(body, null, 2));

    try {
      const response = await fetch(URL, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Agent run failed:", errorText);
        throw new Error(`Failed to run agent: ${response.status} ${response.statusText}`);
      }

      const threadId = await response.text();
      console.log("Agent run response (thread ID):", threadId);
      return threadId;
    } catch (error) {
      console.error("Error running agent:", error);
      throw error;
    }
  };

/**
 * Fetches the current state of a thread
 * @param {NearAuthData} auth - Authentication data
 * @param {string} thread - The thread ID
 * @returns {Promise<Object>} The messages in the thread
 */
export const fetchThreadState = async (auth, thread) => {
    const URL = `${BASE_URL}/v1/threads/${thread}/messages`;

    const headers = {
      Accept: "application/json",
      Authorization: `Bearer ${JSON.stringify(auth)}`,
      "Content-Type": "application/json",
    };

    try {
      const response = await fetch(URL, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Thread state fetch failed:", errorText);
        throw new Error(`Failed to fetch thread state: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error("Error fetching thread state:", error);
      throw error;
    }
  };