import { DiscordRequest, updateRank } from './utils.js'
import { sheets, spreadsheetId, auth } from './sheetsClient.js'

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
      ranges: [`Ranks!A1:D5`],
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
    ([name, id, rank, subrank]) => ({
      name,
      id,
      rank: Number(rank),
      subrank: Number(subrank),
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

        if (player.rank === undefined) {
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
          ? `${player.name} has moved up to ${rankNames[rank]} ${subrank} 🎉`
          : `${player.name} has dropped to ${rankNames[rank]} ${subrank} 😔`
        player.rank = rank
        player.subrank = subrank

        await updateRank(index + 1, rank, subrank)

        await DiscordRequest(
          `channels/${process.env.DISCORD_CHANNEL_ID}/messages`,
          {
            method: 'POST',
            body: {
              embeds: [
                {
                  title: statement,
                  image: {
                    url: `https://api.deadlock-api.com/v1/assets/ranks/${rankNames[rank]}/${subrank}/image?format=webp`,
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
