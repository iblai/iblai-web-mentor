[2.3.1]

- fix: close popup window when stopping screen sharing in standalone mode (non-iframe)
- feat: persist screen sharing overlay state across page refreshes using localStorage
- fix: set sentOpenNewWindowForScreenShare flag in non-iframe path for screen share requests

[2.3.0]

- feat: add screen sharing overlay UI when MENTOR:SCREENSHARING_STARTED is received after sending ACTION:OPEN_NEW_WINDOW
- feat: hide iframe and show overlay with "Screen Sharing Active" message and stop button
- feat: send MENTOR:SCREENSHARING_STOPPED to parent when user clicks stop screen sharing
- feat: restore iframe dimensions when MENTOR:SCREENSHARING_STOPPED is received from parent

[2.2.5]

- chore: more checks to ensure that if there is no way to take the user due to LMS session being lost, we'll tell the user to refresh

[2.2.4]

- chore: add div to show message asking the user to refresh the page when rely on host for auth and there is an error fetching user tenants

[2.2.3]

- fix: update userobject variable when user in canvas matches user from iframed mentor

[2.2.2]

- feat: store popup reference in localStorage and send host context to popup

[2.2.1]

- feat: trigger chat action popup with user data in url

[2.2.0]

- feat: implement voice call and screensharing opening in another tab if enabled
- fix: 401 on getting user platforms now triggering redirect to auth SPA

[2.1.2]

- chore: adds display-capture \* to iframe allow attributes

[2.1.1]

- chore: adds microphone _; camera _; midi _; geolocation _; encrypted-media \* to iframe allow attributes

[2.1.0]

- only try to fetch user data when receive message of authExpired

[2.0.1]

- don't pass the component param when component passed to getParamsComponent function is undefined or null

[2.0.0]

- prefix all post message types with MENTOR:
- Compartible with the new IBL NEXTJS MENTORAI

[1.3.6]

- adds documentfilter prop
- send documentfilter to mentor on attribute change or when mentor is loaded

[1.3.5]

- forward message about closing embed to parent window

[1.3.4]

-adds extraparams prop

[1.3.3]

- fix: chat component should not hide header and side nav

[1.3.1]

- removes data layer dependency

[1.3.0]

-adds edxusageid and edxcourseid props and pass down to mentor

[1.2.5]

- adds types.d.ts

[1.2.4]

- adds strong typing for typescript compartibility with consuming projects

[1.2.3]

- add mentor as default for `getUrlFromComponent` function

[1.2.2]

- adds mentor prop to the `getUrlFromComponent` function

[1.2.1]

- adds recent-messages iframe
- adds explore iframe
- adds prompt-gallery iframe

[1.2.0]

- adds spinner while mentor iframe loads

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
