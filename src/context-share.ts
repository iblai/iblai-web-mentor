function sendHtmlToIframe(iframeId: string) {
  // Check if iframeId is not provided
  if (!iframeId) {
    // Check if the current document is in an iframe
    if (window.parent !== window) {
      const htmlContent = document.documentElement.outerHTML;
      window.parent.postMessage(htmlContent, "*"); // Send content to host
    }
  } else {
    const iframe: HTMLIFrameElement | null = document.getElementById(
      iframeId
    ) as HTMLIFrameElement;

    // New variables to track content and interval
    let previousContent: string | null = null;
    const interval = 5000; // Change this value to set the interval in milliseconds

    // Function to check and send content
    const checkAndSendContent = () => {
      if (iframe && iframe.contentWindow) {
        const htmlContent = document.documentElement.outerHTML;
        if (htmlContent !== previousContent) {
          iframe.contentWindow.postMessage(htmlContent, "*");
          previousContent = htmlContent; // Update previous content
        }
      } else {
        console.log("Iframe not found or contentWindow is not accessible.");
      }
    };

    // Start the interval
    setInterval(checkAndSendContent, interval);
  }
}
