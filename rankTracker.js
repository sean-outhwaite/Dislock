import { DiscordRequest, updateRank, getDiscordUser } from './utils.js'
import {
  sheets,
  auth,
  privateSpreadsheetId as spreadsheetId,
} from './sheetsClient.js'

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

        let author = { name: player.name }
        try {
          const user = await getDiscordUser(player.discordID)
          author = {
            name: user.global_name || user.username,
            icon_url: user.avatar
              ? `https://cdn.discordapp.com/avatars/${player.discordID}/${user.avatar}.png`
              : undefined,
          }
        } catch (error) {
          console.error(
            `Error fetching Discord user for ${player.name}:`,
            error,
          )
        }

        await DiscordRequest(
          `channels/${process.env.DISCORD_CHANNEL_ID}/messages`,
          {
            method: 'POST',
            body: {
              embeds: [
                {
                  description: statement,
                  author,
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
