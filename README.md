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
npm install mentor-ai
```

### Direct Usage via S3

Include the bundled script in your HTML file:

```bash
<script src="https://mentor-ai.s3.us-east-1.amazonaws.com/mentor-ai.js"></script>
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
    <script src="https://your-s3-bucket-url/mentor-ai.js"></script>
    <title>MentorAI Widget</title>
  </head>
  <body>
    <mentor-ai
      mentorurl="https://mentor.iblai.app"
      tenant="your-tenant"
      mentor="mentor-id"
      isanonymous
      iscontextaware
      isadvanced
    ></mentor-ai>
  </body>
</html>
```

### Attributes

| Attribute      | Description                                                                                                                           | Type    | Default Value            |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------------------------ |
| mentorurl      | URL of the MentorAI platform.                                                                                                         | String  | https://mentor.iblai.app |
| tenant         | Tenant name for authentication.                                                                                                       | String  | undefined                |
| mentor         | Mentor name for the chat widget.                                                                                                      | String  | undefined                |
| isanonymous    | Enables anonymous mode. If set, the component will not require user authentication. (Ensure this matches the anonymity of the mentor) | Boolean | false                    |
| iscontextaware | Enables context-aware functionality to send page information to the iframe.                                                           | Boolean | false                    |
| isadvanced     | Enables advanced chat features.                                                                                                       | Boolean | false                    |
| authUrl        | URL for authentication.                                                                                                               | String  | https://auth.iblai.app   |

## Javascript Frameworks

### React

Install the package:

```bash
npm install mentor-ai
```

Use the component

```jsx
import React from "react";
import "mentor-ai";

const App = () => {
  return (
    <div>
      <mentor-ai
        mentorurl="https://mentor.iblai.app"
        authUrl="https://auth.iblai.app"
        tenant="your-tenant"
        mentor="mentor-name"
        isanonymous
        iscontextaware
        isadvanced
      ></mentor-ai>
    </div>
  );
};

export default App;
```

### Angular

Install the package:

```bash
npm install mentor-ai
```

Use the component in your template:

```html
<mentor-ai
  mentorurl="https://mentor.iblai.app"
  authUrl="https://auth.iblai.app"
  tenant="your-tenant"
  mentor="mentor-id"
  isanonymous
  iscontextaware
  isadvanced
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
npm install mentor-ai
```

Use the component:

```jsx
<template>
  <mentor-ai
    mentorurl="https://mentor.iblai.app"
    authUrl="https://auth.iblai.app"
    tenant="your-tenant"
    mentor="mentor-id"
    isanonymous
    iscontextaware
    isadvanced
  ></mentor-ai>
</template>

<script>
export default {
  name: "App",
};
</script>
```
