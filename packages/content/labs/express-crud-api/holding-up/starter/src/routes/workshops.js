// Task: Move the routes into a router
//
// workshopsRouter(store) returns an Express router with every workshop route: list, read one,
// create, replace, change and remove. Its paths are written from where it is mounted, so the
// list is at '/' and one workshop at '/:id'. The answers stay exactly as they are in app.js now.
import express from 'express'
import { FIELDS, validateWorkshop } from '../validate.js'

export function workshopsRouter(store) {
  throw new Error('Not implemented')
}
