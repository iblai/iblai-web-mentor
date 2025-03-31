export const cleanElement = (element: string) => {
  const selectorsToRemove: string[] = [
    "script",
    "noscript",
    "style",
    "nav",
    "footer",
    ".ads",
    ".sidebar",
    ".popup",
    ".cookie-banner",
    "#ibl-chat-widget-container",
    ".ibl-chat-bubble",
    "mentor-ai",
  ];
  const tempDiv = document.createElement("div");

  selectorsToRemove.forEach((selector: string) => {
    tempDiv.innerHTML = element;
    const elements: NodeListOf<Element> = tempDiv.querySelectorAll(selector);
    elements.forEach((el: Element) => el.remove());
  });
  return tempDiv.innerHTML.replace(/\n/g, ""); // Remove newline characters
};

const workerBlob = new Blob(
  [
    `
    const cleanElement = (htmlString) => {
      const selectorsToRemove = [
        "script",
        "noscript",
        "style",
        "nav",
        "footer",
        ".ads",
        ".sidebar",
        ".popup",
        ".cookie-banner",
        "#ibl-chat-widget-container",
        ".ibl-chat-bubble",
        "mentor-ai",
        "link",
        "meta",
        "iframe",
      ];

      let cleanedHTML = htmlString;
      
      // Remove HTML comments
      cleanedHTML = cleanedHTML.replace(/<!--.*?-->/gs, "");
      cleanedHTML = cleanedHTML.replace("\\n", "");
      // Remove elements by tag name
      selectorsToRemove
        .filter((selector) => !selector.startsWith(".") && !selector.startsWith("#"))
        .forEach((tag) => {
          const regex = new RegExp(\`<\${tag}[^>]*>.*?</\${tag}>\`, "gs");
          cleanedHTML = cleanedHTML.replace(regex, "");
        });

      // Remove elements by class or ID
      selectorsToRemove
        .filter((selector) => selector.startsWith(".") || selector.startsWith("#"))
        .forEach((attr) => {
          const attrType = attr.startsWith(".") ? "class" : "id";
          const attrName = attr.slice(1);

          // Remove elements with matching class or ID
          const regex = new RegExp(\`<[^>]*\\s\${attrType}=["'][^"']*\\b\${attrName}\\b[^"']*["'][^>]*>.*?</[^>]+>\`, "gs");
          cleanedHTML = cleanedHTML.replace(regex, "");

          // Remove attributes inside tags (e.g., \`<div class="ads">\` → \`<div>\`)
          const attrRegex = new RegExp(\`\\s\${attrType}=["'][^"']*\\b\${attrName}\\b[^"']*["']\`, "gs");
          cleanedHTML = cleanedHTML.replace(attrRegex, "");
        });

      // Remove newline characters and extra spaces
      return cleanedHTML.replace(/\\n/g, "").trim();
    };
    onmessage = function (event) {
      const htmlContent = event.data; // Get the HTML content from the main thread
      const cleanedContent = cleanElement(htmlContent); // Clean the content
      postMessage(cleanedContent); // Send the cleaned content back to the main thread
    }
    `,
  ],
  { type: "application/javascript" }
);

// Create an object URL for the Blob
export const workerUrl = URL.createObjectURL(workerBlob);

export const getParamsFromComponent = (
  component:
    | "chat"
    | "analytics-overview"
    | "analytics-users"
    | "analytics-topics"
    | "prompt-gallery"
    | null
) => {
  if (
    [
      "chat",
      "analytics-overview",
      "analytics-users",
      "analytics-topics",
      "prompt-gallery",
    ].includes(component ?? "")
  ) {
    return `&hide_side_nav=true&hide_header=true&component=${component}`;
  }
  return "";
};

export const getUrlFromComponent = (
  component:
    | "chat"
    | "analytics-overview"
    | "analytics-users"
    | "analytics-topics"
    | "prompt-gallery"
    | null
) => {
  switch (component) {
    case "analytics-overview":
      return "/analytics";
    case "analytics-users":
      return "/analytics/users";
    case "analytics-topics":
      return "/analytics/topics";
    default:
      return "";
  }
};
