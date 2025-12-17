import 'dotenv/config'
import { InstallGlobalCommands } from './utils.js'

// Simple test command
const TEST_COMMAND = {
  name: 'test',
  description: 'Basic command',
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
}

const DISLOCK_COMMAND = {
  name: 'dislock',
  description: 'Log someone AFK in lane',
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
}

const ALL_COMMANDS = [DISLOCK_COMMAND]

InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS)
