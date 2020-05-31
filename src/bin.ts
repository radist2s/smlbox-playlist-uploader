#! /usr/bin/env node

import {main, DotEnvConfig} from './index'
import {config} from 'dotenv'

const env = (config().parsed as any) as DotEnvConfig

if (!env) {
    console.error('Error: no `.env` file found')
    console.error('Create `.env` file in current directory')
    console.error(
        'Put example configuration from https://raw.githubusercontent.com/radist2s/smlbox-playlist-uploader/master/.env.example'
    )
    console.error('Make changes in your `.env` file according to instructions from `.env.example`')
} else {
    main()
}
