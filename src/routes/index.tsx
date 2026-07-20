import { createFileRoute } from "@tanstack/react-router";
import { HomeScreen } from "@/components/home-screen";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "XZAFE AIcode — Generate web interfaces with AI" },
      {
        name: "description",
        content:
          "Describe a website and XZAFE AIcode generates a complete, beautiful web interface in seconds.",
      },
      { property: "og:title", content: "XZAFE AIcode — Generate web interfaces with AI" },
      {
        property: "og:description",
        content: "Describe a website and XZAFE AIcode generates a complete, beautiful web interface in seconds.",
      },
    ],
  }),
  component: HomeScreen,
});
