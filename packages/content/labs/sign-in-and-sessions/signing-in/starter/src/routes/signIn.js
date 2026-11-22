// Tasks: Add the sign-in route, Log each attempt without its secrets
//
// signInRouter(staff) returns a router with POST /sign-in. The body is { email, password }:
// - both must be text that is not empty, or it answers 400 with code 'bad_sign_in'
// - the right password answers 200 with { staff: { id, name, email, role } }
// - anything else answers 401 with code 'wrong_sign_in', the same answer for a wrong password
//   and for an email nobody has
// - every attempt logs one line with its email and how it ended, and no password or hash ever
//   reaches a log or an answer
import express from 'express'
import { checkSignIn } from '../signIn.js'

export function signInRouter(staff) {
  throw new Error('Not implemented')
}
