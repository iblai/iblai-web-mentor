import { workerUrl } from "./utils";

// Used when in an iframe and want to share page content to host
// Function to check and send content
export function sendHTMLContentToHost(host: string, interval: number = 5000) {
  // Create a new Web Worker
  const worker = new Worker(workerUrl);

  // Function to check and send content
  const checkAndSendContent = () => {
    if (window.self !== window.top) {
      const htmlContent = document.documentElement.outerHTML; // Get raw HTML content
      worker.postMessage(htmlContent); // Send content to worker for cleaning
    }
  };

  // Listen for messages from the worker
  worker.onmessage = (event) => {
    const cleanedContent = event.data; // Get cleaned content from worker
    window.parent.postMessage({ type: "context", data: cleanedContent }, host); // Send cleaned content to host
  };

  setInterval(checkAndSendContent, interval);
}

export function sendHTMLContentToIframe(
  iframeId: string,
  iframeHost: string,
  interval = 5000
) {
  let iframe: HTMLIFrameElement | null;
  // Create a new Web Worker
  const worker = new Worker(workerUrl);

  // New variables to track content and interval
  let previousContent: string | null = null;

  let htmlContent = document.documentElement.outerHTML;

  // Function to check and send content
  const checkAndSendContent = () => {
    iframe = document.getElementById(iframeId) as HTMLIFrameElement;
    htmlContent = document.documentElement.outerHTML;
    if (iframe && iframe.contentWindow) {
      worker.postMessage(htmlContent); // Send content to worker for cleaning
    } else {
      console.log("Iframe not found or contentWindow is not accessible.");
    }
  };

  // Listen for messages from the worker
  worker.onmessage = (event) => {
    const cleanedContent = event.data; // Get cleaned content from worker
    iframe?.contentWindow?.postMessage(
      { type: "context", data: cleanedContent },
      "*"
    );
    previousContent = htmlContent; // Update previous content
  };

  // Start the interval
  setInterval(checkAndSendContent, interval);
}

// Function to proxy post messages to an iframe or to the parent
export function proxyContextPostMessage(targetIdOrHost: string, host?: string) {
  // Function to handle incoming messages
  const messageHandler = (event: MessageEvent) => {
    if (event.data.type === "context") {
      // Check if the message type is 'context'
      if (window.self !== window.top) {
        // If in an iframe, send to parent
        window.parent.postMessage(event.data, targetIdOrHost);
      } else {
        // If not in an iframe, send to the specified iframe
        const iframe: HTMLIFrameElement | null = document.getElementById(
          targetIdOrHost
        ) as HTMLIFrameElement;
        if (iframe && iframe.contentWindow) {
          const targetHost = host || "*"; // Use the provided host or default to '*'
          iframe.contentWindow.postMessage(event.data, targetHost);
        } else {
          console.log("Iframe not found or contentWindow is not accessible.");
        }
      }
    }
  };

  // Listen for messages from the window
  window.addEventListener("message", messageHandler);
}
