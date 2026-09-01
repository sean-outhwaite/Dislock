import { google } from 'googleapis'

export const sheets = google.sheets('v4')
export const spreadsheetId = process.env.SPREADSHEET_ID
export const auth = new google.auth.GoogleAuth({
  keyFile: 'secret-key.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
})
