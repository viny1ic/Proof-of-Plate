import { redirect } from "next/navigation";

export default function Home() {
  redirect(`/p/${process.env.NEXT_PUBLIC_BATCH_ID || "TB-MILK-0612"}`);
}
