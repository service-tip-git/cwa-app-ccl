/* eslint-env mocha */
/* eslint-disable no-unused-expressions */
'use strict'

const { expect } = require('chai')

const ccl = require('../../../../lib/ccl')

const cclUtil = require('../../../util/ccl-util')
const fixtures = require('../../../util/fixtures')
const dcc = require('../../../util/dcc/dcc-main')

describe('ccl/functions/__analyzeDccWallet', async () => {
  const allDccSeries = fixtures.readAllDccSeriesSync()

  allDccSeries.forEach(seriesDescriptor => {
    const _context = seriesDescriptor.only === true ? context.only : seriesDescriptor.skip === true ? context.skip : context
    _context(`${seriesDescriptor.filename} - ${seriesDescriptor.description}`, () => {
      let resolveCertNameToBarcodeData
      let resolveBarcodeDataToCertName
      let parseSeriesTestCase
      let resolveSeriesTime

      before(async () => {
        ({
          resolveCertNameToBarcodeData,
          resolveBarcodeDataToCertName,
          parseSeriesTestCase,
          resolveSeriesTime
        } = await dcc.series.parseSeriesDescriptor({ seriesDescriptor }))
      })

      seriesDescriptor.testCases.forEach((testCase, idx) => {
        const _context = testCase.only === true ? context.only : context
        const testCaseDescription = `test case #${idx + 1} at ${testCase.time}`
        _context(testCaseDescription, () => {
          let timeUnderTest, seriesUnderTest
          let input, output

          before(async () => {
            ({
              timeUnderTest,
              seriesUnderTest
            } = parseSeriesTestCase(testCase))

            input = {
              os: 'android',
              language: 'en',
              now: ccl.util.mapMomentToNow(timeUnderTest),
              certificates: seriesUnderTest.map(it => {
                return cclUtil.mapBarcodeDataToCertificate(it.barcodeData, {
                  validityState: 'VALID'
                })
              }),
              boosterNotificationRules: []
            }

            output = ccl.evaluateFunction('__analyzeDccWallet', input)
          })

          it('series under test is not empty', () => {
            expect(seriesUnderTest)
              .to.have.lengthOf.at.least(1)
          })

          it('log series', () => {
            if (testCase.debug !== true) return

            const chalk = require('chalk')
            const terminal = require('../../../util/terminal')

            const prefix = `${chalk.magenta('[DEBUG]')} `

            const dccData = seriesUnderTest.map(it => it.dcc)

            const debugLog = `Start of debugging: ${chalk.magenta(testCaseDescription)}

${chalk.cyan('Time under test')}
${timeUnderTest.toISOString()}

${chalk.cyan('Series under test')} (${dccData.length} certificates)
${terminal.yaml(dccData)}

${chalk.cyan('Output of the operation')}
${terminal.yaml(output)}

End of debugging: ${chalk.magenta(testCaseDescription)}`

            console.log(terminal.prefixLine(debugLog, prefix))
          })

          it('input matches JSON schema', async function () {
            const results = await ccl.schema.functions.getDccWalletInfo.input.validate(input)
            expect(results.errors, JSON.stringify(results.errors, null, '  ')).to.be.empty
          })

          context('assertions', () => {
            const { assertions } = testCase
            const has = prop => Object.prototype.hasOwnProperty.call(assertions, prop) &&
              (typeof assertions[prop] === 'string' ? assertions[prop].trim().length > 0 : assertions[prop] !== null)

            has('admissionState') &&
            it('check admissionState', () => {
              expect(output)
                .to.have.property('admissionState', assertions.admissionState.value || assertions.admissionState)
            })

            has('mostRelevantCertificate') &&
            it('check mostRelevantCertificate', () => {
              const expCertRef = assertions.mostRelevantCertificate
              const expBarcodeData = resolveCertNameToBarcodeData(expCertRef)
              const actCertRef = resolveBarcodeDataToCertName(output.mostRelevantCertificate.certificateRef.barcodeData)

              expect(output).to.have.nested.property(
                'mostRelevantCertificate.certificateRef.barcodeData',
                expBarcodeData,
                `expected reference to ${expCertRef} but got ${actCertRef}`
              )
            })

            has('vaccinationState') &&
            it('check vaccinationState', () => {
              expect(output)
                .to.have.property('vaccinationState', assertions.vaccinationState.value || assertions.vaccinationState)
            })

            has('vaccinationValidFrom') &&
            it('check vaccinationValidFrom', () => {
              const expValidFromMoment = resolveSeriesTime(assertions.vaccinationValidFrom)
              const expValidFrom = expValidFromMoment.utc().toISOString()
              expect(output)
                .to.have.property('vaccinationValidFrom')
              expect(output.vaccinationValidFrom).to.equal(expValidFrom)
            })

            has('mostRecentVaccination') &&
            it('check mostRecentVaccination', () => {
              const expCertRef = assertions.mostRecentVaccination
              const expBarcodeData = resolveCertNameToBarcodeData(expCertRef)
              const actCertRef = resolveBarcodeDataToCertName(output.mostRecentVaccination.certificateRef.barcodeData)

              expect(output).to.have.nested.property(
                'mostRecentVaccination.certificateRef.barcodeData',
                expBarcodeData,
                `expected reference to ${expCertRef} but got ${actCertRef}`
              )
            })

            has('hasBooster') &&
            it('check hasBooster', () => {
              expect(output)
                .to.have.property('hasBooster', assertions.hasBooster)
            })

            has('verificationCertificates') &&
            it('check verificationCertificates', () => {
              expect(output.verificationCertificates)
                .to.be.an('object')
                .and.to.have.property('certificates')
              expect(output.verificationCertificates.certificates, 'length of verificationCertificates.certificates')
                .to.be.an('array')
                .and.to.have.lengthOf(assertions.verificationCertificates.length)
              assertions.verificationCertificates.forEach((it, idx) => {
                const act = output.verificationCertificates.certificates[idx]

                const expBarcodeData = resolveCertNameToBarcodeData(it.certificate)
                const expCertRef = resolveBarcodeDataToCertName(expBarcodeData)
                const actCertRef = resolveBarcodeDataToCertName(act.certificateRef.barcodeData)

                expect(act).to.have.nested.property(
                  'certificateRef.barcodeData',
                  expBarcodeData,
                  `expected reference to ${expCertRef} but got ${actCertRef}`
                )
              })
            })
          })
        })
      })
    })
  })
})
