export const cleanElement = (element: HTMLElement) => {
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
  selectorsToRemove.forEach((selector: string) => {
    const elements: NodeListOf<Element> = element.querySelectorAll(selector);
    elements.forEach((el: Element) => el.remove());
  });
  element.innerHTML = element.innerHTML.replace(/\n/g, ""); // Remove newline characters
};
