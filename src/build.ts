// -*- mode: javascript; js-indent-level: 2 -*-

import * as path from 'path'
import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as tools from './tools'
// Importing as an ECMAScript Module blocks access to fs.promises:
//   https://github.com/nodejs/node/issues/21014
import fs = require('fs') // eslint-disable-line @typescript-eslint/no-require-imports

export class SnapcraftBuilder {
  projectRoot: string
  launchpadBuild: boolean
  launchpadAcceptPublicUpload: boolean
  launchpadTimeout: number

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot

    const useLaunchpad = core.getInput('use_launchpad') ?? 'false'
    this.launchpadBuild = useLaunchpad === 'true'

    const lpAcceptPublic =
      core.getInput('launchpad_accept_public_upload') ?? 'false'
    this.launchpadAcceptPublicUpload = lpAcceptPublic === 'true'

    const lpTimeout = parseInt(core.getInput('launchpad_timeout'))
    this.launchpadTimeout = Number.isNaN(lpTimeout) ? 3600 : lpTimeout
  }

  async build(): Promise<void> {
    core.startGroup('Installing Snapcraft plus dependencies')
    await tools.ensureSnapd()
    await tools.ensureSnapcraft()
    if (!this.launchpadBuild) {
      await tools.ensureLXD()
    }
    core.endGroup()

    const execOpts = {
      cwd: this.projectRoot
    }
    if (this.launchpadBuild) {
      if (!this.launchpadAcceptPublicUpload) {
        throw new Error(
          'Launchpad builds are publically accessible. You must acknowledge this by setting "launchpad_accept_public_upload" to true.'
        )
      }
      await exec.exec(
        'snapcraft',
        [
          'remote-build',
          '--launchpad-accept-public-upload',
          `--launchpad-timeout=${this.launchpadTimeout}`
        ],
        execOpts
      )
    } else {
      await exec.exec(
        'sudo',
        ['env', 'SNAPCRAFT_BUILD_ENVIRONMENT=lxd', 'snapcraft'],
        execOpts
      )
    }
  }

  // This wrapper is for the benefit of the tests, due to the crazy
  // typing of fs.promises.readdir()
  async _readdir(dir: string): Promise<string[]> {
    return await fs.promises.readdir(dir)
  }

  async outputSnap(): Promise<string[]> {
    const files = await this._readdir(this.projectRoot)
    const snaps = files.filter(name => name.endsWith('.snap'))

    if (snaps.length === 0) {
      throw new Error('No snap files produced by build')
    }
    return snaps.map(snap => path.join(this.projectRoot, snap))
  }
}
