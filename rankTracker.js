import { DiscordRequest } from './utils.js'

let players = [
  {
    name: 'Swan',
    id: 64750041,
  },
  {
    name: 'Voa',
    id: 87195919,
  },
  {
    name: 'Crisps',
    id: 31475757,
  },
  {
    name: 'Dee',
    id: 54578031,
  },
  {
    name: 'Naked',
    id: 44801486,
  },
]

// TODO: Add colours to use as the message colour
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

// TODO: Persist rank data to the google sheet

export default async function rankTracker() {
  await Promise.all(
    players.map(async (player) => {
      try {
        const res = await fetch(
          `https://api.deadlock-api.com/v1/players/${player.id}/rank`,
        )
        if (!res.ok) throw new Error('Failed to fetch player rank')
        const { rank, subrank } = await res.json()

        if (player.rank === undefined) {
          player.rank = rank
          player.subrank = subrank
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
  console.log('Rank Tracker is running...')
}
