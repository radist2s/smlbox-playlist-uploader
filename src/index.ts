import {config} from 'dotenv'
import fetch, {Response} from 'node-fetch'
import {DOMParserImpl} from 'xmldom-ts'
import {queryString as objectToQueryString} from 'object-query-string'
import cheerio from 'cheerio'
import iptvPlaylistParser from 'iptv-playlist-parser'

export interface DotEnvConfig {
    sml_source_playlist_xspf?: string
    sml_source_playlist_m3u?: string
    sml_baseurl: string
    sml_cookie_username: string
    sml_cookie_password: string
    sml_replacements?: string
}

export interface Channel {
    location: string
    title: string
}

export const env = (config().parsed as any) as DotEnvConfig

export const smlBoxBaseUrl = env?.sml_baseurl // no trailing slash

export const smlBoxUrls = {
    add: `${smlBoxBaseUrl}/channel/add`,
    availableChannels: `${smlBoxBaseUrl}/channel/new`,
    added: `${smlBoxBaseUrl}/channel/list`
}

export async function fetchSmlBoxUrl(url: string) {
    return await fetch(url, {
        headers: {
            cookie: getSmlBoxCookies()
        }
    })
}

export async function downloadM3UPlaylist(): Promise<Channel[]> {
    if (!env.sml_source_playlist_m3u) {
        const playlist_m3u_var: keyof Pick<DotEnvConfig, 'sml_source_playlist_m3u'> = 'sml_source_playlist_m3u'

        throw new Error(`Specify \`${playlist_m3u_var}\` URL in your \`.env\` file`)
    }

    const playlistResponse = await fetch(env.sml_source_playlist_m3u)

    if (playlistResponse.status >= 400) {
        throw new Error(`${playlistResponse.status}, ${playlistResponse.statusText}`)
    }

    const playlist = iptvPlaylistParser.parse(await playlistResponse.text())

    return playlist.items.map<Channel>(function (m3uChannel) {
        return {
            title: m3uChannel.name.trim(),
            location: m3uChannel.url.trim()
        }
    })
}

export async function downloadProviderPlaylist() {
    if (env.sml_source_playlist_m3u) {
        return await downloadM3UPlaylist()
    } else if (env.sml_source_playlist_xspf) {
        return await downloadXSPFPlaylist()
    }

    const mustExistsEnvVars: (keyof Pick<DotEnvConfig, 'sml_source_playlist_m3u' | 'sml_source_playlist_xspf'>)[] = [
        'sml_source_playlist_m3u',
        'sml_source_playlist_xspf'
    ]

    throw new Error(
        'Specify one of playlist source via ' +
            mustExistsEnvVars.map(envVar => `\`${envVar}\``).join(', ') +
            ' vars in your `.env` file'
    )
}

export async function downloadXSPFPlaylist(): Promise<Channel[]> {
    if (!env.sml_source_playlist_xspf) {
        const playlist_xspf_var: keyof Pick<DotEnvConfig, 'sml_source_playlist_xspf'> = 'sml_source_playlist_xspf'

        throw new Error(`Specify \`${playlist_xspf_var}\` URL in your \`.env\` file`)
    }

    const playlistResponse = await fetch(env.sml_source_playlist_xspf)

    if (playlistResponse.status >= 400) {
        throw new Error(`${playlistResponse.status}, ${playlistResponse.statusText}`)
    }

    const playlistDocument = new DOMParserImpl({}).parseFromString(await playlistResponse.text())

    const trackNodes = playlistDocument.getElementsByTagName('track')

    const trackSources: Channel[] = []

    for (let i = 0; i < trackNodes.length; i++) {
        const item = trackNodes.item(i)

        if (!item) {
            continue
        }

        const location = item.getElementsByTagName('location')?.item(0)?.textContent?.trim()
        const title = item.getElementsByTagName('title')?.item(0)?.textContent?.trim()

        if (location && title) {
            trackSources.push({location, title})
        }
    }

    return trackSources
}

export function getSmlBoxCookies() {
    if (!env?.sml_cookie_username || !env?.sml_cookie_password) {
        const mustExistsEnvVars: (keyof Pick<DotEnvConfig, 'sml_cookie_username' | 'sml_cookie_password'>)[] = [
            'sml_cookie_username',
            'sml_cookie_password'
        ]

        throw new Error(
            'Specify ' + mustExistsEnvVars.map(envVar => `\`${envVar}\``).join(', ') + ' in your `.env` file'
        )
    }

    return `username=${env.sml_cookie_username}; password=${env.sml_cookie_password}; Path=/; Domain=.smlbox.net; Expires=Wed, 01 May 2040 00:00:00 GMT;`
}

export function getPlaylistToSmlBoxChannelReplacements(): {[key: string]: string} {
    const replaces = env.sml_replacements?.split(';').reduce(function (channels, replacementPair) {
        const [source, replacement] = replacementPair.split('=')

        if (!source || !replacement) {
            return channels
        }

        return {[source]: replacement, ...channels}
    }, {})

    return replaces || {}
}

export async function downloadSmlChannelList() {
    const channelListResponse = await fetchSmlBoxUrl(smlBoxUrls.availableChannels)

    const documentHTML = await channelListResponse.text()

    const $ = cheerio.load(documentHTML)

    if (!$.length) {
        return []
    }

    const optionsNodes = $('#channel option')

    if (!optionsNodes.length) {
        return []
    }

    const channelNames: string[] = optionsNodes
        .map(function (index, node) {
            return node.attribs.value
        })
        .get()

    return channelNames
}

export async function addChannel(
    channelNumber: number,
    channel: Channel,
    channelReplacements?: ReturnType<typeof getPlaylistToSmlBoxChannelReplacements>
) {
    const channelName = (channelReplacements ? channelReplacements[channel.title] : undefined) || channel.title

    const query = objectToQueryString({
        channelNumber,
        channelName,
        epgOffset: 0,
        channelUrl: channel.location
    })

    const url = `${smlBoxUrls.add}?${query}`

    return await fetchSmlBoxUrl(url)
}

export async function addPlaylistChannels(
    playlist: Channel[],
    channelReplacements?: ReturnType<typeof getPlaylistToSmlBoxChannelReplacements>
) {
    for (let index = 0; index < playlist.length; index++) {
        const channelNumber = index + 1
        const channel = playlist[index]

        const addResponse: Response = await addChannel(channelNumber, channel, channelReplacements)

        if (addResponse.status < 400) {
            console.log(`Channel ${channelNumber} with name ${channel.title} has been added`)
        } else {
            console.error(`Channel ${channelNumber} with name ${channel.title} was not added`)
            console.error(addResponse.status, addResponse.statusText)
        }
    }
}

export async function getAddedChannelDeleteUrls(): Promise<string[]> {
    const addedChannelsResponse = await fetchSmlBoxUrl(smlBoxUrls.added)

    const documentHTML = await addedChannelsResponse.text()

    const $ = cheerio.load(documentHTML)

    if (!$.length) {
        return []
    }

    return $('#chTable a[href*="/channel/delete"]')
        .map(function (index, node) {
            const {href} = node.attribs

            // smlBox uses not absolute urls
            // let's see if we need to add a base url
            return href.indexOf(smlBoxBaseUrl) === -1 ? `${smlBoxBaseUrl}${href}` : href
        })
        .get()
}

export async function deleteAddedChannels() {
    const addedChannelDeleteUrls = await getAddedChannelDeleteUrls()

    for (let index = 0; index < addedChannelDeleteUrls.length; index++) {
        const deleteUrl = addedChannelDeleteUrls[index]
        const deleteResponse = await fetchSmlBoxUrl(deleteUrl)
        const channelNumber = index + 1

        if (deleteResponse.status < 400) {
            console.log(`Channel ${channelNumber} has been deleted`)
        } else {
            console.error(`Channel ${channelNumber} was not deleted`)
            console.error(deleteResponse.status, deleteResponse.statusText)
        }
    }
}

export function getCLIArguments() {
    const availableArgs = {
        upload: false,
        delete: false
    }

    process.argv?.forEach(function (userArg) {
        const foundArgument = Object.keys(availableArgs).find(argKey => userArg === `--${argKey}`) as
            | keyof typeof availableArgs
            | undefined

        if (foundArgument) {
            availableArgs[foundArgument] = true
        }
    })

    return availableArgs
}

export function validateCLIArgs(cliArgs: ReturnType<typeof getCLIArguments>) {
    const hasCLIArgs = Object.entries(cliArgs).some(function (argEntry) {
        const [, argValue] = argEntry

        return argValue
    })

    if (hasCLIArgs) {
        return true
    }

    console.error('Specify at least one of these arguments:')
    Object.keys(cliArgs).forEach(arg => console.error(`--${arg}`))

    return false
}

function printExceptionError(error: Error) {
    console.error(error.name, error.message)
}

export async function main() {
    const cliArgs = getCLIArguments()

    if (!validateCLIArgs(cliArgs)) {
        return
    }

    if (cliArgs.delete) {
        try {
            await deleteAddedChannels()
        } catch (e) {
            printExceptionError(e)
        }
    }

    if (cliArgs.upload) {
        try {
            await addPlaylistChannels(await downloadProviderPlaylist(), getPlaylistToSmlBoxChannelReplacements())
        } catch (e) {
            printExceptionError(e)
        }
    }
}
