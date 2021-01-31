module.exports = {
    name: 'kick',
    aliases: ['k'],
    cooldown: 10,
    description: 'Untuk mengeluarkan angota di group\nPenggunaan: !kick _quoted/tag_',
    execute (client: any, chat: any, pesan: any) {
        if (!client.isGroup) return client.reply(pesan.error.group)
        if (!client.isGroupAdmins) return client.reply(pesan.hanya.admin)
        if (!client.isBotGroupAdmins) return client.reply(pesan.hanya.botAdmin)
        if (chat.message.extendedTextMessage === undefined || chat.message.extendedTextMessage === null) return client.reply('Tag target yang ingin di tendang!')
        const mentions = client.quotedId || client.mentioned
        let mentioned
        if (!Array.isArray(mentions)) {
            mentioned = []
            mentioned.push(mentions)
        } else {
            mentioned = mentions
        }
        if (mentioned.includes(client.botNumber)) return client.reply('UDAH BOCIL KEK KONTOL IDUP PULA')
        if (mentioned.length > 1) {
            let teks = 'Perintah di terima, mengeluarkan :\n'
            for (const _ of mentioned) {
                teks += `@${_.split('@')[0]}\n`
            }
            client.mentions(teks, mentioned, true)
            client.groupRemove(client.from, mentioned)
        } else {
            client.mentions(`Perintah di terima, mengeluarkan : @${mentioned[0].split('@')[0]}`, mentioned, true)
            client.groupRemove(client.from, mentioned)
        }
    }
}