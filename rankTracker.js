import 'dotenv/config'
import { DiscordRequest, updateRank } from './utils.js'
import { sheets, auth } from './sheetsClient.js'

const spreadsheetId = process.env.PRIVATE_SPREADSHEET_ID

const rankNames = [
  'Obscurus',
  'Initiate',
  'Seeker',
  'Acolyte',
  'Sentinel',
  'Mystic',
  'Ritualist',
  'Emissary',
  'Oracle',
  'Phantom',
  'Ascendant',
  'Eternus',
]

export default async function rankTracker() {
  let response
  try {
    response = await sheets.spreadsheets.values.batchGet({
      auth,
      spreadsheetId,
      ranges: [`Ranks!A1:E5`],
    })
  } catch (error) {
    console.error('Error fetching player data from Google Sheets:', error)
    return
  }

  if (!response.data.valueRanges || response.data.valueRanges.length === 0) {
    console.error('No data found in the specified range.')
    return
  }

  const players = response.data.valueRanges[0].values.map(
    ([name, id, rank, subrank, discordID]) => ({
      name,
      id,
      rank: Number(rank),
      subrank: Number(subrank),
      discordID,
    }),
  )

  await Promise.all(
    players.map(async (player, index) => {
      try {
        const res = await fetch(
          `https://api.deadlock-api.com/v1/players/${player.id}/rank`,
        )
        if (!res.ok) throw new Error('Failed to fetch player rank')
        const { rank, subrank } = await res.json()

        if (Number.isNaN(player.rank)) {
          player.rank = rank
          player.subrank = subrank
          await updateRank(index + 1, rank, subrank)
          return
        }

        if (player.rank === rank && player.subrank === subrank) return

        const rankUp =
          player.rank < rank ||
          (player.rank === rank && player.subrank < subrank)
        const statement = rankUp
          ? `Ranked up to **${rankNames[rank]} ${subrank} 🎉**`
          : `Dropped down to **${rankNames[rank]} ${subrank} 😔**`
        player.rank = rank
        player.subrank = subrank

        await updateRank(index + 1, rank, subrank)

        const getDiscordUser = async () => {
          const user = await DiscordRequest(`users/${player.discordID}`, {
            method: 'GET',
          })
          return user.json()
        }
        const user = await getDiscordUser()

        await DiscordRequest(
          `channels/${process.env.DISCORD_CHANNEL_ID}/messages`,
          {
            method: 'POST',
            body: {
              embeds: [
                {
                  description: statement,
                  author: {
                    name: user.global_name || user.username,
                    icon_url: `https://cdn.discordapp.com/avatars/692591564643368971/${user.avatar}.png`,
                  },
                  thumbnail: {
                    url: `https://api.deadlock-api.com/v1/assets/ranks/${rank}/${subrank}/image?format=webp`,
                  },
                },
              ],
            },
          },
        )
      } catch (error) {
        console.error(`Error fetching rank for ${player.name}:`, error)
      }
    }),
  )
}
