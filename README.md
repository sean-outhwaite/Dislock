# 👁️ Dislock

Discord bot that collects "infraction" / tardiness data via a discord modal, and writes/updates rows in a Google Sheet. Also keeps track of player ranks and posts updates to single channel.

It will also send a message in the channel, with a button that can be pressed to log actual arrival time. Calculates the delta between the claimed and actual arrival times, updates the record in the sheet, and edits the message in discord to note that it's been recorded.

Useful for gathering evidence and being smug when your friends say they're 5 minutes away from starting a game of Deadlock but for some reason take longer than 5 minutes.

Rank tracking is handled with a GitHub action triggered by a cron job.

## Technology

![Node.Js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB)
![Discord APIs](https://img.shields.io/badge/Discord-5865F2?style=flat&logo=discord&logoColor=white)
![Google Cloud](https://img.shields.io/badge/Google_Cloud-4285F4?style=flat&logo=google-cloud&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/github%20actions-%232671E5.svg?style=for-the-badge&logo=githubactions&logoColor=white)
