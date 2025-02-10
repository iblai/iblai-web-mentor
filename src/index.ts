import { cleanElement } from "./utils";

export {
  sendHTMLContentToHost,
  sendHTMLContentToIframe,
} from "./context-share";

export default class MentorAI extends HTMLElement {
  isEmbeddedMentorReady: boolean = false;
  iblData: string = "";
  // Keeps track of the hosts' page URL
  lastUrl: string = "";
  private iframeContexts: { [key: string]: string } = {}; // Object to keep track of iframe contexts

  constructor() {
    super();
    const _iblData: string | null = new URL(
      window.location.href
    ).searchParams.get("ibl-data");
    if (_iblData) {
      this.iblData = _iblData;
    }
    this.attachShadow({ mode: "open" });

    const template = `
    <style>
        iframe {
        border: 0px white;
        height: 100%;
        width: 100%;
        border-radius: 0;
        }
        #ibl-chat-widget-container {
            border: 1px solid #dfdfdf;
            height: 100%;
            right: 15px;
        }
        @media screen and (max-width: 768px) {
        #ibl-chat-widget-container {
            max-width: 400px !important;
            right: 20px !important;
        }
        img.ibl-chat-bubble {
            right: 20px !important;
        }
        }
    </style>
    <div id="ibl-chat-widget-container">
        <iframe
        allow="clipboard-read; clipboard-write"
        ></iframe>
    </div>
        `;
    if (this.shadowRoot) {
      this.shadowRoot.innerHTML = template;
    }
  }

  onPostMessage(event: MessageEvent) {
    let message: any = event.data;
    if (typeof message === "string") {
      try {
        message = JSON.parse(message);
      } catch (error) {
        return;
      }
    }
    // New context handling
    if (message?.type === "context") {
      const origin = event.origin; // Get the origin of the iframe
      if (this.contextOrigins.includes(origin)) {
        // Check if the origin is whitelisted
        this.iframeContexts[origin] = message.data; // Store the context data
      }
    }

    if (!this.isAnonymous) {
      if (message?.loaded && message?.auth?.axd_token) {
        const _userData = document.cookie.includes("userData=")
          ? document.cookie.split("userData=")[1].split(";")[0]
          : null;
        if (!_userData && !this.authRelyOnHost) {
          this.redirectToAuthSPA(true);
        }
      }

      if (
        message?.loaded &&
        (!message.auth.axd_token ||
          !message.auth.dm_token ||
          message.auth.tenant !== this.tenant ||
          this.isTokenExpired(message.auth.dm_token_expires) ||
          this.isTokenExpired(message.auth.axd_token_expires))
      ) {
        !this.iblData && this.redirectToAuthSPA();
      }

      if (message?.loaded && message.auth.userData) {
        const userData = document.cookie.includes("userData=")
          ? document.cookie.split("userData=")[1].split(";")[0]
          : null;
        if (userData) {
          try {
            const parsedUserData = JSON.parse(userData);
            if (
              parsedUserData.user_id !==
              JSON.parse(message.auth.userData).user_id
            ) {
              if (this.iblData) {
                this.sendAuthDataToIframe(this.iblData);
              }
            }
          } catch (error) {
            console.error("Error parsing userData cookie:", error);
          }
        }
      }
    }
    if (message?.authExpired) {
      if (!this.isAnonymous) {
        this.redirectToAuthSPA(true);
      }
    } else if (message?.ready) {
      this.isEmbeddedMentorReady = true;
      if (this.iblData) {
        this.sendAuthDataToIframe(this.iblData);
      } else if (!this.authRelyOnHost) {
        if (!this.isAnonymous) {
          this.redirectToAuthSPA();
        }
      }
    }
    if (message?.loaded) {
      this.isEmbeddedMentorReady = true;
      if (this.isContextAware) {
        this.sendHostInfoToIframe();
      }
    }
  }
  connectedCallback() {
    if (this.iblData) {
      const url = new URL(window.location.href);
      url.searchParams.delete("ibl-data");
      window.history.replaceState({}, document.title, url);
      const userData: any = JSON.parse(this.iblData).userData;
      document.cookie = `userData=${userData}; domain=${document.domain}; path=/;`;
    }

    window.addEventListener("message", (event: MessageEvent) =>
      this.onPostMessage(event)
    );
  }

  disconnectedCallback() {
    window.removeEventListener("message", this.onPostMessage);
  }

  get mentorUrl() {
    return this.getAttribute("mentorurl") || "https://mentor.iblai.app";
  }

  set mentorUrl(value) {
    this.setAttribute("mentorurl", value);
  }

  get authUrl() {
    return this.getAttribute("authurl") || "https://auth.iblai.app";
  }

  set authUrl(value) {
    this.setAttribute("authurl", value);
  }

  get tenant(): string | null {
    return this.getAttribute("tenant");
  }

  set tenant(value: string) {
    this.setAttribute("tenant", value);
  }

  get contextOrigins(): string[] {
    return this.getAttribute("contextorigins")?.split(",") || [];
  }

  set contextOrigins(value: string) {
    this.setAttribute("contextorigins", value);
  }

  get mentor(): string | null {
    return this.getAttribute("mentor");
  }

  set mentor(value: string) {
    this.setAttribute("mentor", value);
  }

  get authRelyOnHost() {
    return this.hasAttribute("authrelyonhost");
  }

  set authRelyOnHost(value) {
    if (value) {
      this.setAttribute("authrelyonhost", "");
    } else {
      this.removeAttribute("authrelyonhost");
    }
  }

  get isAnonymous() {
    return this.hasAttribute("isanonymous");
  }

  set isAnonymous(value) {
    if (value) {
      this.setAttribute("isanonymous", "");
    } else {
      this.removeAttribute("isanonymous");
    }
  }

  get isAdvanced() {
    return this.hasAttribute("isadvanced");
  }

  set isAdvanced(value) {
    if (value) {
      this.setAttribute("isadvanced", "");
    } else {
      this.removeAttribute("isadvanced");
    }
  }

  get isContextAware() {
    return this.hasAttribute("iscontextaware");
  }

  set isContextAware(value) {
    if (value) {
      this.setAttribute("iscontextaware", "");
    } else {
      this.removeAttribute("iscontextaware");
    }
  }

  get redirectToken(): string | null {
    return this.getAttribute("redirecttoken");
  }

  set redirectToken(value: string) {
    this.setAttribute("redirecttoken", value);
  }

  static get observedAttributes() {
    return [
      "mentorUrl",
      "tenant",
      "mentor",
      "isadvanced",
      "iscontextaware",
      "contextOrigins", // Add the new attribute to observed attributes
    ];
  }

  attributeChangedCallback(name: string, oldValue: any, newValue: any) {
    if (["mentorUrl", "tenant", "mentor", "isadvanced"].includes(name)) {
      const iframe = this.shadowRoot?.querySelector("iframe");
      if (this.shadowRoot && iframe) {
        iframe.src = `${this.mentorUrl}/platform/${this.tenant}/${
          this.mentor
        }?embed=true&mode=anonymous&extra-body-classes=iframed-externally${
          this.isAdvanced ? "&chat=advanced" : ""
        }`;
      }
    }
    if (this.isContextAware) {
      this.lastUrl = window.location.href;
      setInterval(() => {
        // const currentUrl = window.location.href;
        // if (currentUrl !== this.lastUrl) {
        //   this.lastUrl = currentUrl;
        //   this.isContextAware && this.sendHostInfoToIframe();
        // }
        this.isContextAware && this.sendHostInfoToIframe();
      }, 1000);
    }
    if (name === "contextOrigins") {
      this.contextOrigins = newValue?.split(",") || []; // Update the context origins when the attribute changes
    }
  }

  getCleanBodyContent(): string {
    const bodyClone: HTMLElement = document.body.cloneNode(true) as HTMLElement;

    // Clean the bodyClone
    cleanElement(bodyClone.outerHTML);

    const removeComments = (node: Node) => {
      for (let i = 0; i < node.childNodes.length; i++) {
        const child = node.childNodes[i];
        if (child.nodeType === 8) {
          node.removeChild(child);
          i--;
        } else if (child.nodeType === 1) {
          removeComments(child);
        }
      }
    };
    removeComments(bodyClone);

    // Clean each iframeContext (HTML string) and merge their HTML
    const iframeHtmls = Object.values(this.iframeContexts).map(
      (iframeHtml: string) => {
        return cleanElement(iframeHtml); // Clean unwanted selectors
      }
    );

    // Merge bodyClone HTML with cleaned iframe HTMLs
    const mergedContent = bodyClone.innerHTML + iframeHtmls.join("");

    return mergedContent; // Return the merged HTML content
  }

  sendHostInfoToIframe() {
    const iframe = this.shadowRoot?.querySelector(
      "#ibl-chat-widget-container iframe"
    ) as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      const bodyContent = this.getCleanBodyContent();
      const payload = {
        reason: "CONTEXT",
        hostInfo: {
          title: document.title,
          href: window.location.href,
        },
        pageContent: bodyContent,
      };
      iframe.contentWindow.postMessage(payload, "*");
    }
  }

  sendAuthDataToIframe(iblData: any) {
    const iframe = this.shadowRoot?.querySelector(
      "#ibl-chat-widget-container iframe"
    ) as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(iblData, "*");
    }
  }

  isTokenExpired(token_expires: string) {
    const expirationDate = new Date(token_expires);
    const now = new Date();
    return now >= expirationDate;
  }

  redirectToAuthSPA(forceLogout?: boolean) {
    if (this.authRelyOnHost) {
      const iframe = this.shadowRoot?.querySelector(
        "#ibl-chat-widget-container iframe"
      ) as HTMLIFrameElement;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ ...localStorage }, "*");
      }
      return;
    }
    const redirectPath: string =
      window.location.pathname + window.location.search;
    window.location.href = `${
      this.authUrl
    }/login?redirect-path=${redirectPath}&tenant=${this.tenant}${
      forceLogout ? "&logout=true" : ""
    }&redirect-token=${this.redirectToken}`;
  }

  toggleWidget() {
    const widget: HTMLElement | null = document.getElementById(
      "ibl-chat-widget-container"
    );
    if (widget) {
      if (widget.style.display === "none") {
        widget.style.display = "";
      } else {
        widget.style.display = "none";
      }
    }
  }
}

function defineMentorAI() {
  if (!customElements.get("mentor-ai")) {
    customElements.define("mentor-ai", MentorAI);
  }
}

defineMentorAI();
