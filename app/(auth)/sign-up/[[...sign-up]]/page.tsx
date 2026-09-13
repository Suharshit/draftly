import { SignUpCard } from "@/components/auth/sign-up-card";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { redirect_url: redirectUrl } = await searchParams;

  return <SignUpCard redirectUrl={typeof redirectUrl === "string" ? redirectUrl : undefined} />;
}
