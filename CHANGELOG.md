[1.0.11]

- updates: removes more irrelevant content from html content

[1.0.10]

- updates mentor-ai.d.ts with updated prop types

[1.0.9]

- exports proxyContextPostMessage globally

[1.0.8]

- adds edxUserId property (optional)
- checks that if edxUserId is passed, it matches that in the mentor, else fetch new tokens for current user

[1.0.6]

- adds lmsUrl and authRelyOnHost properties
- adds: fetch user platforms and tokens, push to auth SPA

[1.0.5]

- updates README.md
- exposes context sharing functions

[1.0.4]

- adds context-share.ts
- adds contextOrigins props to allow only specific origins to share context

[1.0.3]

- adds authrelyonhost to allow the host send it's localstorage data containing auth tokens required by the mentor

[1.0.2]

- clone the iframe contents in the host website and add as part of the page content

[1.0.1]

- Send host info to mentor every second regardless of url change. This is to fix the issue where page content is sent to mentor without iframe content because the iframe content hasn't loaded yet

[1.0.0]

- Introduces the mentor-ai web component
