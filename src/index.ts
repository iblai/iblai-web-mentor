import {
  cleanElement,
  getParamsFromComponent,
  getUrlFromComponent,
} from "./utils";
import { fetchUserTenants, fetchUserTokens } from "./api";
import { Theme } from "./models";

export {
  sendHTMLContentToHost,
  sendHTMLContentToIframe,
  proxyContextPostMessage,
} from "./context-share";

const POPUP_STORAGE_KEY = "mentor-ai-popup-id";

export default class MentorAI extends HTMLElement {
  isEmbeddedMentorReady: boolean = false;
  iblData: string = "";
  // Keeps track of the hosts' page URL
  lastUrl: string = "";
  private iframeContexts: { [key: string]: string } = {}; // Object to keep track of iframe contexts
  private userObject: any = null; // Store user object for popup windows
  private popupWindow: Window | null = null; // Reference to popup window

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
            /* border: 1px solid #dfdfdf; */
            height: 100%;
            position: relative;
        }
        @media screen and (max-width: 768px) {
        #ibl-chat-widget-container {

        }
        img.ibl-chat-bubble {
            right: 20px !important;
        }
        }
        .spinner {
            border: 3px solid #f3f3f3; /* Light grey */
            border-top: 3px solid #6cafe1; /* Blue */
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            display: block; /* Initially hidden */
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
    <div id="ibl-chat-widget-container">
        <div class="spinner" id="loading-spinner"></div>
        <iframe
          sandbox="allow-scripts allow-same-origin"
          allow="clipboard-read; clipboard-write; microphone *; camera *; midi *; geolocation *; encrypted-media *; display-capture *"
          onload="this.parentNode.querySelector('#loading-spinner').style.display='none';"
          onloadstart="this.parentNode.querySelector('#loading-spinner').style.display='block';"
        ></iframe>
    </div>
        `;
    if (this.shadowRoot) {
      this.shadowRoot.innerHTML = template;
    }
  }

  async onPostMessage(event: MessageEvent) {
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

    // Handle voice call action
    if (
      message?.type === "MENTOR:CHAT_ACTION_VOICECALL" ||
      message?.type === "MENTOR:CHAT_ACTION_SCREENSHARE"
    ) {
      const iframe = this.shadowRoot?.querySelector("iframe");
      if (iframe && iframe.src) {
        let chatAction = "";
        if (message?.type === "MENTOR:CHAT_ACTION_VOICECALL") {
          chatAction = "voice-call";
        } else if (message?.type === "MENTOR:CHAT_ACTION_SCREENSHARE") {
          chatAction = "screen-share";
        }

        // Determine the ibl-data to use
        let iblDataParam = this.iblData;
        if (!iblDataParam && this.userObject) {
          // Create a copy without the tenants key
          const userObjectWithoutTenants: any = {};
          for (const key in this.userObject) {
            if (key !== "tenants") {
              userObjectWithoutTenants[key] = this.userObject[key];
            }
          }
          iblDataParam = JSON.stringify(userObjectWithoutTenants);
        }

        const url = `${iframe.src}&ibl-data=${iblDataParam}&chat-action=${chatAction}`;

        // Check if running inside an iframe
        if (this.isInIframe()) {
          // Send message to parent to open the window
          window.parent.postMessage(
            {
              type: "ACTION:OPEN_NEW_WINDOW",
              payload: { url },
            },
            "*"
          );
        } else {
          // Mobile-size window dimensions
          const width = 375;
          const height = 667;
          const left = (window.screen.width - width) / 2;
          const top = (window.screen.height - height) / 2;

          const popupName = `MentorAI_${Date.now()}`;
          const popup = window.open(
            url,
            popupName,
            `width=${width},height=${height},left=${left},top=${top},toolbar=no,location=no,directories=no,status=no,menubar=no,resizable=yes,scrollbars=yes`
          );

          // Ensure the popup is focused and on top
          if (popup) {
            localStorage.setItem(POPUP_STORAGE_KEY, popupName);
            popup.focus();
            this.popupWindow = popup;
          }
        }
      }
    }

    if (message?.closeEmbed) {
      window.parent.postMessage(JSON.stringify(message), "*");
    }

    // New height handling
    if (message?.height) {
      const container = this.shadowRoot?.querySelector(
        "#ibl-chat-widget-container"
      ) as HTMLElement;
      if (container) {
        container.style.height = `${message.height}px`; // Set the height based on the message
      }
    }

    if (!this.isAnonymous) {
      if (message?.authExpired) {
        try {
          const edxJwtToken = this.getEdxJwtToken();
          const userTenants = await fetchUserTenants(this.lmsUrl, edxJwtToken);
          const selectedTenant = userTenants.find(
            (tenant) => tenant.key === this.tenant
          );
          if (selectedTenant) {
            const userTokens = await fetchUserTokens(
              this.lmsUrl,
              selectedTenant.key,
              edxJwtToken
            );
            this.userObject = {
              axd_token: userTokens.axd_token.token,
              axd_token_expires: userTokens.axd_token.expires,
              userData: JSON.stringify(userTokens.user),
              dm_token_expires: userTokens.dm_token.expires,
              edx_jwt_token: edxJwtToken,
              tenant: selectedTenant.key,
              tenants: JSON.stringify(userTenants),
              dm_token: userTokens.dm_token.token,
            };
            this.sendAuthDataToIframe(this.userObject);
          }
        } catch (error) {
          console.error("Error fetching user tenants or tokens:", error);
          this.redirectToAuthSPA();
        }
      }

      if (message?.loaded && message.auth.userData) {
        try {
          if (
            this.edxUserId &&
            this.edxUserId !=
              JSON.parse(message.auth.userData).user_id.toString()
          ) {
            if (this.iblData) {
              this.sendAuthDataToIframe(this.iblData);
            } else {
              try {
                const edxJwtToken = this.getEdxJwtToken();
                const userTenants = await fetchUserTenants(
                  this.lmsUrl,
                  edxJwtToken
                );

                const selectedTenant = userTenants.find(
                  (tenant) => tenant.key === this.tenant
                );
                if (selectedTenant) {
                  const userTokens = await fetchUserTokens(
                    this.lmsUrl,
                    selectedTenant.key,
                    edxJwtToken
                  );
                  this.userObject = {
                    axd_token: userTokens.axd_token.token,
                    axd_token_expires: userTokens.axd_token.expires,
                    userData: JSON.stringify(userTokens.user),
                    dm_token_expires: userTokens.dm_token.expires,
                    edx_jwt_token: edxJwtToken,
                    tenant: selectedTenant.key,
                    tenants: JSON.stringify(userTenants),
                    dm_token: userTokens.dm_token.token,
                  };
                  this.sendAuthDataToIframe(this.userObject);
                }
              } catch (error) {
                this.redirectToAuthSPA();
              }
            }
          } else {
            this.userObject = {
              axd_token: message.auth.axd_token,
              axd_token_expires: message.auth.axd_token_expires,
              userData: message.auth.userData,
              dm_token_expires: message.auth.dm_token_expires,
              edx_jwt_token: message.auth.edx_jwt_token,
              tenant: message.auth.tenant,
              tenants: message.auth.tenants,
              dm_token: message.auth.dm_token,
            };
          }
        } catch (error) {
          console.error("Error parsing userData from auth:", error);
        }
      }
    }
    if (message?.ready) {
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
      if (this.theme) {
        this.switchTheme(this.theme);
      }

      if (this.documentFilter) {
        this.sendDocumentFilterToIframe();
      }
      if (this.enableChatActionPopup) {
        this.sendDataToIframe({
          type: "MENTOR:ENABLE_CHAT_ACTION_POPUPS",
          payload: { enable: true },
        });
      }

      if (this.edxUsageId) {
        this.sendDataToIframe({
          type: "MENTOR:EDX_USAGE_ID",
          data: { edxUsageId: this.edxUsageId },
        });
      }
      if (this.edxCourseId) {
        this.sendDataToIframe({
          type: "MENTOR:EDX_COURSE_ID",
          data: { edxCourseId: this.edxCourseId },
        });
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

    // Show the spinner when the iframe starts loading
    const iframe = this.shadowRoot?.querySelector("iframe");
    if (iframe) {
      iframe.onloadstart = () => {
        const spinner = this.shadowRoot?.querySelector(
          "#loading-spinner"
        ) as HTMLElement;
        if (spinner) {
          spinner.style.display = "block";
        }
      };
      iframe.onload = () => {
        const spinner = this.shadowRoot?.querySelector(
          "#loading-spinner"
        ) as HTMLElement;
        if (spinner) {
          spinner.style.display = "none";
        }
      };
    }
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

  get lmsUrl() {
    return this.getAttribute("lmsurl") || "https://learn.iblai.app";
  }

  set lmsUrl(value) {
    this.setAttribute("lmsurl", value);
  }

  get theme(): Theme {
    return (this.getAttribute("theme") as Theme) || "light";
  }

  set theme(value: Theme) {
    this.setAttribute("theme", value);
  }

  get tenant(): string | null {
    return this.getAttribute("tenant");
  }

  set tenant(value: string) {
    this.setAttribute("tenant", value);
  }

  get extraParams(): string | null {
    return this.getAttribute("extraparams");
  }

  set extraParams(value: string) {
    this.setAttribute("extraparams", value);
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

  get edxUsageId(): string | null {
    return this.getAttribute("edxusageid");
  }

  set edxUsageId(value: string) {
    this.setAttribute("edxusageid", value);
  }

  get edxCourseId(): string | null {
    return this.getAttribute("edxcourseid");
  }

  set edxCourseId(value: string) {
    this.setAttribute("edxcourseid", value);
  }

  get edxUserId(): string | null {
    return this.getAttribute("edxuserid");
  }

  set edxUserId(value: string) {
    this.setAttribute("edxuserid", value);
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

  get enableChatActionPopup() {
    return this.hasAttribute("enablechatactionpopup");
  }

  set enableChatActionPopup(value) {
    if (value) {
      this.setAttribute("enablechatactionpopup", "");
    } else {
      this.removeAttribute("enablechatactionpopup");
    }
  }

  get redirectToken(): string | null {
    return this.getAttribute("redirecttoken");
  }

  set redirectToken(value: string) {
    this.setAttribute("redirecttoken", value);
  }

  get component(): "chat" | null {
    return this.getAttribute("component") as "chat" | null;
  }

  set component(value: string) {
    this.setAttribute("component", value);
  }

  get modal(): "dataset" | "settings" | null {
    return this.getAttribute("modal") as "dataset" | "settings" | null;
  }

  set modal(value: string) {
    this.setAttribute("modal", value);
  }

  get documentFilter(): string | null {
    return this.getAttribute("documentfilter") as string | null;
  }

  set documentFilter(value: string) {
    this.setAttribute("documentfilter", value);
  }

  static get observedAttributes() {
    return [
      "mentorUrl",
      "tenant",
      "mentor",
      "isadvanced",
      "iscontextaware",
      "enablechatactionpopup",
      "contextOrigins", // Add the new attribute to observed attributes
      "component",
      "modal",
      "extraparams",
      "documentfilter",
    ];
  }

  attributeChangedCallback(name: string, oldValue: any, newValue: any) {
    if (
      [
        "mentorUrl",
        "tenant",
        "mentor",
        "isadvanced",
        "component",
        "modal",
        "extraparams",
      ].includes(name)
    ) {
      const iframe = this.shadowRoot?.querySelector("iframe");
      if (this.shadowRoot && iframe) {
        iframe.src = `${this.mentorUrl}/platform/${
          this.tenant
        }${getUrlFromComponent(this.component, this.mentor)}/${
          this.modal ? this.modal : ""
        }?embed=true&mode=anonymous&extra-body-classes=iframed-externally${
          this.isAdvanced ? "&chat=advanced" : ""
        }${this.modal ? "&modal=" + this.modal : ""}${getParamsFromComponent(
          this.component
        )}${this.extraParams ? "&" + this.extraParams : ""}`;
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
    if (this.documentFilter) {
      this.sendDocumentFilterToIframe();
    }
    if (name === "contextOrigins") {
      this.contextOrigins = newValue?.split(",") || []; // Update the context origins when the attribute changes
    }
    if (name === "theme") {
      this.switchTheme(newValue);
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
        type: "MENTOR:CONTEXT_UPDATE",
        hostInfo: {
          title: document.title,
          href: window.location.href,
        },
        pageContent: bodyContent,
      };
      iframe.contentWindow.postMessage(payload, "*");
    }
    // Also send to popup if available
    this.sendHostInfoToPopup();
  }

  getPopupWindow(): Window | null {
    // Check if we have a valid popup reference in memory
    if (this.popupWindow && !this.popupWindow.closed) {
      return this.popupWindow;
    }
    // Try to get popup by name from localStorage
    const popupWindowName = localStorage.getItem(POPUP_STORAGE_KEY);
    if (popupWindowName) {
      // Attempt to get reference to existing popup by opening with same name
      const existingPopup = window.open("", popupWindowName);

      // Check if we got an actual existing popup vs a new blank one
      if (
        existingPopup &&
        !existingPopup.closed &&
        existingPopup.location.href !== "about:blank"
      ) {
        this.popupWindow = existingPopup;
        return existingPopup;
      } else {
        // Close the blank popup we just accidentally opened
        if (existingPopup && existingPopup.location.href === "about:blank") {
          existingPopup.close();
        }
        // Popup was closed or doesn't exist, clean up
        localStorage.removeItem(POPUP_STORAGE_KEY);
        this.popupWindow = null;
      }
    }
    return null;
  }

  sendHostInfoToPopup() {
    const popup = this.getPopupWindow();
    if (popup) {
      const bodyContent = this.getCleanBodyContent();
      const payload = {
        type: "MENTOR:CONTEXT_UPDATE",
        hostInfo: {
          title: document.title,
          href: window.location.href,
        },
        pageContent: bodyContent,
      };
      popup.postMessage(payload, "*");
    }
  }

  isInIframe(): boolean {
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  }

  getEdxJwtToken(): string | undefined {
    if (this.iblData) {
      try {
        const parsedData = JSON.parse(this.iblData);
        return parsedData.edx_jwt_token;
      } catch (error) {
        console.error("Error parsing iblData:", error);
        return undefined;
      }
    }
    return undefined;
  }

  sendDocumentFilterToIframe() {
    this.sendDataToIframe({
      type: "MENTOR:DOCUMENTFILTER",
      data: this.documentFilter,
    });
  }

  sendDataToIframe(data: Record<string, any>) {
    const iframe = this.shadowRoot?.querySelector(
      "#ibl-chat-widget-container iframe"
    ) as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(data, "*");
    }
  }

  switchTheme(theme: string) {
    const iframe = this.shadowRoot?.querySelector(
      "#ibl-chat-widget-container iframe"
    ) as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(JSON.stringify({ theme }), "*");
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
  if (typeof window !== "undefined" && !customElements.get("mentor-ai")) {
    customElements.define("mentor-ai", MentorAI);
  }
}

defineMentorAI();

export * from "./mentor-ai";
