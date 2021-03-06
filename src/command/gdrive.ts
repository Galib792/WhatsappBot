/*
 * This file is part of the KryPtoN Bot WA distribution (https://github.com/Kry9toN/KryPtoN-WhatsApp-Bot).
 * Copyright (c) 2021 Dhimas Bagus Prayoga.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3.
 *
 * This program is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

import { MessageType } from '@adiwajshing/baileys'
import fs from 'fs'
import path from 'path'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { google } = require('googleapis')
import { term } from '../utils/functions'
import mime from 'mime-types'
import i18n from 'i18n'

module.exports = {
    name: 'gdrive',
    aliases: ['gd'],
    description: 'gdrive.desc',
    async execute (client: any, chat: any, pesan: any, args: any) {
        if (!client.isOwner && !client.isSudo) return client.reply(i18n.__('gdrive.vip'))
        // If modifying these scopes, delete token.json.
        const SCOPES = ['https://www.googleapis.com/auth/drive']
        // The file token.json stores the user's access and refresh tokens, and is
        // created automatically when the authorization flow completes for the first
        // time.
        const TOKEN_PATH = path.join(__dirname, '../../token.json')
        const BASE_GD = 'https://drive.google.com/uc?id={}&export=download'

        /**
         * Create an OAuth2 client with the given credentials, and then execute the
         * given callback function.
         * @param {Object} credentials The authorization client credentials.
         * @param {function} callback The callback to call with the authorized client.
         */
        function authorize (credentials: any, callback: any) {
            // eslint-disable-next-line camelcase
            const { client_secret, client_id, redirect_uris } = credentials.installed
            const oAuth2Client = new google.auth.OAuth2(
                client_id, client_secret, redirect_uris[0])

            // Check if we have previously stored a token.
            fs.readFile(TOKEN_PATH, (err: any, token: any) => {
                if (err) return client.reply(i18n.__('gdrive.regenToken'))
                oAuth2Client.setCredentials(JSON.parse(token))
                callback(oAuth2Client)
            })
        }

        /**
             * Describe with given media and metaData and upload it using google.drive.create method()
             */
        async function uploadFile (auth: string) {
            const id = client.from
            const quoted = chat
            const url = args[0]
            client.reply(i18n.__('gdrive.start'))
            await term(`aria2c '${url}' --dir=$(pwd)/downloads`).then(() => {
                client.sendMessage(id, i18n.__('gdrive.finish'), MessageType.text, { quoted: quoted })
                client.sendMessage(id, i18n.__('gdrive.gdStart'), MessageType.text, { quoted: quoted })
            }).catch((err: string) => {
                client.log(err)
                client.sendMessage(id, i18n.__('gdrive.failed'), MessageType.text, { quoted: quoted })
                console.log(err)
            })

            await fs.readdir(path.join(__dirname, '../../downloads/'), async (err: any, nameFile: Array<any>) => {
                if (err) return client.reply(i18n.__('gdrive.notFound'))
                // 'files' is an array of the files found in the directory

                const name = nameFile[1]
                const drive = google.drive({ version: 'v3', auth })
                interface meta {
                    name: string;
                    [parent: string]: any;
                }
                const fileMetadata: meta = {
                    name: name
                }
                if (process.env.GD_ID_DIR !== 'undefined') {
                    fileMetadata.parent = [process.env.GD_ID_DIR]
                }
                const type = mime.lookup(path.join(__dirname, `../../downloads/${nameFile[1]}`))
                const media = {
                    mimeType: type,
                    body: fs.createReadStream(path.join(__dirname, `../../downloads/${nameFile[1]}`))
                }
                await drive.files.create({
                    resource: fileMetadata,
                    media: media,
                    fields: 'id, name',
                    supportsAllDrives: true
                }, (err: string, file: any) => {
                    if (err) {
                        // Handle error
                        console.error(err)
                        client.log(`${err}`)
                        client.sendMessage(id, i18n.__('gdrive.filedGD'), MessageType.text, { quoted: quoted })
                    } else {
                        client.sendMessage(id, i18n.__('gdrive.doneGD', { nameFile: file.data.name, link: BASE_GD.replace(/{}/g, file.data.id) }), MessageType.text, { quoted: quoted })
                        term('rm -rf downloads/*')
                    }
                })
            })
        }

        function listFiles (auth: string) {
            const drive = google.drive({ version: 'v3', auth })
            drive.files.list({
                pageSize: 10,
                fields: 'nextPageToken, files(id, name, mimeType, webViewLink, webContentLink)'
            }, (err: string, res: any) => {
                if (err) return client.reply(i18n.__('gdrive.apiErr', { err: err }))
                const files = res.data.files
                if (files.length) {
                    let text = i18n.__('gdrive.gdFile')
                    // eslint-disable-next-line array-callback-return
                    files.map((file: any) => {
                        if (file.mimeType == 'application/vnd.google-apps.folder') {
                            const link = file.webViewLink
                            text += `???? *${file.name}*\nLink: ${link}\n\n`
                        } else {
                            const link = file.webContentLink
                            text += `??????? *${file.name}*\nLink: ${link}\n\n`
                        }
                    })
                    client.reply(text)
                } else {
                    client.reply(i18n.__('gdrive.gdNoFile'))
                }
            })
        }

        /**
             * Describe with given media and metaData and upload it using google.drive.create method()
             */
        function createFolder (auth: string) {
            client.reply(pesan.tunggu)
            const name = args[1]
            const drive = google.drive({ version: 'v3', auth })
                interface meta {
                    name: any;
                    mimeType: string;
                    [parent: string]: any;
                }
                const fileMetadata: meta = {
                    name: name,
                    mimeType: 'application/vnd.google-apps.folder'

                }
                if (process.env.GD_ID_DIR !== 'undefined') {
                    fileMetadata.parent = [process.env.GD_ID_DIR]
                }
                drive.files.create({
                    resource: fileMetadata,
                    fields: 'webViewLink, name'
                }, (err: string, file: any) => {
                    if (err) {
                        // Handle error
                        console.error(err)
                        client.log(`${err}`)
                        client.reply(i18n.__('gdrive.gdDirErr'))
                    } else {
                        client.reply(i18n.__('gdrive.doneGD', { nameFolder: file.data.name, link: file.data.webViewLink }))
                    }
                })
        }

        if (args.length <= 1 && (client.isUrl(args[0]) || args[0].startsWith('magnet'))) {
            // Load client secrets from a local file.
            fs.readFile(path.join(__dirname, '../../credentials.json'), (err: any, content: any) => {
                if (err) return client.log(i18n.__('gdrive.secretErr', { err: err }))
                // Authorize a client with credentials, then call the Google Drive API.
                authorize(JSON.parse(content), uploadFile)
            })
        } else if (args[0] == 'auth') {
            if (args.length == 1) {
                fs.readFile(path.join(__dirname, '../../credentials.json'), (err: any, content: any) => {
                    if (err) return client.reply(i18n.__('gdrive.secretErr', { err: err }))
                    const credentials = JSON.parse(content)
                    // eslint-disable-next-line camelcase
                    const { client_secret, client_id, redirect_uris } = credentials.installed
                    const oAuth2Client = new google.auth.OAuth2(
                        client_id, client_secret, redirect_uris[0])
                    // Check if we have previously stored a token.
                    fs.readFile(TOKEN_PATH, (err: any) => {
                        if (err) {
                            const authUrl = oAuth2Client.generateAuthUrl({
                                access_type: 'offline',
                                scope: SCOPES
                            })
                            client.reply(i18n.__('gdrive.authUri', { url: authUrl }))
                        }
                    })
                })
            } else if (args.length > 1 && args[1] === 'token') {
                fs.readFile(path.join(__dirname, '../../credentials.json'), (err: any, content: any) => {
                    if (err) return client.reply(i18n.__('gdrive.secretErr', { err: err }))
                    const credentials = JSON.parse(content)
                    // eslint-disable-next-line camelcase
                    const { client_secret, client_id, redirect_uris } = credentials.installed
                    const oAuth2Client = new google.auth.OAuth2(
                        client_id, client_secret, redirect_uris[0])
                    const code = args[1] == 'token' ? args[2] : ''
                    oAuth2Client.getToken(code, (err: any, token: string) => {
                        if (err) return client.reply(i18n.__('gdrive.tokenErr', { err: err }))
                        oAuth2Client.setCredentials(token)
                        // Store the token to disk for later program executions
                        fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err: any) => {
                            if (err) return console.error(err)
                            client.reply(i18n.__('gdrive.tokenSuc'))
                        })
                    })
                })
            }
        } else if (args[0] == 'list') {
            // Load client secrets from a local file.
            fs.readFile(path.join(__dirname, '../../credentials.json'), (err: any, content: any) => {
                if (err) return client.log(i18n.__('gdrive.secretErr', { err: err }))
                // Authorize a client with credentials, then call the Google Drive API.
                authorize(JSON.parse(content), listFiles)
            })
        } else if (args.length > 1 && args[0] == 'mkdir') {
            // Load client secrets from a local file.
            fs.readFile(path.join(__dirname, '../../credentials.json'), (err: any, content: any) => {
                if (err) return client.log(i18n.__('gdrive.secretErr', { err: err }))
                // Authorize a client with credentials, then call the Google Drive API.
                authorize(JSON.parse(content), createFolder)
            })
        }
    }
}
