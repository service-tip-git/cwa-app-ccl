/* eslint-env mocha */
/* eslint-disable no-unused-expressions */
'use strict'

const { expect } = require('chai')
const fse = require('fs-extra')
const path = require('path')
const executeJfnTestCase = require('./../../util/execute-jfn-test-case')({ expect })

const tests = fse.readJSONSync(path.resolve(__dirname, './../../fixtures/jfn/jfn-tests/string.spec.json'))

describe('jfn/string', () => {
  tests.forEach(({ title, logic, data, exp }) => {
    it(title, () => {
      executeJfnTestCase({
        logic, data, exp
      })
    })
  })
})