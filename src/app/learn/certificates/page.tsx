import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { LocalTime } from "@/components/ui/local-time";
import { requireUser } from "@/features/auth/session";
import { listCertificates } from "@/features/certificates/queries";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Certificates" };

export default async function CertificatesPage() {
  const { supabase } = await requireUser();
  const certificates = await listCertificates(supabase);

  return (
    <>
      <PageHeader
        eyebrow="Achievements"
        title="Certificates"
        description="Certificates you've earned for completing a course."
      />

      {certificates.length === 0 ? (
        <EmptyState title="No certificates yet">
          <p>
            Certificates are issued when you complete an eligible course. Your progress is on the{" "}
            <a href="/learn/progress" className={styles.link}>
              progress page
            </a>
            .
          </p>
        </EmptyState>
      ) : (
        <ul className={styles.grid}>
          {certificates.map((c) => (
            <li key={c.id} className={`card ${styles.item}`}>
              <h2>{c.courseTitle}</h2>
              <p className="hint">
                Issued <LocalTime iso={c.issuedAt} kind="date" />
              </p>
              <p className={styles.number}>No. {c.certificateNumber}</p>
              {c.pdfPath ? (
                <p className="hint">Your certificate file will be available to download here.</p>
              ) : (
                <p className="hint">Certificate file is being prepared.</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
