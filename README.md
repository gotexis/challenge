# Socket.IO, fullstack, typescript, Frontend / Backend testing

## How to run

```sh
yarn # will install pkgs both frontend and backend
yarn test
yarn dev # Backend & frontend
```

## Requirements ✅
The stack should consist of two parts - a front-end client and an
API/server.

Client / Front-end
- Should be a ReactJS SPA application.
- You can use Foundation, Bootstrap or any other style framework to
  help you.
- We expect the application to be fully responsive.
- Should have two main states. An inactive dialler state and an
  active in-call state.
- A user should be able to dial a number (format irrelevant, think of
  it as an ID -- these can be auto assigned to the clients).
- If the destination recipient is online/connected, they should
  receive an incoming call that they can either accept or decline.
- Accepting a call should set up an audio only WebRTC stream
  between the

Backend
- The backend/server should handle events between clients and act
  as the “middleman”.
- In terms of event implementation, it’s up to you, but we
  recommend using sockets.

## What We’re Looking For 🔍

We like things that look good but don’t go overboard with the UI
design. This is more of a test of your code than your UI design skills.

We’re looking for good code quality. This means readable code, clear,
concise logic and good application structure. What makes clean,
production-ready code? Think of these things and make sure you try and
use them in your solution.

Tests. You don’t need 100% code coverage, but we expect at least one
useful front-end and one useful back-end test.