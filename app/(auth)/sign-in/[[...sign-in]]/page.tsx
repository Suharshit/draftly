import { SignInCard } from "@/components/auth/sign-in-card";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { redirect_url: redirectUrl } = await searchParams;

  return <SignInCard redirectUrl={typeof redirectUrl === "string" ? redirectUrl : undefined} />;
}
