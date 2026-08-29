/*
An automated testing utility which allows you to log ops with a expected output
and then recreate them and compare the outputs automatically
*/

export interface Operation {
  name: string
  args: any[]
}

export interface Test {
  name: string
  description: string
  initial: any
  operations: Operation[]
  expectedOutput?: any
}

const init = (
  name: string,
  description: string,
  initial: any,
  expectedOutput?: any
): Test => {
  let operations: Operation[] = []

  return {
    initial: structuredClone(initial),
    name,
    description,
    operations,
    expectedOutput,
  }
}

const log = (test: Test, opName: string, opArgs: any[]) => {
  test.operations.push({ name: opName, args: opArgs })
}

const recreate = (
  test: Test,
  opHandler: (name: string, args: any[]) => void
): void => {
  for (let operation of test.operations) {
    opHandler(operation.name, operation.args)
  }
}

const expect = (test: Test, output: any) => {
  test.expectedOutput = structuredClone(output)
}

const match = (obj1: any, obj2: any): boolean => {
  return JSON.stringify(obj1) === JSON.stringify(obj2)
}

const run = (
  test: Test,
  state: any,
  opHandler: (name: string, args: any[]) => void
): boolean => {
  if (test.expectedOutput === undefined) {
    console.error(`expected output is undefined`)
  }

  recreate(test, opHandler)

  return match(test.expectedOutput, state)
}

const getInitialState = (test: Test): any => {
  return structuredClone(test.initial)
}

const serialize = (test: Test): any => {
  if (test.expectedOutput === undefined)
    console.error(`expected output is undefined`)

  return {
    name: test.name,
    description: test.description,
    initial: test.initial,
    operations: test.operations,
    expectedOutput: test.expectedOutput,
  }
}

export { init, log, expect, recreate, match, run, getInitialState, serialize }
