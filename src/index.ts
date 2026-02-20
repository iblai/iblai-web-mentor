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
const SCREEN_SHARING_STORAGE_KEY = "mentor-ai-screen-sharing-active";

export default class MentorAI extends HTMLElement {
  isEmbeddedMentorReady: boolean = false;
  iblData: string = "";
  // Keeps track of the hosts' page URL
  lastUrl: string = "";
  private iframeContexts: { [key: string]: string } = {}; // Object to keep track of iframe contexts
  private userObject: any = null; // Store user object for popup windows
  private popupWindow: Window | null = null; // Reference to popup window
  private sentOpenNewWindowForScreenShare: boolean = false; // Track if we sent ACTION:OPEN_NEW_WINDOW for screen sharing
  private originalIframeDimensions: { width: string; height: string } | null = null; // Store original iframe dimensions
  private isMicMuted: boolean = false; // Track mic muted state during screen sharing
  private isMicSpeaking: boolean = false; // Track speaking state during screen sharing
  private isMentorMuted: boolean = false; // Track mentor audio muted state
  private isMentorSpeaking: boolean = false; // Track mentor speaking state

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

        #refresh-instruction {
            display: none;
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: #333;
            padding: 20px;
            max-width: 300px;
        }

        #refresh-instruction p {
            margin: 0 0 15px 0;
            font-size: 14px;
            line-height: 1.5;
        }

        #refresh-instruction button {
            background-color: #6cafe1;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
        }

        #refresh-instruction button:hover {
            background-color: #5a9fd4;
        }

        #screensharing-overlay {
            display: none;
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            z-index: 100;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: white;
            padding: 20px;
            box-sizing: border-box;
        }

        #screensharing-overlay.active {
            display: flex;
        }

        #screensharing-overlay .icon {
            width: 80px;
            height: 80px;
            margin-bottom: 20px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        #screensharing-overlay .icon svg {
            width: 40px;
            height: 40px;
            fill: white;
        }

        #screensharing-overlay h2 {
            margin: 0 0 10px 0;
            font-size: 24px;
            font-weight: 600;
        }

        #screensharing-overlay p {
            margin: 0 0 25px 0;
            font-size: 14px;
            opacity: 0.9;
            line-height: 1.5;
        }

        #screensharing-overlay .pulse-indicator {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 25px;
            font-size: 14px;
        }

        #screensharing-overlay .pulse-dot {
            width: 12px;
            height: 12px;
            background-color: #4ade80;
            border-radius: 50%;
            animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(1.2); }
        }

        #screensharing-overlay button {
            background-color: rgba(255, 255, 255, 0.2);
            color: white;
            border: 2px solid white;
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s ease;
        }

        #screensharing-overlay button:hover {
            background-color: white;
            color: #764ba2;
        }

        /* Audio Status UI */
        #screensharing-overlay .audio-status-container {
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin-top: 30px;
            padding: 16px 24px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 12px;
            min-width: 260px;
        }

        #screensharing-overlay .status-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
        }

        #screensharing-overlay .status-indicator {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        #screensharing-overlay .status-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background-color: #3b82f6;
            flex-shrink: 0;
        }

        #screensharing-overlay .status-dot.speaking {
            background-color: #22c55e;
            box-shadow: 0 0 12px 4px rgba(34, 197, 94, 0.6);
            animation: speakingPulse 1s ease-in-out infinite;
        }

        #screensharing-overlay .status-dot.muted {
            background-color: #ef4444;
        }

        @keyframes speakingPulse {
            0%, 100% { box-shadow: 0 0 12px 4px rgba(34, 197, 94, 0.6); }
            50% { box-shadow: 0 0 20px 8px rgba(34, 197, 94, 0.4); }
        }

        #screensharing-overlay .status-text {
            font-size: 14px;
            font-weight: 500;
            color: white;
        }

        #screensharing-overlay .status-text.speaking {
            color: #4ade80;
        }

        #screensharing-overlay .audio-action-btn {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.15);
            border: none;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s ease;
            flex-shrink: 0;
        }

        #screensharing-overlay .audio-action-btn:hover {
            background: rgba(255, 255, 255, 0.25);
        }

        #screensharing-overlay .audio-action-btn.muted {
            background: rgba(239, 68, 68, 0.2);
        }

        #screensharing-overlay .audio-action-btn svg {
            width: 20px;
            height: 20px;
            fill: rgba(255, 255, 255, 0.8);
        }

        #screensharing-overlay .audio-action-btn.muted svg {
            fill: #ef4444;
        }
    </style>
    <div id="ibl-chat-widget-container">
        <div class="spinner" id="loading-spinner"></div>
        <div id="refresh-instruction"></div>
        <div id="screensharing-overlay">
            <div class="icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path d="M20 3H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h3l-1 1v2h12v-2l-1-1h3c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 13H4V5h16v11z"/>
                </svg>
            </div>
            <h2>Screen Sharing Active</h2>
            <div class="pulse-indicator">
                <span class="pulse-dot"></span>
                <span>Your screen is being shared</span>
            </div>
            <p>The mentor can now see your screen in the popup window.</p>
            <button id="stop-screensharing-btn">Stop Screen Sharing</button>
            <div class="audio-status-container" id="audio-status-container">
                <div class="status-row">
                    <div class="status-indicator">
                        <span class="status-dot" id="mentor-status-dot"></span>
                        <span class="status-text" id="mentor-status-text">Mentor audio on</span>
                    </div>
                    <div class="audio-action-btn" id="mentor-audio-btn">
                        <svg id="mentor-icon-on" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                        </svg>
                        <svg id="mentor-icon-muted" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="display: none;">
                            <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                        </svg>
                    </div>
                </div>
                <div class="status-row">
                    <div class="status-indicator">
                        <span class="status-dot" id="mic-status-dot"></span>
                        <span class="status-text" id="mic-status-text">Mic on</span>
                    </div>
                    <div class="audio-action-btn" id="mic-audio-btn">
                        <svg id="mic-icon-on" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z"/>
                        </svg>
                        <svg id="mic-icon-muted" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="display: none;">
                            <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V20c0 .55.45 1 1 1s1-.45 1-1v-2.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>
                        </svg>
                    </div>
                </div>
            </div>
        </div>
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
          // Track if this is a screen share request
          if (message?.type === "MENTOR:CHAT_ACTION_SCREENSHARE") {
            this.sentOpenNewWindowForScreenShare = true;
          }
          // Send message to parent to open the window
          window.parent.postMessage(
            {
              type: "ACTION:OPEN_NEW_WINDOW",
              payload: { url },
            },
            "*"
          );
        } else {
          // Track if this is a screen share request
          if (message?.type === "MENTOR:CHAT_ACTION_SCREENSHARE") {
            this.sentOpenNewWindowForScreenShare = true;
          }
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

    // Handle screen sharing started message from parent
    if (message?.type === "MENTOR:SCREENSHARING_STARTED") {
      if (this.sentOpenNewWindowForScreenShare) {
        localStorage.setItem(SCREEN_SHARING_STORAGE_KEY, "true");
        this.showScreenSharingOverlay();
      }
    }

    // Handle screen sharing stopped message from parent
    if (message?.type === "MENTOR:SCREENSHARING_STOPPED") {
      if (this.sentOpenNewWindowForScreenShare) {
        this.hideScreenSharingOverlay();
        this.sentOpenNewWindowForScreenShare = false;
        localStorage.removeItem(SCREEN_SHARING_STORAGE_KEY);
      }
    }

    // Handle screen sharing speaking state changes
    if (message?.type === "MENTOR:SCREENSHARING_SPEAKING") {
      this.updateMicSpeakingState(message.speaking);
    }

    // Handle screen sharing muted state changes
    if (message?.type === "MENTOR:SCREENSHARING_MUTED") {
      this.updateMicMutedState(message.muted);
    }

    // Handle mentor speaking state changes
    if (message?.type === "MENTOR:SCREENSHARING_MENTOR_SPEAKING") {
      this.updateMentorSpeakingState(message.speaking);
    }

    // Handle mentor muted state changes
    if (message?.type === "MENTOR:SCREENSHARING_MENTOR_MUTED") {
      this.updateMentorMutedState(message.muted);
    }

    // Handle focus parent request
    if (message?.type === "MENTOR:FOCUS_PARENT") {
      window.focus();
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
          if (this.authRelyOnHost) {
            this.showRefreshInstruction();
          } else {
            this.redirectToAuthSPA();
          }
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
                if (this.authRelyOnHost) {
                  this.showRefreshInstruction();
                } else {
                  this.redirectToAuthSPA();
                }
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

    // Set up click handler for stop screen sharing button
    const stopScreenSharingBtn = this.shadowRoot?.querySelector(
      "#stop-screensharing-btn"
    );
    if (stopScreenSharingBtn) {
      stopScreenSharingBtn.addEventListener("click", () => {
        this.stopScreenSharing();
      });
    }

    // Set up click handler for mic mute button
    const micAudioBtn = this.shadowRoot?.querySelector("#mic-audio-btn");
    if (micAudioBtn) {
      micAudioBtn.addEventListener("click", () => {
        this.toggleMute();
      });
    }

    // Set up click handler for mentor mute button
    const mentorAudioBtn = this.shadowRoot?.querySelector("#mentor-audio-btn");
    if (mentorAudioBtn) {
      mentorAudioBtn.addEventListener("click", () => {
        this.toggleMentorMute();
      });
    }

    // Restore screen sharing overlay if it was active before page refresh
    const screenSharingWasActive = localStorage.getItem(
      SCREEN_SHARING_STORAGE_KEY
    );
    if (screenSharingWasActive) {
      if (!this.isInIframe()) {
        // Verify the popup is still open before showing overlay
        const popup = this.getPopupWindow();
        if (popup) {
          this.sentOpenNewWindowForScreenShare = true;
          this.showScreenSharingOverlay();
        } else {
          // Popup was closed while we were away, clean up
          localStorage.removeItem(SCREEN_SHARING_STORAGE_KEY);
        }
      } else {
        // In iframe mode, ask parent if screen sharing is still active
        window.parent.postMessage({ type: "MENTOR:SCREENSHARING_STATUS" }, "*");
      }
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

  showRefreshInstruction() {
    const refreshDiv = this.shadowRoot?.querySelector(
      "#refresh-instruction"
    ) as HTMLElement;
    const iframe = this.shadowRoot?.querySelector("iframe") as HTMLElement;
    const spinner = this.shadowRoot?.querySelector(
      "#loading-spinner"
    ) as HTMLElement;

    if (refreshDiv) {
      refreshDiv.innerHTML = `
        <p>Your session has expired. Please refresh the page to continue.</p>
      `;
      refreshDiv.style.display = "block";
    }
    if (iframe) {
      iframe.style.display = "none";
    }
    if (spinner) {
      spinner.style.display = "none";
    }
  }

  showScreenSharingOverlay() {
    const overlay = this.shadowRoot?.querySelector(
      "#screensharing-overlay"
    ) as HTMLElement;
    const iframe = this.shadowRoot?.querySelector("iframe") as HTMLElement;

    if (iframe) {
      // Store original dimensions before hiding
      this.originalIframeDimensions = {
        width: iframe.style.width || "100%",
        height: iframe.style.height || "100%",
      };
      // Hide iframe by setting dimensions to 0
      iframe.style.width = "0";
      iframe.style.height = "0";
    }

    if (overlay) {
      overlay.classList.add("active");
    }
  }

  hideScreenSharingOverlay() {
    const overlay = this.shadowRoot?.querySelector(
      "#screensharing-overlay"
    ) as HTMLElement;
    const iframe = this.shadowRoot?.querySelector("iframe") as HTMLElement;

    if (overlay) {
      overlay.classList.remove("active");
    }

    if (iframe && this.originalIframeDimensions) {
      // Restore original dimensions
      iframe.style.width = this.originalIframeDimensions.width;
      iframe.style.height = this.originalIframeDimensions.height;
      this.originalIframeDimensions = null;
    }

    // Reset audio status when hiding overlay
    this.resetAudioStatus();
  }

  resetAudioStatus() {
    this.isMicMuted = false;
    this.isMicSpeaking = false;
    this.isMentorMuted = false;
    this.isMentorSpeaking = false;
    this.updateAudioStatusUI();
  }

  updateMicMutedState(muted: boolean) {
    this.isMicMuted = muted;
    if (muted) {
      this.isMicSpeaking = false;
    }
    this.updateAudioStatusUI();
  }

  updateMicSpeakingState(speaking: boolean) {
    if (!this.isMicMuted) {
      this.isMicSpeaking = speaking;
      this.updateAudioStatusUI();
    }
  }

  updateMentorMutedState(muted: boolean) {
    this.isMentorMuted = muted;
    if (muted) {
      this.isMentorSpeaking = false;
    }
    this.updateAudioStatusUI();
  }

  updateMentorSpeakingState(speaking: boolean) {
    if (!this.isMentorMuted) {
      this.isMentorSpeaking = speaking;
      this.updateAudioStatusUI();
    }
  }

  updateAudioStatusUI() {
    // Mentor row elements
    const mentorDot = this.shadowRoot?.querySelector("#mentor-status-dot") as HTMLElement;
    const mentorText = this.shadowRoot?.querySelector("#mentor-status-text") as HTMLElement;
    const mentorBtn = this.shadowRoot?.querySelector("#mentor-audio-btn") as HTMLElement;
    const mentorIconOn = this.shadowRoot?.querySelector("#mentor-icon-on") as HTMLElement;
    const mentorIconMuted = this.shadowRoot?.querySelector("#mentor-icon-muted") as HTMLElement;

    // Mic row elements
    const micDot = this.shadowRoot?.querySelector("#mic-status-dot") as HTMLElement;
    const micText = this.shadowRoot?.querySelector("#mic-status-text") as HTMLElement;
    const micBtn = this.shadowRoot?.querySelector("#mic-audio-btn") as HTMLElement;
    const micIconOn = this.shadowRoot?.querySelector("#mic-icon-on") as HTMLElement;
    const micIconMuted = this.shadowRoot?.querySelector("#mic-icon-muted") as HTMLElement;

    // Update mentor row
    if (mentorDot && mentorText && mentorBtn) {
      mentorDot.classList.remove("muted", "speaking");
      mentorText.classList.remove("speaking");
      mentorBtn.classList.remove("muted");

      if (this.isMentorMuted) {
        mentorDot.classList.add("muted");
        mentorBtn.classList.add("muted");
        mentorText.textContent = "Mentor muted";
        if (mentorIconOn) mentorIconOn.style.display = "none";
        if (mentorIconMuted) mentorIconMuted.style.display = "block";
      } else if (this.isMentorSpeaking) {
        mentorDot.classList.add("speaking");
        mentorText.classList.add("speaking");
        mentorText.textContent = "Mentor speaking";
        if (mentorIconOn) mentorIconOn.style.display = "block";
        if (mentorIconMuted) mentorIconMuted.style.display = "none";
      } else {
        mentorText.textContent = "Mentor audio on";
        if (mentorIconOn) mentorIconOn.style.display = "block";
        if (mentorIconMuted) mentorIconMuted.style.display = "none";
      }
    }

    // Update mic row
    if (micDot && micText && micBtn) {
      micDot.classList.remove("muted", "speaking");
      micText.classList.remove("speaking");
      micBtn.classList.remove("muted");

      if (this.isMicMuted) {
        micDot.classList.add("muted");
        micBtn.classList.add("muted");
        micText.textContent = "Muted";
        if (micIconOn) micIconOn.style.display = "none";
        if (micIconMuted) micIconMuted.style.display = "block";
      } else if (this.isMicSpeaking) {
        micDot.classList.add("speaking");
        micText.classList.add("speaking");
        micText.textContent = "Speaking";
        if (micIconOn) micIconOn.style.display = "block";
        if (micIconMuted) micIconMuted.style.display = "none";
      } else {
        micText.textContent = "Mic on";
        if (micIconOn) micIconOn.style.display = "block";
        if (micIconMuted) micIconMuted.style.display = "none";
      }
    }
  }

  stopScreenSharing() {
    if (this.isInIframe()) {
      // Send message to parent to stop screen sharing
      window.parent.postMessage(
        {
          type: "MENTOR:SCREENSHARING_STOPPED",
        },
        "*"
      );
    }
    // Close the popup window if still open
    const popup = this.getPopupWindow();
    if (popup && !popup.closed) {
      popup.close();
    }
    localStorage.removeItem(POPUP_STORAGE_KEY);
    this.popupWindow = null;
    // Hide the overlay and restore iframe
    this.hideScreenSharingOverlay();
    this.sentOpenNewWindowForScreenShare = false;
    localStorage.removeItem(SCREEN_SHARING_STORAGE_KEY);
  }

  toggleMute() {
    // Optimistically toggle the mute state immediately for responsive UI
    this.updateMicMutedState(!this.isMicMuted);

    const message = { type: "MENTOR:SCREENSHARING_MUTED" };

    if (this.isInIframe()) {
      // Send to parent window
      window.parent.postMessage(message, "*");
    } else {
      // Send to popup window if it exists
      const popup = this.getPopupWindow();
      if (popup && !popup.closed) {
        popup.postMessage(message, "*");
      }
    }
  }

  toggleMentorMute() {
    // Optimistically toggle the mentor mute state immediately for responsive UI
    this.updateMentorMutedState(!this.isMentorMuted);

    const message = { type: "MENTOR:SCREENSHARING_MENTOR_MUTED" };

    if (this.isInIframe()) {
      window.parent.postMessage(message, "*");
    } else {
      const popup = this.getPopupWindow();
      if (popup && !popup.closed) {
        popup.postMessage(message, "*");
      }
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
