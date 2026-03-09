# MentorAI Web Component

The `MentorAI` web component is a customizable chat widget that can be embedded in any web application. This component is distributed via npm and can also be accessed directly via a bundled JavaScript file hosted on an S3 bucket.

---

## Features

- Embeddable chat widget.
- Configurable via attributes.
- Supports authenticated and anonymous modes.
- Context-aware functionality for dynamic page data exchange.

---

## Installation

### Using npm

```bash
npm install @iblai/iblai-web-mentor
```

### Direct Usage via S3

Include the bundled script in your HTML file:

```bash
<script src="https://assets.ibl.ai/web/mentorai.js?versionId=LaZKI7VC02L5buFhcIcaKiBKf4SyjTkD"></script>
```

## Usage

### Vanilla Javascript

Include the component directly in your HTML:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script src="https://mentor-ai.s3.us-east-1.amazonaws.com/ibai-web-mentor.cjs"></script>
    <title>MentorAI Widget</title>
  </head>
  <body>
    <mentor-ai
      mentorurl="https://mentor.iblai.app"
      authurl="https://auth.iblai.app"
      lmsurl="https://learn.iblai.app"
      tenant="your-tenant"
      mentor="mentor-id"
      isanonymous
      iscontextaware
      isadvanced
      theme="light"
    ></mentor-ai>
  </body>
</html>
```

### Attributes

| Attribute               | Description                                                                                                                                         | Type    | Default Value            |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------------------------ |
| mentorurl               | URL of the MentorAI platform.                                                                                                                       | String  | https://mentor.iblai.app |
| tenant                  | Tenant name for authentication.                                                                                                                     | String  | undefined                |
| mentor                  | Mentor name for the chat widget.                                                                                                                    | String  | undefined                |
| isanonymous             | Enables anonymous mode. If set, the component will not require user authentication. (Ensure this matches the anonymity of the mentor)               | Boolean | false                    |
| iscontextaware          | Enables context-aware functionality to send page information to the iframe.                                                                         | Boolean | false                    |
| isadvanced              | Enables advanced chat features.                                                                                                                     | Boolean | false                    |
| authUrl                 | URL for authentication.                                                                                                                             | String  | https://auth.iblai.app   |
| contextOrigins          | Comma separated values indicating the origins whitelisted for sending context. Defaults to an empty string.                                         | String  | ""                       |
| lmsUrl                  | URL for edX LMS.                                                                                                                                    | String  | learn.iblai.app          |
| authRelyOnHost          | Used to determine if to solely depend on the host for authentication and prevent mentor iframe from redirecting to the auth SPA.                    | Boolean | false                    |
| edxUserId               | Indicates the user id on edX. Optional.                                                                                                             | String  | undefined                |
| theme                   | Sets the theme of the component. Can be either `light` or `dark`.                                                                                   | String  | light                    |
| component               | Specifies the component to display in the mentor application. Can be one of `analytics-overview`, `analytics-users`, `analytics-topics`, or `chat`. | String  | chat                     |
| redirectToken           | A token used by the auth layer to redirect back to the equivalent set URL.                                                                          | String  | undefined                |
| enablechatactionpopup   | Enables chat action popups for voice calls and screen sharing. When enabled, sends `MENTOR:ENABLE_CHAT_ACTION_POPUPS` message to the iframe.       | Boolean | false                    |
| contextsettings         | Enables the LMS context settings view. When present, renders a settings form **instead of** the chat iframe.                                       | Boolean | false                    |
| contextid               | The LMS context/course identifier. Displayed in the heading and sent with the settings API request. Used with `contextsettings`.                   | String  | undefined                |
| contextenabled          | Sets the initial state of the Enabled checkbox in the context settings view. Present = checked, absent = unchecked. Used with `contextsettings`.   | Boolean | false                    |

---

## LMS Context Settings View

When the `contextsettings` attribute is present, the component renders a settings form **instead of** the chat iframe. This view is designed for instructors in external LMS systems (e.g. Canvas, Open edX) who need to configure whether the mentor AI widget should be enabled or disabled for a specific course or context.

### What the Settings Form Displays

- A heading showing the Context ID (e.g. "Editing LMS Context Id: 110")
- An **Enabled** checkbox to toggle whether the mentor widget is active for this context
- A **Mentor ID** text input to specify which mentor to use
- A **Save** button that submits the configuration via a POST request

### How It Works

1. The instructor sees a form pre-populated with the provided attribute values (enabled state, mentor ID).
2. They can toggle the **Enabled** checkbox and/or change the **Mentor ID**.
3. Clicking **Save** sends a POST request to:
   ```
   {lmsurl}/api/mentor-xblock/orgs/{tenant}/context/?context_id={contextid}
   ```
   with a JSON body:
   ```json
   {
     "enabled": true,
     "mentor_id": "744a3672-0a59-4cc9-ad5a-03ada402a658"
   }
   ```
4. On success (HTTP 200), a green "Settings saved successfully" message is displayed.
5. On error, the component displays the error message from the response payload (e.g. `{"error": "Mentor ID must be a valid UUID"}`), or a generic "An unknown error occurred" message if no specific error is returned.

### Required Attributes for Context Settings

| Attribute         | Required | Description                                                                 |
| ----------------- | -------- | --------------------------------------------------------------------------- |
| `contextsettings` | Yes      | Boolean flag that enables the context settings view.                        |
| `contextid`       | Yes      | The LMS context/course identifier displayed in the heading.                 |
| `lmsurl`          | Yes      | Base URL of the LMS, used to construct the API endpoint.                    |
| `tenant`          | Yes      | Platform/organization key, used in the API endpoint path.                   |
| `mentor`          | Yes      | The initial Mentor UUID pre-filled in the Mentor ID input field.            |
| `contextenabled`  | No       | If present, the Enabled checkbox is initially checked. Otherwise unchecked. |

### Context Settings Examples

#### Enabled context with a pre-filled mentor

```html
<mentor-ai
  contextsettings
  contextid="110"
  contextenabled
  lmsurl="https://learn.iblai.app"
  tenant="my-org"
  mentor="744a3672-0a59-4cc9-ad5a-03ada402a658"
></mentor-ai>
```

This renders the form with the Enabled checkbox **checked** and the Mentor ID field pre-filled with the provided UUID.

#### Disabled context with no mentor

```html
<mentor-ai
  contextsettings
  contextid="205"
  lmsurl="https://learn.iblai.app"
  tenant="my-org"
  mentor=""
></mentor-ai>
```

This renders the form with the Enabled checkbox **unchecked** and an empty Mentor ID field.

#### React usage

```jsx
import React from "react";
import "@iblai/iblai-web-mentor";

const CourseSettings = ({ contextId, mentorId, isEnabled }) => {
  return (
    <mentor-ai
      contextsettings
      contextid={contextId}
      {...(isEnabled ? { contextenabled: "" } : {})}
      lmsurl="https://learn.iblai.app"
      tenant="my-org"
      mentor={mentorId}
    ></mentor-ai>
  );
};
```

---

## Javascript Frameworks

### React

Install the package:

```bash
npm install @iblai/iblai-web-mentor
```

Use the component

```jsx
import React from "react";
import "@iblai/iblai-web-mentor";

const App = () => {
  return (
    <div>
      <mentor-ai
        mentorurl="https://mentor.iblai.app"
        authurl="https://auth.iblai.app"
        lmsurl="https://learn.iblai.app"
        tenant="your-tenant"
        mentor="mentor-id"
        isanonymous
        iscontextaware
        isadvanced
        theme="light"
      ></mentor-ai>
    </div>
  );
};

export default App;
```

### Angular

Install the package:

```bash
npm install @iblai/iblai-web-mentor
```

Use the component in your template:

```html
<mentor-ai
  mentorurl="https://mentor.iblai.app"
  authurl="https://auth.iblai.app"
  lmsurl="https://learn.iblai.app"
  tenant="your-tenant"
  mentor="mentor-id"
  isanonymous
  iscontextaware
  isadvanced
  theme="light"
></mentor-ai>
```

Add `CUSTOM_ELEMENTS_SCHEMA` in your module:

```typescript
import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from "@angular/core";

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  bootstrap: [AppComponent],
})
export class AppModule {}
```

### Vue

Install the package:

```bash
npm install @iblai/iblai-web-mentor
```

Use the component:

```jsx
<template>
  <mentor-ai
    mentorurl="https://mentor.iblai.app"
    authurl="https://auth.iblai.app"
    lmsurl="https://learn.iblai.app"
    tenant="your-tenant"
    mentor="mentor-id"
    isanonymous
    iscontextaware
    isadvanced
    theme="light"
  ></mentor-ai>
</template>

<script>
export default {
  name: "App",
};
</script>
```

## Context Sharing

This section describes the context sharing functionality implemented in the application, which allows for sharing HTML content between iframes and their parent windows.

### Functions

1. **MentorAI.sendHTMLContentToHost(host: string, interval: number = 5000)**

   This function is used when the application is running inside an iframe and needs to share the page content with the host. It creates a Web Worker to clean the HTML content before sending it to the host.

   - **Parameters:**

     - `host`: The target host to which the cleaned content will be sent.
     - `interval`: The time interval (in milliseconds) for checking and sending content (default is 5000 ms).

   - **Usage:**
     ```javascript
     MentorAI.sendHTMLContentToHost("https://example.com", 5000);
     ```

2. **MentorAI.sendHTMLContentToIframe(iframeId: string, iframeHost: string, interval = 5000)**

   This function allows the application to send HTML content to a specified iframe. It also utilizes a Web Worker for cleaning the content before sending it.

   - **Parameters:**

     - `iframeId`: The ID of the iframe element to which the content will be sent.
     - `iframeHost`: The host of the iframe.
     - `interval`: The time interval (in milliseconds) for checking and sending content (default is 5000 ms).

   - **Usage:**
     ```javascript
     MentorAI.sendHTMLContentToIframe(
       "myIframe",
       "https://iframe-host.com",
       5000
     );
     ```

3. **MentorAI.proxyContextPostMessage(targetIdOrHost: string, host?: string)**

   This function proxies post messages of type _context_ either to an iframe or to the parent window, depending on the context in which it is called. It listens for incoming messages and forwards them accordingly.

   - **Parameters:**

     - `targetIdOrHost`: The ID of the target iframe or the host to which the message should be sent.
     - `host`: An optional parameter specifying the host to which the message will be sent.

   - **Usage:**
     ```javascript
     MentorAI.proxyContextPostMessage("myIframe", "https://iframe-host.com");
     ```
