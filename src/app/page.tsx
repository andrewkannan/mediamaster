import { redirect } from "next/navigation";

export default function Home() {
  // Redirect root path to the dashboard
  redirect("/dashboard");
}
