import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/features/auth/session";
import { getOwnProfile } from "@/features/account/queries";
import { ProfileForm } from "@/features/account/components/profile-form";
import { PasswordForm } from "@/features/account/components/password-form";
import { SignOutForm } from "@/features/auth/components/sign-out-form";
import { signOutAction } from "@/features/auth/actions";
import { redirect } from "next/navigation";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const { supabase, user } = await requireUser();
  const profile = await getOwnProfile(supabase, user.id);
  if (!profile) redirect("/auth/error?reason=no-profile");

  return (
    <>
      <PageHeader eyebrow="Account" title="Your account" description="Update your details, password and sessions." />

      <div className={styles.columns}>
        <section className={`card ${styles.panel}`} aria-labelledby="details-heading">
          <h2 id="details-heading">Details</h2>
          <ProfileForm email={user.email ?? ""} fullName={profile.full_name} phone={profile.phone} />
        </section>

        <section className={`card ${styles.panel}`} aria-labelledby="password-heading">
          <h2 id="password-heading">Password</h2>
          <PasswordForm />
        </section>
      </div>

      <section className={`card ${styles.panel}`} aria-labelledby="sessions-heading">
        <h2 id="sessions-heading">Sessions</h2>
        <p>Sign out of this device, or of every device where you&apos;re logged in.</p>
        <div className={styles.sessionActions}>
          <SignOutForm />
          <form action={signOutEverywhere}>
            <button type="submit" className="btn btn-ghost">
              Sign out everywhere
            </button>
          </form>
        </div>
      </section>
    </>
  );
}

async function signOutEverywhere() {
  "use server";
  const fd = new FormData();
  fd.set("everywhere", "on");
  await signOutAction(fd);
}
