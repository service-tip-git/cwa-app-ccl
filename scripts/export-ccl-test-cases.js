import async from 'async'
import chalk from 'chalk'
import fse from 'fs-extra'
import path from 'path'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

import ccl from './../lib/ccl/index.js'

import cclTestUtil from './../test/util/ccl-util.js'
import dcc from './../test/util/dcc/dcc-main.js'
import fixtures from './../test/util/fixtures.js'

import cclConfiguration from './../dist/ccl-de-0001.json'

const argv = yargs(hideBin(process.argv))
  .option('target', {
    alias: 't',
    string: true,
    default: 'dist'
  })
  .option('test-case-filename', {
    default: 'ccl-test-cases.gen.json'
  })
  .argv

const main = async () => {
  const allDccSeries = fixtures.readAllDccSeriesSync()
  const allFunctions = cclConfiguration.Logic.JfnDescriptors

  const allTestCases = []

  await async.forEach(allDccSeries, async seriesDescriptor => {
    const {
      parseSeriesTestCase
    } = await dcc.series.parseSeriesDescriptor({ seriesDescriptor })
    const seriesDescription = `${seriesDescriptor.filename} - ${seriesDescriptor.description}`

    await async.forEachOf(seriesDescriptor.testCases, async (testCase, idx) => {
      const {
        timeUnderTest,
        seriesUnderTest
      } = parseSeriesTestCase(testCase)
      const testCaseDescription = `test case #${idx + 1} at ${testCase.time}`

      const input = {
        os: 'android',
        language: 'en',
        now: ccl.util.mapMomentToNow(timeUnderTest),
        certificates: seriesUnderTest.map(it => {
          return cclTestUtil.mapBarcodeDataToCertificate(it.barcodeData, {
            validityState: 'VALID'
          })
        }),
        boosterNotificationRules: []
      }

      const output = ccl.evaluateFunction('getDccWalletInfo', input)

      const testCaseDescriptor = {
        title: `${seriesDescription} - ${testCaseDescription}`,
        functions: allFunctions,
        useDefaultCCLConfiguration: true,
        evaluateFunction: {
          name: 'getDccWalletInfo',
          parameters: input
        },
        exp: output
      }
      allTestCases.push(testCaseDescriptor)
    })
  })

  if (argv.testCaseFilename) {
    const data = {
      $comment: `Generated at ${new Date().toString()}`,
      testCases: allTestCases
    }

    const filepath = path.join(argv.target, argv.testCaseFilename)
    const targetFilepath = path.resolve(process.cwd(), filepath)
    await fse.ensureFile(targetFilepath)
    await fse.writeJSON(targetFilepath, data, { spaces: 2 })
    console.log(`Created JSON target ${chalk.cyan(filepath)}`)
  }
}

main()
  .then(() => console.log('Done.'))
  .catch(err => console.log('Error:', err))
