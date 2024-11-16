import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed/admin/$id/activities')({
  component: RouteComponent,
})

function RouteComponent() {
  return 'Hello /admin/schedule!'
}
