import Link from 'next/link';

export const metadata = {
  title: 'Grievance Officer',
  description:
    'Contact DELAN\'s Grievance Officer as required under the Consumer Protection (E-Commerce) Rules 2020.',
};

export default function GrievanceOfficerPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-24">
      <h1 className="cormorant-garamond-600 text-4xl mb-4 tracking-tight">Grievance Officer</h1>
      <p className="montserrat-400 text-[14px] text-muted-foreground mb-10 leading-relaxed">
        In accordance with the Consumer Protection (E-Commerce) Rules 2020, DELAN has appointed a
        Grievance Officer to handle consumer complaints and queries.
      </p>

      <dl className="space-y-8">
        {[
          { label: 'Name',        value: '[GRIEVANCE OFFICER NAME]' },
          { label: 'Designation', value: '[DESIGNATION]' },
          { label: 'Email',       value: '[GRIEVANCE EMAIL]' },
          { label: 'Phone',       value: '[GRIEVANCE PHONE]' },
          { label: 'Hours',       value: 'Monday – Friday, 10 AM – 6 PM IST' },
          { label: 'Response',    value: 'Acknowledged within 48 hours; resolved within 1 month of receipt.' },
        ].map(({ label, value }) => (
          <div key={label}>
            <dt className="montserrat-600 text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-1">
              {label}
            </dt>
            <dd className="montserrat-400 text-[14px] leading-relaxed">
              {value.startsWith('[') ? (
                <span className="text-destructive">
                  {value}{' '}
                  <em className="not-italic text-muted-foreground text-[12px]">— placeholder, fill before launch</em>
                </span>
              ) : (
                value
              )}
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-12 montserrat-400 text-[12px] text-muted-foreground leading-relaxed border-t border-border pt-8">
        Grievances may also be submitted via the{' '}
        <Link href="/contact" className="underline underline-offset-4">
          Contact page
        </Link>
        . Complaints are handled as required by the Consumer Protection (E-Commerce) Rules 2020.
      </p>
    </main>
  );
}
