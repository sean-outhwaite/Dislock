import 'dotenv/config'
import express from 'express'
import {
  ButtonStyleTypes,
  InteractionResponseFlags,
  InteractionResponseType,
  InteractionType,
  MessageComponentTypes,
  verifyKeyMiddleware,
} from 'discord-interactions'
import { getRandomEmoji, DiscordRequest } from './utils.js'
import { google } from 'googleapis'

// Create an express app
const app = express()
// Get port, or default to 3000
const PORT = process.env.PORT || 3000
// To keep track of our active games
const activeGames = {}

/**
 * Interactions endpoint URL where Discord will send HTTP requests
 * Parse request body and verifies incoming requests using discord-interactions package
 */

app.get('/interactions', (req, res) => {
  res.send('Hello World!')
})

app.post(
  '/interactions',
  verifyKeyMiddleware(process.env.PUBLIC_KEY),
  async function (req, res) {
    // Interaction id, type and data
    const { id, type, data } = req.body

    /**
     * Handle verification requests
     */
    if (type === InteractionType.PING) {
      return res.send({ type: InteractionResponseType.PONG })
    }

    /**
     * Handle slash command requests
     * See https://discord.com/developers/docs/interactions/application-commands#slash-commands
     */
    if (type === InteractionType.APPLICATION_COMMAND) {
      const { name } = data

      // "test" command
      if (name === 'test') {
        // Send a message into the channel where command was triggered from
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            flags: InteractionResponseFlags.IS_COMPONENTS_V2,
            components: [
              {
                type: MessageComponentTypes.TEXT_DISPLAY,
                // Fetches a random emoji to send from a helper function
                content: `hello world ${getRandomEmoji()}`,
              },
            ],
          },
        })
      }

      if (name === 'dislock') {
        // Trigger a modal to collect info
        return res.send({
          type: InteractionResponseType.MODAL,
          data: {
            custom_id: 'dislock_modal',
            title: 'Dislock Infraction',
            components: [
              {
                type: 18, // ComponentType.LABEL
                label: 'Whomst',
                description: 'Select the naughty boy',
                component: {
                  type: 5, // ComponentType.USER_SELECT
                  custom_id: 'user_select',
                  placeholder: 'Select a user',
                },
              },
              {
                type: 18, // ComponentType.LABEL
                label: 'Claimed Arrival Time',
                description: '24H format plz',
                component: {
                  type: 4, // ComponentType.TEXT_INPUT
                  custom_id: 'arrival_time',
                  style: 2,
                  min_length: 5,
                  max_length: 5,
                  placeholder: `22:13`,
                  required: true,
                },
              },
            ],
          },
        })
      }

      console.error(`unknown command: ${name}`)
      return res.status(400).json({ error: 'unknown command' })
    }

    if (type === InteractionType.MESSAGE_COMPONENT) {
      // custom_id set in payload when sending message component
      const componentId = data.custom_id

      if (componentId.startsWith('arrived_button')) {
        const sheetRange = componentId.replace('arrived_button_', '')
        const endpoint = `webhooks/${process.env.APP_ID}/${req.body.token}/messages/${req.body.message.id}`

        try {
          // Tell discord we'll update the message later
          await res.send({
            type: InteractionResponseType.DEFERRED_UPDATE_MESSAGE,
          })
          // Update sheets
          const sheets = google.sheets('v4')
          const spreadsheetId = process.env.SPREADSHEET_ID
          const auth = new google.auth.GoogleAuth({
            keyFile: 'secret-key.json',
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
          })

          const row = [
            [
              null,
              null,
              null,
              null,
              `${new Date().toLocaleTimeString('en-NZ', {
                timeZone: 'Pacific/Auckland',
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
              })}`,
              '',
              null,
            ],
          ]
          const body = {
            values: row,
          }

          try {
            await sheets.spreadsheets.values.update({
              auth,
              spreadsheetId,
              range: sheetRange,
              requestBody: body,
              valueInputOption: 'USER_ENTERED',
            })
          } catch (err) {
            console.error('Error appending to sheet:', err)
          }

          // Update message once the spreadsheet has updated
          await DiscordRequest(endpoint, {
            method: 'PATCH',
            body: {
              components: [
                {
                  type: MessageComponentTypes.TEXT_DISPLAY,
                  content: 'The patron thanks you for your service.',
                },
              ],
            },
          })
        } catch (err) {
          console.error('Error sending message:', err)
        }
      }
      return
    }

    if (type === InteractionType.MODAL_SUBMIT) {
      const userID = data.components[0].component.values[0]
      try {
        const sheets = google.sheets('v4')
        const spreadsheetId = process.env.SPREADSHEET_ID
        const auth = new google.auth.GoogleAuth({
          keyFile: 'secret-key.json',
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        })

        // Get user info for who is on the way
        const getUser = async () => {
          const user = await DiscordRequest(`users/${userID}`, {
            method: 'GET',
          })
          return user.json()
        }
        const user = await getUser()
        // Assemble row to append to spreadsheet
        const row = [
          [
            `${new Date().toDateString()}`,
            `${user.global_name || user.username}`,
            `${new Date().toLocaleTimeString('en-NZ', {
              timeZone: 'Pacific/Auckland',
              hour12: false,
              hour: '2-digit',
              minute: '2-digit',
            })}`,
            `${data.components[1].component.value}`,
            '',
            '',
            'Has to play Ivy',
          ],
        ]

        const body = {
          values: row,
        }

        let sheetsRes
        // Append row to sheet
        try {
          const res = await sheets.spreadsheets.values.append({
            auth,
            spreadsheetId,
            range: 'Tardiness',
            requestBody: body,
            valueInputOption: 'USER_ENTERED',
          })
          sheetsRes = res.data.updates.updatedRange
        } catch (err) {
          console.error('Error appending to sheet:', err)
        }
        // Send confirmation message with "arrived" button
        await res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            flags: InteractionResponseFlags.IS_COMPONENTS_V2,
            components: [
              {
                type: MessageComponentTypes.TEXT_DISPLAY,
                content: "What's the plan?",
              },
              {
                type: MessageComponentTypes.ACTION_ROW,
                components: [
                  {
                    type: MessageComponentTypes.BUTTON,
                    style: ButtonStyleTypes.PRIMARY,
                    custom_id: `arrived_button_${sheetsRes}`,
                    label: 'Good Job',
                  },
                ],
              },
            ],
          },
        })
      } catch (err) {
        console.error('Error sending message:', err)
      }

      return
    }

    console.error('unknown interaction type', type)
    return res.status(400).json({ error: 'unknown interaction type' })
  }
)

app.listen(PORT, () => {
  console.log('Listening on port', PORT)
})
