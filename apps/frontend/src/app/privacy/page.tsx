import Link from "next/link";

const POLICY_SECTIONS = [
  {
    title: "Data We Collect",
    copy: "Account details, seller KYC files, product listings, orders, payments, support tickets, messages, eco-reward activity, referrals, subscriptions, and device-level consent preferences needed to operate the marketplace.",
  },
  {
    title: "How We Use Data",
    copy: "We use data to authenticate users, process checkout, coordinate delivery, credit seller profit, prevent fraud, moderate disputes, calculate rewards, improve catalog quality, and meet legal or accounting obligations.",
  },
  {
    title: "Optional Consent",
    copy: "Analytics and marketing preferences are optional. Necessary cookies remain enabled for login, checkout, security, and fraud prevention.",
  },
  {
    title: "Retention",
    copy: "Operational records are retained only as long as needed for marketplace operations, tax/accounting, security, fraud prevention, and dispute handling. Export links expire after 30 days.",
  },
  {
    title: "Your Rights",
    copy: "Signed-in users can update consent, request a machine-readable data export, request account deletion, or cancel a pending deletion request from the privacy center.",
  },
  {
    title: "Deletion Model",
    copy: "Account deletion has a 7-day grace period. After processing, personal identifiers are anonymized while legally necessary transaction records can remain for compliance and marketplace integrity.",
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="max-w-3xl">
        <p className="badge">Privacy & Compliance</p>
        <h1 className="mt-4 text-4xl">EARTHLYN Privacy Policy</h1>
        <p className="mt-4 text-gray-600">
          This policy explains how EARTHLYN handles marketplace data for buyers,
          sellers, admins, and customer service users.
        </p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {POLICY_SECTIONS.map((section) => (
          <section key={section.title} className="card p-6">
            <h2 className="text-xl font-semibold">{section.title}</h2>
            <p className="mt-3 text-sm leading-6 text-gray-600">
              {section.copy}
            </p>
          </section>
        ))}
      </div>

      <div className="mt-8 rounded-lg border border-black/10 bg-white p-6">
        <h2 className="text-xl font-semibold">Manage Your Data</h2>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          Use the privacy center to download your data package or manage account
          deletion. Customer service can help with access issues and dispute
          records.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/account/privacy" className="btn-primary">
            Privacy Center
          </Link>
          <Link href="/dashboard/customer-service" className="btn-secondary">
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
}
