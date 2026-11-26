import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type CertificateView = {
  id: string;
  courseTitle: string;
  certificateNumber: string;
  issuedAt: string;
  pdfPath: string | null;
};

// RLS returns only the student's own certificates.
export async function listCertificates(supabase: SupabaseClient, userId: string): Promise<CertificateView[]> {
  const { data, error } = await supabase
    .from("certificates")
    .select("id, certificate_number, issued_at, pdf_path, courses(title)")
    .eq("user_id", userId)
    .order("issued_at", { ascending: false });
  if (error) throw new Error(`Could not load certificates: ${error.message}`);

  return (data ?? []).map((c) => ({
    id: c.id,
    courseTitle: (c.courses as unknown as { title: string } | null)?.title ?? "Course",
    certificateNumber: c.certificate_number,
    issuedAt: c.issued_at,
    pdfPath: c.pdf_path,
  }));
}
