// -*- mode: javascript; js-indent-level: 2 -*-

import fs = require('fs')
import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as build from '../src/build'
import * as tools from '../src/tools'

afterEach(() => {
  jest.restoreAllMocks()
})

test('SnapcraftBuilder.build runs a snap build', async () => {
  expect.assertions(4)

  const ensureSnapd = jest
    .spyOn(tools, 'ensureSnapd')
    .mockImplementation(async (): Promise<void> => {})
  const ensureLXD = jest
    .spyOn(tools, 'ensureLXD')
    .mockImplementation(async (): Promise<void> => {})
  const ensureSnapcraft = jest
    .spyOn(tools, 'ensureSnapcraft')
    .mockImplementation(async (): Promise<void> => {})
  const execMock = jest.spyOn(exec, 'exec').mockImplementation(
    async (program: string, args?: string[]): Promise<number> => {
      return 0
    }
  )

  const projectDir = 'project-root'
  const builder = new build.SnapcraftBuilder(projectDir)
  await builder.build()

  expect(ensureSnapd).toHaveBeenCalled()
  expect(ensureLXD).toHaveBeenCalled()
  expect(ensureSnapcraft).toHaveBeenCalled()
  expect(execMock).toHaveBeenCalledWith(
    'sudo',
    ['env', 'SNAPCRAFT_BUILD_ENVIRONMENT=lxd', 'snapcraft'],
    {
      cwd: projectDir
    }
  )
})

test('SnapcraftBuilder.build runs a Launchpad snap build', async () => {
  expect.assertions(4)

  const ensureSnapd = jest
    .spyOn(tools, 'ensureSnapd')
    .mockImplementation(async (): Promise<void> => {})
  const ensureLXD = jest
    .spyOn(tools, 'ensureLXD')
    .mockImplementation(async (): Promise<void> => {})
  const ensureSnapcraft = jest
    .spyOn(tools, 'ensureSnapcraft')
    .mockImplementation(async (): Promise<void> => {})
  const execMock = jest.spyOn(exec, 'exec').mockImplementation(
    async (program: string, args?: string[]): Promise<number> => {
      return 0
    }
  )
  const getInputMock = jest
    .spyOn(core, 'getInput')
    .mockImplementation((name: string): string => {
      switch (name) {
        case 'use_launchpad':
          return 'true'
        case 'launchpad_accept_public_upload':
          return 'true'
        case 'launchpad_timeout':
          return '600'
        default:
          return ''
      }
    })

  const projectDir = 'project-root'
  const builder = new build.SnapcraftBuilder(projectDir)
  await builder.build()

  expect(ensureSnapd).toHaveBeenCalled()
  expect(ensureLXD).not.toHaveBeenCalled()
  expect(ensureSnapcraft).toHaveBeenCalled()
  expect(execMock).toHaveBeenCalledWith(
    'snapcraft',
    [
      'remote-build',
      '--launchpad-accept-public-upload',
      '--launchpad-timeout=600'
    ],
    {
      cwd: projectDir
    }
  )
})

test('SnapcraftBuilder.build fails when Launchpad build requested without acknowledging public uploads', async () => {
  expect.assertions(5)

  const ensureSnapd = jest
    .spyOn(tools, 'ensureSnapd')
    .mockImplementation(async (): Promise<void> => {})
  const ensureLXD = jest
    .spyOn(tools, 'ensureLXD')
    .mockImplementation(async (): Promise<void> => {})
  const ensureSnapcraft = jest
    .spyOn(tools, 'ensureSnapcraft')
    .mockImplementation(async (): Promise<void> => {})
  const execMock = jest.spyOn(exec, 'exec').mockImplementation(
    async (program: string, args?: string[]): Promise<number> => {
      return 0
    }
  )
  const getInputMock = jest
    .spyOn(core, 'getInput')
    .mockImplementation((name: string): string => {
      switch (name) {
        case 'use_launchpad':
          return 'true'
        case 'launchpad_accept_public_upload':
          return ''
        case 'launchpad_timeout':
          return ''
        default:
          return ''
      }
    })

  const projectDir = 'project-root'
  const builder = new build.SnapcraftBuilder(projectDir)
  await expect(builder.build()).rejects.toThrow(
    'Launchpad builds are publically accessible. You must acknowledge this by setting "launchpad_accept_public_upload" to true.'
  )

  expect(ensureSnapd).toHaveBeenCalled()
  expect(ensureLXD).not.toHaveBeenCalled()
  expect(ensureSnapcraft).toHaveBeenCalled()
  expect(execMock).not.toHaveBeenCalled()
})

test('SnapcraftBuilder.outputSnap fails if there are no snaps', async () => {
  expect.assertions(2)

  const projectDir = 'project-root'
  const builder = new build.SnapcraftBuilder(projectDir)

  const readdir = jest
    .spyOn(builder, '_readdir')
    .mockImplementation(
      async (path: string): Promise<string[]> => ['not-a-snap']
    )

  await expect(builder.outputSnap()).rejects.toThrow(
    'No snap files produced by build'
  )
  expect(readdir).toHaveBeenCalled()
})

test('SnapcraftBuilder.outputSnap returns all the snaps', async () => {
  expect.assertions(2)

  const projectDir = 'project-root'
  const builder = new build.SnapcraftBuilder(projectDir)

  const readdir = jest
    .spyOn(builder, '_readdir')
    .mockImplementation(
      async (path: string): Promise<string[]> => ['one.snap', 'two.snap']
    )

  await expect(builder.outputSnap()).resolves.toEqual([
    'project-root/one.snap',
    'project-root/two.snap'
  ])
  expect(readdir).toHaveBeenCalled()
})
