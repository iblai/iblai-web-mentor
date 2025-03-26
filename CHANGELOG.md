[1.1.1]

- updates README.md

[1.1.0]

- adds spinner while the iframe loads
- adjust height of iframe as the embed grows

[1.0.16]

- adds theme prop to enable changing theme. Values could be 'light' or 'dark'

[1.0.15]

- removes console logs

[1.0.14]

- adds component prop to indicate the component of the mentor to display
- adds modal prop to indicate the modal to display

[1.0.13]

- updates: sendHTMLContentToIframe could now take as parameter an iframe element or an iframe ID

[1.0.12]

- fix: infinite reloading of the iframe with send tenant in userObject as tenant key instead of a stringified tenant object

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
