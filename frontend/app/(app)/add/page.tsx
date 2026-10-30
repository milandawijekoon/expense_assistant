import { redirect } from "next/navigation";

// The add-expense form now lives on the dashboard; keep old links working.
export default function AddRedirect() {
  redirect("/dashboard");
}
