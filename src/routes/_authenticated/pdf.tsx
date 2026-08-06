import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/pdf")({
  beforeLoad: () => {
    throw redirect({ to: "/presentation" });
  },
  component: () => null,
});