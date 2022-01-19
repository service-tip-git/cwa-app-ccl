'use strict'

const chalk = require('chalk')
const cbor = require('cbor')
const fse = require('fs-extra')
const path = require('path')
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')

const ccl = require('./../lib/ccl')

const argv = yargs(hideBin(process.argv))
  .option('cbor-target', {
    string: true
  })
  .option('json-target', {
    string: true
  })
  .argv

const main = async () => {
  const functionDescriptors = ccl.getFunctionDescriptors()
  const allDescriptors = functionDescriptors
    .map(it => it.getDescriptor())

  const cclConfiguration = {
    Identifier: 'CCL-DE-0001',
    Type: 'CCLConfiguration',
    Country: 'DE',
    Version: '1.0.0',
    SchemaVersion: '1.0.0',
    Engine: 'JsonFunctions',
    EngineVersion: '1.0.0',
    ValidFrom: '2022-01-01T00:00:00Z',
    ValidTo: '2030-12-31T00:00:00Z',
    Logic: {
      JfnDescriptors: allDescriptors
    }
  }
  const cclConfigurations = [
    cclConfiguration
  ]

  if (argv.jsonTarget) {
    const targetFilepath = path.resolve(process.cwd(), argv.jsonTarget)
    await fse.ensureFile(targetFilepath)
    await fse.writeJSON(targetFilepath, cclConfigurations)
    console.log(`Created JSON target ${chalk.cyan(argv.jsonTarget)}`)
  }

  if (argv.cborTarget) {
    const asBuffer = cbor.encode(cclConfigurations)

    const targetFilepath = path.resolve(process.cwd(), argv.cborTarget)
    await fse.ensureFile(targetFilepath)
    await fse.writeFile(targetFilepath, asBuffer)
    console.log(`Created CBOR target ${chalk.cyan(argv.cborTarget)}`)
  }
}

main()
  .then(() => console.log('Done.'))
  .catch(err => console.log('Error:', err))
