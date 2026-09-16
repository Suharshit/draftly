import Link from "next/dist/client/link";


// Temporary: docs has no content yet, so it previews the loading screen.
export default async function DocsPage() {

  return (
    <main className="flex h-screen flex-col items-center justify-center gap-(--space-4) bg-paper-cream px-(--space-4)">
      <h1 className="text-2xl font-bold text-ink ">Documentation, coming soon.</h1>
      <p className="text-center text-ink/80">
        Draftly is still in early development, so the docs are not yet available.
        In the meantime, you can reach out to us at{" "}
        <a
          href="mailto:suharshit123@gmail.com"
          className="font-semibold text-ink underline"
        >
          suharshit123@gmail.com
        </a>
      </p>
      <p className="text-center text-ink/80">
          <Link
            href="/sign-up"
            className="font-semibold text-ink underline"
          >
            Sign up to get started
          </Link>
      </p>
    </main>
  )
}
