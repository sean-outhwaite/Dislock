# Dislock

Discord interactions bot that collects "infraction" / tardiness data via a modal and buttons, and writes/updates rows in a Google Sheet.

Useful for gathering evidence and being smug when your friends say they're 5 minutes away from starting a game of Deadlock but for some reason take longer than 5 minutes.

Tech used

- Node.js (JavaScript)
- Express (server, `/interactions`)
- discord-interactions (request verification + types)
- googleapis (Sheets API via a service account)
- dotenv for environment variables
