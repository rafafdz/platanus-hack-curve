import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed/admin/$id/announcements')({
  component: RouteComponent,
})

function RouteComponent() {
  return 'Hello /_authed/admin/$id/announcements!'
}
